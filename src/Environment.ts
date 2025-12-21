import { Scene, Vector3, Color3, Color4, MeshBuilder, StandardMaterial, ParticleSystem, Texture, Mesh, PhotoDome, SphereParticleEmitter, SceneLoader, AbstractMesh, Quaternion, Space, TransformNode, AxesViewer } from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import '@babylonjs/loaders/glTF/2.0/Extensions/KHR_materials_pbrSpecularGlossiness';

export class Environment {
    private scene: Scene;
    private spaceDustSystem: ParticleSystem | null = null;
    private spaceDustNormal: Texture | null = null;
    private spaceDustStreak: Texture | null = null;
    private planet: AbstractMesh | null = null;

    private planetSpinAxis: TransformNode | null = null;

    constructor(scene: Scene) {
        this.scene = scene;
    }

    public create(): void {
        // 1. Create the static background (The "Picture")
        this.createSkybox();
        this.loadSpaceDustTextures();
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
            const speedRatio = gameSpeed / baseSpeed;
            this.spaceDustSystem.updateSpeed = 0.01 * speedRatio;
            
            // Increase emit rate when boosting (speedRatio > 1.5 means boosting roughly)
            if (speedRatio > 1.5) {
                // Switch to streak texture
                if (this.spaceDustStreak && this.spaceDustSystem.particleTexture !== this.spaceDustStreak) {
                    this.spaceDustSystem.particleTexture = this.spaceDustStreak;
                }

                this.spaceDustSystem.emitRate = 5000; 
                this.spaceDustSystem.minSize = 0.5;   // Longer streaks (due to texture aspect ratio)
                this.spaceDustSystem.maxSize = 1.5;
                this.spaceDustSystem.minEmitPower = 100; // Move faster to stretch more
                this.spaceDustSystem.maxEmitPower = 200;
            } else {
                // Switch to normal texture
                if (this.spaceDustNormal && this.spaceDustSystem.particleTexture !== this.spaceDustNormal) {
                    this.spaceDustSystem.particleTexture = this.spaceDustNormal;
                }

                this.spaceDustSystem.emitRate = 1500; 
                this.spaceDustSystem.minSize = 0.1;
                this.spaceDustSystem.maxSize = 0.4;
                this.spaceDustSystem.minEmitPower = 60;
                this.spaceDustSystem.maxEmitPower = 100;
            }
        }

