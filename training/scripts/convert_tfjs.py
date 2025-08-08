#!/usr/bin/env python3
"""
TensorFlow.js Model Conversion Script
Converts trained TensorFlow model to TensorFlow.js format for web deployment.
"""

import os
import json
import argparse
import shutil
from pathlib import Path
import tensorflowjs as tfjs
import tensorflow as tf

# Product categories (must match training script)
PRODUCTS = [
    'zyn-apple-mint',
    'zyn-spearmint', 
    'terea-yellow',
    'terea-sienna',
    'iqos-iluma-prime'
]

def convert_model(model_path, output_dir, quantization=True):
    """Convert TensorFlow model to TensorFlow.js format."""
    
    print(f"🔄 Loading model from: {model_path}")
    
    # Load the trained model
    model = tf.keras.models.load_model(model_path)
    
    # Print model info
    print(f"📊 Model input shape: {model.input_shape}")
    print(f"📊 Model output shape: {model.output_shape}")
    print(f"📊 Number of parameters: {model.count_params():,}")
    
    # Convert to TensorFlow.js directly from Keras model
    tfjs_output = output_dir / 'tfjs_model'
    print(f"🔄 Converting to TensorFlow.js: {tfjs_output}")
    
    # Use the direct Keras conversion (more reliable)
    conversion_kwargs = {
        'quantization_dtype': 'uint8' if quantization else None,
        'strip_debug_ops': True,
        'weight_shard_size_bytes': 4 * 1024 * 1024,  # 4MB shards
    }
    
    if quantization:
        print("🗜️  Applying uint8 quantization for smaller model size...")
    
    try:
        # Direct conversion from Keras model (preferred method)
        tfjs.converters.save_keras_model(
            model,
            str(tfjs_output),
            **{k: v for k, v in conversion_kwargs.items() if v is not None}
        )
    except Exception as e:
        print(f"⚠️  Direct conversion failed, trying alternative method: {e}")
        
        # Fallback: Save as SavedModel first, then convert
        saved_model_path = output_dir / 'saved_model'
        print(f"💾 Saving as SavedModel: {saved_model_path}")
        tf.saved_model.save(model, str(saved_model_path))
        
        # Convert using saved model method
        tfjs.converters.convert_tf_saved_model(
            str(saved_model_path),
            str(tfjs_output),
            strip_debug_ops=True,
            weight_shard_size_bytes=4 * 1024 * 1024
        )
    
    return tfjs_output

def create_model_metadata(model_dir, tfjs_output, original_config_path=None):
    """Create metadata file for the web application."""
    
    # Load original training config if available
    config = {}
    if original_config_path and original_config_path.exists():
        with open(original_config_path, 'r') as f:
            config = json.load(f)
    
    # Create model metadata
    metadata = {
        'model_info': {
            'version': '1.0.0',
            'created': config.get('timestamp', 'unknown'),
            'framework': 'TensorFlow.js',
            'architecture': 'MobileNetV2 + Custom Head'
        },
        'model_config': {
            'input_shape': config.get('img_size', [224, 224]),
            'num_classes': len(PRODUCTS),
            'products': PRODUCTS,
            'preprocessing': {
                'rescale': 1.0 / 255.0,
                'resize': config.get('img_size', [224, 224])
            }
        },
        'training_info': {
            'epochs': config.get('epochs', 'unknown'),
            'batch_size': config.get('batch_size', 'unknown'),
            'training_samples': config.get('training_samples', 'unknown'),
            'validation_samples': config.get('validation_samples', 'unknown')
        },
        'usage': {
            'load_url': './tfjs_model/model.json',
            'example_inference': '''
// Load model
const model = await tf.loadLayersModel('./tfjs_model/model.json');

// Preprocess image
const tensor = tf.browser.fromPixels(imageElement)
  .resizeBilinear([224, 224])
  .expandDims(0)
  .div(255.0);

// Make prediction
const prediction = model.predict(tensor);
const probabilities = await prediction.data();
const predictedClass = prediction.argMax(-1).dataSync()[0];

// Get product name
const productName = products[predictedClass];
const confidence = probabilities[predictedClass];
            '''
        }
    }
    
    # Save metadata
    metadata_path = tfjs_output / 'model_metadata.json'
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"📄 Model metadata saved: {metadata_path}")
    return metadata

