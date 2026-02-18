import React, { useState, useEffect } from 'react';
import { Heart, Music, Plus, Play, Download, Disc3 } from 'lucide-react';
import { Playlist } from '../types';
import { PlaylistService } from '../services/playlistService';
import { LikedAlbumsService } from '../services/likedAlbumsService';
import { CreatePlaylistModal } from '../components/UI/CreatePlaylistModal';
import { SpotifyImportModal } from '../components/UI/SpotifyImportModal';
import { View } from '../types';

interface LibraryProps {
  onNavigate: (view: View, id?: string) => void;
}

export const Library: React.FC<LibraryProps> = ({ onNavigate }) => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [likedAlbumsCount, setLikedAlbumsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSpotifyImportOpen, setIsSpotifyImportOpen] = useState(false);

  useEffect(() => {
    loadPlaylists();
    setLikedAlbumsCount(LikedAlbumsService.getLikedAlbumsCount());
  }, []);

  const loadPlaylists = async () => {
    setLoading(true);
    try {
      const pls = await PlaylistService.getPlaylists();
      setPlaylists(pls.reverse());
    } catch (error) {
      console.error('Failed to load playlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaylistCreated = () => {
    loadPlaylists();
  };

  return (
    <div className="p-8 pb-32 min-h-screen bg-gradient-to-b from-zuno-main to-black">
      {/* Header Section */}
      <div className="mb-12">
        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight mb-2">
          Sua Biblioteca
        </h1>
        <p className="text-zuno-muted">Suas playlists e músicas curtidas</p>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
        {/* Liked Songs Card */}
        <div
          onClick={() => onNavigate('likedSongs')}
          className="flex items-center gap-4 bg-gradient-to-br from-purple-600 to-pink-600 p-4 rounded-lg cursor-pointer hover:from-purple-500 hover:to-pink-500 transition-all group"
        >
          <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center">
            <Heart size={32} className="text-white" fill="currentColor" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Músicas Curtidas</h3>
            <p className="text-sm text-white/80">Todas as suas favoritas</p>
          </div>
        </div>

        {/* Liked Albums Card */}
        <div
          onClick={() => onNavigate('likedAlbums')}
          className="flex items-center gap-4 bg-gradient-to-br from-blue-600 to-cyan-600 p-4 rounded-lg cursor-pointer hover:from-blue-500 hover:to-cyan-500 transition-all group"
        >
          <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center">
            <Disc3 size={32} className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Álbuns Curtidos</h3>
            <p className="text-sm text-white/80">{likedAlbumsCount} {likedAlbumsCount === 1 ? 'álbum' : 'álbuns'} salvos</p>
          </div>
        </div>

        {/* Spotify Import Card */}
        <div
          onClick={() => setIsSpotifyImportOpen(true)}
          className="flex items-center gap-4 bg-gradient-to-br from-green-600 to-green-500 p-4 rounded-lg cursor-pointer hover:from-green-500 hover:to-green-400 transition-all group"
        >
          <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center">
            <Download size={32} className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Importar do Spotify</h3>
            <p className="text-sm text-white/80">Migre suas músicas favoritas</p>
          </div>
        </div>
      </div>

      {/* Playlists Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-white">Suas Playlists</h2>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-zuno-accent text-black font-semibold rounded-full hover:bg-zuno-accent/90 hover:scale-105 transition-all"
          >
            <Plus size={20} />
            <span>Nova Playlist</span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <p className="text-zuno-muted">Carregando playlists...</p>
          </div>
        ) : playlists.length === 0 ? (
          <div className="text-center py-16">
            <Music size={64} className="text-zuno-muted mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">Nenhuma playlist ainda</h3>
            <p className="text-zuno-muted mb-6">Crie sua primeira playlist ou import do Spotify</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-6 py-3 bg-zuno-accent text-black font-semibold rounded-full hover:bg-zuno-accent/90 transition-all"
              >
                Criar Playlist
              </button>
              <button
                onClick={() => setIsSpotifyImportOpen(true)}
                className="px-6 py-3 bg-green-600 text-white font-semibold rounded-full hover:bg-green-700 transition-all"
              >
                Importar do Spotify
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {playlists.map((pl) => (
              <div
                key={pl.id}
                onClick={() => onNavigate('playlist', pl.id)}
                className="bg-zuno-card p-4 rounded-card hover:bg-white/5 transition-all group cursor-pointer transform hover:scale-105"
              >
                <div className="relative aspect-square mb-4 rounded-lg overflow-hidden shadow-lg bg-gradient-to-br from-blue-500 to-purple-500">
                  {pl.coverUrl ? (
                    <img
                      src={pl.coverUrl}
                      alt={pl.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music size={48} className="text-white/50" />
                    </div>
                  )}

                  {/* Play Button Overlay */}
                  <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 bg-zuno-accent rounded-full flex items-center justify-center shadow-lg">
                      <Play size={20} fill="currentColor" className="text-black ml-0.5" />
                    </div>
                  </div>
                </div>
                <h3 className="font-bold text-white truncate mb-1">{pl.name}</h3>
                <p className="text-sm text-zuno-muted">
                  {pl.tracks.length} {pl.tracks.length === 1 ? 'música' : 'músicas'}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modals */}
      <CreatePlaylistModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handlePlaylistCreated}
      />
      <SpotifyImportModal
        isOpen={isSpotifyImportOpen}
        onClose={() => {
          setIsSpotifyImportOpen(false);
          loadPlaylists();
        }}
      />
    </div>
  );
};
