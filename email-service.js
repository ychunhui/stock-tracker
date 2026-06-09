/**
 * Email Service for sending emails
 * Uses EmailJS for email delivery (no backend required)
 * 
 * Setup Instructions:
 * 1. Sign up for free EmailJS account at https://www.emailjs.com/
 * 2. Create an email service (Gmail, Outlook, etc.)
 * 3. Create an email template
 * 4. Get your Public Key, Service ID, and Template ID
 * 5. Replace the credentials below with your actual values
 */

// EmailJS Configuration
const EMAILJS_CONFIG = {
    publicKey: 'YOUR_EMAILJS_PUBLIC_KEY',
    serviceId: 'YOUR_SERVICE_ID',
    templateId: 'YOUR_TEMPLATE_ID'
};

/**
 * Initialize EmailJS
 */
function initEmailJS() {
    if (typeof emailjs !== 'undefined' && EMAILJS_CONFIG.publicKey !== 'YOUR_EMAILJS_PUBLIC_KEY') {
        emailjs.init(EMAILJS_CONFIG.publicKey);
        console.log('EmailJS initialized');
    }
}

/**
 * Send email using EmailJS
 * @param {string} toEmail - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} message - Email message body
 * @param {string} fromName - Sender name (optional)
 * @returns {Promise<Object>} Response from EmailJS
 */
async function sendEmail(toEmail, subject, message, fromName = 'Be My Ext') {
    // Validate inputs
    if (!toEmail || !subject || !message) {
        throw new Error('Email address, subject, and message are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(toEmail)) {
        throw new Error('Invalid email address format');
    }

    // Check if EmailJS is configured
    if (EMAILJS_CONFIG.publicKey === 'YOUR_EMAILJS_PUBLIC_KEY') {
        console.error('EmailJS not configured. Please add your credentials in email-service.js');
        return {
            success: false,
            error: 'Email service not configured'
        };
    }

    // Check if EmailJS library is loaded
    if (typeof emailjs === 'undefined') {
        console.error('EmailJS library not loaded. Add the script tag to your HTML.');
        return {
            success: false,
            error: 'EmailJS library not loaded'
        };
    }

    try {
        // Initialize EmailJS if not already done
        initEmailJS();

        // Prepare template parameters
        const templateParams = {
            to_email: toEmail,
            from_name: fromName,
            subject: subject,
            message: message,
            reply_to: toEmail
        };

        // Send email via EmailJS
        const response = await emailjs.send(
            EMAILJS_CONFIG.serviceId,
            EMAILJS_CONFIG.templateId,
            templateParams
        );

        console.log('Email sent successfully:', response);
        return {
            success: true,
            status: response.status,
            text: response.text
        };
    } catch (error) {
        console.error('Error sending email:', error);
        return {
            success: false,
            error: error.text || error.message || 'Failed to send email'
        };
    }
}

/**
 * Send stock alert email
 * @param {string} toEmail - Recipient email address
 * @param {Object} stockData - Stock data object
 * @returns {Promise<Object>} Response from email service
 */
async function sendStockAlertEmail(toEmail, stockData) {
    const subject = `Stock Alert: ${stockData.symbol} - ${stockData.isPositive ? 'UP' : 'DOWN'} ${Math.abs(stockData.changePercent)}%`;
    
    const message = `
Stock Alert for ${stockData.symbol}

Company: ${stockData.companyName}
Current Price: $${stockData.price}
Previous Close: $${stockData.previousClose}
Change: ${stockData.change} (${stockData.changePercent}%)
Status: ${stockData.isPositive ? '📈 UP' : '📉 DOWN'}

Day Range: $${stockData.dayLow} - $${stockData.dayHigh}
52 Week Range: $${stockData.yearLow} - $${stockData.yearHigh}

${stockData.pe ? `P/E Ratio: ${stockData.pe}` : ''}
${stockData.eps ? `EPS: $${stockData.eps}` : ''}
${stockData.dividendYield ? `Dividend Yield: ${stockData.dividendYield}%` : ''}

---
Sent from Be My Ext Stock Tracker
    `.trim();

    return await sendEmail(toEmail, subject, message);
}

/**
 * Send price change notification email
 * @param {string} toEmail - Recipient email address
 * @param {string} symbol - Stock symbol
 * @param {number} changePercent - Price change percentage
 * @param {Array} newsItems - Optional news articles
 * @returns {Promise<Object>} Response from email service
 */
async function sendPriceChangeAlertEmail(toEmail, symbol, changePercent, newsItems = []) {
    const subject = `⚠️ ${symbol} Price Alert: ${Math.abs(changePercent).toFixed(1)}% Change`;
    
    let message = `
Price Alert for ${symbol}

The stock has moved ${Math.abs(changePercent).toFixed(1)}% ${changePercent > 0 ? 'up' : 'down'} today!

This significant price movement may require your attention.
    `.trim();

    // Add news if available
    if (newsItems && newsItems.length > 0) {
        message += '\n\n📰 Related News:\n\n';
        newsItems.forEach((news, index) => {
            message += `${index + 1}. ${news.headline}\n`;
            message += `   Source: ${news.source}\n`;
            if (news.url) {
                message += `   Link: ${news.url}\n`;
            }
            message += '\n';
        });
    }

    message += '\n---\nSent from Be My Ext Stock Tracker';

    return await sendEmail(toEmail, subject, message);
}

/**
 * Send daily stock summary email
 * @param {string} toEmail - Recipient email address
 * @param {Array} stocksData - Array of stock data objects
 * @returns {Promise<Object>} Response from email service
 */
async function sendDailySummaryEmail(toEmail, stocksData) {
    const subject = `Daily Stock Summary - ${new Date().toLocaleDateString()}`;
    
    let message = 'Daily Stock Portfolio Summary\n\n';
    
    // Sort by absolute change percentage
    const sortedStocks = [...stocksData].sort((a, b) => 
        Math.abs(parseFloat(b.changePercent)) - Math.abs(parseFloat(a.changePercent))
    );

    // Top movers
    message += '📊 Top Movers:\n\n';
    sortedStocks.slice(0, 5).forEach(stock => {
        const arrow = stock.isPositive ? '📈' : '📉';
        message += `${arrow} ${stock.symbol}: $${stock.price} (${stock.changePercent}%)\n`;
    });

    // All stocks summary
    message += '\n\n📋 All Stocks:\n\n';
    stocksData.forEach(stock => {
        message += `${stock.symbol}: $${stock.price} (${stock.change} / ${stock.changePercent}%)\n`;
    });

    message += '\n---\nSent from Be My Ext Stock Tracker';

    return await sendEmail(toEmail, subject, message);
}

/**
 * Validate email address
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        sendEmail,
        sendStockAlertEmail,
        sendPriceChangeAlertEmail,
        sendDailySummaryEmail,
        isValidEmail,
        initEmailJS
    };
}

// Made with Bob
