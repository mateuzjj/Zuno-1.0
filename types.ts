export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  duration: number; // seconds
  streamUrl?: string; // Optional because it is fetched on demand
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
  name: string;
  description?: string;
  coverUrl?: string;
  tracks: Track[];
  createdAt: number;
  updatedAt: number;
}

export type RepeatMode = 'off' | 'all' | 'one';

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
  shuffleEnabled: boolean;
  repeatMode: RepeatMode;
}

export type View = 'home' | 'search' | 'library' | 'editor' | 'artist' | 'album' | 'playlist' | 'likedSongs' | 'generator';

// Lyrics Types
export interface LyricsLine {
  time: number; // time in seconds
  text: string;
}

export interface Lyrics {
  id?: number;
  trackName: string;
  artistName: string;
  albumName?: string;
  duration?: number;
  plainLyrics?: string;
  syncedLyrics?: LyricsLine[];
  instrumental: boolean;
}

export interface LyricsCacheEntry {
  trackId: string;
  lyrics: Lyrics | null;
  timestamp: number;
  trackName: string;
  artistName: string;
}

// Spotify Types
export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: {
    id: string;
    name: string;
    images: { url: string }[];
  };
  duration_ms: number;
  uri: string;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  images: { url: string }[];
  genres?: string[];
  uri: string;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  images: { url: string }[];
  release_date: string;
  total_tracks: number;
  uri: string;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  images: { url: string }[];
  tracks: { total: number };
  owner: { display_name: string };
  uri: string;
}