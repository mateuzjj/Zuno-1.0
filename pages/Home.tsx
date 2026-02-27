import React, { useState, useEffect, useCallback } from 'react';
import { Play, RefreshCw, Music2, TrendingUp, Disc3, Mic2, Clock } from 'lucide-react';
import { View, Track, RecommendedArtist } from '../types';
import { api } from '../services/api';
import { ZunoAPI } from '../services/zunoApi';
import { usePlayer } from '../store/PlayerContext';
import { PullToRefresh } from '../components/UI/PullToRefresh';

interface HomeProps {
  onNavigate: (view: View, id?: string) => void;
}

interface RecommendedAlbum {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
}

function getSeeds(): Track[] {
  const history = ZunoAPI.getValidHistory();
  return [...history].sort(() => Math.random() - 0.5).slice(0, 10);
}

// Cache em memória: ao retornar à Home não recarrega, usa dados já carregados
const HOME_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos
const homeCache: {
  tracks: Track[];
  albums: RecommendedAlbum[];
  artists: RecommendedArtist[];
  timestamp: number;
} = { tracks: [], albums: [], artists: [], timestamp: 0 };

// ─── Skeleton Components ──────────────────────────────────────────────────────

const SkeletonTrack = () => (
  <div className="flex items-center gap-3 p-3 rounded-xl animate-pulse">
    <div className="w-12 h-12 rounded-lg bg-white/10 flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="h-3 bg-white/10 rounded w-3/4" />
      <div className="h-2 bg-white/10 rounded w-1/2" />
    </div>
    <div className="h-2 bg-white/10 rounded w-10" />
  </div>
);

const SkeletonCard = ({ isArtist = false }: { isArtist?: boolean; key?: number }) => (
  <div className="animate-pulse space-y-2">
    <div className={`w-full aspect-square bg-white/10 ${isArtist ? 'rounded-full' : 'rounded-xl'}`} />
    <div className="h-3 bg-white/10 rounded w-3/4 mx-auto" />
    {!isArtist && <div className="h-2 bg-white/10 rounded w-1/2 mx-auto" />}
  </div>
);

// ─── Section Header ───────────────────────────────────────────────────────────

