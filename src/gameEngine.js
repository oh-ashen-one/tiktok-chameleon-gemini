import * as THREE from 'three';
import { Sounds } from './sound.js';

class GameEngine {
  constructor() {
    this.container = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();
    
    // Game state variables
    this.role = 'hider'; // 'hider' or 'seeker'
    this.gameMode = 'normal'; // 'normal', 'infection'
    this.gameState = 'menu'; // 'menu', 'prep', 'playing', 'gameover'
    this.activeMap = 'backrooms'; // 'backrooms' or 'gallery'
    this.playTime = 0;
    this.maxPlayTime = 300; // 5 minutes (300 seconds)
    
    // Players/Bots
    this.player = null;
    this.bots = [];
    this.entities = [];
    
    // Materials & Textures
    this.textures = {};
    this.textureCanvases = {}; // for color sampling
    
    // Input
    this.keys = {};
    this.mouse = { x: 0, y: 0, yaw: 0, pitch: 0 };
    this.isPointerLocked = false;
    
    // Poses: 'stand', 'sit', 'curl', 'lie'
    this.currentPose = 'stand';
    this.camoPercentage = 0;
    
    // Seeker specific
    this.balloons = [];
    this.shotsRemaining = 10;
    this.maxShots = 10;
    
    // Event callbacks
    this.onCamoUpdate = null;
    this.onTimeUpdate = null;
    this.onChatEvent = null;
    this.onGameOver = null;
    this.onStateChange = null;
    this.onShotsUpdate = null;
    
    // Colors of current surface for comparison
    this.surfaceColor = new THREE.Color(0xffffff);
    this.surfaceMetallic = 0.0;
    this.surfaceRoughness = 0.5;
    
    // Bind methods
    this.animate = this.animate.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
  }

  init(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a14);
    this.scene.fog = new THREE.FogExp2(0x0a0a14, 0.04);

    // Create camera
    this.camera = new THREE.PerspectiveCamera(70, this.container.clientWidth / this.container.clientHeight, 0.1, 100);
    
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    
    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    // Load textures
    this.loadTextures();

