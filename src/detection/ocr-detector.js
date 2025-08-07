/**
 * OCR (Optical Character Recognition) Detector
 * Uses Tesseract.js to detect text in camera frames and match against product keywords
 */

export class OCRDetector {
    constructor() {
        this.tesseract = null;
        this.worker = null;
        this.isInitialized = false;
        this.productKeywords = new Map(); // productId -> keywords array
        this.detectionStats = {
            totalOCRRequests: 0,
            successfulOCRRequests: 0,
            textMatches: 0,
            averageProcessingTime: 0
        };
    }
    
    /**
     * Initialize Tesseract.js OCR engine
     */
    async init() {
        if (this.isInitialized) return;
        
        try {
            console.log('🔤 Initializing OCR detector...');
            
            // Wait for Tesseract to be available (loaded via ESM in HTML)
            let attempts = 0;
            const maxAttempts = 30; // 15 seconds max wait
            
            while (typeof window.Tesseract === 'undefined' && attempts < maxAttempts) {
                console.log('⏳ Waiting for Tesseract.js to load...');
                await new Promise(resolve => setTimeout(resolve, 500));
                attempts++;
            }
            
            if (typeof window.Tesseract === 'undefined') {
                console.warn('⚠️ Tesseract.js not loaded after 15 seconds, OCR will be disabled');
                this.isInitialized = false;
                return;
            }
            
            console.log('Creating Tesseract worker...');
            
            // Use the global Tesseract instance
            this.worker = await window.Tesseract.createWorker();
            
            console.log('Loading English language data...');
            await this.worker.loadLanguage('eng');
            await this.worker.initialize('eng');
            
            console.log('Setting OCR parameters...');
            await this.worker.setParameters({
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 '
            });
            
            this.isInitialized = true;
            console.log('✅ OCR detector initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize OCR detector:', error);
            console.warn('⚠️ OCR functionality will be disabled');
            this.isInitialized = false;
            this.worker = null;
            // Don't throw error to prevent blocking other detection methods
        }
    }
    
    /**
     * Load Tesseract.js from CDN if not already loaded
     */
    async _loadTesseract() {
        // Since we're loading Tesseract synchronously in HTML, this is just a placeholder
        return Promise.resolve();
    }
    
    /**
     * Load product keywords for text matching
     */
    loadProductKeywords(productId, keywords) {
        if (!keywords || !Array.isArray(keywords)) {
            console.warn(`No keywords provided for product ${productId}`);
            return;
        }
        
        // Convert keywords to lowercase for case-insensitive matching
        const normalizedKeywords = keywords.map(keyword => 
            typeof keyword === 'string' ? keyword.toLowerCase().trim() : String(keyword).toLowerCase().trim()
        ).filter(keyword => keyword.length > 0);
        
        this.productKeywords.set(productId, normalizedKeywords);
        console.log(`📝 Loaded ${normalizedKeywords.length} keywords for product ${productId}:`, normalizedKeywords);
    }
    
