# NFT Marker Generation Guide for RetailAR

## Optimal Settings for ZYN Product Markers

### Image Preparation
1. **Resolution**: 480x640px (recommended for mobile AR)
2. **Format**: JPG with 90% quality
3. **Content**: High contrast logos and text
4. **Background**: Solid or simple background
5. **Lighting**: Even, no shadows or reflections

### NFT Creator Parameters
When using https://carnaux.github.io/NFT-Marker-Creator/:

```
Image Settings:
- DPI: 250
- Width: 480px
- Height: 640px
- Quality: High

Detection Settings:
- Confidence Threshold: 0.8 (lower = more sensitive)
- Max Features: 500-1000
- Feature Density: Medium to High
- Multi-scale: Enabled

Advanced Settings:
- Pyramid Levels: 4
- Edge Threshold: 10
- Corner Response: 0.04
```

### Recommended Image Characteristics

✅ **Good for NFT Tracking:**
- High contrast text (white text on colored background)
- Distinct logos and symbols
- Sharp edges and corners
- Asymmetric designs
- Varied textures

❌ **Avoid for NFT Tracking:**
- Uniform colors
- Symmetrical patterns
- Low contrast
- Blurry or soft images
- Reflective surfaces
- Very small details

### ZYN-Specific Recommendations

For ZYN cans, focus on:
- The circular logo area
- Brand text "ZYN"
- Product name text
- Color contrast between logo and background
- Avoid curved edges of the can

### Testing Parameters

After generation, test with different AR.js settings:

```javascript
// Conservative (stable tracking)
smoothCount: 10
smoothTolerance: 0.01
smoothThreshold: 5

// Sensitive (easier detection)
smoothCount: 5
smoothTolerance: 0.05
smoothThreshold: 2

// Aggressive (fastest detection)
smoothCount: 3
smoothTolerance: 0.1
smoothThreshold: 1
```

### File Size Expectations
- .fset: 3-10KB (feature points)
- .fset3: 300-800KB (3D feature data)
- .iset: 50-150KB (image data)

Larger files = more features = better tracking but slower loading.