import { Track, ContextType } from '../types';
import { MOCK_TRACKS } from './mockData';

// Simulating the "Engine" layers described in the prompt

// 1. Context Filtering (Logic)
export const getTracksByContext = (context: ContextType): Track[] => {
  let filtered = [...MOCK_TRACKS];

  switch (context) {
    case ContextType.Workout:
      // High energy, High BPM
      return filtered.filter(t => t.energy > 0.7 && t.bpm > 100).sort((a, b) => b.energy - a.energy);
    
    case ContextType.Focus:
      // Moderate BPM, instrumental-ish (simulated by low energy or specific genres), not too sad
      return filtered.filter(t => (t.genre.includes('Lo-Fi') || t.genre.includes('Classical') || t.energy < 0.5) && t.bpm < 110);

    case ContextType.Party:
      // High popularity, high energy
      return filtered.filter(t => t.energy > 0.8).sort((a, b) => b.popularity - a.popularity);

    case ContextType.Morning:
      // Moderate energy, high valence (happy)
      return filtered.filter(t => t.valence > 0.5 && t.energy > 0.3 && t.energy < 0.8);

    case ContextType.Rainy:
      // Low energy, lower valence
      return filtered.filter(t => t.energy < 0.4 || t.genre.includes('Ambient'));

    case ContextType.Chill:
    default:
      return filtered.filter(t => t.energy < 0.6);
  }
};

// 2. Collaborative Filtering Simulation (Mock)
export const getCollaborativeRecommendations = (likedTrackId: string): Track[] => {
  // In a real app, this uses Matrix Factorization. 
  // Here, we just return tracks with similar genre tags as a proxy.
  const source = MOCK_TRACKS.find(t => t.id === likedTrackId);
  if (!source) return [];

  return MOCK_TRACKS.filter(t => 
    t.id !== likedTrackId && 
    t.genre.some(g => source.genre.includes(g))
  );
};

// 3. User Vector Simulation (for Visualization)
export const calculateUserVector = (history: Track[]) => {
  if (history.length === 0) return { energy: 0.5, valence: 0.5, bpm: 100 };

  const total = history.length;
  const avgEnergy = history.reduce((acc, t) => acc + t.energy, 0) / total;
  const avgValence = history.reduce((acc, t) => acc + t.valence, 0) / total;
  const avgBpm = history.reduce((acc, t) => acc + t.bpm, 0) / total;

  return { energy: avgEnergy, valence: avgValence, bpm: avgBpm };
};