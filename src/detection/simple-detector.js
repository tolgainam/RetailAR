/**
 * Simple Product Detector
 * Basic image matching using Canvas 2D API and color/pattern recognition
 */

export class SimpleDetector {
    constructor() {
        this.referenceImages = new Map();
        this.isInitialized = false;
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        
        // Detection parameters
        this.detectionThreshold = 0.6;
        this.sampleSize = 32; // Reduced size for faster processing
    }
    
    /**
     * Initialize detector
     */
    async init() {
        if (this.isInitialized) return;
        
        this.isInitialized = true;
        console.log('Simple detector initialized');
    }
    
    /**
     * Load and preprocess reference images
     */
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
    
    /**
     * Detect products in camera frame
     */
    async detectProducts(cameraFrame, productConfigs) {
        if (!this.isInitialized) await this.init();
        
        try {
            // Convert camera frame to smaller analysis canvas
            const analysisData = this._prepareFrameForAnalysis(cameraFrame);
            const frameSignature = this._createImageSignature(analysisData);
            const frameColorProfile = this._createColorProfile(analysisData);
            const frameEdgeProfile = this._createEdgeProfile(analysisData);
            
            let bestMatch = null;
            let bestConfidence = 0;
            
            // Test against all products
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
        // Resize camera frame to analysis size
        this.canvas.width = this.sampleSize;
        this.canvas.height = this.sampleSize;
        
        // Create temporary canvas for camera frame
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = cameraFrame.width;
        tempCanvas.height = cameraFrame.height;
        tempCtx.putImageData(cameraFrame, 0, 0);
        
        // Draw resized frame
        this.ctx.drawImage(tempCanvas, 0, 0, this.sampleSize, this.sampleSize);
        return this.ctx.getImageData(0, 0, this.sampleSize, this.sampleSize);
    }
    
    _createImageSignature(imageData) {
        const data = imageData.data;
        const signature = [];
        
        // Create a simplified hash based on brightness patterns
        const blockSize = 4; // 8x8 blocks in 32x32 image
        const blocksPerRow = this.sampleSize / blockSize;
        
        for (let y = 0; y < blocksPerRow; y++) {
            for (let x = 0; x < blocksPerRow; x++) {
                let totalBrightness = 0;
                let pixelCount = 0;
                
                // Sample block
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
        
        // Calculate average colors
        for (let i = 0; i < data.length; i += 4) {
            rTotal += data[i];
            gTotal += data[i + 1];
            bTotal += data[i + 2];
        }
        
        profile.r = rTotal / pixelCount;
        profile.g = gTotal / pixelCount;
        profile.b = bTotal / pixelCount;
        
        // Find dominant color (simplified)
        const colorBuckets = { r: 0, g: 0, b: 0 };
        for (let i = 0; i < data.length; i += 4) {
            const max = Math.max(data[i], data[i + 1], data[i + 2]);
            if (data[i] === max) colorBuckets.r++;
            else if (data[i + 1] === max) colorBuckets.g++;
            else colorBuckets.b++;
        }
        
        const maxBucket = Math.max(colorBuckets.r, colorBuckets.g, colorBuckets.b);
        if (colorBuckets.r === maxBucket) profile.dominant = { r: 255, g: 0, b: 0 };
        else if (colorBuckets.g === maxBucket) profile.dominant = { r: 0, g: 255, b: 0 };
        else profile.dominant = { r: 0, g: 0, b: 255 };
        
        return profile;
    }
    
    _createEdgeProfile(imageData) {
        const data = imageData.data;
        const edges = [];
        
        // Simple edge detection using brightness differences
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
            
            // Weighted combination
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
            similarity += 1 - (diff / 255); // Normalize to 0-1
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
    
    /**
     * Get detector statistics
     */
    getStats() {
        return {
            initialized: this.isInitialized,
            loadedProducts: this.referenceImages.size,
            detectorType: 'Simple Canvas-based',
            sampleSize: this.sampleSize
        };
    }
    
    /**
     * Cleanup resources
     */
    cleanup() {
        this.referenceImages.clear();
        this.isInitialized = false;
    }
}