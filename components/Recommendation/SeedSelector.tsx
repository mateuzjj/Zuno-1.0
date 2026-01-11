import React, { useEffect, useState } from 'react';
import { SpotifyClient } from '../../services/spotifyClient';
import { SpotifyTrack } from '../../types';
import { Check, Music2 } from 'lucide-react';

interface SeedSelectorProps {
    selectedSeeds: SpotifyTrack[];
    onToggleSeed: (track: SpotifyTrack) => void;
}

export const SeedSelector: React.FC<SeedSelectorProps> = ({ selectedSeeds, onToggleSeed }) => {
    const [recentTracks, setRecentTracks] = useState<SpotifyTrack[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadRecent = async () => {
            try {
                const tracks = await SpotifyClient.getRecentlyPlayed(20);
                // Deduplicate by ID
                const unique = tracks.filter((t, index, self) =>
                    index === self.findIndex((x) => x.id === t.id)
                );
                setRecentTracks(unique);
            } catch (error) {
                console.error("Failed to load seeds", error);
            } finally {
                setLoading(false);
            }
        };
        loadRecent();
    }, []);

    if (loading) return <div className="text-white/50 text-sm animate-pulse">Loading recent tracks...</div>;

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Music2 size={20} className="text-zuno-accent" />
                Select Seed Tracks (Max 5)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {recentTracks.map(track => {
                    const isSelected = selectedSeeds.some(s => s.id === track.id);
                    return (
                        <div
                            key={track.id}
                            onClick={() => onToggleSeed(track)}
                            className={`
                                relative group cursor-pointer p-3 rounded-xl transition-all duration-300 border
                                ${isSelected
                                    ? 'bg-zuno-accent/20 border-zuno-accent shadow-[0_0_15px_rgba(30,215,96,0.2)]'
                                    : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                                }
                            `}
                        >
                            <div className="relative aspect-square mb-3 rounded-lg overflow-hidden">
                                <img
                                    src={track.album.images[0]?.url}
                                    alt={track.name}
                                    className={`w-full h-full object-cover transition-transform duration-500 ${isSelected ? 'scale-105' : 'group-hover:scale-105'}`}
                                />
                                {isSelected && (
                                    <div className="absolute inset-0 bg-zuno-accent/40 flex items-center justify-center backdrop-blur-[2px]">
                                        <div className="bg-white rounded-full p-1.5 shadow-lg">
                                            <Check size={16} className="text-zuno-accent" strokeWidth={3} />
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-1">
                                <h4 className={`text-xs font-bold truncate ${isSelected ? 'text-zuno-accent' : 'text-white'}`}>
                                    {track.name}
                                </h4>
                                <p className="text-[10px] text-white/60 truncate">
                                    {track.artists[0].name}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
