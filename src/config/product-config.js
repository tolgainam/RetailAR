/**
 * Product Configuration Manager
 * Handles loading and managing product data
 */

export class ProductConfig {
    constructor() {
        this.products = new Map();
        this.isLoaded = false;
        
        console.log('📋 Product Configuration Manager initialized');
    }
    
    async loadConfigs() {
        try {
            console.log('📥 Loading product configurations...');
            
            // Try to load from external JSON file first
            try {
                const response = await fetch('./data/products.json');
                if (response.ok) {
                    const productsData = await response.json();
                    this.loadFromData(productsData);
                    console.log('✅ Product configurations loaded from external file');
                    return;
                }
            } catch (error) {
                console.log('⚠️  External product config not found, using built-in configurations');
            }
            
            // Fallback to built-in configurations
            this.loadBuiltInConfigs();
            console.log('✅ Built-in product configurations loaded');
            
        } catch (error) {
            console.error('❌ Failed to load product configurations:', error);
            throw error;
        }
    }
    
    loadFromData(productsData) {
        let productsArray = [];
        
        if (Array.isArray(productsData)) {
            productsArray = productsData;
        } else if (typeof productsData === 'object') {
            // Check if it has a 'products' property (JSON structure from file)
            if (productsData.products && Array.isArray(productsData.products)) {
                productsArray = productsData.products;
            } else {
                // Assume it's an object with product values
                productsArray = Object.values(productsData);
            }
        }
        
        productsArray.forEach(product => {
            if (product && product.id) {
                this.products.set(product.id, product);
            }
        });
        
        this.isLoaded = true;
    }
    
    loadBuiltInConfigs() {
        // Built-in product configurations matching our MVP
        const builtInProducts = [
            {
                id: 'zyn-apple-mint',
                name: 'ZYN Apple Mint',
                brand: 'ZYN',
                category: 'can',
                flavor: 'Apple Mint',
                nicotine: '6mg',
                aroma_notes: ['Fresh Apple', 'Cool Mint', 'Crisp'],
                pricing: '$4.99',
                icon: 'icons/zyn-apple-mint.png',
                learn_more_url: 'https://zyn.com/products/apple-mint',
                buy_url: 'https://store.zyn.com/apple-mint',
                model_path: 'models/zyn-apple-mint.glb',
                brand_colors: ['#00ff88', '#ffffff'],
                particle_config: {
                    type: 'apple_mint_particles',
                    primary_color: '#00ff88',
                    secondary_color: '#90ff90',
                    count: 120,
                    animation: 'floating_sparkles'
                }
            },
            {
                id: 'zyn-spearmint',
                name: 'ZYN Spearmint',
                brand: 'ZYN',
                category: 'can',
                flavor: 'Spearmint',
                nicotine: '6mg',
                aroma_notes: ['Cool Spearmint', 'Fresh', 'Cooling'],
                pricing: '$4.99',
                icon: 'icons/zyn-spearmint.png',
                learn_more_url: 'https://zyn.com/products/spearmint',
                buy_url: 'https://store.zyn.com/spearmint',
                model_path: 'models/zyn-spearmint.glb',
                brand_colors: ['#4dd0e1', '#ffffff'],
                particle_config: {
                    type: 'spearmint_particles',
                    primary_color: '#4dd0e1',
                    secondary_color: '#80e5ff',
                    count: 100,
                    animation: 'cooling_mist'
                }
            },
            {
                id: 'terea-yellow',
                name: 'TEREA Yellow Selection',
                brand: 'IQOS',
                category: 'pack',
                flavor: 'Yellow Selection',
                nicotine: '6mg',
                aroma_notes: ['Balanced Tobacco', 'Smooth', 'Classic'],
                pricing: '$6.50',
                icon: 'icons/terea-yellow.png',
                learn_more_url: 'https://iqos.com/products/terea-yellow',
                buy_url: 'https://store.iqos.com/terea-yellow',
                model_path: 'models/terea-yellow.glb',
                brand_colors: ['#ffd54f', '#ffeb3b'],
                particle_config: {
                    type: 'yellow_particles',
                    primary_color: '#ffd54f',
                    secondary_color: '#fff176',
                    count: 80,
                    animation: 'warm_flow'
                }
            },
            {
                id: 'terea-sienna',
                name: 'TEREA Sienna',
                brand: 'IQOS',
                category: 'pack',
                flavor: 'Sienna',
                nicotine: '6mg',
                aroma_notes: ['Rich Tobacco', 'Woody', 'Full-bodied'],
                pricing: '$6.50',
                icon: 'icons/terea-sienna.png',
                learn_more_url: 'https://iqos.com/products/terea-sienna',
                buy_url: 'https://store.iqos.com/terea-sienna',
                model_path: 'models/terea-sienna.glb',
                brand_colors: ['#8d6e63', '#a1887f'],
                particle_config: {
                    type: 'sienna_particles',
                    primary_color: '#8d6e63',
                    secondary_color: '#bcaaa4',
                    count: 90,
                    animation: 'smoke_effects'
                }
            },
            {
                id: 'iqos-iluma-prime',
                name: 'IQOS ILUMA PRIME',
                brand: 'IQOS',
                category: 'device',
                flavor: null,
                nicotine: null,
                aroma_notes: ['Premium Device', 'Advanced Technology'],
                pricing: '$180.00',
                icon: 'icons/iqos-iluma-prime.png',
                learn_more_url: 'https://iqos.com/products/iluma-prime',
                buy_url: 'https://store.iqos.com/iluma-prime',
                model_path: 'models/iqos-iluma-prime.glb',
                brand_colors: ['#37474f', '#546e7a'],
                particle_config: {
                    type: 'premium_particles',
                    primary_color: '#37474f',
                    secondary_color: '#78909c',
                    count: 60,
                    animation: 'sophisticated_glints'
                }
            }
        ];
        
        // Load built-in products into the map
        builtInProducts.forEach(product => {
            this.products.set(product.id, product);
        });
        
        this.isLoaded = true;
    }
    
