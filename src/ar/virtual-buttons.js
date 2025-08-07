/**
 * Virtual Button System for AR
 * Handles 3D interactive buttons in AR space
 */

// Use global THREE from CDN
const THREE = window.THREE;

export class VirtualButtons {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        
        this.buttons = new Map();
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Touch/mouse interaction
        this.isInteracting = false;
        this.touchStartTime = 0;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Mouse events (for desktop testing)
        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onTouchStart = this.onTouchStart.bind(this);
        this.onTouchEnd = this.onTouchEnd.bind(this);
        this.onTouchMove = this.onTouchMove.bind(this);
        
        document.addEventListener('mousedown', this.onPointerDown);
        document.addEventListener('mouseup', this.onPointerUp);
        document.addEventListener('mousemove', this.onPointerMove);
        
        // Touch events (for mobile)
        document.addEventListener('touchstart', this.onTouchStart, { passive: false });
        document.addEventListener('touchend', this.onTouchEnd, { passive: false });
        document.addEventListener('touchmove', this.onTouchMove, { passive: false });
    }
    
    /**
     * Create virtual buttons for a product
     */
    createButtons(productConfig, parentGroup) {
        const buttonConfigs = productConfig.interactions?.virtual_buttons;
        if (!buttonConfigs || buttonConfigs.length === 0) return;
        
        const buttonGroup = new THREE.Group();
        buttonGroup.name = `buttons-${productConfig.id}`;
        
        // Ensure button group has no rotation
        buttonGroup.rotation.set(0, 0, 0);
        
        buttonConfigs.forEach((buttonConfig, index) => {
            const button = this.createButton(buttonConfig, productConfig);
            buttonGroup.add(button);
            
            // Register button for interaction
            this.buttons.set(button.uuid, {
                mesh: button,
                config: buttonConfig,
                productConfig: productConfig,
                isHovered: false,
                originalScale: button.scale.clone()
            });
        });
        
        parentGroup.add(buttonGroup);
        
        // Store buttons for orientation correction
        buttonGroup.userData.needsOrientationCorrection = true;
        
        console.log(`Created ${buttonConfigs.length} virtual buttons for ${productConfig.name}`);
        return buttonGroup;
    }
    
    createButton(buttonConfig, productConfig) {
        // Create button geometry
        const width = buttonConfig.size[0];
        const height = buttonConfig.size[1];
        const depth = 0.05;
        
        const buttonGeometry = new THREE.BoxGeometry(width, height, depth);
        
        // Create button material
        const buttonMaterial = new THREE.MeshPhongMaterial({
            color: buttonConfig.style.background,
            transparent: true,
            opacity: 0.9
        });
        
        // Create button mesh
        const buttonMesh = new THREE.Mesh(buttonGeometry, buttonMaterial);
        
        // Position button
        buttonMesh.position.set(
            buttonConfig.position[0],
            buttonConfig.position[1], 
            buttonConfig.position[2]
        );
        
        // Ensure no rotation - keep buttons upright
        buttonMesh.rotation.set(0, 0, 0);
        
        // Create button text
        const textGroup = this.createButtonText(buttonConfig);
        buttonMesh.add(textGroup);
        
        // Create hover glow effect
        const glowGeometry = new THREE.BoxGeometry(width * 1.1, height * 1.1, depth * 1.1);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: buttonConfig.style.hover_color,
            transparent: true,
            opacity: 0,
            side: THREE.BackSide
        });
        
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        buttonMesh.add(glowMesh);
        
        // Store references for interaction
        buttonMesh.userData = {
            buttonId: buttonConfig.id,
            glowMesh: glowMesh,
            originalColor: new THREE.Color(buttonConfig.style.background),
            hoverColor: new THREE.Color(buttonConfig.style.hover_color),
            textColor: new THREE.Color(buttonConfig.style.text_color),
            isInteractable: true
        };
        
        return buttonMesh;
    }
    
    createButtonText(buttonConfig) {
        // Create text texture
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size
        canvas.width = 256;
        canvas.height = 64;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Setup text styling
        ctx.fillStyle = buttonConfig.style.text_color;
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Draw text
        ctx.fillText(
            buttonConfig.label, 
            canvas.width / 2, 
            canvas.height / 2
        );
        
        // Create texture
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        // Create text material
        const textMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true
        });
        
        // Create text plane
        const textGeometry = new THREE.PlaneGeometry(
            buttonConfig.size[0] * 0.8, 
            buttonConfig.size[1] * 0.8
        );
        
        const textMesh = new THREE.Mesh(textGeometry, textMaterial);
        textMesh.position.z = 0.026; // Slightly in front of button
        
        // Ensure text has no rotation
        textMesh.rotation.set(0, 0, 0);
        
        return textMesh;
    }
    
    onPointerDown(event) {
        this.isInteracting = true;
        this.touchStartTime = Date.now();
        
        this.updateMousePosition(event);
        this.checkButtonInteraction('down');
    }
    
    onPointerUp(event) {
        if (!this.isInteracting) return;
        
        this.updateMousePosition(event);
        
        const touchDuration = Date.now() - this.touchStartTime;
        if (touchDuration < 500) { // Quick tap/click
            this.checkButtonInteraction('click');
        }
        
        this.isInteracting = false;
    }
    
    onPointerMove(event) {
        this.updateMousePosition(event);
        this.checkButtonInteraction('hover');
    }
    
    onTouchStart(event) {
        event.preventDefault();
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            this.onPointerDown(touch);
        }
    }
    
    onTouchEnd(event) {
        event.preventDefault();
        if (event.changedTouches.length === 1) {
            const touch = event.changedTouches[0];
            this.onPointerUp(touch);
        }
    }
    
    onTouchMove(event) {
        event.preventDefault();
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            this.onPointerMove(touch);
        }
    }
    
    updateMousePosition(event) {
        const canvas = document.querySelector('#ar-canvas');
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }
    
    checkButtonInteraction(interactionType) {
        // Update raycaster
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Get all interactable objects
        const interactables = [];
        this.scene.traverse((child) => {
            if (child.userData && child.userData.isInteractable) {
                interactables.push(child);
            }
        });
        
        if (interactables.length === 0) return;
        
        // Check for intersections
        const intersects = this.raycaster.intersectObjects(interactables);
        
        if (intersects.length > 0) {
            const intersectedButton = intersects[0].object;
            const buttonData = this.buttons.get(intersectedButton.uuid);
            
            if (buttonData) {
                this.handleButtonInteraction(buttonData, interactionType);
            }
        } else {
            // Clear hover states
            this.clearAllHoverStates();
        }
    }
    
    handleButtonInteraction(buttonData, interactionType) {
        switch (interactionType) {
            case 'hover':
                this.setButtonHoverState(buttonData, true);
                break;
                
            case 'down':
                this.setButtonPressState(buttonData, true);
                break;
                
            case 'click':
                this.executeButtonAction(buttonData);
                this.setButtonPressState(buttonData, false);
                break;
        }
    }
    
    setButtonHoverState(buttonData, isHovered) {
        if (buttonData.isHovered === isHovered) return;
        
        buttonData.isHovered = isHovered;
        const mesh = buttonData.mesh;
        
        if (isHovered) {
            // Scale up slightly
            mesh.scale.copy(buttonData.originalScale);
            mesh.scale.multiplyScalar(1.1);
            
            // Change color
            mesh.material.color.copy(mesh.userData.hoverColor);
            
            // Show glow effect
            mesh.userData.glowMesh.material.opacity = 0.3;
            
            // Haptic feedback (if supported)
            this.triggerHapticFeedback('light');
            
        } else {
            // Reset scale
            mesh.scale.copy(buttonData.originalScale);
            
            // Reset color
            mesh.material.color.copy(mesh.userData.originalColor);
            
            // Hide glow effect
            mesh.userData.glowMesh.material.opacity = 0;
        }
    }
    
    setButtonPressState(buttonData, isPressed) {
        const mesh = buttonData.mesh;
        
        if (isPressed) {
            // Scale down slightly
            mesh.scale.copy(buttonData.originalScale);
            if (buttonData.isHovered) mesh.scale.multiplyScalar(1.1);
            mesh.scale.multiplyScalar(0.95);
            
            // Trigger haptic feedback
            this.triggerHapticFeedback('medium');
            
        } else {
            // Reset scale (accounting for hover state)
            mesh.scale.copy(buttonData.originalScale);
            if (buttonData.isHovered) {
                mesh.scale.multiplyScalar(1.1);
            }
        }
    }
    
    executeButtonAction(buttonData) {
        const config = buttonData.config;
        
        console.log(`🎯 Virtual button clicked: ${config.label}`);
        
        // Trigger haptic feedback
        this.triggerHapticFeedback('strong');
        
        switch (config.action.type) {
            case 'url':
                this.handleUrlAction(config.action);
                break;
                
            case 'custom':
                this.handleCustomAction(config.action, buttonData);
                break;
                
            default:
                console.warn('Unknown button action type:', config.action.type);
        }
    }
    
    handleUrlAction(action) {
        try {
            console.log(`🔗 Opening URL: ${action.target}`);
            if (action.new_window) {
                window.open(action.target, '_blank');
            } else {
                window.location.href = action.target;
            }
        } catch (error) {
            console.error('Failed to navigate to URL:', action.target, error);
        }
    }
    
    handleCustomAction(action, buttonData) {
        // Dispatch custom event for application to handle
        const customEvent = new CustomEvent('virtualButtonClick', {
            detail: {
                buttonId: buttonData.config.id,
                productId: buttonData.productConfig.id,
                action: action,
                buttonData: buttonData
            }
        });
        
        document.dispatchEvent(customEvent);
    }
    
    clearAllHoverStates() {
        this.buttons.forEach(buttonData => {
            if (buttonData.isHovered) {
                this.setButtonHoverState(buttonData, false);
            }
        });
    }
    
    triggerHapticFeedback(intensity = 'light') {
        // Try to trigger haptic feedback on supported devices
        if (navigator.vibrate) {
            let pattern;
            switch (intensity) {
                case 'light':
                    pattern = 10;
                    break;
                case 'medium':
                    pattern = 25;
                    break;
                case 'strong':
                    pattern = [50, 25, 50];
                    break;
                default:
                    pattern = 10;
            }
            
            navigator.vibrate(pattern);
        }
    }
    
    /**
     * Remove buttons for a specific product
     */
    removeButtons(productId) {
        const buttonsToRemove = [];
        
        this.buttons.forEach((buttonData, uuid) => {
            if (buttonData.productConfig.id === productId) {
                buttonsToRemove.push(uuid);
                
                // Remove from scene
                const parent = buttonData.mesh.parent;
                if (parent) {
                    parent.remove(buttonData.mesh);
                }
                
                // Dispose geometry and materials
                buttonData.mesh.traverse((child) => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => mat.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                });
            }
        });
        
        // Remove from buttons map
        buttonsToRemove.forEach(uuid => {
            this.buttons.delete(uuid);
        });
    }
    
    /**
     * Clear all buttons
     */
    clearButtons() {
        console.log('🧹 Clearing all virtual buttons');
        
        // Remove all buttons from scene and cleanup resources
        this.buttons.forEach((buttonData) => {
            const parent = buttonData.mesh.parent;
            if (parent) {
                parent.remove(buttonData.mesh);
            }
            
            // Dispose geometry and materials
            buttonData.mesh.traverse((child) => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        });
        
        // Clear the buttons map
        this.buttons.clear();
    }
    
    /**
     * Update button orientations to always face camera (no rotation)
     */
    updateButtonOrientations() {
        this.buttons.forEach((buttonData) => {
            const button = buttonData.mesh;
            const buttonGroup = button.parent;
            
            // Force buttons to have no rotation in world space
            if (buttonGroup && buttonGroup.userData.needsOrientationCorrection) {
                // Get world rotation of the parent group
                const worldRotation = new THREE.Euler();
                buttonGroup.getWorldQuaternion(new THREE.Quaternion()).invert();
                
                // Apply inverse rotation to each button to cancel out parent rotation
                button.rotation.set(0, 0, 0);
                
                // If parent has rotation, apply inverse to button
                if (buttonGroup.parent) {
                    const parentWorldRotation = new THREE.Euler();
                    buttonGroup.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
                    
                    // Set button rotation to counter parent rotation
                    const inverseQuaternion = new THREE.Quaternion();
                    buttonGroup.parent.getWorldQuaternion(inverseQuaternion);
                    inverseQuaternion.invert();
                    
                    button.setRotationFromQuaternion(inverseQuaternion);
                }
            }
        });
    }

    /**
     * Update button positions (if needed for tracking)
     */
    updateButtonPositions(productGroup, offset = { x: 0, y: 0, z: 0 }) {
        const productId = productGroup.name.split('-')[1];
        const buttonGroup = productGroup.getObjectByName(`buttons-${productId}`);
        if (buttonGroup) {
            buttonGroup.position.add(new THREE.Vector3(offset.x, offset.y, offset.z));
        }
        
        // Update orientations after position changes
        this.updateButtonOrientations();
    }
    
    /**
     * Cleanup resources
     */
    cleanup() {
        // Remove all buttons
        this.buttons.forEach((buttonData) => {
            const parent = buttonData.mesh.parent;
            if (parent) {
                parent.remove(buttonData.mesh);
            }
        });
        
        this.buttons.clear();
        
        // Remove event listeners
        document.removeEventListener('mousedown', this.onPointerDown);
        document.removeEventListener('mouseup', this.onPointerUp);
        document.removeEventListener('mousemove', this.onPointerMove);
        document.removeEventListener('touchstart', this.onTouchStart);
        document.removeEventListener('touchend', this.onTouchEnd);
        document.removeEventListener('touchmove', this.onTouchMove);
    }
}