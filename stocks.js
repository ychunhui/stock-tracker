// Stock data management
const stockSymbols = [
    // Original stocks
    'IBM', 'TQQQ', 'SPY', 'NVDA', 'AMD', 'MU', 'C', 'AAL', 'TSLA', 'KHC', 'U', 'NET', 'FSLR', 'AAPL',
    // New stocks added
    'AGNC', 'AIG', 'AMZN', 'BAC', 'COKE', 'CRM', 'DIS', 'DUK', 'ENB', 'F', 'FCBC', 'GE', 'GOOG', 'GSK',
    'HAL', 'IVV', 'IWY', 'LYB', 'MO', 'MOAT', 'MTCH', 'NFLX', 'O', 'PFE', 'PFF', 'PG', 'PSX', 'PTON',
    'REGN', 'RIVN', 'RSP', 'SHOP', 'T', 'UBER', 'UPS', 'USB', 'UVE', 'VNQ', 'WBD', 'WFC', 'XLE', 'XLK'
];

// Check if running on local server (has proxy) or static file
const isLocalServer = window.location.protocol === 'http:' && window.location.hostname === 'localhost';

// Current data source (default: yahoo)
let currentDataSource = 'yahoo';

// Finnhub API key
// Get free key at: https://finnhub.io/register
const FINNHUB_API_KEY = 'd8k8941r01qjgd6sju90d8k8941r01qjgd6sju9g';

// Multiple API endpoints for redundancy
const API_ENDPOINTS = [
    // Yahoo Finance v7 - FIRST because it has PE, EPS, and Dividend data
    {
        name: 'Yahoo Finance v7',
        url: (symbol) => `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`,
        parse: (data) => {
            const quote = data.quoteResponse.result[0];
            return {
                price: quote.regularMarketPrice,
                previousClose: quote.regularMarketPreviousClose,
                dayLow: quote.regularMarketDayLow,
                dayHigh: quote.regularMarketDayHigh,
                yearLow: quote.fiftyTwoWeekLow,
                yearHigh: quote.fiftyTwoWeekHigh,
                pe: quote.trailingPE || quote.forwardPE,
                eps: quote.epsTrailingTwelveMonths || quote.epsForward,
                dividendYield: quote.dividendYield,
                dividendRate: quote.trailingAnnualDividendRate
            };
        }
    },
    // Local proxy server (best option - no CORS issues)
    ...(isLocalServer ? [{
        name: 'Local Proxy',
        url: (symbol) => `/api/stock?symbol=${symbol}`,
        parse: (data) => {
            const quote = data.chart.result[0];
            const meta = quote.meta;
            const indicators = quote.indicators.quote[0];
            
            // Get 52-week range from historical data
            const highs = indicators.high.filter(h => h !== null);
            const lows = indicators.low.filter(l => l !== null);
            
            return {
                price: meta.regularMarketPrice,
                previousClose: meta.chartPreviousClose || meta.previousClose,
                dayLow: meta.regularMarketDayLow,
                dayHigh: meta.regularMarketDayHigh,
                yearLow: lows.length > 0 ? Math.min(...lows) : null,
                yearHigh: highs.length > 0 ? Math.max(...highs) : null
            };
        }
    }] : []),
    {
        name: 'Yahoo Finance Chart',
        url: (symbol) => `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1y`,
        parse: (data) => {
            const quote = data.chart.result[0];
            const meta = quote.meta;
            const indicators = quote.indicators.quote[0];
            
            // Get 52-week range from historical data
            const highs = indicators.high.filter(h => h !== null);
            const lows = indicators.low.filter(l => l !== null);
            
            return {
                price: meta.regularMarketPrice,
                previousClose: meta.chartPreviousClose || meta.previousClose,
                dayLow: meta.regularMarketDayLow,
                dayHigh: meta.regularMarketDayHigh,
                yearLow: lows.length > 0 ? Math.min(...lows) : null,
                yearHigh: highs.length > 0 ? Math.max(...highs) : null
            };
        }
    }
];

const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

/**
 * Fetch stock data from Yahoo Finance with multiple fallback methods
 * @param {string} symbol - Stock ticker symbol
 * @returns {Promise<Object>} Stock data including price and change
 */
