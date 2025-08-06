#!/bin/bash

echo "Starting RetailAR Development Server..."
echo ""

# Try different ports and methods
PORTS=(8080 8000 3000 5000)
IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')

for PORT in "${PORTS[@]}"; do
    echo "Trying port $PORT..."
    
    # Check if port is available
    if ! lsof -i :$PORT > /dev/null 2>&1; then
        echo "✅ Port $PORT is available"
        echo ""
        echo "🚀 Starting server on port $PORT"
        echo "📱 Access URLs:"
        echo "   Local:   http://localhost:$PORT"
        echo "   Network: http://$IP:$PORT"
        echo ""
        echo "📱 For mobile testing, use: http://$IP:$PORT"
        echo "Press Ctrl+C to stop the server"
        echo ""
        
        # Start the server
        python3 -m http.server $PORT --bind 0.0.0.0
        break
    else
        echo "❌ Port $PORT is in use, trying next..."
    fi
done

echo "❌ No available ports found"