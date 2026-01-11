import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
import { PlayerState, PlayerStatus, Track, RepeatMode, Lyrics } from '../types';
import { api } from '../services/api';
import { LyricsService } from '../services/lyricsService';

interface PlayerContextType extends PlayerState {
  isExpanded: boolean;
  queue: Track[];
  currentLyrics: Lyrics | null;
  lyricsLoading: boolean;
  playTrack: (track: Track, queue?: Track[]) => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  toggleExpanded: () => void;
  toggleShuffle: () => void;
  toggleShuffle: () => void;
  cycleRepeatMode: () => void;
  isLiked: boolean;
  toggleLike: () => void;
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
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [queue, setQueue] = useState<Track[]>([]);
  const [originalQueue, setOriginalQueue] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [isExpanded, setIsExpanded] = useState(false);
  const [currentLyrics, setCurrentLyrics] = useState<Lyrics | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);

  // Helper function to shuffle an array
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    audio.crossOrigin = "anonymous"; // Essential for visualizers or CDN issues

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      if (!Number.isNaN(audio.duration)) setDuration(audio.duration);
    };
    const handleEnded = () => {
      // Handle repeat and queue logic
      if (repeatMode === 'one') {
        // Repeat current track
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(console.error);
        }
      } else if (repeatMode === 'all' && queue.length > 0) {
        // Go to next track, will loop back to start if at end
        const nextIdx = (currentIndex + 1) % queue.length;
        const nextTrk = queue[nextIdx];
        if (nextTrk) {
          setCurrentIndex(nextIdx);
          playTrackInternal(nextTrk);
        }
      } else if (queue.length > 0 && currentIndex < queue.length - 1) {
        // Normal next track (repeat off)
        const nextIdx = currentIndex + 1;
        const nextTrk = queue[nextIdx];
        if (nextTrk) {
          setCurrentIndex(nextIdx);
          playTrackInternal(nextTrk);
        } else {
          setStatus(PlayerStatus.STOPPED);
        }
      } else {
        setStatus(PlayerStatus.STOPPED);
      }
    };
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

  // Load lyrics when track changes
  useEffect(() => {
    if (!currentTrack) {
      setCurrentLyrics(null);
      return;
    }

    const loadLyrics = async () => {
      setLyricsLoading(true);
      try {
        console.log('[Lyrics] Loading for track:', {
          id: currentTrack.id,
          title: currentTrack.title,
          artist: currentTrack.artist,
          album: currentTrack.album,
          duration: currentTrack.duration
        });

        const lyrics = await LyricsService.getLyricsForTrack(
          currentTrack.id,
          currentTrack.title,
          currentTrack.artist,
          currentTrack.album,
          currentTrack.duration
        );

        console.log('[Lyrics] Loaded:', lyrics ? (lyrics.instrumental ? 'Instrumental' : `${lyrics.syncedLyrics?.length || 0} synced lines, plain: ${!!lyrics.plainLyrics}`) : 'Not found');
        setCurrentLyrics(lyrics);
      } catch (error) {
        console.error('[Lyrics] Failed to load:', error);
        setCurrentLyrics(null);
      } finally {
        setLyricsLoading(false);
      }
    };

    loadLyrics();
  }, [currentTrack]);

  // Liked Status Logic
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    if (!currentTrack) {
      setIsLiked(false);
      return;
    }

    // Check if track is already liked
    import('../services/likedSongsService').then(({ LikedSongsService }) => {
      LikedSongsService.isTrackLiked(currentTrack.id).then(liked => {
        setIsLiked(liked);
      });
    });
  }, [currentTrack]);

  const toggleLike = async () => {
    if (!currentTrack) return;

    const { LikedSongsService } = await import('../services/likedSongsService');

    if (isLiked) {
      await LikedSongsService.unlikeTrack(currentTrack.id);
      setIsLiked(false);
    } else {
      await LikedSongsService.likeTrack(currentTrack);
      setIsLiked(true);
    }
  };

  // Helper to actually load and play a track
  const playTrackInternal = async (track: Track) => {
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

  const playTrack = async (track: Track, newQueue?: Track[]) => {
    if (newQueue && newQueue.length > 0) {
      // New queue provided
      setOriginalQueue(newQueue);
      setQueue(shuffleEnabled ? shuffleArray([...newQueue]) : newQueue);

      // Find index of track in the new queue
      const trackQueue = shuffleEnabled ? shuffleArray([...newQueue]) : newQueue;
      const idx = trackQueue.findIndex(t => t.id === track.id);
      setCurrentIndex(idx >= 0 ? idx : 0);
    } else if (queue.length === 0) {
      // No queue, single track playback
      setQueue([track]);
      setOriginalQueue([track]);
      setCurrentIndex(0);
    }

    await playTrackInternal(track);
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

  const toggleShuffle = () => {
    setShuffleEnabled(prev => {
      const newShuffle = !prev;
      if (newShuffle) {
        // Shuffle ON: shuffle the original queue
        const shuffled = shuffleArray([...originalQueue]);
        setQueue(shuffled);
        // Update current index to match current track in shuffled queue
        if (currentTrack) {
          const idx = shuffled.findIndex(t => t.id === currentTrack.id);
          setCurrentIndex(idx >= 0 ? idx : 0);
        }
      } else {
        // Shuffle OFF: restore original queue
        setQueue(originalQueue);
        // Update current index to match current track in original queue
        if (currentTrack) {
          const idx = originalQueue.findIndex(t => t.id === currentTrack.id);
          setCurrentIndex(idx >= 0 ? idx : 0);
        }
      }
      return newShuffle;
    });
  };

  const cycleRepeatMode = () => {
    setRepeatMode(prev => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  };

  const nextTrack = () => {
    if (queue.length === 0) return;

    // Check if we're at the end of the queue
    const isAtEnd = currentIndex >= queue.length - 1;

    // Determine next index based on repeat mode
    let nextIdx: number;
    if (isAtEnd) {
      // At end of queue
      if (repeatMode === 'off') {
        // Don't advance if repeat is off and we're at the end
        return;
      } else {
        // Wrap around to start if repeat is 'all' or 'one'
        nextIdx = 0;
      }
    } else {
      // Not at end, just go to next track
      nextIdx = currentIndex + 1;
    }

    const nextTrk = queue[nextIdx];
    if (nextTrk) {
      setCurrentIndex(nextIdx);
      playTrackInternal(nextTrk);
    }
  };

  const prevTrack = () => {
    if (queue.length === 0) return;

    // If more than 3 seconds into song, restart it
    if (currentTime > 3) {
      seek(0);
      return;
    }

    // Determine previous index with wrap-around support
    let prevIdx: number;
    if (currentIndex === 0) {
      // At start of queue
      if (repeatMode === 'off') {
        // Don't go back if repeat is off and we're at the start
        seek(0); // Just restart current track
        return;
      } else {
        // Wrap around to last track if repeat is enabled
        prevIdx = queue.length - 1;
      }
    } else {
      // Not at start, just go to previous track
      prevIdx = currentIndex - 1;
    }

    const prevTrk = queue[prevIdx];
    if (prevTrk) {
      setCurrentIndex(prevIdx);
      playTrackInternal(prevTrk);
    }
  };

  return (
    <PlayerContext.Provider value={{
      currentTrack,
      status,
      currentTime,
      duration,
      volume,
      isMuted,
      shuffleEnabled,
      repeatMode,
      isExpanded,
      queue,
      currentLyrics,
      lyricsLoading,
      playTrack,
      togglePlay,
      seek,
      setVolume,
      toggleMute,
      nextTrack,
      prevTrack,
      toggleExpanded,
      toggleShuffle,
      cycleRepeatMode,
      isLiked,
      toggleLike
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