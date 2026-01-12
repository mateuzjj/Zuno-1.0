import { Track } from '../types';
import { getDB } from './db';
import { SpotifyClient } from './spotifyClient';
import { ZunoAPI } from './zunoApi';

/**
 * Hybrid Music Recommendation System
 * Combines Content-Based Filtering and Collaborative Filtering
 * Based on: https://github.com/indranil143/Hybrid-Music-Recommendation-System
 */

// Cache duration for recommendations (1 hour)
const CACHE_DURATION_MS = 60 * 60 * 1000;

/**
 * Get audio features vector for a track
 * Normalizes all features to 0-1 range for similarity calculation
 */
function getTrackVector(track: Track): number[] {
    return [
        track.energy || 0.5,
        track.valence || 0.5,
        track.danceability || 0.5,
        track.acousticness || 0.5,
        track.instrumentalness || 0.5,
        track.liveness || 0.5,
        track.speechiness || 0.5,
        (track.bpm || 120) / 200, // Normalize BPM (0-200 -> 0-1)
        (track.popularity || 50) / 100, // Normalize popularity (0-100 -> 0-1)
        track.mode || 0.5, // Already 0-1
    ];
}

/**
 * Calculate cosine similarity between two vectors
 * Returns value between 0 and 1 (1 = identical, 0 = completely different)
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Content-Based Filtering
 * Recommends tracks based on audio feature similarity
 */
export async function getContentBasedRecommendations(
    seedTracks: Track[],
    candidateTracks: Track[],
    limit: number = 20
): Promise<Track[]> {
    if (seedTracks.length === 0 || candidateTracks.length === 0) {
        return [];
    }

    // Calculate average vector of seed tracks
    const seedVectors = seedTracks.map(getTrackVector);
    const avgSeedVector = seedVectors[0].map((_, i) => {
        const sum = seedVectors.reduce((acc, vec) => acc + vec[i], 0);
        return sum / seedVectors.length;
    });

    // Calculate similarity scores for all candidate tracks
    const scoredTracks = candidateTracks
        .filter(track => !seedTracks.some(s => s.id === track.id)) // Exclude seeds
        .map(track => {
            const trackVector = getTrackVector(track);
            const similarity = cosineSimilarity(avgSeedVector, trackVector);
            return { track, similarity };
        })
        .sort((a, b) => b.similarity - a.similarity) // Sort by similarity descending
        .slice(0, limit)
        .map(item => item.track);

    return scoredTracks;
}

/**
 * Collaborative Filtering
 * Recommends tracks based on user's listening history and similar users
 */
