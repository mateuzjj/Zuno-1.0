import React, { useState, useEffect } from 'react';
import { Play, Music2, TrendingUp, Sparkles } from 'lucide-react';
import { View } from '../types';
import { api } from '../services/api';
import { Track } from '../types';
import { usePlayer } from '../store/PlayerContext';

interface HomeProps {
  onNavigate: (view: View, id?: string) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const [trendingTracks, setTrendingTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const { playTrack } = usePlayer();

  useEffect(() => {
    loadTrending();
  }, []);

  const loadTrending = async () => {
    setLoading(true);
    try {
      const tracks = await api.search('trending hits');
      setTrendingTracks(tracks.slice(0, 12));
    } catch (error) {
      console.error('Failed to load trending tracks:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold text-white">Bem-vindo ao ZUNO</h1>
        <p className="text-zuno-muted">Descubra música que combina com você</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => onNavigate('generator')}
          className="bg-gradient-to-br from-zuno-accent to-emerald-400 p-6 rounded-2xl text-left hover:scale-105 transition-transform"
        >
          <Sparkles className="text-white mb-2" size={24} />
          <h3 className="font-bold text-white">Vibe Generator</h3>
          <p className="text-xs text-white/80 mt-1">Crie playlists personalizadas</p>
        </button>

        <button
          onClick={() => onNavigate('library')}
          className="bg-zuno-card p-6 rounded-2xl text-left hover:bg-zuno-light transition-colors border border-white/5"
        >
          <Music2 className="text-zuno-accent mb-2" size={24} />
          <h3 className="font-bold text-white">Sua Biblioteca</h3>
          <p className="text-xs text-zuno-muted mt-1">Suas playlists e músicas</p>
        </button>

        <button
          onClick={() => onNavigate('search')}
          className="bg-zuno-card p-6 rounded-2xl text-left hover:bg-zuno-light transition-colors border border-white/5"
        >
          <TrendingUp className="text-purple-400 mb-2" size={24} />
          <h3 className="font-bold text-white">Buscar</h3>
          <p className="text-xs text-zuno-muted mt-1">Encontre novas músicas</p>
        </button>

        <button
          onClick={() => onNavigate('editor')}
          className="bg-zuno-card p-6 rounded-2xl text-left hover:bg-zuno-light transition-colors border border-white/5"
        >
          <Sparkles className="text-purple-400 mb-2" size={24} />
          <h3 className="font-bold text-white">Magic Studio</h3>
          <p className="text-xs text-zuno-muted mt-1">Edite imagens com IA</p>
        </button>
      </div>

      {/* Trending Tracks */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-white">Em Alta</h2>
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-zuno-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {trendingTracks.map((track) => (
              <div
                key={track.id}
                className="bg-zuno-card rounded-xl p-4 hover:bg-zuno-light transition-colors cursor-pointer group"
                onClick={() => playTrack(track)}
              >
                <div className="relative mb-3 aspect-square rounded-lg overflow-hidden">
                  <img
                    src={track.coverUrl}
                    alt={track.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play size={32} className="text-white" fill="white" />
                  </div>
                </div>
                <h4 className="font-bold text-white text-sm truncate">{track.title}</h4>
                <p className="text-xs text-zuno-muted truncate">{track.artist}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
