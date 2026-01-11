import {
    getTracksByContext,
    getCollaborativeRecommendations,
    calculateUserVector,
    rankTracks
} from './recommendationEngine';
import { api } from './api';
import { Track } from '../types';

type ContextType = 'Morning' | 'Focus' | 'Workout' | 'Party' | 'Chill' | 'Rainy';

// Simple local context detection (no AI needed)
const detectContextFromKeywords = (input: string): ContextType => {
    const lower = input.toLowerCase();

    if (lower.match(/treino|gym|workout|exercise|run|energia/)) return 'Workout';
    if (lower.match(/foco|study|work|concentrate|deep/)) return 'Focus';
    if (lower.match(/festa|party|dance|badalar|club/)) return 'Party';
    if (lower.match(/manhã|morning|café|wake/)) return 'Morning';
    if (lower.match(/chuva|rain|sad|melancholy/)) return 'Rainy';

    return 'Chill'; // Default
};

export const ZunoAPI = {
    detectContext: async (input: string): Promise<ContextType> => {
        return detectContextFromKeywords(input);
    },

    /**
     * Performs a Smart Search with Spotify Recommendations:
     * 1. Searches the Catalog (Real Data)
     * 2. Detects Context from Keywords
     * 3. Gets Spotify Recommendations for Similar Tracks
     */
    searchHybrid: async (query: string) => {
        // 1. Catalog Search
        const catalogResults = await api.search(query);

        // Save to history
        ZunoAPI.saveSearch(query);

        // 2. Detect context from query
        const context = detectContextFromKeywords(query);

        // 3. Get Spotify-based recommendations (not AI)
        const spotifyResults = catalogResults.length > 0
            ? await getTracksByContext(context)
            : [];

        // 4. Personalization: Rank by user taste
        const userProfile = await ZunoAPI.getUserProfile();
        const safeRank = (tracks: Track[], profile: any) => {
            return (typeof rankTracks === 'function') ? rankTracks(tracks, profile) : tracks;
        };

        const rankedCatalog = safeRank(catalogResults, userProfile);
        const rankedSpotify = safeRank(spotifyResults, userProfile);

        return {
            context,
            intent: 'general',
            analysis: { context, intent: 'general', similarEntities: [], vibeParams: {} },
            catalogResults: rankedCatalog,
            similarResults: [],
            aiResults: rankedSpotify // Actually Spotify results, not AI
        };
    },

    getRecommendations: async (context: ContextType): Promise<Track[]> => {
        return await getTracksByContext(context);
    },

    /**
     * Generates the next section for the Home Feed.
     * Smart system with caching and duplicate prevention.
     */
    getNextFeedSection: async (offset: number, excludeIds: string[] = []) => {
        // NO CACHE - Always fresh recommendations

        // TRUE random strategy selection
        const allStrategies = [
            'spotify_recommendations',
            'genre_deep_dive',
            'artist_radio',
            'decade_throwback',
            'mood_playlist',
            'trending_hits'
        ];

        // Pure random selection (not based on offset)
        const selectedStrategy = allStrategies[Math.floor(Math.random() * allStrategies.length)];

        // Helper to filter duplicates, rank, and SHUFFLE
        const processTracks = async (rawTracks: Track[]) => {
            const unique = rawTracks.filter(t => !excludeIds.includes(t.id));
            const profile = await ZunoAPI.getUserProfile();
            const ranked = (typeof rankTracks === 'function') ? rankTracks(unique, profile) : unique;
            // SHUFFLE for variety
            return ranked.sort(() => Math.random() - 0.5);
        };

        let section: { title: string, subtitle: string, tracks: Track[] };

        try {
            if (selectedStrategy === 'spotify_recommendations') {
                const contexts: ContextType[] = ['Workout', 'Focus', 'Party', 'Chill', 'Morning', 'Rainy'];
                const context = contexts[Math.floor(Math.random() * contexts.length)];
                let tracks = await getTracksByContext(context);
                tracks = await processTracks(tracks);

                section = {
                    title: `${context} Vibes`,
                    subtitle: 'Spotify Recommendations',
                    tracks: tracks.slice(0, 15)
                };
            } else if (selectedStrategy === 'genre_deep_dive') {
                const genres = [
                    'Electronic', 'Rock', 'Hip Hop', 'Jazz', 'Indie', 'Classical',
                    'R&B', 'Pop', 'Metal', 'Country', 'Reggae', 'Blues', 'Soul', 'Funk'
                ];
                const genre = genres[Math.floor(Math.random() * genres.length)];
                let tracks = await api.search(genre);
                tracks = await processTracks(tracks);

                section = {
                    title: `${genre} Mix`,
                    subtitle: 'Explore the sound',
                    tracks: tracks.slice(0, 15)
                };
            } else if (selectedStrategy === 'artist_radio') {
                const artists = [
                    'The Weeknd', 'Daft Punk', 'Tame Impala', 'Arctic Monkeys',
                    'Billie Eilish', 'Travis Scott', 'Frank Ocean', 'Tyler The Creator',
                    'Mac Miller', 'Kendrick Lamar', 'SZA', 'Post Malone'
                ];
                const artist = artists[Math.floor(Math.random() * artists.length)];
                let tracks = await api.search(artist);
                tracks = await processTracks(tracks);

                section = {
                    title: `${artist} Radio`,
                    subtitle: 'And similar artists',
                    tracks: tracks.slice(0, 15)
                };
            } else if (selectedStrategy === 'decade_throwback') {
                const decades = [
                    '60s Rock', '70s Disco', '80s Pop', '90s Hip Hop',
                    '2000s Indie', '2010s EDM', '80s Synthwave', '90s Grunge'
                ];
                const decade = decades[Math.floor(Math.random() * decades.length)];
                let tracks = await api.search(decade);
                tracks = await processTracks(tracks);

                section = {
                    title: `${decade} Throwback`,
                    subtitle: 'Classic hits',
                    tracks: tracks.slice(0, 15)
                };
            } else if (selectedStrategy === 'mood_playlist') {
                const moods = ['Happy', 'Chill', 'Sad', 'Energetic', 'Romantic', 'Angry'];
                const mood = moods[Math.floor(Math.random() * moods.length)];
                let tracks = await api.search(`${mood} Music`);
                tracks = await processTracks(tracks);

                section = {
                    title: `${mood} Mood`,
                    subtitle: 'Match your vibe',
                    tracks: tracks.slice(0, 15)
                };
            } else {
                // trending_hits
                const trending = ['Viral Hits', 'Top 50', 'New Releases', 'Hot Right Now'];
                const query = trending[Math.floor(Math.random() * trending.length)];
                let tracks = await api.search(query);
                tracks = await processTracks(tracks);

                section = {
                    title: query,
                    subtitle: 'Trending now',
                    tracks: tracks.slice(0, 15)
                };
            }

            // NO CACHE - always fresh
            return section;

        } catch (error) {
            console.error('Feed generation error:', error);
            // Minimal fallback
            return {
                title: 'Discover',
                subtitle: 'Explore music',
                tracks: []
            };
        }
    },

    getSimilarTracks: async (trackId: string): Promise<Track[]> => {
        return await getCollaborativeRecommendations(trackId);
    },

    getTrackInsight: async (track: Track, context: ContextType): Promise<string> => {
        // Simple local explanation (no AI needed)
        const explanations: Record<ContextType, string[]> = {
            Workout: ['Perfect energy boost!', 'Great for your workout!', 'High energy vibes!'],
            Focus: ['Helps you concentrate', 'Perfect for deep work', 'Minimal distractions'],
            Party: ['Dance floor ready!', 'Party anthem!', 'Get the party started!'],
            Chill: ['Relaxing vibes', 'Perfect to unwind', 'Chill mode activated'],
            Morning: ['Great way to start the day', 'Morning energy', 'Rise and shine!'],
            Rainy: ['Cozy rainy day vibes', 'Melancholic mood', 'Perfect for reflection']
        };

        const options = explanations[context] || ['Great track!'];
        return options[Math.floor(Math.random() * options.length)];
    },

    /**
     * Records a play in history.
     * Only counts if played for > 120 seconds (as requested).
     */
    recordPlay: (track: Track, secondsPlayed: number) => {
        if (secondsPlayed < 120) return; // Ignore skips

        const history = JSON.parse(localStorage.getItem('zuno_history') || '[]');
        // Add to front, limit to 50
        const newHistory = [track, ...history.filter((t: Track) => t.id !== track.id)].slice(0, 50);
        localStorage.setItem('zuno_history', JSON.stringify(newHistory));
    },

    saveSearch: (query: string) => {
        if (!query || query.length < 3) return;
        const history = JSON.parse(localStorage.getItem('zuno_search_history') || '[]');
        const newHistory = [query, ...history.filter((q: string) => q.toLowerCase() !== query.toLowerCase())].slice(0, 20);
        localStorage.setItem('zuno_search_history', JSON.stringify(newHistory));
    },

    getRecentSearches: (): string[] => {
        return JSON.parse(localStorage.getItem('zuno_search_history') || '[]');
    },

    /**
     * Gets valid history for recommendations.
     * Filters are already applied at write-time (recordPlay).
     */
    getValidHistory: (): Track[] => {
        return JSON.parse(localStorage.getItem('zuno_history') || '[]');
    },

    getUserProfile: async () => {
        const history = JSON.parse(localStorage.getItem('zuno_history') || '[]');
        // Safety check
        if (typeof calculateUserVector === 'function') {
            return calculateUserVector(history);
        }
        console.warn('RecommendationEngine.calculateUserVector missing, utilizing default profile');
        return { energy: 0.5, valence: 0.5 };
    },

    // New Search Passthroughs
    searchArtists: (query: string) => api.searchArtists(query),
    getArtist: (id: string) => api.getArtist(id),
    getAlbum: (id: string) => api.getAlbum(id)
};
