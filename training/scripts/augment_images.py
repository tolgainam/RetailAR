#!/usr/bin/env python3
"""
Image Augmentation Script for Product Recognition Training Data
Generates augmented training images from base product images using Albumentations.
"""

import os
import cv2
import numpy as np
import albumentations as A
from PIL import Image
import argparse
from pathlib import Path
from tqdm import tqdm
import json

# Product categories
PRODUCTS = [
    'zyn-apple-mint',
    'zyn-spearmint', 
    'terea-yellow',
    'terea-sienna',
    'iqos-iluma-prime'
]

# Augmentation pipeline with realistic variations
def create_augmentation_pipeline():
    """Create comprehensive augmentation pipeline for product images."""
    return A.Compose([
        # Geometric transformations
        A.Rotate(limit=25, p=0.8),
        A.ShiftScaleRotate(
            shift_limit=0.1, 
            scale_limit=0.2, 
            rotate_limit=15, 
            p=0.7
        ),
        A.Perspective(scale=(0.05, 0.1), p=0.3),
        A.ElasticTransform(alpha=50, sigma=5, p=0.2),
        
        # Lighting and color adjustments
        A.RandomBrightnessContrast(
            brightness_limit=0.3, 
            contrast_limit=0.3, 
            p=0.8
        ),
        A.HueSaturationValue(
            hue_shift_limit=10, 
            sat_shift_limit=20, 
            val_shift_limit=20, 
            p=0.6
        ),
        A.RGBShift(r_shift_limit=15, g_shift_limit=15, b_shift_limit=15, p=0.5),
        A.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.1, p=0.5),
        
        # Noise and blur effects
        A.OneOf([
            A.GaussNoise(var_limit=(10.0, 50.0), mean=0, p=0.3),
            A.ISONoise(color_shift=(0.01, 0.05), p=0.3),
            A.MultiplicativeNoise(multiplier=[0.9, 1.1], p=0.3),
        ], p=0.4),
        
        A.OneOf([
            A.MotionBlur(blur_limit=3, p=0.3),
            A.MedianBlur(blur_limit=3, p=0.3),
            A.GaussianBlur(blur_limit=3, p=0.3),
        ], p=0.3),
        
        # Environmental effects
        A.RandomShadow(
            shadow_roi=(0, 0.5, 1, 1),
            num_shadows_limit=(1, 2),
            p=0.3
        ),
        A.RandomSunFlare(
            flare_roi=(0, 0, 1, 0.5),
            angle_limit=(0, 1),
            p=0.1
        ),
        
        # Image quality variations
        A.ImageCompression(quality_limit=(85, 100), p=0.3),
        A.Downscale(scale_limit=(0.8, 0.99), p=0.2),
        
        # Final resize to ensure consistent input size
        A.Resize(224, 224),
    ])

def augment_single_image(image_path, output_dir, product_name, base_filename, num_augmentations=12):
    """Generate augmented versions of a single image."""
    # Load image with PIL first to handle different formats
    pil_image = Image.open(image_path)
    
    # Convert RGBA to RGB if necessary
    if pil_image.mode in ('RGBA', 'LA', 'P'):
        background = Image.new('RGB', pil_image.size, (255, 255, 255))
        if pil_image.mode == 'P':
            pil_image = pil_image.convert('RGBA')
        background.paste(pil_image, mask=pil_image.split()[-1] if pil_image.mode in ('RGBA', 'LA') else None)
        pil_image = background
    elif pil_image.mode != 'RGB':
        pil_image = pil_image.convert('RGB')
    
    # Convert to numpy array for augmentations
    image = np.array(pil_image)
    
    # Create augmentation pipeline
    transform = create_augmentation_pipeline()
    
    augmented_images = []
    
    # Generate augmentations
    for i in range(num_augmentations):
        augmented = transform(image=image)
        augmented_image = augmented['image']
        
        # Save augmented image
        output_filename = f"{product_name}_{base_filename}_aug_{i:03d}.jpg"
        output_path = output_dir / output_filename
        
        # Convert back to PIL and save
        pil_image = Image.fromarray(augmented_image)
        pil_image.save(output_path, 'JPEG', quality=95)
        
        augmented_images.append(output_filename)
        
    return augmented_images

def process_product(product_name, raw_dir, output_dir, augmentations_per_image=12):
    """Process all images for a single product."""
    product_raw_dir = raw_dir / product_name
    product_output_dir = output_dir / product_name
    
    if not product_raw_dir.exists():
        print(f"⚠️  Raw data directory not found: {product_raw_dir}")
        return []
    
    # Create output directory
    product_output_dir.mkdir(parents=True, exist_ok=True)
    
    # Find all images in raw directory
    image_extensions = ['.jpg', '.jpeg', '.png', '.bmp']
    image_files = []
    for ext in image_extensions:
        image_files.extend(product_raw_dir.glob(f"*{ext}"))
        image_files.extend(product_raw_dir.glob(f"*{ext.upper()}"))
    
    if not image_files:
        print(f"⚠️  No images found in {product_raw_dir}")
        return []
    
    print(f"📸 Processing {product_name}: {len(image_files)} base images")
    
    all_augmented = []
    
    # Process each base image
    for image_file in tqdm(image_files, desc=f"Augmenting {product_name}"):
        base_filename = image_file.stem
        
        # Copy original image
        original_output = product_output_dir / f"{product_name}_{base_filename}_original.jpg"
        image = Image.open(image_file)
        
        # Convert RGBA to RGB if necessary
        if image.mode in ('RGBA', 'LA', 'P'):
            # Create white background
            background = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                image = image.convert('RGBA')
            background.paste(image, mask=image.split()[-1] if image.mode in ('RGBA', 'LA') else None)
            image = background
        elif image.mode != 'RGB':
            image = image.convert('RGB')
            
        image = image.resize((224, 224), Image.LANCZOS)
        image.save(original_output, 'JPEG', quality=95)
        all_augmented.append(original_output.name)
        
        # Generate augmentations
        augmented_files = augment_single_image(
            image_file, 
            product_output_dir, 
            product_name, 
            base_filename, 
            augmentations_per_image
        )
        all_augmented.extend(augmented_files)
    
    print(f"✅ Generated {len(all_augmented)} images for {product_name}")
    return all_augmented

