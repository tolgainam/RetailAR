#!/usr/bin/env python3
"""
Simple HTTP Server for RetailAR
Serves the application with CORS headers for development
"""

import http.server
import socketserver
import os
from urllib.parse import urlparse, parse_qs

class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        super().end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()
    
    def guess_type(self, path):
        mimetype = super().guess_type(path)
        if path.endswith('.js'):
            return 'application/javascript'
        elif path.endswith('.mjs'):
            return 'application/javascript'
        return mimetype

if __name__ == "__main__":
    PORT = 8080
    
    # Change to the project directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    with socketserver.TCPServer(("", PORT), CORSRequestHandler) as httpd:
        print(f"Serving RetailAR at:")
        print(f"  Local:    http://localhost:{PORT}")
        print(f"  Network:  http://YOUR_IP:{PORT}")
        print(f"")
        print("To find your IP address:")
        print("  macOS/Linux: ifconfig | grep 'inet ' | grep -v 127.0.0.1")
        print("  Windows:     ipconfig")
        print(f"")
        print("Press Ctrl+C to stop the server")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print(f"\nServer stopped.")