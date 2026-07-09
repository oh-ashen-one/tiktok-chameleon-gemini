# 😼 TIKTOK CHAMELEON 🦎

Welcome to **TIKTOK CHAMELEON** (GitHub: `TIKTOK CHAMELEON GEMINI`), a 1:1 high-fidelity browser recreation of the hit Steam hide-and-seek party game *Meccha Chameleon*, reimagined with cute cat avatars instead of humans! 

The game is built entirely with web technologies (HTML5, Vanilla CSS, Three.js WebGL, and Web Audio API) and is designed to provide 5+ minutes of intense, premium party game loops directly in your browser.

---

## 🎮 Key Features

1. **Procedural 3D Cat Avatars**: Customize your cat with skin colors, metallic/roughness properties, and premium accessories (Ninja Mask, Detective Hat, or Neon Collar).
2. **Interactive 3D Locker Room**: Rotate and inspect your cat in real-time as you tweak material settings.
3. **Advanced Camouflage Evaluator**: Raycasts dynamically analyze the texture color, metalness, and roughness of whatever surface or wall painting you stand against. Moving instantly breaks your camo!
4. **Interactive 3D Arenas**:
   - **The Backrooms**: Sneak through yellow-wallpapered corridors and moist carpet tile grids, blending into cabinets and walls.
   - **The Art Gallery**: Blend directly into cat-adapted masterpieces hanging on white gallery walls (including the *Cat Mona Lisa* and *Cat Starry Night*). If you stand against a painting, your eyedropper will extract its specific colors pixel-by-pixel!
5. **Procedural Chiptune Audio Synthesizer**: Fully integrated Web Audio system that generates 8-bit loops, meows, splashes, and tag triggers procedurally with zero lag or asset loading times.
6. **Fake Online Lobby & Chat Simulator**: Bots simulate full online multiplayer chats, match ready-ups, and in-game commentary ("*who threw that balloon?*", "*camo is 99% here*", "*check the Mona Lisa room*").
7. **Dual Game Modes**: Play as a **Hider** blending in, or a **Seeker** with a flashlight and a water balloon launcher hunting down hidden bots.

---

## 🕹️ Controls Guide

| Key / Action | Role | Description |
|---|---|---|
| **`W` `A` `S` `D`** / Arrows | All | Walk & Steer Cat |
| **`Spacebar`** (Posed) | Hider | **Eyedropper Tool**: Samples the texture/color directly beneath or in front of you. |
| **`Spacebar`** (Standing) | All | Jump onto tables, pedestals, or paintings. |
| **`F`** | All | Open/Close the manual Paint Editor slider panel. |
| **`1`** | Hider | **Stand Pose**: Standard height, normal speed, no camo bonus. |
| **`2`** | Hider | **Sit Pose**: Tuck limbs, lower profile, +5% Camouflage rating. |
| **`3`** | Hider | **Curl Up (Ball) Pose**: Roll into a small sphere, +8% Camouflage rating. |
| **`4`** | Hider | **Lie Down (Flat) Pose**: Flatten on floor/walls, +10% Camouflage rating. |
| **Left Click** | Seeker | **Launch Water Balloon**: Throws a physics-based balloon to reveal hiders. |

---

## 🛠️ Technology Stack & Dev Specs

- **3D Graphics Engine**: Three.js WebGL (Low-poly meshes, shadows, spotlights, and material mapping).
- **Styling**: Vanilla CSS featuring cyber neon color systems, responsive flex/grid panels, and glassmorphism styling.
- **Synthesizer**: Web Audio API (real-time chiptune oscillator generation).
- **Bundler**: Vite.
- **Node Environment**: v26.0.0+ / NPM v11.12.1+.

---

## 🚀 How to Run Locally

1. **Clone & Enter directory**:
   ```bash
   cd "/Users/midir/Desktop/TIOKTOK CHAMELEON GEMINI"
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start Local Server**:
   ```bash
   npm run dev
   ```

4. **Play**:
   Open **[http://localhost:5173](http://localhost:5173)** in your browser!
