# IQOS/VEEV/ZYN Product Recognition WebAR App - Project Plan

## 📋 Project Overview

**Goal:** Create a WebAR application that uses computer vision to recognize IQOS, VEEV, and ZYN products and display interactive 3D information with flavor-specific animations.

**Target:** Mobile-first (iPhone 14+), deployed on GitHub Pages  
**Approach:** Real-time ML-based object recognition (no markers)

---

## 🎯 MVP Products (5 Total)

### ZYN Cans (2)
1. **ZYN Apple Mint** - Green theme, fresh apple particles
2. **ZYN Spearmint** - Green/blue theme, cooling mint effects

### IQOS TEREA Packs (2) 
3. **TEREA Yellow Selection** - Yellow/gold theme, warm particles
4. **TEREA Sienna** - Brown/orange theme, tobacco-like effects

### IQOS Device (1)
5. **IQOS ILUMA PRIME** - Premium metallic theme, sophisticated animations

---

## 🏗️ Technology Stack

### Computer Vision
- **TensorFlow.js** - Custom ML model training and inference
- **Image Augmentation** - PIL/Albumentations for training data generation
- **Model Architecture** - MobileNetV2 + Custom classification layers

### 3D/AR Rendering
- **Three.js** - 3D graphics and GLB/GLTF model loading
- **WebXR Device API** - AR camera integration
- **Custom Particle Systems** - Flavor-based animations

### Development Tools
- **Vite** - Fast build tool and dev server
- **Python** - ML training pipeline
- **Node.js** - Project tooling

### Deployment
- **GitHub Pages** - Static hosting for testing
- **JSON Configuration** - Product data management

---

## 📊 Product Data Structure

```json
{
  "id": "zyn-apple-mint",
  "name": "ZYN Apple Mint", 
  "brand": "ZYN",
  "category": "can",
  "flavor": "Apple Mint",
  "nicotine": "6mg",
  "aroma_notes": ["Fresh Apple", "Cool Mint", "Crisp"],
  "pricing": "$4.99",
  "icon": "icons/zyn-apple-mint.png",
  "learn_more_url": "https://zyn.com/apple-mint",
  "buy_url": "https://store.zyn.com/apple-mint",
  "model_path": "models/zyn-apple-mint.glb",
  "brand_colors": ["#00ff88", "#ffffff"],
  "particle_config": {
    "type": "apple_mint_particles",
    "primary_color": "#00ff88",
    "secondary_color": "#90ff90",
    "count": 120,
    "animation": "floating_sparkles"
  }
}
```

---

## 🚀 Development Phases

### Phase 1: ML Pipeline Setup
**Goal:** Ready-to-use training pipeline for product images

**Deliverables:**
- [ ] Image augmentation script (PIL/Albumentations)
- [ ] TensorFlow.js model training pipeline
- [ ] Model conversion and optimization tools
- [ ] Training data directory structure
- [ ] Automated testing and validation scripts

**Input:** 5 base images per product (25 total)  
**Output:** Trained TensorFlow.js model + accuracy metrics

### Phase 2: Project Foundation  
**Goal:** Basic WebAR app structure

**Deliverables:**
- [ ] Vite project setup with Three.js
- [ ] Camera access and video feed
- [ ] Basic ML model integration
- [ ] Simple object detection display
- [ ] GitHub Pages deployment setup

### Phase 3: 3D AR Implementation
**Goal:** Interactive 3D product visualization

**Deliverables:**
- [ ] GLB/GLTF model loading system
- [ ] 3D object positioning on detected products
- [ ] Basic particle system framework
- [ ] AR camera integration
- [ ] Touch/interaction handling

### Phase 4: Product-Specific Features
**Goal:** Flavor-based animations and UI

**Deliverables:**
- [ ] 5 product configurations (JSON)
- [ ] Flavor-specific particle animations
- [ ] Brand-specific color schemes
- [ ] 2D UI overlay (product info, buttons)
- [ ] "Learn More" and "Buy" button functionality

### Phase 5: Polish & Optimization
**Goal:** Production-ready experience

**Deliverables:**
- [ ] Performance optimization for mobile
- [ ] Loading states and error handling
- [ ] Mobile-responsive UI
- [ ] Cross-browser testing
- [ ] Final GitHub Pages deployment

---

## 📁 Project Structure

```
RetailAR/
├── training/                    # ML Training Pipeline
│   ├── data/
│   │   ├── raw/                # 5 base images per product
│   │   ├── augmented/          # Generated training data
│   │   └── splits/             # Train/validation splits
│   ├── scripts/
│   │   ├── augment_images.py   # PIL/Albumentations augmentation
│   │   ├── train_model.py      # TensorFlow model training
│   │   ├── convert_tfjs.py     # Model conversion
│   │   └── validate_model.py   # Testing and metrics
│   └── models/                 # Trained model outputs
├── public/
│   ├── models/                 # 3D GLB/GLTF files
│   ├── icons/                  # Product icons
│   └── ml-model/              # TensorFlow.js model files
├── src/
│   ├── ml/                    # ML inference code
│   ├── ar/                    # AR/3D rendering
│   ├── ui/                    # 2D interface components
│   ├── config/                # Product configurations
│   └── utils/                 # Shared utilities
├── data/
│   └── products.json          # Product database
└── docs/                      # Documentation
```

---

## 🎨 Visual Design Requirements

### Brand Themes
- **ZYN:** Clean, modern, mint/green accents
- **IQOS TEREA:** Premium, sophisticated, warm tones  
- **IQOS Device:** Metallic, high-tech, premium feel

### Particle Animations
- **Apple Mint:** Green floating sparkles, fresh feeling
- **Spearmint:** Blue-green cooling mist effects
- **Yellow Selection:** Warm golden particles, upward flow
- **Sienna:** Brown/orange smoke-like effects
- **ILUMA PRIME:** Sophisticated metallic glints, minimal

### UI Elements
- **2D Overlay:** Product name, flavor, nicotine, aroma notes, pricing
- **Buttons:** "Learn More" and "Buy" (open in new window)
- **Mobile-optimized:** Touch-friendly, readable on small screens

---

## 📈 Success Metrics

### Technical Performance
- **Detection Accuracy:** >95% for correct product identification
- **Detection Speed:** <200ms per frame on iPhone 14+
- **False Positives:** <5% misidentification rate
- **Frame Rate:** Maintain 30fps AR experience

### User Experience
- **Load Time:** <3 seconds initial app load
- **Model Size:** <10MB total download
- **Responsiveness:** Smooth interactions on target devices
- **Cross-browser:** Works on Safari Mobile, Chrome Mobile

---

## 🔄 Workflow Summary

1. **Setup ML Pipeline** → Ready for image input
2. **Collect Images** → 5 per product (25 total)  
3. **Generate Training Data** → ~100 augmented images per product
4. **Train Model** → Custom TensorFlow.js classification model
5. **Build WebAR App** → Three.js + ML integration
6. **Add Product Configs** → 5 product JSON files
7. **Deploy & Test** → GitHub Pages deployment
8. **Iterate** → Improve accuracy and performance

---

## 📝 Next Steps

**Phase 1 Priority:**
1. Create ML training pipeline
2. Setup image augmentation system  
3. Prepare training data structure
4. Build model training and conversion scripts

**Ready for:** Your 25 base product images (5 per product)

---

*Last Updated: 2025-01-08*  
*Status: Planning Complete - Ready for Implementation*