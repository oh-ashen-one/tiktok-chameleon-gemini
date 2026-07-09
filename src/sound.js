class SoundManager {
  constructor() {
    this.ctx = null;
    this.musicInterval = null;
    this.isMuted = false;
    this.musicOscs = [];
  }

  init() {
    if (this.ctx) return;
    // Create audio context on user interaction
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      this.ctx = new AudioContextClass();
    }
  }

  playClick() {
    this.init();
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  playMeow(pitchMultiplier = 1.0) {
    this.init();
    if (!this.ctx || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    const now = this.ctx.currentTime;
    
    // Meow sound is a fast ramp up and slow ramp down in pitch
    const baseFreq = 440 * pitchMultiplier;
    osc.frequency.setValueAtTime(baseFreq * 0.8, now);
    osc.frequency.quadraticRampToValueAtTime(baseFreq * 1.5, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.9, now + 0.35);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(now + 0.36);
  }

  playSpray() {
    this.init();
    if (!this.ctx || this.isMuted) return;

    const bufferSize = this.ctx.sampleRate * 0.25; // 0.25s
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Generate white noise for spray
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = buffer;

    // Filter white noise to sound like a spray
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1500, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

    noiseNode.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noiseNode.start();
  }

  playEyedrop() {
    this.init();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    
    // Bubble/Chime drop sound
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    const gain2 = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.06); // E5
    osc2.frequency.exponentialRampToValueAtTime(1046.50, now + 0.18); // C6

    gain1.gain.setValueAtTime(0.05, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    gain2.gain.setValueAtTime(0, now);
    gain2.gain.setValueAtTime(0.05, now + 0.06);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);

    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.16);

    osc2.start(now + 0.06);
    osc2.stop(now + 0.23);
  }

  playSplash() {
    this.init();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    
    // Water balloon splash: explosion + water high frequencies
    // Part 1: Bass pop
    const popOsc = this.ctx.createOscillator();
    const popGain = this.ctx.createGain();
    popOsc.type = 'triangle';
    popOsc.frequency.setValueAtTime(160, now);
    popOsc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
    popGain.gain.setValueAtTime(0.2, now);
    popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    popOsc.connect(popGain);
    popGain.connect(this.ctx.destination);
    popOsc.start(now);
    popOsc.stop(now + 0.16);

    // Part 2: Noise splash
    const bufferSize = this.ctx.sampleRate * 0.35;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(2500, now + 0.2);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.12, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    noise.start(now);
  }

  playTag() {
    this.init();
    if (!this.ctx || this.isMuted) return;

    const now = this.ctx.currentTime;
    // Retro warning / captured sound (descending beep alarm)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.setValueAtTime(150, now + 0.1);
    osc.frequency.setValueAtTime(75, now + 0.2);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.36);
  }

  startMusic() {
    this.init();
    if (!this.ctx || this.musicInterval) return;

    const tempo = 130; // BPM
    const noteLength = 60 / tempo / 2; // Eighth note (seconds)
    
    // Cyberpunk/Chiptune bassline loop
    // Notes in C minor: C2, Eb2, G2, Bb2, C3, etc.
    const bassline = [
      36, 36, 48, 36, 39, 39, 48, 39,
      43, 43, 48, 43, 41, 41, 46, 41
    ]; // MIDI values
    
    const melody = [
      60, 0, 63, 65, 67, 0, 65, 0,
      63, 65, 60, 0, 58, 0, 60, 0
    ];

    let step = 0;

    const midiToFreq = (note) => {
      if (note === 0) return 0;
      return 440 * Math.pow(2, (note - 69) / 12);
    };

    const playSynthNote = (freq, time, type = 'square', volume = 0.02, duration = 0.15) => {
      if (freq === 0 || this.isMuted) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(volume, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(time);
      osc.stop(time + duration + 0.05);

      this.musicOscs.push(osc);
      if (this.musicOscs.length > 50) {
        this.musicOscs.shift();
      }
    };

    this.musicInterval = setInterval(() => {
      if (!this.ctx || this.isMuted) return;
      const now = this.ctx.currentTime;
      
      // Play Bass
      const bassNote = bassline[step % bassline.length];
      playSynthNote(midiToFreq(bassNote), now, 'triangle', 0.04, noteLength * 0.9);

      // Play Melody on beat
      const melodyNote = melody[step % melody.length];
      if (melodyNote > 0 && Math.random() > 0.1) {
        playSynthNote(midiToFreq(melodyNote), now, 'square', 0.015, noteLength * 1.5);
      }

      // Add a retro hi-hat sound on alternate steps
      if (step % 2 === 1) {
        const hhGain = this.ctx.createGain();
        const bufferSize = this.ctx.sampleRate * 0.03;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(8000, now);

        hhGain.gain.setValueAtTime(0.004, now);
        hhGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

        noise.connect(filter);
        filter.connect(hhGain);
        hhGain.connect(this.ctx.destination);
        noise.start(now);
      }

      step++;
    }, noteLength * 1000);
  }

  stopMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
    // Stop any active oscillators
    this.musicOscs.forEach(osc => {
      try { osc.stop(); } catch(e) {}
    });
    this.musicOscs = [];
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopMusic();
    } else {
      this.startMusic();
    }
    return this.isMuted;
  }
}

export const Sounds = new SoundManager();
