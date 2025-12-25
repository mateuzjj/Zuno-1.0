import * as Engine from './recommendationEngine';
import * as AI from './geminiService';
import { api } from './api';
import { Track } from '../types';

type ContextType = 'Morning' | 'Focus' | 'Workout' | 'Party' | 'Chill' | 'Rainy';

export const ZunoAPI = {
    detectContext: async (input: string): Promise<ContextType> => {
        return await AI.identifyContextFromText(input);
    },

    /**
     * Performs a Hybrid Search with Semantic Expansion:
     * 1. Searches the Catalog (Real Data)
     * 2. Analyzes Intent & Similar Entities (AI)
     * 3. Fetches tracks for Similar Entities (Expansion)
     * 4. Returns combined results
     */
    searchHybrid: async (query: string) => {
        // 1. Parallel: Catalog Search + Deep AI Analysis
        const [catalogResults, analysis] = await Promise.all([
            api.search(query),
            AI.analyzeRequest(query)
        ]);

        // Save to history
        ZunoAPI.saveSearch(query);

        const { context, similarEntities, intent } = analysis;

        // 2. Expansion: If AI suggests similar artists, fetch them too
        let similarResults: Track[] = [];
        if (similarEntities.length > 0) {
            const expansionPromises = similarEntities.slice(0, 3).map(entity => api.search(entity));
            const expansionResults = await Promise.all(expansionPromises);
            // Flatten and deduplicate
            similarResults = expansionResults.flat().filter(t => !catalogResults.find(c => c.id === t.id));
        }

        // 2b. Artist Refine: If catalog is sparse and AI detected an artist, refine the search
        if (catalogResults.length < 5 && intent === 'artist' && analysis.primaryEntity) {
            const artistRefine = await api.search(analysis.primaryEntity);
            // Add non-duplicates to catalog
            const newTracks = artistRefine.filter(t => !catalogResults.find(c => c.id === t.id));
            catalogResults.push(...newTracks);
        }

        // 3. Personalization: Rank ALL results by user taste
        // We do this LATE to ensure we rank the final candidates
        const userProfile = await ZunoAPI.getUserProfile();
        const rankedCatalog = Engine.rankTracks(catalogResults, userProfile);
        const rankedSimilar = Engine.rankTracks(similarResults, userProfile);

        // 4. Fallback/Context: Get specific AI recommendations for this mood
        const aiResults = Engine.rankTracks(Engine.getTracksByContext(context), userProfile);

        return {
            context,
            intent,
            analysis, // return full analysis for UI messages
            catalogResults: rankedCatalog.length > 0 ? rankedCatalog : catalogResults,
            similarResults: rankedSimilar.length > 0 ? rankedSimilar : similarResults,
            aiResults
        };
    },

    getRecommendations: (context: ContextType): Track[] => {
        return Engine.getTracksByContext(context);
    },

    /**
     * Generates the next section for the Home Feed.
     * Uses a rotation of strategies to keep the feed fresh.
     */
    getNextFeedSection: async (offset: number, excludeIds: string[] = []) => {
        const strategies = ['mood', 'genre', 'artist_mix', 'discovery', 'recent_search', 'decade'];
        const strategy = strategies[offset % strategies.length];

        await new Promise(r => setTimeout(r, 600)); // Simulate AI "thinking"

        // Helper to filter duplicates and RANK by user taste
        const processTracks = async (rawTracks: Track[]) => {
            const unique = rawTracks.filter(t => !excludeIds.includes(t.id));
            const profile = await ZunoAPI.getUserProfile();
            return Engine.rankTracks(unique, profile);
        };

        if (strategy === 'recent_search') {
            const searches = ZunoAPI.getRecentSearches();
            if (searches.length > 0) {
                const query = searches[Math.floor(Math.random() * searches.length)];
                try {
                    let tracks = await api.search(query);
                    tracks = await processTracks(tracks);
                    return {
                        title: `Based on your search for "${query}"`,
                        subtitle: 'Picks inspired by your curiosity',
                        tracks: tracks.slice(0, 10)
                    };
                } catch (e) {
                    // Fallthrough
                }
            }
        }

        if (strategy === 'mood') {
            const moodMap: Record<string, string[]> = {
                'Focus': ['Focus Flow', 'Deep Focus', 'Study LoFi', 'Ambient Work'],
                'Party': ['Party Hits', 'Dance Floor', 'Club Mix', 'Pop Party'],
                'Workout': ['Gym Motivation', 'Workout Energy', 'Running Hits'],
                'Chill': ['Chill Vibes', 'Relaxing Acoustic', 'Sunday Morning'],
                'Rainy': ['Rainy Day Jazz', 'Sad Songs', 'Melancholy']
            };

            const moods = Object.keys(moodMap);
            const mood = moods[Math.floor(Math.random() * moods.length)];
            const query = moodMap[mood][Math.floor(Math.random() * moodMap[mood].length)];

            try {
                // Fetch REAL data from catalog
                const tracks = await api.search(query);
                // Fallback to mock if API returns empty (unlikely with generic terms)
                const finalTracks = tracks.length > 0 ? tracks : Engine.getTracksByContext(mood as ContextType);

                return {
                    title: `Vibe Check: ${mood}`,
                    subtitle: `Curated based on '${query}'`,
                    tracks: finalTracks.slice(0, 10)
                };
            } catch (e) {
                return {
                    title: `Vibe Check: ${mood}`,
                    subtitle: 'AI Fallback Selection',
                    tracks: Engine.getTracksByContext(mood as ContextType)
                };
            }
        }

        if (strategy === 'artist_mix') {
            const artists = ['The Weeknd', 'Daft Punk', 'Pink Floyd', 'Tame Impala', 'Drake', 'Taylor Swift', 'Coldplay', 'Arctic Monkeys'];
            // Use offset to pick different artists each time, or random
            const artist = artists[(offset + Math.floor(Math.random() * 5)) % artists.length];
            const results = await api.search(artist);
            return {
                title: `${artist} & Friends`,
                subtitle: 'Because you tuned in recently',
                tracks: results.slice(0, 10)
            };
        }

        if (strategy === 'genre') {
            const genres = ['Lo-Fi', 'Rock', 'Electronic', 'Jazz', 'Hip Hop', 'Classical', 'Indie'];
            const genre = genres[Math.floor(Math.random() * genres.length)];

            const tracks = await api.search(genre);
            return {
                title: `Deep Dive: ${genre}`,
                subtitle: 'Trending in your area',
                tracks: tracks.slice(0, 10)
            };
        }

        if (strategy === 'decade') {
            const decades = ['80s Hits', '90s Hits', '2000s Throwback', '2010s Hits', '70s Classic Rock'];
            const decade = decades[Math.floor(Math.random() * decades.length)];
            let tracks = await api.search(decade);
            tracks = await processTracks(tracks);

            return {
                title: `Time Machine: ${decade}`,
                subtitle: 'Nostalgia Trip',
                tracks: tracks.slice(0, 10)
            };
        }

        // Discovery / Random
        const seeds = ['Top 50', 'Viral Hits', 'New Releases', 'Hidden Gems'];
        const seed = seeds[Math.floor(Math.random() * seeds.length)];
        let tracks = await api.search(seed);
        tracks = await processTracks(tracks);

        return {
            title: `Discover: ${seed}`,
            subtitle: 'Fresh picks for you',
            tracks: tracks.slice(0, 10)
        };
    },

    getSimilarTracks: (trackId: string): Track[] => {
        return Engine.getCollaborativeRecommendations(trackId);
    },

    getTrackInsight: async (track: Track, context: ContextType): Promise<string> => {
        return await AI.generateRecommendationExplanation(track, context, 50);
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
        return Engine.calculateUserVector(history);
    },

    // New Search Passthroughs
    searchArtists: (query: string) => api.searchArtists(query),
    getArtist: (id: string) => api.getArtist(id),
    getAlbum: (id: string) => api.getAlbum(id)
};
