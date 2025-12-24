import { Track } from '../types';
import { MOCK_TRACKS } from './mockData';

// To match ContextType from types, we'll cast strings for now as the types might not be fully synced
type ContextType = 'Morning' | 'Focus' | 'Workout' | 'Party' | 'Chill' | 'Rainy';

// 1. Context Filtering (Logic)
export const getTracksByContext = (context: ContextType): Track[] => {
    let filtered = [...MOCK_TRACKS];

    switch (context) {
        case 'Workout':
            // High energy, High BPM
            return filtered.filter(t => t.energy > 0.7 && t.bpm > 100).sort((a, b) => b.energy - a.energy);

        case 'Focus':
            // Moderate BPM, instrumental-ish (simulated by low energy or specific genres), not too sad
            return filtered.filter(t => (t.genre.includes('Lo-Fi') || t.genre.includes('Classical') || t.energy < 0.5) && t.bpm < 110);

        case 'Party':
            // High popularity, high energy
            return filtered.filter(t => t.energy > 0.8).sort((a, b) => b.popularity - a.popularity);

        case 'Morning':
            // Moderate energy, high valence (happy)
            return filtered.filter(t => t.valence > 0.5 && t.energy > 0.3 && t.energy < 0.8);

        case 'Rainy':
            // Low energy, lower valence
            return filtered.filter(t => t.energy < 0.4 || t.genre.includes('Ambient'));

        case 'Chill':
        default:
            return filtered.filter(t => t.energy < 0.6);
    }
};

// 2. Collaborative Filtering Simulation (Mock)
export const getCollaborativeRecommendations = (likedTrackId: string): Track[] => {
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

// 4. Personalization: Rank Tracks by User Taste
export const rankTracks = (tracks: Track[], userProfile: { energy: number, valence: number, bpm: number }): Track[] => {
    if (!userProfile) return tracks;

    // Helper: Calculate similarity score (inverse distance)
    // We normalize BPM to a 0-1 range roughly (assuming 60-180 bpm range) for fair comparison with energy/valence
    const getScore = (t: Track) => {
        const bpmNorm = Math.min(Math.max((t.bpm - 60) / 120, 0), 1);
        const userBpmNorm = Math.min(Math.max((userProfile.bpm - 60) / 120, 0), 1);

        const energyDiff = Math.abs(t.energy - userProfile.energy);
        const valenceDiff = Math.abs(t.valence - userProfile.valence);
        const bpmDiff = Math.abs(bpmNorm - userBpmNorm);

        // Lower diff is better. Weighted sum (Energy is often most impactful for "Vibe")
        const distance = (energyDiff * 1.5) + (valenceDiff * 1.0) + (bpmDiff * 0.5);
        return distance;
    };

    // Sort by ascending distance (closest match first)
    return [...tracks].sort((a, b) => getScore(a) - getScore(b));
};