def create_web_integration_code(output_dir):
    """Create example integration code for the web application."""
    
    integration_code = '''
/**
 * Product Recognition Model Integration
 * TensorFlow.js model for IQOS/VEEV/ZYN product classification
 */

class ProductRecognitionModel {
    constructor() {
        this.model = null;
        this.isLoaded = false;
        this.products = [
            'zyn-apple-mint',
            'zyn-spearmint', 
            'terea-yellow',
            'terea-sienna',
            'iqos-iluma-prime'
        ];
    }
    
    async loadModel(modelUrl = './ml-model/tfjs_model/model.json') {
        try {
            console.log('🤖 Loading TensorFlow.js model...');
            this.model = await tf.loadLayersModel(modelUrl);
            this.isLoaded = true;
            console.log('✅ Model loaded successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to load model:', error);
            return false;
        }
    }
    
    preprocessImage(imageElement) {
        // Convert image to tensor and preprocess
        return tf.tidy(() => {
            // Convert to tensor
            let tensor = tf.browser.fromPixels(imageElement);
            
            // Resize to model input size
            tensor = tf.image.resizeBilinear(tensor, [224, 224]);
            
            // Normalize pixels to [0, 1]
            tensor = tensor.div(255.0);
            
            // Add batch dimension
            tensor = tensor.expandDims(0);
            
            return tensor;
        });
    }
    
    async predict(imageElement, confidenceThreshold = 0.7) {
        if (!this.isLoaded) {
            throw new Error('Model not loaded. Call loadModel() first.');
        }
        
        // Preprocess image
        const inputTensor = this.preprocessImage(imageElement);
        
        try {
            // Make prediction
            const prediction = this.model.predict(inputTensor);
            
            // Get probabilities
            const probabilities = await prediction.data();
            
            // Find best prediction
            const maxIndex = prediction.argMax(-1).dataSync()[0];
            const confidence = probabilities[maxIndex];
            const productName = this.products[maxIndex];
            
            // Clean up tensors
            inputTensor.dispose();
            prediction.dispose();
            
            // Return result if confidence is high enough
            if (confidence >= confidenceThreshold) {
                return {
                    success: true,
                    product: productName,
                    confidence: confidence,
                    allProbabilities: Array.from(probabilities)
                };
            } else {
                return {
                    success: false,
                    reason: 'Low confidence',
                    confidence: confidence
                };
            }
            
        } catch (error) {
            inputTensor.dispose();
            throw error;
        }
    }
    
    // Get all predictions with probabilities
    async getAllPredictions(imageElement) {
        if (!this.isLoaded) {
            throw new Error('Model not loaded. Call loadModel() first.');
        }
        
        const inputTensor = this.preprocessImage(imageElement);
        
        try {
            const prediction = this.model.predict(inputTensor);
            const probabilities = await prediction.data();
            
            // Clean up
            inputTensor.dispose();
            prediction.dispose();
            
            // Return all predictions sorted by confidence
            const results = this.products.map((product, index) => ({
                product,
                confidence: probabilities[index]
            })).sort((a, b) => b.confidence - a.confidence);
            
            return results;
            
        } catch (error) {
            inputTensor.dispose();
            throw error;
        }
    }
}

// Export for use in main application
window.ProductRecognitionModel = ProductRecognitionModel;

// Example usage:
/*
const model = new ProductRecognitionModel();
await model.loadModel();

// In your detection loop:
const result = await model.predict(videoElement);
if (result.success) {
    console.log(`Detected: ${result.product} (${(result.confidence * 100).toFixed(1)}%)`);
    // Show product information...
}
*/
'''
    
    integration_path = output_dir / 'web_integration.js'
    with open(integration_path, 'w') as f:
        f.write(integration_code)
    
    print(f"🌐 Web integration code saved: {integration_path}")

def copy_to_public(tfjs_output, public_dir):
    """Copy TensorFlow.js model to public directory for web app."""
    
    public_ml_dir = public_dir / 'ml-model'
    
    if public_ml_dir.exists():
        shutil.rmtree(public_ml_dir)
    
    shutil.copytree(tfjs_output, public_ml_dir)
    print(f"📦 Model copied to public directory: {public_ml_dir}")

def main():
    parser = argparse.ArgumentParser(description='Convert TensorFlow model to TensorFlow.js')
    parser.add_argument('--model-path', type=Path, required=True,
                       help='Path to trained TensorFlow model (.h5 file)')
    parser.add_argument('--output-dir', type=Path, default='../models/converted',
                       help='Output directory for converted model')
    parser.add_argument('--public-dir', type=Path, default='../../public',
                       help='Public directory to copy model for web app')
    parser.add_argument('--no-quantization', action='store_true',
                       help='Disable quantization (larger model, possibly better accuracy)')
    parser.add_argument('--copy-to-public', action='store_true',
                       help='Copy converted model to public directory')
    
    args = parser.parse_args()
    
    print("🔄 Converting TensorFlow model to TensorFlow.js...")
    print(f"📁 Input model: {args.model_path}")
    print(f"💾 Output directory: {args.output_dir}")
    
    # Check if model exists
    if not args.model_path.exists():
        print(f"❌ Model not found: {args.model_path}")
        return
    
    # Create output directory
    args.output_dir.mkdir(parents=True, exist_ok=True)
    
    # Convert model
    tfjs_output = convert_model(
        args.model_path, 
        args.output_dir, 
        quantization=not args.no_quantization
    )
    
    # Create metadata
    model_dir = args.model_path.parent
    config_path = model_dir / 'training_config.json'
    metadata = create_model_metadata(model_dir, tfjs_output, config_path)
    
    # Create web integration code
    create_web_integration_code(args.output_dir)
    
    # Copy to public directory if requested
    if args.copy_to_public and args.public_dir.exists():
        copy_to_public(tfjs_output, args.public_dir)
    
    # Get model file sizes
    model_json = tfjs_output / 'model.json'
    model_weights = list(tfjs_output.glob('*.bin'))
    
    if model_json.exists():
        json_size = model_json.stat().st_size / 1024 / 1024  # MB
        weights_size = sum(f.stat().st_size for f in model_weights) / 1024 / 1024  # MB
        total_size = json_size + weights_size
        
        print(f"\n📊 Model conversion complete!")
        print(f"📄 Model JSON: {json_size:.2f} MB")
        print(f"⚖️  Model weights: {weights_size:.2f} MB") 
        print(f"📦 Total size: {total_size:.2f} MB")
        
        print(f"\n📝 Files created:")
        print(f"  🤖 TensorFlow.js model: {tfjs_output}/model.json")
        print(f"  📄 Model metadata: {tfjs_output}/model_metadata.json")
        print(f"  🌐 Integration code: {args.output_dir}/web_integration.js")
        
        if args.copy_to_public:
            print(f"  📦 Copied to public: {args.public_dir}/ml-model/")
        
        print(f"\n🚀 Next steps:")
        print(f"1. Copy the TensorFlow.js model files to your web app")
        print(f"2. Include web_integration.js in your HTML")
        print(f"3. Load and use the model in your WebAR application!")
        
    else:
        print("❌ Conversion failed - model.json not found")

if __name__ == "__main__":
    main()