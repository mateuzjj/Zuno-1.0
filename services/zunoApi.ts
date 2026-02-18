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
        // Legacy support only - defaults to 'Chill'
        return 'Chill';
    },

    /**
     * Performs a Smart Search:
     * 1. Searches the Catalog (Real Data)
     * 2. Returns results ranked by user profile
     */
    searchHybrid: async (query: string) => {
        // 1. Catalog Search
        const catalogResults = await api.search(query);

        // Save to history
        ZunoAPI.saveSearch(query);

        // 2. Personalization: Rank by user taste
        const userProfile = await ZunoAPI.getUserProfile();
        const safeRank = (tracks: Track[], profile: any) => {
            return (typeof rankTracks === 'function') ? rankTracks(tracks, profile) : tracks;
        };

        const rankedCatalog = safeRank(catalogResults, userProfile);

        return {
            context: 'Chill' as ContextType,
            intent: 'general',
            analysis: { context: 'Chill', intent: 'general', similarEntities: [], vibeParams: {} },
            catalogResults: rankedCatalog,
            similarResults: [],
            aiResults: []
        };
    },

    getRecommendations: async (context: ContextType): Promise<Track[]> => {
        // Deprecated: Just returns personalized tracks
        const history = ZunoAPI.getValidHistory();
        if (history.length > 0) {
            return await getCollaborativeRecommendations(history[0].id);
        }
        return await api.search('trending');
    },

    /**
     * Generates PERSONALIZED Home Feed Sections.
     * Uses Tidal's /artist/similar/ endpoint for real discovery.
     */
    getNextFeedSection: async (offset: number, excludeIds: string[] = []) => {
        // Helper to mix and clean tracks
        const processTracks = async (rawTracks: Track[]) => {
            const unique = rawTracks.filter(t => !excludeIds.includes(t.id));
            const profile = await ZunoAPI.getUserProfile();
            const ranked = (typeof rankTracks === 'function') ? rankTracks(unique, profile) : unique;
            return ranked.length > 0 ? ranked : unique;
        };

        let section: { title: string, subtitle: string, tracks: Track[] };

        try {
            // STRATEGY 1: "Artistas Similares" (Similar Artist Discovery via Tidal API)
            // Uses /artist/similar/ to find real similar artists based on listening history
            if (offset % 3 === 0) {
                const history = ZunoAPI.getValidHistory();
                if (history.length > 0) {
                    // Collect unique artist IDs from history
                    const artistIds = [...new Set(
                        history
                            .filter(t => t.artistId)
                            .map(t => t.artistId as string)
                    )].slice(0, 5);

                    if (artistIds.length > 0) {
                        // Use real Tidal /artist/similar/ endpoint
                        const similarTracks = await api.getTracksFromSimilarArtists(artistIds, excludeIds, 20);

                        if (similarTracks.length >= 5) {
                            const processed = await processTracks(similarTracks);
                            // Get the artist name for the section title
                            const topArtist = history[0].artist;
                            return {
                                title: `Descobertas Similares`,
                                subtitle: `Baseado em ${topArtist} e outros que você ouve`,
                                tracks: processed.slice(0, 15)
                            };
                        }
                    }

                    // Fallback: text-based artist mix if no artistIds saved yet
                    const artistCounts: Record<string, number> = {};
                    history.forEach(t => {
                        artistCounts[t.artist] = (artistCounts[t.artist] || 0) + 1;
                    });
                    const topArtists = Object.entries(artistCounts)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(e => e[0]);

                    if (topArtists.length > 0) {
                        const selectedArtist = topArtists[Math.floor(Math.random() * topArtists.length)];
                        const mainTracks = await api.search(selectedArtist);
                        const seedTrack = history.find(t => t.artist === selectedArtist) || history[0];
                        const similarTracks = await getCollaborativeRecommendations(seedTrack.id);
                        const combined = [...mainTracks.slice(0, 5), ...similarTracks];
                        const processed = await processTracks(combined);
                        return {
                            title: `Mix de ${selectedArtist}`,
                            subtitle: `Com ${selectedArtist} e similares`,
                            tracks: processed.slice(0, 15)
                        };
                    }
                }
            }

            // STRATEGY 2: "Porque você ouviu X" (Based on last played track's similar artists)
            if (offset % 3 === 1) {
                const history = ZunoAPI.getValidHistory();
                if (history.length > 0) {
                    const lastTrack = history[0];

                    // Try real similar artists first if we have an artistId
                    if (lastTrack.artistId) {
                        try {
                            const similarArtists = await api.getSimilarArtists(lastTrack.artistId);
                            if (similarArtists.length > 0) {
                                // Pick 2 random similar artists and search their tracks
                                const picks = similarArtists
                                    .sort(() => Math.random() - 0.5)
                                    .slice(0, 2);

                                const trackArrays = await Promise.all(
                                    picks.map(a => api.search(a.name, 8).catch(() => []))
                                );
                                const combined = trackArrays.flat().filter(t => !excludeIds.includes(t.id));
                                const processed = await processTracks(combined);

                                if (processed.length >= 5) {
                                    const similarNames = picks.map(a => a.name).join(', ');
                                    return {
                                        title: `Porque você ouviu ${lastTrack.artist}`,
                                        subtitle: `Com ${similarNames} e mais`,
                                        tracks: processed.slice(0, 15)
                                    };
                                }
                            }
                        } catch (e) {
                            console.warn('[Strategy 2] Similar artists failed, using fallback:', e);
                        }
                    }

                    // Fallback to collaborative recommendations
                    const recs = await getCollaborativeRecommendations(lastTrack.id);
                    const processed = await processTracks(recs);
                    return {
                        title: `Porque você ouviu ${lastTrack.artist}`,
                        subtitle: `${lastTrack.title} e similares`,
                        tracks: processed.slice(0, 15)
                    };
                }
            }

            // STRATEGY 3: "Descobertas da Semana" (Daily Discovery based on taste profile)
            if (offset % 3 === 2) {
                const history = ZunoAPI.getValidHistory();
                const profile = await ZunoAPI.getUserProfile();

                // Try similar artists from a random history track
                if (history.length > 0) {
                    const tracksWithIds = history.filter(t => t.artistId);
                    if (tracksWithIds.length > 0) {
                        const randomTrack = tracksWithIds[Math.floor(Math.random() * tracksWithIds.length)];
                        try {
                            const similar = await api.getSimilarArtists(randomTrack.artistId!);
                            if (similar.length > 0) {
                                const pick = similar[Math.floor(Math.random() * similar.length)];
                                const tracks = await api.search(pick.name, 15);
                                const processed = await processTracks(tracks);
                                if (processed.length >= 5) {
                                    return {
                                        title: 'Descobertas da Semana',
                                        subtitle: `Artistas como ${randomTrack.artist}`,
                                        tracks: processed.slice(0, 15)
                                    };
                                }
                            }
                        } catch (e) {
                            console.warn('[Strategy 3] Similar artist discovery failed:', e);
                        }
                    }
                }

                // Fallback: keyword-based discovery
                let query = 'hits';
                if (profile.energy > 0.7) query = 'club hits';
                else if (profile.energy < 0.4) query = 'chill relaxing';
                else if (profile.valence > 0.7) query = 'happy pop';
                else query = 'trending music';

                const results = await api.search(query);
                const processed = await processTracks(results);
                return {
                    title: 'Descobertas da Semana',
                    subtitle: 'Sugestões novas para seu perfil',
                    tracks: processed.slice(0, 15)
                };
            }

            // FALLBACK for new users (no history)
            const queries = [
                'Top 50 Global', 'Viral Hits', 'New Music Friday',
                'Rock Classics', 'Jazz Vibes', 'Lo-Fi Beats',
                'Electronic Essentials', 'Hip Hop Heavyweights',
                'Indie Discoveries', 'Latin Hits', 'K-Pop Risers',
                'Piano Ballads', 'Movie Soundtracks', 'Acoustic Covers'
            ];
            const q = queries[Math.floor(Math.random() * queries.length)];
            const res = await api.search(q);
            const seenArtists = new Set<string>();
            const diverseTracks = res.filter(t => {
                if (seenArtists.has(t.artist)) return false;
                seenArtists.add(t.artist);
                return true;
            });

            return {
                title: q,
                subtitle: 'Explorar Gêneros',
                tracks: diverseTracks.length > 5 ? diverseTracks.slice(0, 15) : res.slice(0, 15)
            };

        } catch (error) {
            console.error('Feed generation error:', error);
            const fallback = await api.search('mix');
            return {
                title: 'Explorar',
                subtitle: 'Música Variada',
                tracks: fallback.slice(0, 15)
            };
        }
    },

    getSimilarTracks: async (trackId: string): Promise<Track[]> => {
        return await getCollaborativeRecommendations(trackId);
    },

    getTrackInsight: async (track: Track, context: ContextType): Promise<string> => {
        return "Tocando agora";
    },

    /**
     * Records a play in history.
     * Now also saves artistId for /artist/similar/ lookups.
     */
    recordPlay: (track: Track, secondsPlayed: number) => {
        if (secondsPlayed < 10) return;

        const history = JSON.parse(localStorage.getItem('zuno_history') || '[]');
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

    clearSearchHistory: (): void => {
        localStorage.setItem('zuno_search_history', '[]');
    },

    getValidHistory: (): Track[] => {
        return JSON.parse(localStorage.getItem('zuno_history') || '[]');
    },

    getUserProfile: async () => {
        const history = JSON.parse(localStorage.getItem('zuno_history') || '[]');
        if (typeof calculateUserVector === 'function') {
            return calculateUserVector(history);
        }
        return { energy: 0.5, valence: 0.5 };
    },

    // New Search Passthroughs
    searchArtists: async (query: string) => {
        const result = await api.searchArtists(query);
        return Array.isArray(result) ? result : result.items;
    },
    getArtist: (id: string) => api.getArtist(id),
    getAlbum: (id: string) => api.getAlbum(id),
    getSimilarArtists: (artistId: string) => api.getSimilarArtists(artistId),
    getSimilarAlbums: (albumId: string) => api.getSimilarAlbums(albumId),
    getMix: (mixId: string) => api.getMix(mixId)
};

