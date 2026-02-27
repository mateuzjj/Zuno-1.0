/**
 * Equalizer service using Web Audio API.
 * Inspired by Monochrome's audio-context.js (BiquadFilterNode peaking bands).
 */

const BAND_COUNT = 10;
const GAIN_MIN = -12;
const GAIN_MAX = 12;
const FREQ_MIN = 32;
const FREQ_MAX = 16000;

const STORAGE_ENABLED = 'zuno-eq-enabled';
const STORAGE_GAINS = 'zuno-eq-gains';
const STORAGE_PRESET = 'zuno-eq-preset';

function generateFrequencies(count: number, minFreq: number, maxFreq: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const freq = minFreq * Math.pow(maxFreq / minFreq, t);
    out.push(Math.round(freq));
  }
  return out;
}

export const EQ_FREQUENCIES = generateFrequencies(BAND_COUNT, FREQ_MIN, FREQ_MAX);

export function getFrequencyLabel(hz: number): string {
  if (hz < 1000) return `${hz}`;
  if (hz < 10000) return `${(hz / 1000).toFixed(hz % 1000 === 0 ? 0 : 1)}k`;
  return `${(hz / 1000).toFixed(0)}k`;
}

export const EQ_PRESETS: Record<string, { name: string; gains: number[] }> = {
  flat: { name: 'Plano', gains: new Array(BAND_COUNT).fill(0) },
  bass_boost: {
    name: 'Mais graves',
    gains: [5, 4, 3, 2, 1, 0, 0, 0, 0, 0],
  },
  bass_reducer: {
    name: 'Menos graves',
    gains: [-5, -4, -3, -2, -1, 0, 0, 0, 0, 0],
  },
  treble_boost: {
    name: 'Mais agudos',
    gains: [0, 0, 0, 0, 0, 0, 1, 2, 3, 4],
  },
  treble_reducer: {
    name: 'Menos agudos',
    gains: [0, 0, 0, 0, 0, 0, -1, -2, -3, -4],
  },
  vocal: {
    name: 'Voz',
    gains: [-2, -1, 0, 1, 2, 2.5, 2, 1, 0, -1],
  },
  rock: {
    name: 'Rock',
    gains: [4, 3, 2, 0, -1, -1, 0, 1, 2, 2],
  },
  pop: {
    name: 'Pop',
    gains: [-1, 0, 1, 2, 2, 1, 0, 0, 1, 1],
  },
};

function loadEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_ENABLED) === 'true';
  } catch {
    return false;
  }
}

function saveEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_ENABLED, enabled ? 'true' : 'false');
  } catch {
    /* ignore */
  }
}

function loadGains(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_GAINS);
    if (!raw) return new Array(BAND_COUNT).fill(0);
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr) || arr.length !== BAND_COUNT) return new Array(BAND_COUNT).fill(0);
    return arr.map((g: unknown) => Math.max(GAIN_MIN, Math.min(GAIN_MAX, Number(g) || 0)));
  } catch {
    return new Array(BAND_COUNT).fill(0);
  }
}

function saveGains(gains: number[]): void {
  try {
    localStorage.setItem(STORAGE_GAINS, JSON.stringify(gains));
  } catch {
    /* ignore */
  }
}

function loadPreset(): string {
  try {
    return localStorage.getItem(STORAGE_PRESET) || 'flat';
  } catch {
    return 'flat';
  }
}

function savePreset(preset: string): void {
  try {
    localStorage.setItem(STORAGE_PRESET, preset);
  } catch {
    /* ignore */
  }
}

class EqualizerManager {
  private ctx: AudioContext | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private filters: BiquadFilterNode[] = [];
  private gainNode: GainNode | null = null;
  private enabled = loadEnabled();
  private gains = loadGains();
  private currentVolume = 1;

  init(audio: HTMLAudioElement): void {
    if (typeof window === 'undefined' || !audio) return;
    if (this.ctx != null) return;
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
      this.source = this.ctx.createMediaElementSource(audio);
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.value = this.currentVolume;
      this.rebuildFilters();
      this.connectGraph();
    } catch (e) {
      console.warn('[EQ] Init failed:', e);
    }
  }

  private rebuildFilters(): void {
    if (!this.ctx) return;
    this.filters.forEach((f) => {
      try {
        f.disconnect();
      } catch {
        /* ignore */
      }
    });
    this.filters = EQ_FREQUENCIES.map((freq, i) => {
      const f = this.ctx!.createBiquadFilter();
      f.type = 'peaking';
      f.frequency.value = freq;
      f.Q.value = 1.5;
      f.gain.value = this.gains[i] ?? 0;
      return f;
    });
  }

  private connectGraph(): void {
    if (!this.source || !this.ctx || !this.gainNode) return;
    this.source.disconnect();
    this.gainNode.disconnect();
    let node: AudioNode = this.source;
    if (this.enabled && this.filters.length > 0) {
      for (let i = 0; i < this.filters.length - 1; i++) {
        this.filters[i].disconnect();
        node.connect(this.filters[i]);
        node = this.filters[i];
      }
      this.filters[this.filters.length - 1].disconnect();
      node.connect(this.filters[this.filters.length - 1]);
      node = this.filters[this.filters.length - 1];
    }
    node.connect(this.gainNode);
    this.gainNode.connect(this.ctx.destination);
  }

  isInitialized(): boolean {
    return this.ctx != null && this.source != null;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    saveEnabled(enabled);
    if (this.isInitialized()) this.connectGraph();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setVolume(value: number): void {
    this.currentVolume = Math.max(0, Math.min(1, value));
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setTargetAtTime(this.currentVolume, this.ctx.currentTime, 0.01);
    }
  }

  getGains(): number[] {
    return [...this.gains];
  }

  setBandGain(index: number, gainDb: number): void {
    if (index < 0 || index >= BAND_COUNT) return;
    const g = Math.max(GAIN_MIN, Math.min(GAIN_MAX, gainDb));
    this.gains[index] = g;
    saveGains(this.gains);
    if (this.filters[index] && this.ctx) {
      this.filters[index].gain.setTargetAtTime(g, this.ctx.currentTime, 0.01);
    }
  }

  setAllGains(gains: number[]): void {
    if (!Array.isArray(gains) || gains.length !== BAND_COUNT) return;
    for (let i = 0; i < BAND_COUNT; i++) {
      this.gains[i] = Math.max(GAIN_MIN, Math.min(GAIN_MAX, gains[i] ?? 0));
      if (this.filters[i] && this.ctx) {
        this.filters[i].gain.setTargetAtTime(this.gains[i], this.ctx.currentTime, 0.01);
      }
    }
    saveGains(this.gains);
  }

  applyPreset(key: string): void {
    const preset = EQ_PRESETS[key];
    if (!preset) return;
    this.setAllGains(preset.gains);
    savePreset(key);
  }

  reset(): void {
    this.setAllGains(new Array(BAND_COUNT).fill(0));
    savePreset('flat');
  }

  getPreset(): string {
    return loadPreset();
  }

  async resume(): Promise<boolean> {
    if (!this.ctx) return false;
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    return this.ctx.state === 'running';
  }

  getBandCount(): number {
    return BAND_COUNT;
  }

  getGainRange(): { min: number; max: number } {
    return { min: GAIN_MIN, max: GAIN_MAX };
  }
}

export const equalizerManager = new EqualizerManager();
