import * as THREE from 'three';
import { Game } from './gameEngine.js';
import { Sounds } from './sound.js';

class UIManager {
  constructor() {
    this.activeTab = 'home';
    this.playerConfig = {
      username: 'TikTokCat_Me',
      avatar: 'neon',
      color: '#dddddd',
      metallic: 0.1,
      roughness: 0.7,
      accessory: 'none'
    };

    // Locker scene variables
    this.lockerScene = null;
    this.lockerCamera = null;
    this.lockerRenderer = null;
    this.lockerCat = null;
    this.lockerClock = new THREE.Clock();

    // Simulated chat intervals
    this.chatInterval = null;
  }

  init() {
    this.renderSkeleton();
    this.setupTabListeners();
    this.setupLockerScene();
    this.setupGameMenuListeners();
    this.setupMuteButton();

    // Show Home tab by default
    this.switchTab('home');

    // Simulate community chat on main menu
    this.startMenuChatSimulation();
  }

  renderSkeleton() {
    const app = document.getElementById('app');
    if (!app) return;

    app.innerHTML = `
      <div id="game-ui-container">
        <!-- HEADER / NAVIGATION -->
        <header class="app-header">
          <div class="logo-area">
            <span class="neon-text-logo">TIKTOK CHAMELEON</span>
            <span class="game-version">V1.0.0-PROD</span>
          </div>
          <nav class="nav-tabs">
            <button class="nav-btn active" data-tab="home">PLAY</button>
            <button class="nav-btn" data-tab="locker">LOCKER</button>
            <button class="nav-btn" data-tab="leaderboard">LEADERBOARD</button>
            <button class="nav-btn" data-tab="guide">GUIDE</button>
          </nav>
          <div class="profile-corner">
            <button id="mute-btn" class="icon-btn">🔊</button>
            <div class="user-chip">
              <img id="header-avatar" src="/avatars/neon.jpg" class="avatar-sm">
              <span class="username-display">${this.playerConfig.username}</span>
            </div>
          </div>
        </header>

        <!-- MAIN LAYOUT -->
        <main class="app-body">
          
          <!-- TAB: HOME / PLAY -->
          <section id="tab-home" class="tab-content">
            <div class="home-grid">
              <div class="splash-card">
                <img src="/images/logo.jpg" alt="TikTok Chameleon Splash" class="splash-img">
                <div class="splash-overlay">
                  <h2>TIKTOK CHAMELEON</h2>
                  <p>Master the art of camouflage. Blend in or seek out. Play as Hider or Seeker.</p>
                </div>
              </div>

              <div class="play-panel-card">
                <h3>START GAME</h3>
                <div class="form-group">
                  <label>Game Mode</label>
                  <select id="select-mode" class="select-control">
                    <option value="normal">Normal Hide & Seek</option>
                    <option value="infection">Infection Mode</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Map Location</label>
                  <select id="select-map" class="select-control">
                    <option value="backrooms">The Backrooms (Yellow Wallpaper & Carpet)</option>
                    <option value="gallery">The Art Gallery (Gilded Paintings & Wooden Floor)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Your Role</label>
                  <div class="role-selector">
                    <button class="role-btn active" data-role="hider">HIDER 🙈</button>
                    <button class="role-btn" data-role="seeker">SEEKER 🔍</button>
                  </div>
                </div>
                <button id="quick-match-btn" class="primary-btn glow-btn">FIND QUICK MATCH</button>
              </div>

              <div class="community-chat-card">
                <h3>COMMUNITY LOBBY CHAT</h3>
                <div id="lobby-chat-log" class="chat-log-box"></div>
                <div class="chat-input-box">
                  <input type="text" id="lobby-chat-input" placeholder="Type meow..." class="chat-input-control">
                  <button id="send-lobby-chat" class="secondary-btn">SEND</button>
                </div>
              </div>
            </div>
          </section>

          <!-- TAB: LOCKER / CUSTOMIZATION -->
          <section id="tab-locker" class="tab-content hidden">
            <div class="locker-grid">
              <div class="locker-preview-box">
                <canvas id="locker-canvas"></canvas>
                <div class="rotate-tip">3D Preview - Cat rotates automatically</div>
              </div>

              <div class="locker-controls-box">
                <h3>CUSTOMIZE YOUR CAT</h3>
                
                <div class="control-section">
                  <h4>SELECT AVATAR IMAGE</h4>
                  <div class="avatar-selection-row">
                    <img class="avatar-select-option active" data-avatar="neon" src="/avatars/neon.jpg">
                    <img class="avatar-select-option" data-avatar="ninja" src="/avatars/ninja.jpg">
                    <img class="avatar-select-option" data-avatar="detective" src="/avatars/detective.jpg">
                  </div>
                </div>

                <div class="control-section">
                  <h4>CHAMELEON BASE MATERIAL</h4>
                  <div class="slider-group">
                    <label>Base Skin Color</label>
                    <input type="color" id="skin-color-picker" value="${this.playerConfig.color}" class="color-picker-control">
                  </div>
                  <div class="slider-group">
                    <label>Skin Metalness</label>
                    <input type="range" id="skin-metallic" min="0" max="1" step="0.05" value="${this.playerConfig.metallic}">
                  </div>
                  <div class="slider-group">
                    <label>Skin Roughness</label>
                    <input type="range" id="skin-roughness" min="0" max="1" step="0.05" value="${this.playerConfig.roughness}">
                  </div>
                </div>

                <div class="control-section">
                  <h4>ACCESSORIES</h4>
                  <div class="accessory-row">
                    <button class="accessory-btn active" data-acc="none">NONE</button>
                    <button class="accessory-btn" data-acc="ninja_mask">NINJA MASK</button>
                    <button class="accessory-btn" data-acc="neon_collar">NEON COLLAR</button>
                    <button class="accessory-btn" data-acc="detective_hat">DETECTIVE HAT</button>
                  </div>
                </div>

                <button id="save-locker-btn" class="primary-btn">APPLY CUSTOMIZATIONS</button>
              </div>
            </div>
          </section>

          <!-- TAB: LEADERBOARD -->
          <section id="tab-leaderboard" class="tab-content hidden">
            <div class="leaderboard-card">
              <h3>GLOBAL TOP CHAMELEON CATS</h3>
              <table class="leaderboard-table">
                <thead>
                  <tr>
                    <th>RANK</th>
                    <th>AVATAR</th>
                    <th>USERNAME</th>
                    <th>MATCHES PLAYED</th>
                    <th>CAMOUFLAGE ACCURACY</th>
                    <th>SURVIVED TIME</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>🏆 1</td>
                    <td><img src="/avatars/ninja.jpg" class="avatar-sm"></td>
                    <td>NinjaMeow</td>
                    <td>1,240</td>
                    <td>98.5%</td>
                    <td>51h 20m</td>
                    <td><span class="badge-online">ONLINE</span></td>
                  </tr>
                  <tr>
                    <td>🥈 2</td>
                    <td><img src="/avatars/neon.jpg" class="avatar-sm"></td>
                    <td>GlowWorm99</td>
                    <td>850</td>
                    <td>97.2%</td>
                    <td>38h 12m</td>
                    <td><span class="badge-online">ONLINE</span></td>
                  </tr>
                  <tr>
                    <td>🥉 3</td>
                    <td><img src="/avatars/detective.jpg" class="avatar-sm"></td>
                    <td>SherlockPaws</td>
                    <td>920</td>
                    <td>95.8%</td>
                    <td>32h 45m</td>
                    <td><span class="badge-online">ONLINE</span></td>
                  </tr>
                  <tr>
                    <td>4</td>
                    <td><img src="/avatars/neon.jpg" class="avatar-sm"></td>
                    <td>CamoKing</td>
                    <td>630</td>
                    <td>94.1%</td>
                    <td>24h 10m</td>
                    <td><span class="badge-offline">OFFLINE</span></td>
                  </tr>
                  <tr>
                    <td>5</td>
                    <td><img src="/avatars/ninja.jpg" class="avatar-sm"></td>
                    <td>NyanSlayer</td>
                    <td>420</td>
                    <td>92.8%</td>
                    <td>18h 05m</td>
                    <td><span class="badge-online">ONLINE</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- TAB: GUIDE -->
          <section id="tab-guide" class="tab-content hidden">
            <div class="guide-grid">
              <div class="guide-card">
                <h3>GAME CONTROLS</h3>
                <ul>
                  <li><span class="key">W</span> <span class="key">A</span> <span class="key">S</span> <span class="key">D</span> / Arrows : Walk and Steer Cat</li>
                  <li><span class="key">Spacebar</span> : Jump (when Standing) / Eyedrop Surface Color (when Posed)</li>
                  <li><span class="key">F</span> : Open/Close Active Paint Customizer Overlay</li>
                  <li><span class="key">1</span> : Stand Pose (Normal walking)</li>
                  <li><span class="key">2</span> : Sit Pose (Tuck legs, lower height, +5% Camouflage)</li>
                  <li><span class="key">3</span> : Curl Up Pose (Compact ball shape, +8% Camouflage)</li>
                  <li><span class="key">4</span> : Lie Down Pose (Flat on ground, +10% Camouflage)</li>
                  <li><span class="key">Left Click</span> : Launch Water Balloon (Seeker role only, aims at cursor)</li>
                </ul>
              </div>
              <div class="guide-card">
                <h3>HOW TO PLAY</h3>
                <h4>🙈 HIDERS:</h4>
                <p>Find a surface or prop, match its exact texture colors using the Eyedropper (<span class="key">Spacebar</span>) or by fine-tuning with sliders (<span class="key">F</span>). Select a Pose and stay absolutely still! Movement instantly drops your camouflage score.</p>
                
                <h4>🔍 SEEKERS:</h4>
                <p>Patrol with your flashlight cone. Check for odd shapes, flickering shadows, or minor color differences. Left-click to shoot water balloons. Find all hiders before time runs out!</p>
              </div>
            </div>
          </section>
        </main>

        <!-- QUEUE MATCH SCREEN -->
        <div id="queue-screen" class="screen-overlay hidden">
          <div class="queue-card glass">
            <h2>SEARCHING FOR MATCH...</h2>
            <p>Connecting to TikTok Chameleon matchmaking servers...</p>
            
            <div class="connecting-bots-list">
              <div class="bot-slot ready">
                <img src="/avatars/neon.jpg" class="avatar-sm">
                <span>TikTokCat_Me (You)</span>
                <span class="status">READY</span>
              </div>
              <div class="bot-slot pending" id="bot-slot-1">
                <img src="/avatars/ninja.jpg" class="avatar-sm">
                <span>NinjaMeow</span>
                <span class="status">CONNECTING...</span>
              </div>
              <div class="bot-slot pending" id="bot-slot-2">
                <img src="/avatars/detective.jpg" class="avatar-sm">
                <span>SherlockPaws</span>
                <span class="status">CONNECTING...</span>
              </div>
              <div class="bot-slot pending" id="bot-slot-3">
                <img src="/avatars/neon.jpg" class="avatar-sm">
                <span>GlowWorm99</span>
                <span class="status">CONNECTING...</span>
              </div>
              <div class="bot-slot pending" id="bot-slot-4">
                <img src="/avatars/ninja.jpg" class="avatar-sm">
                <span>NyanSlayer</span>
                <span class="status">CONNECTING...</span>
              </div>
            </div>

            <div class="queue-status-text">Lobby full, preparing arena in 5 seconds...</div>
          </div>
        </div>

        <!-- 3D GAME WRAPPER -->
        <div id="game-viewport-container" class="hidden">
          <div id="three-canvas-container"></div>
          
          <!-- HUD OVERLAY -->
          <div class="game-hud">
            
            <!-- TOP BAR -->
            <div class="hud-top">
              <div class="hud-timer">TIME REMAINING: <span id="hud-time-digits">05:00</span></div>
              <div class="hud-shots hidden" id="hud-shots-box">BALLOONS: <span id="hud-shots-count">10/10</span></div>
            </div>

            <!-- CHAT IN GAME -->
            <div class="hud-bottom-left">
              <div id="game-chat-log" class="game-chat-log-box"></div>
            </div>

            <!-- CAMO PROGRESS (HIDER ONLY) -->
            <div class="hud-bottom-right" id="hud-camo-box">
              <div class="camo-circular-container">
                <svg class="camo-svg" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" class="camo-bg-circle"></circle>
                  <circle cx="50" cy="50" r="40" class="camo-progress-circle" id="camo-fill-circle"></circle>
                </svg>
                <div class="camo-text-val"><span id="camo-pct-number">0</span>%</div>
              </div>
              <div class="camo-status-lbl">CAMOUFLAGE</div>
            </div>

            <!-- POSES SELECTION BAR (HIDER ONLY) -->
            <div class="hud-center-bottom" id="hud-poses-box">
              <button class="pose-hud-btn active" data-pose="stand">STAND [1]</button>
              <button class="pose-hud-btn" data-pose="sit">SIT [2]</button>
              <button class="pose-hud-btn" data-pose="curl">BALL [3]</button>
              <button class="pose-hud-btn" data-pose="lie">FLAT [4]</button>
            </div>

            <!-- RETICLE CROSSHAIR (SEEKER ONLY) -->
            <div class="hud-reticle hidden" id="hud-reticle"></div>

            <!-- PAINT PANEL CUSTOMIZER OVERLAY (KEY F) -->
            <div id="paint-panel" class="paint-overlay-panel hidden glass">
              <div class="paint-panel-header">
                <h3>PAINT PANEL CONTROLLER</h3>
                <span class="close-paint-btn" id="close-paint-btn">&times;</span>
              </div>
              <div class="paint-panel-body">
                <div class="eyedrop-indicator-tip">Press Spacebar on any wall/floor to auto-eyedrop color!</div>
                
                <div class="slider-group">
                  <label>Manual Skin Color</label>
                  <input type="color" id="paint-color-picker" class="color-picker-control">
                </div>
                <div class="slider-group">
                  <label>Skin Metalness</label>
                  <input type="range" id="paint-metallic" min="0" max="1" step="0.05" value="0.1">
                </div>
                <div class="slider-group">
                  <label>Skin Roughness</label>
                  <input type="range" id="paint-roughness" min="0" max="1" step="0.05" value="0.7">
                </div>

                <div class="quick-swatches">
                  <span class="swatch" style="background:#dddddd" data-col="#dddddd"></span>
                  <span class="swatch" style="background:#ddca8b" data-col="#ddca8b"></span> <!-- Wallpaper yell -->
                  <span class="swatch" style="background:#8b5a2b" data-col="#8b5a2b"></span> <!-- wood brown -->
                  <span class="swatch" style="background:#705844" data-col="#705844"></span> <!-- carpet beige -->
                  <span class="swatch" style="background:#228b22" data-col="#228b22"></span> <!-- Forest green -->
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- POST GAME SUMMARY MODAL -->
        <div id="summary-screen" class="screen-overlay hidden">
          <div class="summary-card glass">
            <h1 id="summary-title" class="victory-neon">VICTORY</h1>
            <p id="summary-msg">Every single chameleon cat has been captured!</p>
            
            <div class="summary-stats-box">
              <div class="stat-row">
                <span>TIME PLAYED</span>
                <span id="stat-time">3m 45s</span>
              </div>
              <div class="stat-row">
                <span>CATS CAPTURED</span>
                <span id="stat-caught">4</span>
              </div>
              <div class="stat-row" id="stat-camo-row">
                <span>FINAL CAMOUFLAGE</span>
                <span id="stat-camo">95%</span>
              </div>
            </div>

            <button id="summary-return-btn" class="primary-btn glow-btn">RETURN TO LOBBY</button>
          </div>
        </div>
      </div>
    `;
  }

