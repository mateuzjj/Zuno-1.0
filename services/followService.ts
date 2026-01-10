import { getDB } from './db';
import { Artist } from '../types';

/**
 * Follow an artist
 */
export async function followArtist(artist: Artist): Promise<void> {
    const db = await getDB();
    await db.put('followedArtists', {
        artist,
        followedAt: Date.now(),
    });
}

/**
 * Unfollow an artist
 */
export async function unfollowArtist(artistId: string): Promise<void> {
    const db = await getDB();
    await db.delete('followedArtists', artistId);
}

/**
 * Check if currently following an artist
 */
export async function isFollowingArtist(artistId: string): Promise<boolean> {
    const db = await getDB();
    const result = await db.get('followedArtists', artistId);
    return result !== undefined;
}

/**
 * Get all followed artists, sorted by most recently followed
 */
export async function getFollowedArtists(): Promise<Artist[]> {
    const db = await getDB();
    const followedEntries = await db.getAllFromIndex('followedArtists', 'by-followedAt');
    // Reverse to get most recent first
    return followedEntries.reverse().map(entry => entry.artist);
}

/**
 * Get count of followed artists
 */
export async function getFollowedArtistsCount(): Promise<number> {
    const db = await getDB();
    return await db.count('followedArtists');
}

export const FollowService = {
    followArtist,
    unfollowArtist,
    isFollowingArtist,
    getFollowedArtists,
    getFollowedArtistsCount,
};
