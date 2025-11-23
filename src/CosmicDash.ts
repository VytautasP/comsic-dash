import {
  Engine,
  Scene,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Color4,
  Mesh,
  ParticleSystem,
  Texture,
  ActionManager,
  ExecuteCodeAction,
  SphereParticleEmitter,
  PointLight,
  GlowLayer,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { Environment } from './Environment';
import { Player } from './Player';
import { UIManager } from './UIManager';

interface Obstacle {
  mesh: Mesh;
  speed: number;
  pattern?: 'static' | 'sine' | 'circle';
  time?: number;
}

interface Collectible {
  mesh: Mesh;
  type: 'points' | 'shield';
  time: number;
}

export class CosmicDash {
  private engine: Engine;
  private scene: Scene;
  private camera: ArcRotateCamera;
  
  private player: Player;
  private environment: Environment;
  private uiManager: UIManager;

  private obstacles: Obstacle[] = [];
  private collectibles: Collectible[] = [];
  private gameSpeed = 0.3;
  private baseSpeed = 0.3;
  private spawnTimer = 0;
  private collectibleTimer = 0;
  private gameRunning = false;
  private isPaused = false;
  private score = 0;
  private highScore = 0;
  private glowLayer: GlowLayer;
  private inputMap: { [key: string]: boolean } = {};
  private keyPressTimes: { [key: string]: number } = {};

  constructor(canvas: HTMLCanvasElement) {
    // Initialize Babylon.js engine
    this.engine = new Engine(canvas, true);
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.1, 0.05, 0.2, 1); // Deep purple space
    this.scene.fogMode = Scene.FOGMODE_EXP2;
    this.scene.fogDensity = 0.008; // Reduced fog for depth
    this.scene.fogColor = new Color3(0.2, 0.1, 0.3); // Purple fog

    // Setup camera
    this.camera = new ArcRotateCamera(
      'camera',
      0,
      Math.PI / 3, // Lower angle for more dramatic view
      12,
      new Vector3(0, 0, 5), // Look slightly ahead
      this.scene
    );
    this.camera.attachControl(canvas, false);
    this.camera.lowerRadiusLimit = 8;
    this.camera.upperRadiusLimit = 20;

    // Add glow effect
    this.glowLayer = new GlowLayer('glow', this.scene);
    this.glowLayer.intensity = 1.2; // Stronger glow for neon look

    // Setup lighting
    const light = new HemisphericLight('light', new Vector3(0, 1, 0), this.scene);
    light.intensity = 0.5;
    light.groundColor = new Color3(0.2, 0.1, 0.3); // Purple ambient from below

    // Add a bright star/sun ahead
    const sunLight = new PointLight('sunLight', new Vector3(0, 20, 100), this.scene);
    sunLight.diffuse = new Color3(1, 0.9, 0.8);
    sunLight.intensity = 2.0;

    // Add some colored point lights for atmosphere
    const leftLight = new PointLight('leftLight', new Vector3(-20, 10, 20), this.scene);
    leftLight.diffuse = new Color3(0, 0.8, 1); // Cyan
    leftLight.intensity = 1.0;

    const rightLight = new PointLight('rightLight', new Vector3(20, 10, 20), this.scene);
    rightLight.diffuse = new Color3(1, 0, 0.8); // Magenta
    rightLight.intensity = 1.0;

    // Initialize Managers
    this.environment = new Environment(this.scene);
    this.environment.create();

    this.player = new Player(this.scene);
    this.player.load();

    this.uiManager = new UIManager();
    this.uiManager.bindButtons(
        () => this.start(),
        () => this.restart()
    );

    // Load high score
    this.highScore = parseInt(localStorage.getItem('cosmicDashHighScore') || '0');
    this.uiManager.updateHighScore(this.highScore);
    this.uiManager.updateScore(0);

    // Setup controls
    this.setupControls();

    // Show instructions
    this.uiManager.showInstructions();

    // Start render loop
    this.engine.runRenderLoop(() => {
      if (this.gameRunning && !this.isPaused) {
        this.update();
      }
      this.scene.render();
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      this.engine.resize();
    });
  }

  private setupControls(): void {
    this.scene.actionManager = new ActionManager(this.scene);

    // Keyboard controls
    this.scene.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnKeyDownTrigger, (evt) => {
        const key = evt.sourceEvent.key.toLowerCase();
        if (!this.inputMap[key]) {
             this.keyPressTimes[key] = Date.now();
        }
        this.inputMap[key] = true;
        
        if (key === ' ' || key === 'spacebar') {
            this.togglePause();
        }
      })
    );

    this.scene.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnKeyUpTrigger, (evt) => {
        const key = evt.sourceEvent.key.toLowerCase();
        this.inputMap[key] = false;

        const pressDuration = Date.now() - (this.keyPressTimes[key] || 0);
        if (pressDuration < 100 && this.gameRunning && !this.isPaused) {
            if (key === 'arrowleft' || key === 'a') {
                this.player.barrelRoll(-1);
            } else if (key === 'arrowright' || key === 'd') {
                this.player.barrelRoll(1);
            }
        }
      })
    );
  }

  private togglePause(): void {
    if (!this.gameRunning) return;
    
    this.isPaused = !this.isPaused;
    
    if (this.isPaused) {
        this.uiManager.showPauseMenu();
    } else {
        this.uiManager.hidePauseMenu();
    }
  }

  private createObstacle(): void {
    const patterns: Array<'static' | 'sine' | 'circle'> = ['static', 'sine', 'circle'];
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];
    
    const obstacle = MeshBuilder.CreateBox(
      'obstacle',
      { size: 1 },
      this.scene
    );

    // Random lane
    const lane = Math.floor(Math.random() * 3) - 1;
    const laneY = Math.floor(Math.random() * 3) - 1;
    
    obstacle.position = new Vector3(lane * 3, 0.5 + (laneY * 2.5), 50);
    obstacle.scaling = new Vector3(1.2, 1.2, 1.2);

    const material = new StandardMaterial('obstacleMat', this.scene);
    material.emissiveColor = new Color3(1, 0, 0);
    material.diffuseColor = new Color3(1, 0.2, 0);
    obstacle.material = material;

    this.obstacles.push({
      mesh: obstacle,
      speed: this.gameSpeed,
      pattern: pattern,
      time: 0,
    });
  }

  private createCollectible(): void {
    const type = Math.random() > 0.3 ? 'points' : 'shield';
    const collectible = MeshBuilder.CreateSphere(
      'collectible',
      { diameter: 0.8 },
      this.scene
    );

    const lane = Math.floor(Math.random() * 3) - 1;
    const laneY = Math.floor(Math.random() * 3) - 1;
    
    collectible.position = new Vector3(lane * 3, 0.5 + (laneY * 2.5), 50);

    const material = new StandardMaterial('collectibleMat', this.scene);
    
    if (type === 'points') {
      material.emissiveColor = new Color3(0, 1, 0);
      material.diffuseColor = new Color3(0, 1, 0);
    } else {
      material.emissiveColor = new Color3(0, 0.5, 1);
      material.diffuseColor = new Color3(0, 0.7, 1);
    }
    
    collectible.material = material;

    this.collectibles.push({
      mesh: collectible,
      type: type,
      time: 0,
    });
  }

  private createExplosion(position: Vector3): void {
    const explosion = new ParticleSystem('explosion', 1000, this.scene);
    
    explosion.particleTexture = new Texture(
      'data:image/svg+xml;base64,' + btoa(
        '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="16" cy="16" r="16" fill="white"/></svg>'
      ),
      this.scene
    );

    explosion.emitter = position;
    const emitter = new SphereParticleEmitter(0.5);
    explosion.particleEmitterType = emitter;

    explosion.color1 = new Color4(1, 0.5, 0, 1);
    explosion.color2 = new Color4(1, 0, 0, 1);
    explosion.colorDead = new Color4(0.2, 0, 0, 0);

    explosion.minSize = 0.2;
    explosion.maxSize = 0.5;

    explosion.minLifeTime = 0.3;
    explosion.maxLifeTime = 0.8;

    explosion.emitRate = 1000;

    explosion.blendMode = ParticleSystem.BLENDMODE_ADD;

    explosion.gravity = new Vector3(0, -2, 0);

    explosion.minEmitPower = 3;
    explosion.maxEmitPower = 6;

    explosion.updateSpeed = 0.01;

    explosion.start();

    setTimeout(() => {
      explosion.stop();
      setTimeout(() => explosion.dispose(), 1000);
    }, 200);
  }

  private update(): void {
    const deltaTime = this.engine.getDeltaTime() / 1000;

    // Handle input
    let inputX = 0;
    let inputY = 0;
    if (this.inputMap['arrowleft'] || this.inputMap['a']) inputX -= 1;
    if (this.inputMap['arrowright'] || this.inputMap['d']) inputX += 1;
    if (this.inputMap['arrowup'] || this.inputMap['w']) inputY += 1;
    if (this.inputMap['arrowdown'] || this.inputMap['s']) inputY -= 1;

    this.player.setInput(inputX, inputY);
    this.player.update(deltaTime);
    this.environment.update(deltaTime, this.gameSpeed, this.baseSpeed);

    // Spawn obstacles
    this.spawnTimer += deltaTime;
    if (this.spawnTimer > 1.5) {
      this.createObstacle();
      this.spawnTimer = 0;
    }

    // Spawn collectibles
    this.collectibleTimer += deltaTime;
    if (this.collectibleTimer > 3) {
      this.createCollectible();
      this.collectibleTimer = 0;
    }

    // Update obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.time = (obs.time || 0) + deltaTime;

      // Apply movement pattern
      const originalX = Math.floor(obs.mesh.position.x / 3) * 3;
      const originalY = Math.floor((obs.mesh.position.y - 0.5) / 2.5) * 2.5 + 0.5;
      
      if (obs.pattern === 'sine') {
        obs.mesh.position.x = originalX + Math.sin(obs.time * 3) * 0.5;
      } else if (obs.pattern === 'circle') {
        obs.mesh.position.x = originalX + Math.sin(obs.time * 2) * 1;
        obs.mesh.position.y = originalY + Math.cos(obs.time * 2) * 0.5;
      }

      obs.mesh.position.z -= obs.speed * 60 * deltaTime;
      obs.mesh.rotation.y += deltaTime * 2;

      // Check collision with player
      if (obs.mesh.position.z < -2 && obs.mesh.position.z > -5) {
        const distance = Vector3.Distance(obs.mesh.position, this.player.getPosition());
        const playerRadius = this.player.getBoundingRadius();
        const obstacleRadius = 0.6; // Half of obstacle size (1.2 * 0.5)
        const collisionDistance = playerRadius + obstacleRadius;
        
        if (distance < collisionDistance) {
          if (this.player.shieldActive) {
            // Shield absorbs hit
            obs.mesh.dispose();
            this.obstacles.splice(i, 1);
            this.createExplosion(obs.mesh.position.clone());
            // Shield deactivation is handled by Player class timer
          } else {
            this.gameOver();
            return;
          }
        }
      }

      // Remove if behind player
      if (obs.mesh.position.z < -10) {
        obs.mesh.dispose();
        this.obstacles.splice(i, 1);
      }
    }

    // Update collectibles
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const col = this.collectibles[i];
      col.time += deltaTime;
      col.mesh.position.z -= this.gameSpeed * 60 * deltaTime;
      col.mesh.rotation.y += deltaTime * 3;
      
      // Keep original Y for bobbing
      const originalY = Math.floor((col.mesh.position.y - 0.5) / 2.5) * 2.5 + 0.5;
      col.mesh.position.y = originalY + Math.sin(col.time * 4) * 0.2;

      // Check collection
      if (col.mesh.position.z < -2 && col.mesh.position.z > -5) {
        const distance = Vector3.Distance(col.mesh.position, this.player.getPosition());
        const playerRadius = this.player.getBoundingRadius();
        const collectibleRadius = 0.4; // Half of collectible diameter (0.8 * 0.5)
        const collectionDistance = playerRadius + collectibleRadius;
        
        if (distance < collectionDistance) {
          if (col.type === 'points') {
            this.score += 100;
          } else {
            this.player.activateShield();
          }
          col.mesh.dispose();
          this.collectibles.splice(i, 1);
        }
      }

      // Remove if behind player
      if (col.mesh.position.z < -10) {
        col.mesh.dispose();
        this.collectibles.splice(i, 1);
      }
    }

    // Increase difficulty over time
    this.gameSpeed = this.baseSpeed + (this.score / 1000) * 0.1;

    // Update score
    this.score += deltaTime * 10;
    this.uiManager.updateScore(this.score);
  }

  private gameOver(): void {
    this.gameRunning = false;

    // Create explosion at player position
    this.createExplosion(this.player.getPosition().clone());

    // Update high score
    const finalScore = Math.floor(this.score);
    if (finalScore > this.highScore) {
      this.highScore = finalScore;
      localStorage.setItem('cosmicDashHighScore', this.highScore.toString());
    }

    // Show game over screen
    this.uiManager.showGameOver(finalScore);
    this.uiManager.updateHighScore(this.highScore);
  }

  private start(): void {
    this.uiManager.hideInstructions();
    this.restart();
  }

  private restart(): void {
    this.uiManager.hideGameOver();
    this.uiManager.hidePauseMenu();

    // Reset game state
    this.score = 0;
    this.gameSpeed = this.baseSpeed;
    this.spawnTimer = 0;
    this.collectibleTimer = 0;
    this.isPaused = false;
    
    this.player.reset();

    // Clear obstacles
    this.obstacles.forEach((obs) => obs.mesh.dispose());
    this.obstacles = [];

    // Clear collectibles
    this.collectibles.forEach((col) => col.mesh.dispose());
    this.collectibles = [];

    this.uiManager.updateScore(0);
    this.gameRunning = true;
  }

  public dispose(): void {
    this.engine.dispose();
  }
}
