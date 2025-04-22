# PiCoin Value Notifier

A web application that sends email notifications about PiCoin value changes.

## Features

- Simple and modern user interface
- Email subscription system
- Real-time notifications
- Responsive design
- Admin dashboard to view subscriptions
- File-based storage for subscriptions
- Real-time PiCoin price from OKX API
- Automatic price updates every 24 hours
- Manual price update option for administrators

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update the following variables in `.env`:
     - `EMAIL_USER`: Your Gmail address
     - `EMAIL_PASS`: Your Gmail app-specific password
     - `PORT`: Server port (default: 3000)

4. Start the server:
   ```bash
   # For production
   npm start
   
   # For development with auto-restart
   npm run dev
   ```

## Development with Nodemon

The project includes nodemon for automatic server restarts during development:

- Run `npm run dev` to start the server with nodemon
- The server will automatically restart when you make changes to:
  - server.js
  - Any files in the public directory
- Nodemon is configured to ignore node_modules and other unnecessary files

## Gmail Setup

To use Gmail for sending emails:

1. Enable 2-Step Verification in your Google Account
2. Generate an App Password:
   - Go to Google Account Settings
   - Security
   - 2-Step Verification
   - App Passwords
   - Generate a new app password for "Mail"
3. Use the generated password in your `.env` file

## Usage

1. Open the application in your browser
2. View the current PiCoin price on the homepage
3. Enter your email address to subscribe to notifications
4. Click "Subscribe" to receive PiCoin value updates

## Admin Dashboard

To view all subscriptions and manage price updates:

1. Navigate to `/admin` in your browser (e.g., http://localhost:3000/admin)
2. The admin page displays:
   - Current PiCoin price and market data
   - Total number of subscriptions
   - List of all subscribed email addresses
3. Features:
   - Click "Refresh List" to update the subscription list
   - Click "Refresh Price" to update the current PiCoin price
   - Click "Send Update to All" to manually send price updates to all subscribers

## Data Storage

The application stores email subscriptions in a JSON file:

- Location: `data/subscriptions.json`
- Format: JSON array of email addresses
- The file is automatically created if it doesn't exist
- Subscriptions persist between server restarts

For a production environment, consider using a proper database like MongoDB or PostgreSQL.

## PiCoin Price Updates

The application fetches real-time PiCoin price data from the OKX API:

- Price data is displayed on both the homepage and admin dashboard
- Subscribers receive price updates automatically every 24 hours
- Administrators can manually trigger price updates from the admin dashboard
- Price data includes:
  - Current price
  - 24-hour price change
  - 24-hour high and low
  - 24-hour trading volume

## Technologies Used

- Node.js
- Express
- Nodemailer
- Axios (for API requests)
- Helmet (for security headers)
- HTML5
- CSS3
- JavaScript

## Production Deployment

When deploying this application to a production environment (like Heroku, Render, AWS, DigitalOcean, etc.), consider the following:

1.  **Environment Variables:** Ensure all required environment variables (`EMAIL_USER`, `EMAIL_PASS`, `EXCHANGE_RATE_API_KEY`, `PORT`) are set correctly in your production environment's configuration. Do *not* commit your `.env` file to version control.
2.  **NODE_ENV:** Set the `NODE_ENV` environment variable to `production`. This often enables performance optimizations in Express and other libraries.
    ```bash
    export NODE_ENV=production # Linux/macOS
    # set NODE_ENV=production # Windows (Command Prompt)
    # $env:NODE_ENV = "production" # Windows (PowerShell)
    ```
3.  **Install Dependencies:** Install only production dependencies:
    ```bash
    npm install --production 
    # Or, preferably, use npm ci for faster, more reliable installs in CI/CD
    # npm ci 
    ```
4.  **Start the Server:** Run the application using the start script:
    ```bash
    npm start
    ```
5.  **Process Manager:** Use a process manager like PM2 to keep the application running reliably, manage logs, and handle restarts.
    ```bash
    # Install PM2 globally (if needed)
    npm install pm2 -g
    # Start the app with PM2
    pm2 start npm --name "picoin-notifier" -- start 
    # Monitor logs
    pm2 logs picoin-notifier
    ```
6.  **Data Storage:** The current file-based storage (`data/subscriptions.json`) is **not recommended for production**. It can lead to data loss or corruption under load and doesn't scale well. Migrate to a proper database (e.g., PostgreSQL, MongoDB, Redis) for managing subscriptions in a production environment.
7.  **HTTPS:** Ensure your application is served over HTTPS. Most hosting platforms provide easy ways to configure SSL certificates (e.g., via Let's Encrypt).
8.  **Logging:** For more robust logging in production, consider replacing `console.log` with a dedicated logging library like Winston or Pino.

# ... (existing license/contact info if any) ... 