  setupTabListeners() {
    const tabs = document.querySelectorAll('.nav-btn');
    tabs.forEach(btn => {
      btn.addEventListener('click', (e) => {
        Sounds.playClick();
        const target = btn.dataset.tab;
        this.switchTab(target);
      });
    });
  }

  switchTab(tabId) {
    this.activeTab = tabId;
    
    // Hide all tab screens
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.add('hidden'));

    // Deactivate nav button states
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => btn.classList.remove('active'));

    // Show active screen
    const activeScreen = document.getElementById(`tab-${tabId}`);
    if (activeScreen) {
      activeScreen.classList.remove('hidden');
    }
    
    const activeBtn = document.querySelector(`.nav-btn[data-tab="${tabId}"]`);
    if (activeBtn) {
      activeBtn.classList.add('active');
    }

    // Trigger locker rendering if active
    if (tabId === 'locker') {
      setTimeout(() => this.onLockerResize(), 50);
    }
  }

  setupLockerScene() {
    const canvas = document.getElementById('locker-canvas');
    if (!canvas) return;

    this.lockerScene = new THREE.Scene();
    this.lockerScene.background = new THREE.Color(0x131326);

    this.lockerCamera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 10);
    this.lockerCamera.position.set(0, 1.0, 3.2);

    this.lockerRenderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.lockerRenderer.setSize(canvas.clientWidth, canvas.clientHeight);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.lockerScene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(2, 4, 3);
    this.lockerScene.add(dirLight);

    // Initial character render
    this.updateLockerCat();

    // Render loop
    const render = () => {
      if (this.activeTab === 'locker' && this.lockerRenderer && this.lockerScene && this.lockerCamera) {
        const delta = this.lockerClock.getDelta();
        
        // Rotate cat automatically
        if (this.lockerCat) {
          this.lockerCat.root.rotation.y += 0.8 * delta;
        }

        this.lockerRenderer.render(this.lockerScene, this.lockerCamera);
      }
      requestAnimationFrame(render);
    };
    render();
  }

  onLockerResize() {
    const canvas = document.getElementById('locker-canvas');
    if (!canvas || !this.lockerCamera || !this.lockerRenderer) return;
    this.lockerCamera.aspect = canvas.clientWidth / canvas.clientHeight;
    this.lockerCamera.updateProjectionMatrix();
    this.lockerRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
  }

  updateLockerCat() {
    if (this.lockerCat) {
      this.lockerScene.remove(this.lockerCat.root);
    }

    const catData = Game.createCatMesh({
      color: this.playerConfig.color,
      metallic: this.playerConfig.metallic,
      roughness: this.playerConfig.roughness,
      accessory: this.playerConfig.accessory,
      isAI: false
    });
    
    catData.root.position.set(0, -0.4, 0);
    this.lockerScene.add(catData.root);
    this.lockerCat = catData;
  }

  setupGameMenuListeners() {
    // Role selection
    const roleBtns = document.querySelectorAll('.role-btn');
    roleBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        Sounds.playClick();
        roleBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.playerConfig.role = btn.dataset.role;
      });
    });
    this.playerConfig.role = 'hider'; // default

    // Skin Color picker in Locker
    const colorPicker = document.getElementById('skin-color-picker');
    if (colorPicker) {
      colorPicker.addEventListener('input', (e) => {
        this.playerConfig.color = e.target.value;
        this.updateLockerCat();
      });
    }

    // Metallic slider
    const metSlider = document.getElementById('skin-metallic');
    if (metSlider) {
      metSlider.addEventListener('input', (e) => {
        this.playerConfig.metallic = parseFloat(e.target.value);
        this.updateLockerCat();
      });
    }

    // Roughness slider
    const rghSlider = document.getElementById('skin-roughness');
    if (rghSlider) {
      rghSlider.addEventListener('input', (e) => {
        this.playerConfig.roughness = parseFloat(e.target.value);
        this.updateLockerCat();
      });
    }

    // Accessories selector
    const accBtns = document.querySelectorAll('.accessory-btn');
    accBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        Sounds.playClick();
        accBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.playerConfig.accessory = btn.dataset.acc;
        this.updateLockerCat();
      });
    });

    // Avatar selections
    const avatarOpts = document.querySelectorAll('.avatar-select-option');
    avatarOpts.forEach(opt => {
      opt.addEventListener('click', () => {
        Sounds.playClick();
        avatarOpts.forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        this.playerConfig.avatar = opt.dataset.avatar;
        document.getElementById('header-avatar').src = `/avatars/${opt.dataset.avatar}.jpg`;
      });
    });

    // Save Locker Apply
    const saveLockerBtn = document.getElementById('save-locker-btn');
    if (saveLockerBtn) {
      saveLockerBtn.addEventListener('click', () => {
        Sounds.playClick();
        Sounds.playMeow(1.3);
        this.switchTab('home');
      });
    }

    // Quick match lobby loader (Simulates connecting bots!)
    const quickMatchBtn = document.getElementById('quick-match-btn');
    if (quickMatchBtn) {
      quickMatchBtn.addEventListener('click', () => {
        Sounds.playClick();
        this.triggerMatchmakingQueue();
      });
    }

    // Lobby Chat sending
    const lobbySendBtn = document.getElementById('send-lobby-chat');
    const lobbyChatInput = document.getElementById('lobby-chat-input');
    if (lobbySendBtn && lobbyChatInput) {
      const sendAction = () => {
        const text = lobbyChatInput.value.trim();
        if (text) {
          this.addLobbyChatMessage(this.playerConfig.username, text);
          lobbyChatInput.value = '';
          Sounds.playClick();
          // Simulate dynamic responses shortly after
          setTimeout(() => this.simulateLobbyReply(text), 1000 + Math.random() * 2000);
        }
      };
      lobbySendBtn.addEventListener('click', sendAction);
      lobbyChatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendAction();
      });
    }
  }

  // Lobby Chat Logic
  addLobbyChatMessage(username, text) {
    const logBox = document.getElementById('lobby-chat-log');
    if (!logBox) return;
    
    const div = document.createElement('div');
    div.className = 'chat-msg';
    div.innerHTML = `<span class="chat-sender">${username}:</span> <span class="chat-text">${text}</span>`;
    logBox.appendChild(div);
    logBox.scrollTop = logBox.scrollHeight;
  }

  startMenuChatSimulation() {
    const communityTexts = [
      "anybody down for Art Gallery?",
      "sherlock hat increases range, trust me",
      "hider camouflage is broken on the wallpaper",
      "camo matches are wild",
      "meow meow meow",
      "where are seekers spawning?",
      "Starry Night painting color is hard to hit",
      "gg to the ninja cat from last round!"
    ];
    const usernames = ['GlowWorm99', 'NinjaMeow', 'SherlockPaws', 'NyanSlayer', 'CamoKing'];

    this.addLobbyChatMessage('System', 'Welcome to TIKTOK CHAMELEON main server channel. Stay camo.');

    this.chatInterval = setInterval(() => {
      if (this.activeTab === 'home') {
        const user = usernames[Math.floor(Math.random() * usernames.length)];
        const text = communityTexts[Math.floor(Math.random() * communityTexts.length)];
        this.addLobbyChatMessage(user, text);
      }
    }, 8000 + Math.random() * 5000);
  }

  simulateLobbyReply(playerMsg) {
    const responses = [
      "lol facts",
      "ikr!",
      "meow?",
      "nice, let's queue up!",
      "same, custom locker styling looks clean",
      "wait, what map are we playing?"
    ];
    const usernames = ['GlowWorm99', 'NinjaMeow', 'SherlockPaws', 'NyanSlayer', 'CamoKing'];
    const user = usernames[Math.floor(Math.random() * usernames.length)];
    const reply = responses[Math.floor(Math.random() * responses.length)];
    this.addLobbyChatMessage(user, reply);
  }

  // Trigger matchmaking visual queue
  triggerMatchmakingQueue() {
    const queueOverlay = document.getElementById('queue-screen');
    queueOverlay.classList.remove('hidden');
    Sounds.startMusic();

    let slot = 1;
    const interval = setInterval(() => {
      const slotEl = document.getElementById(`bot-slot-${slot}`);
      if (slotEl) {
        slotEl.className = 'bot-slot ready';
        slotEl.querySelector('.status').innerText = 'READY';
        Sounds.playClick();
      }
      slot++;
      
      if (slot > 4) {
        clearInterval(interval);
        // Start the game!
        setTimeout(() => {
          queueOverlay.classList.add('hidden');
          this.launchGameplay();
        }, 1500);
      }
    }, 1000);
  }

  launchGameplay() {
    // Switch headers & body elements
    document.querySelector('.app-header').classList.add('hidden');
    document.querySelector('.app-body').classList.add('hidden');
    document.getElementById('game-viewport-container').classList.remove('hidden');

    const mapName = document.getElementById('select-map').value;
    const mode = document.getElementById('select-mode').value;
    const role = this.playerConfig.role;

    // Initialize Game engine
    Game.init('three-canvas-container');
    Game.gameMode = mode;

    Game.setupMatch(
      role,
      mapName,
      this.playerConfig.avatar,
      this.playerConfig.color,
      this.playerConfig.metallic,
      this.playerConfig.roughness,
      this.playerConfig.accessory
    );

    // Setup HUD UI details based on Hider/Seeker roles
    const camoBox = document.getElementById('hud-camo-box');
    const posesBox = document.getElementById('hud-poses-box');
    const shotsBox = document.getElementById('hud-shots-box');
    const reticle = document.getElementById('hud-reticle');

    if (role === 'seeker') {
      camoBox.classList.add('hidden');
      posesBox.classList.add('hidden');
      shotsBox.classList.remove('hidden');
      reticle.classList.remove('hidden');
    } else {
      camoBox.classList.remove('hidden');
      posesBox.classList.remove('hidden');
      shotsBox.classList.add('hidden');
      reticle.classList.add('hidden');
    }

    // Hook game callbacks for HUD values
    Game.onCamoUpdate = (pct) => {
      document.getElementById('camo-pct-number').innerText = pct;
      const circle = document.getElementById('camo-fill-circle');
      if (circle) {
        // Circumference is 2 * PI * r = 2 * 3.1415 * 40 = 251.2
        const strokeOffset = 251.2 * (1 - pct / 100);
        circle.style.strokeDashoffset = strokeOffset;
        
        // Color transition
        if (pct < 40) circle.style.stroke = '#ff3b30'; // Red
        else if (pct < 80) circle.style.stroke = '#ffcc00'; // Yellow
        else circle.style.stroke = '#4cd964'; // Green
      }
    };

    Game.onTimeUpdate = (secondsLeft) => {
      const mins = Math.floor(secondsLeft / 60);
      const secs = secondsLeft % 60;
      document.getElementById('hud-time-digits').innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    Game.onShotsUpdate = (count) => {
      document.getElementById('hud-shots-count').innerText = `${count}/${Game.maxShots}`;
    };

    // Chat feed logger during play
    const gameChatBox = document.getElementById('game-chat-log');
    if (gameChatBox) gameChatBox.innerHTML = '';
    
    this.addGameChatMessage('System', `Match Started! Mode: ${mode.toUpperCase()} | Map: ${mapName.toUpperCase()}`);
    this.addGameChatMessage('System', role === 'hider' ? 'Hide and paint yourself! Press [F] for tools.' : 'Seek all hiders with flashlight and balloons!');

    Game.onChatEvent = (sender, text) => {
      this.addGameChatMessage(sender, text);
    };

    Game.onGameOver = (title, msg, stats) => {
      const summaryOverlay = document.getElementById('summary-screen');
      const titleEl = document.getElementById('summary-title');
      const msgEl = document.getElementById('summary-msg');

      titleEl.innerText = title;
      titleEl.className = title === 'VICTORY' ? 'victory-neon' : 'defeat-neon';
      msgEl.innerText = msg;

      document.getElementById('stat-time').innerText = stats.time;
      document.getElementById('stat-caught').innerText = stats.caught;

      const camoRow = document.getElementById('stat-camo-row');
      if (role === 'hider') {
        camoRow.classList.remove('hidden');
        document.getElementById('stat-camo').innerText = stats.camo;
      } else {
        camoRow.classList.add('hidden');
      }

      summaryOverlay.classList.remove('hidden');
    };

    // HUD poses buttons
    const hudPoseBtns = document.querySelectorAll('.pose-hud-btn');
    hudPoseBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const pose = btn.dataset.pose;
        Game.setPose(pose);
        hudPoseBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Mirror in paint sliders
    const manualColor = document.getElementById('paint-color-picker');
    const manualMet = document.getElementById('paint-metallic');
    const manualRgh = document.getElementById('paint-roughness');

    manualColor.value = this.playerConfig.color;
    manualMet.value = this.playerConfig.metallic;
    manualRgh.value = this.playerConfig.roughness;

    const syncPaintInput = () => {
      Game.setPlayerPaint(manualColor.value, manualMet.value, manualRgh.value);
    };
    manualColor.addEventListener('input', syncPaintInput);
    manualMet.addEventListener('input', syncPaintInput);
    manualRgh.addEventListener('input', syncPaintInput);

    // Swatches inside paint menu
    const swatches = document.querySelectorAll('.swatch');
    swatches.forEach(sw => {
      sw.addEventListener('click', () => {
        Sounds.playClick();
        manualColor.value = sw.dataset.col;
        syncPaintInput();
      });
    });

    // Close paint panel button
    document.getElementById('close-paint-btn').addEventListener('click', () => {
      Sounds.playClick();
      document.getElementById('paint-panel').classList.add('hidden');
      document.getElementById('three-canvas-container').requestPointerLock();
    });

    // Summary Return button
    document.getElementById('summary-return-btn').addEventListener('click', () => {
      Sounds.playClick();
      document.getElementById('summary-screen').classList.add('hidden');
      document.getElementById('game-viewport-container').classList.add('hidden');
      
      // Restore main menu headers
      document.querySelector('.app-header').classList.remove('hidden');
      document.querySelector('.app-body').classList.remove('hidden');
      
      // Stop music, stop game loop
      Sounds.stopMusic();
      Game.gameState = 'menu';
      this.switchTab('home');
    });

    // Keyboard watcher to keep HUD poses aligned
    window.addEventListener('keydown', (e) => {
      let activePose = null;
      if (e.code === 'Digit1') activePose = 'stand';
      if (e.code === 'Digit2') activePose = 'sit';
      if (e.code === 'Digit3') activePose = 'curl';
      if (e.code === 'Digit4') activePose = 'lie';

      if (activePose) {
        hudPoseBtns.forEach(b => {
          if (b.dataset.pose === activePose) {
            hudPoseBtns.forEach(x => x.classList.remove('active'));
            b.classList.add('active');
          }
        });
      }
    });

    // Start simulated gameplay chat events
    this.startInGameChatSimulation();
  }

  addGameChatMessage(sender, text) {
    const logBox = document.getElementById('game-chat-log');
    if (!logBox) return;

    const div = document.createElement('div');
    div.className = 'game-chat-msg';
    
    let senderColor = '#00ffcc';
    if (sender === 'System') senderColor = '#ffcc00';
    else if (sender === 'TikTokCat_Me') senderColor = '#ff00aa';

    div.innerHTML = `<span style="color:${senderColor}; font-weight:bold;">${sender}:</span> ${text}`;
    logBox.appendChild(div);
    logBox.scrollTop = logBox.scrollHeight;
  }

  startInGameChatSimulation() {
    const gameplayTexts = [
      "i'm literally hiding on the top of the filing cabinet, they ran right past me!",
      "this water balloon launcher is epic",
      "bro, who was moving? i saw a tail wiggle",
      "perfect 100% camouflage, let's go!",
      "watch out, detector cat is headed down the hallway",
      "wait, did anyone check the Mona Lisa room?",
      "camo is so hard on the floor tiles",
      "almost tagged me, my heart stopped!"
    ];
    
    // Periodically post chats from alive bots
    const interval = setInterval(() => {
      if (Game.gameState !== 'playing') {
        clearInterval(interval);
        return;
      }

      // Choose a random bot that isn't caught
      const activeBots = Game.bots.filter(b => !b.isCaught);
      if (activeBots.length > 0) {
        const bot = activeBots[Math.floor(Math.random() * activeBots.length)];
        const text = gameplayTexts[Math.floor(Math.random() * gameplayTexts.length)];
        this.addGameChatMessage(bot.username, text);
      }
    }, 12000 + Math.random() * 8000);
  }

  setupMuteButton() {
    const muteBtn = document.getElementById('mute-btn');
    if (!muteBtn) return;

    muteBtn.addEventListener('click', () => {
      const isMuted = Sounds.toggleMute();
      muteBtn.innerText = isMuted ? '🔇' : '🔊';
      Sounds.playClick();
    });
  }
}

export const UI = new UIManager();
