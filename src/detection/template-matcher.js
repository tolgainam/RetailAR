/**
 * Template Matching Engine using OpenCV.js
 * Handles multi-image template matching with confidence scoring
 */

export class TemplateMatcher {
    constructor() {
        this.cv = null;
        this.isInitialized = false;
        this.referenceFeatures = new Map(); // Store precomputed features
        this.detector = null;
        this.matcher = null;
    }
    
    /**
     * Initialize OpenCV.js and feature detectors
     */
    async init() {
        if (this.isInitialized) return;
        
        try {
            // Load OpenCV.js
            if (typeof cv === 'undefined') {
                await this._loadOpenCV();
            }
            
            this.cv = cv;
            
            // Check if ORB is available, fallback to basic template matching
            if (typeof this.cv.ORB_create === 'function') {
                this.detector = this.cv.ORB_create(500);
                this.matcher = new this.cv.BFMatcher(this.cv.NORM_HAMMING, true);
                console.log('Using ORB feature matching');
            } else if (typeof this.cv.ORB === 'function') {
                this.detector = new this.cv.ORB(500);
                this.matcher = new this.cv.BFMatcher(this.cv.NORM_HAMMING, true);
                console.log('Using ORB constructor');
            } else {
                console.log('ORB not available, using basic template matching');
                this.detector = null;
                this.matcher = null;
            }
            
            this.isInitialized = true;
            console.log('Template matcher initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize template matcher:', error);
            throw error;
        }
    }
    
