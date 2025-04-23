document.addEventListener('DOMContentLoaded', () => {
    const subscriptionsList = document.getElementById('subscriptionsList');
    const subscriptionCount = document.getElementById('subscriptionCount');
    const refreshBtn = document.getElementById('refreshBtn');
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
    const sendUpdate = document.getElementById('sendUpdate');

    // Helper function to format INR
    const formatInr = (value) => {
        if (value === null || typeof value !== 'number' || isNaN(value)) {
            return '-';
        }
        return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // Function to fetch and display subscriptions
    const fetchSubscriptions = async () => {
        try {
            const response = await fetch('/api/subscriptions');
            const subscriptions = await response.json();

            subscriptionCount.textContent = `Total Subscriptions: ${subscriptions.length}`;
            subscriptionsList.innerHTML = '';

            if (subscriptions.length === 0) {
                subscriptionsList.innerHTML = '<div class="no-subscriptions">No subscriptions yet</div>';
                return;
            }

            subscriptions.forEach(email => {
                const item = document.createElement('div');
                item.className = 'subscription-item';
                item.textContent = email;
                subscriptionsList.appendChild(item);
            });
            // Check if notifications object exists before using it
            if (window.notifications) {
                notifications.info('Subscriptions Updated', `Total subscriptions: ${subscriptions.length}`);
            }
        } catch (error) {
            console.error('Error fetching subscriptions:', error);
            subscriptionsList.innerHTML = '<div class="no-subscriptions">Error loading subscriptions</div>';
            if (window.notifications) {
                notifications.error('Error', 'Failed to load subscriptions');
            }
        }
    };

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
        setTimeout(async () => {
            await fetchPrice();
            // Send update emails after fetching new price
            try {
                const response = await fetch('/api/send-update', {
                    method: 'POST'
                });
                const result = await response.json();
                if (result.success) {
                    console.log('Scheduled price update emails sent successfully');
                } else {
                    console.error('Failed to send scheduled price update emails:', result.message);
                }
            } catch (error) {
                console.error('Error sending scheduled price update emails:', error);
            }
            scheduleNextFetch(); // Schedule next fetch after current one
        }, delay);
    };

    // Function to fetch and display price
    const fetchPrice = async () => {
        try {
            const response = await fetch('/api/price');
            const data = await response.json();
            
            if (data.error || !data || data.price === null || typeof data.price !== 'number') {
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
                notifications.error('Price Update Failed', 'Unable to fetch current price data');
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
            if (data.price_inr !== null) {
                notifications.info('Price Updated', `Current PiCoin price: ${priceValue.textContent} / ${priceValueInr.textContent}`);
            } else {
                notifications.info('Price Updated', `Current PiCoin price: ${priceValue.textContent} (INR unavailable)`);
            }

            // If this is a scheduled fetch (8 AM, 1 PM, or 9 PM), send email updates
            if (shouldFetchPrice()) {
                try {
                    notifications.info('Sending Updates', 'Sending price updates to all subscribers...');
                    const updateResponse = await fetch('/api/send-update', { method: 'POST' });
                    const updateData = await updateResponse.json();
                    
                    if (updateData.success) {
                        notifications.success('Success', 'Updates sent successfully to all subscribers!');
                    } else {
                        notifications.error('Error', updateData.message || 'Failed to send updates');
                    }
                } catch (error) {
                    console.error('Error sending update:', error);
                    notifications.error('Error', 'Failed to send updates to subscribers');
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
            notifications.error('Error', 'Failed to fetch price data');
        }
    };

    // Event Listeners
    refreshBtn.addEventListener('click', () => {
         if (window.notifications) {
            notifications.info('Refreshing', 'Updating subscription list...');
         }
        fetchSubscriptions();
    });

    refreshPrice.addEventListener('click', () => {
         if (window.notifications) {
            notifications.info('Refreshing', 'Fetching latest PiCoin price...');
         }
        fetchPrice();
    });

    sendUpdate.addEventListener('click', async () => {
        if (window.notifications) {
            notifications.info('Sending Updates', 'Sending price updates to all subscribers...');
        }
        try {
            const response = await fetch('/api/send-update', {
                method: 'POST'
            });
            const result = await response.json();
            
            if (result.success) {
                if (window.notifications) {
                    notifications.success('Updates Sent', 'Price updates sent successfully to all subscribers');
                }
            } else {
                if (window.notifications) {
                    notifications.error('Update Failed', result.message || 'Failed to send updates');
                }
            }
        } catch (error) {
            console.error('Error sending updates:', error);
            if (window.notifications) {
                notifications.error('Update Failed', 'Failed to send price updates');
            }
        }
    });

    // Initial data fetch
    fetchSubscriptions();
    fetchPrice();
    
    // Schedule next fetch
    scheduleNextFetch();
    
    // Show welcome notification
    if (window.notifications) {
        notifications.info('Welcome', 'Welcome to the PiCoin Admin Dashboard');
    }
}); 