async function fetchStockPrice(symbol) {
    // If Finnhub is selected, use Finnhub API
    if (currentDataSource === 'finnhub') {
        return await fetchFromFinnhub(symbol);
    }
    
    // Otherwise use Yahoo Finance endpoints
    // Try each API endpoint
    for (const endpoint of API_ENDPOINTS) {
        try {
            console.log(`Trying ${endpoint.name} for ${symbol}...`);
            
            // Try direct call first
            let response;
            let data;
            
            try {
                response = await fetch(endpoint.url(symbol), {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                    }
                });
                
                if (response.ok) {
                    data = await response.json();
                    console.log(`✓ Direct ${endpoint.name} succeeded for ${symbol}`);
                }
            } catch (directError) {
                console.log(`Direct ${endpoint.name} failed, trying proxy...`);
            }
            
            // If direct failed, try with CORS proxy
            if (!data) {
                const proxyUrl = `${CORS_PROXY}${encodeURIComponent(endpoint.url(symbol))}`;
                response = await fetch(proxyUrl);
                
                if (response.ok) {
                    data = await response.json();
                    console.log(`✓ Proxy ${endpoint.name} succeeded for ${symbol}`);
                }
            }
            
            if (data) {
                // Parse the response using endpoint-specific parser
                const parsed = endpoint.parse(data);
                
                if (parsed.price && parsed.previousClose) {
                    const change = parsed.price - parsed.previousClose;
                    const changePercent = (change / parsed.previousClose) * 100;
                    
                    // Fetch weekly data to calculate week-over-week change
                    const weeklyChange = await calculateWeeklyChange(symbol, parsed.price);
                    
                    return {
                        symbol: symbol,
                        companyName: getCompanyName(symbol),
                        price: parsed.price.toFixed(2),
                        previousClose: parsed.previousClose.toFixed(2),
                        change: change.toFixed(2),
                        changePercent: changePercent.toFixed(2),
                        isPositive: change >= 0,
                        source: endpoint.name,
                        dayLow: parsed.dayLow ? parsed.dayLow.toFixed(2) : null,
                        dayHigh: parsed.dayHigh ? parsed.dayHigh.toFixed(2) : null,
                        yearLow: parsed.yearLow ? parsed.yearLow.toFixed(2) : null,
                        yearHigh: parsed.yearHigh ? parsed.yearHigh.toFixed(2) : null,
                        pe: parsed.pe ? parsed.pe.toFixed(2) : null,
                        eps: parsed.eps ? parsed.eps.toFixed(2) : null,
                        dividendYield: parsed.dividendYield ? (parsed.dividendYield * 100).toFixed(2) : null,
                        dividendRate: parsed.dividendRate ? parsed.dividendRate.toFixed(2) : null,
                        weeklyChangePercent: weeklyChange
                    };
                }
            }
        } catch (error) {
            console.error(`${endpoint.name} failed for ${symbol}:`, error.message);
            continue; // Try next endpoint
        }
    }
    
    // All endpoints failed, return error
    console.error(`All APIs failed for ${symbol}`);
    return {
        symbol: symbol,
        companyName: getCompanyName(symbol),
        error: true,
        errorMessage: 'fail to fetch'
    };
}

/**
 * Get mock stock data as fallback
 * @param {string} symbol - Stock ticker symbol
 * @returns {Object} Mock stock data
 */
function getMockStockData(symbol) {
    const mockPrices = {
        'IBM': { price: 185.32, change: 1.45, dayLow: 183.50, dayHigh: 186.75, yearLow: 120.30, yearHigh: 195.80, pe: 22.45, eps: 8.26, dividendYield: 3.85, dividendRate: 6.68 },
        'TQQQ': { price: 58.76, change: 2.34, dayLow: 57.20, dayHigh: 59.45, yearLow: 28.50, yearHigh: 72.30, pe: null, eps: null, dividendYield: null, dividendRate: null },
        'SPY': { price: 512.43, change: 3.21, dayLow: 510.20, dayHigh: 514.80, yearLow: 410.20, yearHigh: 525.60, pe: null, eps: null, dividendYield: 1.32, dividendRate: 6.76 },
        'NVDA': { price: 487.23, change: -4.56, dayLow: 485.10, dayHigh: 495.60, yearLow: 280.50, yearHigh: 520.40, pe: 65.34, eps: 7.46, dividendYield: 0.03, dividendRate: 0.16 },
        'AMD': { price: 165.89, change: 2.87, dayLow: 163.40, dayHigh: 167.20, yearLow: 95.30, yearHigh: 180.75, pe: 142.68, eps: 1.16, dividendYield: null, dividendRate: null },
        'MU': { price: 98.45, change: -1.23, dayLow: 97.80, dayHigh: 100.20, yearLow: 62.40, yearHigh: 110.30, pe: 12.34, eps: 7.98, dividendYield: 0.52, dividendRate: 0.52 },
        'C': { price: 62.34, change: 0.89, dayLow: 61.50, dayHigh: 63.10, yearLow: 45.20, yearHigh: 68.90, pe: 11.23, eps: 5.55, dividendYield: 3.21, dividendRate: 2.04 },
        'AAL': { price: 14.56, change: -0.34, dayLow: 14.20, dayHigh: 15.10, yearLow: 10.50, yearHigh: 18.75, pe: 8.92, eps: 1.63, dividendYield: null, dividendRate: null },
        'TSLA': { price: 248.92, change: 5.67, dayLow: 245.30, dayHigh: 252.80, yearLow: 152.40, yearHigh: 299.30, pe: 78.45, eps: 3.17, dividendYield: null, dividendRate: null },
        'KHC': { price: 35.67, change: 0.45, dayLow: 35.20, dayHigh: 36.10, yearLow: 30.20, yearHigh: 40.50, pe: 14.56, eps: 2.45, dividendYield: 4.48, dividendRate: 1.60 },
        'U': { price: 42.18, change: -1.89, dayLow: 41.50, dayHigh: 44.30, yearLow: 25.60, yearHigh: 52.80, pe: null, eps: -1.23, dividendYield: null, dividendRate: null },
        'NET': { price: 78.92, change: 3.45, dayLow: 76.80, dayHigh: 80.50, yearLow: 48.30, yearHigh: 95.60, pe: null, eps: -0.34, dividendYield: null, dividendRate: null },
        'FSLR': { price: 156.34, change: 4.23, dayLow: 153.20, dayHigh: 158.90, yearLow: 110.40, yearHigh: 180.20, pe: 18.67, eps: 8.37, dividendYield: null, dividendRate: null },
        'AAPL': { price: 178.45, change: 2.34, dayLow: 176.80, dayHigh: 180.20, yearLow: 142.50, yearHigh: 195.30, pe: 28.92, eps: 6.17, dividendYield: 0.51, dividendRate: 0.96 }
    };
    
    const mock = mockPrices[symbol] || { price: 100.00, change: 0.00, dayLow: 98.00, dayHigh: 102.00, yearLow: 80.00, yearHigh: 120.00, pe: 15.00, eps: 6.67, dividendYield: 2.00, dividendRate: 2.00 };
    const changePercent = (mock.change / (mock.price - mock.change)) * 100;
    
    return {
        symbol: symbol,
        companyName: getCompanyName(symbol),
        price: mock.price.toFixed(2),
        change: mock.change.toFixed(2),
        changePercent: changePercent.toFixed(2),
        isPositive: mock.change >= 0,
        dayLow: mock.dayLow.toFixed(2),
        dayHigh: mock.dayHigh.toFixed(2),
        yearLow: mock.yearLow.toFixed(2),
        yearHigh: mock.yearHigh.toFixed(2),
        pe: mock.pe ? mock.pe.toFixed(2) : null,
        eps: mock.eps ? mock.eps.toFixed(2) : null,
        dividendYield: mock.dividendYield ? mock.dividendYield.toFixed(2) : null,
        dividendRate: mock.dividendRate ? mock.dividendRate.toFixed(2) : null,
        isMock: true
    };
}

