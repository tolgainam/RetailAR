#!/usr/bin/env python3
"""
Model Validation Script
Test and validate the trained TensorFlow.js model with sample images.
"""

import os
import json
import numpy as np
import tensorflow as tf
from pathlib import Path
import argparse
from PIL import Image
import matplotlib.pyplot as plt
from datetime import datetime

# Product categories
PRODUCTS = [
    'zyn-apple-mint',
    'zyn-spearmint', 
    'terea-yellow',
    'terea-sienna',
    'iqos-iluma-prime'
]

def load_and_preprocess_image(image_path, target_size=(224, 224)):
    """Load and preprocess a single image for prediction."""
    
    # Load image
    image = Image.open(image_path)
    
    # Convert to RGB if necessary
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    # Resize
    image = image.resize(target_size, Image.LANCZOS)
    
    # Convert to numpy array and normalize
    img_array = np.array(image, dtype=np.float32)
    img_array = img_array / 255.0
    
    # Add batch dimension
    img_array = np.expand_dims(img_array, axis=0)
    
    return img_array, image

def predict_single_image(model, image_path, confidence_threshold=0.7):
    """Make prediction on a single image."""
    
    # Preprocess image
    img_array, original_image = load_and_preprocess_image(image_path)
    
    # Make prediction
    predictions = model.predict(img_array, verbose=0)
    
    # Get results
    predicted_class = np.argmax(predictions[0])
    confidence = predictions[0][predicted_class]
    product_name = PRODUCTS[predicted_class]
    
    # All predictions
    all_predictions = [(PRODUCTS[i], predictions[0][i]) for i in range(len(PRODUCTS))]
    all_predictions.sort(key=lambda x: x[1], reverse=True)
    
    return {
        'image_path': image_path,
        'predicted_product': product_name,
        'confidence': float(confidence),
        'success': confidence >= confidence_threshold,
        'all_predictions': all_predictions,
        'original_image': original_image
    }

def validate_directory(model, directory, output_dir, confidence_threshold=0.7):
    """Validate model on all images in a directory."""
    
    results = []
    correct_predictions = 0
    total_predictions = 0
    
    # Process each product directory
    for product in PRODUCTS:
        product_dir = directory / product
        if not product_dir.exists():
            print(f"⚠️  Directory not found: {product_dir}")
            continue
        
        # Get all images
        image_files = []
        for ext in ['.jpg', '.jpeg', '.png', '.bmp']:
            image_files.extend(product_dir.glob(f'*{ext}'))
            image_files.extend(product_dir.glob(f'*{ext.upper()}'))
        
        if not image_files:
            print(f"⚠️  No images found in {product_dir}")
            continue
        
        print(f"🔍 Validating {product}: {len(image_files)} images")
        
        # Process each image
        for img_path in image_files:
            try:
                result = predict_single_image(model, img_path, confidence_threshold)
                result['true_product'] = product
                result['correct'] = result['predicted_product'] == product
                
                results.append(result)
                total_predictions += 1
                
                if result['correct']:
                    correct_predictions += 1
                
                # Print result
                status = "✅" if result['correct'] else "❌"
                conf_str = f"{result['confidence']:.3f}"
                print(f"  {status} {img_path.name}: {result['predicted_product']} ({conf_str})")
                
            except Exception as e:
                print(f"❌ Error processing {img_path}: {e}")
    
    # Calculate overall accuracy
    overall_accuracy = correct_predictions / total_predictions if total_predictions > 0 else 0
    
    # Generate detailed report
    report = generate_validation_report(results, output_dir)
    
    print(f"\n📊 Validation Summary:")
    print(f"  Total images: {total_predictions}")
    print(f"  Correct predictions: {correct_predictions}")
    print(f"  Overall accuracy: {overall_accuracy:.4f}")
    
    return results, report

