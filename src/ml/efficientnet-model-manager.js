/**
 * EfficientNet Model Manager
 * Handles TensorFlow.js EfficientNet model loading and inference
 */

import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import { BaseModelManager } from './base-model-manager.js';

export class EfficientNetModelManager extends BaseModelManager {
    constructor() {
        const modelConfig = {
            name: 'EfficientNet-Lite',
            type: 'efficientnet',
            url: `./efficientnet-model/model.json?v=${Date.now()}`,
            confidenceThreshold: 0.4, // Slightly higher for EfficientNet
            inputShape: [224, 224, 3]
        };
        
        super(modelConfig);
    }
    
    async loadModel(modelUrl = null) {
        try {
            const url = modelUrl || this.modelUrl;
            console.log(`📥 Loading ${this.modelName} model...`);
            
            // Ensure WebGL backend is ready
            await tf.ready();
            console.log(`🔧 TensorFlow.js backend: ${tf.getBackend()}`);
            
            // Load the EfficientNet model
            this.model = await tf.loadGraphModel(url);
            
            // Load model metadata if available
            try {
                const metadataResponse = await fetch(`./efficientnet-model/model_metadata.json?v=${Date.now()}`);
                if (metadataResponse.ok) {
                    this.modelConfig = await metadataResponse.json();
                    console.log(`📄 ${this.modelName} metadata loaded`);
                }
            } catch (error) {
                console.log(`⚠️  ${this.modelName} metadata not found, using defaults`);
            }
            
            // Get model signature and input info
            const signature = this.model.modelSignature || {};
            const inputInfo = signature.inputs ? Object.values(signature.inputs)[0] : null;
            
            console.log(`📊 ${this.modelName} signature:`, signature);
            console.log(`📊 ${this.modelName} input info:`, inputInfo);
            
            if (inputInfo && inputInfo.tensorShape) {
                const shape = inputInfo.tensorShape.dim;
                console.log(`🎯 Expected classes: ${shape[shape.length - 1] || 'unknown'}`);
            }
            
            // Warm up the model
            console.log(`🔥 Warming up ${this.modelName}...`);
            const warmupTensor = tf.zeros([1, ...this.inputShape]);
            const warmupPrediction = this.model.predict(warmupTensor);
            warmupTensor.dispose();
            warmupPrediction.dispose();
            console.log(`✅ ${this.modelName} warmup complete`);
            
            this.isLoaded = true;
            console.log(`✅ ${this.modelName} loaded and ready`);
            
        } catch (error) {
            console.error(`❌ Failed to load ${this.modelName}:`, error);
            throw error;
        }
    }
    
    async detectProduct(imageElement) {
        if (!this.isLoaded || !this.model) {
            return {
                success: false,
                reason: `${this.modelName} not loaded`,
                confidence: 0
            };
        }
        
        let inputTensor = null;
        let prediction = null;
        
        try {
            // Preprocess the image
            inputTensor = this.preprocessImage(imageElement);
            
            // Run inference
            prediction = this.model.predict(inputTensor);
            
            // Get probabilities
            const probabilities = prediction.dataSync();
            
            // Find the highest probability
            const maxIndex = prediction.argMax(-1).dataSync()[0];
            const confidence = probabilities[maxIndex];
            const productName = this.products[maxIndex];
            
            // Debug logging (only for successful detections above threshold)
            if (confidence >= this.confidenceThreshold) {
                console.log(`🔍 ${this.modelName} Detection: ${productName} (${(confidence * 100).toFixed(1)}%) - All: [${Array.from(probabilities).map(p => (p * 100).toFixed(1)).join(', ')}]`);
            }
            
            return this.postprocessPrediction(prediction);
            
        } catch (error) {
            console.error(`❌ ${this.modelName} detection error:`, error);
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
    
    // EfficientNet-specific preprocessing (if needed)
    preprocessImage(imageElement) {
        // EfficientNet typically uses different normalization
        const tensor = tf.browser.fromPixels(imageElement)
            .resizeNearestNeighbor([this.inputShape[0], this.inputShape[1]])
            .cast('float32');
            
        // EfficientNet normalization: (pixel - mean) / std
        // Using ImageNet stats: mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]
        const normalized = tensor
            .div(255.0)  // Scale to [0,1]
            .sub([0.485, 0.456, 0.406])  // Subtract mean
            .div([0.229, 0.224, 0.225])  // Divide by std
            .expandDims(0);
            
        tensor.dispose();
        return normalized;
    }
    
    // Enhanced model info for EfficientNet
    getModelInfo() {
        const baseInfo = super.getModelInfo();
        return {
            ...baseInfo,
            architecture: 'EfficientNet-Lite-B0',
            framework: 'TensorFlow.js',
            optimization: 'WebGL',
            normalization: 'ImageNet (mean/std)'
        };
    }
}