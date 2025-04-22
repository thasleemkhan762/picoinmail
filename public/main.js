document.addEventListener('DOMContentLoaded', () => {
    const priceValue = document.getElementById('priceValue');
    const priceValueInr = document.getElementById('priceValueInr');
    const priceChange = document.getElementById('priceChange');
    const priceHigh = document.getElementById('priceHigh');
    const priceHighInr = document.getElementById('priceHighInr');
    const priceLow = document.getElementById('priceLow');
    const priceLowInr = document.getElementById('priceLowInr');
    const priceVolume = document.getElementById('priceVolume');
    const priceVolumeInr = document.getElementById('priceVolumeInr');
    const lastUpdated = document.getElementById('lastUpdated');
    const refreshPrice = document.getElementById('refreshPrice');
    const subscribeForm = document.getElementById('subscribeForm');
    // const message = document.getElementById('message'); // Assuming message div was removed

    // Helper function to format INR
    const formatInr = (value) => {
        if (value === null || typeof value !== 'number' || isNaN(value)) {
            return '-';
        }
        return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Function to fetch and display price
    const fetchPrice = async () => {
        try {
            const response = await fetch('/api/price');
            const data = await response.json();

            console.log('Price API Response:', data);

            if (data.error || !data || data.price === null || typeof data.price !== 'number') {
                console.error('Invalid price data:', data);
                priceValue.textContent = 'N/A';
                priceValueInr.textContent = 'N/A';
                priceChange.textContent = 'Price data unavailable';
                priceHigh.textContent = '-';
                priceHighInr.textContent = '-';
                priceLow.textContent = '-';
                priceLowInr.textContent = '-';
                priceVolume.textContent = '-';
                priceVolumeInr.textContent = '-';
                lastUpdated.textContent = 'Last Updated: Never';
                // Check if notifications object exists before using it
                if (window.notifications) {
                    notifications.error('Price Update Failed', 'Unable to fetch current price data');
                }
                return;
            }

            // Update price value (USD)
            priceValue.textContent = `$${data.price.toFixed(4)}`;
            // Update price value (INR)
            priceValueInr.textContent = formatInr(data.price_inr);

            // Update price change
            if (typeof data.change24h === 'number' && !isNaN(data.change24h)) {
                const changeText = `${data.change24h > 0 ? '+' : ''}${data.change24h.toFixed(2)}%`;
                priceChange.textContent = changeText;
                priceChange.className = `price-change ${data.change24h >= 0 ? 'positive' : 'negative'}`;
            } else {
                console.warn('Invalid change24h value:', data.change24h);
                priceChange.textContent = 'Change data unavailable';
            }

            // Update other price details (USD)
            priceHigh.textContent = (typeof data.high24h === 'number' && !isNaN(data.high24h)) ?
                `$${data.high24h.toFixed(4)}` : '-';
            priceLow.textContent = (typeof data.low24h === 'number' && !isNaN(data.low24h)) ?
                `$${data.low24h.toFixed(4)}` : '-';
            priceVolume.textContent = (typeof data.volume24h === 'number' && !isNaN(data.volume24h)) ?
                `$${data.volume24h.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-';

            // Update other price details (INR)
            priceHighInr.textContent = formatInr(data.high24h_inr);
            priceLowInr.textContent = formatInr(data.low24h_inr);
            priceVolumeInr.textContent = formatInr(data.volume24h_inr);

            // Update last updated time
            if (data.timestamp) {
                const date = new Date(data.timestamp);
                lastUpdated.textContent = `Last Updated: ${date.toLocaleString()}`;
            } else {
                lastUpdated.textContent = 'Last Updated: Unknown';
            }

            // Show notification only if price_inr is available (indicates successful conversion)
            if (window.notifications) {
                if (data.price_inr !== null) {
                    notifications.info('Price Updated', `Current PiCoin price: ${priceValue.textContent} / ${priceValueInr.textContent}`);
                } else {
                    notifications.info('Price Updated', `Current PiCoin price: ${priceValue.textContent} (INR unavailable)`);
                }
            }

        } catch (error) {
            console.error('Error fetching price:', error);
            priceValue.textContent = 'Error';
            priceValueInr.textContent = ''; // Clear INR on error
            priceChange.textContent = 'Failed to fetch price data';
            priceHigh.textContent = '-';
            priceHighInr.textContent = '';
            priceLow.textContent = '-';
            priceLowInr.textContent = '';
            priceVolume.textContent = '-';
            priceVolumeInr.textContent = '';
            lastUpdated.textContent = 'Last Updated: Never';
            if (window.notifications) {
                notifications.error('Error', 'Failed to fetch price data');
            }
        }
    };

    // Handle form submission
    subscribeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('email');
        const email = emailInput.value;

        try {
            const response = await fetch('/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (data.success) {
                if (window.notifications) {
                    notifications.success('Success', 'Successfully subscribed to PiCoin updates!');
                }
                subscribeForm.reset();
            } else {
                if (window.notifications) {
                    notifications.error('Error', data.message || 'Failed to subscribe');
                }
            }
        } catch (error) {
            console.error('Error subscribing:', error);
            if (window.notifications) {
                notifications.error('Error', 'Failed to subscribe. Please try again.');
            }
        }
    });

    // Refresh price when button is clicked
    refreshPrice.addEventListener('click', () => {
        if (window.notifications) {
            notifications.info('Refreshing', 'Fetching latest PiCoin price...');
        }
        fetchPrice();
    });

    // Function to check if it's time to fetch price
    const shouldFetchPrice = () => {
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();
        
        // Check if current time matches any of our target times (8 AM, 1 PM, 9 PM)
        return (hour === 8 && minute === 0) || 
               (hour === 13 && minute === 0) || 
               (hour === 21 && minute === 0);
    };

    // Function to schedule next price fetch
    const scheduleNextFetch = () => {
        const now = new Date();
        const nextFetch = new Date(now);
        
        // Set to next hour
        nextFetch.setHours(now.getHours() + 1);
        nextFetch.setMinutes(0);
        nextFetch.setSeconds(0);
        
        // If next hour is not one of our target times, find the next target time
        while (![8, 13, 21].includes(nextFetch.getHours())) {
            nextFetch.setHours(nextFetch.getHours() + 1);
        }
        
        const delay = nextFetch.getTime() - now.getTime();
        setTimeout(() => {
            fetchPrice();
            scheduleNextFetch(); // Schedule next fetch after current one
        }, delay);
    };

    // Initial fetch
    fetchPrice();
    
    // Schedule next fetch
    scheduleNextFetch();
    
    // Show welcome notification
    notifications.info('Welcome', 'Welcome to PiCoin Price Tracker');
}); 