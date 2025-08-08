#!/usr/bin/env python3
"""
Complete Training Pipeline Runner
Orchestrates the entire ML training pipeline from raw images to deployed TensorFlow.js model.
"""

import os
import sys
import subprocess
import argparse
from pathlib import Path
from datetime import datetime

def run_command(command, description, cwd=None):
    """Run a command and handle errors."""
    print(f"\n{'='*60}")
    print(f"🚀 {description}")
    print(f"{'='*60}")
    print(f"Command: {' '.join(command)}")
    
    try:
        result = subprocess.run(
            command, 
            cwd=cwd, 
            check=True, 
            capture_output=False,
            text=True
        )
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed with exit code {e.returncode}")
        return False

def check_raw_data(data_dir):
    """Check if raw training data is available."""
    raw_dir = data_dir / 'raw'
    
    if not raw_dir.exists():
        print(f"❌ Raw data directory not found: {raw_dir}")
        return False
    
    products = [
        'zyn-apple-mint',
        'zyn-spearmint', 
        'terea-yellow',
        'terea-sienna',
        'iqos-iluma-prime'
    ]
    
    missing_products = []
    total_images = 0
    
    for product in products:
        product_dir = raw_dir / product
        if not product_dir.exists():
            missing_products.append(product)
            continue
        
        # Count images
        image_files = []
        for ext in ['.jpg', '.jpeg', '.png', '.bmp']:
            image_files.extend(product_dir.glob(f'*{ext}'))
            image_files.extend(product_dir.glob(f'*{ext.upper()}'))
        
        print(f"📸 {product}: {len(image_files)} images")
        total_images += len(image_files)
    
    if missing_products:
        print(f"❌ Missing product directories: {missing_products}")
        return False
    
    if total_images == 0:
        print(f"❌ No training images found!")
        return False
    
    print(f"✅ Found {total_images} training images across {len(products)} products")
    return True

def main():
    parser = argparse.ArgumentParser(description='Run complete ML training pipeline')
    parser.add_argument('--data-dir', type=Path, default='./data',
                       help='Data directory containing raw images')
    parser.add_argument('--output-dir', type=Path, default='./models',
                       help='Output directory for trained models')
    parser.add_argument('--public-dir', type=Path, default='../public',
                       help='Public directory for web deployment')
    parser.add_argument('--skip-augmentation', action='store_true',
                       help='Skip image augmentation (use existing augmented data)')
    parser.add_argument('--skip-training', action='store_true',
                       help='Skip model training (use existing model)')
    parser.add_argument('--skip-conversion', action='store_true',
                       help='Skip TensorFlow.js conversion')
    parser.add_argument('--epochs', type=int, default=50,
                       help='Number of training epochs')
    parser.add_argument('--batch-size', type=int, default=32,
                       help='Training batch size')
    parser.add_argument('--augmentations', type=int, default=12,
                       help='Number of augmentations per base image')
    
    args = parser.parse_args()
    
    print("🎯 PRODUCT RECOGNITION TRAINING PIPELINE")
    print("="*60)
    print(f"📁 Data directory: {args.data_dir.absolute()}")
    print(f"💾 Output directory: {args.output_dir.absolute()}")
    print(f"🌐 Public directory: {args.public_dir.absolute()}")
    print(f"⏰ Training epochs: {args.epochs}")
    print(f"📊 Batch size: {args.batch_size}")
    print(f"🔄 Augmentations per image: {args.augmentations}")
    
    # Change to scripts directory
    scripts_dir = Path(__file__).parent / 'scripts'
    
    # Step 1: Check raw data
    print(f"\n🔍 Step 1: Checking raw training data...")
    if not check_raw_data(args.data_dir):
        print(f"\n❌ Please add your training images to:")
        print(f"   {args.data_dir / 'raw'}")
        print(f"   See {args.data_dir / 'raw' / 'README.md'} for structure")
        return False
    
    # Step 2: Image augmentation
    if not args.skip_augmentation:
        augmentation_success = run_command([
            sys.executable, 'augment_images.py',
            '--raw-dir', str(args.data_dir / 'raw'),
            '--output-dir', str(args.data_dir / 'augmented'),
            '--splits-dir', str(args.data_dir / 'splits'),
            '--augmentations', str(args.augmentations)
        ], "Image Augmentation", cwd=scripts_dir)
        
        if not augmentation_success:
            return False
    else:
        print("⏭️  Skipping image augmentation (using existing data)")
    
    # Step 3: Model training
    if not args.skip_training:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        model_output_dir = args.output_dir / f"training_{timestamp}"
        
        training_success = run_command([
            sys.executable, 'train_model.py',
            '--data-dir', str(args.data_dir / 'splits'),
            '--model-dir', str(args.output_dir),
            '--epochs', str(args.epochs),
            '--batch-size', str(args.batch_size)
        ], "Model Training", cwd=scripts_dir)
        
        if not training_success:
            return False
        
        # Find the latest model
        model_dirs = list(args.output_dir.glob('training_*'))
        if model_dirs:
            latest_model_dir = max(model_dirs, key=lambda x: x.stat().st_mtime)
            latest_model = latest_model_dir / 'final_model.h5'
        else:
            print("❌ No trained model found")
            return False
    else:
        print("⏭️  Skipping model training (using existing model)")
        # Find existing model
        model_dirs = list(args.output_dir.glob('training_*'))
        if not model_dirs:
            print("❌ No existing models found. Cannot skip training.")
            return False
        latest_model_dir = max(model_dirs, key=lambda x: x.stat().st_mtime)
        latest_model = latest_model_dir / 'final_model.h5'
    
    # Step 4: Model validation
    validation_success = run_command([
        sys.executable, 'validate_model.py',
        '--model-path', str(latest_model),
        '--validation-dir', str(args.data_dir / 'splits' / 'val'),
        '--output-dir', str(latest_model_dir / 'validation')
    ], "Model Validation", cwd=scripts_dir)
    
    if not validation_success:
        print("⚠️  Validation failed, but continuing with conversion...")
    
    # Step 5: TensorFlow.js conversion
    if not args.skip_conversion:
        conversion_success = run_command([
            sys.executable, 'convert_tfjs.py',
            '--model-path', str(latest_model),
            '--output-dir', str(latest_model_dir / 'converted'),
            '--public-dir', str(args.public_dir),
            '--copy-to-public'
        ], "TensorFlow.js Conversion", cwd=scripts_dir)
        
        if not conversion_success:
            return False
    else:
        print("⏭️  Skipping TensorFlow.js conversion")
    
    # Success summary
    print(f"\n{'='*60}")
    print(f"🎉 TRAINING PIPELINE COMPLETE!")
    print(f"{'='*60}")
    print(f"📁 Model directory: {latest_model_dir}")
    print(f"🤖 TensorFlow model: {latest_model}")
    
    if not args.skip_conversion:
        tfjs_model = latest_model_dir / 'converted' / 'tfjs_model' / 'model.json'
        public_model = args.public_dir / 'ml-model' / 'model.json'
        print(f"🌐 TensorFlow.js model: {tfjs_model}")
        if public_model.exists():
            print(f"📦 Deployed to public: {public_model}")
    
    print(f"\n📝 Next steps:")
    print(f"1. Your TensorFlow.js model is ready for the WebAR app!")
    print(f"2. The model files are in: {args.public_dir}/ml-model/")
    print(f"3. Use web_integration.js for easy integration")
    print(f"4. Start building your WebAR application!")
    
    return True

if __name__ == "__main__":
    success = main()
    if not success:
        sys.exit(1)