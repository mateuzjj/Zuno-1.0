import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, X, User, Disc, Music2, Play, MoreVertical, CheckCircle2 } from 'lucide-react';
import { View, Track, Album, Artist, Playlist } from '../types';
import { api } from '../services/api';
import { usePlayer } from '../store/PlayerContext';

interface SearchProps {
  onNavigate: (view: View, id?: string) => void;
}

type FilterType = 'all' | 'playlists' | 'artists' | 'tracks' | 'albums';

export const Search: React.FC<SearchProps> = ({ onNavigate }) => {
  const [query, setQuery] = useState('');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(false);
  const { playTrack } = usePlayer();

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setTracks([]);
      setArtists([]);
      setAlbums([]);
      setPlaylists([]);
      return;
    }

    setLoading(true);
    try {
      // Search all types in parallel
      const [tracksResult, artistsResult, albumsResult, playlistsResult] = await Promise.all([
        api.search(searchQuery).catch(() => []),
        api.searchArtists(searchQuery).catch(() => []),
        api.searchAlbums(searchQuery).catch(() => []),
        api.searchPlaylists(searchQuery, 10).catch(() => [])
      ]);

      setTracks(tracksResult.slice(0, 50));
      setArtists(artistsResult.slice(0, 10));
      setAlbums(albumsResult.slice(0, 10));
      setPlaylists(playlistsResult.slice(0, 10));
    } catch (error) {
      console.error('Search failed:', error);
      setTracks([]);
      setArtists([]);
      setAlbums([]);
      setPlaylists([]);
    } finally {
      setLoading(false);
    }
  };

  // Get top artist (first result) for featured section
  const topArtist = artists.length > 0 ? artists[0] : null;

  // Filter results based on active filter
  const getFilteredResults = () => {
    switch (activeFilter) {
      case 'artists':
        return { tracks: [], artists, albums: [], playlists: [] };
      case 'albums':
        return { tracks: [], artists: [], albums, playlists: [] };
      case 'tracks':
        return { tracks, artists: [], albums: [], playlists: [] };
      case 'playlists':
        return { tracks: [], artists: [], albums: [], playlists };
      default:
        return { tracks, artists, albums, playlists };
    }
  };

  const filtered = getFilteredResults();

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
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
          placeholder="O que você quer ouvir?"
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

      {/* Filter Buttons */}
      {query && (tracks.length > 0 || artists.length > 0 || albums.length > 0 || playlists.length > 0) && (
        <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
          {(['all', 'playlists', 'artists', 'tracks', 'albums'] as FilterType[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                activeFilter === filter
                  ? 'bg-white text-black'
                  : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
              }`}
            >
              {filter === 'all' ? 'Todos' : 
               filter === 'playlists' ? 'Playlists' :
               filter === 'artists' ? 'Artistas' :
               filter === 'tracks' ? 'Músicas' : 'Álbuns'}
            </button>
          ))}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-zuno-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : query && (filtered.tracks.length > 0 || filtered.artists.length > 0 || filtered.albums.length > 0 || filtered.playlists.length > 0) ? (
        <div className="space-y-8">
          {/* Featured Artist Card (Spotify style) */}
          {topArtist && activeFilter === 'all' && (
            <div 
              className="bg-zuno-card rounded-2xl p-6 hover:bg-zuno-light transition-colors cursor-pointer"
              onClick={() => onNavigate('artist', topArtist.id)}
            >
              <div className="flex items-center gap-6">
                <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden flex-shrink-0">
                  <img
                    src={topArtist.picture}
                    alt={topArtist.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-3xl md:text-4xl font-bold text-white truncate">{topArtist.name}</h2>
                    {topArtist.type === 'MAIN' && (
                      <CheckCircle2 size={24} className="text-blue-500 flex-shrink-0" fill="currentColor" />
                    )}
                  </div>
                  <p className="text-zuno-muted text-sm md:text-base">Artista</p>
                </div>
              </div>
            </div>
          )}

          {/* "Com [Artista]" Section - Featured Playlists/Albums */}
          {topArtist && activeFilter === 'all' && (filtered.playlists.length > 0 || filtered.albums.length > 0) && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white">Com {topArtist.name}</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {/* Featured Playlists */}
                {filtered.playlists.slice(0, 3).map((playlist) => (
                  <div
                    key={playlist.id}
                    className="bg-zuno-card rounded-xl p-4 hover:bg-zuno-light transition-colors cursor-pointer group"
                    onClick={() => onNavigate('playlist', playlist.id)}
                  >
                    <div className="relative mb-3 aspect-square rounded-lg overflow-hidden">
                      <img
                        src={playlist.coverUrl || 'https://picsum.photos/seed/playlist/400/400'}
                        alt={playlist.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play size={32} className="text-white" fill="white" />
                      </div>
                    </div>
                    <h4 className="font-bold text-white text-sm truncate">{playlist.name}</h4>
                    <p className="text-xs text-zuno-muted truncate">Playlist</p>
                  </div>
                ))}
                {/* Featured Albums */}
                {filtered.albums.slice(0, 2).map((album) => (
                  <div
                    key={album.id}
                    className="bg-zuno-card rounded-xl p-4 hover:bg-zuno-light transition-colors cursor-pointer group"
                    onClick={() => onNavigate('album', album.id)}
                  >
                    <div className="relative mb-3 aspect-square rounded-lg overflow-hidden">
                      <img
                        src={album.coverUrl}
                        alt={album.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play size={32} className="text-white" fill="white" />
                      </div>
                    </div>
                    <h4 className="font-bold text-white text-sm truncate">{album.title}</h4>
                    <p className="text-xs text-zuno-muted truncate">{album.artist}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* List View for Tracks and Playlists (Spotify style) */}
          {(filtered.tracks.length > 0 || filtered.playlists.length > 0) && (
            <div className="space-y-4">
              {(activeFilter === 'all' || activeFilter === 'tracks') && filtered.tracks.length > 0 && (
                <div className="space-y-1">
                  {filtered.tracks.map((track, index) => (
                    <div
                      key={track.id}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group"
                      onClick={() => playTrack(track)}
                    >
                      <div className="w-10 text-zuno-muted text-sm font-mono group-hover:hidden">
                        {index + 1}
                      </div>
                      <button className="w-10 h-10 hidden group-hover:flex items-center justify-center bg-zuno-accent rounded-full text-black">
                        <Play size={16} fill="currentColor" />
                      </button>
                      <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                        <img
                          src={track.coverUrl}
                          alt={track.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white truncate">{track.title}</h4>
                        <p className="text-sm text-zuno-muted truncate">{track.artist}</p>
                      </div>
                      <div className="text-zuno-muted text-sm hidden md:block">
                        {track.duration ? formatTime(track.duration) : '--:--'}
                      </div>
                      <button className="p-2 text-zuno-muted hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {(activeFilter === 'all' || activeFilter === 'playlists') && filtered.playlists.length > 0 && (
                <div className="space-y-1">
                  {filtered.playlists.map((playlist) => (
                    <div
                      key={playlist.id}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group"
                      onClick={() => onNavigate('playlist', playlist.id)}
                    >
                      <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                        <img
                          src={playlist.coverUrl || 'https://picsum.photos/seed/playlist/400/400'}
                          alt={playlist.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white truncate">{playlist.name}</h4>
                        <p className="text-sm text-zuno-muted truncate">Playlist</p>
                      </div>
                      <button className="p-2 text-zuno-muted hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Grid View for Artists and Albums */}
          {filtered.artists.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white">Artistas</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {filtered.artists.map((artist) => (
                  <div
                    key={artist.id}
                    className="bg-zuno-card rounded-xl p-4 hover:bg-zuno-light transition-colors cursor-pointer group"
                    onClick={() => onNavigate('artist', artist.id)}
                  >
                    <div className="relative mb-3 aspect-square rounded-full overflow-hidden">
                      <img
                        src={artist.picture}
                        alt={artist.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <User size={32} className="text-white" fill="white" />
                      </div>
                    </div>
                    <h4 className="font-bold text-white text-sm truncate text-center">{artist.name}</h4>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filtered.albums.length > 0 && (activeFilter === 'albums' || activeFilter === 'all') && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-white">Álbuns</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {filtered.albums.map((album) => (
                  <div
                    key={album.id}
                    className="bg-zuno-card rounded-xl p-4 hover:bg-zuno-light transition-colors cursor-pointer group"
                    onClick={() => onNavigate('album', album.id)}
                  >
                    <div className="relative mb-3 aspect-square rounded-lg overflow-hidden">
                      <img
                        src={album.coverUrl}
                        alt={album.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Disc size={32} className="text-white" fill="white" />
                      </div>
                    </div>
                    <h4 className="font-bold text-white text-sm truncate">{album.title}</h4>
                    <p className="text-xs text-zuno-muted truncate">{album.artist}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
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
