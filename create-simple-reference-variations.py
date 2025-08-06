#!/usr/bin/env python3
"""
Simple Reference Image Variations Generator
Creates variations using only PIL (Python Imaging Library)
"""

from PIL import Image, ImageEnhance, ImageFilter, ImageOps
import os
import json
import math

def create_variations(image_path, base_name, output_dir):
    """Create multiple variations of an image"""
    variations = []
    
    try:
        # Load original image
        img = Image.open(image_path).convert('RGBA')
        
        # 1. Brightness variations
        enhancer = ImageEnhance.Brightness(img)
        
        # Bright version
        bright_img = enhancer.enhance(1.3)
        bright_path = os.path.join(output_dir, f"{base_name}_bright.png")
        bright_img.save(bright_path)
        variations.append((f"{base_name}_bright", bright_path, 0.8))
        
        # Dim version  
        dim_img = enhancer.enhance(0.7)
        dim_path = os.path.join(output_dir, f"{base_name}_dim.png")
        dim_img.save(dim_path)
        variations.append((f"{base_name}_dim", dim_path, 0.8))
        
        # 2. Contrast variations
        contrast_enhancer = ImageEnhance.Contrast(img)
        
        # High contrast
        high_contrast = contrast_enhancer.enhance(1.2)
        contrast_path = os.path.join(output_dir, f"{base_name}_contrast.png")
        high_contrast.save(contrast_path)
        variations.append((f"{base_name}_contrast", contrast_path, 0.8))
        
        # Low contrast
        low_contrast = contrast_enhancer.enhance(0.8)
        low_contrast_path = os.path.join(output_dir, f"{base_name}_low_contrast.png")
        low_contrast.save(low_contrast_path)
        variations.append((f"{base_name}_low_contrast", low_contrast_path, 0.7))
        
        # 3. Rotation variations
        angles = [-15, -10, -5, 5, 10, 15]
        for angle in angles:
            rotated = img.rotate(angle, expand=True, fillcolor=(255, 255, 255, 0))
            angle_name = f"rot{angle:+03d}".replace('-', 'neg')
            rot_path = os.path.join(output_dir, f"{base_name}_{angle_name}.png")
            rotated.save(rot_path)
            variations.append((f"{base_name}_{angle_name}", rot_path, 0.7))
        
        # 4. Scale variations
        original_size = img.size
        scales = [0.8, 0.9, 1.1, 1.2]
        
        for scale in scales:
            new_size = (int(original_size[0] * scale), int(original_size[1] * scale))
            scaled = img.resize(new_size, Image.Resampling.LANCZOS)
            
            # If scaled down, paste on original size canvas
            if scale < 1.0:
                canvas = Image.new('RGBA', original_size, (255, 255, 255, 0))
                paste_pos = ((original_size[0] - new_size[0]) // 2, 
                           (original_size[1] - new_size[1]) // 2)
                canvas.paste(scaled, paste_pos)
                scaled = canvas
            else:
                # If scaled up, crop to original size
                crop_pos = ((new_size[0] - original_size[0]) // 2,
                           (new_size[1] - original_size[1]) // 2)
                scaled = scaled.crop((crop_pos[0], crop_pos[1], 
                                    crop_pos[0] + original_size[0],
                                    crop_pos[1] + original_size[1]))
            
            scale_name = f"scale{int(scale*100)}"
            scale_path = os.path.join(output_dir, f"{base_name}_{scale_name}.png")
            scaled.save(scale_path)
            variations.append((f"{base_name}_{scale_name}", scale_path, 0.8))
        
        # 5. Filter variations
        # Slight blur
        blurred = img.filter(ImageFilter.GaussianBlur(radius=0.5))
        blur_path = os.path.join(output_dir, f"{base_name}_blur.png")
        blurred.save(blur_path)
        variations.append((f"{base_name}_blur", blur_path, 0.7))
        
        # Sharpen
        sharpened = img.filter(ImageFilter.SHARPEN)
        sharp_path = os.path.join(output_dir, f"{base_name}_sharp.png")
        sharpened.save(sharp_path)
        variations.append((f"{base_name}_sharp", sharp_path, 0.8))
        
        # 6. Color variations
        # Slightly desaturated
        color_enhancer = ImageEnhance.Color(img)
        desaturated = color_enhancer.enhance(0.8)
        desat_path = os.path.join(output_dir, f"{base_name}_desat.png")
        desaturated.save(desat_path)
        variations.append((f"{base_name}_desat", desat_path, 0.7))
        
        # Slightly more saturated
        saturated = color_enhancer.enhance(1.2)
        sat_path = os.path.join(output_dir, f"{base_name}_sat.png")
        saturated.save(sat_path)
        variations.append((f"{base_name}_sat", sat_path, 0.8))
        
    except Exception as e:
        print(f"Error creating variations for {image_path}: {e}")
    
    return variations

def main():
    # Paths
    base_dir = "assets/products/zyn-can-1"
    input_dir = os.path.join(base_dir, "reference-images")
    output_dir = input_dir
    config_path = os.path.join(base_dir, "config.json")
    
    print("🎨 Simple Reference Image Variations Generator")
    print(f"Processing images in: {input_dir}")
    
    # Original images to process
    original_images = {
        "front": "front.png",
        "side": "side.png",
        "logo": "logo.png", 
        "angle_30": "angle_30.png",
        "angle": "angle.png"
    }
    
    all_variations = []
    
    for base_name, filename in original_images.items():
        image_path = os.path.join(input_dir, filename)
        
        if os.path.exists(image_path):
            print(f"Creating variations for {filename}...")
            variations = create_variations(image_path, base_name, output_dir)
            all_variations.extend(variations)
            print(f"  Created {len(variations)} variations")
        else:
            print(f"Warning: {filename} not found, skipping...")
    
    print(f"\n✅ Total variations created: {len(all_variations)}")
    
    # Update config.json
    if os.path.exists(config_path):
        print(f"\n📝 Updating {config_path}...")
        
        try:
            with open(config_path, 'r') as f:
                config = json.load(f)
            
            # Add new reference images
            for var_id, var_path, weight in all_variations:
                filename = os.path.basename(var_path)
                new_ref = {
                    "id": var_id,
                    "path": f"reference-images/{filename}",
                    "weight": weight,
                    "description": f"Generated variation: {var_id}"
                }
                config["detection"]["reference_images"].append(new_ref)
            
            # Save updated config
            with open(config_path, 'w') as f:
                json.dump(config, f, indent=2)
            
            print(f"✅ Added {len(all_variations)} new reference images to config")
            
        except Exception as e:
            print(f"Error updating config: {e}")
    else:
        print(f"⚠️  Config file not found: {config_path}")
    
    print("\n🚀 Image variations created successfully!")
    print("Reload your application to use the enhanced reference images.")

if __name__ == "__main__":
    main()