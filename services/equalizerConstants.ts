/** Só constantes e labels – sem Web Audio nem localStorage. Usado para o app carregar mesmo se equalizer.ts falhar. */

const BAND_COUNT = 10;

function generateFrequencies(count: number, minFreq: number, maxFreq: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const freq = minFreq * Math.pow(maxFreq / minFreq, t);
    out.push(Math.round(freq));
  }
  return out;
}

export const EQ_FREQUENCIES = generateFrequencies(BAND_COUNT, 32, 16000);

export function getFrequencyLabel(hz: number): string {
  if (hz < 1000) return `${hz}`;
  if (hz < 10000) return `${(hz / 1000).toFixed(hz % 1000 === 0 ? 0 : 1)}k`;
  return `${(hz / 1000).toFixed(0)}k`;
}

export const EQ_PRESETS: Record<string, { name: string; gains: number[] }> = {
  flat: { name: 'Plano', gains: new Array(BAND_COUNT).fill(0) },
  bass_boost: { name: 'Mais graves', gains: [5, 4, 3, 2, 1, 0, 0, 0, 0, 0] },
  bass_reducer: { name: 'Menos graves', gains: [-5, -4, -3, -2, -1, 0, 0, 0, 0, 0] },
  treble_boost: { name: 'Mais agudos', gains: [0, 0, 0, 0, 0, 0, 1, 2, 3, 4] },
  treble_reducer: { name: 'Menos agudos', gains: [0, 0, 0, 0, 0, 0, -1, -2, -3, -4] },
  vocal: { name: 'Voz', gains: [-2, -1, 0, 1, 2, 2.5, 2, 1, 0, -1] },
  rock: { name: 'Rock', gains: [4, 3, 2, 0, -1, -1, 0, 1, 2, 2] },
  pop: { name: 'Pop', gains: [-1, 0, 1, 2, 2, 1, 0, 0, 1, 1] },
};

export const EQ_GAINS_DEFAULT = new Array(BAND_COUNT).fill(0);
