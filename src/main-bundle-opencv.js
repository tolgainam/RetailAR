/**
 * RetailAR Main Bundle with OpenCV.js Template Matching
 * Enhanced version with advanced computer vision
 */

(function() {
    'use strict';

    // Global state
    let openCVReady = false;

    // OpenCV ready callback
    window.onOpenCvReady = function() {
        openCVReady = true;
        console.log('✅ OpenCV.js loaded successfully');
        if (window.retailAR && window.retailAR.onOpenCVReady) {
            window.retailAR.onOpenCVReady();
        }
    };

    // Check dependencies
    if (typeof THREE === 'undefined') {
        console.error('THREE.js not loaded');
        return;
    }
    if (typeof QrScanner === 'undefined') {
        console.error('QrScanner not loaded');
        return;
    }

    // Template Matcher with OpenCV.js
    class TemplateMatcher {
        constructor() {
            this.cv = null;
            this.isInitialized = false;
            this.referenceFeatures = new Map();
            this.detector = null;
            this.matcher = null;
        }
        
        async init() {
            if (this.isInitialized) return;
            
            if (!openCVReady || typeof cv === 'undefined') {
                console.log('⏳ Waiting for OpenCV.js to load...');
                return new Promise((resolve) => {
                    const checkCV = () => {
                        if (openCVReady && typeof cv !== 'undefined') {
                            this._initializeCV();
                            resolve();
                        } else {
                            setTimeout(checkCV, 100);
                        }
                    };
                    checkCV();
                });
            }
            
            this._initializeCV();
        }
        
        _initializeCV() {
            try {
                this.cv = cv;
                
                // Use template matching instead of feature detection
                // This is more reliable and available in all OpenCV.js builds
                console.log('Using template matching method');
                
                this.isInitialized = true;
                console.log('✅ OpenCV Template Matcher initialized');
                
            } catch (error) {
                console.error('❌ Failed to initialize OpenCV:', error);
                throw error;
            }
        }
        
        async preprocessReferenceImages(productId, referenceImages) {
            if (!this.isInitialized) await this.init();
            
            const productFeatures = [];
            
            for (const refImg of referenceImages) {
                try {
                    console.log(`🔍 Processing reference image: ${refImg.path}`);
                    
                    // Load image
                    const img = await this._loadImage(refImg.path);
                    const mat = this.cv.imread(img);
                    
                    // Convert to grayscale
                    const gray = new this.cv.Mat();
                    this.cv.cvtColor(mat, gray, this.cv.COLOR_RGBA2GRAY);
                    
                    // Resize template to a reasonable size for matching (max 300x300)
                    const resized = new this.cv.Mat();
                    const maxSize = 300;
                    let newWidth = gray.cols;
                    let newHeight = gray.rows;
                    
                    if (gray.cols > maxSize || gray.rows > maxSize) {
                        const scale = Math.min(maxSize / gray.cols, maxSize / gray.rows);
                        newWidth = Math.floor(gray.cols * scale);
                        newHeight = Math.floor(gray.rows * scale);
                    }
                    
                    const dsize = new this.cv.Size(newWidth, newHeight);
                    this.cv.resize(gray, resized, dsize, 0, 0, this.cv.INTER_AREA);
                    
                    // Store reference image for template matching
                    productFeatures.push({
                        id: refImg.id,
                        weight: refImg.weight,
                        description: refImg.description,
                        templateMat: resized.clone(),
                        originalMat: mat.clone()
                    });
                    
                    resized.delete();
                    
                    console.log(`✅ Stored template for ${refImg.id}`);
                    
                    // Cleanup temporary mats
                    mat.delete();
                    gray.delete();
                    
                } catch (error) {
                    console.error(`❌ Failed to process ${refImg.path}:`, error);
                }
            }
            
            this.referenceFeatures.set(productId, productFeatures);
            console.log(`📦 Loaded ${productFeatures.length} reference features for ${productId}`);
            
            return productFeatures.length > 0;
        }
        
        async matchFrame(cameraFrame, productConfigs) {
            if (!this.isInitialized) await this.init();
            
            try {
                // Convert camera frame to OpenCV Mat
                const frameMat = this._imageDataToMat(cameraFrame);
                const frameGray = new this.cv.Mat();
                this.cv.cvtColor(frameMat, frameGray, this.cv.COLOR_RGBA2GRAY);
                
                let bestMatch = null;
                let bestConfidence = 0;
                
                // Test against all products using template matching
                for (const product of productConfigs) {
                    const productFeatures = this.referenceFeatures.get(product.id);
                    if (!productFeatures) continue;
                    
                    const productResult = await this._matchAgainstProductTemplate(
                        frameGray,
                        product,
                        productFeatures
                    );
                    
                    if (productResult && productResult.confidence > bestConfidence && 
                        productResult.confidence > product.detection.confidence_threshold) {
                        bestMatch = productResult;
                        bestConfidence = productResult.confidence;
                    }
                }
                
                // Cleanup
                frameMat.delete();
                frameGray.delete();
                
                return bestMatch;
                
            } catch (error) {
                console.error('❌ OpenCV frame matching failed:', error);
                return null;
            }
        }
        
        async _matchAgainstProductTemplate(frameGray, product, productFeatures) {
            let totalConfidence = 0;
            let weightSum = 0;
            let bestImageMatch = null;
            let matchDetails = [];
            
            for (const refFeature of productFeatures) {
                try {
                    // Check if template is smaller than the frame
                    if (refFeature.templateMat.rows > frameGray.rows || 
                        refFeature.templateMat.cols > frameGray.cols) {
                        console.log(`Template ${refFeature.id} too large for frame, skipping`);
                        continue;
                    }
                    
                    // Perform template matching
                    const result = new this.cv.Mat();
                    this.cv.matchTemplate(frameGray, refFeature.templateMat, result, this.cv.TM_CCOEFF_NORMED);
                    
                    // Find the best match location
                    const minMaxLoc = this.cv.minMaxLoc(result);
                    const maxVal = minMaxLoc.maxVal;
                    
                    // Debug: Log match values
                    console.log(`Template ${refFeature.id}: match value = ${maxVal.toFixed(3)}`);
                    
                    // Much higher threshold to prevent false matches with faces/backgrounds
                    if (maxVal > 0.40) {
                        const imageConfidence = maxVal * refFeature.weight;
                        
                        totalConfidence += imageConfidence;
                        weightSum += refFeature.weight;
                        
                        matchDetails.push({
                            referenceId: refFeature.id,
                            confidence: imageConfidence,
                            matchValue: maxVal,
                            location: minMaxLoc.maxLoc
                        });
                        
                        if (!bestImageMatch || imageConfidence > bestImageMatch.confidence) {
                            bestImageMatch = {
                                referenceId: refFeature.id,
                                confidence: imageConfidence,
                                matchValue: maxVal,
                                location: minMaxLoc.maxLoc
                            };
                        }
                    }
                    
                    result.delete();
                    
                } catch (error) {
                    console.error(`Error matching against ${refFeature.id}:`, error);
                }
            }
            
            if (weightSum === 0 || matchDetails.length < 2) {
                console.log(`Product ${product.id}: insufficient matches (${matchDetails.length} matches, need at least 2)`);
                return null;
            }
            
            const overallConfidence = totalConfidence / weightSum;
            
            console.log(`Product ${product.id}: overall confidence = ${overallConfidence.toFixed(3)} (weightSum: ${weightSum}, totalConfidence: ${totalConfidence.toFixed(3)}, matches: ${matchDetails.length})`);
            
            return {
                productId: product.id,
                confidence: overallConfidence,
                bestMatch: bestImageMatch,
                matchDetails: matchDetails
            };
        }

        async _matchAgainstProductOld(frameDescriptors, frameKeypoints, product, productFeatures) {
            let totalConfidence = 0;
            let weightSum = 0;
            let bestImageMatch = null;
            let matchDetails = [];
            
            for (const refFeature of productFeatures) {
                try {
                    // Match descriptors
                    const matches = new this.cv.DMatchVector();
                    this.matcher.match(frameDescriptors, refFeature.descriptors, matches);
                    
                    if (matches.size() === 0) continue;
                    
                    // Sort matches by distance (lower is better)
                    const matchArray = [];
                    for (let i = 0; i < matches.size(); i++) {
                        matchArray.push(matches.get(i));
                    }
                    
                    matchArray.sort((a, b) => a.distance - b.distance);
                    
                    // Filter good matches (distance threshold)
                    const goodMatches = matchArray.filter(match => match.distance < 50);
                    
                    if (goodMatches.length >= 8) { // Minimum matches required
                        // Calculate confidence based on match quality
                        const avgDistance = goodMatches.reduce((sum, match) => sum + match.distance, 0) / goodMatches.length;
                        const normalizedDistance = Math.max(0, 1 - (avgDistance / 100)); // Normalize to 0-1
                        const matchRatio = goodMatches.length / Math.min(frameKeypoints.size(), refFeature.keypoints.size());
                        
                        const imageConfidence = (normalizedDistance * 0.7 + matchRatio * 0.3) * refFeature.weight;
                        
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
                        
                        console.log(`🎯 ${product.id} - ${refFeature.id}: ${goodMatches.length} matches, conf: ${imageConfidence.toFixed(3)}`);
                    }
                    
                    matches.delete();
                    
                } catch (error) {
                    console.error(`❌ Error matching against reference ${refFeature.id}:`, error);
                }
            }
            
            if (weightSum === 0) return null;
            
            const finalConfidence = totalConfidence / weightSum;
            
            if (finalConfidence > 0.3) { // Only log significant matches
                console.log(`🎯 ${product.id} final confidence: ${finalConfidence.toFixed(3)}`);
            }
            
            return {
                productId: product.id,
                productName: product.name,
                confidence: finalConfidence,
                matchDetails: matchDetails,
                bestImageMatch: bestImageMatch,
                type: product.type
            };
        }
        
        _imageDataToMat(imageData) {
            const mat = new this.cv.Mat(imageData.height, imageData.width, this.cv.CV_8UC4);
            mat.data.set(imageData.data);
            return mat;
        }
        
        async _loadImage(src) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = src;
            });
        }
        
        getStats() {
            return {
                initialized: this.isInitialized,
                loadedProducts: this.referenceFeatures.size,
                detectorType: 'OpenCV ORB',
                matcherType: 'BFMatcher'
            };
        }
        
        cleanup() {
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

    // Simple Product Detector (copy from previous version)
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

    // Product Loader (same as before)
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

    // Enhanced Product Detector with Template Matching
    class ProductDetector {
        constructor(productLoader) {
            this.productLoader = productLoader;
            this.templateMatcher = new TemplateMatcher();
            this.simpleDetector = new SimpleDetector();
            this.currentMethod = 'template';
            this.isInitialized = false;
            this.detectionStats = {
                totalDetections: 0,
                successfulDetections: 0,
                averageConfidence: 0,
                methodUsage: {
                    simple: 0,
                    template: 0
                }
            };
        }
        
        async init() {
            if (this.isInitialized) return;
            
            try {
                const appConfig = this.productLoader.getAppConfig();
                this.currentMethod = appConfig.app_settings.detection_method;
                
                // Initialize both detectors
                await this.simpleDetector.init();
                console.log('✅ Simple detector ready');
                
                await this.templateMatcher.init();
                console.log('✅ Template matcher ready');
                
                // Load reference images for both detectors
                const products = this.productLoader.getAllProducts();
                for (const product of products) {
                    await this.simpleDetector.loadReferenceImages(
                        product.id, 
                        product.detection.reference_images
                    );
                    
                    await this.templateMatcher.preprocessReferenceImages(
                        product.id, 
                        product.detection.reference_images
                    );
                }
                
                this.isInitialized = true;
                console.log(`✅ Product detector initialized with method: ${this.currentMethod}`);
                
            } catch (error) {
                console.error('❌ Failed to initialize product detector:', error);
                throw error;
            }
        }
        
        onOpenCVReady() {
            if (this.currentMethod === 'template' && this.templateMatcher && !this.templateMatcher.isInitialized) {
                console.log('🔄 Re-initializing template matcher with OpenCV...');
                this.templateMatcher.init();
            }
        }
        
        async detectProducts(cameraFrame) {
            if (!this.isInitialized) await this.init();
            
            this.detectionStats.totalDetections++;
            
            try {
                let result = null;
                const products = this.productLoader.getAllProducts();
                
                switch (this.currentMethod) {
                    case 'simple':
                        result = await this.simpleDetector.detectProducts(cameraFrame, products);
                        this.detectionStats.methodUsage.simple++;
                        break;
                        
                    case 'template':
                        result = await this.templateMatcher.matchFrame(cameraFrame, products);
                        this.detectionStats.methodUsage.template++;
                        break;
                }
                
                if (result) {
                    this.detectionStats.successfulDetections++;
                    this._updateAverageConfidence(result.confidence);
                    
                    result.detectionMethod = this.currentMethod;
                    result.timestamp = Date.now();
                    result.productConfig = this.productLoader.getProduct(result.productId);
                }
                
                return result;
                
            } catch (error) {
                console.error('❌ Product detection failed:', error);
                return null;
            }
        }
        
        async setDetectionMethod(method) {
            if (!['simple', 'template'].includes(method)) {
                throw new Error(`Invalid detection method: ${method}`);
            }
            
            this.currentMethod = method;
            this.productLoader.setDetectionMethod(method);
            
            // Initialize template matcher if switching to it and OpenCV is ready
            if (method === 'template' && !this.templateMatcher.isInitialized && openCVReady) {
                await this.templateMatcher.init();
            }
            
            console.log(`✅ Detection method switched to: ${method}`);
        }
        
        _updateAverageConfidence(newConfidence) {
            const total = this.detectionStats.successfulDetections;
            const current = this.detectionStats.averageConfidence;
            this.detectionStats.averageConfidence = ((current * (total - 1)) + newConfidence) / total;
        }
        
        getStats() {
            const successRate = this.detectionStats.totalDetections > 0 ? 
                (this.detectionStats.successfulDetections / this.detectionStats.totalDetections) * 100 : 0;
            
            return {
                ...this.detectionStats,
                successRate: successRate.toFixed(1) + '%',
                currentMethod: this.currentMethod,
                templateStats: this.templateMatcher.getStats(),
                simpleStats: this.simpleDetector.getStats()
            };
        }
        
        cleanup() {
            this.templateMatcher.cleanup();
            this.simpleDetector.cleanup();
            this.isInitialized = false;
        }
    }

    // Main RetailAR Application (same structure as before but with enhanced detector)
    class RetailAR {
        constructor() {
            this.qrScanner = null;
            this.productLoader = new ProductLoader();
            this.productDetector = null;
            this.currentMode = 'idle';
            this.detectionInterval = null;
            this.isProcessing = false;
            
            // Detection stability tracking
            this.lastDetectedProduct = null;
            this.detectionConfirmCount = 0;
            this.noDetectionCount = 0;
            this.requiredConfirmations = 3; // Need 3 consecutive detections to show
            this.hideDelay = 5; // Hide after 5 consecutive non-detections
            
            this.init();
        }
        
        async init() {
            try {
                console.log('🚀 Initializing RetailAR with OpenCV Template Matching...');
                
                await this.productLoader.init();
                console.log('📦 Product configurations loaded');
                
                this.productDetector = new ProductDetector(this.productLoader);
                console.log('🔍 Detection system initialized');
                
                this.setupEventListeners();
                await this.setupCamera();
                
                console.log('✅ RetailAR with OpenCV initialized successfully!');
                this.showStatus('RetailAR Ready - Template Matching Active!', 'success');
                
            } catch (error) {
                console.error('❌ Failed to initialize RetailAR:', error);
                this.showError(`Initialization failed: ${error.message}`);
            }
        }
        
        onOpenCVReady() {
            if (this.productDetector) {
                this.productDetector.onOpenCVReady();
            }
        }
        
        setupEventListeners() {
            document.getElementById('start-qr-scan').addEventListener('click', () => {
                console.log('🔘 Start QR Scan button clicked');
                this.startQRScan();
            });
            document.getElementById('start-product-scan').addEventListener('click', () => {
                console.log('🔘 Start Product Scan button clicked');
                this.startProductScan();
            });
            document.getElementById('stop-scan').addEventListener('click', () => {
                console.log('🔘 Stop Scan button clicked');
                this.stopScan();
            });
            
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
                console.log(`🔍 Starting product scanning with ${this.productDetector?.currentMethod || 'template'} method...`);
                this.currentMode = 'product-scanning';
                
                if (!this.productDetector.isInitialized) {
                    await this.productDetector.init();
                }
                
                this.startDetectionLoop();
                this.updateUI('product-scanning');
                this.showStatus(`${this.productDetector.currentMethod.toUpperCase()} detection active - Point camera at ZYN cans`, 'info');
                
            } catch (error) {
                console.error('Failed to start product scanning:', error);
                this.showError('Failed to start product scanning.');
            }
        }
        
        stopScan() {
            console.log('⏹ Stopping scan...');
            this.currentMode = 'idle';
            
            // Reset detection stability tracking
            this.lastDetectedProduct = null;
            this.detectionConfirmCount = 0;
            this.noDetectionCount = 0;
            
            if (this.qrScanner) {
                this.qrScanner.stop();
                this.qrScanner.destroy();
                this.qrScanner = null;
            }
            
            this.stopDetectionLoop();
            this.closeProductInfo();
            this.hideAllAR();
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
                        
                        this.handleDetectionStability(result);
                    }
                    
                } catch (detectionError) {
                    console.error('Detection loop error:', detectionError);
                } finally {
                    this.isProcessing = false;
                }
            }, 800); // Slightly faster detection for better responsiveness
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
        
        handleDetectionStability(result) {
            if (result) {
                // Product detected - check if it's the same as before
                if (this.lastDetectedProduct === result.productId) {
                    this.detectionConfirmCount++;
                    this.noDetectionCount = 0; // Reset no-detection counter
                    
                    // Show AR only after enough confirmations
                    if (this.detectionConfirmCount >= this.requiredConfirmations) {
                        this.showProductAR(result);
                    } else {
                        console.log(`Detection confirmation ${this.detectionConfirmCount}/${this.requiredConfirmations} for ${result.productId}`);
                    }
                } else {
                    // Different product detected - reset counters
                    console.log(`Product changed from ${this.lastDetectedProduct} to ${result.productId}`);
                    this.lastDetectedProduct = result.productId;
                    this.detectionConfirmCount = 1;
                    this.noDetectionCount = 0;
                    this.hideAllAR(); // Hide previous product immediately
                }
            } else {
                // No product detected
                this.detectionConfirmCount = 0;
                this.noDetectionCount++;
                
                // Hide AR only after enough no-detections
                if (this.noDetectionCount >= this.hideDelay && this.lastDetectedProduct) {
                    console.log(`No detection for ${this.noDetectionCount} frames - hiding AR`);
                    this.hideAllAR();
                    this.lastDetectedProduct = null;
                }
            }
        }
        
        showProductAR(result) {
            console.log('🎯 Stable detection - showing AR for:', result.productId);
            
            this.showCombinedProductInfo(result.productConfig, result);
            this.show3DARModel(result.productConfig, result.bestMatch);
            this.showParticleEffect(result.productConfig);
        }
        
        hideAllAR() {
            const overlay = document.getElementById('combined-product-overlay');
            if (overlay) overlay.remove();
            
            this.hide3DARModel();
            this.hideParticleEffect();
        }
        
        async handleProductDetection(result) {
            // Legacy method - keeping for compatibility but routing through stability handler
            if (result) {
                this.showProductAR(result);
            }
        }
        
        showEnhancedAROverlay(product) {
            // Enhanced overlay with detection method info
            const overlay = document.createElement('div');
            overlay.id = 'enhanced-ar-overlay';
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
                animation: templatePulse 2s ease-in-out infinite;
            `;
            
            overlay.innerHTML = `
                <h2>${product.name}</h2>
                <p>🔍 OpenCV Template Matching Active!</p>
                <small>Advanced feature detection</small>
                <br><br>
                <button onclick="document.getElementById('enhanced-ar-overlay').remove()" 
                        style="margin-top: 10px; padding: 8px 16px; background: white; color: #333; border: none; border-radius: 5px; cursor: pointer;">
                    Close AR
                </button>
            `;
            
            // Add enhanced pulsing animation
            if (!document.querySelector('#template-animation-style')) {
                const style = document.createElement('style');
                style.id = 'template-animation-style';
                style.textContent = `
                    @keyframes templatePulse {
                        0% { transform: translate(-50%, -50%) scale(1); box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
                        50% { transform: translate(-50%, -50%) scale(1.05); box-shadow: 0 15px 40px rgba(0,0,0,0.7); }
                        100% { transform: translate(-50%, -50%) scale(1); box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
                    }
                `;
                document.head.appendChild(style);
            }
            
            document.body.appendChild(overlay);
            
            setTimeout(() => {
                if (overlay.parentNode) {
                    overlay.remove();
                }
            }, 6000);
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
        
        showCombinedProductInfo(product, result) {
            // Check if overlay already exists for this product - don't recreate
            const existingOverlay = document.getElementById('combined-product-overlay');
            if (existingOverlay && existingOverlay.dataset.productId === product.id) {
                return; // Don't recreate the same card
            }
            
            // Remove existing overlays
            if (existingOverlay) existingOverlay.remove();
            
            // Create combined overlay positioned below the camera view
            const overlay = document.createElement('div');
            overlay.id = 'combined-product-overlay';
            overlay.dataset.productId = product.id; // Track which product this card is for
            overlay.style.cssText = `
                position: fixed;
                bottom: 120px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, ${product.visual.material_overrides.primary_color}, ${product.visual.material_overrides.secondary_color});
                color: white;
                padding: 20px;
                border-radius: 15px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                backdrop-filter: blur(10px);
                z-index: 1001;
                max-width: 90%;
                width: 400px;
                font-family: Arial, sans-serif;
                animation: slideUp 0.3s ease-out;
            `;
            
            // Build detailed information
            let detailsHTML = '';
            if (product.info_card.details) {
                for (const [key, value] of Object.entries(product.info_card.details)) {
                    detailsHTML += `<div style="margin-bottom: 5px;"><strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong> ${value}</div>`;
                }
            }
            
            overlay.innerHTML = `
                <div style="text-align: center; margin-bottom: 15px;">
                    <h2 style="margin: 0 0 10px 0; font-size: 1.4rem;">${product.name}</h2>
                    <p style="margin: 0 0 15px 0; opacity: 0.9; font-size: 0.9rem;">${product.info_card.description}</p>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div style="font-size: 0.8rem; line-height: 1.4;">
                        ${detailsHTML}
                    </div>
                    <div style="font-size: 0.8rem; line-height: 1.4;">
                        <div style="margin-bottom: 5px;"><strong>🎯 Product:</strong> ${product.name}</div>
                        <div style="margin-bottom: 5px;"><strong>🔍 Method:</strong> ${result.detectionMethod?.toUpperCase() || 'TEMPLATE'}</div>
                        <div style="margin-bottom: 5px;"><strong>📊 Confidence:</strong> ${(result.confidence * 100).toFixed(1)}%</div>
                        <div style="margin-bottom: 5px;"><strong>🖼️ Matches:</strong> ${result.matchDetails?.length || 0}</div>
                    </div>
                </div>
                
                <div style="text-align: center;">
                    <button onclick="window.open('${product.interactions.virtual_buttons[0]?.action.target}', '_blank')" 
                            style="background: rgba(255,255,255,0.2); border: 1px solid white; color: white; padding: 8px 16px; border-radius: 5px; margin: 0 5px; cursor: pointer; font-size: 0.8rem;">
                        Learn More
                    </button>
                    <button onclick="window.open('${product.interactions.virtual_buttons[1]?.action.target}', '_blank')" 
                            style="background: rgba(255,255,255,0.3); border: 1px solid white; color: white; padding: 8px 16px; border-radius: 5px; margin: 0 5px; cursor: pointer; font-size: 0.8rem;">
                        Buy Now
                    </button>
                    <button onclick="document.getElementById('combined-product-overlay').remove()" 
                            style="background: rgba(255,255,255,0.1); border: 1px solid white; color: white; padding: 8px 16px; border-radius: 5px; margin: 0 5px; cursor: pointer; font-size: 0.8rem;">
                        Close
                    </button>
                </div>
            `;
            
            // Add slide-up animation
            const style = document.createElement('style');
            style.textContent = `
                @keyframes slideUp {
                    from { transform: translateX(-50%) translateY(100%); opacity: 0; }
                    to { transform: translateX(-50%) translateY(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
            
            document.body.appendChild(overlay);
        }
        
        showDetectionStats(result) {
            const stats = document.getElementById('detection-stats');
            if (stats) {
                const method = result.detectionMethod.toUpperCase();
                const methodIcon = result.detectionMethod === 'template' ? '🔍' : '🎯';
                
                stats.innerHTML = `
                    <div><strong>Product:</strong> ${result.productName}</div>
                    <div><strong>Confidence:</strong> ${(result.confidence * 100).toFixed(1)}%</div>
                    <div><strong>Method:</strong> ${methodIcon} ${method}</div>
                    <div><strong>Type:</strong> ${result.type}</div>
                    ${result.matchDetails ? `<div><strong>Features:</strong> ${result.matchDetails.length} matches</div>` : ''}
                `;
                stats.classList.remove('hidden');
            }
        }
        
        closeProductInfo() {
            document.getElementById('product-info').classList.add('hidden');
            document.getElementById('detection-stats').classList.add('hidden');
            const overlay = document.getElementById('enhanced-ar-overlay');
            if (overlay) overlay.remove();
        }
        
        show3DARModel(product, matchLocation) {
            // Check if 3D model already exists for this product
            const existing = document.getElementById('ar-3d-model');
            if (existing && existing.dataset.productId === product.id) {
                return; // Don't recreate the same model
            }
            
            // Remove existing 3D model
            if (existing) existing.remove();
            
            // Create 3D model container
            const arContainer = document.createElement('div');
            arContainer.id = 'ar-3d-model';
            arContainer.dataset.productId = product.id; // Track which product this model is for
            arContainer.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 300px;
                height: 300px;
                z-index: 1000;
                pointer-events: none;
            `;
            
            // Create 3D model placeholder with actual model path reference
            const model = document.createElement('div');
            model.style.cssText = `
                width: 100%;
                height: 100%;
                background: linear-gradient(45deg, ${product.visual.material_overrides.primary_color}, ${product.visual.material_overrides.secondary_color});
                border-radius: 50px;
                transform-style: preserve-3d;
                animation: rotate3D 4s linear infinite, float3D 2s ease-in-out infinite alternate;
                box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                position: relative;
            `;
            
            // Add model info overlay
            const modelInfo = document.createElement('div');
            modelInfo.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: white;
                text-align: center;
                font-size: 12px;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
            `;
            modelInfo.innerHTML = `
                <div>🎯 3D Model</div>
                <div>${product.visual['3d_model']}</div>
            `;
            model.appendChild(modelInfo);
            
            // Add 3D rotation and float animations
            const style = document.createElement('style');
            style.textContent = `
                @keyframes rotate3D {
                    0% { transform: rotateY(0deg) rotateX(10deg); }
                    100% { transform: rotateY(360deg) rotateX(10deg); }
                }
                @keyframes float3D {
                    0% { transform: translateY(0px) scale(0.9); }
                    100% { transform: translateY(-20px) scale(1.1); }
                }
            `;
            document.head.appendChild(style);
            
            arContainer.appendChild(model);
            document.body.appendChild(arContainer);
            
            console.log('🎯 3D AR model displayed');
        }
        
        hide3DARModel() {
            const model = document.getElementById('ar-3d-model');
            if (model) {
                model.remove();
            }
        }
        
        showParticleEffect(product) {
            // Remove existing particles
            const existing = document.getElementById('ar-particles');
            if (existing) existing.remove();
            
            // Create particle container
            const particleContainer = document.createElement('div');
            particleContainer.id = 'ar-particles';
            particleContainer.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 999;
                pointer-events: none;
                overflow: hidden;
            `;
            
            // Create particles based on product config
            const particleConfig = product.animations.flavor_effect;
            for (let i = 0; i < particleConfig.particle_count; i++) {
                const particle = document.createElement('div');
                particle.style.cssText = `
                    position: absolute;
                    width: ${Math.random() * 8 + 4}px;
                    height: ${Math.random() * 8 + 4}px;
                    background: ${particleConfig.color};
                    border-radius: 50%;
                    opacity: ${Math.random() * 0.8 + 0.2};
                    left: ${Math.random() * 100}%;
                    top: 100%;
                    animation: floatUp ${Math.random() * 3 + 2}s linear infinite;
                    animation-delay: ${Math.random() * 2}s;
                `;
                particleContainer.appendChild(particle);
            }
            
            // Add particle animation
            const particleStyle = document.createElement('style');
            particleStyle.textContent = `
                @keyframes floatUp {
                    0% { 
                        transform: translateY(0px) translateX(0px);
                        opacity: 0;
                    }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { 
                        transform: translateY(-100vh) translateX(${Math.random() * 200 - 100}px);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(particleStyle);
            
            document.body.appendChild(particleContainer);
            
            console.log(`🎆 Particle effect: ${particleConfig.effect} with ${particleConfig.particle_count} particles`);
            
            // Auto-remove particles after duration
            setTimeout(() => {
                if (particleContainer.parentNode) {
                    particleContainer.remove();
                }
            }, particleConfig.duration);
        }
        
        hideParticleEffect() {
            const particles = document.getElementById('ar-particles');
            if (particles) {
                particles.remove();
            }
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
            const currentMethod = this.productDetector?.currentMethod || 'template';
            
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
                    this.showStatus(`Switched to ${method.toUpperCase()} detection`, 'success');
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