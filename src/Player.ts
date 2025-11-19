import { Scene, Mesh, Vector3, SceneLoader, MeshBuilder, StandardMaterial, Color3, Color4, ParticleSystem, Texture, SphereParticleEmitter } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

export class Player {
    public mesh: Mesh;
    private scene: Scene;
    private trail: ParticleSystem | null = null;
    private lane = 0;
    private laneY = 0;
    private targetX = 0;
    private targetY = 0.5;
    private isMovingX = false;
    private isMovingY = false;
    public shieldActive = false;
    private shieldMesh: Mesh | null = null;

    constructor(scene: Scene) {
        this.scene = scene;
        this.mesh = new Mesh('playerPlaceholder', this.scene);
        this.targetY = 0.5;
    }

    public async load(): Promise<void> {
        // Try to load external 3D model
        const modelPath = '/models/light_fighter/';
        const modelFile = 'scene.gltf';
        
        try {
            const result = await SceneLoader.ImportMeshAsync('', modelPath, modelFile, this.scene);
            
            if (result.meshes.length > 0) {
                // Create a parent mesh to control the entire model
                const playerMesh = new Mesh('player', this.scene);
                
                // Parent all loaded meshes and rotate them
                result.meshes.forEach((mesh, index) => {
                    mesh.parent = playerMesh;
                    // Just rotate -90 degrees on X axis to make it face forward
                    mesh.rotate(Vector3.Right(), -Math.PI / 2, 0);
                });
                
                // Scale the entire model
                playerMesh.scaling = new Vector3(0.3, 0.3, 0.3);
                
                // Replace placeholder
                this.mesh.dispose();
                this.mesh = playerMesh;
                this.mesh.position = new Vector3(0, 0.5, -3);
                
                this.createParticleTrail(this.mesh);
                return;
            }
        } catch (error) {
            console.log('Could not load 3D model, using procedural model instead:', error);
        }
        
        // Fallback to procedural model
        this.mesh.dispose();
        this.mesh = this.createProceduralModel();
    }

