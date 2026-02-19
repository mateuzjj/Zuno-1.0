import React, { useEffect, useState } from 'react';
import { Play, Sparkles, ArrowLeft, Download, Radio } from 'lucide-react';
import { api } from '../services/api';
import { DownloadService } from '../services/download';
import { Mix as MixType, Track } from '../types';
import { usePlayer } from '../store/PlayerContext';

const PLACEHOLDER = 'https://picsum.photos/seed/mix/640/640';

function resolveCover(url: string | undefined): string {
    if (!url) return PLACEHOLDER;
    if (/^https?:\/\//i.test(url)) return url;
    return api.getCoverUrl(url);
}

function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function totalDuration(tracks: Track[]): number {
    return tracks.reduce((sum, t) => sum + (t.duration || 0), 0);
}

interface MixPageProps {
    mixId: string;
    onBack: () => void;
    mixSourceTrack?: Track | null;
}

export const MixPage: React.FC<MixPageProps> = ({ mixId, onBack, mixSourceTrack }) => {
    const { playTrack, startRadioFromTrack } = usePlayer();
    const [mix, setMix] = useState<MixType | null>(null);
    const [tracks, setTracks] = useState<Track[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const data = await api.getMix(mixId);
                if (data.mix) setMix(data.mix as MixType);
                setTracks(data.tracks || []);
            } catch (err) {
                console.error('Failed to load mix', err);
            } finally {
                setLoading(false);
            }
        };
        if (mixId) load();
    }, [mixId]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-zuno-accent">
                <Sparkles className="animate-spin mb-4" size={40} />
                <p>Carregando Mix...</p>
            </div>
        );
    }

    const cover = resolveCover(mix?.cover || tracks[0]?.coverUrl);

    return (
        <div className="text-white pb-20 overflow-x-hidden">
            <div className="px-4 md:px-8 pt-4">
                <button
                    onClick={onBack}
                    className="relative z-20 p-2.5 rounded-full bg-black/40 hover:bg-black/60 transition-colors backdrop-blur-md border border-white/10"
                    aria-label="Voltar"
                >
                    <ArrowLeft size={20} />
                </button>
            </div>

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
                    <div className="w-44 h-44 md:w-56 md:h-56 flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 bg-zuno-card">
                        <img
                            src={cover}
                            alt={mix?.title || 'Mix'}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER; }}
                        />
                    </div>

                    <div className="w-full text-center min-w-0">
                        <span className="text-xs font-bold uppercase tracking-widest text-zuno-accent mb-1 block">Mix</span>
                        <h1 className="text-2xl md:text-4xl font-bold mb-2 drop-shadow-lg truncate px-2">
                            {mix?.title || 'Mix'}
                        </h1>
                        <div className="flex flex-wrap items-center justify-center gap-2 text-zuno-muted text-sm">
                            <span>{tracks.length} faixas</span>
                            <span className="w-1 h-1 bg-white/40 rounded-full" />
                            <span>{formatDuration(totalDuration(tracks))}</span>
                        </div>
                        {mix?.subTitle && (
                            <p className="text-zuno-muted text-sm mt-2 px-2 line-clamp-2">{mix.subTitle}</p>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => tracks.length > 0 && playTrack(tracks[0], tracks)}
                            className="bg-zuno-accent text-black w-14 h-14 rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-zuno-accent/30"
                            title="Reproduzir"
                        >
                            <Play fill="currentColor" size={24} className="ml-0.5" />
                        </button>
                        <button
                            onClick={() => mix?.title && DownloadService.downloadAlbum(mix.title, tracks)}
                            disabled={tracks.length === 0}
                            className="bg-white/10 text-white w-14 h-14 rounded-full flex items-center justify-center hover:scale-105 hover:bg-white/20 transition-all backdrop-blur-md border border-white/10 disabled:opacity-50"
                            title="Baixar Mix (ZIP)"
                        >
                            <Download size={22} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="px-4 md:px-8">
                {tracks.length === 0 && (
                    <div className="text-center py-12 text-zuno-muted">
                        <p className="text-lg mb-2">Nenhuma faixa neste mix</p>
                        <p className="text-sm mb-6">O provedor pode não retornar faixas para este mix.</p>
                        {mixSourceTrack && (
                            <button
                                onClick={() => startRadioFromTrack(mixSourceTrack)}
                                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-zuno-accent text-black font-semibold hover:opacity-90 transition-opacity"
                            >
                                <Radio size={20} />
                                Ouvir Radio do artista
                            </button>
                        )}
                        {!mixSourceTrack && (
                            <p className="text-sm">Use o botão <strong>Radio</strong> no player para ouvir mais músicas do artista.</p>
                        )}
                    </div>
                )}
                <div className="space-y-1">
                    {tracks.map((track, idx) => (
                        <div
                            key={track.id}
                            onClick={() => playTrack(track, tracks)}
                            className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 group cursor-pointer transition-colors border-b border-white/5 last:border-0"
                        >
                            <span className="text-gray-500 w-8 text-center font-mono text-lg">{idx + 1}</span>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-white group-hover:text-zuno-accent transition-colors text-lg truncate">{track.title}</h4>
                                <p className="text-sm text-gray-400 truncate">{track.artist}</p>
                            </div>
                            <span className="text-sm text-gray-500 font-mono flex-shrink-0">
                                {formatDuration(track.duration)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
