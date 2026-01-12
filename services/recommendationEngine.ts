import { Track, ContextType, SpotifyTrack } from '../types';
import { SpotifyClient } from './spotifyClient';
import { MOCK_TRACKS } from './mockData';
import { api } from './api';
import { HybridRecommendationEngine } from './hybridRecommendationEngine';

// Helper to map SpotifyTrack to internal Track type
const mapSpotifyToTrack = (st: SpotifyTrack): Track => ({
    id: st.id,
    title: st.name,
    artist: st.artists[0].name,
    album: st.album.name,
    coverUrl: st.album.images[0]?.url || '',
    duration: st.duration_ms / 1000,
    genre: [], // Genre is not directly on track object in Spotify API
    bpm: 0, // Not available without audio features call, using 0 as default
    energy: 0, // Not available without audio features call
    valence: 0, // Not available without audio features call
    popularity: 0
});

// 1. Context Filtering (Now Powered by Spotify Recommendations)
export const getTracksByContext = async (context: ContextType): Promise<Track[]> => {
    try {
        // 1. Get Seeds (Recently Played)
        const recent = await SpotifyClient.getRecentlyPlayed(5);
        if (recent.length === 0) {
            console.warn('No recent tracks found for seeds');
            return [];
        }

        const seedTracks = recent.map(t => t.id).slice(0, 5);
        const targets: any = {};

        // 2. Map Context to Audio Targets
        switch (context) {
            case ContextType.Workout:
                targets.target_energy = 0.8;
                targets.target_bpm = 140;
                break;
            case ContextType.Focus:
                targets.target_energy = 0.3;
                targets.target_bpm = 80; // Instrumentalness/Acousticness would be good too if type supported
                break;
            case ContextType.Party:
                targets.target_energy = 0.9;
                targets.target_valence = 0.8; // Happy
                break;
            case ContextType.Morning:
                targets.target_energy = 0.6;
                targets.target_valence = 0.7;
                break;
            case ContextType.Rainy:
                targets.target_energy = 0.2;
                targets.target_valence = 0.2; // Melancholic
                break;
            case ContextType.Chill:
            default:
                targets.target_energy = 0.4;
                targets.target_valence = 0.5;
                break;
        }

        // 3. Get Recommendations
        const recommendations = await SpotifyClient.getRecommendations(
            seedTracks,
            [],
            targets,
            20
        );

        return recommendations.map(mapSpotifyToTrack);

    } catch (error) {
        console.warn('Failed to get context recommendations (using mock fallback):', error);


        // Fallback to Mock Logic
        let filtered = [...MOCK_TRACKS];

        // Fisher-Yates Shuffle for variety
        for (let i = filtered.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
        }

        switch (context) {
            case ContextType.Workout:
                return filtered.filter(t => t.energy > 0.6); // Relaxed threshold for more results
            case ContextType.Focus:
                return filtered.filter(t => t.energy < 0.6);
            case ContextType.Party:
                return filtered.filter(t => t.energy > 0.7 && t.valence > 0.5);
            case ContextType.Morning:
                return filtered.filter(t => t.valence > 0.6);
            case ContextType.Rainy:
                return filtered.filter(t => t.energy < 0.5 && t.valence < 0.5);
            case ContextType.Chill:
            default:
                return filtered.filter(t => t.energy < 0.7 && t.valence > 0.4);
        }
    }
};

// 2. Collaborative Filtering (Improved with Hybrid Engine)
export const getCollaborativeRecommendations = async (likedTrackId: string): Promise<Track[]> => {
    try {
        // First, get the track details
        const track = await api.search(likedTrackId).then(results => results[0]);
        
        if (!track) {
            // Fallback to Spotify API
            const recommendations = await SpotifyClient.getRecommendations(
                [likedTrackId],
                [],
                {},
                10
            );
            return recommendations.map(mapSpotifyToTrack);
        }

        // Use hybrid engine for better recommendations
        const recommendations = await HybridRecommendationEngine.getSimilarTracks(track, 15);
        return recommendations;
    } catch (error) {
        console.error('Failed to get collaborative recs:', error);
        return [];
    }
};