def generate_validation_report(results, output_dir):
    """Generate detailed validation report with visualizations."""
    
    # Calculate per-class metrics
    per_class_stats = {}
    for product in PRODUCTS:
        true_positives = sum(1 for r in results if r['true_product'] == product and r['correct'])
        false_negatives = sum(1 for r in results if r['true_product'] == product and not r['correct'])
        false_positives = sum(1 for r in results if r['predicted_product'] == product and not r['correct'])
        
        total_true = true_positives + false_negatives
        total_predicted = true_positives + false_positives
        
        precision = true_positives / total_predicted if total_predicted > 0 else 0
        recall = true_positives / total_true if total_true > 0 else 0
        f1_score = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
        
        per_class_stats[product] = {
            'precision': precision,
            'recall': recall,
            'f1_score': f1_score,
            'true_positives': true_positives,
            'false_negatives': false_negatives,
            'false_positives': false_positives,
            'total_samples': total_true
        }
    
    # Create confusion matrix
    confusion_matrix = np.zeros((len(PRODUCTS), len(PRODUCTS)), dtype=int)
    for result in results:
        true_idx = PRODUCTS.index(result['true_product'])
        pred_idx = PRODUCTS.index(result['predicted_product'])
        confusion_matrix[true_idx][pred_idx] += 1
    
    # Plot confusion matrix
    plt.figure(figsize=(10, 8))
    plt.imshow(confusion_matrix, interpolation='nearest', cmap='Blues')
    plt.title('Confusion Matrix - Validation Results')
    plt.colorbar()
    
    tick_marks = np.arange(len(PRODUCTS))
    plt.xticks(tick_marks, PRODUCTS, rotation=45)
    plt.yticks(tick_marks, PRODUCTS)
    
    # Add text annotations
    thresh = confusion_matrix.max() / 2
    for i in range(len(PRODUCTS)):
        for j in range(len(PRODUCTS)):
            plt.text(j, i, confusion_matrix[i, j],
                    ha="center", va="center",
                    color="white" if confusion_matrix[i, j] > thresh else "black")
    
    plt.ylabel('True Label')
    plt.xlabel('Predicted Label')
    plt.tight_layout()
    plt.savefig(output_dir / 'validation_confusion_matrix.png', dpi=300, bbox_inches='tight')
    plt.close()
    
    # Plot confidence distribution
    confidences = [r['confidence'] for r in results]
    correct_confidences = [r['confidence'] for r in results if r['correct']]
    incorrect_confidences = [r['confidence'] for r in results if not r['correct']]
    
    plt.figure(figsize=(12, 5))
    
    plt.subplot(1, 2, 1)
    plt.hist(confidences, bins=20, alpha=0.7, color='blue', label='All')
    plt.hist(correct_confidences, bins=20, alpha=0.7, color='green', label='Correct')
    plt.hist(incorrect_confidences, bins=20, alpha=0.7, color='red', label='Incorrect')
    plt.xlabel('Confidence')
    plt.ylabel('Count')
    plt.title('Confidence Distribution')
    plt.legend()
    
    plt.subplot(1, 2, 2)
    products = list(per_class_stats.keys())
    f1_scores = [per_class_stats[p]['f1_score'] for p in products]
    plt.bar(products, f1_scores)
    plt.xlabel('Product')
    plt.ylabel('F1 Score')
    plt.title('Per-Class F1 Scores')
    plt.xticks(rotation=45)
    
    plt.tight_layout()
    plt.savefig(output_dir / 'validation_metrics.png', dpi=300, bbox_inches='tight')
    plt.close()
    
    # Save detailed report
    report = {
        'validation_date': datetime.now().isoformat(),
        'total_images': len(results),
        'overall_accuracy': sum(1 for r in results if r['correct']) / len(results),
        'per_class_stats': per_class_stats,
        'confusion_matrix': confusion_matrix.tolist(),
        'confidence_stats': {
            'mean': float(np.mean(confidences)),
            'std': float(np.std(confidences)),
            'min': float(np.min(confidences)),
            'max': float(np.max(confidences))
        }
    }
    
    with open(output_dir / 'validation_report.json', 'w') as f:
        json.dump(report, f, indent=2)
    
    return report

def test_single_image(model, image_path, output_dir):
    """Test model on a single image and save result visualization."""
    
    result = predict_single_image(model, image_path)
    
    # Create visualization
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))
    
    # Show original image
    ax1.imshow(result['original_image'])
    ax1.set_title(f"Input Image\n{image_path.name}")
    ax1.axis('off')
    
    # Show predictions bar chart
    products, confidences = zip(*result['all_predictions'])
    colors = ['green' if p == result['predicted_product'] else 'skyblue' for p in products]
    
    bars = ax2.bar(range(len(products)), confidences, color=colors)
    ax2.set_xlabel('Products')
    ax2.set_ylabel('Confidence')
    ax2.set_title(f'Predictions\nTop: {result["predicted_product"]} ({result["confidence"]:.3f})')
    ax2.set_xticks(range(len(products)))
    ax2.set_xticklabels(products, rotation=45, ha='right')
    
    # Add confidence threshold line
    ax2.axhline(y=0.7, color='red', linestyle='--', alpha=0.7, label='Threshold')
    ax2.legend()
    
    plt.tight_layout()
    
    # Save result
    output_path = output_dir / f'single_test_{image_path.stem}.png'
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    plt.close()
    
    print(f"📊 Single image test result saved: {output_path}")
    
    return result

def main():
    parser = argparse.ArgumentParser(description='Validate trained TensorFlow model')
    parser.add_argument('--model-path', type=Path, required=True,
                       help='Path to trained TensorFlow model (.h5 file)')
    parser.add_argument('--validation-dir', type=Path, default='../data/splits/val',
                       help='Directory containing validation images')
    parser.add_argument('--output-dir', type=Path, default='../models/validation',
                       help='Output directory for validation results')
    parser.add_argument('--single-image', type=Path,
                       help='Test on a single image instead of full validation')
    parser.add_argument('--confidence-threshold', type=float, default=0.7,
                       help='Confidence threshold for successful prediction')
    
    args = parser.parse_args()
    
    print("🧪 Starting model validation...")
    print(f"🤖 Model: {args.model_path}")
    
    # Check if model exists
    if not args.model_path.exists():
        print(f"❌ Model not found: {args.model_path}")
        return
    
    # Load model
    print("📥 Loading model...")
    try:
        model = tf.keras.models.load_model(args.model_path)
        print("✅ Model loaded successfully")
    except Exception as e:
        print(f"❌ Failed to load model: {e}")
        return
    
    # Create output directory
    args.output_dir.mkdir(parents=True, exist_ok=True)
    
    if args.single_image:
        # Test single image
        print(f"🔍 Testing single image: {args.single_image}")
        result = test_single_image(model, args.single_image, args.output_dir)
        
        print(f"\n📊 Results:")
        print(f"  Predicted: {result['predicted_product']}")
        print(f"  Confidence: {result['confidence']:.4f}")
        print(f"  Success: {result['success']}")
        
    else:
        # Validate on full dataset
        print(f"📁 Validation directory: {args.validation_dir}")
        
        if not args.validation_dir.exists():
            print(f"❌ Validation directory not found: {args.validation_dir}")
            return
        
        results, report = validate_directory(
            model, args.validation_dir, args.output_dir, args.confidence_threshold
        )
        
        print(f"\n📝 Validation report saved to: {args.output_dir}")
        print(f"🎯 Overall accuracy: {report['overall_accuracy']:.4f}")

if __name__ == "__main__":
    main()