import React, { useEffect, useState, useCallback } from 'react';
import { Play, Sparkles, Calendar, ArrowLeft, Download, CheckCircle2, Disc3, Heart } from 'lucide-react';
import { ZunoAPI } from '../services/zunoApi';
import { api } from '../services/api';
import { DownloadService } from '../services/download';
import { LikedAlbumsService } from '../services/likedAlbumsService';
import { Album, Track } from '../types';
import { usePlayer } from '../store/PlayerContext';
import { toast } from '../components/UI/Toast';

const PLACEHOLDER = 'https://picsum.photos/seed/album/640/640';

function resolveCover(url: string | undefined): string {
    if (!url) return PLACEHOLDER;
    if (/^https?:\/\//i.test(url)) return url;
    return api.getCoverUrl(url);
}

interface AlbumPageProps {
    albumId: string;
    onBack: () => void;
}

export const AlbumPage: React.FC<AlbumPageProps> = ({ albumId, onBack }) => {
    const { playTrack, currentTrack, status } = usePlayer();
    const [album, setAlbum] = useState<Partial<Album> | null>(null);
    const [tracks, setTracks] = useState<Track[]>([]);
    const [loading, setLoading] = useState(true);
    const [downloadedTrackIds, setDownloadedTrackIds] = useState<Set<string>>(new Set());
    const [isLiked, setIsLiked] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const data = await ZunoAPI.getAlbum(albumId);
                setAlbum(data.album);
                setTracks(data.tracks);
                checkDownloadedTracks().catch(() => {});
                setIsLiked(LikedAlbumsService.isAlbumLiked(albumId));
            } catch (err) {
                console.error("Failed to load album", err);
            } finally {
                setLoading(false);
            }
        };

        if (albumId) {
            loadData();
        }
    }, [albumId]);

    const handleToggleLike = useCallback(() => {
        if (!album || !album.id) return;
        const fullAlbum: Album = {
            id: album.id,
            title: album.title || '',
            artist: album.artist || '',
            coverUrl: album.coverUrl || '',
            year: album.year,
            releaseDate: album.releaseDate,
        };
        const nowLiked = LikedAlbumsService.toggleAlbumLike(fullAlbum);
        setIsLiked(nowLiked);
        toast.show(nowLiked ? 'Álbum salvo nos favoritos' : 'Álbum removido dos favoritos', 'success');
    }, [album]);

    const checkDownloadedTracks = async () => {
        try {
            const downloaded = await DownloadService.getDownloadedTracks();
            const downloadedIds = new Set(downloaded.map(t => t.id));
            setDownloadedTrackIds(downloadedIds);
        } catch (error) {
            console.error('Failed to check downloaded tracks', error);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-zuno-accent">
                <Sparkles className="animate-spin mb-4" size={40} />
                <p>Loading Album...</p>
            </div>
        );
    }

    if (!album) return <div className="text-white p-8">Album not found</div>;

    const cover = resolveCover(album.coverUrl);

    return (
        <div className="text-white pb-20 overflow-x-hidden">
            {/* Back */}
            <div className="px-4 md:px-8 pt-4">
                <button
                    onClick={onBack}
                    className="relative z-20 p-2.5 rounded-full bg-black/40 hover:bg-black/60 transition-colors backdrop-blur-md border border-white/10"
                    aria-label="Voltar"
                >
                    <ArrowLeft size={20} />
                </button>
            </div>

            {/* Hero — sem margens negativas para não gerar scroll lateral */}
            <div className="relative mx-4 md:mx-8 mt-4 mb-8 rounded-2xl overflow-hidden bg-gradient-to-b from-zuno-card to-zuno-main flex items-center justify-center py-8 px-6 md:px-8">
                <div className="absolute inset-0 opacity-40">
                    <img
                        src={cover}
                        alt=""
                        className="w-full h-full object-cover blur-3xl scale-110"
                        onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER; }}
                    />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                <div className="relative z-10 flex flex-col items-center w-full gap-4">
                    {/* Capa — centralizada */}
                    <div className="w-44 h-44 md:w-56 md:h-56 flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 bg-zuno-card">
                        <img
                            src={cover}
                            alt={album.title}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER; }}
                        />
                    </div>

                    {/* Info — centralizado */}
                    <div className="w-full text-center min-w-0">
                        <span className="text-xs font-bold uppercase tracking-widest text-zuno-accent mb-1 block">Álbum</span>
                        <h1 className="text-2xl md:text-4xl font-bold mb-2 drop-shadow-lg truncate px-2">{album.title}</h1>
                        <div className="flex flex-wrap items-center gap-2 text-zuno-muted text-sm justify-center">
                            <span className="text-white font-medium">{album.artist}</span>
                            <span className="w-1 h-1 bg-white/40 rounded-full" />
                            <span className="flex items-center gap-1">
                                <Calendar size={14} />
                                {album.year || (album.releaseDate ? new Date(album.releaseDate).getFullYear() : '—')}
                            </span>
                            <span className="w-1 h-1 bg-white/40 rounded-full" />
                            <span>{tracks.length} {tracks.length === 1 ? 'faixa' : 'faixas'}</span>
                        </div>
                    </div>

                    {/* Actions — centralizado */}
                    <div className="flex gap-3">
                        <button
                            onClick={() => tracks.length > 0 && playTrack(tracks[0], tracks)}
                            className="bg-zuno-accent text-black w-14 h-14 rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-zuno-accent/30"
                            title="Reproduzir"
                        >
                            <Play fill="currentColor" size={24} className="ml-0.5" />
                        </button>
                        <button
                            onClick={handleToggleLike}
                            className={`w-14 h-14 rounded-full flex items-center justify-center hover:scale-105 transition-all backdrop-blur-md border border-white/10 ${isLiked ? 'bg-red-500/20 text-red-500' : 'bg-white/10 text-white hover:bg-white/20'}`}
                            title={isLiked ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
                        >
                            <Heart size={22} fill={isLiked ? 'currentColor' : 'none'} />
                        </button>
                        <button
                            onClick={() => album.title && DownloadService.downloadAlbum(album.title, tracks)}
                            className="bg-white/10 text-white w-14 h-14 rounded-full flex items-center justify-center hover:scale-105 hover:bg-white/20 transition-all backdrop-blur-md border border-white/10"
                            title="Baixar Álbum (ZIP)"
                        >
                            <Download size={22} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Tracklist */}
            <div className="px-4 md:px-8">
                <div className="space-y-1">
                    {tracks.map((track, idx) => {
                        const isCurrentTrack = currentTrack?.id === track.id;
                        const isPlaying = isCurrentTrack && status === 'PLAYING';
                        return (
                            <div
                                key={track.id}
                                onClick={() => playTrack(track, tracks)}
                                className={`track-list-item flex items-center gap-4 p-3 rounded-lg group cursor-pointer transition-colors border-b border-white/5 last:border-0 ${isCurrentTrack ? 'bg-white/5' : ''}`}
                            >
                                <span className="text-gray-500 w-8 text-center font-mono text-lg">{idx + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className={`track-list-item-title font-medium transition-colors text-lg truncate ${isPlaying ? 'text-zuno-accent' : 'text-white'}`}>{track.title}</h4>
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
                                <span className="text-sm text-gray-500 font-mono flex-shrink-0">
                                    {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
