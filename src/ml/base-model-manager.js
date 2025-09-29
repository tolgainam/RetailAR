/**
 * Base Model Manager - Abstract class for ML models
 * Provides common interface for different model architectures
 */

export class BaseModelManager {
    constructor(modelConfig) {
        this.modelName = modelConfig.name;
        this.modelType = modelConfig.type;
        this.modelUrl = modelConfig.url;
        this.confidenceThreshold = modelConfig.confidenceThreshold || 0.3;
        this.inputShape = modelConfig.inputShape || [224, 224, 3];
        
        this.products = [
            'zyn-apple-mint',
            'zyn-spearmint', 
            'terea-yellow',
            'terea-sienna'
            // 'iqos-iluma-prime' - DISABLED
        ];
        
        this.model = null;
        this.isLoaded = false;
        this.modelConfig = null;
        
        console.log(`🤖 ${this.modelName} Model Manager initialized`);
    }
    
    async loadModel() {
        throw new Error('loadModel must be implemented by subclass');
    }
    
    async detectProduct(imageElement) {
        throw new Error('detectProduct must be implemented by subclass');
    }
    
    // Common preprocessing method
    preprocessImage(imageElement) {
        const tensor = tf.browser.fromPixels(imageElement)
            .resizeNearestNeighbor([this.inputShape[0], this.inputShape[1]])
            .cast('float32')
            .div(255.0)
            .expandDims(0);
        
        return tensor;
    }
    
    // Common postprocessing method
    postprocessPrediction(prediction) {
        const probabilities = prediction.dataSync();
        const maxIndex = prediction.argMax(-1).dataSync()[0];
        const confidence = probabilities[maxIndex];
        const productName = this.products[maxIndex];
        
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
                processingTime: Date.now(),
                modelType: this.modelType
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
    }
    
    setConfidenceThreshold(threshold) {
        this.confidenceThreshold = Math.max(0, Math.min(1, threshold));
        console.log(`🎯 ${this.modelName} confidence threshold set to: ${this.confidenceThreshold}`);
    }
    
    getConfidenceThreshold() {
        return this.confidenceThreshold;
    }
    
    getModelInfo() {
        return {
            name: this.modelName,
            type: this.modelType,
            loaded: this.isLoaded,
            confidenceThreshold: this.confidenceThreshold,
            inputShape: this.inputShape,
            products: this.products
        };
    }
    
    dispose() {
        if (this.model) {
            this.model.dispose();
            this.model = null;
            this.isLoaded = false;
            console.log(`🗑️ ${this.modelName} model disposed`);
        }
    }
}