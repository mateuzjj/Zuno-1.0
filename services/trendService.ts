import { api } from './api';
import { Track } from '../types';
import { HYPE_ARTISTS } from '../constants/artists';

export const TrendService = {
    /**
     * Gets trending tracks using simple search queries
     */
    getGlobalTrends: async (genre: string): Promise<{ artist: string, title: string }[]> => {
        // Simple search for trending tracks in the genre
        const results = await api.search(`${genre} trending hits`);
        return results.slice(0, 20).map(track => ({
            artist: track.artist,
            title: track.title
        }));
    },

    /**
     * Filters tracks to keep only those by "Hype" artists,
     * replicating the logic from generate.py
     */
    filterByHypeList: (tracks: { artist: string, title: string }[]): { artist: string, title: string }[] => {
        return tracks.filter(t => {
            // Check if any hype artist name appears in the track's artist string
            // (Handles "Drake feat. 21 Savage" matching "Drake" or "21 Savage")
            return HYPE_ARTISTS.some(hypeArtist =>
                t.artist.toLowerCase().includes(hypeArtist.toLowerCase())
            );
        });
    },

    /**
     * Main "Hunt" method
     */
    huntTrends: async (genre: string, useHypeFilter: boolean): Promise<Track[]> => {
        console.log(`[TrendHunter] Hunting for ${genre} (HypeFilter: ${useHypeFilter})...`);

        // 1. Get Raw Trends (Simulating Scraping)
        let candidates = await TrendService.getGlobalTrends(genre);

        // 2. Apply Filter (The core logic of the external repo)
        if (useHypeFilter) {
            candidates = TrendService.filterByHypeList(candidates);
            if (candidates.length === 0) {
                console.warn('[TrendHunter] Hype filter too strict, returning top 3 unfiltered as fallback');
                candidates = await TrendService.getGlobalTrends(genre); // Refetch or just take slice
                candidates = candidates.slice(0, 3);
            }
        }

        // 3. Resolve to Real Spotify Tracks via Zuno API
        // This replaces the "findSong" method in the python script
        const searchPromises = candidates.map(async (c) => {
            try {
                const results = await api.search(`${c.artist} ${c.title}`);
                return results[0];
            } catch (e) { return null; }
        });

        const validTracks = (await Promise.all(searchPromises)).filter((t): t is Track => t !== null);

        return validTracks;
    }
};
