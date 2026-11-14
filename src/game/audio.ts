import { PowerupType } from './types';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muted = false;

  // Sustained jetpack thruster nodes
  private jetGain: GainNode | null = null;
  private jetOsc: OscillatorNode | null = null;
  private jetNoiseSrc: AudioBufferSourceNode | null = null;

  // Upbeat groove loop
  private musicTimer: number | null = null;
  private musicStep = 0;
  private musicActive = false;

  // Bird chirp timer
  private birdTimer: number | null = null;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.65;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock(): void {
    this.ensureContext();
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(mute ? 0 : 0.65, this.ctx.currentTime, 0.03);
    }
    if (mute) {
      this.stopJetpackLoop();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  /** Iconic Subway Surfers coin chime: bright B5 -> E6 bell ping, rising slightly with streak */
  public playCoin(streak = 0): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const semitoneBoost = Math.min(streak, 10) * 0.45;
    const pitchFactor = Math.pow(2, semitoneBoost / 12);
    const f1 = 987.77 * pitchFactor; // B5
    const f2 = 1318.51 * pitchFactor; // E6

    const osc1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(f1, now);
    osc1.frequency.setValueAtTime(f2, now + 0.052);

    g1.gain.setValueAtTime(0.001, now);
    g1.gain.linearRampToValueAtTime(0.24, now + 0.008);
    g1.gain.exponentialRampToValueAtTime(0.001, now + 0.23);

    // Sparkle overtone
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(f2 * 2, now + 0.052);
    g2.gain.setValueAtTime(0.001, now + 0.052);
    g2.gain.linearRampToValueAtTime(0.08, now + 0.06);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc1.connect(g1).connect(this.masterGain);
    osc2.connect(g2).connect(this.masterGain);

    osc1.start(now);
    osc1.stop(now + 0.24);
    osc2.start(now + 0.052);
    osc2.stop(now + 0.23);
  }

  public playJump(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.14);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain).connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playRoll(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(125, now + 0.13);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain).connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playLaneSwitch(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(510, now + 0.065);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

    osc.connect(gain).connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playPowerup(kind: PowerupType): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    if (kind === 'jetpack') {
      this.playJetpackStart();
      return;
    }

    const now = ctx.currentTime;
    const notes = kind === 'magnet' ? [523.25, 659.25, 783.99, 1046.5] : [587.33, 739.99, 880, 1174.66];
    notes.forEach((freq, idx) => {
      const t = now + idx * 0.055;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.2, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      osc.connect(g).connect(this.masterGain!);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  }

  public playJetpackStart(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    // Ignition roar sweep
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.35);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(2400, now + 0.35);

    gain.gain.setValueAtTime(0.26, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(filter).connect(gain).connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.46);

    // Bright fanfare notes
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const t = now + i * 0.06;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.16, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      o.connect(g).connect(this.masterGain!);
      o.start(t);
      o.stop(t + 0.26);
    });

    this.startJetpackLoop();
  }

  public startJetpackLoop(): void {
    if (this.muted || this.jetGain) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const jetGain = ctx.createGain();
    jetGain.gain.setValueAtTime(0.001, now);
    jetGain.gain.linearRampToValueAtTime(0.14, now + 0.2);

    // Low turbine hum
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(115, now);

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(340, now);

    // Filtered noise for wind / rocket thrust
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(750, now);
    bandpass.Q.setValueAtTime(1.1, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.55;

    osc.connect(lowpass).connect(jetGain);
    noise.connect(bandpass).connect(noiseGain).connect(jetGain);
    jetGain.connect(this.masterGain);

    osc.start(now);
    noise.start(now);

    this.jetGain = jetGain;
    this.jetOsc = osc;
    this.jetNoiseSrc = noise;
  }

  public stopJetpackLoop(): void {
    if (!this.ctx || !this.jetGain) return;
    const now = this.ctx.currentTime;
    try {
      this.jetGain.gain.setTargetAtTime(0.0001, now, 0.08);
      const oldOsc = this.jetOsc;
      const oldNoise = this.jetNoiseSrc;
      setTimeout(() => {
        try {
          oldOsc?.stop();
          oldNoise?.stop();
        } catch {
          // ignore
        }
      }, 250);
    } catch {
      // ignore
    }
    this.jetGain = null;
    this.jetOsc = null;
    this.jetNoiseSrc = null;
  }

  public playJetpackEnd(): void {
    this.stopJetpackLoop();
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.35);
    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
    osc.connect(g).connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.37);
  }

  /** Classic Subway Inspector Trill Whistle */
  public playPoliceWhistle(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const carrier = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    const mainGain = ctx.createGain();

    carrier.type = 'sine';
    carrier.frequency.setValueAtTime(2650, now);
    carrier.frequency.linearRampToValueAtTime(2820, now + 0.14);
    carrier.frequency.linearRampToValueAtTime(2580, now + 0.34);

    // Pea-whistle trill at 26 Hz
    mod.type = 'sine';
    mod.frequency.setValueAtTime(26, now);
    modGain.gain.setValueAtTime(220, now);

    mod.connect(modGain).connect(carrier.frequency);

    mainGain.gain.setValueAtTime(0.001, now);
    mainGain.gain.linearRampToValueAtTime(0.18, now + 0.02);
    mainGain.gain.setValueAtTime(0.18, now + 0.25);
    mainGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    carrier.connect(mainGain).connect(this.masterGain);
    mod.start(now);
    carrier.start(now);
    mod.stop(now + 0.39);
    carrier.stop(now + 0.39);
  }

  /** Cute Police Pup Double-Bark */
  public playDogBark(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    [0, 0.14].forEach((offset) => {
      const t = now + offset;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const g = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(380, t);
      osc.frequency.exponentialRampToValueAtTime(210, t + 0.09);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(680, t);
      filter.Q.setValueAtTime(2.5, t);

      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.22, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

      osc.connect(filter).connect(g).connect(this.masterGain!);
      osc.start(t);
      osc.stop(t + 0.11);
    });
  }

  /** Oncoming Express Train Horn */
  public playTrainHorn(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    [220, 277.18].forEach((freq) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const g = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(950, now);

      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.09, now + 0.06);
      g.gain.setValueAtTime(0.08, now + 0.22);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(filter).connect(g).connect(this.masterGain!);
      osc.start(now);
      osc.stop(now + 0.46);
    });
  }

  public playStumble(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.18);
    g.gain.setValueAtTime(0.26, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(g).connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.21);

    setTimeout(() => this.playPoliceWhistle(), 90);
    setTimeout(() => this.playDogBark(), 220);
  }

  /** Heavy crash + Police catch sting */
  public playBusted(): void {
    this.stopJetpackLoop();
    this.stopMusic();
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;

    // Heavy impact thud
    const thud = ctx.createOscillator();
    const thudG = ctx.createGain();
    thud.type = 'triangle';
    thud.frequency.setValueAtTime(140, now);
    thud.frequency.exponentialRampToValueAtTime(36, now + 0.32);
    thudG.gain.setValueAtTime(0.45, now);
    thudG.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
    thud.connect(thudG).connect(this.masterGain);
    thud.start(now);
    thud.stop(now + 0.35);

    // Metallic crash burst
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) {
      ch[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.06));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const nGain = ctx.createGain();
    nGain.gain.value = 0.28;
    noise.connect(nGain).connect(this.masterGain);
    noise.start(now);

    // Police whistle + comical descending "caught" riff
    setTimeout(() => this.playPoliceWhistle(), 110);
    setTimeout(() => this.playDogBark(), 280);

    const descend = [392.0, 349.23, 311.13, 261.63];
    descend.forEach((freq, idx) => {
      const t = now + 0.38 + idx * 0.13;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sawtooth';
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1100;
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.14, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      o.connect(lp).connect(g).connect(this.masterGain!);
      o.start(t);
      o.stop(t + 0.17);
    });
  }

  public playBirdChirp(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;
    [0, 0.12].forEach((off, i) => {
      const t = now + off;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(i === 0 ? 2200 : 2500, t);
      osc.frequency.exponentialRampToValueAtTime(i === 0 ? 3100 : 3400, t + 0.05);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.035, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      osc.connect(g).connect(this.masterGain!);
      osc.start(t);
      osc.stop(t + 0.08);
    });
  }

  /** Energetic Subway Runner procedural groove */
  public startMusic(withBirds: boolean): void {
    this.stopMusic();
    this.musicActive = true;
    this.musicStep = 0;

    const bassPattern = [65.41, 0, 65.41, 77.78, 87.31, 0, 98.0, 77.78, 65.41, 0, 65.41, 116.54, 98.0, 87.31, 77.78, 73.42];
    const leadPattern = [523.25, 0, 659.25, 0, 783.99, 659.25, 587.33, 0, 523.25, 0, 659.25, 783.99, 1046.5, 0, 783.99, 0];

    this.musicTimer = window.setInterval(() => {
      if (!this.musicActive || this.muted) return;
      const ctx = this.ensureContext();
      if (!ctx || !this.masterGain) return;

      const now = ctx.currentTime;
      const step = this.musicStep % 16;

      // Kick on 0, 4, 8, 12
      if (step % 4 === 0) {
        const kick = ctx.createOscillator();
        const kg = ctx.createGain();
        kick.type = 'sine';
        kick.frequency.setValueAtTime(125, now);
        kick.frequency.exponentialRampToValueAtTime(42, now + 0.09);
        kg.gain.setValueAtTime(0.18, now);
        kg.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        kick.connect(kg).connect(this.masterGain);
        kick.start(now);
        kick.stop(now + 0.11);
      }

      // Bass note
      const bassFreq = bassPattern[step];
      if (bassFreq > 0) {
        const b = ctx.createOscillator();
        const bg = ctx.createGain();
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 480;
        b.type = 'sawtooth';
        b.frequency.setValueAtTime(bassFreq * 2, now);
        bg.gain.setValueAtTime(0.09, now);
        bg.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
        b.connect(lp).connect(bg).connect(this.masterGain);
        b.start(now);
        b.stop(now + 0.12);
      }

      // Catchy lead accent
      const leadFreq = leadPattern[step];
      if (leadFreq > 0) {
        const l = ctx.createOscillator();
        const lg = ctx.createGain();
        l.type = 'triangle';
        l.frequency.setValueAtTime(leadFreq, now);
        lg.gain.setValueAtTime(0.045, now);
        lg.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        l.connect(lg).connect(this.masterGain);
        l.start(now);
        l.stop(now + 0.13);
      }

      this.musicStep++;
    }, 115);

    if (withBirds) {
      this.birdTimer = window.setInterval(() => {
        if (!this.musicActive || this.muted) return;
        if (Math.random() < 0.45) this.playBirdChirp();
      }, 4200);
    }
  }

  public stopMusic(): void {
    this.musicActive = false;
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (this.birdTimer !== null) {
      clearInterval(this.birdTimer);
      this.birdTimer = null;
    }
    this.stopJetpackLoop();
  }
}
