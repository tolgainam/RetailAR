/**
 * Simple RetailAR - Lightweight version
 * Basic QR scanning without heavy AR dependencies
 */

class SimpleRetailAR {
    constructor() {
        this.qrScanner = null;
        this.currentMode = 'idle';
        console.log('🚀 Initializing Simple RetailAR...');
        this.init();
    }
    
    async init() {
        try {
            // Setup camera first
            await this.setupCamera();
            
            // Setup basic event listeners
            this.setupEventListeners();
            
            console.log('✅ Simple RetailAR initialized successfully!');
            
            // Make globally available
            window.retailAR = this;
            
        } catch (error) {
            console.error('❌ Failed to initialize Simple RetailAR:', error);
        }
    }
    
    setupEventListeners() {
        const startQRBtn = document.getElementById('start-qr-scan');
        const startProductBtn = document.getElementById('start-product-scan');
        const stopBtn = document.getElementById('stop-scan');
        
        if (startQRBtn) {
            startQRBtn.addEventListener('click', () => this.startQRScan());
        }
        if (startProductBtn) {
            startProductBtn.addEventListener('click', () => this.startProductScan());
        }
        if (stopBtn) {
            stopBtn.addEventListener('click', () => this.stopScan());
        }
        
        // Global functions
        window.closeProductInfo = () => this.closeProductInfo();
        window.switchDetectionMethod = (method) => {
            console.log('Detection method switch to:', method);
            this.showStatus(`Switched to ${method} detection`, 'info');
        };
    }
    
    async setupCamera() {
        try {
            const video = document.getElementById('qr-video');
            
            // Simple browser detection
            const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
            
            console.log('📷 Setting up camera...');
            
            // Simple constraints
            const constraints = {
                video: {
                    facingMode: isSafari ? 'environment' : { ideal: 'environment' },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            
            video.setAttribute('autoplay', true);
            video.setAttribute('playsinline', true);
            video.setAttribute('muted', true);
            
            if (isSafari) {
                video.setAttribute('webkit-playsinline', true);
            }
            
            await video.play();
            console.log('📷 Camera initialized successfully');
            
        } catch (error) {
            console.error('Camera setup failed:', error);
            this.showStatus('Camera setup failed: ' + error.message, 'error');
        }
    }
    
    async startQRScan() {
        if (this.currentMode === 'qr-scanning') return;
        
        try {
            console.log('🔍 Starting QR scan...');
            this.currentMode = 'qr-scanning';
            
            // Dynamic import QR Scanner to avoid loading issues
            const QrScanner = (await import('qr-scanner')).default;
            
            const video = document.getElementById('qr-video');
            this.qrScanner = new QrScanner(
                video,
                result => this.handleQRCode(result.data),
                {
                    highlightScanRegion: true,
                    highlightCodeOutline: true,
                }
            );
            
            await this.qrScanner.start();
            this.showStatus('QR Scanner active', 'info');
            
        } catch (error) {
            console.error('QR Scanner failed:', error);
            this.showStatus('QR Scanner failed: ' + error.message, 'error');
        }
    }
    
    async startProductScan() {
        console.log('🔍 Product scanning...');
        this.currentMode = 'product-scanning';
        this.showStatus('Product scanning - Feature requires full version', 'info');
    }
    
    stopScan() {
        console.log('⏹ Stopping scan...');
        this.currentMode = 'idle';
        
        if (this.qrScanner) {
            this.qrScanner.stop();
            this.qrScanner.destroy();
            this.qrScanner = null;
        }
        
        this.showStatus('Scanning stopped', 'info');
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
    
    closeProductInfo() {
        const productInfo = document.getElementById('product-info');
        if (productInfo) {
            productInfo.classList.add('hidden');
        }
    }
    
    showStatus(message, type = 'info') {
        console.log(`📊 Status (${type}):`, message);
        
        // Create toast notification
        const existingToast = document.querySelector('.status-toast');
        if (existingToast) {
            existingToast.remove();
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
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Starting Simple RetailAR...');
    new SimpleRetailAR();
});