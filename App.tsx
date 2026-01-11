import React, { useState, useEffect } from 'react';
import { PlayerProvider } from './store/PlayerContext';
import { Sidebar } from './components/Layout/Sidebar';
import { MobileNav } from './components/Layout/MobileNav';
import { PlayerBar } from './components/Player/PlayerBar';
import { FullScreenPlayer } from './components/Player/FullScreenPlayer';
import { Home } from './pages/Home';
import { Search } from './pages/Search';
import { Library } from './pages/Library';
import { ImageEditor } from './pages/ImageEditor';
import { LikedSongs } from './pages/LikedSongs';
import { PlaylistPage } from './pages/Playlist';
import { Logo } from './components/UI/Logo';
import { View } from './types';

import { ArtistPage } from './pages/Artist';
import { AlbumPage } from './pages/Album';
import { ToastContainer, toast } from './components/UI/Toast';
import { SpotifyAuth } from './services/spotifyAuth';
import { Generator } from './components/Recommendation/Generator';

// Main App component that handles "routing" via state for simplicity in this SPA demo
const ZunoApp: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('home');
  const [viewId, setViewId] = useState<string | null>(null);
  const [isProcessingCallback, setIsProcessingCallback] = useState(false);

  // Handle Spotify OAuth callback
  useEffect(() => {
    const handleSpotifyCallback = async () => {
      // Check if we're on the callback route
      if (window.location.pathname === '/spotify/callback') {
        setIsProcessingCallback(true);

        try {
          // The getAccessToken function will automatically process the code from URL
          await SpotifyAuth.getAccessToken();
          toast.show('Conectado ao Spotify com sucesso!', 'success');

          // Redirect to library after successful auth
          setCurrentView('library');

          // Clean up URL
          window.history.replaceState({}, document.title, '/');
        } catch (error) {
          console.error('Failed to process Spotify callback:', error);
          toast.show('Erro ao conectar com Spotify', 'error');

          // Redirect to home on error
          setCurrentView('home');
          window.history.replaceState({}, document.title, '/');
        } finally {
          setIsProcessingCallback(false);
        }
      }
    };

    handleSpotifyCallback();
  }, []);

  const handleNavigate = (view: View, id?: string) => {
    if (id) setViewId(id);
    setCurrentView(view);
  };

  const renderView = () => {
    switch (currentView) {
      case 'home': return <Home onNavigate={handleNavigate} />;
      case 'search': return <Search onNavigate={handleNavigate} />;
      case 'library': return <Library onNavigate={handleNavigate} />;
      case 'likedSongs': return <LikedSongs />;
      case 'playlist': return viewId ? <PlaylistPage playlistId={viewId} onBack={() => setCurrentView('library')} /> : null;
      case 'editor': return <ImageEditor />;
      case 'artist': return viewId ? <ArtistPage artistId={viewId} onNavigate={handleNavigate} /> : <div className="text-white p-8">No Artist Selected</div>;
      case 'album': return viewId ? <AlbumPage albumId={viewId} onBack={() => setCurrentView('home')} /> : null;
      case 'generator': return <Generator />;
      default: return <Home onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-zuno-black text-zuno-text font-sans selection:bg-zuno-accent selection:text-zuno-black">
      {/* Show loading state during Spotify callback processing */}
      {isProcessingCallback ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-zuno-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white text-lg">Conectando ao Spotify...</p>
          </div>
        </div>
      ) : (
        <>
          <Sidebar currentView={currentView} setView={setCurrentView} />

          {/* Main Content Area */}
          <main className="flex-1 md:ml-64 pb-32 overflow-y-auto h-screen bg-zuno-main scroll-smooth safe-top" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8rem)' }}>


            {renderView()}
          </main>

          <PlayerBar />
          <FullScreenPlayer />
          <MobileNav currentView={currentView} setView={setCurrentView} />
        </>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <PlayerProvider>
      <ZunoApp />
      <ToastContainer />
    </PlayerProvider>
  );
};

export default App;