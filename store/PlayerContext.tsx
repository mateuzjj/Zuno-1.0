import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { PlayerState, PlayerStatus, Track } from '../types';
import { api } from '../services/api';

interface PlayerContextType extends PlayerState {
  isExpanded: boolean;
  playTrack: (track: Track) => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  toggleExpanded: () => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [status, setStatus] = useState<PlayerStatus>(PlayerStatus.STOPPED);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    audio.crossOrigin = "anonymous"; // Essential for visualizers or CDN issues

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      if (!Number.isNaN(audio.duration)) setDuration(audio.duration);
    };
    const handleEnded = () => setStatus(PlayerStatus.STOPPED);
    const handleCanPlay = () => {
      if (status === PlayerStatus.LOADING) {
        audio.play().catch(e => console.error("Auto-play blocked:", e));
        setStatus(PlayerStatus.PLAYING);
      }
    };
    const handleError = (e: any) => {
      console.error("Audio error:", e);
      setStatus(PlayerStatus.ERROR);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('durationchange', updateDuration);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('durationchange', updateDuration);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.pause();
      audio.src = "";
    };
  }, []); // Empty dependency array ok here as we use refs/state setters

  // Track History Logic
  useEffect(() => {
    if (!currentTrack) return;

    // Reset timer on new track
    const startTime = Date.now();

    return () => {
      // When track changes (component unmounts or track updates), calculate time
      const timeListened = (Date.now() - startTime) / 1000;
      // Dynamic Import to avoid circular deps if possible, or just strict import
      import('../services/zunoApi').then(({ ZunoAPI }) => {
        ZunoAPI.recordPlay(currentTrack, timeListened);
      });
    };
  }, [currentTrack]);

  const playTrack = async (track: Track) => {
    if (!audioRef.current) return;

    // UI Feedback immediately
    setCurrentTrack(track);
    setStatus(PlayerStatus.LOADING);
    setCurrentTime(0);
    // Use track duration as fallback until metadata loads
    setDuration(track.duration || 0);

    try {
      // 1. Get the stream URL (async operation)
      const streamUrl = await api.getStreamUrl(track.id);

      if (!streamUrl) throw new Error("Stream URL not found");

      // 2. Set Audio Source
      audioRef.current.src = streamUrl;
      audioRef.current.volume = volume;
      audioRef.current.muted = isMuted;

      // 3. Play
      await audioRef.current.play();
      setStatus(PlayerStatus.PLAYING);
      setIsExpanded(true); // Auto expand on play (optional, but good for "Modern" vibes)

    } catch (err) {
      console.error("Playback failed:", err);
      setStatus(PlayerStatus.ERROR);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current || !currentTrack) return;

    if (status === PlayerStatus.PLAYING) {
      audioRef.current.pause();
      setStatus(PlayerStatus.PAUSED);
    } else if (status === PlayerStatus.PAUSED || status === PlayerStatus.STOPPED) {
      audioRef.current.play().catch(console.error);
      setStatus(PlayerStatus.PLAYING);
    }
  };

  const seek = (time: number) => {
    if (audioRef.current && !Number.isNaN(audioRef.current.duration)) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const setVolume = (vol: number) => {
    if (audioRef.current) {
      audioRef.current.volume = vol;
      setVolumeState(vol);
      if (vol > 0 && isMuted) {
        setIsMuted(false);
        audioRef.current.muted = false;
      }
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      audioRef.current.muted = newMuted;
    }
  };

  const toggleExpanded = () => setIsExpanded(prev => !prev);

  // Mock prev/next implementation
  const nextTrack = () => console.log("Next track");
  const prevTrack = () => console.log("Prev track");

  return (
    <PlayerContext.Provider value={{
      currentTrack,
      status,
      currentTime,
      duration,
      volume,
      isMuted,
      isExpanded,
      playTrack,
      togglePlay,
      seek,
      setVolume,
      toggleMute,
      nextTrack,
      prevTrack,
      toggleExpanded
    }}>
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("usePlayer must be used within PlayerProvider");
  return context;
};