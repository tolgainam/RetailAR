/**
 * AR Renderer
 * Handles Three.js 3D rendering and AR visualization
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class ARRenderer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.canvas = null;
        
        // 3D models and objects
        this.currentModel = null;
        this.particleSystem = null;
        this.modelLoader = new GLTFLoader();
        
        // Animation
        this.clock = new THREE.Clock();
        this.animationMixer = null;
        this.isAnimating = false;
        
        // AR tracking (simplified - no full AR yet)
        this.modelPosition = new THREE.Vector3(0, 0, -2);
        this.modelScale = new THREE.Vector3(1, 1, 1);
        
        console.log('🎨 AR Renderer initialized');
    }
    
    async initialize() {
        try {
            // Get canvas element
            this.canvas = document.getElementById('three-canvas');
            if (!this.canvas) {
                throw new Error('Three.js canvas not found');
            }
            
            // Set up scene
            this.setupScene();
            
            // Set up camera
            this.setupCamera();
            
            // Set up renderer
            this.setupRenderer();
            
            // Set up lighting
            this.setupLighting();
            
            // Start render loop
            this.startRenderLoop();
            
            // Handle window resize
            this.setupEventListeners();
            
            console.log('✅ AR Renderer initialized');
            return true;
            
        } catch (error) {
            console.error('❌ AR Renderer initialization failed:', error);
            throw error;
        }
    }
    
    setupScene() {
        this.scene = new THREE.Scene();
        
        // Set transparent background for AR overlay
        this.scene.background = null;
        
        console.log('🎬 Scene created');
    }
    
    setupCamera() {
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        this.camera.position.set(0, 0, 0);
        
        console.log('📷 Camera set up');
    }
    
    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance'
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Enable transparency
        this.renderer.setClearColor(0x000000, 0);
        
        // Enable shadows if needed
        this.renderer.shadowMap.enabled = false; // Disabled for performance
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        console.log('🖼️  Renderer set up');
    }
    
    setupLighting() {
        // Ambient light for overall illumination
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        // Directional light for main illumination
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        directionalLight.castShadow = false; // Disabled for performance
        this.scene.add(directionalLight);
        
        // Point light for additional illumination
        const pointLight = new THREE.PointLight(0xffffff, 0.5);
        pointLight.position.set(-5, 3, 2);
        this.scene.add(pointLight);
        
        console.log('💡 Lighting set up');
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.handleResize();
        });
        
        // Orientation change for mobile
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.handleResize();
            }, 100);
        });
    }
    
    handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // Update camera
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        
        // Update renderer
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        console.log(`📐 Renderer resized to ${width}x${height}`);
    }
    
    startRenderLoop() {
        const animate = () => {
            requestAnimationFrame(animate);
            this.render();
        };
        
        animate();
        this.isAnimating = true;
        console.log('🔄 Render loop started');
    }
    
    render() {
        const delta = this.clock.getDelta();
        
        // Update animation mixer
        if (this.animationMixer) {
            this.animationMixer.update(delta);
        }
        
        // Update particle system
        if (this.particleSystem) {
            this.updateParticles(delta);
        }
        
        // Render the scene
        this.renderer.render(this.scene, this.camera);
    }
    
    async showProductVisualization(productConfig) {
        try {
            // Clear existing model
            this.clearCurrentModel();
            
            // Load 3D model if available
            if (productConfig.model_path) {
                await this.loadModel(productConfig.model_path);
            } else {
                // Create fallback primitive model
                this.createFallbackModel(productConfig);
            }
            
            // Create particle system
            if (productConfig.particle_config) {
                this.createParticleSystem(productConfig.particle_config);
            }
            
            console.log(`🎯 Showing visualization for: ${productConfig.name}`);
            
        } catch (error) {
            console.error('❌ Failed to show product visualization:', error);
            // Show fallback model on error
            this.createFallbackModel(productConfig);
        }
    }
    
    async loadModel(modelPath) {
        try {
            console.log(`📥 Loading 3D model: ${modelPath}`);
            
            const gltf = await new Promise((resolve, reject) => {
                this.modelLoader.load(
                    modelPath,
                    resolve,
                    (progress) => {
                        console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%');
                    },
                    reject
                );
            });
            
            this.currentModel = gltf.scene;
            
            // Position and scale the model
            this.currentModel.position.copy(this.modelPosition);
            this.currentModel.scale.copy(this.modelScale);
            
            // Set up animations if available
            if (gltf.animations && gltf.animations.length > 0) {
                this.animationMixer = new THREE.AnimationMixer(this.currentModel);
                
                gltf.animations.forEach((clip) => {
                    const action = this.animationMixer.clipAction(clip);
                    action.play();
                });
            }
            
            // Add to scene
            this.scene.add(this.currentModel);
            
            console.log('✅ 3D model loaded successfully');
            
        } catch (error) {
            console.error('❌ Failed to load 3D model:', error);
            throw error;
        }
    }
    
    createFallbackModel(productConfig) {
        // Create a simple geometric representation
        let geometry;
        let material;
        
        if (productConfig.category === 'can') {
            // Cylindrical shape for cans
            geometry = new THREE.CylinderGeometry(0.3, 0.3, 0.8, 32);
        } else if (productConfig.category === 'pack') {
            // Box shape for packs
            geometry = new THREE.BoxGeometry(0.6, 0.8, 0.1);
        } else {
            // Default box for devices
            geometry = new THREE.BoxGeometry(0.5, 0.8, 0.3);
        }
        
        // Create material with brand colors
        const primaryColor = productConfig.brand_colors?.[0] || '#00ff88';
        material = new THREE.MeshPhongMaterial({
            color: primaryColor,
            transparent: true,
            opacity: 0.8
        });
        
        this.currentModel = new THREE.Mesh(geometry, material);
        this.currentModel.position.copy(this.modelPosition);
        this.currentModel.scale.copy(this.modelScale);
        
        // Add to scene
        this.scene.add(this.currentModel);
        
        // Add simple rotation animation
        this.addSimpleRotationAnimation();
        
        console.log(`📦 Created fallback model for: ${productConfig.name}`);
    }
    
    createParticleSystem(particleConfig) {
        const particleCount = particleConfig.count || 100;
        const primaryColor = new THREE.Color(particleConfig.primary_color || '#ffffff');
        const secondaryColor = new THREE.Color(particleConfig.secondary_color || '#ffffff');
        
        // Create particle geometry
        const particles = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        
        // Initialize particles
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // Random positions around the model
            positions[i3] = (Math.random() - 0.5) * 4;
            positions[i3 + 1] = (Math.random() - 0.5) * 4;
            positions[i3 + 2] = (Math.random() - 0.5) * 4;
            
            // Random velocities
            velocities[i3] = (Math.random() - 0.5) * 0.02;
            velocities[i3 + 1] = Math.random() * 0.02 + 0.01;
            velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;
            
            // Interpolate between primary and secondary colors
            const t = Math.random();
            const color = primaryColor.clone().lerp(secondaryColor, t);
            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;
        }
        
        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        particles.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        
        // Create particle material
        const particleMaterial = new THREE.PointsMaterial({
            size: 0.05,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        
        // Create particle system
        this.particleSystem = new THREE.Points(particles, particleMaterial);
        this.scene.add(this.particleSystem);
        
        console.log(`✨ Created particle system: ${particleConfig.type}`);
    }
    
    updateParticles(delta) {
        if (!this.particleSystem) return;
        
        const positions = this.particleSystem.geometry.attributes.position.array;
        const velocities = this.particleSystem.geometry.attributes.velocity.array;
        
        for (let i = 0; i < positions.length; i += 3) {
            // Update positions based on velocities
            positions[i] += velocities[i];
            positions[i + 1] += velocities[i + 1];
            positions[i + 2] += velocities[i + 2];
            
            // Reset particles that go too far
            if (positions[i + 1] > 3) {
                positions[i] = (Math.random() - 0.5) * 4;
                positions[i + 1] = -2;
                positions[i + 2] = (Math.random() - 0.5) * 4;
            }
        }
        
        this.particleSystem.geometry.attributes.position.needsUpdate = true;
    }
    
    addSimpleRotationAnimation() {
        if (!this.currentModel) return;
        
        const rotateModel = () => {
            if (this.currentModel) {
                this.currentModel.rotation.y += 0.01;
                requestAnimationFrame(rotateModel);
            }
        };
        
        rotateModel();
    }
    
    hideProductVisualization() {
        this.clearCurrentModel();
        this.clearParticleSystem();
        console.log('🙈 Product visualization hidden');
    }
    
    clearCurrentModel() {
        if (this.currentModel) {
            this.scene.remove(this.currentModel);
            
            // Dispose of geometry and materials
            this.currentModel.traverse((child) => {
                if (child.geometry) {
                    child.geometry.dispose();
                }
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => material.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
            
            this.currentModel = null;
        }
        
        if (this.animationMixer) {
            this.animationMixer.stopAllAction();
            this.animationMixer = null;
        }
    }
    
    clearParticleSystem() {
        if (this.particleSystem) {
            this.scene.remove(this.particleSystem);
            this.particleSystem.geometry.dispose();
            this.particleSystem.material.dispose();
            this.particleSystem = null;
        }
    }
    
    // Utility methods
    setModelPosition(x, y, z) {
        this.modelPosition.set(x, y, z);
        if (this.currentModel) {
            this.currentModel.position.copy(this.modelPosition);
        }
    }
    
    setModelScale(scale) {
        this.modelScale.setScalar(scale);
        if (this.currentModel) {
            this.currentModel.scale.copy(this.modelScale);
        }
    }
    
    destroy() {
        try {
            // Stop render loop
            this.isAnimating = false;
            
            // Clear all models and particles
            this.clearCurrentModel();
            this.clearParticleSystem();
            
            // Dispose of renderer
            if (this.renderer) {
                this.renderer.dispose();
            }
            
            console.log('🧹 AR Renderer cleaned up');
            
        } catch (error) {
            console.error('❌ Error during AR renderer cleanup:', error);
        }
    }
}