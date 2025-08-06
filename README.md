# RetailAR - Product Recognition & AR Visualization

A comprehensive AR/XR web application for product scanning and visualization with configurable detection methods and interactive virtual buttons.

## Features

### 🎯 **Dual Detection System**
- **Template Matching**: OpenCV.js-based multi-image template matching
- **Machine Learning**: TensorFlow.js custom CNN for product classification
- **Hybrid Mode**: Combines both methods for optimal accuracy
- **Runtime Switching**: Change detection methods on-the-fly

### 📱 **Mobile AR Experience**
- WebXR-compatible AR overlays
- 3D product visualization with Three.js
- Flavor-based particle animations
- Interactive virtual buttons in AR space

### 🎮 **Interactive Features**
- Virtual 3D buttons with touch/tap detection
- Haptic feedback support
- URL navigation and custom actions
- Hover effects and visual feedback

### ⚙️ **Configurable Products**
- Multi-image reference system with weighted scoring
- Customizable 3D models, animations, and information cards
- Flexible virtual button configuration
- Material and color overrides

## Supported Products

### Demo Configuration
- **TEREA Yellow Selection** (rectangular)
- **TEREA Sienna** (rectangular)
- **ZYN Cool Mint** (cylindrical)
- **ZYN Citrus** (cylindrical)

## Quick Start

### 1. Install Dependencies
```bash\nnpm install\n```\n\n### 2. Add Product Reference Images\nPlace high-quality product images in the respective directories:\n\n```\nassets/products/\n├── terea-yellow/reference-images/\n│   ├── front.jpg\n│   ├── side.jpg\n│   ├── angle_45.jpg\n│   ├── logo.jpg\n│   └── top.jpg\n├── terea-sienna/reference-images/\n├── zyn-can-1/reference-images/\n└── zyn-can-2/reference-images/\n```\n\n### 3. Start Development Server\n```bash\nnpm run dev\n```\n\n### 4. Access Application\nOpen `http://localhost:3000` in a modern browser with camera support.\n\n## Detection Methods\n\n### Template Matching\n```javascript\n// Switch to template matching\nwindow.switchDetectionMethod('template');\n```\n- Uses OpenCV.js ORB feature detection\n- Matches against multiple reference images\n- Weighted confidence scoring\n- Fast and reliable for consistent lighting\n\n### Machine Learning\n```javascript\n// Switch to ML detection\nwindow.switchDetectionMethod('ml');\n\n// Train custom model (optional)\nwindow.trainMLModel(20); // 20 epochs\n```\n- Custom CNN built with TensorFlow.js\n- Data augmentation for improved accuracy\n- Handles lighting and angle variations\n- Better for complex scenarios\n\n### Hybrid Mode\n```javascript\n// Switch to hybrid detection\nwindow.switchDetectionMethod('hybrid');\n```\n- Combines both methods for optimal results\n- Consensus-based decision making\n- Fallback mechanisms\n\n## Configuration\n\n### Product Configuration\nEach product has a comprehensive JSON configuration:\n\n```json\n{\n  \"id\": \"product-id\",\n  \"name\": \"Product Name\",\n  \"type\": \"rectangular|cylindrical\",\n  \"detection\": {\n    \"method\": \"template|ml|hybrid\",\n    \"confidence_threshold\": 0.75,\n    \"reference_images\": [\n      {\n        \"id\": \"front_view\",\n        \"path\": \"reference-images/front.jpg\",\n        \"weight\": 1.0,\n        \"description\": \"Main front label view\"\n      }\n    ]\n  },\n  \"visual\": {\n    \"3d_model\": \"models/product.glb\",\n    \"scale\": [1.0, 1.0, 1.0],\n    \"material_overrides\": {\n      \"primary_color\": \"#FFD700\"\n    }\n  },\n  \"animations\": {\n    \"idle\": {\n      \"type\": \"float\",\n      \"amplitude\": 0.02,\n      \"speed\": 1.5\n    },\n    \"flavor_effect\": {\n      \"type\": \"particles\",\n      \"system\": \"tobacco_smoke\",\n      \"color\": \"#D2691E\",\n      \"particle_count\": 50\n    }\n  },\n  \"interactions\": {\n    \"virtual_buttons\": [\n      {\n        \"id\": \"learn_more\",\n        \"label\": \"Learn More\",\n        \"position\": [0, 1.5, 0],\n        \"action\": {\n          \"type\": \"url\",\n          \"target\": \"https://example.com\",\n          \"new_window\": true\n        }\n      }\n    ]\n  }\n}\n```\n\n### Global Configuration\nApp-wide settings in `src/config/app-config.json`:\n\n```json\n{\n  \"app_settings\": {\n    \"detection_method\": \"template\",\n    \"camera\": {\n      \"preferred_resolution\": [1280, 720],\n      \"facing_mode\": \"environment\"\n    },\n    \"ar\": {\n      \"world_tracking\": true,\n      \"lighting_estimation\": true\n    }\n  }\n}\n```\n\n## Browser Support\n\n### Desktop\n- Chrome 90+ (recommended)\n- Firefox 88+\n- Safari 14.1+\n- Edge 90+\n\n### Mobile\n- Chrome Mobile 90+\n- Safari iOS 14.5+\n- Samsung Internet 14+\n- WebXR Viewer (iOS)\n\n## Development\n\n### Project Structure\n```\nRetailAR/\n├── src/\n│   ├── config/\n│   │   ├── app-config.json\n│   │   └── product-loader.js\n│   ├── detection/\n│   │   ├── template-matcher.js\n│   │   ├── ml-detector.js\n│   │   └── product-detector.js\n│   ├── ar/\n│   │   ├── ar-renderer.js\n│   │   └── virtual-buttons.js\n│   └── main.js\n├── assets/\n│   └── products/\n│       ├── terea-yellow/\n│       ├── terea-sienna/\n│       ├── zyn-can-1/\n│       └── zyn-can-2/\n└── index.html\n```\n\n### Debug Commands\n```javascript\n// Get detection statistics\nwindow.getDetectionStats();\n\n// Train ML model\nwindow.trainMLModel(epochs);\n\n// Access app instance\nwindow.retailAR;\n```\n\n### Adding New Products\n1. Create product directory in `assets/products/`\n2. Add reference images and 3D model\n3. Create `config.json` with product configuration\n4. Add product ID to `app-config.json` supported_products array\n\n## Performance Optimization\n\n### Mobile Optimization\n- Adaptive quality based on device capabilities\n- Progressive model loading\n- Battery-efficient detection loop (10 FPS)\n- Optimized particle systems\n\n### Memory Management\n- Automatic resource cleanup\n- Texture and geometry disposal\n- Model caching and reuse\n\n## Troubleshooting\n\n### Camera Issues\n- Ensure HTTPS for camera access\n- Check browser permissions\n- Verify camera facing mode\n\n### Detection Issues\n- Verify reference images are properly placed\n- Check lighting conditions\n- Adjust confidence thresholds\n- Try different detection methods\n\n### Performance Issues\n- Reduce detection FPS in config\n- Lower 3D model quality\n- Disable particle effects\n\n## License\n\nMIT License - see LICENSE file for details.\n\n## Contributing\n\nContributions welcome! Please read contributing guidelines and submit pull requests.\n\n---\n\n**Built with**: Three.js, OpenCV.js, TensorFlow.js, A-Frame, Vite"