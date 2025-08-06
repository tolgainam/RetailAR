/**
 * RetailAR Main Application
 * Full-featured AR product recognition system
 */

// Import dependencies
import QrScanner from 'qr-scanner';
import * as THREE from 'three';

// Import local modules
import { ProductLoader } from './config/product-loader.js';
import { ProductDetector } from './detection/product-detector.js';
import { ARRenderer } from './ar/ar-renderer.js';
import { VirtualButtons } from './ar/virtual-buttons.js';

class RetailAR {
    constructor() {
        this.qrScanner = null;
        this.productLoader = new ProductLoader();
        this.productDetector = null;
        this.arRenderer = null;
        this.virtualButtons = null;
        
        this.currentMode = 'idle'; // 'idle', 'qr-scanning', 'product-scanning'
        this.detectionInterval = null;
        this.isProcessing = false;
        
        this.init();
    }
    
    async init() {
        try {
            console.log('🚀 Initializing RetailAR Full Version...');
            
            // Wait for OpenCV if using template matching
            const appConfig = await this._waitForProductLoader();
            if (appConfig?.app_settings?.detection_method === 'template') {
                await this._waitForOpenCV();
            }
            
            // Check dependencies
            if (!QrScanner) {
                throw new Error('QrScanner not loaded');
            }
            if (!THREE) {
                throw new Error('THREE.js not loaded');
            }
            
            // Product configurations already loaded in _waitForProductLoader
            console.log('📦 Product configurations ready');
            
            // Initialize detection system
            console.log('🔍 Initializing detection system...');
            this.productDetector = new ProductDetector(this.productLoader);
            
            // Initialize AR renderer
            console.log('🎮 Initializing AR renderer...');
            const canvas = document.getElementById('ar-canvas');
            this.arRenderer = new ARRenderer(canvas);
            await this.arRenderer.init();
            
            // Initialize virtual buttons
            console.log('🎯 Initializing virtual buttons...');
            this.virtualButtons = new VirtualButtons(this.arRenderer.scene, this.arRenderer.camera);
            
            // Pass virtual buttons reference to AR renderer for orientation updates
            this.arRenderer.setVirtualButtons(this.virtualButtons);
            
            // Setup UI and camera
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
        
        // Global functions for UI
        window.closeProductInfo = () => this.closeProductInfo();
        window.switchDetectionMethod = (method) => this.switchDetectionMethod(method);
        window.getDetectionStats = () => this.productDetector?.getStats();
    }
    
    async setupCamera() {
        try {
            const video = document.getElementById('qr-video');
            
            // Enhanced mobile camera constraints
            const constraints = {
                video: { 
                    facingMode: { exact: 'environment' }, // Prefer back camera
                    width: { 
                        min: 640,
                        ideal: 1280,
                        max: 1920 
                    },
                    height: { 
                        min: 480,
                        ideal: 720,
                        max: 1080 
                    }
                }
            };
            
            // Check camera permissions first
            if (navigator.permissions) {
                try {
                    const permission = await navigator.permissions.query({ name: 'camera' });
                    console.log('Camera permission status:', permission.state);
                    
                    if (permission.state === 'denied') {
                        throw new Error('Camera permission denied. Please enable camera access in your browser settings.');
                    }
                } catch (permErr) {
                    console.warn('Permission check failed:', permErr);
                }
            }
            
            console.log('📷 Requesting camera access...');
            
            // Try exact environment camera first
            let stream;
            try {
                stream = await navigator.mediaDevices.getUserMedia(constraints);
            } catch (err) {
                console.warn('Failed with exact environment camera, trying fallback:', err);
                // Fallback: try without exact constraint
                constraints.video.facingMode = 'environment';
                try {
                    stream = await navigator.mediaDevices.getUserMedia(constraints);
                } catch (err2) {
                    console.warn('Failed with environment preference, trying any camera:', err2);
                    // Final fallback: any camera
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            width: { ideal: 1280 },
                            height: { ideal: 720 }
                        }
                    });
                }
            }
            
            video.srcObject = stream;
            
            // Wait for video to be ready
            await new Promise((resolve) => {
                video.addEventListener('loadedmetadata', resolve, { once: true });
            });
            
