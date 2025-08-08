# Training Data Structure

Place your 10 base images for each product in the following directory structure:

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
│   ├── cgi_01.jpg
│   ├── cgi_02.jpg
│   ├── cgi_03.jpg
│   ├── cgi_04.jpg
│   ├── cgi_05.jpg
│   ├── lifestyle_01.jpg
│   ├── lifestyle_02.jpg
│   ├── lifestyle_03.jpg
│   ├── lifestyle_04.jpg
│   └── lifestyle_05.jpg
├── terea-yellow/
│   ├── cgi_01.jpg
│   ├── cgi_02.jpg
│   ├── cgi_03.jpg
│   ├── cgi_04.jpg
│   ├── cgi_05.jpg
│   ├── lifestyle_01.jpg
│   ├── lifestyle_02.jpg
│   ├── lifestyle_03.jpg
│   ├── lifestyle_04.jpg
│   └── lifestyle_05.jpg
├── terea-sienna/
│   ├── cgi_01.jpg
│   ├── cgi_02.jpg
│   ├── cgi_03.jpg
│   ├── cgi_04.jpg
│   ├── cgi_05.jpg
│   ├── lifestyle_01.jpg
│   ├── lifestyle_02.jpg
│   ├── lifestyle_03.jpg
│   ├── lifestyle_04.jpg
│   └── lifestyle_05.jpg
└── iqos-iluma-prime/
    ├── cgi_01.jpg
    ├── cgi_02.jpg
    ├── cgi_03.jpg
    ├── cgi_04.jpg
    ├── cgi_05.jpg
    ├── lifestyle_01.jpg
    ├── lifestyle_02.jpg
    ├── lifestyle_03.jpg
    ├── lifestyle_04.jpg
    └── lifestyle_05.jpg
```

## Image Requirements

### **CGI Images (5 per product):**
- **Format:** JPG or PNG
- **Resolution:** 512x512px or higher
- **Background:** Clean, neutral (white/transparent preferred)
- **Angles:** Front, side, 45°, top, detail/logo shots
- **Quality:** High resolution, sharp details
- **Focus:** Product fills 70-90% of frame

### **Lifestyle Images (5 per product):**
- **Format:** JPG or PNG  
- **Resolution:** Minimum 512x512px
- **Scenarios:** Real-world usage (on table, in hand, store shelf, etc.)
- **Backgrounds:** Varied (office, home, retail, outdoor)
- **Lighting:** Natural variety (indoor, outdoor, artificial)
- **Focus:** Product clearly visible, fills 50-70% of frame

### **Balanced Dataset:**
- **Exactly 10 images per product** (critical for balanced training)
- **5 CGI + 5 lifestyle** per product
- **Total: 50 base images** (10 × 5 products)

## Product Categories

1. **zyn-apple-mint** - ZYN Apple Mint can
2. **zyn-spearmint** - ZYN Spearmint can  
3. **terea-yellow** - IQOS TEREA Yellow Selection pack
4. **terea-sienna** - IQOS TEREA Sienna pack
5. **iqos-iluma-prime** - IQOS ILUMA PRIME device

Once you add your images, run the augmentation script to generate training data.