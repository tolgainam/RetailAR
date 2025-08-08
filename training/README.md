# ML Training Pipeline for Product Recognition

Complete TensorFlow.js training pipeline for IQOS/VEEV/ZYN product recognition.

## 🚀 Quick Start

### 1. Setup Environment

```bash
# Install Python dependencies
cd training
pip install -r requirements.txt
```

### 2. Add Your Images

Place your **10 images per product** (5 CGI + 5 lifestyle) in the following structure:

```
training/data/raw/
├── zyn-apple-mint/
│   ├── cgi_01.jpg          # CGI images (clean background)
│   ├── cgi_02.jpg
│   ├── cgi_03.jpg
│   ├── cgi_04.jpg
│   ├── cgi_05.jpg
│   ├── lifestyle_01.jpg    # Lifestyle images (real-world scenarios)
│   ├── lifestyle_02.jpg
│   ├── lifestyle_03.jpg
│   ├── lifestyle_04.jpg
│   └── lifestyle_05.jpg
├── zyn-spearmint/
│   └── ... (same structure)
├── terea-yellow/
│   └── ... (same structure)
├── terea-sienna/
│   └── ... (same structure)
└── iqos-iluma-prime/
    └── ... (same structure)
```

**Total: 50 base images (10 per product × 5 products)**

### 3. Run Complete Pipeline

```bash
# Run everything automatically
python run_training_pipeline.py

# Or with custom settings
python run_training_pipeline.py --epochs 100 --batch-size 16 --augmentations 15
```

This will:
1. ✅ Generate ~600 augmented training images
2. ✅ Train TensorFlow model with validation
3. ✅ Convert to TensorFlow.js format  
4. ✅ Copy to public directory for web app
5. ✅ Generate validation reports and metrics

## 📊 Expected Results

With 10 quality images per product:
- **Training images:** ~120 per product (600 total)
- **Model accuracy:** 95%+ expected
- **Model size:** ~5-10MB (web-optimized)
- **Inference speed:** <200ms on iPhone 14+

## 🛠️ Manual Steps (Alternative)

If you prefer running steps individually:

```bash
cd training/scripts

# Step 1: Generate augmented training data
python augment_images.py --augmentations 12

# Step 2: Train model
python train_model.py --epochs 50 --batch-size 32

# Step 3: Validate model
python validate_model.py --model-path ../models/training_YYYYMMDD_HHMMSS/final_model.h5

# Step 4: Convert to TensorFlow.js
python convert_tfjs.py --model-path ../models/training_YYYYMMDD_HHMMSS/final_model.h5 --copy-to-public
```

## 📁 Output Structure

After training, you'll have:

```
training/
├── data/
│   ├── raw/           # Your original 50 images
│   ├── augmented/     # ~600 augmented training images  
│   └── splits/        # Train/validation splits
├── models/
│   └── training_YYYYMMDD_HHMMSS/
│       ├── final_model.h5              # TensorFlow model
│       ├── converted/tfjs_model/       # TensorFlow.js model
│       ├── validation/                 # Validation reports
│       ├── training_history.png        # Training plots
│       └── classification_report.json  # Metrics
└── scripts/           # Training scripts
```

**Web-ready model:** `../public/ml-model/model.json`

## 🎯 Image Guidelines

### **CGI Images (5 per product):**
- **Background:** Clean white/neutral
- **Angles:** Front, side, 45°, top, detail shots
- **Resolution:** 512×512px minimum
- **Focus:** Product fills 70-90% of frame

### **Lifestyle Images (5 per product):**  
- **Scenarios:** Real-world usage (table, hand, shelf)
- **Backgrounds:** Varied environments
- **Lighting:** Natural variety
- **Focus:** Product clearly visible, 50-70% of frame

## 🔧 Troubleshooting

### Common Issues:

**"No images found"**
- Check image file extensions (.jpg, .png)
- Verify directory structure matches exactly
- Ensure exactly 10 images per product

**"Low validation accuracy"**  
- Add more diverse images
- Check image quality and clarity
- Increase training epochs
- Verify products look distinctly different

**"Model too large"**
- Enable quantization (default)
- Reduce augmentations per image
- Use smaller input resolution

**"TensorFlow.js conversion failed"**
- Check TensorFlow version compatibility
- Ensure model saved properly
- Try without quantization

## 📈 Performance Optimization

### For Better Accuracy:
- Use high-quality, well-lit images
- Include diverse angles and scenarios  
- Ensure balanced dataset (10 images per product)
- Train for more epochs (100+)

### For Faster Inference:
- Enable quantization (default)
- Use smaller input size (224×224)
- Optimize for mobile (MobileNetV2 backbone)

## 🚀 Next Steps

After training completes:
1. ✅ **TensorFlow.js model ready** in `../public/ml-model/`
2. ✅ **Integration code** in `web_integration.js` 
3. ✅ **Validation reports** show accuracy metrics
4. 🔄 **Start building WebAR app** with your trained model!

---

*Need help? Check the validation reports for model performance or adjust training parameters for better results.*