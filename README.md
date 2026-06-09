# Be My Ext - Stock Tracker

A comprehensive web-based stock tracking application with real-time price updates, news alerts, and notification capabilities.

![Be My Ext](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 🚀 Features

### 📊 Stock Tracking
- **Real-time stock prices** from Yahoo Finance and Finnhub APIs
- **14 pre-configured stocks**: IBM, TQQQ, SPY, NVDA, AMD, MU, C, AAL, TSLA, KHC, U, NET, FSLR, AAPL
- **Historical price charts** with 1-year daily data visualization
- **Financial metrics**: P/E ratio, EPS, dividend yield, and more
- **Price ranges**: Daily and 52-week high/low tracking

### 📰 Smart Alerts
- **Automatic news fetching** when price changes exceed 10%
- **Weekly highlights** explaining significant price movements
- **Price change indicators** with visual feedback

### 📧 Notifications
- **Email alerts** via EmailJS integration
- **SMS notifications** via Twilio integration
- **Stock alerts**, price change notifications, and daily summaries

### 🎨 User Interface
- **Responsive design** for desktop, tablet, and mobile
- **Dual data sources**: Switch between Yahoo Finance and Finnhub
- **Manual refresh** control
- **Clean, modern interface** with gradient themes

## 📁 Project Structure

```
BMX/
├── index.html              # Landing page
├── stocks.html             # Main stock tracker page
├── email-test.html         # Email testing interface
├── sms-test.html          # SMS testing interface
├── styles.css             # Global styles
├── stocks.js              # Stock tracking logic
├── email-service.js       # Email functionality
├── sms-service.js         # SMS functionality
├── test-yahoo-api.js      # API testing utilities
├── server.py              # Local proxy server (optional)
└── README.md              # This file
```

## 🛠️ Setup Instructions

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection for API calls
- (Optional) Python 3.x for local proxy server

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/be-my-ext.git
   cd be-my-ext
   ```

2. **Open in browser**
   ```bash
   # Simply open index.html in your browser
   open index.html
   # or
   start index.html
   ```

3. **Configure API Keys** (Optional but recommended)

   #### Finnhub API (for real-time data)
   - Sign up at [Finnhub.io](https://finnhub.io/register)
   - Get your free API key
   - Update `stocks.js` line 12:
     ```javascript
     const FINNHUB_API_KEY = 'your_api_key_here';
     ```

   #### EmailJS (for email notifications)
   - Sign up at [EmailJS.com](https://www.emailjs.com/)
   - Create email service and template
   - Update `email-service.js` lines 14-18:
     ```javascript
     const EMAILJS_CONFIG = {
         publicKey: 'your_public_key',
         serviceId: 'your_service_id',
         templateId: 'your_template_id'
     };
     ```

   #### Twilio (for SMS notifications)
   - Sign up at [Twilio.com](https://www.twilio.com/try-twilio)
   - Get Account SID, Auth Token, and phone number
   - Update `sms-service.js` lines 14-18:
     ```javascript
     const TWILIO_CONFIG = {
         accountSid: 'your_account_sid',
         authToken: 'your_auth_token',
         fromNumber: '+1234567890'
     };
     ```

### Local Proxy Server (Optional)

For better CORS handling, run the local Python proxy:

```bash
python server.py
```

Then access the app at `http://localhost:8000`

## 📖 Usage Guide

### Viewing Stocks
1. Open `index.html` or navigate to `stocks.html`
2. View real-time prices for all tracked stocks
3. Scroll down to see historical price charts

### Switching Data Sources
- Click **"Yahoo Finance"** for delayed data (free, no API key needed)
- Click **"Finnhub"** for real-time data (requires API key)

### Manual Refresh
- Click the **"🔄 Refresh Prices"** button to update all stock data

### Email Notifications
1. Configure EmailJS (see setup above)
2. Open `email-test.html`
3. Send test emails or integrate into stock alerts

### SMS Notifications
1. Configure Twilio (see setup above)
2. Open `sms-test.html`
3. Send test messages or integrate into stock alerts

## 🔧 Configuration

### Adding New Stocks

Edit `stocks.js` line 2:
```javascript
const stockSymbols = ['IBM', 'TQQQ', 'SPY', 'YOUR_STOCK'];
```

Then add the stock card HTML in `stocks.html` following the existing pattern.

### Customizing Alert Thresholds

Edit `stocks.js` line 552 to change the 10% threshold:
```javascript
const shouldShowNews = dailyChange > 10 || weeklyChange > 10;
```

### Styling

Modify `styles.css` to customize colors, fonts, and layout.

## 🌐 API Information

### Yahoo Finance
- **Free**: Yes
- **Rate Limit**: Varies
- **Data Delay**: 15-20 minutes
- **No API Key Required**

### Finnhub
- **Free Tier**: 60 calls/minute
- **Rate Limit**: 60/min
- **Data Delay**: Real-time
- **API Key Required**: Yes

### EmailJS
- **Free Tier**: 200 emails/month
- **Rate Limit**: Reasonable
- **Setup Time**: 5 minutes

### Twilio
- **Free Trial**: $15 credit
- **Cost**: ~$0.0075/SMS (US)
- **Setup Time**: 5 minutes

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Yahoo Finance](https://finance.yahoo.com/) for stock data
- [Finnhub](https://finnhub.io/) for real-time stock API
- [EmailJS](https://www.emailjs.com/) for email service
- [Twilio](https://www.twilio.com/) for SMS service
- [Chart.js](https://www.chartjs.org/) for data visualization

## 📧 Contact

Project Link: [https://github.com/yourusername/be-my-ext](https://github.com/yourusername/be-my-ext)

## 🐛 Known Issues

- Yahoo Finance API may have CORS issues when accessed directly (use proxy or Finnhub)
- SMS requires Twilio account with verified phone numbers during trial
- Email requires EmailJS configuration

## 🔮 Future Enhancements

- [ ] User authentication and personalized watchlists
- [ ] Portfolio tracking with buy/sell history
- [ ] Advanced charting with technical indicators
- [ ] Mobile app version
- [ ] Real-time WebSocket updates
- [ ] Cryptocurrency support
- [ ] International stock markets

---

Made with ❤️ by Bob