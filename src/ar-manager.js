// Use global THREE from CDN
const THREE = window.THREE;

export class ARManager {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.isARActive = false;
        this.currentProduct = null;
        this.productMesh = null;
        this.animationId = null;
    }
    
    startAR() {
        if (this.isARActive) return;
        
        this.isARActive = true;
        this.initThreeJS();
        this.animate();
    }
    
    stopAR() {
        if (!this.isARActive) return;
        
        this.isARActive = false;
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        if (this.productMesh) {
            this.scene.remove(this.productMesh);
            this.productMesh = null;
        }
    }
    
    initThreeJS() {
        const canvas = document.getElementById('ar-scene');
        
        // Scene setup
        this.scene = new THREE.Scene();
        
        // Camera setup
        this.camera = new THREE.PerspectiveCamera(
            75, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        this.camera.position.z = 5;
        
        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: canvas, 
            alpha: true,
            antialias: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x000000, 0);
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        this.scene.add(directionalLight);
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }
    
    displayProduct(product) {
        if (this.productMesh) {
            this.scene.remove(this.productMesh);
        }
        
        this.currentProduct = product;
        
        // Create a 3D representation based on product type
        const geometry = this.getGeometryForProduct(product);
        const material = new THREE.MeshPhongMaterial({ 
            color: product.color || 0x00ff00,
            shininess: 100,
            specular: 0x111111
        });
        
        this.productMesh = new THREE.Mesh(geometry, material);
        this.productMesh.position.set(0, 0, 0);
        this.scene.add(this.productMesh);
        
        // Add floating animation
        this.productMesh.userData = {
            originalY: this.productMesh.position.y,
            time: 0
        };
    }
    
    getGeometryForProduct(product) {
        switch (product.type) {
            case 'box':
                return new THREE.BoxGeometry(1, 1, 1);
            case 'sphere':
                return new THREE.SphereGeometry(0.8, 32, 32);
            case 'cylinder':
                return new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
            case 'bottle':
                return new THREE.CylinderGeometry(0.3, 0.4, 1.5, 32);
            default:
                return new THREE.BoxGeometry(1, 1, 1);
        }
    }
    
    animate() {
        if (!this.isARActive) return;
        
        this.animationId = requestAnimationFrame(() => this.animate());
        
        // Animate the product if it exists
        if (this.productMesh) {
            this.productMesh.userData.time += 0.02;
            
            // Floating animation
            this.productMesh.position.y = 
                this.productMesh.userData.originalY + 
                Math.sin(this.productMesh.userData.time) * 0.2;
            
            // Rotation animation
            this.productMesh.rotation.y += 0.01;
        }
        
        this.renderer.render(this.scene, this.camera);
    }
    
    onWindowResize() {
        if (!this.camera || !this.renderer) return;
        
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}