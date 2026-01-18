import { SpotifyClient } from './spotifyClient';
import { SpotifyMatcher } from './spotifyMatcher';
import { LikedSongsService } from './likedSongsService';
import { FollowService } from './followService';
import { PlaylistService } from './playlistService';
import { Track, Artist, Playlist } from '../types';

export interface ImportProgress {
    phase: 'fetching' | 'matching' | 'saving';
    total: number;
    processed: number;
    matched: number;
    failed: number;
    currentItem: string;
}

export interface ImportResult {
    total: number;
    imported: number;
    failed: string[];
}

export interface ImportAllResult {
    likedSongs: ImportResult;
    followedArtists: ImportResult;
    playlists: ImportPlaylistsResult;
}

export interface ImportPlaylistsResult {
    total: number;
    imported: number;
    failed: string[];
    playlists: Array<{
        name: string;
        imported: number;
        total: number;
        failed: string[];
    }>;
}

/**
 * Import liked songs from Spotify
 */
export async function importLikedSongs(
    onProgress?: (progress: ImportProgress) => void
): Promise<ImportResult> {
    const result: ImportResult = {
        total: 0,
        imported: 0,
        failed: [],
    };

    try {
        // Phase 1: Fetch from Spotify
        onProgress?.({
            phase: 'fetching',
            total: 0,
            processed: 0,
            matched: 0,
            failed: 0,
            currentItem: 'Buscando músicas do Spotify...',
        });

        const spotifyTracks = await SpotifyClient.getLikedTracks((current, total) => {
            onProgress?.({
                phase: 'fetching',
                total,
                processed: current,
                matched: 0,
                failed: 0,
                currentItem: `Carregando ${current}/${total} músicas...`,
            });
        });

        result.total = spotifyTracks.length;
        console.log(`[SpotifyImport] Fetched ${result.total} tracks from Spotify`);

        // Phase 2: Match and save
        for (let i = 0; i < spotifyTracks.length; i++) {
            const spotifyTrack = spotifyTracks[i];

            onProgress?.({
                phase: 'matching',
                total: result.total,
                processed: i,
                matched: result.imported,
                failed: result.failed.length,
                currentItem: `${spotifyTrack.name} - ${spotifyTrack.artists[0]?.name}`,
            });

            try {
                console.log(`[SpotifyImport] Matching track ${i + 1}/${result.total}: ${spotifyTrack.name}`);
                const matchedTrack = await SpotifyMatcher.matchTrack(spotifyTrack);

                if (matchedTrack) {
                    console.log(`[SpotifyImport] Match found! Saving to IndexedDB...`);
                    await LikedSongsService.likeTrack(matchedTrack);
                    result.imported++;
                    console.log(`[SpotifyImport] Successfully imported ${result.imported}/${result.total}`);
                } else {
                    console.log(`[SpotifyImport] No match found for: ${spotifyTrack.name}`);
                    result.failed.push(`${spotifyTrack.name} - ${spotifyTrack.artists[0]?.name}`);
                }
            } catch (error) {
                console.error('[SpotifyImport] Failed to import track:', spotifyTrack.name, error);
                result.failed.push(`${spotifyTrack.name} - ${spotifyTrack.artists[0]?.name}`);
            }

            // Small delay to avoid overwhelming the API
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        onProgress?.({
            phase: 'saving',
            total: result.total,
            processed: result.total,
            matched: result.imported,
            failed: result.failed.length,
            currentItem: 'Concluído!',
        });

    } catch (error: any) {
        console.error('[SpotifyImport] Failed to import liked songs:', error);
        
        // Provide more specific error messages
        if (error?.message?.includes('Não autenticado') || error?.message?.includes('Sessão expirada')) {
            throw new Error('Sessão do Spotify expirada. Por favor, conecte novamente.');
        }
        
        if (error?.message?.includes('Muitas requisições')) {
            throw new Error('Muitas requisições ao Spotify. Aguarde alguns minutos e tente novamente.');
        }
        
        if (error?.message?.includes('conexão') || error?.message?.includes('network')) {
            throw new Error('Erro de conexão. Verifique sua internet e tente novamente.');
        }
        
        // Re-throw with original message if it's already formatted
        if (error?.message) {
            throw error;
        }
        
        throw new Error(`Erro ao importar músicas: ${error?.toString() || 'Erro desconhecido'}`);
    }

    return result;
}

/**
 * Import followed artists from Spotify
 */
export async function importFollowedArtists(
    onProgress?: (progress: ImportProgress) => void
): Promise<ImportResult> {
    const result: ImportResult = {
        total: 0,
        imported: 0,
        failed: [],
    };

    try {
        // Phase 1: Fetch
        onProgress?.({
            phase: 'fetching',
            total: 0,
            processed: 0,
            matched: 0,
            failed: 0,
            currentItem: 'Buscando artistas do Spotify...',
        });

        const spotifyArtists = await SpotifyClient.getFollowedArtists((current) => {
            onProgress?.({
                phase: 'fetching',
                total: 0,
                processed: current,
                matched: 0,
                failed: 0,
                currentItem: `Carregando ${current} artistas...`,
            });
        });

        result.total = spotifyArtists.length;

        // Phase 2: Match and save
        for (let i = 0; i < spotifyArtists.length; i++) {
            const spotifyArtist = spotifyArtists[i];

            onProgress?.({
                phase: 'matching',
                total: result.total,
                processed: i,
                matched: result.imported,
                failed: result.failed.length,
                currentItem: spotifyArtist.name,
            });

            try {
                const matchedArtist = await SpotifyMatcher.matchArtist(spotifyArtist);

                if (matchedArtist) {
                    await FollowService.followArtist(matchedArtist);
                    result.imported++;
                } else {
                    result.failed.push(spotifyArtist.name);
                }
            } catch (error) {
                console.error('Failed to import artist:', spotifyArtist.name, error);
                result.failed.push(spotifyArtist.name);
            }

            await new Promise(resolve => setTimeout(resolve, 200));
        }

        onProgress?.({
            phase: 'saving',
            total: result.total,
            processed: result.total,
            matched: result.imported,
            failed: result.failed.length,
            currentItem: 'Concluído!',
        });

    } catch (error: any) {
        console.error('[SpotifyImport] Failed to import followed artists:', error);
        
        // Provide more specific error messages
        if (error?.message?.includes('Não autenticado') || error?.message?.includes('Sessão expirada')) {
            throw new Error('Sessão do Spotify expirada. Por favor, conecte novamente.');
        }
        
        if (error?.message?.includes('Muitas requisições')) {
            throw new Error('Muitas requisições ao Spotify. Aguarde alguns minutos e tente novamente.');
        }
        
        if (error?.message?.includes('conexão') || error?.message?.includes('network')) {
            throw new Error('Erro de conexão. Verifique sua internet e tente novamente.');
        }
        
        // Re-throw with original message if it's already formatted
        if (error?.message) {
            throw error;
        }
        
        throw new Error(`Erro ao importar artistas: ${error?.toString() || 'Erro desconhecido'}`);
    }

    return result;
}

/**
 * Import playlists from Spotify
 */
export async function importPlaylists(
    playlistIds?: string[], // If undefined, import all playlists
    onProgress?: (progress: ImportProgress) => void
): Promise<ImportPlaylistsResult> {
    const result: ImportPlaylistsResult = {
        total: 0,
        imported: 0,
        failed: [],
        playlists: [],
    };

    try {
        // Phase 1: Fetch playlists from Spotify
        onProgress?.({
            phase: 'fetching',
            total: 0,
            processed: 0,
            matched: 0,
            failed: 0,
            currentItem: 'Buscando playlists do Spotify...',
        });

        let spotifyPlaylists;
        if (playlistIds && playlistIds.length > 0) {
            // Import specific playlists
            const allPlaylists = await SpotifyClient.getUserPlaylists();
            spotifyPlaylists = allPlaylists.filter(p => playlistIds.includes(p.id));
        } else {
            // Import all playlists
            spotifyPlaylists = await SpotifyClient.getUserPlaylists((current, total) => {
                onProgress?.({
                    phase: 'fetching',
                    total,
                    processed: current,
                    matched: 0,
                    failed: 0,
                    currentItem: `Carregando ${current}/${total} playlists...`,
                });
            });
        }

        result.total = spotifyPlaylists.length;
        console.log(`[SpotifyImport] Fetched ${result.total} playlists from Spotify`);

        // Phase 2: Import each playlist
        for (let i = 0; i < spotifyPlaylists.length; i++) {
            const spotifyPlaylist = spotifyPlaylists[i];
            const playlistResult = {
                name: spotifyPlaylist.name,
                imported: 0,
                total: 0,
                failed: [] as string[],
            };

            onProgress?.({
                phase: 'matching',
                total: result.total,
                processed: i,
                matched: result.imported,
                failed: result.failed.length,
                currentItem: `Importando: ${spotifyPlaylist.name}`,
            });

            try {
                console.log(`[SpotifyImport] Importing playlist ${i + 1}/${result.total}: ${spotifyPlaylist.name}`);

                // Fetch tracks from this playlist
                const spotifyTracks = await SpotifyClient.getPlaylistTracks(
                    spotifyPlaylist.id,
                    (current, total) => {
                        onProgress?.({
                            phase: 'matching',
                            total: result.total,
                            processed: i,
                            matched: result.imported,
                            failed: result.failed.length,
                            currentItem: `${spotifyPlaylist.name}: ${current}/${total} músicas`,
                        });
                    }
                );

                playlistResult.total = spotifyTracks.length;
                console.log(`[SpotifyImport] Found ${playlistResult.total} tracks in playlist`);

                // Match and convert tracks
                const zunoTracks: Track[] = [];
                for (let j = 0; j < spotifyTracks.length; j++) {
                    const spotifyTrack = spotifyTracks[j];

                    onProgress?.({
                        phase: 'matching',
                        total: result.total,
                        processed: i,
                        matched: result.imported,
                        failed: result.failed.length,
                        currentItem: `${spotifyPlaylist.name}: ${j + 1}/${spotifyTracks.length} - ${spotifyTrack.name}`,
                    });

                    try {
                        const matchedTrack = await SpotifyMatcher.matchTrack(spotifyTrack);
                        if (matchedTrack) {
                            zunoTracks.push(matchedTrack);
                            playlistResult.imported++;
                        } else {
                            const trackName = `${spotifyTrack.name} - ${spotifyTrack.artists[0]?.name || 'Unknown'}`;
                            playlistResult.failed.push(trackName);
                            console.log(`[SpotifyImport] No match found for: ${trackName}`);
                        }
                    } catch (error) {
                        const trackName = `${spotifyTrack.name} - ${spotifyTrack.artists[0]?.name || 'Unknown'}`;
                        playlistResult.failed.push(trackName);
                        console.error(`[SpotifyImport] Failed to match track: ${trackName}`, error);
                    }

                    // Small delay to avoid overwhelming the API
                    await new Promise(resolve => setTimeout(resolve, 200));
                }

                // Create playlist in Zuno if we have at least one track
                if (zunoTracks.length > 0) {
                    console.log(`[SpotifyImport] ✓ Creating playlist in IndexedDB: "${spotifyPlaylist.name}"`);
                    console.log(`[SpotifyImport]   - Matched tracks: ${zunoTracks.length}/${spotifyTracks.length}`);
                    console.log(`[SpotifyImport]   - Track names:`, zunoTracks.slice(0, 3).map(t => t.name).join(', ') + (zunoTracks.length > 3 ? '...' : ''));

                    const zunoPlaylist = await PlaylistService.createPlaylist(
                        spotifyPlaylist.name,
                        spotifyPlaylist.description || `Importada do Spotify em ${new Date().toLocaleDateString('pt-BR')}`,
                        spotifyPlaylist.images?.[0]?.url
                    );

                    console.log(`[SpotifyImport] ✓ Playlist created with ID: ${zunoPlaylist.id}`);

                    // Add tracks to playlist
                    await PlaylistService.addTracksToPlaylist(zunoPlaylist.id, zunoTracks);

                    console.log(`[SpotifyImport] ✓ Added ${zunoTracks.length} tracks to playlist ${zunoPlaylist.id}`);

                    result.imported++;
                    console.log(`[SpotifyImport] ✅ Successfully imported playlist: "${spotifyPlaylist.name}" with ${zunoTracks.length} tracks`);
                } else {
                    console.warn(`[SpotifyImport] ⚠️ SKIPPING playlist "${spotifyPlaylist.name}" - NO TRACKS MATCHED!`);
                    console.warn(`[SpotifyImport]   - Original track count: ${playlistResult.total}`);
                    console.warn(`[SpotifyImport]   - Failed to match: ${playlistResult.failed.length} tracks`);
                    console.warn(`[SpotifyImport]   - Failed tracks:`, playlistResult.failed.slice(0, 5).join(', ') + (playlistResult.failed.length > 5 ? '...' : ''));
                    result.failed.push(spotifyPlaylist.name);
                    console.log(`[SpotifyImport] No tracks matched for playlist: ${spotifyPlaylist.name}`);
                }

                result.playlists.push(playlistResult);
            } catch (error) {
                console.error(`[SpotifyImport] Failed to import playlist: ${spotifyPlaylist.name}`, error);
                result.failed.push(spotifyPlaylist.name);
                result.playlists.push(playlistResult);
            }

            // Small delay between playlists
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        onProgress?.({
            phase: 'saving',
            total: result.total,
            processed: result.total,
            matched: result.imported,
            failed: result.failed.length,
            currentItem: 'Concluído!',
        });

    } catch (error: any) {
        console.error('[SpotifyImport] Failed to import playlists:', error);
        
        // Provide more specific error messages
        if (error?.message?.includes('Não autenticado') || error?.message?.includes('Sessão expirada')) {
            throw new Error('Sessão do Spotify expirada. Por favor, conecte novamente.');
        }
        
        if (error?.message?.includes('Muitas requisições')) {
            throw new Error('Muitas requisições ao Spotify. Aguarde alguns minutos e tente novamente.');
        }
        
        if (error?.message?.includes('conexão') || error?.message?.includes('network')) {
            throw new Error('Erro de conexão. Verifique sua internet e tente novamente.');
        }
        
        // Re-throw with original message if it's already formatted
        if (error?.message) {
            throw error;
        }
        
        throw new Error(`Erro ao importar playlists: ${error?.toString() || 'Erro desconhecido'}`);
    }

    return result;
}

/**
 * Import all data from Spotify
 */
export async function importAll(
    onProgress?: (progress: ImportProgress) => void
): Promise<ImportAllResult> {
    const likedSongs = await importLikedSongs(onProgress);
    const followedArtists = await importFollowedArtists(onProgress);
    const playlists = await importPlaylists(undefined, onProgress);

    return {
        likedSongs,
        followedArtists,
        playlists,
    };
}

export const SpotifyImportService = {
    importLikedSongs,
    importFollowedArtists,
    importPlaylists,
    importAll,
};
