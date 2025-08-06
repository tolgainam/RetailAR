export class ProductDatabase {
    constructor() {
        this.products = new Map();
        this.initSampleProducts();
    }
    
    initSampleProducts() {
        const sampleProducts = [
            {
                id: 'sample-product',
                name: 'Smart Water Bottle',
                description: 'A smart water bottle that tracks your hydration levels with LED indicators and smartphone connectivity.',
                type: 'bottle',
                color: 0x0066ff,
                price: '$29.99',
                features: [
                    'Temperature monitoring',
                    'Hydration tracking',
                    'Bluetooth connectivity',
                    'LED indicators'
                ],
                model3d: null // Could be loaded from external source
            },
            {
                id: 'product-2',
                name: 'Wireless Earbuds',
                description: 'Premium wireless earbuds with noise cancellation and 8-hour battery life.',
                type: 'sphere',
                color: 0x333333,
                price: '$149.99',
                features: [
                    'Active noise cancellation',
                    '8-hour battery life',
                    'Water resistant',
                    'Touch controls'
                ],
                model3d: null
            },
            {
                id: 'product-3',
                name: 'Smart Home Hub',
                description: 'Central control unit for all your smart home devices with voice assistant.',
                type: 'cylinder',
                color: 0xffffff,
                price: '$99.99',
                features: [
                    'Voice control',
                    'Multi-device support',
                    'Mobile app integration',
                    'Security features'
                ],
                model3d: null
            },
            {
                id: 'product-4',
                name: 'Gaming Mouse',
                description: 'High-precision gaming mouse with customizable RGB lighting and programmable buttons.',
                type: 'box',
                color: 0xff0000,
                price: '$79.99',
                features: [
                    'RGB lighting',
                    'Programmable buttons',
                    '16000 DPI sensor',
                    'Ergonomic design'
                ],
                model3d: null
            }
        ];
        
        sampleProducts.forEach(product => {
            this.products.set(product.id, product);
        });
    }
    
    getProduct(id) {
        return this.products.get(id) || this.getRandomProduct();
    }
    
    getRandomProduct() {
        const productIds = Array.from(this.products.keys());
        const randomId = productIds[Math.floor(Math.random() * productIds.length)];
        return this.products.get(randomId);
    }
    
    getAllProducts() {
        return Array.from(this.products.values());
    }
    
    addProduct(product) {
        this.products.set(product.id, product);
    }
    
    searchProducts(query) {
        const results = [];
        const lowerQuery = query.toLowerCase();
        
        for (const product of this.products.values()) {
            if (product.name.toLowerCase().includes(lowerQuery) ||
                product.description.toLowerCase().includes(lowerQuery)) {
                results.push(product);
            }
        }
        
        return results;
    }
}