        // Rotate planet
        if (this.planet) {
            this.planetSpinAxis!.rotate(Vector3.Up(), deltaTime * 0.009, Space.LOCAL);
        }
    }

    private loadSpaceDustTextures(): void {
        // Normal dust (circle)
        this.spaceDustNormal = new Texture(
            'data:image/svg+xml;base64,' + btoa(
                '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="16" fill="white"/></svg>'
            ),
            this.scene
        );

        // Streak dust (line with gradient)
        this.spaceDustStreak = new Texture(
            'data:image/svg+xml;base64,' + btoa(
                '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="256">' +
                '<defs><linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">' +
                '<stop offset="0%" style="stop-color:white;stop-opacity:0" />' +
                '<stop offset="50%" style="stop-color:white;stop-opacity:1" />' +
                '<stop offset="100%" style="stop-color:white;stop-opacity:0" />' +
                '</linearGradient></defs>' +
                '<rect x="24" y="0" width="16" height="256" fill="url(#grad)"/>' +
                '</svg>'
            ),
            this.scene
        );
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
        dome.rotation = new Vector3(0.755689761851688, 1.6485541520295364, 0.24580450130660822);// (debugNode as BABYLON.Unknown)
        // Adjust rotation to put the best part of the nebula in front of the player
        //dome.mesh.rotation.y = 1.5 * Math.PI; 
        dome.mesh.rotation = new Vector3(-0.47718987407331576, -1.096195174860977, -2.547581051109142);
        
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
        const starSystem = new ParticleSystem("stars", 4000, this.scene);
        starSystem.particleTexture = new Texture(
            'data:image/svg+xml;base64,' + btoa(
                '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="16" fill="white"/></svg>'
            ),
            this.scene
        );

        starSystem.emitter = Vector3.Zero();
        
        // Sphere emitter for 360 degree coverage
        // Radius 600 with 0.6 range creates a thick shell from 240 to 600 units
        // This keeps stars away from the immediate play area but gives depth
        const starEmitter = new SphereParticleEmitter(2500, 0.6);
        starSystem.particleEmitterType = starEmitter;

        starSystem.color1 = new Color4(1, 1, 1, 1);
        starSystem.color2 = new Color4(0.8, 0.9, 1, 1); // Slight blue tint
        starSystem.colorDead = new Color4(0, 0, 0, 0);

        // Increased size for better visibility at distance
        starSystem.minSize = 2.8;
        starSystem.maxSize = 5.5;

        starSystem.minLifeTime = 9999;
        starSystem.maxLifeTime = 9999;

        starSystem.manualEmitCount = 2000;
        starSystem.blendMode = ParticleSystem.BLENDMODE_STANDARD;
        starSystem.gravity = new Vector3(0, 0, 0);
        starSystem.start();
    }

    private createSpaceDust(): void {
        const dustSystem = new ParticleSystem("dust", 5000, this.scene);
        
        // Start with normal texture
        if (this.spaceDustNormal) {
            dustSystem.particleTexture = this.spaceDustNormal;
        }

        // Emit from far ahead
        const dustEmitter = new Mesh("dustEmitter", this.scene);
        dustEmitter.position = new Vector3(0, 0, 150);
        dustEmitter.isVisible = false;
        dustSystem.emitter = dustEmitter;

        dustSystem.minEmitBox = new Vector3(-50, -40, 0);
        dustSystem.maxEmitBox = new Vector3(150, 100, 100);

        dustSystem.color1 = new Color4(1, 1, 1, 0.5);
        dustSystem.color2 = new Color4(0.5, 0.8, 1, 0.2);
        dustSystem.colorDead = new Color4(0, 0, 0, 0);

        dustSystem.minSize = 0.1;
        dustSystem.maxSize = 0.4;

        dustSystem.minLifeTime = 2.5;
        dustSystem.maxLifeTime = 4.5;

        dustSystem.emitRate = 1500;
        dustSystem.blendMode = ParticleSystem.BLENDMODE_ADD;
        
        // Stretch particles to look like warp lines
        dustSystem.billboardMode = ParticleSystem.BILLBOARDMODE_STRETCHED;

        // Move towards player (negative Z)
        dustSystem.gravity = new Vector3(0, 0, 0);
        dustSystem.direction1 = new Vector3(0, 0, -1);
        dustSystem.direction2 = new Vector3(0, 0, -1);
        dustSystem.minEmitPower = 60;
        dustSystem.maxEmitPower = 100;
        dustSystem.updateSpeed = 0.01;

        dustSystem.start();
        this.spaceDustSystem = dustSystem;
    }

    private createWorld(): void {
        //this.createTrackRings();
        
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
        

        this.loadPlanet();
    }

    private loadPlanet(): void {
        const modelPath = '/models/planet/';
        const modelFile = 'scene.gltf';

        // Create the spin axis transform node first
        this.planetSpinAxis = new TransformNode("planetSpinAxis", this.scene);
        this.planetSpinAxis.position = new Vector3(101.23208618164062, 36.64754104614258, 221.837890625);
        this.planetSpinAxis.rotationQuaternion = new Quaternion(-0.05050054691316438, -0.9618297478723448, 0.2648289311803674, 0.04689208972756507);

        // Add some distant planets/moons
        SceneLoader.ImportMesh(
            "",
            modelPath,
            modelFile,
            this.scene,
            (meshes) => {
                console.log("Planet loaded successfully", meshes);
                const root = meshes[0];
                root.name = "planet_root";
                
                // Ensure world matrices are computed
                meshes.forEach(m => m.computeWorldMatrix(true));

                // Check bounds before moving
                const { min, max } = root.getHierarchyBoundingVectors();
                console.log("Original Planet Bounds:", min, max);
                const size = max.subtract(min);
                console.log("Original Planet Size:", size);

                // Original size is approx 4000 units. We want it to be around 60 units (like the sphere).
                // 60 / 4000 = 0.015. Let's try 0.02
                const scale = 0.06;
                root.scaling = new Vector3(scale, scale, scale);
                
                // Clear rotation quaternion to allow Euler rotation
                //root.rotationQuaternion = new Quaternion(0.9987423330849309,-0.037716609292496775,0.03303124466768622,0.0003825745021156122);
                root.rotation = new Vector3(Math.PI / 20, Math.PI , 0);

                this.planet = root;

                // Parent the planet to the spin axis (after it's loaded)
                if (this.planetSpinAxis) {
                    this.planet.parent = this.planetSpinAxis;
                    this.planet.position = Vector3.Zero();
                    //Debug axis view
                    //new AxesViewer(this.scene, 10).xAxis.parent = this.planetSpinAxis;
                    this.planet.rotation = new Vector3(-0.2916225081925105, 2.2325818092704317, -0.2842463635966254);

                }

                // Fix materials - use unlit mode to show textures without lighting dependency
                meshes.forEach((m) => {
                    if (m.material) {
                        const mat = m.material as any;
                        
                        if (mat.getClassName() === 'PBRMaterial') {
                            // Disable fog so the distant planet is clearly visible
                            mat.fogEnabled = false;
                            
                            // Use unlit mode - this shows the albedo texture directly
                            // without any lighting calculations
                            mat.unlit = true;
                            
                            // Reset emissive to avoid white glow
                            mat.emissiveColor = new Color3(0, 0, 0);
                            mat.emissiveIntensity = 0;
                            mat.emissiveTexture = null;
                        }
                    }
                });
            },
        );
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