export async function getCollaborativeRecommendations(
    userHistory: Track[],
    candidateTracks: Track[],
    limit: number = 20
): Promise<Track[]> {
    if (userHistory.length === 0 || candidateTracks.length === 0) {
        return [];
    }

    // Calculate user profile from history
    const userProfile = calculateUserProfile(userHistory);

    // Score tracks based on how well they match user's profile
    const scoredTracks = candidateTracks
        .filter(track => !userHistory.some(h => h.id === track.id)) // Exclude already played
        .map(track => {
            const trackVector = getTrackVector(track);
            const similarity = cosineSimilarity(userProfile, trackVector);
            
            // Boost tracks from artists user likes
            const artistBoost = userHistory.some(h => h.artist === track.artist) ? 0.1 : 0;
            
            return { track, score: similarity + artistBoost };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(item => item.track);

    return scoredTracks;
}

/**
 * Calculate user profile vector from listening history
 */
function calculateUserProfile(history: Track[]): number[] {
    if (history.length === 0) {
        // Default neutral profile
        return [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
    }

    const vectors = history.map(getTrackVector);
    const profile = vectors[0].map((_, i) => {
        const sum = vectors.reduce((acc, vec) => acc + vec[i], 0);
        return sum / vectors.length;
    });

    return profile;
}

/**
 * Hybrid Recommendation System
 * Combines Content-Based and Collaborative Filtering with weighted scores
 */
export async function getHybridRecommendations(
    seedTracks: Track[],
    candidateTracks: Track[],
    userHistory: Track[],
    options: {
        contentWeight?: number; // Weight for content-based (0-1)
        collaborativeWeight?: number; // Weight for collaborative (0-1)
        limit?: number;
    } = {}
): Promise<Track[]> {
    const {
        contentWeight = 0.6,
        collaborativeWeight = 0.4,
        limit = 20
    } = options;

    // Ensure weights sum to 1
    const totalWeight = contentWeight + collaborativeWeight;
    const normalizedContentWeight = contentWeight / totalWeight;
    const normalizedCollaborativeWeight = collaborativeWeight / totalWeight;

    // Get recommendations from both methods
    const [contentBased, collaborative] = await Promise.all([
        getContentBasedRecommendations(seedTracks, candidateTracks, limit * 2),
        getCollaborativeRecommendations(userHistory, candidateTracks, limit * 2)
    ]);

    // Combine and score tracks
    const trackScores = new Map<string, { track: Track; score: number; sources: string[] }>();

    // Add content-based scores
    contentBased.forEach((track, index) => {
        const score = (1 - index / contentBased.length) * normalizedContentWeight;
        const existing = trackScores.get(track.id);
        if (existing) {
            existing.score += score;
            existing.sources.push('content');
        } else {
            trackScores.set(track.id, { track, score, sources: ['content'] });
        }
    });

    // Add collaborative scores
    collaborative.forEach((track, index) => {
        const score = (1 - index / collaborative.length) * normalizedCollaborativeWeight;
        const existing = trackScores.get(track.id);
        if (existing) {
            existing.score += score;
            existing.sources.push('collaborative');
        } else {
            trackScores.set(track.id, { track, score, sources: ['collaborative'] });
        }
    });

    // Sort by combined score and return top results
    const finalRecommendations = Array.from(trackScores.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(item => item.track);

    return finalRecommendations;
}

/**
 * Get recommendations with caching
 */
export async function getCachedRecommendations(
    cacheKey: string,
    generator: () => Promise<Track[]>
): Promise<Track[]> {
    try {
        const db = await getDB();
        const cached = await db.get('recommendationsCache', cacheKey);

        if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION_MS) {
            console.log(`[HybridRec] Returning cached recommendations for: ${cacheKey}`);
            return cached.recommendations;
        }

        // Generate new recommendations
        const recommendations = await generator();

        // Cache the results
        await db.put('recommendationsCache', {
            key: cacheKey,
            recommendations,
            timestamp: Date.now()
        });

        return recommendations;
    } catch (error) {
        console.error('[HybridRec] Cache error, generating fresh:', error);
        return await generator();
    }
}

/**
 * Main hybrid recommendation function
 * Combines Spotify API recommendations with content-based and collaborative filtering
 */
export async function generateHybridRecommendations(
    seedTracks: Track[],
    settings?: {
        energy?: number;
        valence?: number;
        bpm?: number;
        limit?: number;
        useCache?: boolean;
    }
): Promise<Track[]> {
    const limit = settings?.limit || 30;
    const useCache = settings?.useCache !== false;

    // Get user history for collaborative filtering
    const userHistory = ZunoAPI.getValidHistory();

    // Create cache key
    const cacheKey = `hybrid_${seedTracks.map(t => t.id).join(',')}_${JSON.stringify(settings)}`;

    const generator = async (): Promise<Track[]> => {
        try {
            // Step 1: Get initial recommendations from Spotify API
            const seedIds = seedTracks.map(t => t.id);
            const spotifyRecommendations = await SpotifyClient.getRecommendations(
                seedIds,
                [],
                {
                    target_energy: settings?.energy,
                    target_valence: settings?.valence,
                    target_bpm: settings?.bpm
                },
                limit * 2 // Get more to filter
            );

            // Map Spotify tracks to internal Track format
            const candidateTracks: Track[] = spotifyRecommendations.map(st => ({
                id: st.id,
                title: st.name,
                artist: st.artists[0]?.name || 'Unknown',
                album: st.album.name,
                coverUrl: st.album.images[0]?.url || '',
                duration: st.duration_ms / 1000,
                genre: [],
                bpm: 0, // Will be enriched if audio features available
                energy: 0.5,
                valence: 0.5,
                popularity: st.popularity || 0
            }));

            // Step 2: Apply hybrid filtering
            const hybridResults = await getHybridRecommendations(
                seedTracks,
                candidateTracks,
                userHistory,
                {
                    contentWeight: 0.6,
                    collaborativeWeight: 0.4,
                    limit
                }
            );

            return hybridResults;
        } catch (error) {
            console.error('[HybridRec] Error generating recommendations:', error);
            // Fallback to simple content-based if Spotify fails
            const allTracks = await import('./api').then(m => m.api.search(seedTracks[0]?.title || ''));
            return getContentBasedRecommendations(seedTracks, allTracks, limit);
        }
    };

    if (useCache) {
        return await getCachedRecommendations(cacheKey, generator);
    }

    return await generator();
}

/**
 * Get personalized recommendations based on user's listening history
 */
export async function getPersonalizedRecommendations(limit: number = 20): Promise<Track[]> {
    const userHistory = ZunoAPI.getValidHistory();

    if (userHistory.length === 0) {
        // No history, return popular tracks
        const popular = await import('./api').then(m => m.api.search('popular hits'));
        return popular.slice(0, limit);
    }

    // Use recent history as seeds
    const seedTracks = userHistory.slice(0, 5);

    return await generateHybridRecommendations(seedTracks, {
        limit,
        useCache: true
    });
}

/**
 * Get similar tracks to a given track (hybrid approach)
 */
export async function getSimilarTracks(track: Track, limit: number = 20): Promise<Track[]> {
    return await generateHybridRecommendations([track], {
        limit,
        useCache: true
    });
}

export const HybridRecommendationEngine = {
    getContentBasedRecommendations,
    getCollaborativeRecommendations,
    getHybridRecommendations,
    generateHybridRecommendations,
    getPersonalizedRecommendations,
    getSimilarTracks,
    cosineSimilarity,
    getTrackVector
};
