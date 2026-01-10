import { getDB } from './db';
import { Track } from '../types';

/**
 * Like/Save a track
 */
export async function likeTrack(track: Track): Promise<void> {
    console.log('[LikedSongsService] Saving track:', track.title, track.id);
    const db = await getDB();

    // keyPath is 'track.id' so we just store track and likedAt
    const entry = {
        track,
        likedAt: Date.now(),
    };

    await db.put('likedTracks', entry);
    console.log('[LikedSongsService] Track saved successfully to IndexedDB');
}

/**
 * Unlike/Remove a track from liked songs
 */
export async function unlikeTrack(trackId: string): Promise<void> {
    const db = await getDB();
    await db.delete('likedTracks', trackId);
}

/**
 * Check if a track is liked
 */
export async function isTrackLiked(trackId: string): Promise<boolean> {
    const db = await getDB();
    const result = await db.get('likedTracks', trackId);
    return result !== undefined;
}

/**
 * Get all liked tracks, sorted by most recently liked
 */
export async function getLikedTracks(): Promise<Track[]> {
    const db = await getDB();
    const likedEntries = await db.getAllFromIndex('likedTracks', 'by-likedAt');
    // Reverse to get most recent first
    return likedEntries.reverse().map(entry => entry.track);
}

/**
 * Get count of liked tracks
 */
export async function getLikedTracksCount(): Promise<number> {
    const db = await getDB();
    return await db.count('likedTracks');
}

export const LikedSongsService = {
    likeTrack,
    unlikeTrack,
    isTrackLiked,
    getLikedTracks,
    getLikedTracksCount,
};
