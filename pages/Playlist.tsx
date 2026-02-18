import React, { useState, useEffect, useMemo } from 'react';
import { Playlist } from '../types';
import { PlaylistService } from '../services/playlistService';
import { api } from '../services/api';
import { usePlayer } from '../store/PlayerContext';
import { Play, Trash2, ArrowLeft, CheckCircle2, Download, Music2 } from 'lucide-react';
import { DownloadService } from '../services/download';

const PLACEHOLDER_COVER = 'https://picsum.photos/seed/playlist/640/640';

function resolveCoverUrl(coverUrl: string | undefined): string {
    if (!coverUrl) return PLACEHOLDER_COVER;
    if (/^https?:\/\//i.test(coverUrl)) return coverUrl;
    return api.getCoverUrl(coverUrl);
}

interface PlaylistPageProps {
    playlistId: string;
    onBack: () => void;
}

export const PlaylistPage: React.FC<PlaylistPageProps> = ({ playlistId, onBack }) => {
    const [playlist, setPlaylist] = useState<Playlist | null>(null);
    const [loading, setLoading] = useState(true);
    const [downloadedTrackIds, setDownloadedTrackIds] = useState<Set<string>>(new Set());
    const { playTrack, currentTrack, status } = usePlayer();

    useEffect(() => {
        loadPlaylist();
        checkDownloadedTracks();
    }, [playlistId]);

    const checkDownloadedTracks = async () => {
        try {
            const downloaded = await DownloadService.getDownloadedTracks();
            const downloadedIds = new Set(downloaded.map(t => t.id));
            setDownloadedTrackIds(downloadedIds);
        } catch (error) {
            console.error('Failed to check downloaded tracks', error);
        }
    };

    const loadPlaylist = async () => {
        setLoading(true);
        try {
            const pl = await PlaylistService.getPlaylist(playlistId);
            setPlaylist(pl || null);
            // Refresh download status when playlist is loaded
            await checkDownloadedTracks();
        } catch (error) {
            console.error('Failed to load playlist:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePlaylist = async () => {
        if (!playlist) return;

        if (confirm(`Tem certeza que deseja excluir "${playlist.name}"?`)) {
            try {
                await PlaylistService.deletePlaylist(playlist.id);
                onBack();
            } catch (error) {
                console.error('Failed to delete playlist:', error);
            }
        }
    };

    const handlePlayPlaylist = () => {
        if (playlist && playlist.tracks.length > 0) {
            playTrack(playlist.tracks[0], playlist.tracks);
        }
    };

    const handlePlayTrack = (index: number) => {
        if (playlist && playlist.tracks[index]) {
            playTrack(playlist.tracks[index], playlist.tracks);
        }
    };

    if (loading) {
        return (
            <div className="p-8 text-center">
                <p className="text-zuno-muted">Carregando playlist...</p>
            </div>
        );
    }

    if (!playlist) {
        return (
            <div className="p-8 text-center">
                <p className="text-zuno-muted">Playlist não encontrada</p>
                <button
                    onClick={onBack}
                    className="mt-4 px-6 py-2 bg-zuno-accent text-black rounded-lg hover:bg-zuno-accent/90 transition-colors"
                >
                    Voltar
                </button>
            </div>
        );
    }

    const coverUrlResolved = resolveCoverUrl(playlist.coverUrl);
    const collageCovers = useMemo(() => {
        if (playlist.coverUrl) return [];
        const seen = new Set<string>();
        const out: string[] = [];
        for (const t of playlist.tracks) {
            if (t.coverUrl && !seen.has(t.coverUrl) && out.length < 4) {
                seen.add(t.coverUrl);
                out.push(t.coverUrl);
            }
        }
        return out;
    }, [playlist.coverUrl, playlist.tracks]);

    const showCollage = !playlist.coverUrl && collageCovers.length > 0;

    return (
        <div className="text-white pb-20 overflow-x-hidden">
            <div className="px-4 md:px-8 pt-4">
                {/* Back Button */}
                <button
                    onClick={onBack}
                    className="relative z-20 p-2.5 rounded-full bg-black/40 hover:bg-black/60 transition-colors backdrop-blur-md border border-white/10"
                    aria-label="Voltar"
                >
                    <ArrowLeft size={20} />
                </button>
            </div>

            {/* Hero Header — contido no padding, sem -mx (referência Monochrome) */}
            <div className="relative mx-4 md:mx-8 mt-4 mb-8 rounded-2xl overflow-hidden bg-gradient-to-b from-zuno-card to-zuno-main min-h-[280px] md:min-h-[320px] flex items-end p-6 md:p-8">
                <div className="absolute inset-0 opacity-40">
                    <img
                        src={showCollage ? collageCovers[0] : coverUrlResolved}
                        alt=""
                        className="w-full h-full object-cover blur-3xl scale-110"
                        onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_COVER; }}
                    />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                <div className="relative z-10 flex flex-col md:flex-row gap-6 md:gap-8 items-end w-full">
                    {/* Capa: imagem única ou collage 2x2 (Monochrome) */}
                    <div className="w-44 h-44 md:w-56 md:h-56 flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 bg-zuno-card flex items-center justify-center">
                        {showCollage ? (
                            <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-px bg-black/30">
                                {[0, 1, 2, 3].map((i) => (
                                    <img
                                        key={i}
                                        src={collageCovers[i] ?? PLACEHOLDER_COVER}
                                        alt=""
                                        className="w-full h-full object-cover"
                                        onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_COVER; }}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="relative w-full h-full">
                                <img
                                    src={coverUrlResolved}
                                    alt={playlist.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_COVER; }}
                                />
                                {!playlist.coverUrl && collageCovers.length === 0 && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-500/80 to-purple-500/80">
                                        <Music2 size={56} className="text-white/90" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 w-full text-center md:text-left min-w-0">
                        <span className="text-xs font-bold uppercase tracking-widest text-zuno-accent mb-1 block">Playlist</span>
                        <h1 className="text-3xl md:text-5xl font-bold mb-2 drop-shadow-lg text-white truncate">{playlist.name}</h1>
                        <div className="flex flex-col md:flex-row items-center gap-2 text-zuno-muted text-sm justify-center md:justify-start">
                            {playlist.description && <p className="truncate max-w-md">{playlist.description}</p>}
                            {playlist.description && <span className="hidden md:inline w-1 h-1 bg-white/40 rounded-full" />}
                            <span>{playlist.tracks.length} {playlist.tracks.length === 1 ? 'música' : 'músicas'}</span>
                        </div>
                    </div>

                    <div className="flex gap-3 justify-center md:justify-start w-full md:w-auto flex-shrink-0">
                        {playlist.tracks.length > 0 && (
                            <button
                                onClick={handlePlayPlaylist}
                                className="bg-zuno-accent text-black w-14 h-14 rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-zuno-accent/30"
                                title="Reproduzir"
                            >
                                <Play fill="currentColor" size={24} className="ml-0.5" />
                            </button>
                        )}
                        <button
                            onClick={() => playlist.tracks.length > 0 && DownloadService.downloadAlbum(playlist.name, playlist.tracks)}
                            className="bg-white/10 text-white w-14 h-14 rounded-full flex items-center justify-center hover:scale-105 hover:bg-white/20 transition-all backdrop-blur-md border border-white/10"
                            title="Baixar Playlist (ZIP)"
                        >
                            <Download size={22} />
                        </button>
                        <button
                            onClick={handleDeletePlaylist}
                            className="bg-white/10 text-red-400 w-14 h-14 rounded-full flex items-center justify-center hover:scale-105 hover:bg-white/20 transition-all backdrop-blur-md border border-white/10"
                            title="Excluir Playlist"
                        >
                            <Trash2 size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Tracks List */}
            <div className="px-4 md:px-8">
                {playlist.tracks.length === 0 ? (
                    <div className="text-center py-16">
                        <Play size={64} className="text-zuno-muted mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-white mb-2">Playlist vazia</h2>
                        <p className="text-zuno-muted">Adicione músicas para começar</p>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {playlist.tracks.map((track, index) => {
                            const isPlaying = currentTrack?.id === track.id && status === 'PLAYING';

                            return (
                                <div
                                    key={track.id}
                                    className="group flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5 last:border-0"
                                    onClick={() => handlePlayTrack(index)}
                                >
                                    {/* Index/Play Button */}
                                    <div className="w-8 flex items-center justify-center text-gray-500 font-mono text-lg">
                                        {isPlaying ? (
                                            <div className="flex gap-0.5">
                                                <div className="w-0.5 h-4 bg-zuno-accent animate-pulse" />
                                                <div className="w-0.5 h-4 bg-zuno-accent animate-pulse delay-75" />
                                                <div className="w-0.5 h-4 bg-zuno-accent animate-pulse delay-150" />
                                            </div>
                                        ) : (
                                            <>
                                                <span className="group-hover:hidden">{index + 1}</span>
                                                <Play size={16} className="hidden group-hover:block text-white" />
                                            </>
                                        )}
                                    </div>

                                    {/* Album Cover */}
                                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-zuno-card flex-shrink-0">
                                        <img
                                            src={track.coverUrl || PLACEHOLDER_COVER}
                                            alt={track.title}
                                            className="w-full h-full object-cover"
                                            onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_COVER; }}
                                        />
                                    </div>

                                    {/* Track Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className={`font-medium truncate text-lg ${isPlaying ? 'text-zuno-accent' : 'text-white group-hover:text-zuno-accent transition-colors'}`}>
                                                {track.title}
                                            </h3>
                                            {downloadedTrackIds.has(track.id) && (
                                                <CheckCircle2
                                                    size={16}
                                                    className="text-zuno-accent flex-shrink-0"
                                                    fill="currentColor"
                                                    title="Música salva offline"
                                                />
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-400 truncate">{track.artist}</p>
                                    </div>

                                    {/* Duration */}
                                    <div className="text-sm text-gray-500 font-mono hidden md:block">
                                        {Math.floor(track.duration / 60)}:{String(Math.floor(track.duration % 60)).padStart(2, '0')}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
