# RetailAR - Setup Instructions

## 🚀 Quick Start (Simplified Version)

The project has been simplified to remove TensorFlow.js dependency issues. It now uses a basic image recognition system that works without complex ML libraries.

### 1. Add Reference Images

**IMPORTANT**: You need to add actual product images to make the demo work.

Place product reference images in these directories:

```
assets/products/terea-yellow/reference-images/
├── front.jpg      (512x512px recommended)
├── side.jpg       (512x300px recommended) 
├── angle_45.jpg   (400x400px recommended)
├── logo.jpg       (200x200px recommended)
└── top.jpg        (512x200px recommended)

assets/products/terea-sienna/reference-images/
├── front.jpg
├── side.jpg
├── angle_45.jpg
├── logo.jpg
└── top.jpg

assets/products/zyn-can-1/reference-images/ (ZYN Cool Mint)
├── front.jpg
├── side.jpg
├── top.jpg
├── angle_30.jpg
└── logo.jpg

assets/products/zyn-can-2/reference-images/ (ZYN Citrus)
├── front.jpg
├── side.jpg
├── top.jpg
├── angle_30.jpg
└── logo.jpg
```

### 2. Run the Server

**Option A: Python Server (Recommended)**
```bash
python3 server.py
```

**Option B: Node.js (if npm works)**
```bash
npm install
npm run dev
```

### 3. Access the Application

- **Local**: `http://localhost:3000`
- **Network**: `http://YOUR_IP:3000`

### 4. Find Your IP Address

**macOS/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**Windows:**
```bash
ipconfig
```

## 📱 Mobile Testing

1. Connect mobile device to same Wi-Fi network
2. Open browser on mobile
3. Navigate to `http://YOUR_IP:3000`
4. Grant camera permissions when prompted
5. Test product scanning

## 🛠 How It Works

### Simple Detection System
- Uses Canvas 2D API for image analysis
- Creates color profiles and edge signatures
- Compares camera frames against reference images
- No external ML libraries required

### Features Available
- ✅ QR Code scanning
- ✅ Basic product recognition
- ✅ 3D AR overlays
- ✅ Virtual buttons
- ✅ Product information cards
- ✅ Flavor-based animations

### Detection Process
1. Camera captures frame
2. Frame is downsampled to 32x32 for analysis
3. Color profile and edge signature created
4. Compared against reference images
5. Best match returned with confidence score

## 🎮 Controls

### UI Buttons
- **Start QR Scan**: Activate QR code scanner
- **Scan Products**: Start product recognition
- **Stop**: Stop all scanning

### Debug Controls (Browser Console)
```javascript
// Switch detection method (only 'simple' works currently)
window.switchDetectionMethod('simple')

// Get detection statistics
window.getDetectionStats()

// Access main app
window.retailAR
```

## 🔧 Troubleshooting

### Camera Issues
- Ensure HTTPS for mobile (current server uses HTTP)
- Check browser permissions
- Verify camera is not being used by another app

### Detection Issues
- Add high-quality reference images
- Ensure good lighting when testing
- Try different angles and distances
- Check browser console for errors

### Performance Issues
- Detection runs at ~10 FPS to save battery
- Reduce image quality in config if needed
- Close other browser tabs

## 📁 Project Structure

```
RetailAR/
├── assets/products/           # Product configurations and images
├── src/
│   ├── config/               # App configuration
│   ├── detection/            # Simple detection system
│   ├── ar/                   # AR rendering and interactions
│   └── main.js               # Main application
├── index.html                # Main HTML file
├── server.py                 # Python development server
└── README.md                 # Full documentation
```

## 🎯 Demo Flow

1. **Load Application**: Open in browser
2. **Grant Permissions**: Allow camera access
3. **Click "Scan Products"**: Start detection
4. **Point Camera**: At reference images or similar products
5. **View AR Overlay**: 3D model appears on detection
6. **Interact**: Tap virtual buttons for actions

## ⚡ Performance Notes

- Detection optimized for mobile devices
- Uses 32x32 analysis frames for speed
- Battery-efficient 10 FPS detection loop
- Progressive loading of 3D assets

## 🔄 Next Steps

1. Add your actual product reference images
2. Test detection accuracy
3. Adjust confidence thresholds in product configs
4. Customize 3D models and animations
5. Deploy to production server with HTTPS

The simplified system provides a solid foundation that you can enhance as needed!