/**
 * RetailAR - Main Application Entry Point
 * WebAR Product Recognition for IQOS/VEEV/ZYN
 */

import { CameraManager } from './utils/camera-manager.js';
import { ARRenderer } from './ar/ar-renderer.js';
import { UIManager } from './ui/ui-manager.js';
import { ProductConfig } from './config/product-config.js';
import { ModelFactory } from './ml/model-factory.js';

export class RetailARApp {
    constructor(modelType = 'cnn') {
        this.initialized = false;
        this.isDetecting = false;
        this.modelType = modelType;
        
        // Core components
        this.camera = new CameraManager();
        this.model = ModelFactory.createModel(modelType);
        this.renderer = new ARRenderer();
        this.ui = new UIManager();
        this.products = new ProductConfig();
        
        // Detection state
        this.currentProduct = null;
        this.detectionTimeout = null;
        
        // Performance tracking
        this.frameCount = 0;
        this.lastFrameTime = Date.now();
        this.fps = 0;
        
        console.log(`🚀 RetailAR App initialized with ${this.model.modelName} model`);
    }
    
    async initialize() {
        try {
            this.ui.updateLoadingText('Loading ML Model...');
            
            // Initialize ML model
            await this.model.loadModel();
            console.log('✅ ML Model loaded');
            
            this.ui.updateLoadingText('Starting camera...');
            
            // Initialize camera
            await this.camera.initialize();
            console.log('✅ Camera initialized');
            
            this.ui.updateLoadingText('Setting up AR renderer...');
            
            // Initialize AR renderer
            await this.renderer.initialize();
            console.log('✅ AR Renderer initialized');
            
            // Load product configurations
            await this.products.loadConfigs();
            console.log('✅ Product configurations loaded');
            
            // Mark as initialized before starting detection loop
            this.initialized = true;
            
            // Start the main loop
            this.startDetectionLoop();
            
            // Hide loading screen
            this.ui.hideLoadingScreen();
            
            console.log('🎉 RetailAR App ready!');
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            this.ui.showError('Failed to initialize app. Please check camera permissions.');
        }
    }
    
    startDetectionLoop() {
        console.log('🔄 Starting detection loop...');
        const detectFrame = async () => {
            if (!this.initialized) return;
            
            try {
                // Update FPS counter
                this.updateFPS();
                
                // Get current video frame
                const videoElement = this.camera.getVideoElement();
                
                if (videoElement && videoElement.readyState === 4) {
                    // Run product detection
                    const result = await this.model.detectProduct(videoElement);

                    // Log only successful detections to reduce spam
                    if (result.success) {
                        console.log(`🔍 Detection: ${result.product} (${(result.confidence * 100).toFixed(1)}%)`);
                        console.log('✅ Product detected, calling handler...');
                        this.handleProductDetection(result);
                    } else {
                        this.handleNoDetection();
                    }

                    // Update debug info
                    this.ui.updateDebugInfo({
                        fps: this.fps,
                        detection: result.success ? result.product : 'None',
                        confidence: result.confidence ? `${(result.confidence * 100).toFixed(1)}%` : '0%'
                    });
                } else {
                    // Only log video issues occasionally to reduce spam
                    if (this.frameCount % 120 === 0) { // Every 2 seconds at 60fps
                        console.log('⚠️ Video element not ready or not available');
                    }
                    // Update debug info to show video not ready
                    this.ui.updateDebugInfo({
                        fps: this.fps,
                        detection: 'Video not ready',
                        confidence: '0%'
                    });
                }
                
            } catch (error) {
                console.error('Detection loop error:', error);
            }
            
            // Schedule next frame
            requestAnimationFrame(detectFrame);
        };
        
        detectFrame();
    }
    
    handleProductDetection(result) {
        const productId = result.product;
        const confidence = result.confidence;
        
        console.log(`🎯 handleProductDetection called: ${productId} (${(confidence * 100).toFixed(1)}%)`);
        
        // Clear any existing timeout
        if (this.detectionTimeout) {
            clearTimeout(this.detectionTimeout);
        }
        
        // Check if this is a new product detection
        const isNewProduct = this.currentProduct !== productId;
        const hasReasonableConfidence = confidence > 0.1; // Very low threshold for troubleshooting
        
        console.log(`🔄 Checking conditions: current=${this.currentProduct}, detected=${productId}, confidence=${(confidence * 100).toFixed(1)}%`);
        console.log(`🔄 New product? ${isNewProduct}, Reasonable confidence? ${hasReasonableConfidence}`);
        
        // Show product if it's new OR if we haven't shown it yet with reasonable confidence
        if (isNewProduct && hasReasonableConfidence) {
            console.log(`📱 Showing product: ${productId} (current: ${this.currentProduct})`);
            this.currentProduct = productId;
            
            // Get product configuration
            const productConfig = this.products.getProduct(productId);
            
            if (productConfig) {
                console.log(`🎨 Calling UI.showProductInfo for: ${productConfig.name}`);
                // Update UI with product information
                this.ui.showProductInfo(productConfig);
                
                console.log(`🖼️  Calling renderer.showProductVisualization for: ${productConfig.name}`);
                // Update 3D renderer with product
                this.renderer.showProductVisualization(productConfig);
                
                console.log(`🎯 Detected: ${productConfig.name} (${(confidence * 100).toFixed(1)}%)`);
            } else {
                console.error(`❌ No product config found for: ${productId}`);
            }
        } else if (!isNewProduct) {
            // Same product, just reset the timeout without re-showing
            console.log(`🔄 Same product continuing: ${productId}`);
        }
        
        // Set timeout to hide product if not detected for a while
        this.detectionTimeout = setTimeout(() => {
            this.handleNoDetection();
        }, 1500); // Hide after 1.5 seconds of no detection
    }
    
    handleNoDetection() {
        if (this.currentProduct) {
            this.currentProduct = null;
            
            // Hide UI
            this.ui.hideProductInfo();
            
            // Hide 3D visualization
            this.renderer.hideProductVisualization();
            
            console.log('🔍 No product detected');
        }
    }
    
    updateFPS() {
        this.frameCount++;
        const now = Date.now();
        
        if (now - this.lastFrameTime >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFrameTime));
            this.frameCount = 0;
            this.lastFrameTime = now;
        }
    }
    
    // Handle visibility change (tab switching)
    handleVisibilityChange() {
        if (document.hidden) {
            // Pause detection when tab is not visible
            this.isDetecting = false;
        } else {
            // Resume detection when tab becomes visible
            this.isDetecting = true;
        }
    }
    
    // Cleanup resources
    destroy() {
        if (this.detectionTimeout) {
            clearTimeout(this.detectionTimeout);
        }
        
        this.camera.destroy();
        this.renderer.destroy();
        
        console.log('🧹 RetailAR App cleaned up');
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const app = new RetailARApp();
    
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
        app.handleVisibilityChange();
    });
    
    // Handle page unload
    window.addEventListener('beforeunload', () => {
        app.destroy();
    });
    
    // Start the app
    await app.initialize();
    
    // Make app globally available for debugging
    window.retailAR = app;
});

export default RetailARApp;