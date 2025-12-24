export enum ContextType {
  Morning = 'Morning',
  Focus = 'Focus',
  Workout = 'Workout',
  Party = 'Party',
  Chill = 'Chill',
  Rainy = 'Rainy'
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  albumArt: string;
  duration: number; // in seconds
  genre: string[];
  bpm: number;
  energy: number; // 0.0 to 1.0
  valence: number; // 0.0 to 1.0 (Mood: Sad to Happy)
  popularity: number;
}

export interface UserEvent {
  userId: string;
  trackId: string;
  event: 'play' | 'skip' | 'like' | 'dislike';
  timestamp: string;
  context: ContextType;
}

export interface RecommendationReason {
  type: 'content-based' | 'collaborative' | 'contextual' | 'hybrid';
  description: string;
}

export interface PlaybackState {
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number;
  volume: number;
}