/**
 * Get company name from symbol
 * @param {string} symbol - Stock ticker symbol
 * @returns {string} Company name
 */
function getCompanyName(symbol) {
    const companies = {
        'IBM': 'IBM Corporation',
        'TQQQ': 'ProShares UltraPro QQQ',
        'SPY': 'SPDR S&P 500 ETF',
        'NVDA': 'NVIDIA Corporation',
        'AMD': 'Advanced Micro Devices',
        'MU': 'Micron Technology',
        'C': 'Citigroup Inc.',
        'AAL': 'American Airlines',
        'TSLA': 'Tesla Inc.',
        'KHC': 'Kraft Heinz Company',
        'U': 'Unity Software Inc.',
        'NET': 'Cloudflare Inc.',
        'FSLR': 'First Solar Inc.',
        'AAPL': 'Apple Inc.',
        'AGNC': 'AGNC Investment Corp.',
        'AIG': 'American International Group',
        'AMZN': 'Amazon.com Inc.',
        'BAC': 'Bank of America Corp.',
        'COKE': 'Coca-Cola Consolidated',
        'CRM': 'Salesforce Inc.',
        'DIS': 'The Walt Disney Company',
        'DUK': 'Duke Energy Corporation',
        'ENB': 'Enbridge Inc.',
        'F': 'Ford Motor Company',
        'FCBC': 'First Community Bankshares',
        'GE': 'General Electric Company',
        'GOOG': 'Alphabet Inc.',
        'GSK': 'GSK plc',
        'HAL': 'Halliburton Company',
        'IVV': 'iShares Core S&P 500 ETF',
        'IWY': 'iShares Russell Top 200 Growth ETF',
        'LYB': 'LyondellBasell Industries',
        'MO': 'Altria Group Inc.',
        'MOAT': 'VanEck Morningstar Wide Moat ETF',
        'MTCH': 'Match Group Inc.',
        'NFLX': 'Netflix Inc.',
        'O': 'Realty Income Corporation',
        'PFE': 'Pfizer Inc.',
        'PFF': 'iShares Preferred and Income Securities ETF',
        'PG': 'Procter & Gamble Company',
        'PSX': 'Phillips 66',
        'PTON': 'Peloton Interactive Inc.',
        'REGN': 'Regeneron Pharmaceuticals',
        'RIVN': 'Rivian Automotive Inc.',
        'RSP': 'Invesco S&P 500 Equal Weight ETF',
        'SHOP': 'Shopify Inc.',
        'T': 'AT&T Inc.',
        'UBER': 'Uber Technologies Inc.',
        'UPS': 'United Parcel Service',
        'USB': 'U.S. Bancorp',
        'UVE': 'USCF SummerHaven Dynamic Commodity Strategy No K-1 ETF',
        'VNQ': 'Vanguard Real Estate ETF',
        'WBD': 'Warner Bros. Discovery',
        'WFC': 'Wells Fargo & Company',
        'XLE': 'Energy Select Sector SPDR Fund',
        'XLK': 'Technology Select Sector SPDR Fund'
    };
    return companies[symbol] || `${symbol} Corporation`;
}

/**
 * Get business summary for a stock
 * @param {string} symbol - Stock ticker symbol
 * @returns {string} Business summary
 */
