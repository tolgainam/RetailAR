/**
 * Product Detection Manager
 * Coordinates template matching and ML detection with runtime switching
 */

import { SimpleDetector } from './simple-detector.js';
import { TemplateMatcher } from './template-matcher.js';
import { OCRDetector } from './ocr-detector.js';

export class ProductDetector {
    constructor(productLoader) {
        this.productLoader = productLoader;
        this.simpleDetector = new SimpleDetector();
        this.templateMatcher = new TemplateMatcher();
        this.ocrDetector = new OCRDetector();
        
        this.currentMethod = 'simple';
        this.isInitialized = false;
        this.detectionStats = {
            totalDetections: 0,
            successfulDetections: 0,
            averageConfidence: 0,
            methodUsage: {
                simple: 0,
                template: 0,
                ocr: 0,
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
            } else if (this.currentMethod === 'ocr') {
                await this.ocrDetector.init();
            } else if (this.currentMethod === 'hybrid') {
                // Initialize both template matcher and OCR detector for hybrid mode
                await this.templateMatcher.init();
                await this.ocrDetector.init();
            }
            
            // Load reference images and keywords for all products
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
                
                // Load OCR keywords if available
                if ((this.currentMethod === 'ocr' || this.currentMethod === 'hybrid') && product.detection?.keywords) {
                    this.ocrDetector.loadProductKeywords(
                        product.id,
                        product.detection.keywords
                    );
                }
                
                // Load template images for hybrid mode
                if (this.currentMethod === 'hybrid' && product.detection?.reference_images) {
                    await this.templateMatcher.preprocessReferenceImages(
                        product.id, 
                        product.detection.reference_images
                    );
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
        if (!['simple', 'template', 'ocr', 'hybrid'].includes(method)) {
            throw new Error(`Invalid detection method: ${method}. Supported methods: 'simple', 'template', 'ocr', 'hybrid'`);
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
        } else if (method === 'ocr' && !this.ocrDetector.isInitialized) {
            await this.ocrDetector.init();
            for (const product of products) {
                if (product.detection?.keywords) {
                    this.ocrDetector.loadProductKeywords(
                        product.id,
                        product.detection.keywords
                    );
                }
            }
        } else if (method === 'hybrid') {
            // Initialize both detectors for hybrid mode
            if (!this.templateMatcher.isInitialized) {
                await this.templateMatcher.init();
                for (const product of products) {
                    if (product.detection?.reference_images) {
                        await this.templateMatcher.preprocessReferenceImages(
                            product.id, 
                            product.detection.reference_images
                        );
                    }
                }
            }
            if (!this.ocrDetector.isInitialized) {
                await this.ocrDetector.init();
                for (const product of products) {
                    if (product.detection?.keywords) {
                        this.ocrDetector.loadProductKeywords(
                            product.id,
                            product.detection.keywords
                        );
                    }
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
                    
                case 'ocr':
                    result = await this._detectWithOCR(cameraFrame, products);
                    this.detectionStats.methodUsage.ocr++;
                    break;
                    
                case 'hybrid':
                    result = await this._detectWithHybrid(cameraFrame, products);
                    this.detectionStats.methodUsage.hybrid++;
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
    
    async _detectWithOCR(cameraFrame, products) {
        return await this.ocrDetector.detectProducts(cameraFrame, products);
    }
    
    async _detectWithHybrid(cameraFrame, products) {
        console.log('🔀 Starting hybrid detection (Template + OCR)...');
        
        // Run both detection methods in parallel for better performance
        const [templateResult, ocrResult] = await Promise.all([
            this.templateMatcher.matchFrame(cameraFrame, products).catch(e => {
                console.warn('Template matching failed in hybrid mode:', e);
                return null;
            }),
            this.ocrDetector.detectProducts(cameraFrame, products).catch(e => {
                console.warn('OCR detection failed in hybrid mode:', e);
                return null;
            })
        ]);
        
        // Combine results using weighted scoring
        return this._combineHybridResults(templateResult, ocrResult, products);
    }
    
    /**
     * Combine template matching and OCR results into a single result
     */
    _combineHybridResults(templateResult, ocrResult, products) {
        // If no results from either method
        if (!templateResult && !ocrResult) {
            console.log('🔀 Hybrid: No results from either method');
            return null;
        }
        
        // If only one method has results, return that result
        if (templateResult && !ocrResult) {
            console.log('🔀 Hybrid: Only template matching found result');
            templateResult.hybridMethod = 'template-only';
            return templateResult;
        }
        
        if (ocrResult && !templateResult) {
            console.log('🔀 Hybrid: Only OCR found result');
            ocrResult.hybridMethod = 'ocr-only';
            return ocrResult;
        }
        
        // Both methods have results - combine them
        console.log(`🔀 Hybrid: Both methods found results - Template: ${templateResult.productName} (${templateResult.confidence.toFixed(3)}), OCR: ${ocrResult.productName} (${ocrResult.confidence.toFixed(3)})`);
        
        // Check if both methods detected the same product
        if (templateResult.productId === ocrResult.productId) {
            // Same product detected by both methods - boost confidence
            const combinedConfidence = this._calculateCombinedConfidence(
                templateResult.confidence, 
                ocrResult.confidence,
                true // same product bonus
            );
            
            console.log(`✅ Hybrid: Same product detected by both methods! Combined confidence: ${combinedConfidence.toFixed(3)}`);
            
            return {
                ...templateResult,
                confidence: combinedConfidence,
                hybridMethod: 'both-same-product',
                ocrDetails: {
                    confidence: ocrResult.confidence,
                    matchedKeywords: ocrResult.matchedKeywords,
                    detectedText: ocrResult.detectedText
                },
                templateDetails: {
                    confidence: templateResult.confidence,
                    matchDetails: templateResult.matchDetails
                }
            };
        } else {
            // Different products detected - choose the one with higher confidence
            // but apply penalty for conflicting results
            const templatePenalized = templateResult.confidence * 0.8;
            const ocrPenalized = ocrResult.confidence * 0.8;
            
            const bestResult = templatePenalized > ocrPenalized ? templateResult : ocrResult;
            const conflictingResult = templatePenalized > ocrPenalized ? ocrResult : templateResult;
            
            console.log(`⚠️ Hybrid: Different products detected. Choosing ${bestResult.productName} with penalized confidence: ${Math.max(templatePenalized, ocrPenalized).toFixed(3)}`);
            
            return {
                ...bestResult,
                confidence: Math.max(templatePenalized, ocrPenalized),
                hybridMethod: 'conflicting-results',
                conflictingDetection: {
                    productName: conflictingResult.productName,
                    confidence: conflictingResult.confidence
                }
            };
        }
    }
    
    /**
     * Calculate combined confidence score for hybrid detection
     */
    _calculateCombinedConfidence(templateConfidence, ocrConfidence, sameProduct = false) {
        // Weighted average with higher weight on template matching (more reliable for visual products)
        const templateWeight = 0.7;
        const ocrWeight = 0.3;
        
        let combinedScore = (templateConfidence * templateWeight) + (ocrConfidence * ocrWeight);
        
        // Bonus if both methods agree on the same product
        if (sameProduct) {
            const agreementBonus = 0.15;
            combinedScore = Math.min(1.0, combinedScore + agreementBonus);
        }
        
        // Additional boost if both methods are highly confident
        if (templateConfidence > 0.8 && ocrConfidence > 0.6) {
            const highConfidenceBonus = 0.1;
            combinedScore = Math.min(1.0, combinedScore + highConfidenceBonus);
        }
        
        return combinedScore;
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
            templateStats: this.templateMatcher.getStats(),
            ocrStats: this.ocrDetector.getStats()
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
                ocr: 0,
                ml: 0,
                hybrid: 0
            }
        };
    }
    
    /**
     * Cleanup all resources
     */
    async cleanup() {
        this.simpleDetector.cleanup();
        this.templateMatcher.cleanup();
        await this.ocrDetector.cleanup();
        this.isInitialized = false;
    }
}