    // Event listeners
    window.addEventListener('resize', () => this.onWindowResize());
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.container.addEventListener('click', () => {
      if (this.gameState === 'playing' || this.gameState === 'prep') {
        this.container.requestPointerLock();
      }
    });
    
    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = (document.pointerLockElement === this.container);
      if (this.isPointerLocked) {
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mousedown', this.handleMouseDown);
      } else {
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mousedown', this.handleMouseDown);
      }
    });

    // Start rendering loop
    this.clock.getDelta(); // Reset clock
    this.renderer.setAnimationLoop(this.animate);
  }

  loadTextures() {
    const textureLoader = new THREE.TextureLoader();
    const loadList = [
      { name: 'wallpaper', url: '/textures/wallpaper.jpg' },
      { name: 'carpet', url: '/textures/carpet.jpg' },
      { name: 'monalisa', url: '/textures/painting_monalisa.jpg' },
      { name: 'starrynight', url: '/textures/painting_starrynight.jpg' }
    ];

    loadList.forEach(item => {
      textureLoader.load(item.url, (tex) => {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.colorSpace = THREE.SRGBColorSpace;
        this.textures[item.name] = tex;
        
        // Setup offscreen canvas for texture sampling
        const img = tex.image;
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        this.textureCanvases[item.name] = { canvas, ctx, width: img.width, height: img.height };
      }, undefined, (err) => {
        console.error('Failed to load texture:', item.name, err);
      });
    });
  }

  onWindowResize() {
    if (!this.container || !this.camera || !this.renderer) return;
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  // Create standard 3D cat character (low-poly primitives)
  createCatMesh(customConfig = {}) {
    const group = new THREE.Group();
    
    // Default configs
    const config = {
      color: 0xdddddd,
      metallic: 0.1,
      roughness: 0.7,
      accessory: 'none', // 'none', 'detective_hat', 'ninja_mask', 'neon_collar'
      isAI: false,
      ...customConfig
    };

    // Material
    const material = new THREE.MeshStandardMaterial({
      color: config.color,
      metalness: config.metallic,
      roughness: config.roughness,
    });
    
    // Group all parts that can be painted
    const paintableGroup = new THREE.Group();

    // Torso (bipedal shape)
    const bodyGeo = new THREE.CylinderGeometry(0.3, 0.4, 1.2, 8);
    const bodyMesh = new THREE.Mesh(bodyGeo, material);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    bodyMesh.position.y = 0.6;
    paintableGroup.add(bodyMesh);

    // Head
    const headGeo = new THREE.SphereGeometry(0.35, 12, 12);
    const headMesh = new THREE.Mesh(headGeo, material);
    headMesh.castShadow = true;
    headMesh.position.y = 1.35;
    paintableGroup.add(headMesh);

    // Ears
    const earGeo = new THREE.ConeGeometry(0.12, 0.25, 4);
    
    const leftEar = new THREE.Mesh(earGeo, material);
    leftEar.position.set(-0.18, 1.62, 0.05);
    leftEar.rotation.z = 0.2;
    leftEar.rotation.x = -0.1;
    leftEar.castShadow = true;
    paintableGroup.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, material);
    rightEar.position.set(0.18, 1.62, 0.05);
    rightEar.rotation.z = -0.2;
    rightEar.rotation.x = -0.1;
    rightEar.castShadow = true;
    paintableGroup.add(rightEar);

    // Snout/Muzzle
    const snoutGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const snout = new THREE.Mesh(snoutGeo, material);
    snout.position.set(0, 1.3, 0.28);
    snout.scale.set(1.2, 0.8, 1);
    paintableGroup.add(snout);

    // Tail
    const tailGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.8, 6);
    const tailMesh = new THREE.Mesh(tailGeo, material);
    tailMesh.position.set(0, 0.2, -0.4);
    tailMesh.rotation.x = -0.6;
    tailMesh.castShadow = true;
    paintableGroup.add(tailMesh);

    // Limbs (4 cylinders for arms/legs)
    const limbGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 6);
    
    const legL = new THREE.Mesh(limbGeo, material);
    legL.position.set(-0.2, 0.1, 0);
    legL.castShadow = true;
    paintableGroup.add(legL);

    const legR = new THREE.Mesh(limbGeo, material);
    legR.position.set(0.2, 0.1, 0);
    legR.castShadow = true;
    paintableGroup.add(legR);

    const armL = new THREE.Mesh(limbGeo, material);
    armL.position.set(-0.4, 0.7, 0);
    armL.rotation.z = 0.2;
    armL.castShadow = true;
    paintableGroup.add(armL);

    const armR = new THREE.Mesh(limbGeo, material);
    armR.position.set(0.4, 0.7, 0);
    armR.rotation.z = -0.2;
    armR.castShadow = true;
    paintableGroup.add(armR);

    group.add(paintableGroup);

    // Eyes (Non-paintable, always black with white pupil or glowing yellow)
    const eyeGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: config.accessory === 'ninja_mask' ? 0x00ff66 : 0x222222 });
    
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.12, 1.38, 0.28);
    group.add(eyeL);

    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.12, 1.38, 0.28);
    group.add(eyeR);

    // Accessory models
    const accessoryGroup = new THREE.Group();
    
    if (config.accessory === 'detective_hat') {
      // Sherlock hat
      const capGeo = new THREE.SphereGeometry(0.36, 12, 12);
      const capMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.scale.set(1.1, 0.7, 1.2);
      cap.position.set(0, 1.6, 0);
      accessoryGroup.add(cap);

      // Visors (Front and Back)
      const visorGeo = new THREE.BoxGeometry(0.5, 0.02, 0.2);
      const visorF = new THREE.Mesh(visorGeo, capMat);
      visorF.position.set(0, 1.5, 0.35);
      visorF.rotation.x = 0.2;
      accessoryGroup.add(visorF);
      
      const visorB = new THREE.Mesh(visorGeo, capMat);
      visorB.position.set(0, 1.5, -0.35);
      visorB.rotation.x = -0.2;
      accessoryGroup.add(visorB);

      // Detective pipe (small cylinder)
      const pipeGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.15, 6);
      const pipeBowlGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.08, 6);
      const pipeMat = new THREE.MeshStandardMaterial({ color: 0x3d2314, metalness: 0.1 });
      
      const stem = new THREE.Mesh(pipeGeo, pipeMat);
      stem.rotation.x = Math.PI / 2;
      stem.position.set(0.08, 1.2, 0.32);
      stem.rotation.y = 0.4;
      accessoryGroup.add(stem);

      const bowl = new THREE.Mesh(pipeBowlGeo, pipeMat);
      bowl.position.set(0.14, 1.24, 0.38);
      accessoryGroup.add(bowl);
    } 
    else if (config.accessory === 'ninja_mask') {
      // Ninja headband ribbon
      const bandGeo = new THREE.BoxGeometry(0.72, 0.1, 0.72);
      const bandMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
      const band = new THREE.Mesh(bandGeo, bandMat);
      band.position.set(0, 1.38, 0);
      accessoryGroup.add(band);

      // Back ribbon knots
      const ribbonGeo = new THREE.BoxGeometry(0.05, 0.3, 0.1);
      const ribbonL = new THREE.Mesh(ribbonGeo, bandMat);
      ribbonL.position.set(0.05, 1.3, -0.38);
      ribbonL.rotation.z = 0.2;
      
      const ribbonR = new THREE.Mesh(ribbonGeo, bandMat);
      ribbonR.position.set(-0.05, 1.3, -0.38);
      ribbonR.rotation.z = -0.2;

      accessoryGroup.add(ribbonL);
      accessoryGroup.add(ribbonR);
    } 
    else if (config.accessory === 'neon_collar') {
      // Glowing neck ring
      const collarGeo = new THREE.TorusGeometry(0.3, 0.04, 8, 24);
      const collarMat = new THREE.MeshBasicMaterial({ color: 0xff00aa });
      const collar = new THREE.Mesh(collarGeo, collarMat);
      collar.rotation.x = Math.PI / 2;
      collar.position.set(0, 1.05, 0);
      accessoryGroup.add(collar);
    }

    group.add(accessoryGroup);

    // Save references to parts for animation
    const legs = [legL, legR];
    const arms = [armL, armR];
    const tail = tailMesh;
    const body = bodyMesh;
    const head = headMesh;

    return {
      root: group,
      paintableGroup,
      material,
      legs,
      arms,
      tail,
      body,
      head,
      config,
      accessoryGroup
    };
  }

  // Build Map 1: Backrooms
  buildBackrooms() {
    this.scene.background = new THREE.Color(0x1a1a0c);
    this.scene.fog = new THREE.FogExp2(0x1a1a0c, 0.05);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x22221b, 0.8);
    this.scene.add(ambientLight);

    // Floor
    const floorGeo = new THREE.PlaneGeometry(100, 100);
    const carpetMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: this.textures.carpet || null,
      roughness: 0.9,
      metalness: 0.0
    });
    if (this.textures.carpet) {
      this.textures.carpet.repeat.set(50, 50);
    }
    const floor = new THREE.Mesh(floorGeo, carpetMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.userData = { type: 'floor', textureName: 'carpet' };
    this.scene.add(floor);

    // Ceiling
    const ceilingGeo = new THREE.PlaneGeometry(100, 100);
    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0xddddcc, roughness: 0.8 });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 4.0;
    this.scene.add(ceiling);

    // Maze walls grid setup
    // 0 = empty, 1 = wall, 2 = pillar, 3 = table/chair cabinet
    const mapGrid = [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 2, 0, 0, 1, 0, 2, 2, 0, 0, 2, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
      [1, 0, 2, 0, 2, 0, 0, 1, 0, 2, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 1],
      [1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 0, 1, 1, 1],
      [1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1],
      [1, 0, 2, 0, 0, 1, 0, 0, 1, 0, 2, 2, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    ];

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: this.textures.wallpaper || null,
      roughness: 0.8,
      metalness: 0.0
    });
    
    const cellSize = 5;
    const offsetX = -(mapGrid[0].length * cellSize) / 2;
    const offsetZ = -(mapGrid.length * cellSize) / 2;

    this.colliders = [];
    this.hideSpots = []; // Positions bots can hide at

    for (let z = 0; z < mapGrid.length; z++) {
      for (let x = 0; x < mapGrid[z].length; x++) {
        const val = mapGrid[z][x];
        const posX = offsetX + x * cellSize + cellSize / 2;
        const posZ = offsetZ + z * cellSize + cellSize / 2;

        if (val === 1) {
          // Wall Block
          const wallGeo = new THREE.BoxGeometry(cellSize, 4, cellSize);
          const wall = new THREE.Mesh(wallGeo, wallMat);
          wall.position.set(posX, 2, posZ);
          wall.castShadow = true;
          wall.receiveShadow = true;
          wall.userData = { type: 'wall', textureName: 'wallpaper' };
          this.scene.add(wall);
          this.colliders.push(wall);
        } 
        else if (val === 2) {
          // Narrow Pillar
          const pillarGeo = new THREE.BoxGeometry(1.2, 4, 1.2);
          const pillar = new THREE.Mesh(pillarGeo, wallMat);
          pillar.position.set(posX, 2, posZ);
          pillar.castShadow = true;
          pillar.receiveShadow = true;
          pillar.userData = { type: 'wall', textureName: 'wallpaper' };
          this.scene.add(pillar);
          this.colliders.push(pillar);
          
          // Spot near pillar
          this.hideSpots.push(new THREE.Vector3(posX + 1.2, 0, posZ));
          this.hideSpots.push(new THREE.Vector3(posX - 1.2, 0, posZ));
        } 
        else if (val === 0) {
          // Office furniture decoration occasionally
          if (Math.random() < 0.12 && (x !== 2 || z !== 1)) { // don't block start spot
            this.buildDesk(posX, posZ);
          } else {
            this.hideSpots.push(new THREE.Vector3(posX, 0, posZ));
          }
        }
      }
    }

    // Add fluorescent lights that flicker slightly
    this.fluorescents = [];
    for (let i = 0; i < 8; i++) {
      const rx = (Math.random() * 40) - 20;
      const rz = (Math.random() * 20) - 10;
      
      const bulbGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8);
      const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfffee0 });
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.rotation.z = Math.PI / 2;
      bulb.position.set(rx, 3.9, rz);
      this.scene.add(bulb);

      const light = new THREE.PointLight(0xfffee5, 1.5, 15);
      light.position.set(rx, 3.7, rz);
      light.castShadow = true;
      light.shadow.bias = -0.002;
      this.scene.add(light);
      
      this.fluorescents.push({ light, bulb, originalIntensity: 1.5 });
    }
  }

  buildDesk(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.6 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.2 });

    // Tabletop
    const topGeo = new THREE.BoxGeometry(2.2, 0.08, 1.2);
    const top = new THREE.Mesh(topGeo, woodMat);
    top.position.y = 0.8;
    top.castShadow = true;
    top.receiveShadow = true;
    top.userData = { type: 'desk_top', color: 0x8b5a2b };
    group.add(top);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6);
    const legPositions = [
      [-1.0, 0.4, -0.5],
      [1.0, 0.4, -0.5],
      [-1.0, 0.4, 0.5],
      [1.0, 0.4, 0.5]
    ];
    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeo, metalMat);
      leg.position.set(...pos);
      leg.castShadow = true;
      group.add(leg);
    });

    // Office Filing Cabinet
    if (Math.random() < 0.5) {
      const cabGeo = new THREE.BoxGeometry(0.8, 1.2, 0.8);
      const cabMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7, roughness: 0.3 });
      const cab = new THREE.Mesh(cabGeo, cabMat);
      cab.position.set(0.6, 0.6, 0);
      cab.castShadow = true;
      cab.userData = { type: 'cabinet', color: 0x555555, metallic: 0.7, roughness: 0.3 };
      group.add(cab);
      this.colliders.push(cab);
    }

    this.scene.add(group);
    
    // Add table frame to colliders for movement blocking
    const boundingBox = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.0, 1.2),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    boundingBox.position.set(x, 0.5, z);
    this.scene.add(boundingBox);
    this.colliders.push(boundingBox);

    // Spots on top of tables are fantastic hiding spots!
    this.hideSpots.push(new THREE.Vector3(x, 0.85, z));
  }

  // Build Map 2: Art Gallery
  buildGallery() {
    this.scene.background = new THREE.Color(0x050508);
    this.scene.fog = new THREE.FogExp2(0x050508, 0.03);

    // Ambient
    const ambientLight = new THREE.AmbientLight(0x33333e, 0.5);
    this.scene.add(ambientLight);

    // Floor (Polished wooden floor)
    const floorGeo = new THREE.PlaneGeometry(80, 80);
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x6e4726,
      roughness: 0.15,
      metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeo, woodMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.userData = { type: 'floor', color: 0x6e4726 };
    this.scene.add(floor);

    // Gallery Walls
    this.colliders = [];
    this.hideSpots = [];
    const galleryWallMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.9 });

    // Outer Walls
    const wallHeight = 6;
    const outerWallGeos = [
      { w: 80, d: 1, h: wallHeight, x: 0, z: -40 },
      { w: 80, d: 1, h: wallHeight, x: 0, z: 40 },
      { w: 1, d: 80, h: wallHeight, x: -40, z: 0 },
      { w: 1, d: 80, h: wallHeight, x: 40, z: 0 }
    ];

    outerWallGeos.forEach(item => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(item.w, item.h, item.d), galleryWallMat);
      mesh.position.set(item.x, wallHeight / 2, item.z);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      mesh.userData = { type: 'wall', color: 0xeeeeee };
      this.scene.add(mesh);
      this.colliders.push(mesh);
    });

    // Inner exhibition partitions
    const innerWalls = [
      { w: 20, d: 1, x: -20, z: -15 },
      { w: 20, d: 1, x: 20, z: -15 },
      { w: 20, d: 1, x: -20, z: 15 },
      { w: 20, d: 1, x: 20, z: 15 },
      { w: 1, d: 20, x: 0, z: 0 }
    ];

    innerWalls.forEach(item => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(item.w, wallHeight, item.d), galleryWallMat);
      mesh.position.set(item.x, wallHeight / 2, item.z);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      mesh.userData = { type: 'wall', color: 0xeeeeee };
      this.scene.add(mesh);
      this.colliders.push(mesh);

      // Spots next to partition walls
      this.hideSpots.push(new THREE.Vector3(item.x + 2, 0, item.z + 1.2));
      this.hideSpots.push(new THREE.Vector3(item.x - 2, 0, item.z - 1.2));
    });

    // Pedestals with Statues (Museum exhibition props)
    const pedestalGeos = [
      { x: -10, z: -5 },
      { x: 10, z: -5 },
      { x: -10, z: 8 },
      { x: 10, z: 8 }
    ];

    pedestalGeos.forEach(pos => {
      const pedGroup = new THREE.Group();
      pedGroup.position.set(pos.x, 0, pos.z);

      const pedMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.1, roughness: 0.1 });
      const ped = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.2, 1.0), pedMat);
      ped.position.y = 0.6;
      ped.castShadow = true;
      ped.receiveShadow = true;
      ped.userData = { type: 'pedestal', color: 0xffffff, metallic: 0.1, roughness: 0.1 };
      pedGroup.add(ped);

      // Statue sphere/torus
      const statueMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, metalness: 0.9, roughness: 0.1 });
      const statue = new THREE.Mesh(new THREE.TorusKnotGeometry(0.3, 0.1, 40, 8), statueMat);
      statue.position.y = 1.6;
      statue.castShadow = true;
      statue.userData = { type: 'statue', color: 0xccaa44, metallic: 0.9, roughness: 0.1 };
      pedGroup.add(statue);

      this.scene.add(pedGroup);

      // Add to collider
      const bounds = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 1.8, 1.0),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      bounds.position.set(pos.x, 0.9, pos.z);
      this.scene.add(bounds);
      this.colliders.push(bounds);

      // Hide spot: standing exactly where the statue is!
      this.hideSpots.push(new THREE.Vector3(pos.x, 1.2, pos.z));
    });

    // Hanging Masterpieces (The Art Paintings!)
    this.paintings = [];
    this.addGalleryPainting('monalisa', -20, 2.5, -14.4, 0); // Facing south
    this.addGalleryPainting('starrynight', 20, 2.5, -14.4, 0);
    this.addGalleryPainting('monalisa', -20, 2.5, 14.4, Math.PI); // Facing north
    this.addGalleryPainting('starrynight', 20, 2.5, 14.4, Math.PI);
    
    // Spotlight for paintings
    this.paintings.forEach(painting => {
      const spot = new THREE.SpotLight(0xffffff, 4, 10, Math.PI / 6, 0.5, 1);
      spot.position.set(painting.mesh.position.x, 5, painting.mesh.position.z + (painting.mesh.rotation.y === 0 ? 3 : -3));
      spot.target = painting.mesh;
      this.scene.add(spot);
      this.scene.add(spot.target);
    });

    // General spots
    for (let i = 0; i < 20; i++) {
      this.hideSpots.push(new THREE.Vector3((Math.random() * 60) - 30, 0, (Math.random() * 60) - 30));
    }
  }

  addGalleryPainting(textureName, x, y, z, rotationY) {
    // Frame
    const frameGeo = new THREE.BoxGeometry(3.2, 4.2, 0.15);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xccaa44, metalness: 0.8, roughness: 0.2 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.set(x, y, z);
    frame.rotation.y = rotationY;
    frame.castShadow = true;
    this.scene.add(frame);

    // Canvas
    const canvasGeo = new THREE.PlaneGeometry(2.8, 3.8);
    const canvasMat = new THREE.MeshStandardMaterial({
      map: this.textures[textureName] || null,
      roughness: 0.6
    });
    const canvasMesh = new THREE.Mesh(canvasGeo, canvasMat);
    
    // Offset slightly forward from frame
    canvasMesh.position.set(0, 0, 0.09);
    frame.add(canvasMesh);

    // Save painting metadata for UV / color sampling
    const paintingObj = {
      mesh: canvasMesh,
      frame: frame,
      textureName: textureName,
      width: 2.8,
      height: 3.8
    };
    this.paintings.push(paintingObj);
    
    // Also add frame to colliders
    this.colliders.push(frame);
  }

  // Setup the Lobby and Players
  setupMatch(role, mapName, avatarId, color, metallic, roughness, accessory) {
    this.role = role;
    this.activeMap = mapName;
    this.gameState = 'prep';
    this.playTime = 0;
    this.shotsRemaining = this.maxShots;
    
    // Reset lists
    this.bots = [];
    this.entities = [];
    this.balloons = [];
    
    // Clear old scene
    while(this.scene.children.length > 0){ 
      this.scene.remove(this.scene.children[0]); 
    }
    
    if (this.activeMap === 'backrooms') {
      this.buildBackrooms();
    } else {
      this.buildGallery();
    }

    // Set up player
    const spawnPos = new THREE.Vector3(0, 0, 0);
    if (this.activeMap === 'backrooms') {
      spawnPos.set(-15, 0, -15);
    } else {
      spawnPos.set(-25, 0, -25);
    }
    
    const cat = this.createCatMesh({
      color: color,
      metallic: metallic,
      roughness: roughness,
      accessory: role === 'seeker' ? 'detective_hat' : accessory,
      isAI: false
    });
    
    cat.root.position.copy(spawnPos);
    this.scene.add(cat.root);
    
    this.player = {
      ...cat,
      velocity: new THREE.Vector3(),
      isGrounded: true,
      role: role,
      camoScore: 100,
      isCaught: false,
      username: 'TikTokCat_Me'
    };
    
    this.entities.push(this.player);

    // Setup Bots (Simulated Multiplayer!)
    const botUsernames = [
      'GlowWorm99', 'NinjaMeow', 'SassyWhiskers', 'NyanSlayer', 'CamoKing', 
      'SherlockPaws', 'InspectorNose', 'ClawEnforcer'
    ];
    
    const botAccessories = ['none', 'ninja_mask', 'neon_collar', 'detective_hat'];

    // Spawn 5 bots
    for (let i = 0; i < 5; i++) {
      const bRole = this.role === 'seeker' ? 'hider' : (i < 2 ? 'seeker' : 'hider');
      
      const bColor = Math.random() * 0xffffff;
      const bAccessory = bRole === 'seeker' ? 'detective_hat' : botAccessories[Math.floor(Math.random() * 3)];
      
      const bCat = this.createCatMesh({
        color: bColor,
        metallic: Math.random() * 0.4,
        roughness: 0.3 + Math.random() * 0.7,
        accessory: bAccessory,
        isAI: true
      });
      
      // Find a spawn spot from hideSpots or random
      let bSpawn = new THREE.Vector3();
      if (this.hideSpots.length > 0) {
        const spotIdx = Math.floor(Math.random() * this.hideSpots.length);
        bSpawn.copy(this.hideSpots[spotIdx]);
        // Adjust Y slightly for furniture
        if (bSpawn.y > 0.1) bSpawn.y -= 0.85; // reset to floor for start
      } else {
        bSpawn.set((Math.random() * 20) - 10, 0, (Math.random() * 20) - 10);
      }
      
      bCat.root.position.copy(bSpawn);
      this.scene.add(bCat.root);

      const bot = {
        ...bCat,
        velocity: new THREE.Vector3(),
        isGrounded: true,
        role: bRole,
        camoScore: 80,
        isCaught: false,
        username: botUsernames[i % botUsernames.length],
        aiState: 'patrol',
        targetSpot: null,
        patrolTimer: 0,
        spotlight: null,
        spotlightCone: null,
        chaseTarget: null
      };

      // If bot is Seeker, give them a flashlight spotlight
      if (bRole === 'seeker') {
        this.addSeekerFlashlight(bot);
      }

      this.bots.push(bot);
      this.entities.push(bot);
    }

    // Set up camera positions
    this.mouse.yaw = 0;
    this.mouse.pitch = -0.2;

    // Trigger state changes
    if (this.onStateChange) this.onStateChange(this.gameState);
    if (this.onShotsUpdate) this.onShotsUpdate(this.shotsRemaining);

    // Synthesize start match sound
    Sounds.playClick();
    setTimeout(() => {
      Sounds.playMeow(1.2);
    }, 500);
  }

  addSeekerFlashlight(bot) {
    const spotLight = new THREE.SpotLight(0xffffff, 8, 20, Math.PI / 8, 0.4, 1);
    spotLight.castShadow = true;
    spotLight.shadow.bias = -0.002;
    // position at cat's head
    spotLight.position.set(0, 1.4, 0.2);
    bot.root.add(spotLight);
    
    // Add target object
    const targetObj = new THREE.Object3D();
    targetObj.position.set(0, 0, 5); // 5 units ahead
    bot.root.add(targetObj);
    spotLight.target = targetObj;

    // Conical Mesh to make flashlight beam visible
    const coneGeo = new THREE.ConeGeometry(20 * Math.sin(Math.PI / 8), 20, 16, 1, true);
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xfffee0,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    // Rotate cone to align along the Z-axis forward
    cone.rotation.x = Math.PI / 2;
    cone.position.set(0, 0, 10);
    spotLight.add(cone);

    bot.spotlight = spotLight;
    bot.spotlightCone = cone;
  }

  // Eyedropper Surface Color Sampling
  eyedropSurface() {
    if (this.role !== 'hider' || !this.player || this.gameState === 'menu') return;

    // Shoot ray downwards to check floor
    const raycaster = new THREE.Raycaster();
    const playerPos = this.player.root.position.clone();
    
    // Ray down
    raycaster.set(new THREE.Vector3(playerPos.x, playerPos.y + 0.5, playerPos.z), new THREE.Vector3(0, -1, 0));
    
    let intersects = raycaster.intersectObjects(this.scene.children, true);
    
    // Filter out player parts
    intersects = intersects.filter(i => {
      let node = i.object;
      while (node) {
        if (node === this.player.root) return false;
        node = node.parent;
      }
      return true;
    });

    if (intersects.length > 0) {
      const hit = intersects[0];
      this.sampleColorFromIntersection(hit);
    } else {
      // Ray forward to check walls/paintings
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.player.root.quaternion);
      raycaster.set(new THREE.Vector3(playerPos.x, playerPos.y + 1.0, playerPos.z), forward);
      
      let wIntersects = raycaster.intersectObjects(this.scene.children, true);
      wIntersects = wIntersects.filter(i => {
        let node = i.object;
        while (node) {
          if (node === this.player.root) return false;
          node = node.parent;
        }
        return true;
      });

      if (wIntersects.length > 0 && wIntersects[0].distance < 3) {
        this.sampleColorFromIntersection(wIntersects[0]);
      }
    }
  }

  sampleColorFromIntersection(hit) {
    const obj = hit.object;
    let sampledColor = new THREE.Color(0xcccccc);
    let sampledMetallic = 0.0;
    let sampledRoughness = 0.8;

    // Check if it's an exhibition painting in the Gallery
    let isPainting = false;
    let paintingObj = null;
    
    this.paintings?.forEach(p => {
      if (p.mesh === obj) {
        isPainting = true;
        paintingObj = p;
      }
    });

    if (isPainting && paintingObj && hit.uv) {
      // Sample pixel from the loaded painting canvas
      const texData = this.textureCanvases[paintingObj.textureName];
      if (texData) {
        const u = hit.uv.x;
        const v = hit.uv.y;
        
        // UV coordinates [0, 1] mapped to image coordinates
        const px = Math.floor(u * texData.width);
        const py = Math.floor((1 - v) * texData.height);
        
        try {
          const pixel = texData.ctx.getImageData(px, py, 1, 1).data;
          sampledColor.setRGB(pixel[0] / 255, pixel[1] / 255, pixel[2] / 255);
          sampledRoughness = 0.5;
          sampledMetallic = 0.0;
        } catch (e) {
          console.error('Error reading pixel data:', e);
        }
      }
    } else if (obj.userData?.textureName && this.textureCanvases[obj.userData.textureName]) {
      // Floor or Wall texture repeating
      const texName = obj.userData.textureName;
      const texData = this.textureCanvases[texName];
      if (texData && hit.uv) {
        // Since textures repeat, tile UV coordinates
        let u = hit.uv.x;
        let v = hit.uv.y;
        
        // Repeat mapping
        if (texName === 'carpet') {
          u = (u * 50) % 1;
          v = (v * 50) % 1;
        } else if (texName === 'wallpaper') {
          // walls are scaled
          u = (u * 1) % 1;
          v = (v * 1) % 1;
        }

        const px = Math.floor(u * texData.width);
        const py = Math.floor((1 - v) * texData.height);
        
        try {
          const pixel = texData.ctx.getImageData(px, py, 1, 1).data;
          sampledColor.setRGB(pixel[0] / 255, pixel[1] / 255, pixel[2] / 255);
          sampledRoughness = obj.material.roughness || 0.8;
          sampledMetallic = obj.material.metalness || 0.0;
        } catch (e) {
          sampledColor.copy(obj.material.color || new THREE.Color(0xffffff));
        }
      }
    } else if (obj.material) {
      // Standard solid colored materials (pedestals, furniture, statues)
      if (Array.isArray(obj.material)) {
        sampledColor.copy(obj.material[0].color);
        sampledRoughness = obj.material[0].roughness || 0.5;
        sampledMetallic = obj.material[0].metalness || 0.0;
      } else {
        sampledColor.copy(obj.material.color);
        sampledRoughness = obj.material.roughness || 0.5;
        sampledMetallic = obj.material.metalness || 0.0;
      }
    }

    // Save surface color for comparison metrics
    this.surfaceColor.copy(sampledColor);
    this.surfaceMetallic = sampledMetallic;
    this.surfaceRoughness = sampledRoughness;

    // Apply color/material details to the player model
    this.player.material.color.copy(sampledColor);
    this.player.material.metalness = sampledMetallic;
    this.player.material.roughness = sampledRoughness;
    this.player.material.needsUpdate = true;

    // Sound
    Sounds.playEyedrop();
    Sounds.playSpray();

    // Trigger HUD updates
    this.updateCamouflageScore();
  }

  // Apply custom sliders directly
  setPlayerPaint(colorHex, metallic, roughness) {
    if (!this.player) return;
    this.player.material.color.set(colorHex);
    this.player.material.metalness = parseFloat(metallic);
    this.player.material.roughness = parseFloat(roughness);
    this.player.material.needsUpdate = true;

    // Manual slide: check new score
    this.updateCamouflageScore();
  }

  // Update Pose & Animate joints
  setPose(poseName) {
    if (this.currentPose === poseName || !this.player || this.gameState === 'menu') return;
    this.currentPose = poseName;
    Sounds.playClick();
    this.animatePlayerPose(this.player, poseName);
    this.updateCamouflageScore();
  }

  animatePlayerPose(cat, pose) {
    // Reset rotations and scale
    cat.paintableGroup.position.set(0, 0, 0);
    cat.paintableGroup.scale.set(1, 1, 1);
    cat.legs.forEach(leg => { leg.rotation.set(0, 0, 0); leg.position.y = 0.1; });
    cat.arms.forEach(arm => { arm.rotation.set(0, 0, 0); arm.position.y = 0.7; });
    cat.body.position.y = 0.6;
    cat.body.scale.set(1, 1, 1);
    cat.head.position.set(0, 1.35, 0);
    cat.tail.rotation.set(-0.6, 0, 0);

    if (pose === 'sit') {
      // Legs fold, body sits lower
      cat.paintableGroup.position.y = -0.3;
      cat.legs[0].rotation.x = -Math.PI / 2;
      cat.legs[1].rotation.x = -Math.PI / 2;
      cat.legs[0].position.y = 0.2;
      cat.legs[1].position.y = 0.2;
      cat.tail.rotation.x = -0.1;
    } 
    else if (pose === 'curl') {
      // Roll into a compact ball
      cat.paintableGroup.scale.set(0.7, 0.7, 0.7);
      cat.paintableGroup.position.y = -0.25;
      
      cat.legs[0].rotation.set(-Math.PI / 2, 0, 0.3);
      cat.legs[1].rotation.set(-Math.PI / 2, 0, -0.3);
      
      cat.arms[0].rotation.set(Math.PI / 2, 0, -0.3);
      cat.arms[1].rotation.set(Math.PI / 2, 0, 0.3);
      
      cat.head.position.y = 1.1; // pull head in
      cat.tail.rotation.x = -Math.PI / 2;
    } 
    else if (pose === 'lie') {
      // Flatten flat on the ground
      cat.paintableGroup.rotation.x = -Math.PI / 2.2;
      cat.paintableGroup.position.set(0, -0.4, 0.3);
      cat.legs[0].rotation.x = 0.4;
      cat.legs[1].rotation.x = 0.4;
      cat.tail.rotation.x = -1.2;
    }
  }

  // Calculate Hider Camouflage match
  updateCamouflageScore() {
    if (this.role !== 'hider' || !this.player) return;

    // If player is moving, camouflage collapses
    const velLen = this.player.velocity.length();
    if (velLen > 0.05) {
      this.camoPercentage = Math.max(5, Math.floor(Math.random() * 15 + 5)); // 5% - 20%
      if (this.onCamoUpdate) this.onCamoUpdate(this.camoPercentage);
      return;
    }

    // Color match calculation
    const pCol = this.player.material.color;
    const sCol = this.surfaceColor;
    const pMet = this.player.material.metalness;
    const sMet = this.surfaceMetallic;
    const pRough = this.player.material.roughness;
    const sRough = this.surfaceRoughness;

    // Euclidean distance in RGB color space [0, sqrt(3)]
    const distColor = Math.sqrt(
      Math.pow(pCol.r - sCol.r, 2) +
      Math.pow(pCol.g - sCol.g, 2) +
      Math.pow(pCol.b - sCol.b, 2)
    ) / Math.sqrt(3);

    // Differences in metalness and roughness [0, 1]
    const distMetallic = Math.abs(pMet - sMet);
    const distRoughness = Math.abs(pRough - sRough);

    // Combined weight metrics
    // Color is 60% of score, metalness is 20%, roughness is 20%
    const diff = (distColor * 0.6) + (distMetallic * 0.2) + (distRoughness * 0.2);

    let baseCamo = 100 * (1 - diff);

    // Add posing bonuses
    if (this.currentPose === 'sit') baseCamo += 5;
    else if (this.currentPose === 'curl') baseCamo += 8;
    else if (this.currentPose === 'lie') baseCamo += 10;

    // Clamp score
    this.camoPercentage = Math.min(100, Math.max(0, Math.floor(baseCamo)));
    this.player.camoScore = this.camoPercentage;

    if (this.onCamoUpdate) this.onCamoUpdate(this.camoPercentage);
  }

  // Shooting Water Balloons (Seeker Weapon)
  shootBalloon() {
    if (this.role !== 'seeker' || this.shotsRemaining <= 0 || this.gameState !== 'playing') return;

    this.shotsRemaining--;
    if (this.onShotsUpdate) this.onShotsUpdate(this.shotsRemaining);

    Sounds.playSplash();

    // Create 3D water balloon projectile (sphere)
    const balloonGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const balloonMat = new THREE.MeshBasicMaterial({ color: 0x00ccff });
    const balloon = new THREE.Mesh(balloonGeo, balloonMat);

    // Spawn slightly in front of camera
    const spawnPos = this.camera.position.clone();
    
    // Direction vector from camera
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    spawnPos.addScaledVector(dir, 0.5);

    balloon.position.copy(spawnPos);
    this.scene.add(balloon);

    // Gravity physics properties
    const speed = 18;
    const velocity = dir.multiplyScalar(speed);

    this.balloons.push({
      mesh: balloon,
      velocity: velocity,
      life: 3.0 // seconds max
    });

    // Chat activity simulator
    if (this.shotsRemaining === 3 && this.onChatEvent) {
      this.onChatEvent('TikTokCat_Me', 'Out of ammo soon! Need to look closer!');
    }
  }

  // Process game cycles (dt = delta time in seconds)
  update(dt) {
    if (this.gameState === 'menu') return;

    this.playTime += dt;
    if (this.onTimeUpdate) {
      this.onTimeUpdate(Math.max(0, Math.ceil(this.maxPlayTime - this.playTime)));
    }

    if (this.playTime >= this.maxPlayTime) {
      this.endGame('time_out');
      return;
    }

    // Flicker fluorescent lights in Backrooms
    if (this.activeMap === 'backrooms') {
      this.fluorescents?.forEach(item => {
        if (Math.random() < 0.02) {
          // Start flicker
          item.light.intensity = 0.2;
          item.bulb.material.color.setHex(0x333322);
        } else if (item.light.intensity < item.originalIntensity) {
          // Recover
          item.light.intensity = item.originalIntensity;
          item.bulb.material.color.setHex(0xfffee0);
        }
      });
    }

    // 1. Update Player Physics & Movement
    this.updatePlayerMovement(dt);

    // 2. Update Water Balloons
    this.updateWaterBalloons(dt);

    // 3. Update Bots Behavior
    this.updateBots(dt);

    // 4. Update Camouflage Score on time intervals
    if (this.role === 'hider') {
      this.updateCamouflageScore();
    }
  }

  updatePlayerMovement(dt) {
    if (!this.player || this.gameState === 'menu') return;

    // Movement speeds
    let moveSpeed = 4.5;
    if (this.currentPose === 'sit') moveSpeed = 1.5;
    else if (this.currentPose === 'curl') moveSpeed = 0.5;
    else if (this.currentPose === 'lie') moveSpeed = 0.2;

    const gravity = 22;
    const jumpForce = 8.5;

    // Update rotation first based on mouse yaw
    this.player.root.rotation.y = this.mouse.yaw;

    // Movement vectors
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.player.root.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.player.root.quaternion);

    let moveX = 0;
    let moveZ = 0;

    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveZ -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveZ += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;

    // Normalize
    const moveDir = new THREE.Vector3()
      .addScaledVector(forward, moveZ)
      .addScaledVector(right, moveX);
    if (moveDir.length() > 0) moveDir.normalize();

    this.player.velocity.x = moveDir.x * moveSpeed;
    this.player.velocity.z = moveDir.z * moveSpeed;

    // Jump
    if (this.keys['Space'] && this.player.isGrounded && this.currentPose === 'stand') {
      this.player.velocity.y = jumpForce;
      this.player.isGrounded = false;
      Sounds.playClick();
    }

    // Apply gravity
    if (!this.player.isGrounded) {
      this.player.velocity.y -= gravity * dt;
    }

    // Save previous position for collision response
    const prevPos = this.player.root.position.clone();
    
    // Apply velocity
    this.player.root.position.x += this.player.velocity.x * dt;
    this.player.root.position.z += this.player.velocity.z * dt;
    this.player.root.position.y += this.player.velocity.y * dt;

    // Floor collision
    // Check if on pedestal/furniture vs floor
    let standingHeight = 0;
    
    // Pedestal surface height checks
    this.colliders.forEach(col => {
      // Check top of pedestals / desks (simplified axis bounding box check)
      const dx = Math.abs(this.player.root.position.x - col.position.x);
      const dz = Math.abs(this.player.root.position.z - col.position.z);
      
      const width = col.geometry.parameters.width;
      const depth = col.geometry.parameters.depth;
      const height = col.geometry.parameters.height;
      const topY = col.position.y + height / 2;

      if (dx < width/2 + 0.1 && dz < depth/2 + 0.1) {
        // Intersecting bounds from above
        if (prevPos.y >= topY - 0.2 && this.player.root.position.y <= topY + 0.1) {
          standingHeight = topY;
        }
      }
    });

    if (this.player.root.position.y <= standingHeight) {
      this.player.root.position.y = standingHeight;
      this.player.velocity.y = 0;
      this.player.isGrounded = true;
    }

    // Wall collision checks
    this.colliders.forEach(col => {
      const dx = Math.abs(this.player.root.position.x - col.position.x);
      const dz = Math.abs(this.player.root.position.z - col.position.z);
      
      const width = col.geometry.parameters.width;
      const depth = col.geometry.parameters.depth;
      const height = col.geometry.parameters.height;
      const topY = col.position.y + height / 2;

      // Wall collision if inside bounds (excluding from top landing height)
      if (dx < width/2 + 0.35 && dz < depth/2 + 0.35 && this.player.root.position.y < topY - 0.1) {
        // Push back player out of collider
        const pushX = (width/2 + 0.35) - dx;
        const pushZ = (depth/2 + 0.35) - dz;

        if (pushX < pushZ) {
          this.player.root.position.x += (this.player.root.position.x > col.position.x) ? pushX : -pushX;
        } else {
          this.player.root.position.z += (this.player.root.position.z > col.position.z) ? pushZ : -pushZ;
        }
      }
    });

    // Map limits
    const limit = 48;
    if (this.player.root.position.x > limit) this.player.root.position.x = limit;
    if (this.player.root.position.x < -limit) this.player.root.position.x = -limit;
    if (this.player.root.position.z > limit) this.player.root.position.z = limit;
    if (this.player.root.position.z < -limit) this.player.root.position.z = -limit;

    // Limb walking animation
    if (moveDir.length() > 0 && this.player.isGrounded && this.currentPose === 'stand') {
      const time = this.clock.getElapsedTime() * 12;
      this.player.legs[0].rotation.x = Math.sin(time) * 0.5;
      this.player.legs[1].rotation.x = -Math.sin(time) * 0.5;
      this.player.arms[0].rotation.x = -Math.sin(time) * 0.4;
      this.player.arms[1].rotation.x = Math.sin(time) * 0.4;
    } else {
      // Idle rotations slowly resetting
      if (this.currentPose === 'stand') {
        this.player.legs.forEach(leg => leg.rotation.x = 0);
        this.player.arms.forEach(arm => arm.rotation.x = 0);
      }
    }

    // 1st Person / 3rd Person camera mapping
    if (this.role === 'seeker') {
      // First Person (inside head looking out)
      this.camera.position.set(
        this.player.root.position.x,
        this.player.root.position.y + 1.35,
        this.player.root.position.z
      );
      this.camera.rotation.set(0, 0, 0);
      this.camera.rotation.y = this.mouse.yaw + Math.PI;
      this.camera.rotation.x = this.mouse.pitch;
    } else {
      // Third Person (orbit camera behind cat)
      const cameraOffset = new THREE.Vector3(0, 1.8, 3.8); // offsets behind cat
      
      // Orbit calculations
      cameraOffset.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.mouse.pitch);
      cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.mouse.yaw);

      const targetCamPos = this.player.root.position.clone().add(cameraOffset);
      
      // Interpolate for smooth camera follow
      this.camera.position.lerp(targetCamPos, 0.15);
      this.camera.lookAt(this.player.root.position.clone().add(new THREE.Vector3(0, 1.0, 0)));
    }
  }

  updateWaterBalloons(dt) {
    for (let i = this.balloons.length - 1; i >= 0; i--) {
      const b = this.balloons[i];
      b.life -= dt;

      // Apply simple physics
      b.mesh.position.addScaledVector(b.velocity, dt);
      b.velocity.y -= 9.8 * dt; // Gravity

      let hitDetected = false;

      // Check collision with walls/colliders
      this.colliders.forEach(col => {
        const dx = Math.abs(b.mesh.position.x - col.position.x);
        const dz = Math.abs(b.mesh.position.z - col.position.z);
        const dy = Math.abs(b.mesh.position.y - col.position.y);
        
        const width = col.geometry.parameters.width;
        const depth = col.geometry.parameters.depth;
        const height = col.geometry.parameters.height;

        if (dx < width/2 + 0.15 && dz < depth/2 + 0.15 && dy < height/2 + 0.15) {
          hitDetected = true;
        }
      });

      // Check floor
      if (b.mesh.position.y <= 0) {
        hitDetected = true;
      }

      // Check collision with AI Hiders!
      this.bots.forEach(bot => {
        if (bot.role === 'hider' && !bot.isCaught) {
          const dist = b.mesh.position.distanceTo(bot.root.position.clone().add(new THREE.Vector3(0, 0.7, 0)));
          if (dist < 0.7) {
            hitDetected = true;
            this.revealHider(bot);
          }
        }
      });

      // Remove balloon on expiry or impact
      if (hitDetected || b.life <= 0) {
        this.scene.remove(b.mesh);
        this.balloons.splice(i, 1);
        
        // Spawn particle splash
        this.spawnSplashEffect(b.mesh.position);
      }
    }
  }

  spawnSplashEffect(pos) {
    const splashGroup = new THREE.Group();
    splashGroup.position.copy(pos);
    this.scene.add(splashGroup);

    const partGeo = new THREE.SphereGeometry(0.04, 4, 4);
    const partMat = new THREE.MeshBasicMaterial({ color: 0x44ccff, transparent: true, opacity: 0.8 });
    const particles = [];

    for (let i = 0; i < 15; i++) {
      const p = new THREE.Mesh(partGeo, partMat);
      
      const speed = 2 + Math.random() * 3;
      const angleTheta = Math.random() * Math.PI * 2;
      const anglePhi = Math.random() * Math.PI;

      const vx = speed * Math.sin(anglePhi) * Math.cos(angleTheta);
      const vy = speed * Math.cos(anglePhi);
      const vz = speed * Math.sin(anglePhi) * Math.sin(angleTheta);

      p.userData = { vel: new THREE.Vector3(vx, vy, vz), life: 0.4 };
      splashGroup.add(p);
      particles.push(p);
    }

    // Track life of splash particles
    const animateSplash = () => {
      let alive = false;
      particles.forEach(p => {
        p.userData.life -= 0.016;
        if (p.userData.life > 0) {
          p.position.addScaledVector(p.userData.vel, 0.016);
          p.userData.vel.y -= 9.8 * 0.016; // gravity
          p.material.opacity = p.userData.life / 0.4;
          alive = true;
        } else {
          p.visible = false;
        }
      });

      if (alive) {
        requestAnimationFrame(animateSplash);
      } else {
        this.scene.remove(splashGroup);
      }
    };
    animateSplash();
  }

  revealHider(bot) {
    bot.isCaught = true;
    Sounds.playTag();
    Sounds.playMeow(0.8);
    
    // Flash character model in red
    const origCol = bot.material.color.clone();
    bot.material.color.setHex(0xff0000);
    
    setTimeout(() => {
      bot.material.color.copy(origCol);
    }, 1500);

    if (this.onChatEvent) {
      this.onChatEvent(bot.username, 'Oh no! You splashed me! 🙀');
      setTimeout(() => {
        this.onChatEvent('System', `${bot.username} has been captured by TikTokCat_Me!`);
      }, 800);
    }

    // Infection Mode conversion
    if (this.gameMode === 'infection') {
      bot.role = 'seeker';
      bot.isCaught = false;
      this.addSeekerFlashlight(bot);
      
      if (this.onChatEvent) {
        setTimeout(() => {
          this.onChatEvent(bot.username, 'Entering search mode, meow meow!');
        }, 1500);
      }
    }

    // Check Win/Loss conditions
    this.checkGameProgress();
  }

  checkGameProgress() {
    // Count active hiders
    let hidersLeft = 0;
    
    if (this.role === 'hider' && !this.player.isCaught) hidersLeft++;
    this.bots.forEach(bot => {
      if (bot.role === 'hider' && !bot.isCaught) hidersLeft++;
    });

    if (hidersLeft === 0) {
      this.endGame('seekers_win');
    }
  }

  // AI Hiders & Seekers Patrol & Hide loops
  updateBots(dt) {
    this.bots.forEach(bot => {
      if (bot.role === 'hider') {
        this.updateAIHider(bot, dt);
      } else {
        this.updateAISeeker(bot, dt);
      }
    });
  }

  updateAIHider(bot, dt) {
    if (bot.isCaught) return;

    // State machine: 'run_to_spot', 'hide', 'run_away'
    if (!bot.targetSpot) {
      // Find a random spot
      if (this.hideSpots.length > 0) {
        const spotIdx = Math.floor(Math.random() * this.hideSpots.length);
        bot.targetSpot = this.hideSpots[spotIdx].clone();
      } else {
        bot.targetSpot = new THREE.Vector3((Math.random() * 40) - 20, 0, (Math.random() * 40) - 20);
      }
      bot.aiState = 'run_to_spot';
    }

    if (bot.aiState === 'run_to_spot') {
      // Move towards spot
      const currentPos = bot.root.position;
      const targetPos = bot.targetSpot;
      const dist = currentPos.distanceTo(targetPos);

      // Rotate towards spot
      const dir = new THREE.Vector3().subVectors(targetPos, currentPos);
      dir.y = 0;
      if (dir.length() > 0.05) {
        dir.normalize();
        const targetAngle = Math.atan2(dir.x, dir.z);
        bot.root.rotation.y = targetAngle;

        // Move bot
        const speed = 4.0;
        bot.root.position.addScaledVector(dir, speed * dt);

        // Walking animation
        const time = this.clock.getElapsedTime() * 12;
        bot.legs[0].rotation.x = Math.sin(time) * 0.5;
        bot.legs[1].rotation.x = -Math.sin(time) * 0.5;
      }

      if (dist < 0.5) {
        // Reached spot! Lock in and paint
        bot.aiState = 'hide';
        bot.root.position.copy(targetPos);
        
        // Sample color
        this.simulateAIPaint(bot);
        
        // Pick a pose
        const poses = ['sit', 'curl', 'lie'];
        const rPose = poses[Math.floor(Math.random() * poses.length)];
        this.animatePlayerPose(bot, rPose);

        // Randomly chat
        if (Math.random() < 0.1 && this.onChatEvent) {
          setTimeout(() => {
            const hiderMsgs = [
              "camo is 99% right here", 
              "they will never find me", 
              "this desk is the perfect cover",
              "dont look at me meow"
            ];
            this.onChatEvent(bot.username, hiderMsgs[Math.floor(Math.random() * hiderMsgs.length)]);
          }, Math.random() * 5000);
        }
      }
    } 
    else if (bot.aiState === 'hide') {
      // Stand still, zero limb animation
      bot.legs.forEach(l => l.rotation.x = 0);
      bot.arms.forEach(a => a.rotation.x = 0);
      
      // Evaluated camo remains high
      bot.camoScore = 95;
    }
  }

  simulateAIPaint(bot) {
    // Perform simple raycast underneath to sample texture/color
    const ray = new THREE.Raycaster(
      new THREE.Vector3(bot.root.position.x, bot.root.position.y + 0.5, bot.root.position.z),
      new THREE.Vector3(0, -1, 0)
    );
    let hits = ray.intersectObjects(this.scene.children, true);
    hits = hits.filter(h => {
      let n = h.object;
      while (n) {
        if (n === bot.root) return false;
        n = n.parent;
      }
      return true;
    });

    if (hits.length > 0) {
      const obj = hits[0].object;
      let col = new THREE.Color(0xdddddd);
      let met = 0.0;
      let rgh = 0.8;

      if (obj.userData?.textureName && this.textureCanvases[obj.userData.textureName]) {
        const tex = this.textureCanvases[obj.userData.textureName];
        if (hits[0].uv) {
          let u = hits[0].uv.x;
          let v = hits[0].uv.y;
          if (obj.userData.textureName === 'carpet') {
            u = (u * 50) % 1; v = (v * 50) % 1;
          }
          const px = Math.floor(u * tex.width);
          const py = Math.floor((1 - v) * tex.height);
          try {
            const pixel = tex.ctx.getImageData(px, py, 1, 1).data;
            col.setRGB(pixel[0] / 255, pixel[1] / 255, pixel[2] / 255);
          } catch(e) {}
        }
      } else if (obj.material) {
        const m = Array.isArray(obj.material) ? obj.material[0] : obj.material;
        if (m.color) col.copy(m.color);
        met = m.metalness || 0.0;
        rgh = m.roughness || 0.5;
      }

      bot.material.color.copy(col);
      bot.material.metalness = met;
      bot.material.roughness = rgh;
      bot.material.needsUpdate = true;
    }
  }

  updateAISeeker(bot, dt) {
    // Seeker search logic
    if (!bot.targetSpot) {
      bot.targetSpot = new THREE.Vector3((Math.random() * 60) - 30, 0, (Math.random() * 60) - 30);
      bot.aiState = 'patrol';
      bot.patrolTimer = 1.0 + Math.random() * 3;
    }

    if (bot.aiState === 'patrol') {
      // Head to spot, sweep spotlight left/right
      const currentPos = bot.root.position;
      const targetPos = bot.targetSpot;
      const dist = currentPos.distanceTo(targetPos);

      // Spotlight sweep angle
      bot.patrolTimer -= dt;
      const sweepAngle = Math.sin(this.clock.getElapsedTime() * 4) * 0.4;
      if (bot.spotlight) {
        bot.spotlight.target.position.set(Math.sin(sweepAngle) * 5, 0, 5);
      }

      const dir = new THREE.Vector3().subVectors(targetPos, currentPos);
      dir.y = 0;
      if (dir.length() > 0.05) {
        dir.normalize();
        
        // Face moving direction
        const angle = Math.atan2(dir.x, dir.z);
        bot.root.rotation.y = angle;

        // Move
        const speed = 3.5;
        bot.root.position.addScaledVector(dir, speed * dt);

        // Walk anim
        const time = this.clock.getElapsedTime() * 10;
        bot.legs[0].rotation.x = Math.sin(time) * 0.5;
        bot.legs[1].rotation.x = -Math.sin(time) * 0.5;
      }

      if (dist < 1.0 || bot.patrolTimer <= 0) {
        bot.targetSpot = null; // pick new spot
      }

      // Check Spotlight intersection against all HIDERS (including player)
      this.checkSpotlightDetection(bot);
    } 
    else if (bot.aiState === 'chase' && bot.chaseTarget) {
      // Chase hider target!
      const currentPos = bot.root.position;
      const targetPos = bot.chaseTarget.root.position;
      const dist = currentPos.distanceTo(targetPos);

      const dir = new THREE.Vector3().subVectors(targetPos, currentPos);
      dir.y = 0;
      if (dir.length() > 0.05) {
        dir.normalize();
        bot.root.rotation.y = Math.atan2(dir.x, dir.z);
        
        const chaseSpeed = 5.8;
        bot.root.position.addScaledVector(dir, chaseSpeed * dt);
        
        const time = this.clock.getElapsedTime() * 15;
        bot.legs[0].rotation.x = Math.sin(time) * 0.6;
        bot.legs[1].rotation.x = -Math.sin(time) * 0.6;
      }

      // Keep light red and facing target
      if (bot.spotlight) {
        bot.spotlight.color.setHex(0xff0000);
        bot.spotlightCone.material.color.setHex(0xff0000);
        bot.spotlight.target.position.set(0, 0, dist);
      }

      // If close enough: CATCH!
      if (dist < 1.0) {
        this.catchHider(bot, bot.chaseTarget);
      }
    }
  }

  checkSpotlightDetection(seekerBot) {
    if (!seekerBot.spotlight) return;

    // Check player
    if (this.role === 'hider' && !this.player.isCaught) {
      this.evalHiderInLight(seekerBot, this.player);
    }

    // Check bot hiders
    this.bots.forEach(b => {
      if (b.role === 'hider' && !b.isCaught) {
        this.evalHiderInLight(seekerBot, b);
      }
    });
  }

  evalHiderInLight(seeker, hider) {
    const sPos = seeker.root.position.clone().add(new THREE.Vector3(0, 1.4, 0));
    const hPos = hider.root.position.clone().add(new THREE.Vector3(0, 0.7, 0));
    const dist = sPos.distanceTo(hPos);

    if (dist > 18) return; // out of range

    // Vector to hider
    const dirToHider = new THREE.Vector3().subVectors(hPos, sPos).normalize();
    
    // Direction flashlight is facing
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(seeker.root.quaternion).normalize();
    const dot = dirToHider.dot(forward);

    // Spotlight angle is PI/8 (approx 22.5 deg). dot product is cos(angle).
    // cos(22.5) ~ 0.92
    if (dot > 0.90) {
      // Inside spotlight cone! Check line of sight
      const ray = new THREE.Raycaster(sPos, dirToHider, 0.1, dist);
      let hits = ray.intersectObjects(this.colliders, true);
      
      if (hits.length === 0) {
        // Clear line of sight! Check Hider Camouflage rating
        const camo = hider.camoScore;
        const isPlayerMoving = hider === this.player && hider.velocity.length() > 0.1;
        
        // Spot hider if camo score is too low or hider is moving
        if (camo < 84 || isPlayerMoving) {
          // Detected!
          seeker.aiState = 'chase';
          seeker.chaseTarget = hider;
          
          if (this.onChatEvent) {
            const warnings = ["Found one!", "I see you!", "Splashing water now!", "Aha! Caught ya moving!"];
            this.onChatEvent(seeker.username, warnings[Math.floor(Math.random() * warnings.length)]);
          }
          Sounds.playMeow(1.1);
        }
      }
    }
  }

  catchHider(seeker, hider) {
    hider.isCaught = true;
    Sounds.playTag();
    Sounds.playMeow(0.85);

    seeker.aiState = 'patrol';
    seeker.chaseTarget = null;
    seeker.targetSpot = null;
    
    if (seeker.spotlight) {
      seeker.spotlight.color.setHex(0xffffff);
      seeker.spotlightCone.material.color.setHex(0xfffee0);
    }

    // Flash caught model red
    const origCol = hider.material.color.clone();
    hider.material.color.setHex(0xff0000);
    setTimeout(() => {
      hider.material.color.copy(origCol);
    }, 1500);

    if (this.onChatEvent) {
      if (hider === this.player) {
        this.onChatEvent('System', `TikTokCat_Me has been caught by ${seeker.username}! Game Over!`);
      } else {
        this.onChatEvent(hider.username, 'Darn it, you found me! 😿');
        setTimeout(() => {
          this.onChatEvent('System', `${hider.username} was tagged by ${seeker.username}!`);
        }, 1000);
      }
    }

    if (this.gameMode === 'infection') {
      hider.role = 'seeker';
      hider.isCaught = false;
      this.addSeekerFlashlight(hider);
    }

    // If player caught in Normal mode, end game
    if (hider === this.player && this.gameMode === 'normal') {
      this.endGame('hiders_lose');
      return;
    }

    this.checkGameProgress();
  }

  endGame(reason) {
    this.gameState = 'gameover';
    this.isPointerLocked = false;
    document.exitPointerLock();
    
    // Stop retro synthesizers
    Sounds.stopMusic();

    let title = 'VICTORY';
    let msg = 'Congratulations! You won the game!';
    
    if (reason === 'time_out') {
      if (this.role === 'hider') {
        title = 'VICTORY';
        msg = 'Hiders win! You survived the full 5-minute countdown!';
        Sounds.playMeow(1.3);
      } else {
        title = 'DEFEAT';
        msg = 'Time expired! The hiders successfully disguised themselves.';
        Sounds.playTag();
      }
    } 
    else if (reason === 'seekers_win') {
      if (this.role === 'seeker') {
        title = 'VICTORY';
        msg = 'Seekers win! Every chameleon cat was located and captured!';
        Sounds.playMeow(1.3);
      } else {
        title = 'DEFEAT';
        msg = 'Defeat! All chameleon hiders were hunted down.';
        Sounds.playTag();
      }
    } 
    else if (reason === 'hiders_lose') {
      title = 'DEFEAT';
      msg = 'Captured! You were detected and caught by the inspector.';
      Sounds.playTag();
    }

    if (this.onGameOver) {
      this.onGameOver(title, msg, {
        camo: this.role === 'hider' ? `${this.camoPercentage}%` : 'N/A',
        time: `${Math.floor(this.playTime / 60)}m ${Math.floor(this.playTime % 60)}s`,
        caught: this.bots.filter(b => b.isCaught).length + (this.player.isCaught ? 1 : 0)
      });
    }
  }

  // Keyboard Handlers
  handleKeyDown(e) {
    this.keys[e.code] = true;

    // Eyedrop key
    if (e.code === 'Space' && this.role === 'hider' && this.gameState === 'playing' && this.currentPose !== 'stand') {
      e.preventDefault();
      this.eyedropSurface();
    }

    // Paint menu open key
    if (e.code === 'KeyF' && this.gameState === 'playing') {
      e.preventDefault();
      // Delegate to ui trigger
      const paintPanel = document.getElementById('paint-panel');
      if (paintPanel) {
        const isHidden = paintPanel.classList.contains('hidden');
        if (isHidden) {
          paintPanel.classList.remove('hidden');
          // Release pointer lock to use mouse
          document.exitPointerLock();
        } else {
          paintPanel.classList.add('hidden');
          this.container.requestPointerLock();
        }
      }
    }

    // Poses keys: 1, 2, 3, 4
    if (e.code === 'Digit1') this.setPose('stand');
    if (e.code === 'Digit2') this.setPose('sit');
    if (e.code === 'Digit3') this.setPose('curl');
    if (e.code === 'Digit4') this.setPose('lie');
  }

  handleKeyUp(e) {
    this.keys[e.code] = false;
  }

  // Mouse camera Orbit controls
  handleMouseMove(e) {
    if (!this.isPointerLocked) return;

    const sensitivity = 0.0025;
    this.mouse.yaw -= e.movementX * sensitivity;
    
    // Clamp pitch to avoid flipping upside down
    this.mouse.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 4, this.mouse.pitch - e.movementY * sensitivity));
  }

  handleMouseDown(e) {
    if (!this.isPointerLocked || this.gameState !== 'playing') return;

    if (e.button === 0) { // Left click
      if (this.role === 'seeker') {
        this.shootBalloon();
      }
    }
  }

  // Rendering Loop
  animate() {
    const dt = Math.min(0.1, this.clock.getDelta()); // clamp dt to avoid physics glitches
    
    if (this.gameState === 'playing' || this.gameState === 'prep') {
      this.update(dt);
    }
    
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}

export const Game = new GameEngine();
