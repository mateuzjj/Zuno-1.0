import React, { useState, useEffect } from 'react';
import { LikedSongsService } from '../services/likedSongsService';
import { Track } from '../types';
import { usePlayer } from '../store/PlayerContext';
import { Heart, Play } from 'lucide-react';

export const LikedSongs: React.FC = () => {
    const [likedTracks, setLikedTracks] = useState<Track[]>([]);
    const [loading, setLoading] = useState(true);
    const { playTrack, currentTrack, status } = usePlayer();

    useEffect(() => {
        loadLikedTracks();
    }, []);

    const loadLikedTracks = async () => {
        setLoading(true);
        try {
            const tracks = await LikedSongsService.getLikedTracks();
            setLikedTracks(tracks);
        } catch (error) {
            console.error('Failed to load liked tracks:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePlayTrack = (track: Track) => {
        playTrack(track, likedTracks);
    };

    if (loading) {
        return (
            <div className="p-8 text-center">
                <p className="text-zuno-muted">Loading liked songs...</p>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 md:w-24 md:h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                        <Heart size={40} className="text-white" fill="currentColor" />
                    </div>
                    <div>
                        <p className="text-xs text-zuno-muted uppercase tracking-wider mb-1">Playlist</p>
                        <h1 className="text-4xl md:text-6xl font-black text-white mb-2">
                            Músicas Curtidas
                        </h1>
                        <p className="text-sm text-zuno-muted">
                            {likedTracks.length} {likedTracks.length === 1 ? 'música' : 'músicas'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Tracks List */}
            {likedTracks.length === 0 ? (
                <div className="text-center py-16">
                    <Heart size={64} className="text-zuno-muted mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Nenhuma música curtida ainda</h2>
                    <p className="text-zuno-muted">Comece a curtir músicas para vê-las aqui</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {likedTracks.map((track, index) => {
                        const isPlaying = currentTrack?.id === track.id && status === 'PLAYING';

                        return (
                            <div
                                key={track.id}
                                className="group flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                                onClick={() => handlePlayTrack(track)}
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
