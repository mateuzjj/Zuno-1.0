import { getAccessToken } from './spotifyAuth';
import { SpotifyTrack, SpotifyArtist, SpotifyAlbum, SpotifyPlaylist } from '../types';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

async function fetchSpotify<T>(endpoint: string, options: RequestInit = {}, retryCount = 0): Promise<T> {
    const token = await getAccessToken();
    if (!token) {
        throw new Error('Não autenticado com Spotify. Por favor, conecte novamente.');
    }

    const { headers, ...rest } = options;

    try {
        const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
            ...rest,
            headers: {
                'Authorization': `Bearer ${token}`,
                ...headers,
            },
        });

        // Handle rate limiting (429)
        if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.min(1000 * Math.pow(2, retryCount), 10000);
            
            if (retryCount < 3) {
                console.warn(`[SpotifyClient] Rate limited. Waiting ${waitTime}ms before retry ${retryCount + 1}/3`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                return fetchSpotify<T>(endpoint, options, retryCount + 1);
            }
            throw new Error('Muitas requisições ao Spotify. Aguarde alguns minutos e tente novamente.');
        }

        // Handle authentication errors
        if (response.status === 401) {
            console.error('[SpotifyClient] 401 Unauthorized - Token may be invalid or expired');
            throw new Error('Sessão expirada. Por favor, conecte novamente ao Spotify.');
        }

        // Handle permission errors
        if (response.status === 403) {
            console.error('[SpotifyClient] 403 Forbidden - Insufficient permissions');
            throw new Error('Permissões insuficientes. Verifique as permissões da conta Spotify.');
        }

        // Handle server errors with retry
        if (response.status >= 500 && retryCount < 2) {
            const waitTime = 1000 * (retryCount + 1);
            console.warn(`[SpotifyClient] Server error ${response.status}. Retrying in ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return fetchSpotify<T>(endpoint, options, retryCount + 1);
        }

        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            let errorMessage = `Erro na API do Spotify: ${response.status}`;
            
            try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.error?.message) {
                    errorMessage = errorJson.error.message;
                }
            } catch {
                // Use default error message
            }
            
            throw new Error(errorMessage);
        }

        return response.json();
    } catch (error: any) {
        // If it's already a formatted error, re-throw it
        if (error.message && !error.message.includes('Spotify API error')) {
            throw error;
        }
        
        // Network errors
        if (error.name === 'TypeError' || error.message?.includes('fetch')) {
            throw new Error('Erro de conexão. Verifique sua internet e tente novamente.');
        }
        
        throw error;
    }
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

/**
 * Search Spotify catalog directly
 */
export async function search(
    query: string,
    types: ('track' | 'artist' | 'album')[] = ['track'],
    limit: number = 20
): Promise<{
    tracks?: SpotifyTrack[];
    artists?: SpotifyArtist[];
    albums?: SpotifyAlbum[];
}> {
    const typeStr = types.join(',');
    const encodedQuery = encodeURIComponent(query);

    const data = await fetchSpotify<any>(
        `/search?q=${encodedQuery}&type=${typeStr}&limit=${limit}&market=US`
    );

    return {
        tracks: data.tracks?.items || [],
        artists: data.artists?.items || [],
        albums: data.albums?.items || [],
    };
}

export const SpotifyClient = {
    getLikedTracks,
    getFollowedArtists,
    getSavedAlbums,
    getUserPlaylists,
    getPlaylistTracks,
    getRecentlyPlayed,
    getRecommendations,
    createPlaylist,
    addTracksToPlaylist,
    getCurrentUser,
    search,
};

/**
 * Get user's recently played tracks (for seeds)
 */
export async function getRecentlyPlayed(limit: number = 20): Promise<SpotifyTrack[]> {
    const data = await fetchSpotify<{ items: { track: SpotifyTrack }[] }>(
        `/me/player/recently-played?limit=${limit}`
    );
    return data.items.map(item => item.track);
}

/**
 * Get recommendations based on seeds and audio features
 */
export async function getRecommendations(
    seedTracks: string[],
    seedArtists: string[],
    targets: {
        target_energy?: number;
        target_valence?: number;
        target_bpm?: number;
    },
    limit: number = 20
): Promise<SpotifyTrack[]> {
    const params = new URLSearchParams();

    if (seedTracks.length > 0) params.append('seed_tracks', seedTracks.join(','));
    if (seedArtists.length > 0) params.append('seed_artists', seedArtists.join(','));

    if (targets.target_energy) params.append('target_energy', targets.target_energy.toString());
    if (targets.target_valence) params.append('target_valence', targets.target_valence.toString());
    if (targets.target_bpm) params.append('target_tempo', targets.target_bpm.toString());

    params.append('limit', limit.toString());

    const data = await fetchSpotify<{ tracks: SpotifyTrack[] }>(
        `/recommendations?${params.toString()}`
    );
    return data.tracks;
}

/**
 * Create a new playlist
 */
export async function createPlaylist(
    userId: string,
    name: string,
    description: string = 'Generated by Zuno'
): Promise<SpotifyPlaylist> {
    return await fetchSpotify<SpotifyPlaylist>(`/users/${userId}/playlists`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(await getAuthHeader())
        },
        body: JSON.stringify({
            name,
            description,
            public: false
        })
    });
}

/**
 * Get current user profile
 */
export async function getCurrentUser(): Promise<SpotifyUser> {
    return await fetchSpotify<SpotifyUser>('/me');
}

export interface SpotifyUser {
    id: string;
    display_name: string;
    images: { url: string }[];
}

/**
 * Add tracks to a playlist
 */
export async function addTracksToPlaylist(
    playlistId: string,
    uris: string[]
): Promise<void> {
    // Spotify limit is 100 tracks per request
    const chunks = [];
    for (let i = 0; i < uris.length; i += 100) {
        chunks.push(uris.slice(i, i + 100));
    }

    for (const chunk of chunks) {
        await fetchSpotify(`/playlists/${playlistId}/tracks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(await getAuthHeader())
            },
            body: JSON.stringify({
                uris: chunk
            })
        });
    }
}

// Helper to get auth header (internal use)
async function getAuthHeader() {
    const token = await getAccessToken();
    return { 'Authorization': `Bearer ${token}` };
}
