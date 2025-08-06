/**
 * RetailAR Main Bundle - No ES6 modules
 * Self-contained version with all functionality
 */

(function() {
    'use strict';

    // Check dependencies
    if (typeof THREE === 'undefined') {
        console.error('THREE.js not loaded');
        return;
    }
    if (typeof QrScanner === 'undefined') {
        console.error('QrScanner not loaded');
        return;
    }

    // Simple Product Detector
    class SimpleDetector {
        constructor() {
            this.referenceImages = new Map();
            this.isInitialized = false;
            this.canvas = document.createElement('canvas');
            this.ctx = this.canvas.getContext('2d');
            this.detectionThreshold = 0.6;
            this.sampleSize = 32;
        }
        
        async init() {
            if (this.isInitialized) return;
            this.isInitialized = true;
            console.log('Simple detector initialized');
        }
        
        async loadReferenceImages(productId, referenceImageConfigs) {
            const productRefs = [];
            
            for (const refConfig of referenceImageConfigs) {
                try {
                    const imageData = await this._loadImageData(refConfig.path);
                    const signature = this._createImageSignature(imageData);
                    
                    productRefs.push({
                        id: refConfig.id,
                        weight: refConfig.weight,
                        signature: signature,
                        colorProfile: this._createColorProfile(imageData),
                        edgeProfile: this._createEdgeProfile(imageData)
                    });
                    
                } catch (error) {
                    console.error(`Failed to load reference image: ${refConfig.path}`, error);
                }
            }
            
            this.referenceImages.set(productId, productRefs);
            console.log(`Loaded ${productRefs.length} reference images for ${productId}`);
            
            return productRefs.length > 0;
        }
        
        async detectProducts(cameraFrame, productConfigs) {
            if (!this.isInitialized) await this.init();
            
            try {
                const analysisData = this._prepareFrameForAnalysis(cameraFrame);
                const frameSignature = this._createImageSignature(analysisData);
                const frameColorProfile = this._createColorProfile(analysisData);
                const frameEdgeProfile = this._createEdgeProfile(analysisData);
                
                let bestMatch = null;
                let bestConfidence = 0;
                
                for (const product of productConfigs) {
                    const productRefs = this.referenceImages.get(product.id);
                    if (!productRefs) continue;
                    
                    const confidence = this._matchProduct(
                        frameSignature,
                        frameColorProfile, 
                        frameEdgeProfile,
                        productRefs
                    );
                    
                    if (confidence > bestConfidence && confidence > product.detection.confidence_threshold) {
                        bestMatch = {
                            productId: product.id,
                            productName: product.name,
                            confidence: confidence,
                            type: product.type,
                            detectionMethod: 'simple'
                        };
                        bestConfidence = confidence;
                    }
                }
                
                return bestMatch;
                
            } catch (error) {
                console.error('Simple detection failed:', error);
                return null;
            }
        }
        
        async _loadImageData(imagePath) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    this.canvas.width = this.sampleSize;
                    this.canvas.height = this.sampleSize;
                    this.ctx.drawImage(img, 0, 0, this.sampleSize, this.sampleSize);
                    const imageData = this.ctx.getImageData(0, 0, this.sampleSize, this.sampleSize);
                    resolve(imageData);
                };
                img.onerror = reject;
                img.src = imagePath;
            });
        }
        
        _prepareFrameForAnalysis(cameraFrame) {
            this.canvas.width = this.sampleSize;
            this.canvas.height = this.sampleSize;
            
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            tempCanvas.width = cameraFrame.width;
            tempCanvas.height = cameraFrame.height;
            tempCtx.putImageData(cameraFrame, 0, 0);
            
            this.ctx.drawImage(tempCanvas, 0, 0, this.sampleSize, this.sampleSize);
            return this.ctx.getImageData(0, 0, this.sampleSize, this.sampleSize);
        }
        
        _createImageSignature(imageData) {
            const data = imageData.data;
            const signature = [];
            
            const blockSize = 4;
            const blocksPerRow = this.sampleSize / blockSize;
            
            for (let y = 0; y < blocksPerRow; y++) {
                for (let x = 0; x < blocksPerRow; x++) {
                    let totalBrightness = 0;
                    let pixelCount = 0;
                    
                    for (let by = 0; by < blockSize; by++) {
                        for (let bx = 0; bx < blockSize; bx++) {
                            const px = x * blockSize + bx;
                            const py = y * blockSize + by;
                            const idx = (py * this.sampleSize + px) * 4;
                            
                            if (idx < data.length) {
                                const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                                totalBrightness += brightness;
                                pixelCount++;
                            }
                        }
                    }
                    
                    signature.push(pixelCount > 0 ? totalBrightness / pixelCount : 0);
                }
            }
            
            return signature;
        }
        
        _createColorProfile(imageData) {
            const data = imageData.data;
            const profile = {
                r: 0, g: 0, b: 0,
                dominant: { r: 0, g: 0, b: 0 },
                variance: 0
            };
            
            let rTotal = 0, gTotal = 0, bTotal = 0;
            const pixelCount = data.length / 4;
            
            for (let i = 0; i < data.length; i += 4) {
                rTotal += data[i];
                gTotal += data[i + 1];
                bTotal += data[i + 2];
            }
            
            profile.r = rTotal / pixelCount;
            profile.g = gTotal / pixelCount;
            profile.b = bTotal / pixelCount;
            
            return profile;
        }
        
        _createEdgeProfile(imageData) {
            const data = imageData.data;
            const edges = [];
            
            for (let y = 1; y < this.sampleSize - 1; y++) {
                for (let x = 1; x < this.sampleSize - 1; x++) {
                    const idx = (y * this.sampleSize + x) * 4;
                    const rightIdx = (y * this.sampleSize + x + 1) * 4;
                    const bottomIdx = ((y + 1) * this.sampleSize + x) * 4;
                    
                    if (idx < data.length && rightIdx < data.length && bottomIdx < data.length) {
                        const current = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                        const right = (data[rightIdx] + data[rightIdx + 1] + data[rightIdx + 2]) / 3;
                        const bottom = (data[bottomIdx] + data[bottomIdx + 1] + data[bottomIdx + 2]) / 3;
                        
                        const edgeStrength = Math.abs(current - right) + Math.abs(current - bottom);
                        edges.push(edgeStrength);
                    }
                }
            }
            
            return {
                edges: edges,
                averageEdge: edges.length > 0 ? edges.reduce((a, b) => a + b) / edges.length : 0,
                maxEdge: edges.length > 0 ? Math.max(...edges) : 0
            };
        }
        
        _matchProduct(frameSignature, frameColorProfile, frameEdgeProfile, productRefs) {
            let totalScore = 0;
            let weightSum = 0;
            
            for (const ref of productRefs) {
                const signatureScore = this._compareSignatures(frameSignature, ref.signature);
                const colorScore = this._compareColorProfiles(frameColorProfile, ref.colorProfile);
                const edgeScore = this._compareEdgeProfiles(frameEdgeProfile, ref.edgeProfile);
                
                const combinedScore = (signatureScore * 0.5 + colorScore * 0.3 + edgeScore * 0.2) * ref.weight;
                
                totalScore += combinedScore;
                weightSum += ref.weight;
            }
            
            return weightSum > 0 ? totalScore / weightSum : 0;
        }
        
        _compareSignatures(sig1, sig2) {
            if (sig1.length !== sig2.length) return 0;
            
            let similarity = 0;
            const length = sig1.length;
            
            for (let i = 0; i < length; i++) {
                const diff = Math.abs(sig1[i] - sig2[i]);
                similarity += 1 - (diff / 255);
            }
            
            return Math.max(0, similarity / length);
        }
        
        _compareColorProfiles(profile1, profile2) {
            const rDiff = Math.abs(profile1.r - profile2.r) / 255;
            const gDiff = Math.abs(profile1.g - profile2.g) / 255;
            const bDiff = Math.abs(profile1.b - profile2.b) / 255;
            
            const avgDiff = (rDiff + gDiff + bDiff) / 3;
            return Math.max(0, 1 - avgDiff);
        }
        
        _compareEdgeProfiles(edge1, edge2) {
            const avgDiff = Math.abs(edge1.averageEdge - edge2.averageEdge) / 255;
            const maxDiff = Math.abs(edge1.maxEdge - edge2.maxEdge) / 255;
            
            const combinedDiff = (avgDiff + maxDiff) / 2;
            return Math.max(0, 1 - combinedDiff);
        }
        
        getStats() {
            return {
                initialized: this.isInitialized,
                loadedProducts: this.referenceImages.size,
                detectorType: 'Simple Canvas-based',
                sampleSize: this.sampleSize
            };
        }
        
        cleanup() {
            this.referenceImages.clear();
            this.isInitialized = false;
        }
    }

    // Product Loader
    class ProductLoader {
        constructor() {
            this.products = new Map();
            this.appConfig = null;
            this.loadPromise = null;
        }
        
        async init() {
            if (this.loadPromise) {
                return this.loadPromise;
            }
            
            this.loadPromise = this._loadConfigs();
            return this.loadPromise;
        }
        
        async _loadConfigs() {
            try {
                const appConfigResponse = await fetch('/src/config/app-config.json');
                this.appConfig = await appConfigResponse.json();
                
                const productPromises = this.appConfig.supported_products.map(
                    productId => this._loadProductConfig(productId)
                );
                
                await Promise.all(productPromises);
                console.log(`Loaded ${this.products.size} product configurations`);
                
            } catch (error) {
                console.error('Failed to load configurations:', error);
                throw error;
            }
        }
        
        async _loadProductConfig(productId) {
            try {
                const response = await fetch(`/assets/products/${productId}/config.json`);
                if (!response.ok) {
                    throw new Error(`Failed to load config for ${productId}`);
                }
                
                const config = await response.json();
                
                if (!config.detection.method) {
                    config.detection.method = this.appConfig.app_settings.detection_method;
                }
                
                this._resolveAssetPaths(config, productId);
                this.products.set(productId, config);
                
            } catch (error) {
                console.error(`Failed to load product config: ${productId}`, error);
            }
        }
        
        _resolveAssetPaths(config, productId) {
            const basePath = `/assets/products/${productId}`;
            
            config.detection.reference_images.forEach(img => {
                if (!img.path.startsWith('http') && !img.path.startsWith('/assets')) {
                    img.path = `${basePath}/${img.path}`;
                }
            });
            
            if (config.visual['3d_model'] && !config.visual['3d_model'].startsWith('http')) {
                config.visual['3d_model'] = `${basePath}/${config.visual['3d_model']}`;
            }
        }
        
        getProduct(productId) {
            return this.products.get(productId);
        }
        
        getAllProducts() {
            return Array.from(this.products.values());
        }
        
        getAppConfig() {
            return this.appConfig;
        }
        
        setDetectionMethod(method) {
            this.appConfig.app_settings.detection_method = method;
            
            for (const [productId, config] of this.products) {
                if (!config.detection.method_override) {
                    config.detection.method = method;
                }
            }
            
            console.log(`Switched global detection method to: ${method}`);
        }
    }

    // Product Detector
    class ProductDetector {
        constructor(productLoader) {
            this.productLoader = productLoader;
            this.simpleDetector = new SimpleDetector();
            this.currentMethod = 'simple';
            this.isInitialized = false;
        }
        
        async init() {
            if (this.isInitialized) return;
            
            try {
                const appConfig = this.productLoader.getAppConfig();
                this.currentMethod = appConfig.app_settings.detection_method;
                
                await this.simpleDetector.init();
                
                const products = this.productLoader.getAllProducts();
                for (const product of products) {
                    await this.simpleDetector.loadReferenceImages(
                        product.id, 
                        product.detection.reference_images
                    );
                }
                
                this.isInitialized = true;
                console.log(`Product detector initialized with method: ${this.currentMethod}`);
                
            } catch (error) {
                console.error('Failed to initialize product detector:', error);
                throw error;
            }
        }
        
        async detectProducts(cameraFrame) {
            if (!this.isInitialized) await this.init();
            
            try {
                const products = this.productLoader.getAllProducts();
                const result = await this.simpleDetector.detectProducts(cameraFrame, products);
                
                if (result) {
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
        
        async setDetectionMethod(method) {
            this.currentMethod = method;
            this.productLoader.setDetectionMethod(method);
            console.log(`Detection method switched to: ${method}`);
        }
        
        getStats() {
            return {
                currentMethod: this.currentMethod,
                simpleStats: this.simpleDetector.getStats()
            };
        }
        
        cleanup() {
            this.simpleDetector.cleanup();
            this.isInitialized = false;
        }
    }

    // Main RetailAR Application
    class RetailAR {
        constructor() {
            this.qrScanner = null;
            this.productLoader = new ProductLoader();
            this.productDetector = null;
            this.currentMode = 'idle';
            this.detectionInterval = null;
            this.isProcessing = false;
            
            this.init();
        }
        
        async init() {
            try {
                console.log('🚀 Initializing RetailAR Full Version...');
                
                await this.productLoader.init();
                console.log('📦 Product configurations loaded');
                
                this.productDetector = new ProductDetector(this.productLoader);
                console.log('🔍 Detection system initialized');
                
                this.setupEventListeners();
                await this.setupCamera();
                
                console.log('✅ RetailAR Full Version initialized successfully!');
                this.showStatus('RetailAR Ready - Click "Scan Products" to start', 'success');
                
            } catch (error) {
                console.error('❌ Failed to initialize RetailAR:', error);
                this.showError(`Initialization failed: ${error.message}`);
            }
        }
        
        setupEventListeners() {
            document.getElementById('start-qr-scan').addEventListener('click', () => this.startQRScan());
            document.getElementById('start-product-scan').addEventListener('click', () => this.startProductScan());
            document.getElementById('stop-scan').addEventListener('click', () => this.stopScan());
            
            window.closeProductInfo = () => this.closeProductInfo();
            window.switchDetectionMethod = (method) => this.switchDetectionMethod(method);
            window.getDetectionStats = () => this.productDetector?.getStats();
        }
        
        async setupCamera() {
            try {
                const video = document.getElementById('qr-video');
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { 
                        facingMode: 'environment',
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                });
                video.srcObject = stream;
                console.log('📷 Camera initialized');
            } catch (error) {
                console.error('Camera setup failed:', error);
                this.showError('Camera access required for AR functionality');
            }
        }
        
        async startQRScan() {
            if (this.currentMode === 'qr-scanning') return;
            
            this.currentMode = 'qr-scanning';
            const video = document.getElementById('qr-video');
            
            try {
                this.qrScanner = new QrScanner(
                    video,
                    result => this.handleQRCode(result.data),
                    {
                        onDecodeError: () => {},
                        highlightScanRegion: true,
                        highlightCodeOutline: true,
                    }
                );
                
                await this.qrScanner.start();
                this.updateUI('qr-scanning');
                this.showStatus('QR Scanner active - Point camera at QR code', 'info');
                
            } catch (error) {
                console.error('QR Scanner failed to start:', error);
                this.showError('Failed to start QR scanner. Check camera permissions.');
            }
        }
        
        async startProductScan() {
            if (this.currentMode === 'product-scanning') return;
            
            try {
                console.log('🔍 Starting product scanning...');
                this.currentMode = 'product-scanning';
                
                if (!this.productDetector.isInitialized) {
                    await this.productDetector.init();
                }
                
                this.startDetectionLoop();
                this.updateUI('product-scanning');
                this.showStatus('Product scanning active - Point camera at ZYN cans', 'info');
                
            } catch (error) {
                console.error('Failed to start product scanning:', error);
                this.showError('Failed to start product scanning.');
            }
        }
        
        stopScan() {
            console.log('⏹ Stopping scan...');
            this.currentMode = 'idle';
            
            if (this.qrScanner) {
                this.qrScanner.stop();
                this.qrScanner.destroy();
                this.qrScanner = null;
            }
            
            this.stopDetectionLoop();
            this.closeProductInfo();
            this.updateUI('idle');
            this.showStatus('Scanning stopped', 'info');
        }
        
        startDetectionLoop() {
            if (this.detectionInterval) return;
            
            console.log('🔄 Starting detection loop...');
            this.detectionInterval = setInterval(async () => {
                if (this.currentMode !== 'product-scanning' || this.isProcessing) return;
                
                try {
                    this.isProcessing = true;
                    
                    const video = document.getElementById('qr-video');
                    if (video && video.videoWidth > 0) {
                        const frame = this.captureVideoFrame(video);
                        const result = await this.productDetector.detectProducts(frame);
                        
                        if (result) {
                            await this.handleProductDetection(result);
                        }
                    }
                    
                } catch (detectionError) {
                    console.error('Detection loop error:', detectionError);
                } finally {
                    this.isProcessing = false;
                }
            }, 500); // 2 FPS detection
        }
        
        stopDetectionLoop() {
            if (this.detectionInterval) {
                clearInterval(this.detectionInterval);
                this.detectionInterval = null;
            }
        }
        
        captureVideoFrame(video) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            ctx.drawImage(video, 0, 0);
            return ctx.getImageData(0, 0, canvas.width, canvas.height);
        }
        
        async handleProductDetection(result) {
            console.log('🎯 Product detected:', result);
            
            this.showProductInfo(result.productConfig);
            this.showDetectionStats(result);
            
            // Simple AR overlay effect
            this.showSimpleAROverlay(result.productConfig);
            
            // Pause detection briefly
            this.stopDetectionLoop();
            setTimeout(() => {
                if (this.currentMode === 'product-scanning') {
                    this.startDetectionLoop();
                }
            }, 3000);
        }
        
        showSimpleAROverlay(product) {
            // Create a simple overlay effect
            const overlay = document.createElement('div');
            overlay.id = 'simple-ar-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(45deg, ${product.visual.material_overrides.primary_color}, ${product.visual.material_overrides.secondary_color});
                color: white;
                padding: 20px;
                border-radius: 15px;
                z-index: 1000;
                text-align: center;
                box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                animation: arPulse 2s ease-in-out infinite;
            `;
            
            overlay.innerHTML = `
                <h2>${product.name}</h2>
                <p>AR Overlay Active!</p>
                <button onclick="document.getElementById('simple-ar-overlay').remove()" 
                        style="margin-top: 10px; padding: 8px 16px; background: white; color: #333; border: none; border-radius: 5px; cursor: pointer;">
                    Close AR
                </button>
            `;
            
            // Add pulsing animation
            if (!document.querySelector('#ar-animation-style')) {
                const style = document.createElement('style');
                style.id = 'ar-animation-style';
                style.textContent = `
                    @keyframes arPulse {
                        0% { transform: translate(-50%, -50%) scale(1); }
                        50% { transform: translate(-50%, -50%) scale(1.05); }
                        100% { transform: translate(-50%, -50%) scale(1); }
                    }
                `;
                document.head.appendChild(style);
            }
            
            document.body.appendChild(overlay);
            
            // Auto remove after 5 seconds
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.remove();
                }
            }, 5000);
        }
        
        handleQRCode(qrData) {
            console.log('📱 QR Code detected:', qrData);
            
            if (qrData.startsWith('http')) {
                if (confirm(`Open: ${qrData}?`)) {
                    window.open(qrData, '_blank');
                }
            } else {
                this.showStatus(`QR Code: ${qrData}`, 'info');
            }
            
            this.stopScan();
        }
        
        showProductInfo(product) {
            const productInfo = document.getElementById('product-info');
            const title = document.getElementById('product-title');
            const description = document.getElementById('product-description');
            const details = document.getElementById('product-details');
            
            title.textContent = product.name;
            description.textContent = product.info_card.description;
            
            let detailsHTML = '';
            if (product.info_card.details) {
                for (const [key, value] of Object.entries(product.info_card.details)) {
                    detailsHTML += `<div><strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong> ${value}</div>`;
                }
            }
            details.innerHTML = detailsHTML;
            
            if (product.info_card.colors) {
                productInfo.style.background = product.info_card.colors.background;
                productInfo.style.color = product.info_card.colors.text;
            }
            
            productInfo.classList.remove('hidden');
        }
        
        showDetectionStats(result) {
            const stats = document.getElementById('detection-stats');
            if (stats) {
                stats.innerHTML = `
                    <div><strong>Product:</strong> ${result.productName}</div>
                    <div><strong>Confidence:</strong> ${(result.confidence * 100).toFixed(1)}%</div>
                    <div><strong>Method:</strong> ${result.detectionMethod}</div>
                    <div><strong>Type:</strong> ${result.type}</div>
                `;
                stats.classList.remove('hidden');
            }
        }
        
        closeProductInfo() {
            document.getElementById('product-info').classList.add('hidden');
            document.getElementById('detection-stats').classList.add('hidden');
            const overlay = document.getElementById('simple-ar-overlay');
            if (overlay) overlay.remove();
        }
        
        updateUI(mode) {
            const scannerContainer = document.querySelector('.scanner-container');
            const arCanvas = document.getElementById('ar-canvas');
            
            const startQRBtn = document.getElementById('start-qr-scan');
            const startProductBtn = document.getElementById('start-product-scan');
            const stopBtn = document.getElementById('stop-scan');
            
            switch (mode) {
                case 'qr-scanning':
                    scannerContainer.style.display = 'flex';
                    arCanvas.classList.add('hidden');
                    startQRBtn.disabled = true;
                    startProductBtn.disabled = false;
                    stopBtn.disabled = false;
                    break;
                    
                case 'product-scanning':
                    scannerContainer.style.display = 'flex';
                    arCanvas.classList.remove('hidden');
                    startQRBtn.disabled = false;
                    startProductBtn.disabled = true;
                    stopBtn.disabled = false;
                    break;
                    
                case 'idle':
                    scannerContainer.style.display = 'flex';
                    arCanvas.classList.add('hidden');
                    startQRBtn.disabled = false;
                    startProductBtn.disabled = false;
                    stopBtn.disabled = true;
                    break;
            }
            
            this.updateMethodSwitcher();
        }
        
        updateMethodSwitcher() {
            const buttons = document.querySelectorAll('.method-btn');
            const currentMethod = this.productDetector?.currentMethod || 'simple';
            
            buttons.forEach(btn => {
                btn.classList.remove('active');
                if (btn.textContent.toLowerCase() === currentMethod) {
                    btn.classList.add('active');
                }
            });
        }
        
        async switchDetectionMethod(method) {
            if (this.productDetector) {
                try {
                    await this.productDetector.setDetectionMethod(method);
                    this.updateMethodSwitcher();
                    this.showStatus(`Switched to ${method} detection`, 'success');
                } catch (error) {
                    console.error('Failed to switch method:', error);
                    this.showError(`Failed to switch to ${method} detection`);
                }
            }
        }
        
        showStatus(message, type = 'info') {
            console.log(`📊 Status (${type}):`, message);
            
            const existingStatus = document.querySelector('.status-toast');
            if (existingStatus) {
                existingStatus.remove();
            }
            
            const toast = document.createElement('div');
            toast.className = `status-toast ${type}`;
            toast.textContent = message;
            toast.style.cssText = `
                position: fixed;
                top: 80px;
                left: 50%;
                transform: translateX(-50%);
                background: ${type === 'error' ? '#ff4444' : type === 'success' ? '#44ff44' : '#4444ff'};
                color: white;
                padding: 10px 20px;
                border-radius: 5px;
                z-index: 10000;
                font-size: 14px;
            `;
            
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.remove();
            }, 3000);
        }
        
        showError(message) {
            this.showStatus(message, 'error');
        }
    }

    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            const app = new RetailAR();
            window.retailAR = app;
            
        } catch (error) {
            console.error('❌ Failed to initialize RetailAR:', error);
            document.body.innerHTML = `
                <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: #333; color: white; text-align: center; padding: 20px;">
                    <div>
                        <h1>🚨 Initialization Error</h1>
                        <p>Failed to start RetailAR: ${error.message}</p>
                        <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; font-size: 16px;">Reload Page</button>
                    </div>
                </div>
            `;
        }
    });

})();