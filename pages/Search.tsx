import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, X, User, Disc, Music2, Play, MoreVertical, CheckCircle2 } from 'lucide-react';
import { View, Track, Album, Artist, Playlist } from '../types';
import { api } from '../services/api';
import { usePlayer } from '../store/PlayerContext';

interface SearchProps {
  onNavigate: (view: View, id?: string) => void;
}

type FilterType = 'all' | 'playlists' | 'artists' | 'tracks' | 'albums';

// Simple in-memory cache for search results
const searchCache = new Map<string, {
  tracks: Track[];
  artists: Artist[];
  albums: Album[];
  playlists: Playlist[];
  timestamp: number;
}>();

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const Search: React.FC<SearchProps> = ({ onNavigate }) => {
  const [query, setQuery] = useState('');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(false);
  const [loadingSecondary, setLoadingSecondary] = useState(false);
  const [loadingMore, setLoadingMore] = useState<{ tracks: boolean; albums: boolean; artists: boolean; playlists: boolean }>({
    tracks: false,
    albums: false,
    artists: false,
    playlists: false
  });
  const { playTrack } = usePlayer();

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setTracks([]);
      setArtists([]);
      setAlbums([]);
      setPlaylists([]);
      setLoading(false);
      setLoadingSecondary(false);
      return;
    }

    const normalizedQuery = searchQuery.trim().toLowerCase();

    // Check cache first
    const cached = searchCache.get(normalizedQuery);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log('[Search] Using cached results');
      setTracks(cached.tracks);
      setArtists(cached.artists);
      setAlbums(cached.albums);
      setPlaylists(cached.playlists);
      setLoading(false);
      setLoadingSecondary(false);
      return;
    }

    // Load priority content first (tracks, artists, albums) - show immediately
    setLoading(true);
    let tracksResult: Track[] = [];
    let artistsResult: Artist[] = [];
    let albumsResult: Album[] = [];

    try {
      // Load tracks, artists and albums in parallel with timeout
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Search timeout')), 8000)
      );

      // Use Promise.allSettled to ensure all requests complete even if one fails
      // Increase initial limits to show more results
      const prioritySearch = Promise.allSettled([
        api.search(searchQuery, 100).catch(() => []),
        api.searchArtists(searchQuery, 30).catch(() => []),
        api.searchAlbums(searchQuery, 50).catch(() => [])
      ]);

      const results = await Promise.race([
        prioritySearch,
        timeoutPromise
      ]).catch(() => [
        { status: 'rejected' as const, value: [] },
        { status: 'rejected' as const, value: [] },
        { status: 'rejected' as const, value: [] }
      ]) as PromiseSettledResult<any>[];

      // Extract results from settled promises (new format: { items, total })
      const tracksData = results[0]?.status === 'fulfilled' ? results[0].value : [];
      const artistsData = results[1]?.status === 'fulfilled' ? results[1].value : { items: [], total: 0 };
      const albumsData = results[2]?.status === 'fulfilled' ? results[2].value : { items: [], total: 0 };

      // Handle both old format (array) and new format (object with items)
      tracksResult = Array.isArray(tracksData) ? tracksData : tracksData.items || [];
      const artistsResultObj = Array.isArray(artistsData) ? { items: artistsData, total: artistsData.length } : artistsData;
      const albumsResultObj = Array.isArray(albumsData) ? { items: albumsData, total: albumsData.length } : albumsData;

      artistsResult = artistsResultObj.items || [];
      albumsResult = albumsResultObj.items || [];

      // Log totals for debugging
      console.log('[Search] Results loaded:', {
        tracks: tracksResult.length,
        artists: artistsResult.length,
        totalArtists: artistsResultObj.total,
        albums: albumsResult.length,
        totalAlbums: albumsResultObj.total
      });

      // Auto-load all albums if there are more available
      if (albumsResultObj.total > albumsResult.length) {
        console.log(`[Search] Auto-loading remaining albums: ${albumsResult.length}/${albumsResultObj.total}`);
        loadAllAlbums(searchQuery, albumsResult.length, albumsResultObj.total);
      }

      // Auto-load all artists if there are more available
      if (artistsResultObj.total > artistsResult.length) {
        console.log(`[Search] Auto-loading remaining artists: ${artistsResult.length}/${artistsResultObj.total}`);
        loadAllArtists(searchQuery, artistsResult.length, artistsResultObj.total);
      }

      const tracksSlice = tracksResult.slice(0, 100);
      const artistsSlice = artistsResult;
      const albumsSlice = albumsResult;

      setTracks(tracksSlice);
      setArtists(artistsSlice);
      setAlbums(albumsSlice);
      setLoading(false);
    } catch (error) {
      console.error('Priority search failed:', error);
      setTracks([]);
      setArtists([]);
      setAlbums([]);
      setLoading(false);
    }

    // Load playlists in background (less important)
    setLoadingSecondary(true);
    try {
      const playlistsData = await Promise.race([
        api.searchPlaylists(searchQuery, 30).catch(() => ({ items: [], total: 0 })),
        new Promise<{ items: Playlist[], total: number }>((_, reject) =>
          setTimeout(() => reject(new Error('Playlist search timeout')), 5000)
        )
      ]).catch(() => ({ items: [], total: 0 }));

      const playlistsResultObj = Array.isArray(playlistsData) ? { items: playlistsData, total: playlistsData.length } : playlistsData;
      const playlistsSlice = playlistsResultObj.items || [];

      console.log(`[Search] Playlists loaded: ${playlistsSlice.length}/${playlistsResultObj.total}`);

      // Auto-load all playlists if there are more available
      if (playlistsResultObj.total > playlistsSlice.length) {
        console.log(`[Search] Auto-loading remaining playlists: ${playlistsSlice.length}/${playlistsResultObj.total}`);
        loadAllPlaylists(searchQuery, playlistsSlice.length, playlistsResultObj.total);
      }

      setPlaylists(playlistsSlice);

      // Cache the results
      searchCache.set(normalizedQuery, {
        tracks: tracksResult.slice(0, 100),
        artists: artistsResult,
        albums: albumsResult,
        playlists: playlistsSlice,
        timestamp: Date.now()
      });

      // Limit cache size (keep last 20 searches)
      if (searchCache.size > 20) {
        const firstKey = searchCache.keys().next().value;
        searchCache.delete(firstKey);
      }
    } catch (error) {
      console.error('Playlist search failed:', error);
      setPlaylists([]);
    } finally {
      setLoadingSecondary(false);
    }
  };

  // Auto-load all remaining results functions
  const loadAllAlbums = async (searchQuery: string, currentCount: number, total: number) => {
    if (currentCount >= total) return;

    try {
      const batchSize = 50;
      let offset = currentCount;
      const allAlbums: Album[] = [...albums];

      while (offset < total) {
        const remaining = Math.min(batchSize, total - offset);
        const result = await api.searchAlbums(searchQuery, remaining, offset);
        const newAlbums = result.items || [];

        if (newAlbums.length === 0) break;

        allAlbums.push(...newAlbums);
        setAlbums([...allAlbums]);
        offset += newAlbums.length;

        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      console.log(`[Search] All albums loaded: ${allAlbums.length}/${total}`);
    } catch (error) {
      console.error('Failed to load all albums:', error);
    }
  };

  const loadAllArtists = async (searchQuery: string, currentCount: number, total: number) => {
    if (currentCount >= total) return;

    try {
      const batchSize = 30;
      let offset = currentCount;
      const allArtists: Artist[] = [...artists];

      while (offset < total) {
        const remaining = Math.min(batchSize, total - offset);
        const result = await api.searchArtists(searchQuery, remaining, offset);
        const newArtists = result.items || [];

        if (newArtists.length === 0) break;

        allArtists.push(...newArtists);
        setArtists([...allArtists]);
        offset += newArtists.length;

        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      console.log(`[Search] All artists loaded: ${allArtists.length}/${total}`);
    } catch (error) {
      console.error('Failed to load all artists:', error);
    }
  };

  const loadAllPlaylists = async (searchQuery: string, currentCount: number, total: number) => {
    if (currentCount >= total) return;

    try {
      const batchSize = 30;
      let offset = currentCount;
      const allPlaylists: Playlist[] = [...playlists];

      while (offset < total) {
        const remaining = Math.min(batchSize, total - offset);
        const result = await api.searchPlaylists(searchQuery, remaining, offset);
        const newPlaylists = result.items || [];

        if (newPlaylists.length === 0) break;

        allPlaylists.push(...newPlaylists);
        setPlaylists([...allPlaylists]);
        offset += newPlaylists.length;

        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      console.log(`[Search] All playlists loaded: ${allPlaylists.length}/${total}`);
    } catch (error) {
      console.error('Failed to load all playlists:', error);
    }
  };

  // Load more results functions
  const loadMoreTracks = async () => {
    if (!query.trim() || loadingMore.tracks) return;
    setLoadingMore(prev => ({ ...prev, tracks: true }));
    try {
      const moreTracks = await api.search(query, 50, tracks.length);
      setTracks(prev => [...prev, ...moreTracks]);
    } catch (error) {
      console.error('Failed to load more tracks:', error);
    } finally {
      setLoadingMore(prev => ({ ...prev, tracks: false }));
    }
  };

  const loadMoreAlbums = async () => {
    if (!query.trim() || loadingMore.albums) return;
    setLoadingMore(prev => ({ ...prev, albums: true }));
    try {
      const result = await api.searchAlbums(query, 30, albums.length);
      const moreAlbums = result.items || [];
      setAlbums(prev => [...prev, ...moreAlbums]);
    } catch (error) {
      console.error('Failed to load more albums:', error);
    } finally {
      setLoadingMore(prev => ({ ...prev, albums: false }));
    }
  };

  const loadMoreArtists = async () => {
    if (!query.trim() || loadingMore.artists) return;
    setLoadingMore(prev => ({ ...prev, artists: true }));
    try {
      const result = await api.searchArtists(query, 20, artists.length);
      const moreArtists = result.items || [];
      setArtists(prev => [...prev, ...moreArtists]);
    } catch (error) {
      console.error('Failed to load more artists:', error);
    } finally {
      setLoadingMore(prev => ({ ...prev, artists: false }));
    }
  };

  const loadMorePlaylists = async () => {
    if (!query.trim() || loadingMore.playlists) return;
    setLoadingMore(prev => ({ ...prev, playlists: true }));
    try {
      const result = await api.searchPlaylists(query, 20, playlists.length);
      const morePlaylists = result.items || [];
      setPlaylists(prev => [...prev, ...morePlaylists]);
    } catch (error) {
      console.error('Failed to load more playlists:', error);
    } finally {
      setLoadingMore(prev => ({ ...prev, playlists: false }));
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
    }, 500); // Increased debounce to reduce API calls

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
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${activeFilter === filter
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
      {loading && !tracks.length ? (
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
                      onClick={() => playTrack(track, filtered.tracks)}
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

              {/* Load More Tracks Button */}
              {(activeFilter === 'all' || activeFilter === 'tracks') && filtered.tracks.length > 0 && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={loadMoreTracks}
                    disabled={loadingMore.tracks}
                    className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loadingMore.tracks ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Carregando...
                      </>
                    ) : (
                      'Carregar mais músicas'
                    )}
                  </button>
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

              {/* Load More Playlists Button */}
              {(activeFilter === 'all' || activeFilter === 'playlists') && filtered.playlists.length > 0 && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={loadMorePlaylists}
                    disabled={loadingMore.playlists}
                    className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loadingMore.playlists ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Carregando...
                      </>
                    ) : (
                      'Carregar mais playlists'
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Loading indicator for secondary content */}
          {loadingSecondary && (
            <div className="text-center py-4">
              <div className="w-6 h-6 border-2 border-zuno-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
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

              {/* Load More Artists Button */}
              <div className="flex justify-center pt-4">
                <button
                  onClick={loadMoreArtists}
                  disabled={loadingMore.artists}
                  className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loadingMore.artists ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Carregando...
                    </>
                  ) : (
                    'Carregar mais artistas'
                  )}
                </button>
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

              {/* Load More Albums Button */}
              <div className="flex justify-center pt-4">
                <button
                  onClick={loadMoreAlbums}
                  disabled={loadingMore.albums}
                  className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loadingMore.albums ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Carregando...
                    </>
                  ) : (
                    'Carregar mais álbuns'
                  )}
                </button>
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
