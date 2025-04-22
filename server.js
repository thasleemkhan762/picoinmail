const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// File path for storing subscriptions
const subscriptionsFilePath = path.join(__dirname, 'data', 'subscriptions.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}

// Initialize subscriptions file if it doesn't exist
if (!fs.existsSync(subscriptionsFilePath)) {
    fs.writeFileSync(subscriptionsFilePath, JSON.stringify([]));
}

// Function to read subscriptions from file
const getSubscriptions = () => {
    try {
        const data = fs.readFileSync(subscriptionsFilePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading subscriptions:', error);
        return [];
    }
};

// Function to write subscriptions to file
const saveSubscriptions = (subscriptions) => {
    try {
        fs.writeFileSync(subscriptionsFilePath, JSON.stringify(subscriptions, null, 2));
    } catch (error) {
        console.error('Error saving subscriptions:', error);
    }
};

// Function to fetch PiCoin price in USD from OKX API
const getPiCoinPrice = async () => {
    try {
        const response = await axios.get('https://www.okx.com/api/v5/market/ticker?instId=PI-USDT');
        console.log('OKX API Response:', JSON.stringify(response.data, null, 2));
        if (response.data && response.data.data && response.data.data.length > 0) {
            const priceData = response.data.data[0];
            const currentPrice = parseFloat(priceData.last);
            const high24h = parseFloat(priceData.high24h);
            const low24h = parseFloat(priceData.low24h);
            let change24h = parseFloat(priceData.change24h);
            if (isNaN(change24h) && !isNaN(currentPrice) && !isNaN(low24h)) {
                change24h = ((currentPrice - low24h) / low24h) * 100;
            }
            console.log('Parsed price data:', {
                last: currentPrice,
                change24h: change24h,
                high24h: high24h,
                low24h: low24h,
                vol24h: priceData.vol24h
            });
            return {
                price: currentPrice,
                change24h: change24h,
                high24h: high24h,
                low24h: low24h,
                volume24h: parseFloat(priceData.vol24h),
                timestamp: new Date().toISOString()
            };
        } else {
            console.error('Invalid API response structure:', response.data);
            throw new Error('No price data available');
        }
    } catch (error) {
        console.error('Error fetching PiCoin price:', error.message);
        if (error.response) {
            console.error('API Error Response:', error.response.data);
        }
        return null;
    }
};

// NEW Function to get combined USD and INR price data
const getCombinedPriceData = async () => {
    const priceDataUSD = await getPiCoinPrice();

    if (!priceDataUSD) {
        return null; // Return null if USD price fetch failed
    }

    let exchangeRate = null;
    const apiKey = process.env.EXCHANGE_RATE_API_KEY;

    if (!apiKey) {
        console.warn('ExchangeRate-API key not found in .env. Skipping INR conversion.');
    } else {
        try {
            const exchangeRateUrl = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`;
            console.log(`Fetching exchange rate from: ${exchangeRateUrl.replace(apiKey, 'YOUR_API_KEY')}`);
            const exchangeRateResponse = await axios.get(exchangeRateUrl);

            if (exchangeRateResponse.data && exchangeRateResponse.data.result === 'success' && exchangeRateResponse.data.conversion_rates && exchangeRateResponse.data.conversion_rates.INR) {
                exchangeRate = exchangeRateResponse.data.conversion_rates.INR;
                console.log(`Fetched USD/INR exchange rate: ${exchangeRate}`);
            } else {
                console.warn('Could not fetch USD/INR exchange rate or invalid response format.');
            }
        } catch (error) {
            console.error('Error fetching USD/INR exchange rate:', error.message);
            // Continue without the exchange rate
        }
    }

    // Prepare the final response data
    const responseData = {
        ...priceDataUSD,
        price_inr: null,
        high24h_inr: null,
        low24h_inr: null,
        volume24h_inr: null,
    };

    // Calculate INR values if exchange rate is available and USD price exists
    if (exchangeRate !== null && responseData.price !== null) {
        responseData.price_inr = responseData.price * exchangeRate;
        responseData.high24h_inr = responseData.high24h !== null ? responseData.high24h * exchangeRate : null;
        responseData.low24h_inr = responseData.low24h !== null ? responseData.low24h * exchangeRate : null;
        responseData.volume24h_inr = responseData.volume24h !== null ? responseData.volume24h * exchangeRate : null;
    }

    return responseData;
};

// Email transporter setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Admin route to view subscriptions
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// API endpoint to get all subscriptions
app.get('/api/subscriptions', (req, res) => {
    const subscriptions = getSubscriptions();
    res.json(subscriptions);
});

// API endpoint to get PiCoin price (now uses the refactored function)
app.get('/api/price', async (req, res) => {
    const combinedData = await getCombinedPriceData();
    if (combinedData) {
        res.json(combinedData);
    } else {
        res.status(500).json({ error: 'Failed to fetch PiCoin price data' });
    }
});

// API endpoint to manually send updates to all subscribers
app.post('/api/send-update', async (req, res) => {
    try {
        await sendPriceUpdateEmails();
        res.json({ success: true, message: 'Updates sent successfully' });
    } catch (error) {
        console.error('Error sending updates:', error);
        res.status(500).json({ success: false, message: 'Failed to send updates' });
    }
});

// Subscribe endpoint (uses refactored function for welcome email)
app.post('/subscribe', async (req, res) => {
    const { email } = req.body;
    
    try {
        const subscriptions = getSubscriptions();
        if (subscriptions.includes(email)) {
            return res.status(400).json({ success: false, message: 'Email already subscribed' });
        }
        
        subscriptions.push(email);
        saveSubscriptions(subscriptions);
        
        // Get combined price data for welcome email
        const priceData = await getCombinedPriceData();
        let priceInfo = '<p>Unable to fetch current PiCoin price.</p>';
        if (priceData && priceData.price !== null) {
            const inrText = priceData.price_inr !== null ? ` / ₹${priceData.price_inr.toFixed(2)}` : '';
            priceInfo = `<p>Current PiCoin price: $${priceData.price.toFixed(4)}${inrText}</p>`;
        }
        
        // Send welcome email
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Welcome to PiCoin Notifications',
            html: `
                <h1>Welcome to PiCoin Notifications!</h1>
                <p>You have successfully subscribed to receive PiCoin value updates.</p>
                ${priceInfo}
            `
        });

        res.json({ success: true, message: 'Subscription successful!' });
    } catch (error) {
        console.error('Error in /subscribe:', error);
        // Attempt to remove email if subscription failed after adding
        const subscriptions = getSubscriptions();
        const index = subscriptions.indexOf(email);
        if (index > -1) {
            subscriptions.splice(index, 1);
            saveSubscriptions(subscriptions);
        }
        res.status(500).json({ success: false, message: 'Failed to subscribe' });
    }
});

// Function to send price update emails (uses refactored function)
const sendPriceUpdateEmails = async () => {
    const priceData = await getCombinedPriceData();
    if (!priceData || priceData.price === null) {
        console.warn("Skipping email update, failed to get valid price data.");
        return; // Don't send emails if price is invalid
    }
    
    const subscriptions = getSubscriptions();
    if (subscriptions.length === 0) return;

    // Helper to format INR for email, handling null
    const formatInrEmail = (value) => {
        return value !== null ? ` / ₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '';
    };
    
    const emailPromises = subscriptions.map(email => {
        const emailHtml = `
            <h1>PiCoin Price Update</h1>
            <p>Current PiCoin price: $${priceData.price.toFixed(4)}${formatInrEmail(priceData.price_inr)}</p>
            <p>24h Change: ${priceData.change24h !== null ? (priceData.change24h > 0 ? '+' : '') + priceData.change24h.toFixed(2) + '%' : 'N/A'}</p>
            <p>24h High: $${priceData.high24h !== null ? priceData.high24h.toFixed(4) : 'N/A'}${formatInrEmail(priceData.high24h_inr)}</p>
            <p>24h Low: $${priceData.low24h !== null ? priceData.low24h.toFixed(4) : 'N/A'}${formatInrEmail(priceData.low24h_inr)}</p>
            <p>24h Volume: $${priceData.volume24h !== null ? priceData.volume24h.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : 'N/A'}${formatInrEmail(priceData.volume24h_inr)}</p>
            <p>Last Updated: ${new Date(priceData.timestamp).toLocaleString()}</p>
        `;

        return transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'PiCoin Price Update',
            html: emailHtml
        }).catch(error => {
            console.error(`Error sending email to ${email}:`, error);
            return null; // Prevent Promise.all from rejecting
        });
    });
    
    await Promise.all(emailPromises);
    console.log(`Sent price update emails to ${subscriptions.length} subscribers.`);
};

// Schedule price update emails (every 24 hours)
setInterval(sendPriceUpdateEmails, 24 * 60 * 60 * 1000);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}); 