    private createProceduralModel(): Mesh {
        // Create main body (fuselage) - elongated cylinder for sleek look
        const ship = MeshBuilder.CreateCylinder(
            'player',
            { height: 1.5, diameterTop: 0.3, diameterBottom: 0.5, tessellation: 16 },
            this.scene
        );
        ship.position = new Vector3(0, 0.5, -3);
        ship.rotation.x = Math.PI / 2; // Rotate to point forward

        const bodyMaterial = new StandardMaterial('playerMat', this.scene);
        bodyMaterial.emissiveColor = new Color3(0, 0.8, 1);
        bodyMaterial.diffuseColor = new Color3(0.1, 0.5, 0.8);
        bodyMaterial.specularColor = new Color3(1, 1, 1);
        bodyMaterial.specularPower = 64;
        ship.material = bodyMaterial;

        // Cockpit - sphere for the front
        const cockpit = MeshBuilder.CreateSphere(
            'cockpit',
            { diameter: 0.5, segments: 16 },
            this.scene
        );
        cockpit.parent = ship;
        cockpit.position = new Vector3(0, 0, 0.6);
        cockpit.scaling = new Vector3(0.8, 0.8, 1.2);
        
        const cockpitMaterial = new StandardMaterial('cockpitMat', this.scene);
        cockpitMaterial.emissiveColor = new Color3(0, 1, 1);
        cockpitMaterial.diffuseColor = new Color3(0, 0.9, 1);
        cockpitMaterial.specularColor = new Color3(1, 1, 1);
        cockpitMaterial.specularPower = 128;
        cockpitMaterial.alpha = 0.8;
        cockpit.material = cockpitMaterial;

        // Main wings - delta wing shape
        const leftWing = MeshBuilder.CreateBox('leftWing', { 
            width: 1.2, height: 0.1, depth: 0.8 
        }, this.scene);
        leftWing.parent = ship;
        leftWing.position = new Vector3(-0.65, 0, -0.1);
        leftWing.rotation.z = -0.2;
        leftWing.rotation.y = 0.1;
        
        const wingMaterial = new StandardMaterial('wingMat', this.scene);
        wingMaterial.emissiveColor = new Color3(0, 0.6, 0.9);
        wingMaterial.diffuseColor = new Color3(0.1, 0.4, 0.7);
        wingMaterial.specularColor = new Color3(0.5, 0.5, 0.5);
        wingMaterial.specularPower = 32;
        leftWing.material = wingMaterial;

        const rightWing = MeshBuilder.CreateBox('rightWing', { 
            width: 1.2, height: 0.1, depth: 0.8 
        }, this.scene);
        rightWing.parent = ship;
        rightWing.position = new Vector3(0.65, 0, -0.1);
        rightWing.rotation.z = 0.2;
        rightWing.rotation.y = -0.1;
        rightWing.material = wingMaterial;

        // Wing tips with emissive glow
        const leftWingTip = MeshBuilder.CreateSphere('leftWingTip', { 
            diameter: 0.15 
        }, this.scene);
        leftWingTip.parent = leftWing;
        leftWingTip.position = new Vector3(-0.5, 0, 0);
        
        const wingTipMaterial = new StandardMaterial('wingTipMat', this.scene);
        wingTipMaterial.emissiveColor = new Color3(0, 1, 1);
        wingTipMaterial.diffuseColor = new Color3(0, 1, 1);
        leftWingTip.material = wingTipMaterial;

        const rightWingTip = MeshBuilder.CreateSphere('rightWingTip', { 
            diameter: 0.15 
        }, this.scene);
        rightWingTip.parent = rightWing;
        rightWingTip.position = new Vector3(0.5, 0, 0);
        rightWingTip.material = wingTipMaterial;

        // Engine exhausts
        const leftEngine = MeshBuilder.CreateCylinder('leftEngine', {
            height: 0.4, diameter: 0.25, tessellation: 8
        }, this.scene);
        leftEngine.parent = ship;
        leftEngine.position = new Vector3(-0.3, 0, -0.7);
        
        const engineMaterial = new StandardMaterial('engineMat', this.scene);
        engineMaterial.emissiveColor = new Color3(0.2, 0.2, 0.3);
        engineMaterial.diffuseColor = new Color3(0.3, 0.3, 0.4);
        leftEngine.material = engineMaterial;

        const rightEngine = MeshBuilder.CreateCylinder('rightEngine', {
            height: 0.4, diameter: 0.25, tessellation: 8
        }, this.scene);
        rightEngine.parent = ship;
        rightEngine.position = new Vector3(0.3, 0, -0.7);
        rightEngine.material = engineMaterial;

        // Engine glow (where particles emit from)
        const leftEngineGlow = MeshBuilder.CreateCylinder('leftEngineGlow', {
            height: 0.1, diameter: 0.2, tessellation: 8
        }, this.scene);
        leftEngineGlow.parent = leftEngine;
        leftEngineGlow.position = new Vector3(0, 0, -0.2);
        
        const engineGlowMaterial = new StandardMaterial('engineGlowMat', this.scene);
        engineGlowMaterial.emissiveColor = new Color3(0, 1, 1);
        leftEngineGlow.material = engineGlowMaterial;

        const rightEngineGlow = MeshBuilder.CreateCylinder('rightEngineGlow', {
            height: 0.1, diameter: 0.2, tessellation: 8
        }, this.scene);
        rightEngineGlow.parent = rightEngine;
        rightEngineGlow.position = new Vector3(0, 0, -0.2);
        rightEngineGlow.material = engineGlowMaterial;

        // Tail fins
        const topFin = MeshBuilder.CreateBox('topFin', { 
            width: 0.1, height: 0.5, depth: 0.4 
        }, this.scene);
        topFin.parent = ship;
        topFin.position = new Vector3(0, 0.25, -0.5);
        topFin.material = wingMaterial;

        // Create particle trail
        this.createParticleTrail(ship);

        return ship;
    }

