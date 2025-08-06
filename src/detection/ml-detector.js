/**
 * Machine Learning Product Detector using TensorFlow.js
 * Handles training and inference for product recognition
 */

import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';

export class MLDetector {
    constructor() {
        this.model = null;
        this.isInitialized = false;
        this.isTraining = false;
        this.productLabels = [];
        this.imageSize = [224, 224]; // Standard input size
        this.trainingData = new Map();
    }
    
    /**
     * Initialize TensorFlow.js and backend
     */
    async init() {
        if (this.isInitialized) return;
        
        try {
            // Set backend to WebGL for better performance
            await tf.setBackend('webgl');
            await tf.ready();
            
            this.isInitialized = true;
            console.log('ML Detector initialized with backend:', tf.getBackend());
            
        } catch (error) {
            console.error('Failed to initialize ML detector:', error);
            throw error;
        }
    }
    
    /**
     * Create and compile CNN model for product classification
     */
    createModel(numClasses) {
        const model = tf.sequential({
            layers: [
                // Convolutional layers
                tf.layers.conv2d({
                    filters: 32,
                    kernelSize: 3,
                    activation: 'relu',
                    inputShape: [this.imageSize[0], this.imageSize[1], 3]
                }),
                tf.layers.maxPooling2d({ poolSize: 2 }),
                
                tf.layers.conv2d({
                    filters: 64,
                    kernelSize: 3,
                    activation: 'relu'
                }),
                tf.layers.maxPooling2d({ poolSize: 2 }),
                
                tf.layers.conv2d({
                    filters: 128,
                    kernelSize: 3,
                    activation: 'relu'
                }),
                tf.layers.maxPooling2d({ poolSize: 2 }),
                
                // Dense layers
                tf.layers.flatten(),
                tf.layers.dropout({ rate: 0.3 }),
                tf.layers.dense({
                    units: 128,
                    activation: 'relu'
                }),
                tf.layers.dropout({ rate: 0.3 }),
                tf.layers.dense({
                    units: numClasses,
                    activation: 'softmax'
                })
            ]
        });
        
        model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'categoricalCrossentropy',
            metrics: ['accuracy']
        });
        
        return model;
    }
    
    /**
     * Load training images for all products
     */
    async loadTrainingData(productConfigs) {
        if (!this.isInitialized) await this.init();
        
        this.productLabels = productConfigs.map(p => p.id);
        console.log('Loading training data for products:', this.productLabels);
        
        for (const product of productConfigs) {
            const productImages = [];
            
            // Load reference images as positive samples
            for (const refImg of product.detection.reference_images) {
                try {
                    const img = await this._loadAndPreprocessImage(refImg.path);
                    if (img) {
                        productImages.push(img);
                        
                        // Data augmentation - create variations
                        const augmented = await this._augmentImage(img);
                        productImages.push(...augmented);
                    }
                } catch (error) {
                    console.error(`Failed to load training image: ${refImg.path}`, error);
                }
            }
            
            // Load additional training data if available
            try {
                const trainingDir = `/assets/products/${product.id}/training-data/`;
                const additionalImages = await this._loadTrainingDirectory(trainingDir);
                productImages.push(...additionalImages);
            } catch (error) {
                console.log(`No additional training data for ${product.id}`);
            }
            
            this.trainingData.set(product.id, productImages);
            console.log(`Loaded ${productImages.length} training images for ${product.id}`);
        }
    }
    
    async _loadAndPreprocessImage(imagePath) {
        try {
            const img = await this._loadImage(imagePath);
            
            // Create canvas and resize image
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = this.imageSize[0];
            canvas.height = this.imageSize[1];
            
            ctx.drawImage(img, 0, 0, this.imageSize[0], this.imageSize[1]);
            
            // Convert to tensor
            const tensor = tf.browser.fromPixels(canvas)
                .expandDims(0)
                .div(255.0); // Normalize to 0-1
            
            return tensor;
            
        } catch (error) {
            console.error('Error preprocessing image:', error);
            return null;
        }
    }
    
    async _augmentImage(imageTensor) {
        const augmented = [];
        
        try {
            // Horizontal flip
            const flipped = tf.image.flipLeftRight(imageTensor);
            augmented.push(flipped);
            
            // Brightness adjustment
            const brightened = tf.image.adjustBrightness(imageTensor, 0.1);
            augmented.push(brightened);
            
            const darkened = tf.image.adjustBrightness(imageTensor, -0.1);
            augmented.push(darkened);
            
            // Contrast adjustment
            const contrasted = tf.image.adjustContrast(imageTensor, 1.2);
            augmented.push(contrasted);
            
            // Rotation (simple 90 degree rotations)
            const rotated90 = tf.image.rot90(imageTensor);
            const rotated180 = tf.image.rot90(rotated90);
            const rotated270 = tf.image.rot90(rotated180);
            
            augmented.push(rotated90, rotated180, rotated270);
            
        } catch (error) {
            console.error('Error during image augmentation:', error);
        }
        
        return augmented;
    }
    
    /**
     * Train the model with loaded data
     */
    async trainModel(epochs = 20, validationSplit = 0.2) {
        if (!this.isInitialized) await this.init();
        if (this.trainingData.size === 0) {
            throw new Error('No training data loaded');
        }
        
        this.isTraining = true;
        console.log('Starting model training...');
        
        try {
            // Prepare training data
            const { xs, ys } = this._prepareTrainingTensors();
            
            // Create model
            this.model = this.createModel(this.productLabels.length);
            
            console.log('Model architecture:');
            this.model.summary();
            
            // Train model
            const history = await this.model.fit(xs, ys, {
                epochs: epochs,
                validationSplit: validationSplit,
                batchSize: 16,
                shuffle: true,
                callbacks: {
                    onEpochEnd: (epoch, logs) => {
                        console.log(`Epoch ${epoch + 1}/${epochs} - loss: ${logs.loss.toFixed(4)} - acc: ${logs.acc.toFixed(4)} - val_loss: ${logs.val_loss.toFixed(4)} - val_acc: ${logs.val_acc.toFixed(4)}`);
                    }
                }
            });
            
            // Cleanup training tensors
            xs.dispose();
            ys.dispose();
            
            console.log('Model training completed');
            this.isTraining = false;
            
            return history;
            
        } catch (error) {
            console.error('Training failed:', error);
            this.isTraining = false;
            throw error;
        }
    }
    
    _prepareTrainingTensors() {
        const allImages = [];
        const allLabels = [];
        
        for (let i = 0; i < this.productLabels.length; i++) {
            const productId = this.productLabels[i];
            const images = this.trainingData.get(productId);
            
            for (const image of images) {
                allImages.push(image);
                
                // One-hot encode labels
                const label = new Array(this.productLabels.length).fill(0);
                label[i] = 1;
                allLabels.push(label);
            }
        }
        
        // Convert to tensors
        const xs = tf.concat(allImages);
        const ys = tf.tensor2d(allLabels);
        
        return { xs, ys };
    }
    
    /**
     * Save trained model
     */
    async saveModel(path = 'indexeddb://retailar-model') {
        if (!this.model) {
            throw new Error('No trained model to save');
        }
        
        try {
            await this.model.save(path);
            console.log(`Model saved to: ${path}`);
        } catch (error) {
            console.error('Failed to save model:', error);
            throw error;
        }
    }
    
    /**
     * Load saved model
     */
    async loadModel(path = 'indexeddb://retailar-model') {
        if (!this.isInitialized) await this.init();
        
        try {
            this.model = await tf.loadLayersModel(path);
            console.log(`Model loaded from: ${path}`);
            return true;
        } catch (error) {
            console.error('Failed to load model:', error);
            return false;
        }
    }
    
    /**
     * Predict product from camera frame
     */
    async predict(imageData) {
        if (!this.model) {
            throw new Error('No model loaded for prediction');
        }
        
        try {
            // Preprocess image
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = this.imageSize[0];
            canvas.height = this.imageSize[1];
            
            ctx.putImageData(imageData, 0, 0);
            
            // Convert to tensor
            const tensor = tf.browser.fromPixels(canvas)
                .expandDims(0)
                .div(255.0);
            
            // Make prediction
            const predictions = await this.model.predict(tensor);
            const probabilities = await predictions.data();
            
            // Find best match
            let bestIndex = 0;
            let bestConfidence = probabilities[0];
            
            for (let i = 1; i < probabilities.length; i++) {
                if (probabilities[i] > bestConfidence) {
                    bestConfidence = probabilities[i];
                    bestIndex = i;
                }
            }
            
            // Cleanup
            tensor.dispose();
            predictions.dispose();
            
            if (bestConfidence > 0.5) { // Confidence threshold
                return {
                    productId: this.productLabels[bestIndex],
                    confidence: bestConfidence,
                    probabilities: Array.from(probabilities)
                };
            }
            
            return null;
            
        } catch (error) {
            console.error('Prediction failed:', error);
            return null;
        }
    }
    
    async _loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }
    
    /**
     * Get model information
     */
    getModelInfo() {
        if (!this.model) return null;
        
        return {
            inputShape: this.model.inputs[0].shape,
            outputShape: this.model.outputs[0].shape,
            parameters: this.model.countParams(),
            labels: this.productLabels
        };
    }
    
    /**
     * Cleanup resources
     */
    cleanup() {
        // Dispose training data
        for (const [productId, images] of this.trainingData) {
            images.forEach(img => {
                if (img && img.dispose) img.dispose();
            });
        }
        this.trainingData.clear();
        
        // Dispose model
        if (this.model) {
            this.model.dispose();
            this.model = null;
        }
        
        this.isInitialized = false;
    }
}