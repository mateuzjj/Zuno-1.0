import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, Music2, X } from 'lucide-react';
import { View } from '../types';
import { api } from '../services/api';
import { Track } from '../types';
import { usePlayer } from '../store/PlayerContext';

interface SearchProps {
  onNavigate: (view: View, id?: string) => void;
}

export const Search: React.FC<SearchProps> = ({ onNavigate }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const { playTrack } = usePlayer();

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const tracks = await api.search(searchQuery);
      setResults(tracks.slice(0, 20));
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zuno-muted" size={20} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar músicas, artistas, álbuns..."
          className="w-full bg-zuno-card border border-white/10 rounded-2xl pl-12 pr-12 py-4 text-white placeholder-zuno-muted focus:outline-none focus:border-zuno-accent focus:ring-1 focus:ring-zuno-accent"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-zuno-muted hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-zuno-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">Resultados</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {results.map((track) => (
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
                    <Music2 size={32} className="text-white" fill="white" />
                  </div>
                </div>
                <h4 className="font-bold text-white text-sm truncate">{track.title}</h4>
                <p className="text-xs text-zuno-muted truncate">{track.artist}</p>
              </div>
            ))}
          </div>
        </div>
      ) : query ? (
        <div className="text-center py-12">
          <p className="text-zuno-muted">Nenhum resultado encontrado para "{query}"</p>
        </div>
      ) : (
        <div className="text-center py-12">
          <SearchIcon size={48} className="text-zuno-muted mx-auto mb-4" />
          <p className="text-zuno-muted">Digite algo para começar a buscar</p>
        </div>
      )}
    </div>
  );
};
