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

// Main App component that handles "routing" via state for simplicity in this SPA demo
const ZunoApp: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('home');

  const renderView = () => {
    switch (currentView) {
      case 'home': return <Home />;
      case 'search': return <Search />;
      case 'library': return <Library />;
      case 'editor': return <ImageEditor />;
      default: return <Home />;
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