function getBusinessSummary(symbol) {
    const summaries = {
        'IBM': 'Global technology and consulting company providing integrated solutions and services worldwide, specializing in cloud computing, AI, and enterprise software.',
        'TQQQ': 'Leveraged ETF seeking 3x daily performance of the NASDAQ-100 Index, focused on large-cap technology and growth companies.',
        'SPY': 'Exchange-traded fund tracking the S&P 500 Index, providing exposure to 500 leading U.S. publicly traded companies across all sectors.',
        'NVDA': 'Leading designer of graphics processing units (GPUs) for gaming, professional visualization, data centers, and automotive markets, pioneering AI computing.',
        'AMD': 'Semiconductor company designing high-performance computing and graphics solutions for data centers, gaming, and embedded systems.',
        'MU': 'Global leader in memory and storage solutions, manufacturing DRAM, NAND, and NOR flash memory products for various computing applications.',
        'C': 'Global financial services company providing banking, investment, and wealth management services to consumers, corporations, and governments worldwide.',
        'AAL': 'Major U.S. airline operating domestic and international flights, offering passenger and cargo transportation services across six continents.',
        'TSLA': 'Electric vehicle and clean energy company designing, manufacturing, and selling electric cars, solar products, and energy storage solutions.',
        'KHC': 'Food and beverage company producing and marketing packaged foods including cheese, meats, beverages, and condiments under iconic brands.',
        'U': 'Real-time 3D development platform for creating interactive content across gaming, film, automotive, architecture, and other industries.',
        'NET': 'Cloud services company providing content delivery network, DDoS mitigation, internet security, and distributed domain name server services.',
        'FSLR': 'Leading manufacturer of solar panels and provider of utility-scale photovoltaic power plants and supporting services worldwide.',
        'AAPL': 'Technology company designing and manufacturing consumer electronics, software, and online services including iPhone, Mac, iPad, and Apple Watch.',
        'AGNC': 'Real estate investment trust investing in residential mortgage-backed securities, providing monthly dividends to shareholders.',
        'AIG': 'Multinational insurance corporation providing property casualty insurance, life insurance, retirement products, and other financial services.',
        'AMZN': 'E-commerce and cloud computing giant offering online retail, AWS cloud services, digital streaming, and artificial intelligence solutions.',
        'BAC': 'Major banking and financial services company providing consumer banking, wealth management, and investment banking services.',
        'COKE': 'Beverage company producing, marketing, and distributing nonalcoholic beverages including Coca-Cola products.',
        'CRM': 'Cloud-based software company providing customer relationship management services and enterprise applications.',
        'DIS': 'Entertainment conglomerate operating theme parks, film studios, television networks, and streaming services worldwide.',
        'DUK': 'Electric power holding company providing electricity to customers in the Carolinas and Florida.',
        'ENB': 'Energy infrastructure company transporting crude oil, natural gas, and renewable energy across North America.',
        'F': 'Automotive manufacturer designing, manufacturing, and selling cars, trucks, SUVs, and electric vehicles globally.',
        'FCBC': 'Community bank holding company providing banking services including deposits, loans, and wealth management.',
        'GE': 'Industrial conglomerate focused on aviation, healthcare, power, and renewable energy solutions.',
        'GOOG': 'Technology company specializing in internet services, search, advertising, cloud computing, and artificial intelligence.',
        'GSK': 'Pharmaceutical and biotechnology company developing medicines, vaccines, and consumer healthcare products.',
        'HAL': 'Oilfield services company providing drilling, evaluation, completion, and production services to energy industry.',
        'IVV': 'ETF tracking the S&P 500 Index, providing broad exposure to large-cap U.S. equities.',
        'IWY': 'ETF tracking the Russell Top 200 Growth Index, focusing on large-cap growth stocks.',
        'LYB': 'Chemical and refining company producing plastics, chemicals, and fuels for various industries.',
        'MO': 'Tobacco company manufacturing and selling cigarettes, smokeless products, and wine in the United States.',
        'MOAT': 'ETF investing in companies with sustainable competitive advantages and wide economic moats.',
        'MTCH': 'Online dating company operating Tinder, Match.com, Hinge, and other dating platforms worldwide.',
        'NFLX': 'Streaming entertainment service offering TV series, films, and original content to subscribers globally.',
        'O': 'Real estate investment trust investing in commercial properties, known for monthly dividend payments.',
        'PFE': 'Pharmaceutical corporation discovering, developing, and manufacturing medicines and vaccines.',
        'PFF': 'ETF investing in preferred stocks and income-producing securities from various sectors.',
        'PG': 'Consumer goods corporation producing household, personal care, and hygiene products sold worldwide.',
        'PSX': 'Energy manufacturing and logistics company refining, marketing, and transporting petroleum products.',
        'PTON': 'Interactive fitness platform providing connected fitness equipment and digital fitness content.',
        'REGN': 'Biotechnology company discovering, developing, and commercializing medicines for serious diseases.',
        'RIVN': 'Electric vehicle manufacturer producing electric trucks, SUVs, and delivery vans.',
        'RSP': 'ETF providing equal-weight exposure to S&P 500 companies, reducing concentration risk.',
        'SHOP': 'E-commerce platform providing tools for businesses to create online stores and sell products.',
        'T': 'Telecommunications company providing wireless services, internet, and entertainment through AT&T and DirecTV.',
        'UBER': 'Technology platform connecting riders with drivers and facilitating food delivery services globally.',
        'UPS': 'Package delivery and supply chain management company providing logistics services worldwide.',
        'USB': 'Diversified financial services company offering banking, investment, mortgage, and payment services.',
        'UVE': 'Commodity strategy ETF providing exposure to various commodity futures without K-1 tax forms.',
        'VNQ': 'Real estate ETF investing in REITs and real estate companies across various property sectors.',
        'WBD': 'Media and entertainment conglomerate operating television networks, streaming services, and film studios.',
        'WFC': 'Financial services company providing banking, investment, mortgage, and consumer finance services.',
        'XLE': 'Energy sector ETF investing in oil, gas, and consumable fuels companies from the S&P 500.',
        'XLK': 'Technology sector ETF investing in technology companies from the S&P 500 index.'
    };
    return summaries[symbol] || `${getCompanyName(symbol)} - Financial services and investment company.`;
}

/**
 * Create stock card HTML dynamically
 * @param {string} symbol - Stock ticker symbol
 * @returns {string} HTML string for stock card
 */
function createStockCardHTML(symbol) {
    return `
        <div class="stock-card" data-symbol="${symbol}">
            <div class="stock-info">
                <h3>${symbol}</h3>
                <p class="company-name">${getCompanyName(symbol)}</p>
                <p class="business-summary">${getBusinessSummary(symbol)}</p>
                <div class="stock-news" style="display: none;">
                    <h4>📰 Recent News</h4>
                    <div class="news-items"></div>
                </div>
                <p class="weekly-highlight">📊 <span class="highlight-text">Loading weekly insights...</span></p>
            </div>
            <div class="stock-data">
                <p class="stock-price">Loading...</p>
                <p class="stock-change">--</p>
                <p class="day-range">Day: --</p>
                <p class="year-range">52W: --</p>
                <p class="stock-pe">PE: --</p>
                <p class="stock-eps">EPS: --</p>
                <p class="stock-div">Div: --</p>
            </div>
            <div class="stock-chart-container">
                <canvas id="chart-${symbol}"></canvas>
            </div>
        </div>
    `;
}