    async _loadOpenCV() {
        return new Promise((resolve, reject) => {
            // Create script tag to load OpenCV.js
            const script = document.createElement('script');
            script.src = 'https://docs.opencv.org/4.x/opencv.js';
            script.onload = () => {
                // OpenCV.js loads asynchronously
                cv.onRuntimeInitialized = resolve;
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    /**
     * Preprocess and extract features from reference images
     */
    async preprocessReferenceImages(productId, referenceImages) {
        if (!this.isInitialized) await this.init();
        
        const productFeatures = [];
        
        for (const refImg of referenceImages) {
            try {
                // Load image
                const img = await this._loadImage(refImg.path);
                const mat = this.cv.imread(img);
                
                // Convert to grayscale
                const gray = new this.cv.Mat();
                this.cv.cvtColor(mat, gray, this.cv.COLOR_RGBA2GRAY);
                
                // Extract features
                const keypoints = new this.cv.KeyPointVector();
                const descriptors = new this.cv.Mat();
                
                this.detector.detectAndCompute(gray, new this.cv.Mat(), keypoints, descriptors);
                
                if (descriptors.rows > 0) {
                    productFeatures.push({
                        id: refImg.id,
                        weight: refImg.weight,
                        description: refImg.description,
                        keypoints: keypoints,
                        descriptors: descriptors.clone(),
                        originalMat: gray.clone()
                    });
                }
                
                // Cleanup
                mat.delete();
                gray.delete();
                descriptors.delete();
                
            } catch (error) {
                console.error(`Failed to process reference image: ${refImg.path}`, error);
            }
        }
        
        this.referenceFeatures.set(productId, productFeatures);
        console.log(`Preprocessed ${productFeatures.length} reference images for ${productId}`);
        
        return productFeatures.length > 0;
    }
    
    /**
     * Match current camera frame against product references
     */
    async matchFrame(cameraFrame, productConfigs) {
        if (!this.isInitialized) await this.init();
        
        try {
            // Convert camera frame to OpenCV mat
            const frameMat = this.cv.matFromImageData(cameraFrame);
            const frameGray = new this.cv.Mat();
            this.cv.cvtColor(frameMat, frameGray, this.cv.COLOR_RGBA2GRAY);
            
            // Use feature matching if ORB is available, otherwise basic template matching
            if (this.detector && this.matcher) {
                return await this._featureBasedMatching(frameGray, frameMat, productConfigs);
            } else {
                return await this._basicTemplateMatching(frameGray, frameMat, productConfigs);
            }
            
        } catch (error) {
            console.error('Frame matching failed:', error);
            return null;
        }
    }
    
    async _featureBasedMatching(frameGray, frameMat, productConfigs) {
        // Extract features from current frame
        const frameKeypoints = new this.cv.KeyPointVector();
        const frameDescriptors = new this.cv.Mat();
        
        this.detector.detectAndCompute(frameGray, new this.cv.Mat(), frameKeypoints, frameDescriptors);
        
        console.log(`Frame features detected: ${frameKeypoints.size()}, descriptors: ${frameDescriptors.rows}`);
        
        if (frameDescriptors.rows === 0) {
            // No features detected in frame
            console.log('No features detected in current frame');
            frameGray.delete();
            frameMat.delete();
            frameDescriptors.delete();
            return null;
        }
        
        let bestMatch = null;
        let bestConfidence = 0;
        
        // Test against all products
        for (const product of productConfigs) {
            const productFeatures = this.referenceFeatures.get(product.id);
            if (!productFeatures) continue;
            
            const productResult = await this._matchAgainstProduct(
                frameDescriptors, 
                frameKeypoints,
                product,
                productFeatures
            );
            
            if (productResult) {
                console.log(`Product ${product.id}: confidence ${productResult.confidence.toFixed(3)}, threshold ${product.detection.confidence_threshold}`);
                if (productResult.confidence > bestConfidence && 
                    productResult.confidence > product.detection.confidence_threshold) {
                    bestMatch = productResult;
                    bestConfidence = productResult.confidence;
                }
            }
        }
        
        // Cleanup
        frameMat.delete();
        frameGray.delete();
        frameDescriptors.delete();
        frameKeypoints.delete();
        
        return bestMatch;
    }
    
    async _matchAgainstProduct(frameDescriptors, frameKeypoints, product, productFeatures) {
        let totalConfidence = 0;
        let weightSum = 0;
        let bestImageMatch = null;
        let matchDetails = [];
        
        for (const refFeature of productFeatures) {
            try {
                // Match descriptors
                const matches = new this.cv.DMatchVector();
                this.matcher.match(frameDescriptors, refFeature.descriptors, matches);
                
                console.log(`Matches found for ${refFeature.id}: ${matches.size()}`);
                if (matches.size() === 0) continue;
                
                // Filter good matches using ratio test
                const goodMatches = [];
                const matchArray = [];
                
                for (let i = 0; i < matches.size(); i++) {
                    matchArray.push(matches.get(i));
                }
                
                // Sort by distance
                matchArray.sort((a, b) => a.distance - b.distance);
                
                // Apply ratio test (much more lenient for better matching)
                const ratioThreshold = 0.9;
                for (let i = 0; i < Math.min(matchArray.length - 1, 100); i++) {
                    if (matchArray[i].distance < ratioThreshold * matchArray[i + 1].distance) {
                        goodMatches.push(matchArray[i]);
                    }
                }
                
                console.log(`Good matches for ${refFeature.id}: ${goodMatches.length}`);
                if (goodMatches.length >= 3) { // Very low minimum matches required
                    // Calculate confidence based on match quality
                    const avgDistance = goodMatches.reduce((sum, match) => sum + match.distance, 0) / goodMatches.length;
                    const normalizedDistance = Math.max(0, 1 - (avgDistance / 256)); // Normalize to 0-1
                    const matchRatio = goodMatches.length / Math.min(frameKeypoints.size(), refFeature.keypoints.size());
                    
                    const imageConfidence = (normalizedDistance * 0.7 + matchRatio * 0.3) * refFeature.weight;
                    console.log(`${refFeature.id}: avgDist=${avgDistance.toFixed(1)}, normDist=${normalizedDistance.toFixed(3)}, ratio=${matchRatio.toFixed(3)}, conf=${imageConfidence.toFixed(3)}`);
                    
                    totalConfidence += imageConfidence;
                    weightSum += refFeature.weight;
                    
                    matchDetails.push({
                        referenceId: refFeature.id,
                        matches: goodMatches.length,
                        confidence: imageConfidence,
                        avgDistance: avgDistance
                    });
                    
                    if (!bestImageMatch || imageConfidence > bestImageMatch.confidence) {
                        bestImageMatch = {
                            referenceId: refFeature.id,
                            confidence: imageConfidence,
                            matches: goodMatches,
                            keypoints: refFeature.keypoints
                        };
                    }
                }
                
                matches.delete();
                
            } catch (error) {
                console.error(`Error matching against reference ${refFeature.id}:`, error);
            }
        }
        
        if (weightSum === 0) return null;
        
        const finalConfidence = totalConfidence / weightSum;
        
        return {
            productId: product.id,
            productName: product.name,
            confidence: finalConfidence,
            matchDetails: matchDetails,
            bestImageMatch: bestImageMatch,
            type: product.type
        };
    }
    
    /**
     * Load image from URL
     */
    async _loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }
    
    /**
     * Get detection statistics
     */
    getStats() {
        return {
            initialized: this.isInitialized,
            loadedProducts: this.referenceFeatures.size,
            detectorType: 'ORB',
            matcherType: 'FLANN'
        };
    }
    
    /**
     * Cleanup resources
     */
    cleanup() {
        // Cleanup reference features
        for (const [productId, features] of this.referenceFeatures) {
            for (const feature of features) {
                if (feature.keypoints) feature.keypoints.delete();
                if (feature.descriptors) feature.descriptors.delete();
                if (feature.originalMat) feature.originalMat.delete();
            }
        }
        
        this.referenceFeatures.clear();
        
        if (this.detector) {
            this.detector.delete();
            this.detector = null;
        }
        
        if (this.matcher) {
            this.matcher.delete();
            this.matcher = null;
        }
        
        this.isInitialized = false;
    }
}