const SectionHeader = ({
  icon,
  title,
  subtitle,
  onRefresh,
  refreshing,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onRefresh: () => void;
  refreshing: boolean;
}) => (
  <div className="flex items-start justify-between mb-4">
    <div className="flex items-center gap-3">
      <div className="text-zuno-accent">{icon}</div>
      <div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
        {subtitle && <p className="text-xs text-zuno-muted mt-0.5">{subtitle}</p>}
      </div>
    </div>
    <button
      onClick={onRefresh}
      disabled={refreshing}
      className="p-2 rounded-full hover:bg-white/10 transition-colors text-zuno-muted hover:text-white disabled:opacity-40"
      title="Atualizar"
    >
      <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
    </button>
  </div>
);

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState = ({ message, onSearch }: { message: string; onSearch: () => void }) => (
  <div className="text-center py-8 text-zuno-muted">
    <p className="text-sm mb-3">{message}</p>
    <button
      onClick={onSearch}
      className="text-xs text-zuno-accent hover:underline"
    >
      Descobrir músicas →
    </button>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const { playTrack, currentTrack, status } = usePlayer();

  // ── Tracks state ──
  const [tracks, setTracks] = useState<Track[]>([]);
  const [tracksLoading, setTracksLoading] = useState(true);

  // ── Albums state ──
  const [albums, setAlbums] = useState<RecommendedAlbum[]>([]);
  const [albumsLoading, setAlbumsLoading] = useState(true);

  // ── Artists state ──
  const [artists, setArtists] = useState<RecommendedArtist[]>([]);
  const [artistsLoading, setArtistsLoading] = useState(true);

  const hasHistory = ZunoAPI.getValidHistory().length > 0;

  // ─── Load Recommended Tracks (Monochrome: trackSeeds → getRecommendedTracksForPlaylist) ──
  const loadTracks = useCallback(async () => {
    setTracksLoading(true);
    try {
      const seeds = getSeeds();
      if (seeds.length === 0) {
        const results = await api.search('trending music', 15);
        const list = results.slice(0, 15);
        setTracks(list);
        homeCache.tracks = list;
        homeCache.timestamp = Date.now();
        return;
      }

      const trackSeeds = seeds.slice(0, 5);
      const recommendedTracks = await api.getRecommendedTracksForPlaylist(trackSeeds, 20);

      if (recommendedTracks.length >= 3) {
        setTracks(recommendedTracks);
        homeCache.tracks = recommendedTracks;
        homeCache.timestamp = Date.now();
        return;
      }

      // Fallback: similar artists + top tracks (quando poucos artistIds nos seeds)
      const artistIds = [...new Set(seeds.filter(t => t.artistId).map(t => t.artistId as string))];
      if (artistIds.length > 0) {
        const sample = artistIds.sort(() => Math.random() - 0.5).slice(0, 2);
        const seenIds = new Set(seeds.map(t => t.id));
        const result: Track[] = [];

        await Promise.all(sample.map(async (artistId) => {
          try {
            const similar = await api.getSimilarArtists(artistId);
            if (similar.length === 0) return;
            const picks = similar.sort(() => Math.random() - 0.5).slice(0, 2);
            await Promise.all(picks.map(async (pick) => {
              if (!pick?.id) return;
              let artistTracks = await api.getArtistTopTracks(pick.id, 8);
              if (artistTracks.length === 0) artistTracks = await api.search(pick.name, 8);
              artistTracks.filter(t => !seenIds.has(t.id)).forEach(t => {
                seenIds.add(t.id);
                result.push(t);
              });
            }));
          } catch (e) {
            console.warn('[Home] tracks fallback failed for artist:', e);
          }
        }));

        if (result.length >= 3) {
          const list = result.sort(() => Math.random() - 0.5).slice(0, 20);
          setTracks(list);
          homeCache.tracks = list;
          homeCache.timestamp = Date.now();
          return;
        }
      }

      const topArtist = seeds[0]?.artist || 'trending';
      const fallback = await api.search(topArtist, 15);
      const list = fallback.slice(0, 15);
      setTracks(list);
      homeCache.tracks = list;
      homeCache.timestamp = Date.now();
    } catch (e) {
      console.error('[Home] loadTracks error:', e);
      setTracks([]);
      homeCache.tracks = [];
      homeCache.timestamp = Date.now();
    } finally {
      setTracksLoading(false);
    }
  }, []);

  // ─── Load Recommended Albums (seed com albumId → getSimilarAlbums) ──────────
  const loadAlbums = useCallback(async () => {
    setAlbumsLoading(true);
    try {
      const seeds = getSeeds();
      if (seeds.length === 0) {
        const featured = await api.getFeaturedAlbums();
        const list = featured.map(a => ({ id: a.id, title: a.title, artist: a.artist, coverUrl: a.coverUrl }));
        setAlbums(list);
        homeCache.albums = list;
        homeCache.timestamp = Date.now();
        return;
      }

      const albumSeed = seeds.find(t => t.albumId);
      if (albumSeed?.albumId) {
        const similar = await api.getSimilarAlbums(albumSeed.albumId);
        if (similar.length > 0) {
          const list = similar.slice(0, 12);
          setAlbums(list);
          homeCache.albums = list;
          homeCache.timestamp = Date.now();
          return;
        }
      }

      const featured = await api.getFeaturedAlbums();
      const list = featured.map(a => ({ id: a.id, title: a.title, artist: a.artist, coverUrl: a.coverUrl }));
      setAlbums(list);
      homeCache.albums = list;
      homeCache.timestamp = Date.now();
    } catch (e) {
      console.error('[Home] loadAlbums error:', e);
      setAlbums([]);
      homeCache.albums = [];
      homeCache.timestamp = Date.now();
    } finally {
      setAlbumsLoading(false);
    }
  }, []);

  // ─── Load Recommended Artists (seed com artistId → getSimilarArtists) ──────
  const loadArtists = useCallback(async () => {
    setArtistsLoading(true);
    try {
      const seeds = getSeeds();
      if (seeds.length === 0) {
        setArtists([]);
        homeCache.artists = [];
        homeCache.timestamp = Date.now();
        return;
      }

      const artistSeed = seeds.find(t => t.artistId);
      if (artistSeed?.artistId) {
        const similar = await api.getSimilarArtists(artistSeed.artistId);
        const onlyArtists = similar.filter(
          (a: any) => a && typeof a.name === 'string' && a.name.trim() !== ''
        );
        if (onlyArtists.length > 0) {
          const list = onlyArtists.slice(0, 12).map((a: any) => ({
            id: a.id?.toString(),
            name: a.name,
            picture: a.picture || ''
          }));
          setArtists(list);
          homeCache.artists = list;
          homeCache.timestamp = Date.now();
          return;
        }
      }

      const topArtist = seeds[0]?.artist;
      if (topArtist) {
        const results = await api.searchArtists(topArtist);
        const artistList = Array.isArray(results) ? results : (results as any).items || [];
        const onlyArtists = artistList.filter(
          (a: any) => a && typeof a.name === 'string' && a.name.trim() !== ''
        );
        const list = onlyArtists.slice(0, 12).map((a: any) => ({
          id: a.id?.toString(),
          name: a.name,
          picture: a.picture || a.coverUrl || ''
        }));
        setArtists(list);
        homeCache.artists = list;
        homeCache.timestamp = Date.now();
      } else {
        setArtists([]);
        homeCache.artists = [];
        homeCache.timestamp = Date.now();
      }
    } catch (e) {
      console.error('[Home] loadArtists error:', e);
      setArtists([]);
      homeCache.artists = [];
      homeCache.timestamp = Date.now();
    } finally {
      setArtistsLoading(false);
    }
  }, []);

  // ─── Initial Load: usa cache se válido, senão carrega ──────────────────────
  useEffect(() => {
    const hasCache = homeCache.tracks.length > 0 || homeCache.albums.length > 0 || homeCache.artists.length > 0;
    const cacheValid = hasCache && Date.now() - homeCache.timestamp < HOME_CACHE_TTL_MS;

    if (cacheValid) {
      setTracks(homeCache.tracks);
      setAlbums(homeCache.albums);
      setArtists(homeCache.artists);
      setTracksLoading(false);
      setAlbumsLoading(false);
      setArtistsLoading(false);
      return;
    }
    loadTracks();
    loadAlbums();
    loadArtists();
  }, [loadTracks, loadAlbums, loadArtists]);

  const handleRefreshAll = async () => {
    loadTracks();
    loadAlbums();
    loadArtists();
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <PullToRefresh onRefresh={handleRefreshAll}>
      <div className="p-4 md:p-8 space-y-10 pb-32">

        {/* ── Header ── */}
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-white">Bem-vindo ao ZUNO</h1>
          <p className="text-zuno-muted">Descubra música que combina com você</p>
        </div>

        {/* ── Quick Actions ── */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => onNavigate('library')}
            className="bg-zuno-card p-5 rounded-2xl text-left hover:bg-zuno-light transition-all border border-white/5 hover:border-white/10 group"
          >
            <Music2 className="text-zuno-accent mb-2 group-hover:scale-110 transition-transform" size={22} />
            <h3 className="font-bold text-white text-sm">Sua Biblioteca</h3>
            <p className="text-xs text-zuno-muted mt-0.5">Suas playlists e músicas</p>
          </button>
          <button
            onClick={() => onNavigate('search')}
            className="bg-zuno-card p-5 rounded-2xl text-left hover:bg-zuno-light transition-all border border-white/5 hover:border-white/10 group"
          >
            <TrendingUp className="text-purple-400 mb-2 group-hover:scale-110 transition-transform" size={22} />
            <h3 className="font-bold text-white text-sm">Buscar</h3>
            <p className="text-xs text-zuno-muted mt-0.5">Encontre novas músicas</p>
          </button>
        </div>

        {/* ── Canções Recomendadas ── */}
        <section>
          <SectionHeader
            icon={<Music2 size={20} />}
            title="Canções Recomendadas"
            subtitle={hasHistory ? 'Baseado no que você ouve' : 'Músicas em alta'}
            onRefresh={loadTracks}
            refreshing={tracksLoading}
          />

          {tracksLoading ? (
            <div className="space-y-1">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonTrack key={i} />)}
            </div>
          ) : tracks.length === 0 ? (
            <EmptyState
              message="Ouça mais músicas para receber recomendações"
              onSearch={() => onNavigate('search')}
            />
          ) : (
            <div className="space-y-1">
              {tracks.map((track) => {
                const isCurrentTrack = currentTrack?.id === track.id;
                const isPlaying = isCurrentTrack && status === 'PLAYING';
                return (
                  <button
                    key={track.id}
                    onClick={() => playTrack(track)}
                    className={`home-track-item w-full flex items-center gap-3 p-3 rounded-xl transition-colors group text-left ${isCurrentTrack ? 'bg-white/5' : ''}`}
                  >
                    {/* Cover */}
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={track.coverUrl}
                        alt={track.title}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/music/48/48'; }}
                      />
                      <div className={`absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity ${isCurrentTrack ? 'opacity-100' : 'home-track-item-play opacity-0'}`}>
                        <Play size={16} fill="white" className="text-white" />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isPlaying ? 'text-zuno-accent' : 'text-white'}`}>{track.title}</p>
                      <p className="text-zuno-muted text-xs truncate">{track.artist}</p>
                    </div>

                    {/* Duration */}
                    <span className="text-zuno-muted text-xs flex-shrink-0 flex items-center gap-1">
                      <Clock size={10} />
                      {formatDuration(track.duration)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Álbuns Recomendados ── */}
        <section>
          <SectionHeader
            icon={<Disc3 size={20} />}
            title="Álbuns Recomendados"
            subtitle={hasHistory ? 'Similares ao que você ouve' : 'Álbuns em destaque'}
            onRefresh={loadAlbums}
            refreshing={albumsLoading}
          />

          {albumsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : albums.length === 0 ? (
            <EmptyState
              message="Ouça mais músicas para receber recomendações"
              onSearch={() => onNavigate('search')}
            />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {albums.map((album) => (
                <button
                  key={album.id}
                  onClick={() => onNavigate('album', album.id)}
                  className="bg-zuno-card rounded-xl p-3 hover:bg-zuno-light transition-all cursor-pointer group text-left border border-white/5 hover:border-white/10"
                >
                  <div className="relative mb-3 aspect-square rounded-lg overflow-hidden">
                    <img
                      src={album.coverUrl}
                      alt={album.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/album/200/200'; }}
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play size={28} className="text-white" fill="white" />
                    </div>
                  </div>
                  <h4 className="font-bold text-white text-xs truncate">{album.title}</h4>
                  <p className="text-xs text-zuno-muted truncate mt-0.5">{album.artist}</p>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ── Artistas Recomendados ── */}
        <section>
          <SectionHeader
            icon={<Mic2 size={20} />}
            title="Artistas Recomendados"
            subtitle={hasHistory ? 'Similares aos seus favoritos' : 'Artistas populares'}
            onRefresh={loadArtists}
            refreshing={artistsLoading}
          />

          {artistsLoading ? (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} isArtist />)}
            </div>
          ) : artists.length === 0 ? (
            <EmptyState
              message="Ouça mais músicas para receber recomendações de artistas."
              onSearch={() => onNavigate('search')}
            />
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {artists.map((artist) => (
                <button
                  key={artist.id}
                  onClick={() => onNavigate('artist', artist.id)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/5 transition-all group text-center"
                >
                  <div className="relative w-full aspect-square rounded-full overflow-hidden ring-2 ring-white/10 group-hover:ring-zuno-accent/50 transition-all">
                    <img
                      src={artist.picture}
                      alt={artist.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => { (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${artist.id}/200/200`; }}
                    />
                  </div>
                  <span className="text-white text-xs font-medium truncate w-full">{artist.name}</span>
                </button>
              ))}
            </div>
          )}
        </section>

      </div>
    </PullToRefresh>
  );
};
