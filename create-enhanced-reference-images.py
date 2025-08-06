#!/usr/bin/env python3
"""
Enhanced Reference Image Generator for ZYN Can Detection
Creates variations of existing reference images to improve matching accuracy
"""

import cv2
import numpy as np
import os
from PIL import Image, ImageEnhance, ImageFilter
import json

def load_and_process_image(image_path):
    """Load image and convert to OpenCV format"""
    img_pil = Image.open(image_path).convert('RGBA')
    img_cv = cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGBA2BGR)
    return img_cv, img_pil

def create_brightness_variations(img_pil, base_name, output_dir):
    """Create brightness variations"""
    variations = []
    
    # Bright version
    enhancer = ImageEnhance.Brightness(img_pil)
    bright_img = enhancer.enhance(1.3)
    bright_path = os.path.join(output_dir, f"{base_name}_bright.png")
    bright_img.save(bright_path)
    variations.append(("bright", bright_path, 0.8))
    
    # Dim version
    dim_img = enhancer.enhance(0.7)
    dim_path = os.path.join(output_dir, f"{base_name}_dim.png")
    dim_img.save(dim_path)
    variations.append(("dim", dim_path, 0.8))
    
    return variations

def create_rotation_variations(img_cv, base_name, output_dir):
    """Create rotated versions"""
    variations = []
    angles = [-15, -10, -5, 5, 10, 15]
    
    h, w = img_cv.shape[:2]
    center = (w // 2, h // 2)
    
    for angle in angles:
        # Create rotation matrix
        rotation_matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
        
        # Calculate new dimensions to avoid cropping
        cos_val = np.abs(rotation_matrix[0, 0])
        sin_val = np.abs(rotation_matrix[0, 1])
        new_w = int((h * sin_val) + (w * cos_val))
        new_h = int((h * cos_val) + (w * sin_val))
        
        # Adjust translation
        rotation_matrix[0, 2] += (new_w - w) / 2
        rotation_matrix[1, 2] += (new_h - h) / 2
        
        # Apply rotation with transparent background
        rotated = cv2.warpAffine(img_cv, rotation_matrix, (new_w, new_h), 
                                borderMode=cv2.BORDER_CONSTANT, 
                                borderValue=(255, 255, 255, 0))
        
        angle_str = f"rot_{angle:+03d}".replace('-', 'neg')
        rot_path = os.path.join(output_dir, f"{base_name}_{angle_str}.png")
        cv2.imwrite(rot_path, rotated)
        variations.append((f"rotation_{angle}", rot_path, 0.7))
    
    return variations

def create_scale_variations(img_cv, base_name, output_dir):
    """Create scaled versions"""
    variations = []
    scales = [0.8, 0.9, 1.1, 1.2]
    
    h, w = img_cv.shape[:2]
    
    for scale in scales:
        new_w = int(w * scale)
        new_h = int(h * scale)
        
        scaled = cv2.resize(img_cv, (new_w, new_h), interpolation=cv2.INTER_AREA)
        
        # Create canvas with original size
        if scale < 1.0:
            # Smaller image - center on white background
            canvas = np.ones((h, w, 3), dtype=np.uint8) * 255
            start_x = (w - new_w) // 2
            start_y = (h - new_h) // 2
            canvas[start_y:start_y+new_h, start_x:start_x+new_w] = scaled
            scaled = canvas
        else:
            # Larger image - crop to original size
            start_x = (new_w - w) // 2
            start_y = (new_h - h) // 2
            scaled = scaled[start_y:start_y+h, start_x:start_x+w]
        
        scale_str = f"scale_{int(scale*100)}"
        scale_path = os.path.join(output_dir, f"{base_name}_{scale_str}.png")
        cv2.imwrite(scale_path, scaled)
        variations.append((f"scale_{scale}", scale_path, 0.8))
    
    return variations

def create_noise_variations(img_pil, base_name, output_dir):
    """Create versions with slight noise/blur"""
    variations = []
    
    # Slight blur
    blurred = img_pil.filter(ImageFilter.GaussianBlur(radius=0.5))
    blur_path = os.path.join(output_dir, f"{base_name}_blur.png")
    blurred.save(blur_path)
    variations.append(("blur", blur_path, 0.7))
    
    # Sharpened
    sharpened = img_pil.filter(ImageFilter.SHARPEN)
    sharp_path = os.path.join(output_dir, f"{base_name}_sharp.png")
    sharpened.save(sharp_path)
    variations.append(("sharp", sharp_path, 0.8))
    
    return variations

def create_contrast_variations(img_pil, base_name, output_dir):
    """Create contrast variations"""
    variations = []
    
    # High contrast
    enhancer = ImageEnhance.Contrast(img_pil)
    high_contrast = enhancer.enhance(1.2)
    contrast_path = os.path.join(output_dir, f"{base_name}_contrast.png")
    high_contrast.save(contrast_path)
    variations.append(("contrast", contrast_path, 0.8))
    
    # Low contrast
    low_contrast = enhancer.enhance(0.8)
    low_contrast_path = os.path.join(output_dir, f"{base_name}_low_contrast.png")
    low_contrast.save(low_contrast_path)
    variations.append(("low_contrast", low_contrast_path, 0.7))
    
    return variations

def process_reference_images(input_dir, output_dir):
    """Process all reference images and create variations"""
    os.makedirs(output_dir, exist_ok=True)
    
    # Original reference images
    original_images = {
        "front": "front.png",
        "side": "side.png", 
        "logo": "logo.png",
        "angle_30": "angle_30.png",
        "angle": "angle.png"
    }
    
    all_variations = []
    
    for base_name, filename in original_images.items():
        input_path = os.path.join(input_dir, filename)
        if not os.path.exists(input_path):
            print(f"Warning: {input_path} not found, skipping...")
            continue
        
        print(f"Processing {filename}...")
        
        try:
            img_cv, img_pil = load_and_process_image(input_path)
            
            # Create various types of variations
            brightness_vars = create_brightness_variations(img_pil, base_name, output_dir)
            rotation_vars = create_rotation_variations(img_cv, base_name, output_dir)
            scale_vars = create_scale_variations(img_cv, base_name, output_dir)
            noise_vars = create_noise_variations(img_pil, base_name, output_dir)
            contrast_vars = create_contrast_variations(img_pil, base_name, output_dir)
            
            # Add all variations
            all_variations.extend(brightness_vars)
            all_variations.extend(rotation_vars)
            all_variations.extend(scale_vars)
            all_variations.extend(noise_vars)
            all_variations.extend(contrast_vars)
            
        except Exception as e:
            print(f"Error processing {filename}: {e}")
    
    return all_variations

def update_config_json(config_path, new_variations):
    """Update the product config with new reference images"""
    try:
        with open(config_path, 'r') as f:
            config = json.load(f)
        
        # Add new reference images to config
        for var_type, rel_path, weight in new_variations:
            # Convert absolute path to relative path
            rel_path = os.path.basename(rel_path)
            
            new_ref = {
                "id": f"{var_type}",
                "path": f"reference-images/{rel_path}",
                "weight": weight,
                "description": f"Generated {var_type} variation"
            }
            
            config["detection"]["reference_images"].append(new_ref)
        
        # Save updated config
        with open(config_path, 'w') as f:
            json.dump(config, f, indent=2)
        
        print(f"Updated config with {len(new_variations)} new reference images")
        
    except Exception as e:
        print(f"Error updating config: {e}")

def main():
    # Paths
    base_dir = "assets/products/zyn-can-1"
    input_dir = os.path.join(base_dir, "reference-images")
    output_dir = input_dir  # Save variations in same directory
    config_path = os.path.join(base_dir, "config.json")
    
    print("🎨 Enhanced Reference Image Generator")
    print(f"Input directory: {input_dir}")
    print(f"Output directory: {output_dir}")
    
    # Create variations
    variations = process_reference_images(input_dir, output_dir)
    
    print(f"\n✅ Created {len(variations)} image variations:")
    for var_type, path, weight in variations[:10]:  # Show first 10
        print(f"  - {var_type}: {os.path.basename(path)} (weight: {weight})")
    
    if len(variations) > 10:
        print(f"  ... and {len(variations) - 10} more")
    
    # Update config.json
    if os.path.exists(config_path):
        print(f"\n📝 Updating {config_path}...")
        update_config_json(config_path, variations)
    else:
        print(f"\n⚠️  Config file not found: {config_path}")
    
    print("\n🚀 Enhanced reference images created successfully!")
    print("Reload your application to use the new reference images.")

if __name__ == "__main__":
    main()