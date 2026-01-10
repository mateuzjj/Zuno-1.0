import { getDB } from './db';
import { Playlist, Track } from '../types';
import { nanoid } from 'nanoid';

/**
 * Create a new playlist
 */
export async function createPlaylist(
    name: string,
    description?: string,
    coverUrl?: string
): Promise<Playlist> {
    const db = await getDB();

    const playlist: Playlist = {
        id: nanoid(),
        name,
        description,
        coverUrl,
        tracks: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };

    await db.put('playlists', playlist);
    return playlist;
}

/**
 * Get all playlists
 */
export async function getPlaylists(): Promise<Playlist[]> {
    const db = await getDB();
    return await db.getAllFromIndex('playlists', 'by-updatedAt');
}

/**
 * Get a single playlist by ID
 */
export async function getPlaylist(id: string): Promise<Playlist | undefined> {
    const db = await getDB();
    return await db.get('playlists', id);
}

/**
 * Update playlist metadata (name, description, cover)
 */
export async function updatePlaylist(
    id: string,
    updates: Partial<Pick<Playlist, 'name' | 'description' | 'coverUrl'>>
): Promise<Playlist | null> {
    const db = await getDB();
    const playlist = await db.get('playlists', id);

    if (!playlist) return null;

    const updatedPlaylist: Playlist = {
        ...playlist,
        ...updates,
        updatedAt: Date.now(),
    };

    await db.put('playlists', updatedPlaylist);
    return updatedPlaylist;
}

/**
 * Delete a playlist
 */
export async function deletePlaylist(id: string): Promise<boolean> {
    const db = await getDB();
    await db.delete('playlists', id);
    return true;
}

/**
 * Add tracks to a playlist
 */
export async function addTracksToPlaylist(
    playlistId: string,
    tracks: Track[]
): Promise<Playlist | null> {
    const db = await getDB();
    const playlist = await db.get('playlists', playlistId);

    if (!playlist) return null;

    // Filter out duplicates
    const existingIds = new Set(playlist.tracks.map(t => t.id));
    const newTracks = tracks.filter(t => !existingIds.has(t.id));

    const updatedPlaylist: Playlist = {
        ...playlist,
        tracks: [...playlist.tracks, ...newTracks],
        updatedAt: Date.now(),
    };

    await db.put('playlists', updatedPlaylist);
    return updatedPlaylist;
}

/**
 * Remove tracks from a playlist
 */
export async function removeTracksFromPlaylist(
    playlistId: string,
    trackIds: string[]
): Promise<Playlist | null> {
    const db = await getDB();
    const playlist = await db.get('playlists', playlistId);

    if (!playlist) return null;

    const idsToRemove = new Set(trackIds);
    const updatedPlaylist: Playlist = {
        ...playlist,
        tracks: playlist.tracks.filter(t => !idsToRemove.has(t.id)),
        updatedAt: Date.now(),
    };

    await db.put('playlists', updatedPlaylist);
    return updatedPlaylist;
}

/**
 * Reorder tracks in a playlist
 */
export async function reorderPlaylistTracks(
    playlistId: string,
    fromIndex: number,
    toIndex: number
): Promise<Playlist | null> {
    const db = await getDB();
    const playlist = await db.get('playlists', playlistId);

    if (!playlist) return null;

    const tracks = [...playlist.tracks];
    const [movedTrack] = tracks.splice(fromIndex, 1);
    tracks.splice(toIndex, 0, movedTrack);

    const updatedPlaylist: Playlist = {
        ...playlist,
        tracks,
        updatedAt: Date.now(),
    };

    await db.put('playlists', updatedPlaylist);
    return updatedPlaylist;
}

export const PlaylistService = {
    createPlaylist,
    getPlaylists,
    getPlaylist,
    updatePlaylist,
    deletePlaylist,
    addTracksToPlaylist,
    removeTracksFromPlaylist,
    reorderPlaylistTracks,
};
