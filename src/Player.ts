import { Scene, Mesh, Vector3, Matrix, SceneLoader, MeshBuilder, StandardMaterial, Color3, Color4, ParticleSystem, Texture, SphereParticleEmitter, Scalar, BoxParticleEmitter } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

export class Player {
    public mesh: Mesh;
    private scene: Scene;
    private trail: ParticleSystem | null = null;
    private velocity = Vector3.Zero();
    private inputVector = Vector3.Zero();
    private readonly ACCELERATION = 20;
    private readonly MAX_SPEED = 10;
    private readonly DRAG = 5;
    
    // Roll mechanics
    private isRolling = false;
    private rollTimer = 0;
    private readonly ROLL_DURATION = 0.6;
    private rollDirection = 0;
    private rollStartRotation = 0;

    public shieldActive = false;
    private shieldMesh: Mesh | null = null;
    private boundingRadius = 1.0;

    constructor(scene: Scene) {
        this.scene = scene;
        this.mesh = new Mesh('playerPlaceholder', this.scene);
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
                    // Just rotate -180 degrees on X axis to make it face forward
                    mesh.rotate(Vector3.Right(), - Math.PI / 2, 0);
                });
                
                // Scale the entire model
                playerMesh.scaling = new Vector3(0.3, 0.3, 0.3);
                
                // Replace placeholder
                this.mesh.dispose();
                this.mesh = playerMesh;
                this.mesh.position = new Vector3(0, 0.5, -3);
                
                this.calculateBoundingRadius();
                this.createEngineParticleTrail(this.mesh);
                return;
            }
        } catch (error) {
            console.log('Could not load 3D model, using procedural model instead:', error);
        }
        
        // Fallback to procedural model
        this.mesh.dispose();
        this.mesh = this.createProceduralModel();
        this.calculateBoundingRadius();
    }

    private createProceduralModel(): Mesh {
        const root = new Mesh('playerRoot', this.scene);
        root.position = new Vector3(0, 0.5, -3);

        // Create main body (fuselage) - elongated cylinder for sleek look
        const ship = MeshBuilder.CreateCylinder(
            'player',
            { height: 1.5, diameterTop: 0.3, diameterBottom: 0.5, tessellation: 16 },
            this.scene
        );
        ship.parent = root;
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
        this.createEngineParticleTrail(ship);

        return root;
    }

    private createEngineParticleTrail(parent: Mesh): void {
        // Create invisible emitter mesh at the back of the ship
        const emitterMesh = MeshBuilder.CreateBox('thrusterEmitter', { size: 0.1 }, this.scene);
        emitterMesh.parent = parent;
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
        particleSystem.worldOffset = new Vector3(0, 0, 0);
        
        // Use world space so particles don't rotate with the ship
        particleSystem.isLocal = false;
        
        // Use a Box Emitter to simulate two engines
        const emitter = new BoxParticleEmitter();
        emitter.minEmitBox = new Vector3(-0.4, -0.1, 0);
        emitter.maxEmitBox = new Vector3(0.4, 0.1, 0);
        particleSystem.particleEmitterType = emitter;

        particleSystem.color1 = new Color4(0.4, 0.8, 1.0, 1.0);
        particleSystem.color2 = new Color4(0.2, 0.5, 1.0, 1.0);
        particleSystem.colorDead = new Color4(0, 0, 0.2, 0.0);

        // Add color gradient for a more realistic fire look
        particleSystem.addColorGradient(0, new Color4(1, 1, 1, 1)); // White hot at nozzle
        particleSystem.addColorGradient(0.2, new Color4(0, 1, 1, 1)); // Cyan
        particleSystem.addColorGradient(0.5, new Color4(0, 0.5, 1, 0.5)); // Blue
        particleSystem.addColorGradient(1, new Color4(0, 0, 0.2, 0)); // Fade to dark blue

        particleSystem.minSize = 0.1;
        particleSystem.maxSize = 0.4;

        // Size gradient to make it look like a jet
        particleSystem.addSizeGradient(0, 0.1);
        particleSystem.addSizeGradient(0.2, 0.6);
        particleSystem.addSizeGradient(1, 0.2);

        particleSystem.minLifeTime = 0.2;
        particleSystem.maxLifeTime = 0.5;

        particleSystem.emitRate = 800;

        particleSystem.blendMode = ParticleSystem.BLENDMODE_ADD;

        // No gravity, particles just emit backward
        particleSystem.gravity = new Vector3(0, 0, 0);

        // Determine the ship's local backward vector
        parent.computeWorldMatrix(true);
        const shipMatrix = parent.getWorldMatrix();
        const axes = [Vector3.Right(), Vector3.Up(), Vector3.Forward()];
        let localBackward = new Vector3(0, 0, -1);
        let minDot = 1;
        
        for (const axis of axes) {
            const worldAxis = Vector3.TransformNormal(axis, shipMatrix);
            if (worldAxis.z < minDot) {
                minDot = worldAxis.z;
                localBackward.copyFrom(axis);
            }
            const negWorldAxis = worldAxis.scale(-1);
            if (negWorldAxis.z < minDot) {
                minDot = negWorldAxis.z;
                localBackward.copyFrom(axis).scaleInPlace(-1);
            }
        }

        // Position emitter at the back of the ship
        emitterMesh.position = new Vector3(0, 1.8062031269073486, -4.89084529876709);

        // Set fixed power and handle velocity in startDirectionFunction
        particleSystem.minEmitPower = 1;
        particleSystem.maxEmitPower = 1;

        particleSystem.startDirectionFunction = (worldMatrix: Matrix, directionToUpdate: Vector3) => {
            // The ship's world-space backward vector
            const worldBackward = this.mesh.forward.scale(-1);
            
            // Base exhaust velocity relative to ship
            const isBoosting = this.trail && this.trail.emitRate > 1000;
            const exhaustSpeed = isBoosting ? 35 : 20;
            
            // Resultant world velocity = ship velocity + (backward * exhaustSpeed)
            // This ensures particles inherit ship momentum and stay aligned with movement
            directionToUpdate.copyFrom(this.velocity);
            directionToUpdate.addInPlace(worldBackward.scale(exhaustSpeed));
            
            // Add some turbulence/spread
            directionToUpdate.x += Scalar.RandomRange(-2, 2);
            directionToUpdate.y += Scalar.RandomRange(-2, 2);
            directionToUpdate.z += Scalar.RandomRange(-2, 2);
        };

        particleSystem.updateSpeed = 0.015;

        particleSystem.start();
        this.trail = particleSystem;
    }

    public setBoost(enabled: boolean): void {
        if (this.trail) {
            if (enabled) {
                this.trail.emitRate = 2000;
                this.trail.minSize = 0.2;
                this.trail.maxSize = 0.5;
                this.trail.color1 = new Color4(1, 0.5, 0, 1); // Orange/Red boost
                this.trail.color2 = new Color4(1, 0, 0, 1);
            } else {
                this.trail.emitRate = 500;
                this.trail.minSize = 0.1;
                this.trail.maxSize = 0.3;
                this.trail.color1 = new Color4(0, 1, 1, 1); // Cyan normal
                this.trail.color2 = new Color4(0, 0.5, 1, 1);
            }
        }
    }

    public setInput(x: number, y: number): void {
        this.inputVector.set(x, y, 0);
    }

    public barrelRoll(direction: number): void {
        if (this.isRolling) return;
        this.isRolling = true;
        this.rollTimer = 0;
        this.rollDirection = direction;
        this.rollStartRotation = this.mesh.rotation.z;
        
        // Add a dodge impulse
        this.velocity.x += direction * 18; 
    }

    public update(deltaTime: number): void {
        // Apply acceleration
        if (this.inputVector.lengthSquared() > 0.1) {
            this.velocity.x += this.inputVector.x * this.ACCELERATION * deltaTime;
            this.velocity.y += this.inputVector.y * this.ACCELERATION * deltaTime;
        }

        // Apply drag
        this.velocity.x -= this.velocity.x * this.DRAG * deltaTime;
        this.velocity.y -= this.velocity.y * this.DRAG * deltaTime;

        // Clamp velocity
        if (this.velocity.length() > this.MAX_SPEED) {
            this.velocity.normalize().scaleInPlace(this.MAX_SPEED);
        }

        // Stop if very slow
        if (this.velocity.lengthSquared() < 0.01) {
            this.velocity.setAll(0);
        }

        // Apply velocity to position
        this.mesh.position.addInPlace(this.velocity.scale(deltaTime));

        // Clamp position
        this.mesh.position.x = Scalar.Clamp(this.mesh.position.x, -10, 10);
        this.mesh.position.y = Scalar.Clamp(this.mesh.position.y, -6, 6);
        
        // Handle Rolling
        if (this.isRolling) {
            this.rollTimer += deltaTime;
            const progress = this.rollTimer / this.ROLL_DURATION;
            
            if (progress >= 1) {
                this.isRolling = false;
                this.mesh.rotation.z = this.rollStartRotation;
            } else {
                // Roll 360 degrees (2PI)
                // Left (-1) -> Positive Rotation
                const rotationAmount = -this.rollDirection * Math.PI * 2 * progress;
                this.mesh.rotation.z = this.rollStartRotation + rotationAmount;
                
                // Maintain X tilt
                const targetRotationX = -this.velocity.y * 0.05;
                this.mesh.rotation.x = Scalar.Lerp(this.mesh.rotation.x, targetRotationX, 5 * deltaTime);
                
                return; // Skip normal banking
            }
        }

        // Tilt ship based on velocity
        const targetRotationZ = -this.velocity.x * 0.05;
        const targetRotationX = -this.velocity.y * 0.05;
        
        this.mesh.rotation.z = Scalar.Lerp(this.mesh.rotation.z, targetRotationZ, 5 * deltaTime);
        this.mesh.rotation.x = Scalar.Lerp(this.mesh.rotation.x, targetRotationX, 5 * deltaTime);
    }

    public activateShield(): void {
        if (this.shieldMesh) {
            this.shieldMesh.dispose();
        }

        const boundingInfo = this.mesh.getHierarchyBoundingVectors(true);
        const min = boundingInfo.min;
        const max = boundingInfo.max;
    
        // Calculate the maximum extent from center
        const extentX = Math.max(Math.abs(min.x), Math.abs(max.x));
        const extentY = Math.max(Math.abs(min.y), Math.abs(max.y));
        const extentZ = Math.max(Math.abs(min.z), Math.abs(max.z));
    
        // Get the largest dimension and add some padding (20% extra)
        const maxExtent = Math.max(extentX, extentY, extentZ);
        const shieldDiameter = maxExtent * 2 * 1.2; // 1.2 = 20% padding

        this.shieldMesh = MeshBuilder.CreateSphere(
            'shield',
            { diameter: shieldDiameter, segments: 32 },
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
        this.velocity.setAll(0);
        this.inputVector.setAll(0);
        this.mesh.position.x = 0;
        this.mesh.position.y = 0.5;
        this.mesh.rotation.setAll(0);
        this.shieldActive = false;
        if (this.shieldMesh) {
            this.shieldMesh.dispose();
            this.shieldMesh = null;
        }
    }
    
    public getPosition(): Vector3 {
        return this.mesh.position;
    }

    public getBoundingRadius(): number {
        return this.boundingRadius;
    }

    private calculateBoundingRadius(): void {
        const boundingInfo = this.mesh.getHierarchyBoundingVectors(true);
        const min = boundingInfo.min;
        const max = boundingInfo.max;
        
        // Calculate size in each dimension
        const sizeX = Math.abs(max.x - min.x);
        const sizeY = Math.abs(max.y - min.y);
        const sizeZ = Math.abs(max.z - min.z);
        
        // Use half of the largest dimension as radius
        this.boundingRadius = Math.max(sizeX, sizeY, sizeZ) / 2;
    }
}
