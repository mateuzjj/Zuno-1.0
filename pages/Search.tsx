import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, Play, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

import { Track, Artist, Album, View } from '../types';
import { usePlayer } from '../store/PlayerContext';

interface SearchProps {
  onNavigate?: (view: View, id?: string) => void;
}

export const Search: React.FC<SearchProps> = ({ onNavigate }) => {
  const [query, setQuery] = useState('');
  const [trackResults, setTrackResults] = useState<Track[]>([]);
  const [artistResults, setArtistResults] = useState<Artist[]>([]);
  const [albumResults, setAlbumResults] = useState<Album[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'artists' | 'albums' | 'tracks'>('all');
  const [results, setResults] = useState<Track[]>([]); // Keep this for now or refactor

  const { playTrack, currentTrack, status } = usePlayer();
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length > 1) {
        setIsSearching(true);
        setError(null);
        api.search(query)
          .then(data => {
            setTrackResults(data);
            setResults(data); // Legacy support
          })
          .catch(console.error);

        api.searchArtists(query)
          .then(data => setArtistResults(data))
          .catch(console.error);

        api.searchAlbums(query)
          .then(data => setAlbumResults(data))
          .catch(console.error);

        setIsSearching(false); // Simplified for now, could use Promise.all
      } else {
        setTrackResults([]);
        setArtistResults([]);
        setAlbumResults([]);
        setResults([]);
        setError(null);
      }
    }, 600); // Debounce
    return () => clearTimeout(timer);
  }, [query]);

  const categories = ['Pop', 'Rock', 'Hip Hop', 'Eletrônica', 'Jazz', 'Clássica', 'Foco', 'Relax'];
  const colors = ['bg-purple-600', 'bg-red-600', 'bg-orange-600', 'bg-emerald-600', 'bg-blue-600', 'bg-indigo-600', 'bg-pink-600', 'bg-cyan-600'];

  return (
    <div className="space-y-8 pb-24">
      {/* Search Input */}
      <div className="relative max-w-2xl">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <SearchIcon className="h-5 w-5 text-zuno-black/60" />
        </div>
        <input
          type="text"
          className="block w-full pl-11 pr-4 py-4 border-none rounded-full leading-5 bg-white text-zuno-black placeholder-zuno-black/40 focus:outline-none focus:ring-4 focus:ring-white/20 font-medium text-lg shadow-xl"
          placeholder="O que você quer ouvir?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-4 rounded-lg">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {query.length > 0 && (
        <div className="flex gap-4 mb-6 border-b border-white/10 pb-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`py-2 px-4 rounded-full font-medium transition-all ${activeTab === 'all' ? 'bg-white text-black' : 'text-zuno-muted hover:text-white'}`}
          >
            Tudo
          </button>
          <button
            onClick={() => setActiveTab('tracks')}
            className={`py-2 px-4 rounded-full font-medium transition-all ${activeTab === 'tracks' ? 'bg-white text-black' : 'text-zuno-muted hover:text-white'}`}
          >
            Músicas
          </button>
          <button
            onClick={() => setActiveTab('artists')}
            className={`py-2 px-4 rounded-full font-medium transition-all ${activeTab === 'artists' ? 'bg-white text-black' : 'text-zuno-muted hover:text-white'}`}
          >
            Artistas
          </button>
          <button
            onClick={() => setActiveTab('albums')}
            className={`py-2 px-4 rounded-full font-medium transition-all ${activeTab === 'albums' ? 'bg-white text-black' : 'text-zuno-muted hover:text-white'}`}
          >
            Álbuns
          </button>
        </div>
      )}

      {query.length > 0 ? (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {(activeTab === 'all' || activeTab === 'artists') && artistResults.length > 0 && (
            <div className="mb-10">
              <h2 className="text-xl font-bold text-white mb-4">Artistas</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {artistResults.slice(0, activeTab === 'all' ? 5 : undefined).map((artist: Artist) => (
                  <div
                    key={artist.id}
                    className="group p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-all cursor-pointer flex flex-col items-center gap-4"
                    onClick={() => onNavigate?.('artist', artist.id)}
                  >
                    <img src={artist.picture} alt={artist.name} className="w-32 h-32 rounded-full object-cover shadow-lg group-hover:scale-105 transition-transform" />
                    <div className="text-center">
                      <h3 className="font-bold text-white truncate w-full">{artist.name}</h3>
                      <span className="text-xs text-zuno-muted capitalize">{artist.type || 'Artist'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(activeTab === 'all' || activeTab === 'albums') && albumResults.length > 0 && (
            <div className="mb-10">
              <h2 className="text-xl font-bold text-white mb-4">Álbuns</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {albumResults.slice(0, activeTab === 'all' ? 5 : undefined).map((album: Album) => (
                  <div
                    key={album.id}
                    className="group p-4 bg-white/5 hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                    onClick={() => onNavigate?.('album', album.id)}
                  >
                    <div className="relative aspect-square mb-4 shadow-lg overflow-hidden rounded-md">
                      <img src={album.coverUrl} alt={album.title} className="w-full h-full object-cover" />
                    </div>
                    <h3 className="font-bold text-white truncate">{album.title}</h3>
                    <p className="text-sm text-zuno-muted truncate">{album.artist} • {album.year}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(activeTab === 'all' || activeTab === 'tracks') && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-xl font-bold text-white">Músicas</h2>
                {isSearching && <div className="w-4 h-4 border-2 border-white/30 border-t-zuno-accent rounded-full animate-spin"></div>}
              </div>

              {trackResults.length === 0 && !isSearching && activeTab === 'tracks' ? (
                <p className="text-zuno-muted">Nenhum resultado encontrado.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {trackResults.slice(0, activeTab === 'all' ? 5 : undefined).map((track, index) => (
                    <div
                      key={`${track.id}-${index}`}
                      onClick={() => playTrack(track)}
                      className={`flex items-center justify-between p-3 rounded-lg hover:bg-white/10 cursor-pointer group transition-all duration-200 border border-transparent hover:border-white/5 ${currentTrack?.id === track.id ? 'bg-white/10 border-zuno-accent/20' : ''}`}
                    >
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className="relative flex-shrink-0 w-12 h-12">
                          <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover rounded shadow-md" />

                          {/* Overlay: Play Icon or Equalizer */}
                          <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${currentTrack?.id === track.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                            {currentTrack?.id === track.id && status === 'PLAYING' ? (
                              <div className="flex gap-[2px] items-end h-4">
                                <div className="w-1 bg-zuno-accent animate-[bounce_1s_infinite] h-2"></div>
                                <div className="w-1 bg-zuno-accent animate-[bounce_1.2s_infinite] h-4"></div>
                                <div className="w-1 bg-zuno-accent animate-[bounce_0.8s_infinite] h-3"></div>
                              </div>
                            ) : (
                              <Play size={20} fill="white" className="text-white ml-0.5" />
                            )}
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className={`text-sm font-bold truncate ${currentTrack?.id === track.id ? 'text-zuno-accent' : 'text-white'}`}>
                            {track.title}
                          </h4>
                          <p className="text-xs text-zuno-muted truncate hover:text-white transition-colors">
                            {track.artist} • {track.album}
                          </p>
                        </div>
                      </div>

                      <span className="text-xs text-zuno-muted font-mono opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap ml-4">
                        {Math.floor(track.duration / 60)}:{Math.floor(track.duration % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      ) : (
        <section>
          <h2 className="text-xl font-bold mb-6 text-white">Navegar por seções</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((cat, idx) => (
              <div
                key={cat}
                className={`${colors[idx % colors.length]} h-36 rounded-xl p-4 relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-all duration-300 shadow-lg group`}
              >
                <h3 className="text-2xl font-bold text-white">{cat}</h3>
                <div className="absolute -bottom-2 -right-4 w-24 h-24 bg-black/20 rotate-[25deg] rounded-lg group-hover:rotate-[15deg] transition-transform duration-500" />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};