    private createParticleTrail(parent: Mesh): void {
        // Create invisible emitter mesh at the back of the ship
        const emitterMesh = MeshBuilder.CreateBox('thrusterEmitter', { size: 0.1 }, this.scene);
        emitterMesh.parent = parent;
        emitterMesh.position = new Vector3(0, 1.8, -6); // Position at back engines (positive Z for back)
        emitterMesh.isVisible = false;
        
        const particleSystem = new ParticleSystem('trail', 2000, this.scene);
        
        // Create a simple white texture for particles
        particleSystem.particleTexture = new Texture(
            'data:image/svg+xml;base64,' + btoa(
                '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="16" fill="white"/></svg>'
            ),
            this.scene
        );

        particleSystem.emitter = emitterMesh;
        const emitter = new SphereParticleEmitter(0.2);
        particleSystem.particleEmitterType = emitter;

        particleSystem.color1 = new Color4(0, 1, 1, 1);
        particleSystem.color2 = new Color4(0, 0.5, 1, 1);
        particleSystem.colorDead = new Color4(0, 0, 0.5, 0);

        particleSystem.minSize = 0.1;
        particleSystem.maxSize = 0.3;

        particleSystem.minLifeTime = 0.3;
        particleSystem.maxLifeTime = 0.6;

        particleSystem.emitRate = 500;

        particleSystem.blendMode = ParticleSystem.BLENDMODE_ADD;

        particleSystem.gravity = new Vector3(0, 0, -10); // Particles trail behind (positive Z)

        particleSystem.direction1 = new Vector3(-0.2, 0, 1);
        particleSystem.direction2 = new Vector3(0.2, 0, 1);

        particleSystem.minEmitPower = 0.5;
        particleSystem.maxEmitPower = 1;

        particleSystem.updateSpeed = 0.01;

        particleSystem.start();
        this.trail = particleSystem;
    }

    public moveLeft(): void {
        if (this.lane > -1) {
            this.lane--;
            this.targetX = this.lane * 3;
            this.isMovingX = true;
        }
    }

    public moveRight(): void {
        if (this.lane < 1) {
            this.lane++;
            this.targetX = this.lane * 3;
            this.isMovingX = true;
        }
    }

    public moveUp(): void {
        if (this.laneY < 1) {
            this.laneY++;
            this.targetY = 0.5 + (this.laneY * 2.5);
            this.isMovingY = true;
        }
    }

    public moveDown(): void {
        if (this.laneY > -1) {
            this.laneY--;
            this.targetY = 0.5 + (this.laneY * 2.5);
            this.isMovingY = true;
        }
    }

    public update(deltaTime: number): void {
        if (this.isMovingX) {
            const diff = this.targetX - this.mesh.position.x;
            if (Math.abs(diff) < 0.1) {
                this.mesh.position.x = this.targetX;
                this.isMovingX = false;
            } else {
                this.mesh.position.x += diff * 0.15;
            }
        }

        if (this.isMovingY) {
            const diff = this.targetY - this.mesh.position.y;
            if (Math.abs(diff) < 0.1) {
                this.mesh.position.y = this.targetY;
                this.isMovingY = false;
            } else {
                this.mesh.position.y += diff * 0.15;
            }
        }
        
        // Tilt ship based on movement
        const targetRotationZ = (this.targetX - this.mesh.position.x) * 0.1;
        const targetRotationX = Math.PI / 2 - (this.targetY - this.mesh.position.y) * 0.1;
        
        this.mesh.rotation.z = targetRotationZ;
        this.mesh.rotation.x = targetRotationX;
    }

    public activateShield(): void {
        if (this.shieldMesh) {
            this.shieldMesh.dispose();
        }

        this.shieldMesh = MeshBuilder.CreateSphere(
            'shield',
            { diameter: 2 },
            this.scene
        );
        this.shieldMesh.parent = this.mesh;
        this.shieldMesh.position = Vector3.Zero();

        const material = new StandardMaterial('shieldMat', this.scene);
        material.emissiveColor = new Color3(0, 0.5, 1);
        material.alpha = 0.3;
        material.wireframe = true;
        this.shieldMesh.material = material;

        this.shieldActive = true;

        // Shield lasts 5 seconds
        setTimeout(() => {
            if (this.shieldMesh) {
                this.shieldMesh.dispose();
                this.shieldMesh = null;
            }
            this.shieldActive = false;
        }, 5000);
    }

    public reset(): void {
        this.lane = 0;
        this.laneY = 0;
        this.targetX = 0;
        this.targetY = 0.5;
        this.mesh.position.x = 0;
        this.mesh.position.y = 0.5;
        this.shieldActive = false;
        if (this.shieldMesh) {
            this.shieldMesh.dispose();
            this.shieldMesh = null;
        }
    }
    
    public getPosition(): Vector3 {
        return this.mesh.position;
    }
}
