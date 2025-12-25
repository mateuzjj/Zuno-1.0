import React, { useEffect, useState } from 'react';
import { Play, Sparkles, Clock, Calendar, ArrowLeft } from 'lucide-react';
import { ZunoAPI } from '../services/zunoApi';
import { Album, Track } from '../types';
import { usePlayer } from '../store/PlayerContext';

interface AlbumPageProps {
    albumId: string;
    onBack: () => void;
}

export const AlbumPage: React.FC<AlbumPageProps> = ({ albumId, onBack }) => {
    const { playTrack } = usePlayer();
    const [album, setAlbum] = useState<Partial<Album> | null>(null);
    const [tracks, setTracks] = useState<Track[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const data = await ZunoAPI.getAlbum(albumId);
                setAlbum(data.album);
                setTracks(data.tracks);
            } catch (err) {
                console.error("Failed to load album", err);
            } finally {
                setLoading(false);
            }
        };

        if (albumId) loadData();
    }, [albumId]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-zuno-accent">
                <Sparkles className="animate-spin mb-4" size={40} />
                <p>Loading Album...</p>
            </div>
        );
    }

    if (!album) return <div className="text-white p-8">Album not found</div>;

    return (
        <div className="text-white pb-20">
            {/* Back Button */}
            <button onClick={onBack} className="absolute top-6 left-6 z-20 p-2 bg-black/40 rounded-full hover:bg-black/60 transition-colors backdrop-blur-md">
                <ArrowLeft size={20} />
            </button>

            {/* Hero Header */}
            <div className="relative h-96 flex items-end p-8 bg-gradient-to-b from-gray-800 to-zuno-main -mx-4 md:-mx-8 -mt-6 mb-8 group">
                <div className="absolute inset-0 opacity-40">
                    <img
                        src={album.coverUrl}
                        alt={album.title}
                        className="w-full h-full object-cover blur-3xl scale-110"
                    />
                </div>
                <div className="absolute inset-0 bg-black/20" />

                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-end w-full">
                    <img
                        src={album.coverUrl}
                        alt={album.title}
                        className="w-48 h-48 md:w-64 md:h-64 object-cover rounded-2xl shadow-2xl shadow-black/50"
                    />
                    <div className="flex-1">
                        <span className="text-sm font-bold uppercase tracking-widest text-zuno-accent mb-2 block">Album</span>
                        <h1 className="text-4xl md:text-7xl font-bold mb-4 drop-shadow-xl">{album.title}</h1>
                        <div className="flex items-center gap-2 text-gray-300 font-medium text-lg">
                            <span>{album.artist}</span>
                            <span className="w-1 h-1 bg-gray-400 rounded-full" />
                            <span className="flex items-center gap-1"><Calendar size={16} /> {album.year || (album.releaseDate ? new Date(album.releaseDate).getFullYear() : 'Unknown')}</span>
                        </div>
                    </div>

                    <button
                        onClick={() => tracks.length > 0 && playTrack(tracks[0])}
                        className="bg-zuno-accent text-black w-14 h-14 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-green-500/30"
                    >
                        <Play fill="currentColor" size={24} className="ml-1" />
                    </button>
                </div>
            </div>

            <div className="px-4">
                {/* Tracklist */}
                <div className="space-y-1">
                    {tracks.map((track, idx) => (
                        <div
                            key={track.id}
                            onClick={() => playTrack(track)}
                            className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 group cursor-pointer transition-colors border-b border-white/5 last:border-0"
                        >
                            <span className="text-gray-500 w-8 text-center font-mono text-lg">{idx + 1}</span>
                            <div className="flex-1">
                                <h4 className="font-medium text-white group-hover:text-zuno-accent transition-colors text-lg">{track.title}</h4>
                                <p className="text-sm text-gray-400">{track.artist}</p>
                            </div>
                            <span className="text-sm text-gray-500 font-mono">
                                {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div >
    );
};