            console.log('📷 Camera initialized successfully');
            console.log(`Camera resolution: ${video.videoWidth}x${video.videoHeight}`);
        } catch (error) {
            console.error('Camera setup failed:', error);
            
            let errorMessage = 'Camera access failed. ';
            
            if (error.name === 'NotAllowedError') {
                errorMessage += 'Please allow camera access and refresh the page.';
            } else if (error.name === 'NotFoundError') {
                errorMessage += 'No camera found on this device.';
            } else if (error.name === 'NotSupportedError') {
                errorMessage += 'Camera not supported on this device.';
            } else if (error.name === 'OverconstrainedError') {
                errorMessage += 'Camera constraints not supported.';
            } else {
                errorMessage += error.message;
            }
            
            this.updateStatus('error', errorMessage);
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
                    onDecodeError: () => {
                        // Silent error handling
                    },
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
            
            // Initialize detection system if not already done
            if (!this.productDetector.isInitialized) {
                await this.productDetector.init();
            }
            
            // Start AR rendering
            this.arRenderer.startRendering();
            
            // Start product detection loop
            this.startDetectionLoop();
            
            this.updateUI('product-scanning');
            this.showStatus('Product scanning active - Point camera at products', 'info');
            
        } catch (error) {
            console.error('Failed to start product scanning:', error);
            this.showError('Failed to start product scanning.');
        }
    }
    
    stopScan() {
        console.log('⏹ Stopping scan...');
        this.currentMode = 'idle';
        
        // Stop QR scanner
        if (this.qrScanner) {
            this.qrScanner.stop();
            this.qrScanner.destroy();
            this.qrScanner = null;
        }
        
        // Stop product detection
        this.stopDetectionLoop();
        
        // Stop AR rendering
        if (this.arRenderer) {
            this.arRenderer.stopRendering();
            this.arRenderer.hideProduct();
        }
        
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
                
                // Capture frame from video
                const video = document.getElementById('qr-video');
                if (video && video.videoWidth > 0) {
                    const frame = this.captureVideoFrame(video);
                    
                    // Detect products
                    const result = await this.productDetector.detectProducts(frame);
                    
                    if (result) {
                        await this.handleProductDetection(result);
                    } else {
                        // No product detected - clean up AR elements
                        await this.handleNoProductDetection();
                    }
                }
                
            } catch (detectionError) {
                console.error('Detection loop error:', detectionError);
            } finally {
                this.isProcessing = false;
            }
        }, 200); // 5 FPS detection
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
        
        // Show product info
        this.showProductInfo(result.productConfig);
        
        // Display AR overlay
        await this.arRenderer.displayProduct(result);
        
        // Create virtual buttons
        if (result.productConfig.interactions && result.productConfig.interactions.virtual_buttons) {
            this.virtualButtons.createButtons(
                result.productConfig, 
                this.arRenderer.activeProduct.group
            );
        }
        
        // Show detection confidence
        this.showDetectionStats(result);
        
        // Pause detection for a moment
        this.stopDetectionLoop();
        setTimeout(() => {
            if (this.currentMode === 'product-scanning') {
                this.startDetectionLoop();
            }
        }, 3000);
    }
    
    async handleNoProductDetection() {
        // Only clean up if there's currently an active product
        if (this.arRenderer && this.arRenderer.activeProduct) {
            console.log('🧹 No product detected - cleaning up AR elements');
            
            // Hide AR product
            await this.arRenderer.hideProduct();
            
            // Clear virtual buttons
            if (this.virtualButtons) {
                this.virtualButtons.clearButtons();
            }
            
            // Hide product info
            this.hideProductInfo();
            
            // Clear detection stats
            this.updateStatus('info', 'Product scanning active - Point camera at products');
        }
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
        
        // Build details HTML
        let detailsHTML = '';
        if (product.info_card.details) {
            for (const [key, value] of Object.entries(product.info_card.details)) {
                detailsHTML += `<div><strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong> ${value}</div>`;
            }
        }
        details.innerHTML = detailsHTML;
        
        // Apply custom colors
        if (product.info_card.colors) {
            productInfo.style.background = product.info_card.colors.background;
            productInfo.style.color = product.info_card.colors.text;
        }
        
        productInfo.classList.remove('hidden');
    }
    
    hideProductInfo() {
        const productInfo = document.getElementById('product-info');
        if (productInfo) {
            productInfo.classList.add('hidden');
        }
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
    }
    
    updateUI(mode) {
        const scannerContainer = document.querySelector('.scanner-container');
        const arCanvas = document.getElementById('ar-canvas');
        
        // Update button states
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
        
        // Update method switcher
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
        
        // You could add a toast notification here
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
    
    async _waitForProductLoader() {
        // Initialize product loader first to get config
        try {
            await this.productLoader.init();
            return this.productLoader.getAppConfig();
        } catch (error) {
            console.warn('Could not load app config:', error);
            return null;
        }
    }
    
    async _waitForOpenCV() {
        return new Promise((resolve) => {
            if (typeof cv !== 'undefined' && cv.Mat) {
                console.log('OpenCV.js already loaded');
                resolve();
            } else {
                console.log('Waiting for OpenCV.js to load...');
                const checkOpenCV = () => {
                    if (typeof cv !== 'undefined' && cv.Mat) {
                        console.log('OpenCV.js loaded successfully');
                        resolve();
                    } else {
                        setTimeout(checkOpenCV, 100);
                    }
                };
                checkOpenCV();
            }
        });
    }
    
    onOpenCVReady() {
        console.log('OpenCV ready callback received');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const app = new RetailAR();
        
        // Global app reference for debugging
        window.retailAR = app;
        
        // Handle virtual button clicks
        document.addEventListener('virtualButtonClick', (event) => {
            console.log('🎯 Virtual button clicked:', event.detail);
        });
        
    } catch (error) {
        console.error('❌ Failed to initialize RetailAR:', error);
        document.body.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: #333; color: white; text-align: center; padding: 20px;">
                <div>
                    <h1>🚨 Initialization Error</h1>
                    <p>Failed to start RetailAR: ${error.message}</p>
                    <p>Please check the browser console for more details.</p>
                    <button onclick="location.reload()" style="margin-top: 20px; padding: 10px 20px; font-size: 16px;">Reload Page</button>
                </div>
            </div>
        `;
    }
});