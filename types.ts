export interface Track {
  id: string;
  title: string;
  artist: string;
  artistId?: string; // Tidal numeric artist ID — used for /artist/similar/ endpoint
  album: string;
  albumId?: string; // Tidal numeric album ID — used for /album/similar/ endpoint
  coverUrl: string;
  duration: number; // seconds
  streamUrl?: string; // Optional because it is fetched on demand
  quality?: string;
  // Recommendation Engine Fields - Audio Features (Spotify-like)
  genre: string[];
  bpm: number; // Tempo
  energy: number; // 0-1
  valence: number; // 0-1 (positivity/happiness)
  popularity: number; // 0-100
  // Extended Audio Features (for hybrid recommendation)
  danceability?: number; // 0-1
  acousticness?: number; // 0-1
  instrumentalness?: number; // 0-1
  liveness?: number; // 0-1
  speechiness?: number; // 0-1
  loudness?: number; // -60 to 0 dB
  mode?: number; // 0 (minor) or 1 (major)
  key?: number; // 0-11 (pitch class)
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

export interface RecommendedArtist {
  id: string;
  name: string;
  picture: string;
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

export type View = 'home' | 'search' | 'library' | 'artist' | 'album' | 'playlist' | 'likedSongs' | 'likedAlbums';

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