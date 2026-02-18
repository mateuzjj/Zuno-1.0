import React, { useState, useEffect } from 'react';
import { LikedAlbumsService } from '../services/likedAlbumsService';
import { Album, View } from '../types';
import { api } from '../services/api';
import { Disc3, Play, Heart } from 'lucide-react';

interface LikedAlbumsProps {
    onNavigate: (view: View, id?: string) => void;
}

const PLACEHOLDER = 'https://picsum.photos/seed/album/640/640';

function resolveCover(url: string | undefined): string {
    if (!url) return PLACEHOLDER;
    if (/^https?:\/\//i.test(url)) return url;
    return api.getCoverUrl(url);
}

export const LikedAlbums: React.FC<LikedAlbumsProps> = ({ onNavigate }) => {
    const [albums, setAlbums] = useState<Album[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setAlbums(LikedAlbumsService.getLikedAlbums());
        setLoading(false);
    }, []);

    const handleUnlike = (e: React.MouseEvent, albumId: string) => {
        e.stopPropagation();
        LikedAlbumsService.unlikeAlbum(albumId);
        setAlbums(prev => prev.filter(a => a.id !== albumId));
    };

    if (loading) {
        return (
            <div className="p-8 text-center">
                <p className="text-zuno-muted">Carregando álbuns curtidos...</p>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 md:w-24 md:h-24 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
                        <Disc3 size={40} className="text-white" />
                    </div>
                    <div>
                        <p className="text-xs text-zuno-muted uppercase tracking-wider mb-1">Coleção</p>
                        <h1 className="text-4xl md:text-6xl font-black text-white mb-2">
                            Álbuns Curtidos
                        </h1>
                        <p className="text-sm text-zuno-muted">
                            {albums.length} {albums.length === 1 ? 'álbum' : 'álbuns'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Albums Grid */}
            {albums.length === 0 ? (
                <div className="text-center py-16">
                    <Disc3 size={64} className="text-zuno-muted mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Nenhum álbum curtido ainda</h2>
                    <p className="text-zuno-muted">Abra um álbum e toque no coração para salvá-lo aqui</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    {albums.map((album) => (
                        <div
                            key={album.id}
                            onClick={() => onNavigate('album', album.id)}
                            className="bg-zuno-card p-4 rounded-card hover:bg-white/5 transition-all group cursor-pointer transform hover:scale-105"
                        >
                            <div className="relative aspect-square mb-4 rounded-lg overflow-hidden shadow-lg bg-zuno-light">
                                <img
                                    src={resolveCover(album.coverUrl)}
                                    alt={album.title}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER; }}
                                />
                                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="w-12 h-12 bg-zuno-accent rounded-full flex items-center justify-center shadow-lg">
                                        <Play size={20} fill="currentColor" className="text-black ml-0.5" />
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => handleUnlike(e, album.id)}
                                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:scale-110 border border-white/10"
                                    title="Remover dos favoritos"
                                >
                                    <Heart size={16} fill="currentColor" />
                                </button>
                            </div>
                            <h3 className="font-bold text-white truncate mb-1">{album.title}</h3>
                            <p className="text-sm text-zuno-muted truncate">{album.artist}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
