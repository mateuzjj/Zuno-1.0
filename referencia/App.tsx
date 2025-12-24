import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Player from './components/Player';
import Home from './pages/Home';
import ZunoBrain from './pages/ZunoBrain';
import { Track, ContextType, UserEvent } from './types';

const App = () => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [context, setContext] = useState<ContextType>(ContextType.Focus);
  const [userLogs, setUserLogs] = useState<UserEvent[]>([]);
  const [history, setHistory] = useState<Track[]>([]);

  const handlePlay = (track: Track) => {
    if (currentTrack?.id === track.id) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentTrack(track);
      setIsPlaying(true);
      // Add to history if new
      setHistory(prev => [...prev, track]);
    }
  };

  const handleLogEvent = (track: Track, event: 'play' | 'like') => {
    const newLog: UserEvent = {
        userId: 'user_123',
        trackId: track.id,
        event: event,
        timestamp: new Date().toLocaleTimeString(),
        context: context
    };
    setUserLogs(prev => [...prev, newLog]);
  };

  return (
    <HashRouter>
      <div className="flex h-screen bg-black text-white overflow-hidden font-sans">
        <Sidebar />
        
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            <div className="flex-1 overflow-y-auto bg-gradient-to-b from-zinc-900 to-black">
                <Routes>
                    <Route 
                        path="/" 
                        element={
                            <Home 
                                isPlaying={isPlaying}
                                currentTrack={currentTrack}
                                onPlay={handlePlay}
                                context={context}
                                setContext={setContext}
                                logEvent={handleLogEvent}
                            />
                        } 
                    />
                    <Route 
                        path="/brain" 
                        element={
                            <ZunoBrain 
                                logs={userLogs} 
                                context={context} 
                                history={history}
                            />
                        } 
                    />
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </div>

            {/* Sticky Player */}
            <Player 
                currentTrack={currentTrack} 
                isPlaying={isPlaying} 
                togglePlay={() => setIsPlaying(!isPlaying)} 
            />
        </div>
      </div>
    </HashRouter>
  );
};

export default App;