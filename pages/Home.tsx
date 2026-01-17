import React, { useState, useEffect } from 'react';
import { Play, Music2, TrendingUp } from 'lucide-react';
import { View, Track, Album, Playlist } from '../types';
import { api } from '../services/api';
import { usePlayer } from '../store/PlayerContext';
import { PullToRefresh } from '../components/UI/PullToRefresh';

interface HomeProps {
  onNavigate: (view: View, id?: string) => void;
}

interface HomeSection {
  title: string;
  subtitle?: string;
  items: (Track | Album | Playlist)[];
  type: 'tracks' | 'albums' | 'playlists';
}

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [loading, setLoading] = useState(true);
  const { playTrack } = usePlayer();

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    setLoading(true);
    try {
      // Helper to add timeout to promises
      const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number = 10000): Promise<T> => {
        return Promise.race([
          promise,
          new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), timeoutMs)
          )
        ]);
      };

      // Load multiple sections in parallel with timeout and error handling
      const [featuredData, section1, section2, section3] = await Promise.allSettled([
        withTimeout(api.getFeatured().catch(() => ({
          albums: [],
          playlists: [],
          recent: []
        })), 8000),
        withTimeout(
          import('../services/zunoApi')
            .then(m => m.ZunoAPI.getNextFeedSection(0))
            .catch(() => ({
              title: 'Feito para Você',
              subtitle: 'Recomendações personalizadas',
              tracks: []
            })),
          8000
        ),
        withTimeout(
          import('../services/zunoApi')
            .then(m => m.ZunoAPI.getNextFeedSection(1))
            .catch(() => ({
              title: 'Continue Ouvindo',
              subtitle: 'Baseado no seu histórico',
              tracks: []
            })),
          8000
        ),
        withTimeout(
          import('../services/zunoApi')
            .then(m => m.ZunoAPI.getNextFeedSection(2))
            .catch(() => ({
              title: 'Descobertas da Semana',
              subtitle: 'Sugestões novas para seu perfil',
              tracks: []
            })),
          8000
        )
      ]);

      // Extract values from settled promises
      const featured = featuredData.status === 'fulfilled' ? featuredData.value : { albums: [], playlists: [], recent: [] };
      const s1 = section1.status === 'fulfilled' ? section1.value : { title: 'Feito para Você', subtitle: 'Recomendações personalizadas', tracks: [] };
      const s2 = section2.status === 'fulfilled' ? section2.value : { title: 'Continue Ouvindo', subtitle: 'Baseado no seu histórico', tracks: [] };
      const s3 = section3.status === 'fulfilled' ? section3.value : { title: 'Descobertas da Semana', subtitle: 'Sugestões novas para seu perfil', tracks: [] };

      const newSections: HomeSection[] = [
        {
          title: s1.title,
          subtitle: s1.subtitle,
          items: (s1.tracks || []).slice(0, 12),
          type: 'tracks'
        },
        {
          title: 'Playlists em Destaque',
          subtitle: 'Descubra novas playlists',
          items: (featured.playlists || []).slice(0, 12),
          type: 'playlists'
        },
        {
          title: s2.title,
          subtitle: s2.subtitle,
          items: (s2.tracks || []).slice(0, 12),
          type: 'tracks'
        },
        {
          title: 'Álbuns em Alta',
          subtitle: 'Álbuns populares para você',
          items: (featured.albums || []).slice(0, 12),
          type: 'albums'
        },
        {
          title: s3.title,
          subtitle: s3.subtitle,
          items: (s3.tracks || []).slice(0, 12),
          type: 'tracks'
        }
      ].filter(section => section.items.length > 0); // Only show sections with items

      // If no sections, show at least one with fallback data
      if (newSections.length === 0) {
        newSections.push({
          title: 'Explorar',
          subtitle: 'Música Variada',
          items: [],
          type: 'tracks'
        });
      }

      setSections(newSections);
    } catch (error) {
      console.error('Failed to load home data:', error);
      // Set empty sections on error to prevent infinite loading
      setSections([{
        title: 'Explorar',
        subtitle: 'Música Variada',
        items: [],
        type: 'tracks'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = (item: Track | Album | Playlist, type: string) => {
    if (type === 'tracks') {
      playTrack(item as Track);
    } else if (type === 'albums') {
      onNavigate('album', (item as Album).id);
    } else if (type === 'playlists') {
      onNavigate('playlist', (item as Playlist).id);
    }
  };

  return (
    <PullToRefresh onRefresh={loadHomeData}>
      <div className="p-4 md:p-8 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-white">Bem-vindo ao ZUNO</h1>
          <p className="text-zuno-muted">Descubra música que combina com você</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
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
        </div>

        {/* Multiple Sections */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-zuno-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : (
          <div className="space-y-12">
            {sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">{section.title}</h2>
                  {section.subtitle && (
                    <p className="text-sm text-zuno-muted mt-1">{section.subtitle}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {section.items.map((item) => {
                    const isTrack = section.type === 'tracks';
                    const isAlbum = section.type === 'albums';
                    const isPlaylist = section.type === 'playlists';

                    const coverUrl = isTrack
                      ? (item as Track).coverUrl
                      : isAlbum
                        ? (item as Album).coverUrl
                        : (item as Playlist).coverUrl || 'https://picsum.photos/seed/playlist/400/400';

                    const title = isTrack
                      ? (item as Track).title
                      : isAlbum
                        ? (item as Album).title
                        : (item as Playlist).name;

                    const subtitle = isTrack
                      ? (item as Track).artist
                      : isAlbum
                        ? (item as Album).artist
                        : (item as Playlist).description || 'Playlist';

                    return (
                      <div
                        key={item.id}
                        className="bg-zuno-card rounded-xl p-4 hover:bg-zuno-light transition-colors cursor-pointer group"
                        onClick={() => handleItemClick(item, section.type)}
                      >
                        <div className="relative mb-3 aspect-square rounded-lg overflow-hidden">
                          <img
                            src={coverUrl}
                            alt={title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Play size={32} className="text-white" fill="white" />
                          </div>
                        </div>
                        <h4 className="font-bold text-white text-sm truncate">{title}</h4>
                        <p className="text-xs text-zuno-muted truncate">{subtitle}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PullToRefresh>
  );
};
