import React, { useState } from 'react';
import { PlayerProvider } from './store/PlayerContext';
import { Sidebar } from './components/Layout/Sidebar';
import { MobileNav } from './components/Layout/MobileNav';
import { PlayerBar } from './components/Player/PlayerBar';
import { FullScreenPlayer } from './components/Player/FullScreenPlayer';
import { Home } from './pages/Home';
import { Search } from './pages/Search';
import { Library } from './pages/Library';
import { ImageEditor } from './pages/ImageEditor';
import { Logo } from './components/UI/Logo';
import { View } from './types';

import { ArtistPage } from './pages/Artist';

// Main App component that handles "routing" via state for simplicity in this SPA demo
const ZunoApp: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('home');
  const [artistId, setArtistId] = useState<string | null>(null);

  const handleNavigate = (view: View, id?: string) => {
    if (id) setArtistId(id);
    setCurrentView(view);
  };

  const renderView = () => {
    switch (currentView) {
      case 'home': return <Home onNavigate={handleNavigate} />;
      case 'search': return <Search />; // Likely needs nav too later
      case 'library': return <Library />;
      case 'editor': return <ImageEditor />;
      case 'artist': return artistId ? <ArtistPage artistId={artistId} /> : <div className="text-white p-8">No Artist Selected</div>;
      default: return <Home onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-zuno-black text-zuno-text font-sans selection:bg-zuno-accent selection:text-zuno-black">
      <Sidebar currentView={currentView} setView={setCurrentView} />

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 pt-6 pb-32 overflow-y-auto h-screen bg-zuno-main scroll-smooth">


        {renderView()}
      </main>

      <PlayerBar />
      <FullScreenPlayer />
      <MobileNav currentView={currentView} setView={setCurrentView} />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <PlayerProvider>
      <ZunoApp />
    </PlayerProvider>
  );
};

export default App;