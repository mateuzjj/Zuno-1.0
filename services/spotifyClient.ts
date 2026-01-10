import { getAccessToken } from './spotifyAuth';
import { SpotifyTrack, SpotifyArtist, SpotifyAlbum, SpotifyPlaylist } from '../types';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

async function fetchSpotify<T>(endpoint: string): Promise<T> {
    const token = await getAccessToken();
    if (!token) {
        throw new Error('Not authenticated with Spotify');
    }

    const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        throw new Error(`Spotify API error: ${response.status}`);
    }

    return response.json();
}

/**
 * Get all liked/saved tracks with pagination
 */
export async function getLikedTracks(
    onProgress?: (current: number, total: number) => void
): Promise<SpotifyTrack[]> {
    const allTracks: SpotifyTrack[] = [];
    let offset = 0;
    const limit = 50;
    let total = 0;

    do {
        const data = await fetchSpotify<{
            items: { track: SpotifyTrack }[];
            total: number;
        }>(`/me/tracks?limit=${limit}&offset=${offset}`);

        total = data.total;
        const tracks = data.items.map(item => item.track);
        allTracks.push(...tracks);

        offset += limit;
        onProgress?.(allTracks.length, total);

        // Small delay to avoid rate limiting
        if (offset < total) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    } while (offset < total);

    return allTracks;
}

/**
 * Get all followed artists with pagination
 */
export async function getFollowedArtists(
    onProgress?: (current: number) => void
): Promise<SpotifyArtist[]> {
    const allArtists: SpotifyArtist[] = [];
    let after: string | null = null;
    const limit = 50;

    do {
        const url = after
            ? `/me/following?type=artist&limit=${limit}&after=${after}`
            : `/me/following?type=artist&limit=${limit}`;

        const data = await fetchSpotify<{
            artists: {
                items: SpotifyArtist[];
                cursors: { after?: string };
            };
        }>(url);

        allArtists.push(...data.artists.items);
        after = data.artists.cursors.after || null;

        onProgress?.(allArtists.length);

        if (after) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    } while (after);

    return allArtists;
}

/**
 * Get all saved albums with pagination
 */
export async function getSavedAlbums(
    onProgress?: (current: number, total: number) => void
): Promise<SpotifyAlbum[]> {
    const allAlbums: SpotifyAlbum[] = [];
    let offset = 0;
    const limit = 50;
    let total = 0;

    do {
        const data = await fetchSpotify<{
            items: { album: SpotifyAlbum }[];
            total: number;
        }>(`/me/albums?limit=${limit}&offset=${offset}`);

        total = data.total;
        const albums = data.items.map(item => item.album);
        allAlbums.push(...albums);

        offset += limit;
        onProgress?.(allAlbums.length, total);

        if (offset < total) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    } while (offset < total);

    return allAlbums;
}

/**
 * Get user's playlists
 */
export async function getUserPlaylists(
    onProgress?: (current: number, total: number) => void
): Promise<SpotifyPlaylist[]> {
    const allPlaylists: SpotifyPlaylist[] = [];
    let offset = 0;
    const limit = 50;
    let total = 0;

    do {
        const data = await fetchSpotify<{
            items: SpotifyPlaylist[];
            total: number;
        }>(`/me/playlists?limit=${limit}&offset=${offset}`);

        total = data.total;
        allPlaylists.push(...data.items);

        offset += limit;
        onProgress?.(allPlaylists.length, total);

        if (offset < total) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    } while (offset < total);

    return allPlaylists;
}

/**
 * Get tracks from a specific playlist
 */
export async function getPlaylistTracks(
    playlistId: string,
    onProgress?: (current: number, total: number) => void
): Promise<SpotifyTrack[]> {
    const allTracks: SpotifyTrack[] = [];
    let offset = 0;
    const limit = 100;
    let total = 0;

    do {
        const data = await fetchSpotify<{
            items: { track: SpotifyTrack }[];
            total: number;
        }>(`/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`);

        total = data.total;
        const tracks = data.items.map(item => item.track).filter(Boolean);
        allTracks.push(...tracks);

        offset += limit;
        onProgress?.(allTracks.length, total);

        if (offset < total) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    } while (offset < total);

    return allTracks;
}

export const SpotifyClient = {
    getLikedTracks,
    getFollowedArtists,
    getSavedAlbums,
    getUserPlaylists,
    getPlaylistTracks,
};