    /**
     * Detect text in camera frame and match against product keywords
     */
    async detectProducts(cameraFrame, products) {
        if (!this.isInitialized) {
            await this.init();
            // If still not initialized after init attempt, return null
            if (!this.isInitialized || !this.worker) {
                console.warn('⚠️ OCR not available, skipping text detection');
                return null;
            }
        }
        
        const startTime = Date.now();
        this.detectionStats.totalOCRRequests++;
        
        try {
            // Convert ImageData to canvas for Tesseract
            const canvas = this._imageDataToCanvas(cameraFrame);
            
            // Perform OCR with timeout
            const ocrPromise = this.worker.recognize(canvas);
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('OCR timeout')), 10000); // 10 second timeout
            });
            
            const { data: { text } } = await Promise.race([ocrPromise, timeoutPromise]);
            
            this.detectionStats.successfulOCRRequests++;
            
            // Process recognized text
            const detectedText = text.toLowerCase().trim();
            console.log('🔤 OCR detected text:', detectedText.substring(0, 100) + (detectedText.length > 100 ? '...' : ''));
            
            if (detectedText.length === 0) {
                console.log('📝 No text detected in frame');
                return null;
            }
            
            // Match against product keywords
            const matchResult = this._matchTextAgainstProducts(detectedText, products);
            
            // Update stats
            const processingTime = Date.now() - startTime;
            this._updateAverageProcessingTime(processingTime);
            
            if (matchResult) {
                this.detectionStats.textMatches++;
                console.log(`✅ OCR match found: ${matchResult.productName} (confidence: ${matchResult.confidence.toFixed(3)})`);
            }
            
            return matchResult;
            
        } catch (error) {
            console.error('❌ OCR detection failed:', error);
            return null;
        }
    }
    
    /**
     * Convert ImageData to Canvas element for Tesseract
     */
    _imageDataToCanvas(imageData) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        
        ctx.putImageData(imageData, 0, 0);
        
        return canvas;
    }
    
    /**
     * Match detected text against product keywords
     */
    _matchTextAgainstProducts(detectedText, products) {
        let bestMatch = null;
        let bestConfidence = 0;
        
        for (const product of products) {
            const keywords = this.productKeywords.get(product.id);
            if (!keywords || keywords.length === 0) continue;
            
            const matchResult = this._calculateTextMatchScore(detectedText, keywords, product);
            
            if (matchResult && matchResult.confidence > bestConfidence) {
                // Apply product-specific confidence threshold if available
                const threshold = product.detection?.confidence_threshold || 0.3;
                
                if (matchResult.confidence >= threshold) {
                    bestMatch = matchResult;
                    bestConfidence = matchResult.confidence;
                }
            }
        }
        
        return bestMatch;
    }
    
    /**
     * Calculate confidence score for text match against product keywords
     */
    _calculateTextMatchScore(detectedText, keywords, product) {
        let totalScore = 0;
        let matchedKeywords = 0;
        let matchDetails = [];
        
        for (const keyword of keywords) {
            const matchScore = this._calculateKeywordScore(detectedText, keyword);
            
            if (matchScore > 0) {
                totalScore += matchScore;
                matchedKeywords++;
                matchDetails.push({
                    keyword: keyword,
                    score: matchScore,
                    type: matchScore >= 0.9 ? 'exact' : matchScore >= 0.6 ? 'partial' : 'fuzzy'
                });
            }
        }
        
        if (matchedKeywords === 0) return null;
        
        // Calculate overall confidence
        // Factors: average keyword score, keyword coverage, text length bonus
        const averageScore = totalScore / matchedKeywords;
        const keywordCoverage = matchedKeywords / keywords.length;
        const textLengthBonus = Math.min(detectedText.length / 50, 1) * 0.1; // Small bonus for longer text
        
        const confidence = Math.min(
            (averageScore * 0.7) + (keywordCoverage * 0.2) + textLengthBonus,
            1.0
        );
        
        return {
            productId: product.id,
            productName: product.name,
            confidence: confidence,
            matchedKeywords: matchedKeywords,
            totalKeywords: keywords.length,
            keywordCoverage: keywordCoverage,
            matchDetails: matchDetails,
            detectedText: detectedText.substring(0, 200), // Limit stored text
            type: product.type || 'unknown'
        };
    }
    
    /**
     * Calculate score for individual keyword match
     */
    _calculateKeywordScore(text, keyword) {
        const normalizedText = text.toLowerCase().trim();
        const normalizedKeyword = keyword.toLowerCase().trim();
        
        // Exact match (highest score)
        if (normalizedText.includes(normalizedKeyword)) {
            return 1.0;
        }
        
        // Fuzzy matching for partial matches and typos
        const similarity = this._calculateStringSimilarity(normalizedText, normalizedKeyword);
        
        // Only consider matches above 60% similarity
        return similarity >= 0.6 ? similarity : 0;
    }
    
    /**
     * Calculate string similarity using Levenshtein distance
     */
    _calculateStringSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        // Check for substring match first (more efficient)
        if (longer.includes(shorter)) {
            return 0.8; // High score for substring match
        }
        
        // Calculate Levenshtein distance
        const editDistance = this._levenshteinDistance(str1, str2);
        return (longer.length - editDistance) / longer.length;
    }
    
    /**
     * Calculate Levenshtein distance between two strings
     */
    _levenshteinDistance(str1, str2) {
        const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
        
        for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
        
        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,        // deletion
                    matrix[j - 1][i] + 1,        // insertion
                    matrix[j - 1][i - 1] + indicator // substitution
                );
            }
        }
        
        return matrix[str2.length][str1.length];
    }
    
    /**
     * Update average processing time statistics
     */
    _updateAverageProcessingTime(newTime) {
        const total = this.detectionStats.successfulOCRRequests;
        const current = this.detectionStats.averageProcessingTime;
        this.detectionStats.averageProcessingTime = ((current * (total - 1)) + newTime) / total;
    }
    
    /**
     * Get OCR detection statistics
     */
    getStats() {
        const successRate = this.detectionStats.totalOCRRequests > 0 ? 
            (this.detectionStats.successfulOCRRequests / this.detectionStats.totalOCRRequests) * 100 : 0;
        
        const matchRate = this.detectionStats.successfulOCRRequests > 0 ?
            (this.detectionStats.textMatches / this.detectionStats.successfulOCRRequests) * 100 : 0;
        
        return {
            initialized: this.isInitialized,
            loadedProducts: this.productKeywords.size,
            ocrSuccessRate: successRate.toFixed(1) + '%',
            textMatchRate: matchRate.toFixed(1) + '%',
            averageProcessingTime: this.detectionStats.averageProcessingTime.toFixed(0) + 'ms',
            ...this.detectionStats
        };
    }
    
    /**
     * Get loaded keywords for debugging
     */
    getLoadedKeywords() {
        const result = {};
        for (const [productId, keywords] of this.productKeywords.entries()) {
            result[productId] = keywords;
        }
        return result;
    }
    
    /**
     * Cleanup OCR resources
     */
    async cleanup() {
        if (this.worker) {
            await this.worker.terminate();
            this.worker = null;
        }
        
        this.productKeywords.clear();
        this.isInitialized = false;
    }
}