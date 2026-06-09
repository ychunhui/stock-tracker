// Test script to verify Yahoo Finance API is working
const testSymbol = 'AAPL';
const YAHOO_FINANCE_API = 'https://query1.finance.yahoo.com/v8/finance/chart/';

async function testYahooFinanceAPI() {
    console.log(`Testing Yahoo Finance API for ${testSymbol}...`);
    
    try {
        const response = await fetch(`${YAHOO_FINANCE_API}${testSymbol}?interval=1d&range=1d`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const quote = data.chart.result[0];
        const meta = quote.meta;
        
        console.log('\n✅ API Response Successful!');
        console.log('----------------------------');
        console.log(`Symbol: ${testSymbol}`);
        console.log(`Current Price: $${meta.regularMarketPrice.toFixed(2)}`);
        console.log(`Previous Close: $${meta.chartPreviousClose.toFixed(2)}`);
        console.log(`Change: $${(meta.regularMarketPrice - meta.chartPreviousClose).toFixed(2)}`);
        console.log(`Change %: ${(((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100).toFixed(2)}%`);
        console.log(`Currency: ${meta.currency}`);
        console.log(`Exchange: ${meta.exchangeName}`);
        console.log('----------------------------\n');
        
        return true;
    } catch (error) {
        console.error('\n❌ API Test Failed!');
        console.error('Error:', error.message);
        console.error('\nPossible issues:');
        console.error('1. CORS policy blocking the request (need to run from a web server)');
        console.error('2. Network connectivity issues');
        console.error('3. Yahoo Finance API temporarily unavailable');
        console.error('\nSolution: Open index.html in a browser to see it working with CORS proxy or use a local server.\n');
        return false;
    }
}

// Run the test
testYahooFinanceAPI();

// Made with Bob
