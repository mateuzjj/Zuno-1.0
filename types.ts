export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  duration: number; // seconds
  streamUrl?: string; // Optional because it is fetched on demand
  quality?: string;
  quality?: string;
  // Recommendation Engine Fields
  genre: string[];
  bpm: number;
  energy: number;
  valence: number;
  popularity: number;
}

export enum ContextType {
  Morning = 'Morning',
  Focus = 'Focus',
  Workout = 'Workout',
  Party = 'Party',
  Chill = 'Chill',
  Rainy = 'Rainy'
}

export interface Artist {
  id: string;
  name: string;
  picture: string;
  type?: string;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  year?: number;
  releaseDate?: string;
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  trackCount: number;
}

export enum PlayerStatus {
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  STOPPED = 'STOPPED',
  LOADING = 'LOADING',
  ERROR = 'ERROR'
}

export interface PlayerState {
  currentTrack: Track | null;
  status: PlayerStatus;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
}

export type View = 'home' | 'search' | 'library' | 'editor' | 'artist';