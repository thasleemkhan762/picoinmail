class NotificationSystem {
    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'notification-container';
        document.body.appendChild(this.container);
        this.notifications = [];
        this.maxNotifications = 5;
    }

    show(options) {
        const {
            title,
            message,
            type = 'info',
            duration = 5000,
            onClose = null,
            icon = null
        } = options;

        // Remove oldest notification if we've reached the maximum
        if (this.notifications.length >= this.maxNotifications) {
            this.hide(this.notifications[0]);
        }

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // Add icon if provided
        let iconHtml = '';
        if (icon) {
            iconHtml = `<div class="notification-icon">${icon}</div>`;
        }
        
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close" aria-label="Close notification">&times;</button>
        `;

        const closeButton = notification.querySelector('.notification-close');
        closeButton.addEventListener('click', () => {
            this.hide(notification);
            if (onClose) onClose();
        });

        this.container.appendChild(notification);
        this.notifications.push(notification);

        // Add progress bar for auto-dismiss
        if (duration > 0) {
            const progressBar = document.createElement('div');
            progressBar.className = 'notification-progress';
            notification.appendChild(progressBar);
            
            // Animate progress bar
            progressBar.style.transition = `width ${duration}ms linear`;
            setTimeout(() => {
                progressBar.style.width = '0%';
            }, 10);
            
            // Auto-hide after duration
            setTimeout(() => {
                this.hide(notification);
            }, duration);
        }

        return notification;
    }

    hide(notification) {
        if (!notification) return;
        
        notification.classList.add('hiding');
        notification.addEventListener('animationend', () => {
            notification.remove();
            // Remove from our tracking array
            const index = this.notifications.indexOf(notification);
            if (index > -1) {
                this.notifications.splice(index, 1);
            }
        });
    }

    success(title, message, duration = 5000) {
        return this.show({ 
            title, 
            message, 
            type: 'success', 
            duration,
            icon: '✓'
        });
    }

    error(title, message, duration = 5000) {
        return this.show({ 
            title, 
            message, 
            type: 'error', 
            duration,
            icon: '✕'
        });
    }

    info(title, message, duration = 5000) {
        return this.show({ 
            title, 
            message, 
            type: 'info', 
            duration,
            icon: 'ℹ'
        });
    }

    warning(title, message, duration = 5000) {
        return this.show({ 
            title, 
            message, 
            type: 'warning', 
            duration,
            icon: '⚠'
        });
    }
}

// Create global notification instance
window.notifications = new NotificationSystem(); 