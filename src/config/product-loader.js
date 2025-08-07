/**
 * Product Configuration Loader
 * Loads and manages product configurations with runtime method switching
 */

export class ProductLoader {
    constructor() {
        this.products = new Map();
        this.appConfig = null;
        this.loadPromise = null;
    }
    
    /**
     * Initialize and load all product configurations
     */
    async init() {
        if (this.loadPromise) {
            return this.loadPromise;
        }
        
        this.loadPromise = this._loadConfigs();
        return this.loadPromise;
    }
    
    async _loadConfigs() {
        try {
            // Load app configuration - handle both local dev and GitHub Pages deployment
            const configPath = window.location.hostname.includes('github.io') 
                ? './src/config/app-config.json'  // Relative path for GitHub Pages
                : '/src/config/app-config.json';   // Absolute path for local dev
            
            const appConfigResponse = await fetch(configPath);
            if (!appConfigResponse.ok) {
                throw new Error(`Failed to load app config: ${appConfigResponse.status} ${appConfigResponse.statusText}`);
            }
            this.appConfig = await appConfigResponse.json();
            
            // Load all product configurations
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
            // Handle both local dev and GitHub Pages deployment
            const configPath = window.location.hostname.includes('github.io')
                ? `./assets/products/${productId}/config.json`  // Relative path for GitHub Pages
                : `/assets/products/${productId}/config.json`;   // Absolute path for local dev
                
            const response = await fetch(configPath);
            if (!response.ok) {
                throw new Error(`Failed to load config for ${productId}: ${response.status} ${response.statusText}`);
            }
            
            const config = await response.json();
            
            // Apply global detection method if not overridden
            if (!config.detection.method) {
                config.detection.method = this.appConfig?.app_settings?.detection_method || 'template';
            }
            
            // Resolve relative paths
            this._resolveAssetPaths(config, productId);
            
            this.products.set(productId, config);
            
        } catch (error) {
            console.error(`Failed to load product config: ${productId}`, error);
        }
    }
    
    _resolveAssetPaths(config, productId) {
        // Handle both local dev and GitHub Pages deployment
        const basePath = window.location.hostname.includes('github.io')
            ? `./assets/products/${productId}`     // Relative path for GitHub Pages
            : `/assets/products/${productId}`;      // Absolute path for local dev
        
        // Resolve reference image paths
        config.detection.reference_images.forEach(img => {
            if (!img.path.startsWith('http') && !img.path.startsWith('/assets') && !img.path.startsWith('./assets')) {
                img.path = `${basePath}/${img.path}`;
            }
        });
        
        // Resolve 3D model path
        if (config.visual['3d_model'] && !config.visual['3d_model'].startsWith('http') && !config.visual['3d_model'].startsWith('./assets')) {
            config.visual['3d_model'] = `${basePath}/${config.visual['3d_model']}`;
        }
        
        // Resolve ML model path
        if (config.detection.ml_model && !config.detection.ml_model.startsWith('http') && !config.detection.ml_model.startsWith('./assets')) {
            config.detection.ml_model = `${basePath}/${config.detection.ml_model}`;
        }
    }
    
    /**
     * Get product configuration by ID
     */
    getProduct(productId) {
        return this.products.get(productId);
    }
    
    /**
     * Get all loaded products
     */
    getAllProducts() {
        return Array.from(this.products.values());
    }
    
    /**
     * Get products by type (rectangular/cylindrical)
     */
    getProductsByType(type) {
        return this.getAllProducts().filter(product => product.type === type);
    }
    
    /**
     * Get app configuration
     */
    getAppConfig() {
        return this.appConfig;
    }
    
    /**
     * Switch detection method globally
     */
    setDetectionMethod(method) {
        if (!['template', 'ml', 'hybrid'].includes(method)) {
            throw new Error(`Invalid detection method: ${method}`);
        }
        
        // Ensure appConfig is loaded before setting detection method
        if (!this.appConfig) {
            console.warn('⚠️ AppConfig not loaded yet, initializing ProductLoader first...');
            // Try to initialize and retry after a delay
            this.init().then(() => {
                this.setDetectionMethod(method);
            }).catch(error => {
                console.error('Failed to initialize ProductLoader:', error);
            });
            return;
        }
        
        this.appConfig.app_settings.detection_method = method;
        
        // Update all products that don't have method override
        for (const [productId, config] of this.products) {
            if (!config.detection.method_override) {
                config.detection.method = method;
            }
        }
        
        console.log(`Switched global detection method to: ${method}`);
    }
    
    /**
     * Override detection method for specific product
     */
    setProductDetectionMethod(productId, method) {
        const product = this.products.get(productId);
        if (!product) {
            throw new Error(`Product not found: ${productId}`);
        }
        
        if (!['template', 'ml', 'hybrid'].includes(method)) {
            throw new Error(`Invalid detection method: ${method}`);
        }
        
        product.detection.method = method;
        product.detection.method_override = true;
        
        console.log(`Set detection method for ${productId}: ${method}`);
    }
    
    /**
     * Get current detection method for product
     */
    getDetectionMethod(productId) {
        const product = this.products.get(productId);
        return product ? product.detection.method : (this.appConfig?.app_settings?.detection_method || 'template');
    }
    
    /**
     * Preload product assets (images, models)
     */
    async preloadAssets(productId) {
        const product = this.products.get(productId);
        if (!product) {
            throw new Error(`Product not found: ${productId}`);
        }
        
        const promises = [];
        
        // Preload reference images
        product.detection.reference_images.forEach(img => {
            promises.push(this._preloadImage(img.path));
        });
        
        // Preload 3D model (if needed)
        if (product.visual['3d_model']) {
            promises.push(this._preload3DModel(product.visual['3d_model']));
        }
        
        return Promise.all(promises);
    }
    
    async _preloadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }
    
    async _preload3DModel(src) {
        try {
            const response = await fetch(src);
            if (!response.ok) throw new Error('Failed to fetch 3D model');
            return response.arrayBuffer();
        } catch (error) {
            console.warn(`Failed to preload 3D model: ${src}`, error);
            return null;
        }
    }
    
    /**
     * Validate product configuration
     */
    validateProduct(productId) {
        const product = this.products.get(productId);
        if (!product) {
            return { valid: false, errors: ['Product not found'] };
        }
        
        const errors = [];
        
        // Required fields
        if (!product.id) errors.push('Missing product ID');
        if (!product.name) errors.push('Missing product name');
        if (!product.type || !['rectangular', 'cylindrical'].includes(product.type)) {
            errors.push('Invalid product type');
        }
        
        // Detection configuration
        if (!product.detection.reference_images || product.detection.reference_images.length === 0) {
            errors.push('No reference images configured');
        }
        
        // Visual configuration
        if (!product.visual) {
            errors.push('Missing visual configuration');
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
}