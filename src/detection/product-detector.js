/**
 * Product Detection Manager
 * Coordinates template matching and ML detection with runtime switching
 */

import { SimpleDetector } from './simple-detector.js';
import { TemplateMatcher } from './template-matcher.js';

export class ProductDetector {
    constructor(productLoader) {
        this.productLoader = productLoader;
        this.simpleDetector = new SimpleDetector();
        this.templateMatcher = new TemplateMatcher();
        
        this.currentMethod = 'simple';
        this.isInitialized = false;
        this.detectionStats = {
            totalDetections: 0,
            successfulDetections: 0,
            averageConfidence: 0,
            methodUsage: {
                simple: 0,
                template: 0,
                ml: 0,
                hybrid: 0
            }
        };
    }
    
    /**
     * Initialize detection systems
     */
    async init() {
        if (this.isInitialized) return;
        
        try {
            const appConfig = this.productLoader.getAppConfig();
            this.currentMethod = appConfig?.app_settings?.detection_method || 'simple';
            
            // Initialize detectors based on method
            if (this.currentMethod === 'simple') {
                await this.simpleDetector.init();
            } else if (this.currentMethod === 'template') {
                await this.templateMatcher.init();
            }
            
            // Load reference images for all products
            const products = this.productLoader.getAllProducts();
            for (const product of products) {
                if (product.detection?.reference_images) {
                    if (this.currentMethod === 'simple') {
                        await this.simpleDetector.loadReferenceImages(
                            product.id, 
                            product.detection.reference_images
                        );
                    } else if (this.currentMethod === 'template') {
                        await this.templateMatcher.preprocessReferenceImages(
                            product.id, 
                            product.detection.reference_images
                        );
                    }
                }
            }
            
            this.isInitialized = true;
            console.log(`Product detector initialized with method: ${this.currentMethod}`);
            
        } catch (error) {
            console.error('Failed to initialize product detector:', error);
            throw error;
        }
    }
    
    /**
     * Switch detection method at runtime
     */
    async setDetectionMethod(method) {
        if (!['simple', 'template'].includes(method)) {
            throw new Error(`Invalid detection method: ${method}. Supported methods: 'simple', 'template'`);
        }
        
        this.currentMethod = method;
        this.productLoader.setDetectionMethod(method);
        
        // Initialize the new method if needed
        const products = this.productLoader.getAllProducts();
        
        if (method === 'template' && !this.templateMatcher.isInitialized) {
            await this.templateMatcher.init();
            for (const product of products) {
                if (product.detection?.reference_images) {
                    await this.templateMatcher.preprocessReferenceImages(
                        product.id, 
                        product.detection.reference_images
                    );
                }
            }
        } else if (method === 'simple' && !this.simpleDetector.isInitialized) {
            await this.simpleDetector.init();
            for (const product of products) {
                if (product.detection?.reference_images) {
                    await this.simpleDetector.loadReferenceImages(
                        product.id, 
                        product.detection.reference_images
                    );
                }
            }
        }
        
        console.log(`Detection method switched to: ${method}`);
    }
    
    /**
     * Detect products in camera frame
     */
    async detectProducts(cameraFrame) {
        if (!this.isInitialized) await this.init();
        
        this.detectionStats.totalDetections++;
        
        try {
            let result = null;
            const products = this.productLoader.getAllProducts();
            
            switch (this.currentMethod) {
                case 'simple':
                    result = await this._detectWithSimple(cameraFrame, products);
                    this.detectionStats.methodUsage.simple++;
                    break;
                    
                case 'template':
                    result = await this._detectWithTemplate(cameraFrame, products);
                    this.detectionStats.methodUsage.template++;
                    break;
                    
                default:
                    result = await this._detectWithSimple(cameraFrame, products);
                    this.detectionStats.methodUsage.simple++;
                    break;
            }
            
            if (result) {
                this.detectionStats.successfulDetections++;
                this._updateAverageConfidence(result.confidence);
                
                // Add detection metadata
                result.detectionMethod = this.currentMethod;
                result.timestamp = Date.now();
                result.productConfig = this.productLoader.getProduct(result.productId);
            }
            
            return result;
            
        } catch (error) {
            console.error('Product detection failed:', error);
            return null;
        }
    }
    
    async _detectWithSimple(cameraFrame, products) {
        return await this.simpleDetector.detectProducts(cameraFrame, products);
    }
    
    async _detectWithTemplate(cameraFrame, products) {
        return await this.templateMatcher.matchFrame(cameraFrame, products);
    }
    
    /**
     * Train ML model with current product configurations
     * Currently not implemented for simple detector
     */
    async trainMLModel(epochs = 20) {
        console.warn('ML training not implemented for simple detector');
        return null;
    }
    
    /**
     * Validate detection accuracy with test images
     */
    async validateDetection(testImages) {
        const results = [];
        
        for (const testImg of testImages) {
            try {
                const img = await this._loadImageAsImageData(testImg.path);
                const result = await this.detectProducts(img);
                
                results.push({
                    expectedProduct: testImg.expectedProduct,
                    detectedProduct: result ? result.productId : null,
                    confidence: result ? result.confidence : 0,
                    correct: result ? result.productId === testImg.expectedProduct : false
                });
                
            } catch (error) {
                console.error(`Failed to test image: ${testImg.path}`, error);
                results.push({
                    expectedProduct: testImg.expectedProduct,
                    detectedProduct: null,
                    confidence: 0,
                    correct: false,
                    error: error.message
                });
            }
        }
        
        // Calculate accuracy metrics
        const correct = results.filter(r => r.correct).length;
        const accuracy = correct / results.length;
        const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
        
        return {
            accuracy,
            avgConfidence,
            totalTests: results.length,
            correctPredictions: correct,
            results
        };
    }
    
    async _loadImageAsImageData(imagePath) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, img.width, img.height);
                resolve(imageData);
            };
            img.onerror = reject;
            img.src = imagePath;
        });
    }
    
    _updateAverageConfidence(newConfidence) {
        const total = this.detectionStats.successfulDetections;
        const current = this.detectionStats.averageConfidence;
        this.detectionStats.averageConfidence = ((current * (total - 1)) + newConfidence) / total;
    }
    
    /**
     * Get detection statistics
     */
    getStats() {
        const successRate = this.detectionStats.totalDetections > 0 ? 
            (this.detectionStats.successfulDetections / this.detectionStats.totalDetections) * 100 : 0;
        
        return {
            ...this.detectionStats,
            successRate: successRate.toFixed(1) + '%',
            currentMethod: this.currentMethod,
            simpleStats: this.simpleDetector.getStats(),
            templateStats: this.templateMatcher.getStats()
        };
    }
    
    /**
     * Reset detection statistics
     */
    resetStats() {
        this.detectionStats = {
            totalDetections: 0,
            successfulDetections: 0,
            averageConfidence: 0,
            methodUsage: {
                simple: 0,
                template: 0,
                ml: 0,
                hybrid: 0
            }
        };
    }
    
    /**
     * Cleanup all resources
     */
    cleanup() {
        this.simpleDetector.cleanup();
        this.templateMatcher.cleanup();
        this.isInitialized = false;
    }
}