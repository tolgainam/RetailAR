/**
 * ML Model Manager
 * Handles TensorFlow.js model loading and inference
 */

import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';

export class MLModelManager {
    constructor() {
        this.model = null;
        this.isLoaded = false;
        this.modelConfig = null;
        
        // Product categories (must match training pipeline)
        this.products = [
            'zyn-apple-mint',
            'zyn-spearmint', 
            'terea-yellow',
            'terea-sienna',
            'iqos-iluma-prime'
        ];
        
        // Model configuration
        this.inputShape = [224, 224, 3];
        this.confidenceThreshold = 0.3;  // Lowered for testing
        
        console.log('🤖 ML Model Manager initialized');
    }
    
    async loadModel(modelUrl = `./ml-model/model.json?v=${Date.now()}`) {
        try {
            console.log('📥 Loading TensorFlow.js model...');
            
            // Ensure WebGL backend is ready
            await tf.ready();
            console.log(`🔧 TensorFlow.js backend: ${tf.getBackend()}`);
            
            // Load the model (GraphModel format)
            this.model = await tf.loadGraphModel(modelUrl);
            
            // Load model metadata if available
            try {
                const metadataResponse = await fetch(`./ml-model/model_metadata.json?v=${Date.now()}`);
                if (metadataResponse.ok) {
                    this.modelConfig = await metadataResponse.json();
                    console.log('📄 Model metadata loaded');
                }
            } catch (error) {
                console.warn('⚠️  Model metadata not found, using defaults');
            }
            
            // Verify model architecture (GraphModel format)
            const modelSignature = this.model.modelSignature;
            console.log('📊 Model signature:', modelSignature);
            
            if (modelSignature && modelSignature.inputs) {
                const inputInfo = Object.values(modelSignature.inputs)[0];
                console.log('📊 Model input info:', inputInfo);
            }
            console.log(`🎯 Expected classes: ${this.products.length}`);
            
            // Warm up the model with a dummy prediction
            await this.warmUp();
            
            this.isLoaded = true;
            console.log('✅ ML Model loaded and ready');
            
            return true;
            
        } catch (error) {
            console.error('❌ Failed to load ML model:', error);
            throw new Error(`Model loading failed: ${error.message}`);
        }
    }
    
    async warmUp() {
        if (!this.model) return;
        
        console.log('🔥 Warming up model...');
        
        // Create dummy input tensor
        const dummyInput = tf.zeros([1, ...this.inputShape]);
        
        try {
            // Run dummy prediction
            const prediction = this.model.predict(dummyInput);
            
            // Clean up tensors
            dummyInput.dispose();
            prediction.dispose();
            
            console.log('✅ Model warmup complete');
            
        } catch (error) {
            dummyInput.dispose();
            console.error('❌ Model warmup failed:', error);
        }
    }
    
    preprocessImage(imageElement) {
        return tf.tidy(() => {
            // Convert image element to tensor
            let tensor = tf.browser.fromPixels(imageElement);
            
            // Resize to model input size
            tensor = tf.image.resizeBilinear(tensor, [this.inputShape[0], this.inputShape[1]]);
            
            // Normalize pixels to [0, 1]
            tensor = tensor.div(255.0);
            
            // Add batch dimension
            tensor = tensor.expandDims(0);
            
            return tensor;
        });
    }
    
