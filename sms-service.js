/**
 * SMS Service for sending text messages
 * Uses Twilio API for SMS delivery
 * 
 * Setup Instructions:
 * 1. Sign up for Twilio account at https://www.twilio.com/try-twilio
 * 2. Get your Account SID and Auth Token from Twilio Console
 * 3. Get a Twilio phone number
 * 4. Replace the credentials below with your actual values
 */

// Twilio Configuration
const TWILIO_CONFIG = {
    accountSid: 'YOUR_TWILIO_ACCOUNT_SID',
    authToken: 'YOUR_TWILIO_AUTH_TOKEN',
    fromNumber: 'YOUR_TWILIO_PHONE_NUMBER' // Format: +1234567890
};

/**
 * Send SMS message using Twilio API
 * @param {string} toNumber - Recipient phone number (format: +1234567890)
 * @param {string} message - Message text to send
 * @returns {Promise<Object>} Response from Twilio API
 */
async function sendSMS(toNumber, message) {
    // Validate inputs
    if (!toNumber || !message) {
        throw new Error('Phone number and message are required');
    }

    // Validate phone number format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(toNumber.replace(/[\s-()]/g, ''))) {
        throw new Error('Invalid phone number format. Use international format: +1234567890');
    }

    // Check if Twilio is configured
    if (TWILIO_CONFIG.accountSid === 'YOUR_TWILIO_ACCOUNT_SID') {
        console.error('Twilio not configured. Please add your credentials in sms-service.js');
        return {
            success: false,
            error: 'SMS service not configured'
        };
    }

    try {
        // Prepare Twilio API request
        const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_CONFIG.accountSid}/Messages.json`;
        
        const formData = new URLSearchParams();
        formData.append('To', toNumber);
        formData.append('From', TWILIO_CONFIG.fromNumber);
        formData.append('Body', message);

        // Create Basic Auth header
        const credentials = btoa(`${TWILIO_CONFIG.accountSid}:${TWILIO_CONFIG.authToken}`);

        // Send SMS via Twilio API
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            console.log('SMS sent successfully:', data.sid);
            return {
                success: true,
                messageId: data.sid,
                status: data.status,
                to: data.to,
                from: data.from
            };
        } else {
            console.error('Failed to send SMS:', data);
            return {
                success: false,
                error: data.message || 'Failed to send SMS'
            };
        }
    } catch (error) {
        console.error('Error sending SMS:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Send stock alert SMS
 * @param {string} toNumber - Recipient phone number
 * @param {Object} stockData - Stock data object
 * @returns {Promise<Object>} Response from SMS service
 */
async function sendStockAlert(toNumber, stockData) {
    const message = `
🚨 Stock Alert: ${stockData.symbol}
Price: $${stockData.price}
Change: ${stockData.change} (${stockData.changePercent}%)
${stockData.isPositive ? '📈 UP' : '📉 DOWN'}
    `.trim();

    return await sendSMS(toNumber, message);
}

/**
 * Send price change notification
 * @param {string} toNumber - Recipient phone number
 * @param {string} symbol - Stock symbol
 * @param {number} changePercent - Price change percentage
 * @param {string} newsHeadline - Optional news headline
 * @returns {Promise<Object>} Response from SMS service
 */
async function sendPriceChangeAlert(toNumber, symbol, changePercent, newsHeadline = null) {
    let message = `⚠️ ${symbol} moved ${Math.abs(changePercent).toFixed(1)}% today!`;
    
    if (newsHeadline) {
        message += `\n\n📰 ${newsHeadline}`;
    }

    return await sendSMS(toNumber, message);
}

/**
 * Format phone number to international format
 * @param {string} phoneNumber - Phone number in any format
 * @param {string} countryCode - Country code (default: +1 for US)
 * @returns {string} Formatted phone number
 */
function formatPhoneNumber(phoneNumber, countryCode = '+1') {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');
    
    // Add country code if not present
    if (!phoneNumber.startsWith('+')) {
        return `${countryCode}${digits}`;
    }
    
    return `+${digits}`;
}

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        sendSMS,
        sendStockAlert,
        sendPriceChangeAlert,
        formatPhoneNumber
    };
}

// Made with Bob
