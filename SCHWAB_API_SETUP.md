# Schwab API Setup Guide

This guide will help you set up the Schwab API integration for the stock tracker application.

## Overview

The Schwab API provides access to market data, quotes, and trading capabilities. This integration uses the **Market Data API** to fetch real-time stock quotes.

## Prerequisites

- A Schwab brokerage account (or create one at https://www.schwab.com/)
- Basic understanding of OAuth 2.0 authentication

## Step 1: Register as an Individual Developer

1. Visit the Schwab Developer Portal: https://developer.schwab.com/
2. Click **"Get Started"** or **"Sign Up"**
3. Log in with your Schwab account credentials
4. Accept the Developer Terms and Conditions
5. Complete your developer profile

## Step 2: Create an Application

1. Once logged in to the Developer Portal, navigate to **"My Apps"**
2. Click **"Create New App"**
3. Fill in the application details:
   - **App Name**: Stock Tracker (or your preferred name)
   - **App Type**: Individual Developer
   - **Description**: Real-time stock market data tracker
   - **Redirect URI**: `http://localhost:8080/callback` (for local development)
4. Select the APIs you need:
   - ✅ **Market Data API** (required for quotes)
   - ✅ **Accounts and Trading API** (optional)
5. Submit your application

## Step 3: Get Your API Credentials

After your app is approved (usually instant for Market Data API):

1. Go to **"My Apps"** in the Developer Portal
2. Click on your application
3. You'll see:
   - **App Key** (Client ID)
   - **App Secret** (Client Secret)
4. Copy these credentials - you'll need them for configuration

## Step 4: Configure the Application

Open `stocks.js` and update the Schwab API credentials:

```javascript
// Schwab API credentials
const SCHWAB_API_KEY = 'YOUR_APP_KEY_HERE';
const SCHWAB_API_SECRET = 'YOUR_APP_SECRET_HERE';
```

## Step 5: Implement OAuth 2.0 Flow

The Schwab API uses OAuth 2.0 for authentication. Here's the flow:

### Authorization Request

1. Redirect user to Schwab authorization URL:
```
https://api.schwabapi.com/v1/oauth/authorize?
  client_id=YOUR_APP_KEY&
  redirect_uri=YOUR_REDIRECT_URI&
  response_type=code
```

2. User logs in and authorizes your app
3. Schwab redirects back to your redirect URI with an authorization code

### Token Exchange

Exchange the authorization code for an access token:

```javascript
POST https://api.schwabapi.com/v1/oauth/token
Headers:
  Content-Type: application/x-www-form-urlencoded
  Authorization: Basic BASE64(APP_KEY:APP_SECRET)
Body:
  grant_type=authorization_code
  code=AUTHORIZATION_CODE
  redirect_uri=YOUR_REDIRECT_URI
```

Response:
```json
{
  "access_token": "YOUR_ACCESS_TOKEN",
  "refresh_token": "YOUR_REFRESH_TOKEN",
  "expires_in": 1800,
  "token_type": "Bearer"
}
```

### Update Access Token

Update the access token in `stocks.js`:
```javascript
const SCHWAB_ACCESS_TOKEN = 'YOUR_ACCESS_TOKEN_HERE';
```

## Step 6: Test the Integration

1. Open your stock tracker application
2. Click the **"Schwab"** button to switch data sources
3. The app will fetch stock data from Schwab API
4. Check browser console for any errors

## API Endpoints Used

### Get Quote
```
GET https://api.schwabapi.com/marketdata/v1/quotes?symbols=AAPL,MSFT,GOOGL
Headers:
  Authorization: Bearer YOUR_ACCESS_TOKEN
  Accept: application/json
```

### Response Format
```json
{
  "AAPL": {
    "quote": {
      "lastPrice": 178.45,
      "closePrice": 176.11,
      "highPrice": 180.20,
      "lowPrice": 176.80,
      "totalVolume": 52000000,
      "52WeekHigh": 195.30,
      "52WeekLow": 142.50
    },
    "fundamental": {
      "peRatio": 28.92,
      "eps": 6.17,
      "divYield": 0.0051,
      "divAmount": 0.96,
      "marketCap": 2800000000000
    }
  }
}
```

## Token Refresh

Access tokens expire after 30 minutes. Implement token refresh:

```javascript
POST https://api.schwabapi.com/v1/oauth/token
Headers:
  Content-Type: application/x-www-form-urlencoded
  Authorization: Basic BASE64(APP_KEY:APP_SECRET)
Body:
  grant_type=refresh_token
  refresh_token=YOUR_REFRESH_TOKEN
```

## Rate Limits

- **Market Data API**: 120 requests per minute
- **Quotes**: Up to 500 symbols per request
- Monitor `X-RateLimit-*` headers in responses

## Security Best Practices

1. **Never commit credentials** to version control
2. Store tokens securely (use environment variables or secure storage)
3. Implement token refresh before expiration
4. Use HTTPS for all API calls
5. Validate and sanitize all inputs

## Troubleshooting

### Common Issues

**401 Unauthorized**
- Check if access token is valid and not expired
- Verify Authorization header format: `Bearer YOUR_TOKEN`
- Refresh token if expired

**403 Forbidden**
- Verify your app has access to Market Data API
- Check if your Schwab account is active

**429 Too Many Requests**
- You've exceeded rate limits
- Implement request throttling
- Wait before retrying

**CORS Errors**
- Schwab API may not support browser-based requests
- Consider using a backend proxy server
- Use the provided Python proxy server (`server.py`)

## Production Deployment

For production use:

1. **Backend Server**: Implement OAuth flow on backend
2. **Token Storage**: Store tokens securely in database
3. **Token Management**: Auto-refresh tokens before expiration
4. **Error Handling**: Implement retry logic with exponential backoff
5. **Monitoring**: Log API usage and errors

## Additional Resources

- **Schwab Developer Portal**: https://developer.schwab.com/
- **API Documentation**: https://developer.schwab.com/products/trader-api--individual
- **Support**: Contact Schwab Developer Support through the portal
- **Community**: Join Schwab Developer Community forums

## Example Implementation

See `stocks.js` for the complete implementation:
- `fetchFromSchwab()` - Main function to fetch stock data
- `getSchwabAccessToken()` - OAuth token management
- Data source switching with Schwab button

## Notes

- Schwab API is free for individual developers
- Real-time market data included
- No additional fees for Market Data API
- Suitable for personal projects and applications

---

**Last Updated**: June 2026
**API Version**: v1