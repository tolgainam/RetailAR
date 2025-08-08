
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
