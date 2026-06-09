#!/usr/bin/env python3
"""
Simple proxy server to fetch Yahoo Finance data and serve the website
This bypasses CORS restrictions by making server-side requests
"""

from http.server import HTTPServer, SimpleHTTPRequestHandler
import json
import urllib.request
import urllib.error
from urllib.parse import urlparse, parse_qs

class YahooFinanceProxyHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urlparse(self.path)
        
        # Handle API proxy requests
        if parsed_path.path == '/api/stock':
            self.handle_stock_api(parsed_path)
        else:
            # Serve static files
            super().do_GET()
    
    def handle_stock_api(self, parsed_path):
        """Proxy requests to Yahoo Finance API"""
        query_params = parse_qs(parsed_path.query)
        symbol = query_params.get('symbol', [''])[0]
        
        if not symbol:
            self.send_error(400, "Missing symbol parameter")
            return
        
        try:
            # Fetch from Yahoo Finance
            yahoo_url = f'https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=1y'
            
            with urllib.request.urlopen(yahoo_url, timeout=10) as response:
                data = json.loads(response.read().decode())
                
                # Send response
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(data).encode())
                
        except urllib.error.HTTPError as e:
            self.send_error(e.code, f"Yahoo Finance API error: {e.reason}")
        except urllib.error.URLError as e:
            self.send_error(500, f"Network error: {str(e)}")
        except Exception as e:
            self.send_error(500, f"Server error: {str(e)}")
    
    def end_headers(self):
        # Add CORS headers for all responses
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

def run_server(port=8000):
    server_address = ('', port)
    httpd = HTTPServer(server_address, YahooFinanceProxyHandler)
    print(f'🚀 Server running at http://localhost:{port}/')
    print(f'📊 Open http://localhost:{port}/index.html in your browser')
    print(f'🔄 API endpoint: http://localhost:{port}/api/stock?symbol=AAPL')
    print('\nPress Ctrl+C to stop the server')
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\n\n✋ Server stopped')
        httpd.shutdown()

if __name__ == '__main__':
    run_server()

# Made with Bob