/**
 * Initialize stock cards in the DOM
 */
function initializeStockCards() {
    const stocksGrid = document.querySelector('.stocks-grid');
    if (!stocksGrid) return;
    
    // Clear existing cards
    stocksGrid.innerHTML = '';
    
    // Create cards for all stocks
    stockSymbols.forEach(symbol => {
        stocksGrid.innerHTML += createStockCardHTML(symbol);
    });
    
    console.log(`Initialized ${stockSymbols.length} stock cards`);
}

/**
 * Fetch stock data from Finnhub API
 * @param {string} symbol - Stock ticker symbol
 * @returns {Promise<Object>} Stock data
 */
async function fetchFromFinnhub(symbol) {
    if (FINNHUB_API_KEY === 'YOUR_FINNHUB_API_KEY_HERE') {
        console.error('Finnhub API key not configured. Please add your API key in stocks.js');
        return {
            symbol: symbol,
            companyName: getCompanyName(symbol),
            error: true,
            errorMessage: 'Finnhub API key not configured'
        };
    }
    
    try {
        // Fetch current quote
        const quoteUrl = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`;
        const quoteResponse = await fetch(quoteUrl);
        
        if (!quoteResponse.ok) {
            throw new Error(`Finnhub API error: ${quoteResponse.status}`);
        }
        
        const quoteData = await quoteResponse.json();
        
        // Fetch company metrics for P/E, EPS, dividend data
        const metricsUrl = `https://finnhub.io/api/v1/stock/metric?symbol=${symbol}&metric=all&token=${FINNHUB_API_KEY}`;
        let metricsData = null;
        
        try {
            const metricsResponse = await fetch(metricsUrl);
            if (metricsResponse.ok) {
                metricsData = await metricsResponse.json();
            }
        } catch (metricsError) {
            console.log(`Could not fetch metrics for ${symbol}:`, metricsError.message);
        }
        
        // Finnhub quote returns: c (current), pc (previous close), h (high), l (low), o (open)
        if (quoteData.c && quoteData.pc) {
            const currentPrice = quoteData.c;
            const previousClose = quoteData.pc;
            const change = currentPrice - previousClose;
            const changePercent = (change / previousClose) * 100;
            
            // Calculate weekly change
            const weeklyChange = await calculateWeeklyChangeFinnhub(symbol, currentPrice);
            
            // Extract metrics if available
            let pe = null;
            let eps = null;
            let dividendYield = null;
            let dividendRate = null;
            let yearLow = null;
            let yearHigh = null;
            
            if (metricsData && metricsData.metric) {
                const metrics = metricsData.metric;
                // P/E ratio
                pe = metrics.peBasicExclExtraTTM || metrics.peNormalizedAnnual || null;
                // EPS (Earnings Per Share)
                eps = metrics.epsBasicExclExtraItemsTTM || metrics.epsNormalizedAnnual || null;
                // Dividend Yield (as percentage)
                dividendYield = metrics.dividendYieldIndicatedAnnual || metrics.dividendYieldTTM || null;
                // Dividend Rate (annual dividend per share)
                dividendRate = metrics.dividendPerShareAnnual || metrics.dividendPerShareTTM || null;
                // 52-week range
                yearLow = metrics['52WeekLow'] || null;
                yearHigh = metrics['52WeekHigh'] || null;
            }
            
            return {
                symbol: symbol,
                companyName: getCompanyName(symbol),
                price: currentPrice.toFixed(2),
                previousClose: previousClose.toFixed(2),
                change: change.toFixed(2),
                changePercent: changePercent.toFixed(2),
                isPositive: change >= 0,
                source: 'Finnhub',
                dayLow: quoteData.l ? quoteData.l.toFixed(2) : null,
                dayHigh: quoteData.h ? quoteData.h.toFixed(2) : null,
                yearLow: yearLow ? yearLow.toFixed(2) : null,
                yearHigh: yearHigh ? yearHigh.toFixed(2) : null,
                pe: pe ? pe.toFixed(2) : null,
                eps: eps ? eps.toFixed(2) : null,
                dividendYield: dividendYield ? dividendYield.toFixed(2) : null,
                dividendRate: dividendRate ? dividendRate.toFixed(2) : null,
                weeklyChangePercent: weeklyChange
            };
        } else {
            throw new Error('Invalid data from Finnhub');
        }
    } catch (error) {
        console.error(`Finnhub API failed for ${symbol}:`, error.message);
        return {
            symbol: symbol,
            companyName: getCompanyName(symbol),
            error: true,
            errorMessage: 'fail to fetch'
        };
    }
}

/**
 * Calculate weekly price change using Finnhub
 * @param {string} symbol - Stock ticker symbol
 * @param {number} currentPrice - Current stock price
 * @returns {Promise<number|null>} Weekly change percentage or null
 */
