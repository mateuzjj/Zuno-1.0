import { Album, Playlist, Track } from "./types";

// ZUNO Branding Palette — base imersiva, primária tecnológica, secundária criativa
export const ZUNO_COLORS = {
  base: '#0B0F1A',
  primary: '#5B8CFF',
  secondary: '#9B5CFF',
  black: '#0B0F1A',
  accent: '#5B8CFF',
};

// Mock Audio URL (Copyright free sample for demo purposes)
const DEMO_AUDIO_URL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

export const MOCK_TRACKS: Track[] = [
  {
    id: 't1',
    title: 'Neon Nights',
    artist: 'Synthwave Boy',
    album: 'Retro Future',
    coverUrl: 'https://picsum.photos/seed/neon/400/400',
    duration: 245,
    streamUrl: DEMO_AUDIO_URL
  },
  {
    id: 't2',
    title: 'Midnight City',
    artist: 'Luminous',
    album: 'City Lights',
    coverUrl: 'https://picsum.photos/seed/city/400/400',
    duration: 198,
    streamUrl: DEMO_AUDIO_URL
  },
  {
    id: 't3',
    title: 'Deep Focus',
    artist: 'Mindful State',
    album: 'Flow',
    coverUrl: 'https://picsum.photos/seed/focus/400/400',
    duration: 300,
    streamUrl: DEMO_AUDIO_URL
  },
  {
    id: 't4',
    title: 'Bass Drop',
    artist: 'The Architect',
    album: 'Construct',
    coverUrl: 'https://picsum.photos/seed/bass/400/400',
    duration: 185,
    streamUrl: DEMO_AUDIO_URL
  },
  {
    id: 't5',
    title: 'Ethereal',
    artist: 'Sky Walker',
    album: 'Atmosphere',
    coverUrl: 'https://picsum.photos/seed/sky/400/400',
    duration: 420,
    streamUrl: DEMO_AUDIO_URL
  }
];

export const MOCK_ALBUMS: Album[] = [
  {
    id: 'a1',
    title: 'Retro Future',
    artist: 'Synthwave Boy',
    coverUrl: 'https://picsum.photos/seed/neon/400/400',
    year: 2024
  },
  {
    id: 'a2',
    title: 'City Lights',
    artist: 'Luminous',
    coverUrl: 'https://picsum.photos/seed/city/400/400',
    year: 2023
  },
  {
    id: 'a3',
    title: 'Flow',
    artist: 'Mindful State',
    coverUrl: 'https://picsum.photos/seed/focus/400/400',
    year: 2024
  },
  {
    id: 'a4',
    title: 'Construct',
    artist: 'The Architect',
    coverUrl: 'https://picsum.photos/seed/bass/400/400',
    year: 2022
  }
];

export const MOCK_PLAYLISTS: Playlist[] = [
  {
    id: 'p1',
    title: 'ZUNO Essentials',
    description: 'O som que define a experiência.',
    coverUrl: 'https://picsum.photos/seed/zuno1/400/400',
    trackCount: 50
  },
  {
    id: 'p2',
    title: 'Foco Profundo',
    description: 'Sem distrações. Apenas som.',
    coverUrl: 'https://picsum.photos/seed/zuno2/400/400',
    trackCount: 24
  },
  {
    id: 'p3',
    title: 'Energia Pura',
    description: 'Para quando você precisa acelerar.',
    coverUrl: 'https://picsum.photos/seed/zuno3/400/400',
    trackCount: 30
  }
];