def create_dataset_splits(augmented_dir, splits_dir, train_ratio=0.8, val_ratio=0.2):
    """Create train/validation splits from augmented data."""
    splits_dir.mkdir(parents=True, exist_ok=True)
    
    dataset_info = {
        'products': PRODUCTS,
        'total_images': 0,
        'splits': {}
    }
    
    for split in ['train', 'val']:
        split_dir = splits_dir / split
        split_dir.mkdir(exist_ok=True)
        dataset_info['splits'][split] = {}
    
    # Process each product
    for product in PRODUCTS:
        product_dir = augmented_dir / product
        if not product_dir.exists():
            continue
            
        # Get all images
        images = list(product_dir.glob("*.jpg"))
        images.extend(product_dir.glob("*.png"))
        
        if not images:
            continue
            
        # Shuffle and split
        np.random.seed(42)  # For reproducible splits
        np.random.shuffle(images)
        
        train_count = int(len(images) * train_ratio)
        train_images = images[:train_count]
        val_images = images[train_count:]
        
        # Create product directories in splits
        for split in ['train', 'val']:
            split_product_dir = splits_dir / split / product
            split_product_dir.mkdir(parents=True, exist_ok=True)
        
        # Copy images to appropriate splits
        for img in train_images:
            (splits_dir / 'train' / product / img.name).symlink_to(img.resolve())
            
        for img in val_images:
            (splits_dir / 'val' / product / img.name).symlink_to(img.resolve())
        
        # Update dataset info
        dataset_info['splits']['train'][product] = len(train_images)
        dataset_info['splits']['val'][product] = len(val_images)
        dataset_info['total_images'] += len(images)
        
        print(f"📊 {product}: {len(train_images)} train, {len(val_images)} val")
    
    # Save dataset info
    with open(splits_dir / 'dataset_info.json', 'w') as f:
        json.dump(dataset_info, f, indent=2)
    
    print(f"\n✅ Dataset splits created: {dataset_info['total_images']} total images")
    return dataset_info

def main():
    parser = argparse.ArgumentParser(description='Generate augmented training data for product recognition')
    parser.add_argument('--raw-dir', type=Path, default='../data/raw',
                       help='Directory containing raw product images')
    parser.add_argument('--output-dir', type=Path, default='../data/augmented', 
                       help='Output directory for augmented images')
    parser.add_argument('--splits-dir', type=Path, default='../data/splits',
                       help='Output directory for train/val splits')
    parser.add_argument('--augmentations', type=int, default=12,
                       help='Number of augmentations per base image')
    parser.add_argument('--products', nargs='*', default=PRODUCTS,
                       help='Products to process')
    
    args = parser.parse_args()
    
    # If running from scripts directory, adjust paths
    script_dir = Path(__file__).parent
    if script_dir.name == 'scripts':
        # We're in the scripts directory, go up one level
        base_dir = script_dir.parent
        if not args.raw_dir.is_absolute():
            args.raw_dir = base_dir / args.raw_dir
        if not args.output_dir.is_absolute():
            args.output_dir = base_dir / args.output_dir  
        if not args.splits_dir.is_absolute():
            args.splits_dir = base_dir / args.splits_dir
    
    # Convert to absolute paths and resolve
    args.raw_dir = args.raw_dir.resolve()
    args.output_dir = args.output_dir.resolve()
    args.splits_dir = args.splits_dir.resolve()
    
    print("🚀 Starting image augmentation pipeline...")
    print(f"📁 Raw directory: {args.raw_dir}")
    print(f"📁 Output directory: {args.output_dir}")
    print(f"📁 Splits directory: {args.splits_dir}")
    print(f"Products: {args.products}")
    print(f"Augmentations per image: {args.augmentations}")
    
    # Verify raw directory exists
    if not args.raw_dir.exists():
        print(f"❌ Raw directory does not exist: {args.raw_dir}")
        return
    
    # Create output directories
    args.output_dir.mkdir(parents=True, exist_ok=True)
    
    # Process each product
    total_images = 0
    for product in args.products:
        if product in PRODUCTS:
            images = process_product(product, args.raw_dir, args.output_dir, args.augmentations)
            total_images += len(images)
        else:
            print(f"⚠️  Unknown product: {product}")
    
    if total_images > 0:
        # Create dataset splits
        print("\n📂 Creating train/validation splits...")
        dataset_info = create_dataset_splits(args.output_dir, args.splits_dir)
        
        print(f"\n🎉 Augmentation complete!")
        print(f"📊 Total images generated: {total_images}")
        print(f"📁 Augmented data: {args.output_dir}")
        print(f"📁 Dataset splits: {args.splits_dir}")
        print("\nNext step: Run train_model.py to train your TensorFlow model!")
    else:
        print("\n❌ No images were processed. Please check your raw data directory.")

if __name__ == "__main__":
    main()