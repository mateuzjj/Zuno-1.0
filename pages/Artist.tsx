import React, { useEffect, useState, useCallback } from 'react';
import { Play, Sparkles, Clock, Disc, UserPlus, UserCheck, Radio } from 'lucide-react';
import { api } from '../services/api';
import { Artist, Album, Track } from '../types';
import { usePlayer } from '../store/PlayerContext';
import { FollowService } from '../services/followService';
import { toast } from '../components/UI/Toast';

import { View } from '../types';

const CHUNK_SIZE = 3;

function shuffleArray<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

interface ArtistPageProps {
    artistId: string;
    onNavigate: (view: View, id?: string) => void;
}

export const ArtistPage: React.FC<ArtistPageProps> = ({ artistId, onNavigate }) => {
    const { playTrack, currentTrack, status } = usePlayer();
    const [artist, setArtist] = useState<Artist | null>(null);
    const [albums, setAlbums] = useState<Album[]>([]);
    const [topTracks, setTopTracks] = useState<Track[]>([]);
    const [isFollowing, setIsFollowing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [radioLoading, setRadioLoading] = useState(false);

    const startArtistRadio = useCallback(async () => {
        if (!artist || albums.length === 0) {
            toast.show('Nenhum álbum encontrado para este artista', 'info');
            return;
        }
        setRadioLoading(true);
        try {
            const trackSet = new Set<string>();
            const allTracks: Track[] = [];
            const chunks: Album[][] = [];
            for (let i = 0; i < albums.length; i += CHUNK_SIZE) {
                chunks.push(albums.slice(i, i + CHUNK_SIZE));
            }
            for (const chunk of chunks) {
                const results = await Promise.all(
                    chunk.map(async (album) => {
                        try {
                            const { tracks } = await api.getAlbum(album.id);
                            return tracks;
                        } catch (err) {
                            console.warn(`Failed to fetch album ${album.title}:`, err);
                            return [];
                        }
                    })
                );
                results.flat().forEach((track) => {
                    if (!trackSet.has(track.id)) {
                        trackSet.add(track.id);
                        allTracks.push(track);
                    }
                });
            }
            if (allTracks.length === 0) {
                toast.show('Nenhuma faixa encontrada nos álbuns', 'info');
                return;
            }
            const shuffled = shuffleArray(allTracks);
            playTrack(shuffled[0], shuffled);
            toast.show(`Radio: ${shuffled.length} faixas de ${artist.name}`, 'success');
        } catch (error) {
            console.error('Artist radio failed:', error);
            toast.show('Não foi possível iniciar o rádio do artista', 'error');
        } finally {
            setRadioLoading(false);
        }
    }, [artist, albums, playTrack]);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const data = await api.getArtist(artistId);
                setArtist(data.artist);
                setAlbums(data.albums);
                setTopTracks(data.tracks);
            } catch (err) {
                console.error("Failed to load artist", err);
            } finally {
                setLoading(false);
            }
        };

        if (artistId) loadData();
        checkFollowStatus();
    }, [artistId]);

    const checkFollowStatus = async () => {
        if (!artistId) return;
        const following = await FollowService.isFollowingArtist(artistId);
        setIsFollowing(following);
    };

    const toggleFollow = async () => {
        if (!artist) return;

        try {
            if (isFollowing) {
                await FollowService.unfollowArtist(artist.id);
                setIsFollowing(false);
                toast.show(`Você deixou de seguir ${artist.name}`, 'info');
            } else {
                await FollowService.followArtist(artist);
                setIsFollowing(true);
                toast.show(`Agora você está seguindo ${artist.name}`, 'success');
            }
        } catch (error) {
            console.error('Failed to toggle follow:', error);
            toast.show('Erro ao atualizar status de seguidor', 'error');
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-zuno-accent">
                <Sparkles className="animate-spin mb-4" size={40} />
                <p>Loading Artist...</p>
            </div>
        );
    }

    if (!artist) return <div className="text-white">Artist not found</div>;

    return (
        <div className="text-white pb-20">
            {/* Hero Header */}
            <div className="relative h-80 rounded-b-[3rem] overflow-hidden -mx-4 md:-mx-8 -mt-6 mb-8 group">
                <img
                    src={artist.picture}
                    alt={artist.name}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zuno-main via-black/40 to-transparent" />

                <div className="absolute bottom-0 left-0 p-8 md:p-12">
                    <h1 className="text-5xl md:text-7xl font-bold mb-4 drop-shadow-2xl">{artist.name}</h1>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => topTracks.length > 0 && playTrack(topTracks[0], topTracks)}
                            className="bg-zuno-accent text-black px-8 py-3 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-transform"
                        >
                            <Play fill="currentColor" size={20} /> Play
                        </button>
                        <button
                            onClick={startArtistRadio}
                            disabled={radioLoading || albums.length === 0}
                            className="bg-white/10 text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:scale-105 hover:bg-white/20 transition-all disabled:opacity-50 disabled:pointer-events-none border border-white/10"
                            title="Radio — tocar todas as faixas do artista em ordem aleatória"
                        >
                            {radioLoading ? (
                                <Sparkles size={20} className="animate-spin" />
                            ) : (
                                <Radio size={20} />
                            )}
                            <span>{radioLoading ? 'Carregando...' : 'Radio'}</span>
                        </button>
                        <button
                            onClick={toggleFollow}
                            className={`px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:scale-105 transition-all ${isFollowing
                                    ? 'bg-white/10 text-white border border-white/20'
                                    : 'bg-white text-black'
                                }`}
                        >
                            {isFollowing ? (
                                <>
                                    <UserCheck size={20} />
                                    Seguindo
                                </>
                            ) : (
                                <>
                                    <UserPlus size={20} />
                                    Seguir
                                </>
                            )}
                        </button>
                        {artist.type === 'MAIN' && (
                            <span className="px-4 py-2 bg-white/10 backdrop-blur rounded-full text-sm font-medium border border-white/10">
                                Verified Artist
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="px-4 py-4">

                {/* Top Tracks */}
                <section className="mb-12">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                        <Sparkles size={20} className="text-zuno-accent" /> Popular
                    </h2>
                    <div className="space-y-2">
                        {topTracks.map((track, idx) => {
                            const isCurrentTrack = currentTrack?.id === track.id;
                            const isPlaying = isCurrentTrack && status === 'PLAYING';
                            return (
                                <div
                                    key={track.id}
                                    onClick={() => playTrack(track, topTracks)}
                                    className={`track-list-item flex items-center gap-4 p-3 rounded-xl group cursor-pointer transition-colors ${isCurrentTrack ? 'bg-white/5' : ''}`}
                                >
                                    <span className="text-gray-500 w-6 text-center font-mono">{idx + 1}</span>
                                    <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0">
                                        <img src={track.coverUrl} className="w-full h-full object-cover" alt="" />
                                        <div className={`track-list-item-play absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isCurrentTrack ? 'opacity-100' : 'opacity-0'}`}>
                                            <Play size={20} fill="white" />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className={`font-semibold transition-colors ${isPlaying ? 'text-zuno-accent' : 'text-white group-hover:text-zuno-accent'}`}>{track.title}</h4>
                                        <p className="text-sm text-gray-400">{track.album}</p>
                                    </div>
                                    <span className="text-sm text-gray-500 font-mono hidden md:block">
                                        {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Albums */}
                <section>
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                        <Disc size={20} className="text-zuno-accent" /> Discography
                    </h2>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {albums.map(album => (
                            <div key={album.id} className="group cursor-pointer" onClick={() => onNavigate('album', album.id)}>
                                <div className="relative aspect-square rounded-2xl overflow-hidden mb-3 shadow-lg shadow-black/30">
                                    <img src={album.coverUrl} alt={album.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                                </div>
                                <h4 className="font-bold text-white line-clamp-1 group-hover:text-zuno-accent transition-colors">{album.title}</h4>
                                <div className="flex justify-between items-center text-xs text-gray-400 mt-1">
                                    <span>{album.year}</span>
                                    <span>Album</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

            </div>
        </div>
    );
};
