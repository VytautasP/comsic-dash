import { Scene, Vector3, Color3, Color4, MeshBuilder, StandardMaterial, ParticleSystem, Texture, Mesh, PhotoDome } from '@babylonjs/core';

export class Environment {
    private scene: Scene;
    private spaceDustSystem: ParticleSystem | null = null;

    constructor(scene: Scene) {
        this.scene = scene;
    }

    public create(): void {
        // 1. Create the static background (The "Picture")
        this.createSkybox();
        
        // 2. Add depth layers
        this.createStarfield(); // Foreground stars for parallax
        this.createSpaceDust(); // Speed sensation
        this.createWorld();     // Game objects
    }

    public update(deltaTime: number, gameSpeed: number, baseSpeed: number): void {
        // Update tunnel rings
        this.scene.meshes.forEach((mesh) => {
            if (mesh.name.startsWith('ring')) {
                mesh.position.z -= gameSpeed * 60 * deltaTime;
                if (mesh.position.z < -30) {
                    mesh.position.z += 225; // 15 rings * 15 spacing
                }
            }
        });

        // Update ground
        const ground = this.scene.getMeshByName('ground');
        if (ground) {
            ground.position.z -= gameSpeed * 60 * deltaTime;
            if (ground.position.z < -50) {
                ground.position.z += 200;
            }
        }

        // Update space dust speed
        if (this.spaceDustSystem) {
            this.spaceDustSystem.updateSpeed = 0.01 * (gameSpeed / baseSpeed);
        }
    }

    private createSkybox(): void {
        // A PhotoDome uses a single 360-degree image to wrap the scene.
        // This is the most efficient way to get the "Concept Art" look.
        // Ensure you have a file at 'textures/space_environment.png'
        const dome = new PhotoDome(
            "spaceDome",
            "textures/space_environment.png", 
            {
                resolution: 64,
                size: 3000,
                useDirectMapping: false
            },
            this.scene,
            (message) => {
                console.error("Error loading PhotoDome texture:", message);
            }
        );
        
        // Adjust rotation to put the best part of the nebula in front of the player
        dome.mesh.rotation.y = 1.5 * Math.PI; 
        
        // Disable fog on the skybox so it's always visible
        if (dome.mesh.material) {
            dome.mesh.material.fogEnabled = false;
        }

        // Add an observable to check when the texture is ready
        dome.onReady = () => {
            console.log("PhotoDome texture loaded successfully!");
        };

        dome.fovMultiplier = 2.0;
    }

    private createStarfield(): void {
        const starSystem = new ParticleSystem("stars", 2000, this.scene);
        starSystem.particleTexture = new Texture(
            'data:image/svg+xml;base64,' + btoa(
                '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="16" fill="white"/></svg>'
            ),
            this.scene
        );

        starSystem.emitter = Vector3.Zero();
        // Large box around the player
        starSystem.minEmitBox = new Vector3(-200, -100, -100);
        starSystem.maxEmitBox = new Vector3(200, 100, 300);

        starSystem.color1 = new Color4(1, 1, 1, 1);
        starSystem.color2 = new Color4(0.8, 0.9, 1, 1); // Slight blue tint
        starSystem.colorDead = new Color4(0, 0, 0, 0);

        starSystem.minSize = 0.1;
        starSystem.maxSize = 0.5;

        starSystem.minLifeTime = 9999;
        starSystem.maxLifeTime = 9999;

        // Reduced count because the Skybox likely has background stars already
        starSystem.manualEmitCount = 1000;
        starSystem.blendMode = ParticleSystem.BLENDMODE_STANDARD;
        starSystem.gravity = new Vector3(0, 0, 0);
        starSystem.start();
    }

    private createSpaceDust(): void {
        const dustSystem = new ParticleSystem("dust", 2000, this.scene);
        dustSystem.particleTexture = new Texture(
            'data:image/svg+xml;base64,' + btoa(
                '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="16" fill="white"/></svg>'
            ),
            this.scene
        );

        // Emit from far ahead
        const dustEmitter = new Mesh("dustEmitter", this.scene);
        dustEmitter.position = new Vector3(0, 0, 100);
        dustEmitter.isVisible = false;
        dustSystem.emitter = dustEmitter;

        dustSystem.minEmitBox = new Vector3(-30, -20, 0);
        dustSystem.maxEmitBox = new Vector3(30, 20, 50);

        dustSystem.color1 = new Color4(1, 1, 1, 0.3);
        dustSystem.color2 = new Color4(0.5, 0.8, 1, 0.1);
        dustSystem.colorDead = new Color4(0, 0, 0, 0);

        dustSystem.minSize = 0.05;
        dustSystem.maxSize = 0.2;

        dustSystem.minLifeTime = 1.5;
        dustSystem.maxLifeTime = 3;

        dustSystem.emitRate = 300;
        dustSystem.blendMode = ParticleSystem.BLENDMODE_ADD;

        // Move towards player (negative Z)
        dustSystem.gravity = new Vector3(0, 0, 0);
        dustSystem.direction1 = new Vector3(0, 0, -1);
        dustSystem.direction2 = new Vector3(0, 0, -1);
        dustSystem.minEmitPower = 30;
        dustSystem.maxEmitPower = 60;
        dustSystem.updateSpeed = 0.01;

        dustSystem.start();
        this.spaceDustSystem = dustSystem;
    }

    private createWorld(): void {
        
        // Create a subtle energy path instead of grid
        const path = MeshBuilder.CreateGround(
            'ground',
            { width: 12, height: 200 },
            this.scene
        );
        path.position.z = 50;
        path.position.y = -2;

        const pathMat = new StandardMaterial('pathMat', this.scene);
        pathMat.diffuseColor = new Color3(0, 0, 0);
        pathMat.emissiveColor = new Color3(1, 0, 1); // Magenta
        pathMat.alpha = 0.2;
        pathMat.wireframe = true;
        path.material = pathMat;

        // Add some distant planets/moons
        const planet = MeshBuilder.CreateSphere("planet", { diameter: 60 }, this.scene);
        planet.position = new Vector3(80, 30, 200);
        const planetMat = new StandardMaterial("planetMat", this.scene);
        planetMat.emissiveColor = new Color3(0.05, 0, 0.1);
        planetMat.diffuseColor = new Color3(0.1, 0, 0.2);
        planetMat.specularColor = new Color3(0, 0, 0);
        planet.material = planetMat;
    }

    private createTrackRings(): void {

    // Create large glowing rings/gates
        for (let i = 0; i < 15; i++) {
            const ring = MeshBuilder.CreateTorus(
                `ring${i}`,
                { diameter: 25, thickness: 0.5, tessellation: 64 },
                this.scene
            );
            ring.position.z = i * 15 - 10;
            // Rotate to be vertical gates
            ring.rotation.x = Math.PI / 2;

            const material = new StandardMaterial(`ringMat${i}`, this.scene);
            material.emissiveColor = new Color3(0, 1, 1); // Cyan neon
            material.diffuseColor = new Color3(0, 0, 0);
            material.specularColor = new Color3(1, 1, 1);
            material.alpha = 0.6;
            ring.material = material;
        }
    }

}