async function calculateWeeklyChangeFinnhub(symbol, currentPrice) {
    if (FINNHUB_API_KEY === 'YOUR_FINNHUB_API_KEY_HERE') {
        return null;
    }
    
    try {
        // Get timestamp for 7 days ago
        const weekAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
        const now = Math.floor(Date.now() / 1000);
        
        const candleUrl = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${weekAgo}&to=${now}&token=${FINNHUB_API_KEY}`;
        const response = await fetch(candleUrl);
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.c && data.c.length >= 2) {
                const weekAgoPrice = data.c[0];
                const weeklyChange = ((currentPrice - weekAgoPrice) / weekAgoPrice) * 100;
                return weeklyChange;
            }
        }
    } catch (error) {
        console.error(`Failed to calculate weekly change from Finnhub for ${symbol}:`, error);
    }
    
    return null;
}

/**
 * Fetch company news from Finnhub
 * @param {string} symbol - Stock ticker symbol
 * @returns {Promise<Array>} Array of news articles
 */
async function fetchStockNews(symbol) {
    if (FINNHUB_API_KEY === 'd8k8941r01qjgd6sju90d8k8941r01qjgd6sju9g') {
        try {
            // Get news from last 7 days
            const today = new Date();
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            
            const fromDate = weekAgo.toISOString().split('T')[0];
            const toDate = today.toISOString().split('T')[0];
            
            const newsUrl = `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${fromDate}&to=${toDate}&token=${FINNHUB_API_KEY}`;
            const response = await fetch(newsUrl);
            
            if (response.ok) {
                const news = await response.json();
                // Return top 3 most recent news items
                return news.slice(0, 3);
            }
        } catch (error) {
            console.error(`Failed to fetch news for ${symbol}:`, error);
        }
    }
    return [];
}

/**
 * Calculate weekly price change percentage
 * @param {string} symbol - Stock ticker symbol
 * @param {number} currentPrice - Current stock price
 * @returns {Promise<number|null>} Weekly change percentage or null
 */
async function calculateWeeklyChange(symbol, currentPrice) {
    try {
        // Fetch 1 week of historical data
        const endpoint = isLocalServer
            ? `/api/stock?symbol=${symbol}&range=5d`
            : `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`;
        
        let response;
        let data;
        
        try {
            response = await fetch(endpoint);
            if (response.ok) {
                data = await response.json();
            }
        } catch (directError) {
            const proxyUrl = `${CORS_PROXY}${encodeURIComponent(endpoint)}`;
            response = await fetch(proxyUrl);
            if (response.ok) {
                data = await response.json();
            }
        }
        
        if (data && data.chart && data.chart.result && data.chart.result[0]) {
            const result = data.chart.result[0];
            const prices = result.indicators.quote[0].close.filter(p => p !== null);
            
            if (prices.length >= 2) {
                const weekAgoPrice = prices[0]; // First available price from ~1 week ago
                const weeklyChange = ((currentPrice - weekAgoPrice) / weekAgoPrice) * 100;
                return weeklyChange;
            }
        }
    } catch (error) {
        console.error(`Failed to calculate weekly change for ${symbol}:`, error);
    }
    
    return null;
}

/**
 * Get weekly highlight explaining price changes
 * @param {string} symbol - Stock ticker symbol
 * @returns {string} Weekly highlight text
 */
function getWeeklyHighlight(symbol) {
    const highlights = {
        'IBM': 'Strong AI and cloud revenue growth driving investor confidence in enterprise transformation strategy.',
        'TQQQ': 'Tech sector momentum amplified by 3x leverage as NASDAQ-100 components show robust earnings.',
        'SPY': 'Broad market rally supported by positive economic data and Federal Reserve policy expectations.',
        'NVDA': 'AI chip demand surge and data center expansion fueling continued investor enthusiasm.',
        'AMD': 'Data center GPU sales acceleration and market share gains in server processors.',
        'MU': 'Memory chip pricing recovery and strong demand from AI infrastructure buildout.',
        'C': 'Banking sector strength from higher interest rates and improved credit quality metrics.',
        'AAL': 'Travel demand recovery and fuel cost stabilization improving profitability outlook.',
        'TSLA': 'EV delivery numbers beat expectations and energy storage business showing strong growth.',
        'KHC': 'Cost-cutting initiatives and brand portfolio optimization driving margin expansion.',
        'U': 'Gaming industry recovery and new AI-powered development tools attracting enterprise clients.',
        'NET': 'Edge computing adoption accelerating and cybersecurity services seeing increased demand.',
        'FSLR': 'Solar energy policy support and utility-scale project pipeline expansion.',
        'AAPL': 'iPhone sales resilience and services revenue growth offsetting hardware market concerns.'
    };
    return highlights[symbol] || 'Market dynamics and sector trends influencing price movement.';
}

/**
 * Update stock card in the DOM
 * @param {Object} stockData - Stock data object
 */
function updateStockCard(stockData) {
    const card = document.querySelector(`[data-symbol="${stockData.symbol}"]`);
    if (!card) return;
    
    const priceElement = card.querySelector('.stock-price');
    const changeElement = card.querySelector('.stock-change');
    const dayRangeElement = card.querySelector('.day-range');
    const yearRangeElement = card.querySelector('.year-range');
    const peElement = card.querySelector('.stock-pe');
    const epsElement = card.querySelector('.stock-eps');
    const divElement = card.querySelector('.stock-div');
    
    if (stockData.error) {
        priceElement.textContent = 'N/A';
        changeElement.textContent = stockData.errorMessage || 'fail to fetch';
        changeElement.className = 'stock-change';
        
        // Clear range and financial data
        if (dayRangeElement) dayRangeElement.textContent = '';
        if (yearRangeElement) yearRangeElement.textContent = '';
        if (peElement) peElement.textContent = 'PE: N/A';
        if (epsElement) epsElement.textContent = 'EPS: N/A';
        if (divElement) divElement.textContent = 'Div: N/A';
        
        card.title = 'Failed to fetch data from API';
        return;
    }
    
    // Display yesterday's price and current price
    const priceText = stockData.isMock
        ? `$${stockData.previousClose} → $${stockData.price} *`
        : `$${stockData.previousClose} → $${stockData.price}`;
    priceElement.textContent = priceText;
    
    const changeSign = stockData.isPositive ? '+' : '';
    changeElement.textContent = `${changeSign}${stockData.change} (${changeSign}${stockData.changePercent}%)`;
    changeElement.className = `stock-change ${stockData.isPositive ? 'positive' : 'negative'}`;
    
    // Update range data
    if (dayRangeElement && stockData.dayLow && stockData.dayHigh) {
        dayRangeElement.textContent = `Day: $${stockData.dayLow} - $${stockData.dayHigh}`;
    }
    
    if (yearRangeElement && stockData.yearLow && stockData.yearHigh) {
        yearRangeElement.textContent = `52W: $${stockData.yearLow} - $${stockData.yearHigh}`;
    }
    
    // Update financial metrics
    if (peElement) {
        peElement.textContent = stockData.pe ? `PE: ${stockData.pe}` : 'PE: N/A';
    }
    
    if (epsElement) {
        epsElement.textContent = stockData.eps ? `EPS: $${stockData.eps}` : 'EPS: N/A';
    }
    
    if (divElement) {
        if (stockData.dividendYield && stockData.dividendRate) {
            divElement.textContent = `Div: $${stockData.dividendRate} (${stockData.dividendYield}%)`;
        } else if (stockData.dividendRate) {
            divElement.textContent = `Div: $${stockData.dividendRate}`;
        } else if (stockData.dividendYield) {
            divElement.textContent = `Div Yield: ${stockData.dividendYield}%`;
        } else {
            divElement.textContent = 'Div: N/A';
        }
    }
    
    // Check if price change > 10% to fetch news
    const dailyChange = Math.abs(parseFloat(stockData.changePercent));
    const weeklyChange = stockData.weeklyChangePercent ? Math.abs(stockData.weeklyChangePercent) : 0;
    const shouldShowNews = dailyChange > 10 || weeklyChange > 10;
    
    // Update news section - only show if change > 10%
    const newsContainer = card.querySelector('.stock-news');
    if (newsContainer && shouldShowNews) {
        // Fetch and display news
        fetchStockNews(stockData.symbol).then(newsItems => {
            if (newsItems && newsItems.length > 0) {
                const newsItemsContainer = newsContainer.querySelector('.news-items');
                newsItemsContainer.innerHTML = '';
                
                newsItems.forEach(news => {
                    const newsItem = document.createElement('div');
                    newsItem.className = 'news-item';
                    
                    const newsDate = new Date(news.datetime * 1000).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    });
                    
                    newsItem.innerHTML = `
                        <a href="${news.url}" target="_blank" rel="noopener noreferrer">${news.headline}</a>
                        <div class="news-date">${newsDate} - ${news.source}</div>
                        ${news.summary ? `<div class="news-summary">${news.summary.substring(0, 150)}...</div>` : ''}
                    `;
                    
                    newsItemsContainer.appendChild(newsItem);
                });
                
                newsContainer.style.display = 'block';
            } else {
                newsContainer.style.display = 'none';
            }
        });
    } else if (newsContainer) {
        newsContainer.style.display = 'none';
    }
    
    // Update weekly highlight - only show if change > 10%
    const weeklyHighlightContainer = card.querySelector('.weekly-highlight');
    const weeklyHighlightElement = card.querySelector('.weekly-highlight .highlight-text');
    
    if (weeklyHighlightContainer && weeklyHighlightElement) {
        // Show highlight if daily change > 10% OR weekly change > 10%
        if (shouldShowNews) {
            weeklyHighlightContainer.style.display = 'block';
            
            // Determine which change to highlight
            let changeText = '';
            if (dailyChange > 10 && weeklyChange > 10) {
                changeText = `📈 Significant movement: ${dailyChange.toFixed(1)}% today, ${weeklyChange.toFixed(1)}% this week. `;
            } else if (dailyChange > 10) {
                changeText = `📈 Major daily move: ${dailyChange.toFixed(1)}% change today. `;
            } else {
                changeText = `📈 Notable weekly trend: ${weeklyChange.toFixed(1)}% change this week. `;
            }
            
            weeklyHighlightElement.textContent = changeText + getWeeklyHighlight(stockData.symbol);
        } else {
            weeklyHighlightContainer.style.display = 'none';
        }
    }
    
    // Add title attribute to show data source
    if (stockData.isMock) {
        card.title = 'Using sample data (API unavailable)';
    } else {
        const source = stockData.source || 'Yahoo Finance';
        card.title = `Live data from ${source}`;
    }
    
    // Log successful update
    console.log(`Updated ${stockData.symbol}: $${stockData.price} (${stockData.isMock ? 'Sample' : 'Live'})`);
}

/**
 * Fetch and update all stock prices
 */
async function updateAllStocks() {
    console.log('=== Starting stock price update ===');
    console.log(`Fetching prices for: ${stockSymbols.join(', ')}`);
    
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'block';
    }
    
    try {
        // Fetch all stocks in parallel
        const promises = stockSymbols.map(symbol => fetchStockPrice(symbol));
        const results = await Promise.all(promises);
        
        // Count live vs sample data
        const liveCount = results.filter(r => !r.isMock).length;
        const sampleCount = results.filter(r => r.isMock).length;
        
        console.log(`Results: ${liveCount} live, ${sampleCount} sample`);
        
        // Update each stock card
        results.forEach(stockData => updateStockCard(stockData));
        
        // Update last refresh time
        updateLastRefreshTime();
        
        console.log('=== Stock price update complete ===');
    } catch (error) {
        console.error('Error updating stocks:', error);
    } finally {
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    }
}

/**
 * Update the last refresh time display
 */
function updateLastRefreshTime() {
    const timeElement = document.getElementById('last-refresh');
    if (timeElement) {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        timeElement.textContent = `Last updated: ${timeString}`;
    }
}

/**
 * Initialize the stock tracker
 */
function initStockTracker() {
    // Initialize stock cards dynamically
    initializeStockCards();
    
    // Initial load - fetch immediately
    updateAllStocks();
    
    // Load charts after a short delay to ensure DOM is ready
    setTimeout(() => {
        updateAllCharts();
    }, 1000);
    
    // Add manual refresh button listener
    const refreshButton = document.getElementById('refresh-stocks');
    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            updateAllStocks();
            updateAllCharts();
        });
    }
    
    // Add source selector button listeners
    const yahooButton = document.getElementById('source-yahoo');
    const finnhubButton = document.getElementById('source-finnhub');
    
    if (yahooButton) {
        yahooButton.addEventListener('click', () => {
            currentDataSource = 'yahoo';
            yahooButton.classList.add('active');
            finnhubButton.classList.remove('active');
            console.log('Switched to Yahoo Finance');
            updateAllStocks();
        });
    }
    
    if (finnhubButton) {
        finnhubButton.addEventListener('click', () => {
            currentDataSource = 'finnhub';
            finnhubButton.classList.add('active');
            yahooButton.classList.remove('active');
            console.log('Switched to Finnhub');
            updateAllStocks();
        });
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStockTracker);
} else {
    initStockTracker();
}

// Made with Bob

// Store chart instances
const chartInstances = {};

/**
 * Fetch historical daily prices for a stock (last 1 year)
 * @param {string} symbol - Stock ticker symbol
 * @returns {Promise<Object>} Historical price data
 */
async function fetchHistoricalPrices(symbol) {
    const endpoint = isLocalServer
        ? `/api/stock?symbol=${symbol}&range=1y`
        : `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1y`;
    
    try {
        let response;
        let data;
        
        // Try direct call first
        try {
            response = await fetch(endpoint);
            if (response.ok) {
                data = await response.json();
            }
        } catch (directError) {
            // Try with CORS proxy
            const proxyUrl = `${CORS_PROXY}${encodeURIComponent(endpoint)}`;
            response = await fetch(proxyUrl);
            if (response.ok) {
                data = await response.json();
            }
        }
        
        if (data && data.chart && data.chart.result && data.chart.result[0]) {
            const result = data.chart.result[0];
            const timestamps = result.timestamp;
            const prices = result.indicators.quote[0].close;
            
            // Get all available data (up to 1 year)
            const dates = timestamps.map(ts => {
                const date = new Date(ts * 1000);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            });
            
            const closePrices = prices.filter(p => p !== null);
            
            return {
                dates: dates.slice(-closePrices.length),
                prices: closePrices
            };
        }
    } catch (error) {
        console.error(`Failed to fetch historical data for ${symbol}:`, error);
    }
    
    // Return null if API fails (don't use mock data)
    return null;
}

/**
 * Generate mock historical data
 * @param {string} symbol - Stock ticker symbol
 * @returns {Object} Mock historical data
 */
function getMockHistoricalData(symbol) {
    const mockPrices = {
        'IBM': 185.32, 'TQQQ': 58.76, 'SPY': 512.43, 'NVDA': 487.23,
        'AMD': 165.89, 'MU': 98.45, 'C': 62.34, 'AAL': 14.56,
        'TSLA': 248.92, 'KHC': 35.67, 'U': 42.18, 'NET': 78.92,
        'FSLR': 156.34, 'AAPL': 178.45
    };
    
    const basePrice = mockPrices[symbol] || 100;
    const dates = [];
    const prices = [];
    
    // Generate 1 year (252 trading days) of mock data
    for (let i = 251; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        // Skip weekends
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;
        
        dates.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        
        // Generate realistic price variation with trend
        const trendFactor = (251 - i) / 251; // Gradual upward trend
        const randomVariation = (Math.random() - 0.5) * 0.02; // ±1% daily variation
        const price = basePrice * (0.85 + trendFactor * 0.3 + randomVariation);
        prices.push(parseFloat(price.toFixed(2)));
    }
    
    return { dates, prices };
}

/**
 * Create or update a bar chart for a stock
 * @param {string} symbol - Stock ticker symbol
 * @param {Object} historicalData - Historical price data
 */
function createStockChart(symbol, historicalData) {
    const canvas = document.getElementById(`chart-${symbol}`);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart if it exists
    if (chartInstances[symbol]) {
        chartInstances[symbol].destroy();
    }
    
    // Determine bar colors based on price change
    const colors = historicalData.prices.map((price, index) => {
        if (index === 0) return 'rgba(102, 126, 234, 0.8)';
        return price >= historicalData.prices[index - 1] 
            ? 'rgba(16, 185, 129, 0.8)' // Green for increase
            : 'rgba(239, 68, 68, 0.8)';  // Red for decrease
    });
    
    chartInstances[symbol] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: historicalData.dates,
            datasets: [{
                label: 'Daily Close Price',
                data: historicalData.prices,
                backgroundColor: colors,
                borderColor: colors.map(c => c.replace('0.8', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'One Year Daily Price History',
                    font: {
                        size: 12,
                        weight: 'normal'
                    },
                    color: '#666'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `$${context.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toFixed(0);
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxRotation: 90,
                        minRotation: 90,
                        font: {
                            size: 8
                        },
                        // Show every 20th label to avoid overcrowding
                        callback: function(value, index) {
                            return index % 20 === 0 ? this.getLabelForValue(value) : '';
                        }
                    }
                }
            }
        }
    });
}

/**
 * Update all stock charts
 */
async function updateAllCharts() {
    console.log('=== Updating stock charts ===');
    
    for (const symbol of stockSymbols) {
        try {
            const historicalData = await fetchHistoricalPrices(symbol);
            if (historicalData) {
                createStockChart(symbol, historicalData);
                console.log(`✓ Chart updated for ${symbol}`);
            } else {
                console.error(`No historical data available for ${symbol}`);
            }
        } catch (error) {
            console.error(`Failed to update chart for ${symbol}:`, error);
        }
    }
    
    console.log('=== Chart update complete ===');
}