    async detectProduct(imageElement) {
        if (!this.isLoaded || !this.model) {
            return {
                success: false,
                reason: 'Model not loaded',
                confidence: 0
            };
        }
        
        let inputTensor = null;
        let prediction = null;
        
        try {
            // Preprocess the image
            inputTensor = this.preprocessImage(imageElement);
            
            // Run prediction
            prediction = this.model.predict(inputTensor);
            
            // Get probabilities
            const probabilities = await prediction.data();
            
            // Find the highest probability
            const maxIndex = prediction.argMax(-1).dataSync()[0];
            const confidence = probabilities[maxIndex];
            const productName = this.products[maxIndex];
            
            // Debug logging (only for successful detections above threshold)
            if (confidence >= this.confidenceThreshold) {
                console.log(`🔍 Detection: ${productName} (${(confidence * 100).toFixed(1)}%) - All: [${Array.from(probabilities).map(p => (p * 100).toFixed(1)).join(', ')}]`);
            }
            
            // Check if product is disabled
            if (productName === 'iqos-iluma-prime') {
                return {
                    success: false,
                    reason: 'Product disabled',
                    confidence: confidence,
                    topPrediction: productName,
                    allProbabilities: Array.from(probabilities)
                };
            }
            
            // Check confidence threshold
            if (confidence >= this.confidenceThreshold) {
                return {
                    success: true,
                    product: productName,
                    confidence: confidence,
                    allProbabilities: Array.from(probabilities),
                    processingTime: Date.now()
                };
            } else {
                return {
                    success: false,
                    reason: 'Low confidence',
                    confidence: confidence,
                    topPrediction: productName,
                    allProbabilities: Array.from(probabilities)
                };
            }
            
        } catch (error) {
            console.error('❌ Detection error:', error);
            return {
                success: false,
                reason: 'Detection failed',
                error: error.message,
                confidence: 0
            };
            
        } finally {
            // Clean up tensors
            if (inputTensor) inputTensor.dispose();
            if (prediction) prediction.dispose();
        }
    }
    
    async getAllPredictions(imageElement) {
        if (!this.isLoaded || !this.model) {
            throw new Error('Model not loaded');
        }
        
        let inputTensor = null;
        let prediction = null;
        
        try {
            inputTensor = this.preprocessImage(imageElement);
            prediction = this.model.predict(inputTensor);
            
            const probabilities = await prediction.data();
            
            // Return all predictions sorted by confidence
            const results = this.products.map((product, index) => ({
                product,
                confidence: probabilities[index]
            })).sort((a, b) => b.confidence - a.confidence);
            
            return results;
            
        } finally {
            if (inputTensor) inputTensor.dispose();
            if (prediction) prediction.dispose();
        }
    }
    
    setConfidenceThreshold(threshold) {
        this.confidenceThreshold = Math.max(0, Math.min(1, threshold));
        console.log(`🎯 Confidence threshold set to: ${this.confidenceThreshold}`);
    }
    
    getConfidenceThreshold() {
        return this.confidenceThreshold;
    }
    
    getProducts() {
        return [...this.products];
    }
    
    getModelInfo() {
        if (!this.model) return null;
        
        const info = {
            loaded: this.isLoaded,
            backend: tf.getBackend(),
            confidenceThreshold: this.confidenceThreshold,
            products: this.products,
            config: this.modelConfig
        };
        
        // Add signature info for GraphModel
        if (this.model.modelSignature) {
            info.signature = this.model.modelSignature;
        }
        
        return info;
    }
    
    // Memory management
    getMemoryInfo() {
        return tf.memory();
    }
    
    disposeModel() {
        if (this.model) {
            this.model.dispose();
            this.model = null;
            this.isLoaded = false;
            console.log('🧹 ML Model disposed');
        }
    }
    
    // Performance monitoring
    enableProfiling() {
        tf.enableProdMode();
    }
    
    async benchmark(iterations = 10) {
        if (!this.isLoaded) {
            throw new Error('Model not loaded');
        }
        
        console.log(`⏱️  Running benchmark (${iterations} iterations)...`);
        
        // Create test input
        const testInput = tf.zeros([1, ...this.inputShape]);
        const times = [];
        
        try {
            for (let i = 0; i < iterations; i++) {
                const startTime = performance.now();
                
                const prediction = this.model.predict(testInput);
                await prediction.data(); // Wait for completion
                prediction.dispose();
                
                const endTime = performance.now();
                times.push(endTime - startTime);
            }
            
            const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
            const minTime = Math.min(...times);
            const maxTime = Math.max(...times);
            
            console.log(`📊 Benchmark results:`);
            console.log(`   Average: ${avgTime.toFixed(2)}ms`);
            console.log(`   Min: ${minTime.toFixed(2)}ms`);
            console.log(`   Max: ${maxTime.toFixed(2)}ms`);
            
            return {
                average: avgTime,
                min: minTime,
                max: maxTime,
                iterations: iterations
            };
            
        } finally {
            testInput.dispose();
        }
    }
}