// 3. Generate Custom Playlist from Seeds (The "Generator" Feature) - Now Hybrid
export const generatePlaylistFromSeeds = async (
    seeds: Track[],
    settings: { energy?: number, valence?: number, bpm?: number }
): Promise<Track[]> => {
    try {
        // Use hybrid recommendation engine for better results
        const recommendations = await HybridRecommendationEngine.generateHybridRecommendations(
            seeds,
            {
                energy: settings.energy,
                valence: settings.valence,
                bpm: settings.bpm,
                limit: 30,
                useCache: true
            }
        );

        return recommendations;
    } catch (error) {
        console.error('Failed to generate playlist with hybrid engine, falling back to Spotify:', error);
        
        // Fallback to simple Spotify recommendations
        try {
            const seedIds = seeds.map(t => t.id);
            const spotifyRecs = await SpotifyClient.getRecommendations(
                seedIds,
                [],
                {
                    target_energy: settings.energy,
                    target_valence: settings.valence,
                    target_bpm: settings.bpm
                },
                20
            );
            return spotifyRecs.map(mapSpotifyToTrack);
        } catch (fallbackError) {
            console.error('Fallback also failed:', fallbackError);
            throw error;
        }
    }
};

// 4. User Vector Calculation (Restored for Hybrid Personalization)
export const calculateUserVector = (history: Track[]): { energy: number, valence: number } => {
    if (!history || history.length === 0) return { energy: 0.5, valence: 0.5 };

    const sum = history.reduce((acc, track) => ({
        energy: acc.energy + (track.energy || 0.5),
        valence: acc.valence + (track.valence || 0.5)
    }), { energy: 0, valence: 0 });

    return {
        energy: sum.energy / history.length,
        valence: sum.valence / history.length
    };
};

// 5. Rank Tracks by Similarity to User Profile (Restored)
export const rankTracks = (tracks: Track[], userProfile: { energy: number, valence: number }): Track[] => {
    if (!tracks) return [];

    return tracks.map(track => {
        const trackEnergy = track.energy || 0.5;
        const trackValence = track.valence || 0.5;

        // Simple Euclidean distance (inverted for similarity)
        const distance = Math.sqrt(
            Math.pow(trackEnergy - userProfile.energy, 2) +
            Math.pow(trackValence - userProfile.valence, 2)
        );

        return { ...track, _score: 1 - distance }; // Add temporary score
    })
        .sort((a: any, b: any) => b._score - a._score) // Sort descending
        .map(({ _score, ...track }: any) => track); // Remove score
};

// 6. AI-Powered Recommendations (Gemini -> Spotify Direct Search)
export const getAIRecommendations = async (context: ContextType): Promise<Track[]> => {
    console.log(`[Engine] Generating AI playlist for context: ${context}`);
    try {
        // Import AI service dynamically
        const { generateTrackList } = await import('./geminiService');
        
        // 1. Ask AI for a list of songs
        const aiTracks = await generateTrackList(context);

        if (!aiTracks || aiTracks.length === 0) {
            console.warn('[Engine] AI returned empty list, falling back to seeds');
            return getTracksByContext(context);
        }

        console.log(`[Engine] AI suggested ${aiTracks.length} tracks, searching Spotify...`);

        // 2. Search SPOTIFY DIRECTLY for each track (not Zuno catalog)
        const searchPromises = aiTracks.map(async (t) => {
            const query = `track:${t.title} artist:${t.artist}`;
            try {
                // Use Spotify's native search to find ANY track, not just what's in Zuno's DB
                const spotifyResults = await SpotifyClient.search(query, ['track'], 1);

                if (spotifyResults.tracks && spotifyResults.tracks.length > 0) {
                    const spotifyTrack = spotifyResults.tracks[0];
                    // Convert to Zuno Track format
                    return mapSpotifyToTrack(spotifyTrack);
                }
                return null;
            } catch (e) {
                console.warn(`[Engine] Failed to find: ${t.artist} - ${t.title}`);
                return null;
            }
        });

        const results = await Promise.all(searchPromises);

        // Filter out nulls (failed searches)
        const validTracks = results.filter((t): t is Track => t !== null);

        console.log(`[Engine] Found ${validTracks.length}/${aiTracks.length} tracks on Spotify`);

        if (validTracks.length < 3) {
            console.warn('[Engine] Too few valid matches found, merging with seed results');
            const seeds = await getTracksByContext(context);
            return [...validTracks, ...seeds];
        }

        return validTracks;

    } catch (error) {
        console.error('[Engine] AI Recommendation Failed:', error);
        return getTracksByContext(context);
    }
};

export const RecommendationEngine = {
    getTracksByContext,
    getCollaborativeRecommendations,
    generatePlaylistFromSeeds,
    calculateUserVector,
    rankTracks,
    getAIRecommendations
};

