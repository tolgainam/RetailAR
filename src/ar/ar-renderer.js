/**
 * AR Renderer - 3D overlay and tracking system
 * Handles 3D model rendering, positioning, and animations
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class ARRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.animationId = null;
        
        // Product tracking
        this.trackedProducts = new Map();
        this.activeProduct = null;
        
        // Loaders
        this.gltfLoader = new GLTFLoader();
        this.textureLoader = new THREE.TextureLoader();
        
        // Animation mixers
        this.mixers = [];
        this.clock = new THREE.Clock();
        
        // Virtual buttons reference
        this.virtualButtons = null;
        
        this.isInitialized = false;
    }
    
    /**
     * Initialize Three.js scene and renderer
     */
    async init() {
        if (this.isInitialized) return;
        
        try {
            // Scene setup
            this.scene = new THREE.Scene();
            
            // Camera setup - matches camera intrinsics for AR
            this.camera = new THREE.PerspectiveCamera(
                75, 
                window.innerWidth / window.innerHeight, 
                0.01, 
                1000
            );
            
            // Renderer setup
            this.renderer = new THREE.WebGLRenderer({ 
                canvas: this.canvas,
                alpha: true,
                antialias: true,
                preserveDrawingBuffer: true
            });
            
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.renderer.setClearColor(0x000000, 0);
            
            // Enable shadows
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            
            // Lighting setup for AR
            this._setupLighting();
            
            // Handle window resize
            window.addEventListener('resize', () => this._onWindowResize());
            
            this.isInitialized = true;
            console.log('AR Renderer initialized');
            
        } catch (error) {
            console.error('Failed to initialize AR renderer:', error);
            throw error;
        }
    }
    
    _setupLighting() {
        // Ambient light for general illumination
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // Directional light for shadows and highlights
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        directionalLight.castShadow = true;
        
        // Configure shadow camera
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -5;
        directionalLight.shadow.camera.right = 5;
        directionalLight.shadow.camera.top = 5;
        directionalLight.shadow.camera.bottom = -5;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        
        this.scene.add(directionalLight);
        
        // Point light for additional illumination
        const pointLight = new THREE.PointLight(0xffffff, 0.4, 10);
        pointLight.position.set(0, 2, 2);
        this.scene.add(pointLight);
    }
    
    /**
     * Start rendering loop
     */
    startRendering() {
        if (this.animationId) return;
        
        const animate = () => {
            this.animationId = requestAnimationFrame(animate);
            this._update();
            this.renderer.render(this.scene, this.camera);
        };
        
        animate();
    }
    
    /**
     * Stop rendering loop
     */
    stopRendering() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    /**
     * Display product AR overlay
     */
    async displayProduct(detectionResult) {
        if (!this.isInitialized) await this.init();
        
        const productConfig = detectionResult.productConfig;
        
        try {
            console.log(`🎬 Starting AR display for: ${productConfig.name}`);
            
            // Remove existing product if any
            if (this.activeProduct) {
                console.log('Removing existing product...');
                await this.hideProduct();
            }
            
            // Load and position 3D model
            console.log('Loading 3D model...');
            const productGroup = await this._loadProductModel(productConfig);
            
            // Position model based on detection
            console.log('Positioning model...');
            this._positionModel(productGroup, detectionResult);
            
            // Apply animations
            console.log('Setting up animations...');
            this._setupProductAnimations(productGroup, productConfig);
            
            // Add to scene
            console.log('Adding to scene...');
            this.scene.add(productGroup);
            
            // Track this product
            this.activeProduct = {
                group: productGroup,
                config: productConfig,
                detection: detectionResult,
                startTime: Date.now()
            };
            
            this.trackedProducts.set(productConfig.id, this.activeProduct);
            
            console.log(`✅ Successfully displaying AR overlay for: ${productConfig.name}`);
            console.log('Product group children:', productGroup.children.length);
            
        } catch (error) {
            console.error('❌ Failed to display product:', error);
            throw error;
        }
    }
    
    async _loadProductModel(productConfig) {
        // Create product group
        const productGroup = new THREE.Group();
        productGroup.name = `product-${productConfig.id}`;
        
        console.log(`📦 Loading product model for: ${productConfig.name}`);
        console.log(`3D model path: ${productConfig.visual['3d_model'] || 'Not specified'}`);
        
        try {
            // Try to load 3D model first
            if (productConfig.visual['3d_model']) {
                console.log('Attempting to load 3D model...');
                const gltf = await this._loadGLTFModel(productConfig.visual['3d_model']);
                const model = gltf.scene;
                
                console.log('3D model loaded successfully, applying settings...');
                
                // Apply material overrides
                if (productConfig.visual.material_overrides) {
                    console.log('Applying material overrides...');
                    this._applyMaterialOverrides(model, productConfig.visual.material_overrides);
                }
                
                // Enable shadows
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                
                productGroup.add(model);
                console.log('✅ 3D model added to product group');
                
                // Setup animations if model has them
                if (gltf.animations && gltf.animations.length > 0) {
                    console.log(`Setting up ${gltf.animations.length} animations...`);
                    const mixer = new THREE.AnimationMixer(model);
                    gltf.animations.forEach(clip => {
                        const action = mixer.clipAction(clip);
                        action.play();
                    });
                    this.mixers.push(mixer);
                }
            } else {
                console.log('No 3D model specified, creating fallback model...');
                // Fallback: create procedural model based on product type
                const fallbackModel = this._createFallbackModel(productConfig);
                productGroup.add(fallbackModel);
            }
            
        } catch (error) {
            console.error('❌ Failed to load 3D model, using fallback:', error);
            const fallbackModel = this._createFallbackModel(productConfig);
            productGroup.add(fallbackModel);
            console.log('⚠️ Using fallback model instead');
        }
        
        console.log(`📦 Product model loading complete. Children: ${productGroup.children.length}`);
        return productGroup;
    }
    
    async _loadGLTFModel(modelPath) {
        console.log(`🎯 Attempting to load GLTF model: ${modelPath}`);
        
        return new Promise((resolve, reject) => {
            this.gltfLoader.load(
                modelPath,
                (gltf) => {
                    console.log(`✅ Successfully loaded GLTF model: ${modelPath}`);
                    console.log('Model info:', {
                        scene: gltf.scene,
                        animations: gltf.animations.length,
                        cameras: gltf.cameras.length,
                        scenes: gltf.scenes.length
                    });
                    resolve(gltf);
                },
                (progress) => {
                    const percent = progress.total > 0 ? (progress.loaded / progress.total * 100).toFixed(1) : '0';
                    console.log(`📥 Loading progress: ${percent}% (${progress.loaded}/${progress.total} bytes)`);
                },
                (error) => {
                    console.error(`❌ Failed to load GLTF model: ${modelPath}`, error);
                    reject(error);
                }
            );
        });
    }
    
    _createFallbackModel(productConfig) {
        console.log(`🔧 Creating fallback model for ${productConfig.type} product: ${productConfig.name}`);
        
        const group = new THREE.Group();
        
        let geometry;
        const material = new THREE.MeshPhongMaterial({
            color: productConfig.visual.material_overrides?.primary_color || 0xff6600, // More visible orange
            shininess: 100,
            transparent: true,
            opacity: 0.8
        });
        
        switch (productConfig.type) {
            case 'rectangular':
                // TEREA box
                geometry = new THREE.BoxGeometry(0.6, 1.0, 0.3);
                console.log('Created rectangular fallback (box)');
                break;
                
            case 'cylindrical':
                // ZYN can
                geometry = new THREE.CylinderGeometry(0.25, 0.25, 0.8, 32);
                console.log('Created cylindrical fallback (cylinder)');
                break;
                
            default:
                geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
                console.log('Created default fallback (cube)');
        }
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        group.add(mesh);
        
        // Add product label
        this._addProductLabel(group, productConfig);
        
        console.log('✅ Fallback model created successfully');
        return group;
    }
    
    _addProductLabel(group, productConfig) {
        // Create text texture
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        // Draw text
        ctx.fillStyle = productConfig.visual.material_overrides?.primary_color || '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#000000';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(productConfig.name, canvas.width / 2, canvas.height / 2 + 8);
        
        // Create texture and material
        const texture = new THREE.CanvasTexture(canvas);
        const labelMaterial = new THREE.MeshBasicMaterial({ map: texture });
        
        // Create label plane
        const labelGeometry = new THREE.PlaneGeometry(1.2, 0.3);
        const labelMesh = new THREE.Mesh(labelGeometry, labelMaterial);
        labelMesh.position.set(0, 1.2, 0);
        
        group.add(labelMesh);
    }
    
    _applyMaterialOverrides(model, overrides) {
        console.log('Applying material overrides:', overrides);
        
        model.traverse((child) => {
            if (child.isMesh && child.material) {
                const material = child.material;
                
                // Preserve original textures and only apply overrides if no texture exists
                if (overrides.primary_color && !material.map) {
                    // Only override color if there's no texture
                    material.color = new THREE.Color(overrides.primary_color);
                    console.log(`Applied primary color override to material without texture`);
                }
                
                if (overrides.secondary_color && material.emissive && !material.emissiveMap) {
                    // Only override emissive if there's no emissive texture
                    material.emissive = new THREE.Color(overrides.secondary_color);
                    console.log(`Applied secondary color override to emissive`);
                }
                
                // Ensure material updates
                material.needsUpdate = true;
                
                // Log material info for debugging
                console.log(`Material info - hasTexture: ${!!material.map}, hasEmissiveTexture: ${!!material.emissiveMap}, color: ${material.color.getHexString()}`);
            }
        });
    }
    
    _positionModel(productGroup, detectionResult) {
        // Apply position and rotation offsets from config
        const config = detectionResult.productConfig;
        const visual = config.visual;
        
        console.log(`📍 Positioning model for: ${config.name}`);
        
        // Position model to align with detected object
        // For now, place at center but closer to camera for better tracking appearance
        productGroup.position.set(0, 0, -1.5); // Closer to camera for better alignment
        
        // Apply configuration offsets
        if (visual.position_offset) {
            console.log('Applying position offset:', visual.position_offset);
            productGroup.position.add(new THREE.Vector3(...visual.position_offset));
        }
        
        // Ensure model stays upright and matches real world orientation
        if (visual.rotation_offset) {
            console.log('Applying rotation offset:', visual.rotation_offset);
            productGroup.rotation.set(...visual.rotation_offset);
        } else {
            // Keep model upright by default
            productGroup.rotation.set(0, 0, 0);
        }
        
        if (visual.scale) {
            console.log('Applying scale:', visual.scale);
            productGroup.scale.set(...visual.scale);
        }
        
        // Add slight tracking compensation for better visual alignment
        const trackingOffset = this._calculateTrackingOffset();
        productGroup.position.add(trackingOffset);
        
        console.log(`Final position: (${productGroup.position.x.toFixed(2)}, ${productGroup.position.y.toFixed(2)}, ${productGroup.position.z.toFixed(2)})`);
    }
    
    _calculateTrackingOffset() {
        // Calculate offset to better align 3D model with detected object
        // This could be enhanced with computer vision-based position detection
        return new THREE.Vector3(0, -0.1, 0); // Slightly lower for better visual alignment
    }
    
    _setupProductAnimations(productGroup, productConfig) {
        const animations = productConfig.animations;
        
        // Apply idle animation
        if (animations.idle) {
            this._applyIdleAnimation(productGroup, animations.idle);
        }
        
        // Setup flavor effect particles
        if (animations.flavor_effect) {
            this._createFlavorEffect(productGroup, animations.flavor_effect);
        }
    }
    
    _applyIdleAnimation(group, idleConfig) {
        group.userData.animation = {
            type: idleConfig.type,
            time: 0,
            config: idleConfig
        };
        
        // Store original position/rotation for animation
        group.userData.originalPosition = group.position.clone();
        group.userData.originalRotation = group.rotation.clone();
    }
    
    _createFlavorEffect(group, effectConfig) {
        // Create particle system for flavor effects
        const particleCount = effectConfig.particle_count || 50;
        const geometry = new THREE.BufferGeometry();
        
        const positions = [];
        const colors = [];
        const sizes = [];
        
        for (let i = 0; i < particleCount; i++) {
            // Random positions around the product
            positions.push((Math.random() - 0.5) * 2);
            positions.push(Math.random() * 2);
            positions.push((Math.random() - 0.5) * 2);
            
            // Color based on flavor
            const color = new THREE.Color(effectConfig.color);
            colors.push(color.r, color.g, color.b);
            
            // Random sizes
            sizes.push(Math.random() * 5 + 2);
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
        
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                intensity: { value: effectConfig.intensity }
            },
            vertexShader: this._getParticleVertexShader(),
            fragmentShader: this._getParticleFragmentShader(),
            transparent: true,
            vertexColors: true
        });
        
        const particles = new THREE.Points(geometry, material);
        particles.name = 'flavor-particles';
        group.add(particles);
        
        // Store particle system for animation
        group.userData.particles = {
            system: particles,
            material: material,
            config: effectConfig,
            startTime: Date.now()
        };
    }
    
    _getParticleVertexShader() {
        return `
            attribute float size;
            uniform float time;
            varying vec3 vColor;
            
            void main() {
                vColor = color;
                
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                
                // Animated movement
                mvPosition.x += sin(time * 0.002 + position.x * 10.0) * 0.1;
                mvPosition.y += cos(time * 0.001 + position.y * 10.0) * 0.05;
                
                gl_PointSize = size * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `;
    }
    
    _getParticleFragmentShader() {
        return `
            uniform float intensity;
            varying vec3 vColor;
            
            void main() {
                float r = distance(gl_PointCoord, vec2(0.5));
                if (r > 0.5) discard;
                
                float alpha = (1.0 - r * 2.0) * intensity;
                gl_FragColor = vec4(vColor, alpha);
            }
        `;
    }
    
    /**
     * Hide currently displayed product
     */
    async hideProduct() {
        if (!this.activeProduct) return;
        
        // Remove from scene
        this.scene.remove(this.activeProduct.group);
        
        // Cleanup geometry and materials
        this.activeProduct.group.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => mat.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
        
        this.activeProduct = null;
    }
    
    /**
     * Update animations and effects
     */
    _update() {
        const deltaTime = this.clock.getDelta();
        const elapsedTime = this.clock.getElapsedTime();
        
        // Update animation mixers
        this.mixers.forEach(mixer => mixer.update(deltaTime));
        
        // Update active product animations
        if (this.activeProduct) {
            this._updateProductAnimation(this.activeProduct, elapsedTime);
        }
        
        // Update virtual button orientations to prevent rotation
        if (this.virtualButtons) {
            this.virtualButtons.updateButtonOrientations();
        }
    }
    
    /**
     * Set virtual buttons reference for orientation updates
     */
    setVirtualButtons(virtualButtons) {
        this.virtualButtons = virtualButtons;
    }
    
    _updateProductAnimation(productData, time) {
        const group = productData.group;
        const animation = group.userData.animation;
        
        if (!animation) return;
        
        switch (animation.type) {
            case 'float':
                group.position.y = group.userData.originalPosition.y + 
                    Math.sin(time * animation.config.speed) * animation.config.amplitude;
                break;
                
            case 'rotate_float':
                group.rotation.y += animation.config.rotation_speed * 0.01;
                group.position.y = group.userData.originalPosition.y + 
                    Math.sin(time * animation.config.float_speed) * animation.config.float_amplitude;
                break;
        }
        
        // Update particle effects
        if (group.userData.particles) {
            const particles = group.userData.particles;
            particles.material.uniforms.time.value = time * 1000;
        }
    }
    
    _onWindowResize() {
        if (!this.camera || !this.renderer) return;
        
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    /**
     * Cleanup resources
     */
    cleanup() {
        this.stopRendering();
        
        // Hide active product
        if (this.activeProduct) {
            this.hideProduct();
        }
        
        // Dispose mixers
        this.mixers.forEach(mixer => mixer.uncacheRoot(mixer.getRoot()));
        this.mixers.length = 0;
        
        // Dispose renderer
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        this.isInitialized = false;
    }
}