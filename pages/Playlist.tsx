import React, { useState, useEffect } from 'react';
import { Playlist } from '../types';
import { PlaylistService } from '../services/playlistService';
import { usePlayer } from '../store/PlayerContext';
import { Play, Trash2, Edit, ArrowLeft } from 'lucide-react';

interface PlaylistPageProps {
    playlistId: string;
    onBack: () => void;
}

export const PlaylistPage: React.FC<PlaylistPageProps> = ({ playlistId, onBack }) => {
    const [playlist, setPlaylist] = useState<Playlist | null>(null);
    const [loading, setLoading] = useState(true);
    const { playTrack, currentTrack, status } = usePlayer();

    useEffect(() => {
        loadPlaylist();
    }, [playlistId]);

    const loadPlaylist = async () => {
        setLoading(true);
        try {
            const pl = await PlaylistService.getPlaylist(playlistId);
            setPlaylist(pl || null);
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

    return (
        <div className="p-6 md:p-8">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-zuno-muted hover:text-white transition-colors mb-4"
                >
                    <ArrowLeft size={20} />
                    <span>Voltar</span>
                </button>

                <div className="flex items-start gap-6">
                    <div className="w-32 h-32 md:w-48 md:h-48 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-xl flex-shrink-0">
                        {playlist.coverUrl ? (
                            <img src={playlist.coverUrl} alt={playlist.name} className="w-full h-full object-cover rounded-2xl" />
                        ) : (
                            <Play size={64} className="text-white" />
                        )}
                    </div>

                    <div className="flex-1">
                        <p className="text-xs text-zuno-muted uppercase tracking-wider mb-2">Playlist</p>
                        <h1 className="text-3xl md:text-5xl font-black text-white mb-4">
                            {playlist.name}
                        </h1>
                        {playlist.description && (
                            <p className="text-sm text-zuno-muted mb-4">{playlist.description}</p>
                        )}
                        <p className="text-sm text-zuno-muted">
                            {playlist.tracks.length} {playlist.tracks.length === 1 ? 'música' : 'músicas'}
                        </p>

                        {/* Actions */}
                        <div className="flex gap-3 mt-6">
                            {playlist.tracks.length > 0 && (
                                <button
                                    onClick={handlePlayPlaylist}
                                    className="px-8 py-3 bg-zuno-accent text-black font-semibold rounded-full hover:bg-zuno-accent/90 hover:scale-105 transition-all shadow-lg"
                                >
                                    Reproduzir
                                </button>
                            )}
                            <button
                                onClick={handleDeletePlaylist}
                                className="p-3 bg-red-500/20 text-red-500 rounded-full hover:bg-red-500/30 transition-colors"
                                title="Excluir Playlist"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tracks List */}
            {playlist.tracks.length === 0 ? (
                <div className="text-center py-16">
                    <Play size={64} className="text-zuno-muted mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Playlist vazia</h2>
                    <p className="text-zuno-muted">Adicione músicas para começar</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {playlist.tracks.map((track, index) => {
                        const isPlaying = currentTrack?.id === track.id && status === 'PLAYING';

                        return (
                            <div
                                key={track.id}
                                className="group flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                                onClick={() => handlePlayTrack(index)}
                            >
                                {/* Index/Play Button */}
                                <div className="w-8 flex items-center justify-center">
                                    {isPlaying ? (
                                        <div className="flex gap-0.5">
                                            <div className="w-0.5 h-4 bg-zuno-accent animate-pulse" />
                                            <div className="w-0.5 h-4 bg-zuno-accent animate-pulse delay-75" />
                                            <div className="w-0.5 h-4 bg-zuno-accent animate-pulse delay-150" />
                                        </div>
                                    ) : (
                                        <>
                                            <span className="text-sm text-zuno-muted group-hover:hidden">{index + 1}</span>
                                            <Play size={16} className="hidden group-hover:block text-white" />
                                        </>
                                    )}
                                </div>

                                {/* Album Cover */}
                                <img
                                    src={track.coverUrl}
                                    alt={track.title}
                                    className="w-12 h-12 rounded-lg object-cover"
                                />

                                {/* Track Info */}
                                <div className="flex-1 min-w-0">
                                    <h3 className={`font-semibold truncate ${isPlaying ? 'text-zuno-accent' : 'text-white'}`}>
                                        {track.title}
                                    </h3>
                                    <p className="text-sm text-zuno-muted truncate">{track.artist}</p>
                                </div>

                                {/* Duration */}
                                <div className="text-sm text-zuno-muted hidden md:block">
                                    {Math.floor(track.duration / 60)}:{String(Math.floor(track.duration % 60)).padStart(2, '0')}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
