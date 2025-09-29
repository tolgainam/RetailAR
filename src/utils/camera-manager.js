/**
 * Camera Manager
 * Handles video stream access and camera controls
 */

export class CameraManager {
    constructor() {
        this.stream = null;
        this.videoElement = null;
        this.constraints = {
            video: {
                facingMode: { ideal: 'environment' }, // Prefer back camera
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        };
        
        console.log('📹 Camera Manager initialized');
    }
    
    async initialize() {
        try {
            console.log('📹 Starting camera initialization...');

            // Get video element from DOM
            this.videoElement = document.getElementById('camera-feed');

            if (!this.videoElement) {
                throw new Error('Video element not found');
            }
            console.log('✅ Video element found');

            // Check if getUserMedia is available
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera access not supported by this browser');
            }
            console.log('✅ getUserMedia supported');

            // Check available devices for debugging
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(device => device.kind === 'videoinput');
                console.log(`📹 Found ${videoDevices.length} video devices:`, videoDevices.map(d => d.label || 'Unknown camera'));
            } catch (e) {
                console.warn('⚠️ Could not enumerate devices:', e);
            }

            console.log('📹 Requesting camera access with constraints:', this.constraints);

            // Request camera access
            this.stream = await navigator.mediaDevices.getUserMedia(this.constraints);
            console.log('✅ Camera stream obtained');

            // Set up video element
            this.videoElement.srcObject = this.stream;
            console.log('✅ Video stream attached to element');

            // Wait for video to be ready
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Video metadata loading timeout (10s)'));
                }, 10000); // 10 second timeout

                this.videoElement.onloadedmetadata = () => {
                    clearTimeout(timeout);
                    console.log(`✅ Video metadata loaded: ${this.videoElement.videoWidth}x${this.videoElement.videoHeight}`);
                    resolve();
                };

                this.videoElement.onerror = (error) => {
                    clearTimeout(timeout);
                    console.error('❌ Video element error:', error);
                    reject(new Error('Failed to load camera stream'));
                };
            });
            
            // Start playing
            console.log('📹 Starting video playback...');
            await this.videoElement.play();
            console.log('✅ Video is playing');

            console.log('✅ Camera initialized successfully');
            console.log(`📐 Video resolution: ${this.videoElement.videoWidth}x${this.videoElement.videoHeight}`);

            return true;

        } catch (error) {
            console.error('❌ Camera initialization failed:', error);
            console.error('❌ Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });

            // Handle specific error types with detailed logging
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                console.error('❌ Camera permission denied by user');
                throw new Error('Camera permission denied. Please allow camera access and reload the page.');
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                console.error('❌ No camera device found');
                throw new Error('No camera found. Please ensure your device has a camera.');
            } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
                throw new Error('Camera is already in use by another application.');
            } else {
                throw new Error(`Camera access failed: ${error.message}`);
            }
        }
    }
    
    getVideoElement() {
        return this.videoElement;
    }
    
    getStream() {
        return this.stream;
    }
    
    getVideoConstraints() {
        if (!this.stream) return null;
        
        const videoTrack = this.stream.getVideoTracks()[0];
        return videoTrack ? videoTrack.getSettings() : null;
    }
    
    async switchCamera() {
        try {
            if (!this.stream) return false;
            
            // Stop current stream
            this.stream.getTracks().forEach(track => track.stop());
            
            // Toggle camera facing mode
            const currentFacing = this.constraints.video.facingMode.ideal;
            this.constraints.video.facingMode.ideal = 
                currentFacing === 'environment' ? 'user' : 'environment';
            
            // Reinitialize with new constraints
            this.stream = await navigator.mediaDevices.getUserMedia(this.constraints);
            this.videoElement.srcObject = this.stream;
            
            await this.videoElement.play();
            
            console.log(`📹 Switched to ${this.constraints.video.facingMode.ideal} camera`);
            return true;
            
        } catch (error) {
            console.error('❌ Failed to switch camera:', error);
            return false;
        }
    }
    
    async setResolution(width, height) {
        try {
            this.constraints.video.width = { ideal: width };
            this.constraints.video.height = { ideal: height };
            
            // Reinitialize with new resolution
            await this.initialize();
            
            console.log(`📐 Resolution changed to ${width}x${height}`);
            return true;
            
        } catch (error) {
            console.error('❌ Failed to change resolution:', error);
            return false;
        }
    }
    
    takeSnapshot() {
        if (!this.videoElement) return null;
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = this.videoElement.videoWidth;
        canvas.height = this.videoElement.videoHeight;
        
        ctx.drawImage(this.videoElement, 0, 0);
        
        return canvas.toDataURL('image/png');
    }
    
    getVideoFrameAsImageData() {
        if (!this.videoElement) return null;
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = this.videoElement.videoWidth;
        canvas.height = this.videoElement.videoHeight;
        
        ctx.drawImage(this.videoElement, 0, 0);
        
        return ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
    
    isPlaying() {
        return this.videoElement && 
               !this.videoElement.paused && 
               !this.videoElement.ended && 
               this.videoElement.readyState > 2;
    }
    
    pause() {
        if (this.videoElement) {
            this.videoElement.pause();
        }
    }
    
    resume() {
        if (this.videoElement) {
            this.videoElement.play();
        }
    }
    
    destroy() {
        try {
            // Stop all tracks
            if (this.stream) {
                this.stream.getTracks().forEach(track => {
                    track.stop();
                    console.log(`🛑 Stopped ${track.kind} track`);
                });
            }
            
            // Clear video element
            if (this.videoElement) {
                this.videoElement.srcObject = null;
            }
            
            // Reset state
            this.stream = null;
            this.videoElement = null;
            
            console.log('🧹 Camera Manager cleaned up');
            
        } catch (error) {
            console.error('❌ Error during camera cleanup:', error);
        }
    }
}