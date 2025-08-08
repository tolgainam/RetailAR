/**
 * UI Manager
 * Handles all user interface updates and interactions
 */

export class UIManager {
    constructor() {
        // Get DOM elements
        this.loadingScreen = document.getElementById('loading-screen');
        this.loadingText = document.querySelector('.loading-text');
        this.productInfo = document.getElementById('product-info');
        this.productName = document.getElementById('product-name');
        this.productDetails = document.getElementById('product-details');
        this.learnMoreBtn = document.getElementById('learn-more-btn');
        this.buyBtn = document.getElementById('buy-btn');
        this.debugInfo = document.getElementById('debug-info');
        
        // Debug elements
        this.fpsElement = document.getElementById('fps');
        this.detectionStatusElement = document.getElementById('detection-status');
        this.confidenceElement = document.getElementById('confidence');
        
        // State
        this.isProductInfoVisible = false;
        this.debugMode = false;
        
        // Initialize event listeners
        this.initializeEventListeners();
        
        console.log('🖥️  UI Manager initialized');
    }
    
    initializeEventListeners() {
        // Enable debug mode with key combination
        document.addEventListener('keydown', (event) => {
            if (event.ctrlKey && event.shiftKey && event.key === 'D') {
                this.toggleDebugMode();
            }
        });
        
        // Handle touch events for mobile
        let touchStartTime = 0;
        document.addEventListener('touchstart', () => {
            touchStartTime = Date.now();
        });
        
        document.addEventListener('touchend', () => {
            const touchDuration = Date.now() - touchStartTime;
            // Long press (3 seconds) to toggle debug mode
            if (touchDuration > 3000) {
                this.toggleDebugMode();
            }
        });
    }
    
    updateLoadingText(text) {
        if (this.loadingText) {
            this.loadingText.textContent = text;
            console.log(`📝 Loading: ${text}`);
        }
    }
    
    hideLoadingScreen() {
        if (this.loadingScreen) {
            this.loadingScreen.style.opacity = '0';
            setTimeout(() => {
                this.loadingScreen.style.display = 'none';
            }, 300);
            console.log('✅ Loading screen hidden');
        }
    }
    
    showLoadingScreen() {
        if (this.loadingScreen) {
            this.loadingScreen.style.display = 'flex';
            this.loadingScreen.style.opacity = '1';
        }
    }
    
    showProductInfo(productConfig) {
        if (!this.productInfo || !productConfig) return;
        
        // Update product information
        if (this.productName) {
            this.productName.textContent = productConfig.name;
            this.productName.style.color = productConfig.brand_colors?.[0] || '#ffffff';
        }
        
        if (this.productDetails) {
            const details = this.formatProductDetails(productConfig);
            this.productDetails.innerHTML = details;
        }
        
        // Update buttons
        if (this.learnMoreBtn && productConfig.learn_more_url) {
            this.learnMoreBtn.href = productConfig.learn_more_url;
            this.learnMoreBtn.style.display = 'inline-block';
        }
        
        if (this.buyBtn && productConfig.buy_url) {
            this.buyBtn.href = productConfig.buy_url;
            this.buyBtn.style.background = productConfig.brand_colors?.[0] || '#00ff88';
            this.buyBtn.style.display = 'inline-block';
        }
        
        // Show the panel with animation
        this.productInfo.classList.add('visible');
        this.isProductInfoVisible = true;
        
        console.log(`📄 Showing product info: ${productConfig.name}`);
    }
    
    hideProductInfo() {
        if (this.productInfo && this.isProductInfoVisible) {
            this.productInfo.classList.remove('visible');
            this.isProductInfoVisible = false;
            console.log('📄 Product info hidden');
        }
    }
    
    formatProductDetails(productConfig) {
        const parts = [];
        
        if (productConfig.flavor) {
            parts.push(`<strong>Flavor:</strong> ${productConfig.flavor}`);
        }
        
        if (productConfig.nicotine) {
            parts.push(`<strong>Nicotine:</strong> ${productConfig.nicotine}`);
        }
        
        if (productConfig.aroma_notes && productConfig.aroma_notes.length > 0) {
            const notes = productConfig.aroma_notes.join(', ');
            parts.push(`<strong>Notes:</strong> ${notes}`);
        }
        
        if (productConfig.pricing) {
            parts.push(`<strong>Price:</strong> ${productConfig.pricing}`);
        }
        
        return parts.join('<br>');
    }
    
    showError(message) {
        // Remove existing error if any
        const existingError = document.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        // Create error element
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        // Add to DOM
        document.body.appendChild(errorDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
        
        console.error(`❌ Error shown: ${message}`);
    }
    
    toggleDebugMode() {
        this.debugMode = !this.debugMode;
        
        if (this.debugInfo) {
            this.debugInfo.style.display = this.debugMode ? 'block' : 'none';
        }
        
        console.log(`🔧 Debug mode: ${this.debugMode ? 'enabled' : 'disabled'}`);
    }
    
    updateDebugInfo(info) {
        if (!this.debugMode) return;
        
        if (this.fpsElement && info.fps !== undefined) {
            this.fpsElement.textContent = info.fps;
        }
        
        if (this.detectionStatusElement && info.detection !== undefined) {
            this.detectionStatusElement.textContent = info.detection;
        }
        
        if (this.confidenceElement && info.confidence !== undefined) {
            this.confidenceElement.textContent = info.confidence;
        }
    }
    
    // Utility methods for common UI operations
    setElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        }
    }
    
    setElementHTML(elementId, html) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = html;
        }
    }
    
    showElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'block';
        }
    }
    
    hideElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style.display = 'none';
        }
    }
    
    addClass(elementId, className) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.add(className);
        }
    }
    
    removeClass(elementId, className) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.remove(className);
        }
    }
    
    // Animation helpers
    fadeIn(element, duration = 300) {
        element.style.opacity = '0';
        element.style.display = 'block';
        
        const start = performance.now();
        
        const animate = (timestamp) => {
            const elapsed = timestamp - start;
            const progress = Math.min(elapsed / duration, 1);
            
            element.style.opacity = progress;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    fadeOut(element, duration = 300) {
        const start = performance.now();
        const startOpacity = parseFloat(element.style.opacity) || 1;
        
        const animate = (timestamp) => {
            const elapsed = timestamp - start;
            const progress = Math.min(elapsed / duration, 1);
            
            element.style.opacity = startOpacity * (1 - progress);
            
            if (progress >= 1) {
                element.style.display = 'none';
            } else {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    // Theme management
    updateTheme(brandColors) {
        if (!brandColors || brandColors.length === 0) return;
        
        const root = document.documentElement;
        root.style.setProperty('--primary-color', brandColors[0]);
        
        if (brandColors[1]) {
            root.style.setProperty('--secondary-color', brandColors[1]);
        }
    }
    
    resetTheme() {
        const root = document.documentElement;
        root.style.removeProperty('--primary-color');
        root.style.removeProperty('--secondary-color');
    }
    
    // Haptic feedback (if supported)
    vibrate(pattern = [100]) {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    }
    
    // Screen orientation handling
    requestFullscreen() {
        const element = document.documentElement;
        
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.webkitRequestFullscreen) {
            element.webkitRequestFullscreen();
        } else if (element.msRequestFullscreen) {
            element.msRequestFullscreen();
        }
    }
    
    exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
}