    getProduct(productId) {
        return this.products.get(productId) || null;
    }
    
    getAllProducts() {
        return Array.from(this.products.values());
    }
    
    getProductsByBrand(brand) {
        return Array.from(this.products.values()).filter(
            product => product.brand.toLowerCase() === brand.toLowerCase()
        );
    }
    
    getProductsByCategory(category) {
        return Array.from(this.products.values()).filter(
            product => product.category === category
        );
    }
    
    hasProduct(productId) {
        return this.products.has(productId);
    }
    
    getProductIds() {
        return Array.from(this.products.keys());
    }
    
    validateProduct(productConfig) {
        const requiredFields = ['id', 'name', 'brand', 'category'];
        
        for (const field of requiredFields) {
            if (!productConfig[field]) {
                return {
                    valid: false,
                    error: `Missing required field: ${field}`
                };
            }
        }
        
        // Validate category
        const validCategories = ['can', 'pack', 'device'];
        if (!validCategories.includes(productConfig.category)) {
            return {
                valid: false,
                error: `Invalid category: ${productConfig.category}. Must be one of: ${validCategories.join(', ')}`
            };
        }
        
        // Validate brand colors if present
        if (productConfig.brand_colors) {
            if (!Array.isArray(productConfig.brand_colors)) {
                return {
                    valid: false,
                    error: 'brand_colors must be an array'
                };
            }
        }
        
        // Validate particle config if present
        if (productConfig.particle_config) {
            const particleRequiredFields = ['type', 'primary_color'];
            for (const field of particleRequiredFields) {
                if (!productConfig.particle_config[field]) {
                    return {
                        valid: false,
                        error: `Missing required particle config field: ${field}`
                    };
                }
            }
        }
        
        return { valid: true };
    }
    
    addProduct(productConfig) {
        const validation = this.validateProduct(productConfig);
        
        if (!validation.valid) {
            throw new Error(`Invalid product configuration: ${validation.error}`);
        }
        
        this.products.set(productConfig.id, productConfig);
        console.log(`➕ Added product: ${productConfig.name}`);
    }
    
    updateProduct(productId, updates) {
        const existingProduct = this.products.get(productId);
        
        if (!existingProduct) {
            throw new Error(`Product not found: ${productId}`);
        }
        
        const updatedProduct = { ...existingProduct, ...updates };
        const validation = this.validateProduct(updatedProduct);
        
        if (!validation.valid) {
            throw new Error(`Invalid product update: ${validation.error}`);
        }
        
        this.products.set(productId, updatedProduct);
        console.log(`🔄 Updated product: ${productId}`);
    }
    
    removeProduct(productId) {
        if (this.products.has(productId)) {
            this.products.delete(productId);
            console.log(`➖ Removed product: ${productId}`);
            return true;
        }
        return false;
    }
    
    // Export configuration for backup/sharing
    exportConfig() {
        return {
            version: '1.0.0',
            exported_at: new Date().toISOString(),
            products: Array.from(this.products.values())
        };
    }
    
    // Import configuration from backup/sharing
    importConfig(configData) {
        if (!configData.products || !Array.isArray(configData.products)) {
            throw new Error('Invalid configuration format');
        }
        
        // Validate all products before importing
        for (const product of configData.products) {
            const validation = this.validateProduct(product);
            if (!validation.valid) {
                throw new Error(`Invalid product in import: ${validation.error}`);
            }
        }
        
        // Clear existing products
        this.products.clear();
        
        // Import new products
        configData.products.forEach(product => {
            this.products.set(product.id, product);
        });
        
        this.isLoaded = true;
        console.log(`📥 Imported ${configData.products.length} products`);
    }
    
    // Search functionality
    searchProducts(query) {
        const lowerQuery = query.toLowerCase();
        
        return Array.from(this.products.values()).filter(product => {
            return (
                product.name.toLowerCase().includes(lowerQuery) ||
                product.brand.toLowerCase().includes(lowerQuery) ||
                (product.flavor && product.flavor.toLowerCase().includes(lowerQuery)) ||
                (product.aroma_notes && product.aroma_notes.some(note => 
                    note.toLowerCase().includes(lowerQuery)
                ))
            );
        });
    }
    
    // Get configuration statistics
    getStats() {
        const products = Array.from(this.products.values());
        
        const brandCounts = {};
        const categoryCounts = {};
        
        products.forEach(product => {
            brandCounts[product.brand] = (brandCounts[product.brand] || 0) + 1;
            categoryCounts[product.category] = (categoryCounts[product.category] || 0) + 1;
        });
        
        return {
            total_products: products.length,
            brands: brandCounts,
            categories: categoryCounts,
            loaded: this.isLoaded
        };
    }
}