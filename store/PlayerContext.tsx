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
  const [volumeBeforeMute, setVolumeBeforeMute] = useState(1);
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [queue, setQueue] = useState<Track[]>([]);
  const [originalQueue, setOriginalQueue] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [isExpanded, setIsExpanded] = useState(false);
  const [currentLyrics, setCurrentLyrics] = useState<Lyrics | null>(null);
  const [lyricsLoading, setLyricsLoading] = useState(false);

  // Refs to avoid stale closures in event handlers
  const repeatModeRef = useRef<RepeatMode>(repeatMode);
  const queueRef = useRef<Track[]>(queue);
  const currentIndexRef = useRef<number>(currentIndex);
  const statusRef = useRef<PlayerStatus>(status);
  const volumeRef = useRef<number>(volume);
  const isMutedRef = useRef<boolean>(isMuted);
  const playTrackInternalRef = useRef<((track: Track) => Promise<void>) | null>(null);
  const nextStreamUrlRef = useRef<{ id: string; url: string } | null>(null);

  // Helper function to shuffle an array
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
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
      let streamUrl: string;

      // 0. Check Preloaded URL first (Fastest for background playback)
      if (nextStreamUrlRef.current && nextStreamUrlRef.current.id === track.id) {
        streamUrl = nextStreamUrlRef.current.url;
        console.log('[Player] Using preloaded stream URL');
        // Clear cache
        nextStreamUrlRef.current = null;
      } else {
        // 1. Check if track is downloaded locally first
        const { DownloadService } = await import('../services/download');
        const downloadedUrl = await DownloadService.getDownloadedTrackUrl(track.id);

        if (downloadedUrl) {
          // Use downloaded track from IndexedDB
          streamUrl = downloadedUrl;
          console.log('[Player] Using downloaded track from IndexedDB');
        } else {
          // Get the stream URL from API (async operation)
          streamUrl = await api.getStreamUrl(track.id);
          if (!streamUrl) throw new Error("Stream URL not found");
        }
      }

      // 2. Set Audio Source - use refs to get current values
      audioRef.current.src = streamUrl;
      audioRef.current.volume = volumeRef.current;
      audioRef.current.muted = isMutedRef.current;

      // 3. Play
      try {
        await audioRef.current.play();
        setStatus(PlayerStatus.PLAYING);
        setIsExpanded(true); // Auto expand on play (optional, but good for "Modern" vibes)
      } catch (playError: any) {
        console.error("Play failed:", playError);
        // Se falhar por autoplay, tentar novamente quando houver interação do usuário
        if (playError.name === 'NotAllowedError') {
          console.warn('[Player] Autoplay blocked - waiting for user interaction');
          setStatus(PlayerStatus.PAUSED); // Marcar como pausado, não erro
        } else {
          setStatus(PlayerStatus.ERROR);
        }
      }

    } catch (err) {
      console.error("Playback failed:", err);
      setStatus(PlayerStatus.ERROR);
    }
  };

  // Update refs when values change
  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    playTrackInternalRef.current = playTrackInternal;
  }, []);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    audio.crossOrigin = "anonymous"; // Essential for visualizers or CDN issues

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      if (!Number.isNaN(audio.duration)) setDuration(audio.duration);
    };
    const handleEnded = () => {
      // Handle repeat and queue logic - use refs to get current values
      const currentRepeatMode = repeatModeRef.current;
      const currentQueue = queueRef.current;
      const currentIdx = currentIndexRef.current;
      const playTrackFn = playTrackInternalRef.current;

      console.log('[Player] Track ended. Queue length:', currentQueue.length, 'Current index:', currentIdx, 'Repeat mode:', currentRepeatMode);

      if (!playTrackFn) {
        console.warn('[Player] No playTrackFn available');
        return;
      }

      if (currentQueue.length === 0) {
        console.log('[Player] Queue is empty, stopping');
        setStatus(PlayerStatus.STOPPED);
        return;
      }

      if (currentRepeatMode === 'one') {
        // Repeat current track
        console.log('[Player] Repeating current track');
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(console.error);
        }
        return;
      }

      // Calculate next index
      const nextIdx = currentIdx + 1;

      if (nextIdx >= currentQueue.length) {
        // We're at the end of the queue
        if (currentRepeatMode === 'all') {
          // Loop back to the start
          console.log('[Player] End of queue, looping to start (repeat all)');
          const firstTrk = currentQueue[0];
          if (firstTrk) {
            setCurrentIndex(0);
            playTrackFn(firstTrk);
          }
        } else {
          // Repeat is off, stop playback
          console.log('[Player] End of queue, stopping (repeat off)');
          setStatus(PlayerStatus.STOPPED);
        }
      } else {
        // Normal case: advance to next track
        const nextTrk = currentQueue[nextIdx];
        console.log('[Player] Advancing to next track:', nextTrk?.title, 'at index', nextIdx);
        if (nextTrk) {
          setCurrentIndex(nextIdx);
          playTrackFn(nextTrk);
        } else {
          console.warn('[Player] Next track not found at index', nextIdx);
          setStatus(PlayerStatus.STOPPED);
        }
      }
    };
    const handleCanPlay = () => {
      // Tentar reproduzir se não estiver já tocando
      if (statusRef.current !== PlayerStatus.PLAYING) {
        audio.play()
          .then(() => {
            setStatus(PlayerStatus.PLAYING);
            console.log('[Player] Auto-play successful');
          })
          .catch(e => {
            console.warn('[Player] Auto-play blocked:', e);
            setStatus(PlayerStatus.PAUSED);
          });
      }
    };
    const handleLoadedData = () => {
      if (statusRef.current === PlayerStatus.LOADING) {
        audio.play()
          .then(() => setStatus(PlayerStatus.PLAYING))
          .catch(e => {
            console.warn('[Player] Auto-play blocked on loadeddata:', e);
            setStatus(PlayerStatus.PAUSED);
          });
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
    audio.addEventListener('loadeddata', handleLoadedData);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('durationchange', updateDuration);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('loadeddata', handleLoadedData);
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
        console.log('[Lyrics] Full lyrics object:', lyrics);
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

  // Preload Next Track URL (Fix for iOS Background Autoplay)
  useEffect(() => {
    if (!currentTrack || queue.length <= 1) return;

    const preloadNext = async () => {
      try {
        // Determine next track
        let nextIdx = currentIndex + 1;
        if (nextIdx >= queue.length) {
          if (repeatMode === 'off') return;
          nextIdx = 0;
        }

        const nextTrk = queue[nextIdx];
        if (!nextTrk || (nextStreamUrlRef.current && nextStreamUrlRef.current.id === nextTrk.id)) return;

        console.log('[Player] Preloading next track:', nextTrk.title);
        const { DownloadService } = await import('../services/download');
        const downloadedUrl = await DownloadService.getDownloadedTrackUrl(nextTrk.id);

        if (downloadedUrl) {
          nextStreamUrlRef.current = { id: nextTrk.id, url: downloadedUrl };
        } else {
          const url = await api.getStreamUrl(nextTrk.id);
          if (url) {
            nextStreamUrlRef.current = { id: nextTrk.id, url };
          }
        }
      } catch (e) {
        console.warn('[Player] Preload failed', e);
      }
    };

    preloadNext();
  }, [currentTrack, queue, currentIndex, repeatMode]);

  // Media Session API (Lock Screen Controls & Metadata)
  useEffect(() => {
    if (!currentTrack || !('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;

    try {
      // Update Metadata
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album || 'Zuno Music',
        artwork: [
          { src: currentTrack.coverUrl, sizes: '96x96', type: 'image/jpeg' },
          { src: currentTrack.coverUrl, sizes: '128x128', type: 'image/jpeg' },
          { src: currentTrack.coverUrl, sizes: '192x192', type: 'image/jpeg' },
          { src: currentTrack.coverUrl, sizes: '256x256', type: 'image/jpeg' },
          { src: currentTrack.coverUrl, sizes: '384x384', type: 'image/jpeg' },
          { src: currentTrack.coverUrl, sizes: '512x512', type: 'image/jpeg' },
        ]
      });

      // Update Playback State
      navigator.mediaSession.playbackState = status === PlayerStatus.PLAYING ? 'playing' : 'paused';
    } catch (error) {
      console.error("Error updating media session metadata:", error);
    }

  }, [currentTrack, status]);

  // Setup Media Session Action Handlers
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const actionHandlers = [
      ['play', () => {
        if (statusRef.current !== PlayerStatus.PLAYING) {
          playTrackInternalRef.current && audioRef.current &&
            audioRef.current.play().then(() => setStatus(PlayerStatus.PLAYING)).catch(console.error);
        }
      }],
      ['pause', () => {
        if (statusRef.current === PlayerStatus.PLAYING) {
          audioRef.current?.pause();
          setStatus(PlayerStatus.PAUSED);
        }
      }],
      ['previoustrack', () => {
        // Use the logic from prevTrack but accessible here. 
        // We can expose prevTrack via a ref or just duplicate the simple logic if we have access to queueRef etc.
        // It's better to expose the latest prevTrack function via a ref or just reuse the logic carefully.
        // Since playTrackInternalRef is available, we can replicate the logic or better yet:
        // Let's use a ref for the high-level control functions if they depend on state that might be stale in a closure
        // But `nextTrack` and `prevTrack` defined in the component depend on `queue`, `currentIndex`, etc.
        // To avoid stale closures in these handlers without re-binding them constantly, 
        // we can wrap the calls to `nextTrack` and `prevTrack` in a ref-based dispatcher or just use the refs we already have.

        // Re-implementing simplified logic using refs to ensure freshness:
        const queue = queueRef.current;
        const index = currentIndexRef.current;
        const repeat = repeatModeRef.current;
        const playFn = playTrackInternalRef.current;
        const audio = audioRef.current;

        if (!queue.length || !playFn) return;

        // Restart if > 3s
        if (audio && audio.currentTime > 3) {
          audio.currentTime = 0;
          return;
        }

        let newIdx = index - 1;
        if (newIdx < 0) {
          if (repeat === 'off') {
            if (audio) audio.currentTime = 0;
            return;
          }
          newIdx = queue.length - 1;
        }

        const track = queue[newIdx];
        if (track) {
          setCurrentIndex(newIdx); // This will trigger re-render but that's fine
          playFn(track);
        }
      }],
      ['nexttrack', () => {
        const queue = queueRef.current;
        const index = currentIndexRef.current;
        const repeat = repeatModeRef.current;
        const playFn = playTrackInternalRef.current;

        if (!queue.length || !playFn) return;

        let newIdx = index + 1;
        if (newIdx >= queue.length) {
          if (repeat === 'off') return;
          newIdx = 0;
        }

        const track = queue[newIdx];
        if (track) {
          setCurrentIndex(newIdx);
          playFn(track);
        }
      }],
      ['seekto', (details: MediaSessionActionDetails) => {
        if (details.seekTime !== undefined && audioRef.current) {
          audioRef.current.currentTime = details.seekTime;
          setCurrentTime(details.seekTime);
        }
      }]
    ];

    for (const [action, handler] of actionHandlers) {
      try {
        navigator.mediaSession.setActionHandler(action as MediaSessionAction, handler as MediaSessionActionHandler);
      } catch (error) {
        console.warn(`The media session action "${action}" is not supported yet.`);
      }
    }
  }, []); // Run once on mount, handlers use refs for fresh state
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

  const playTrack = async (track: Track, newQueue?: Track[]) => {
    console.log('[Player] playTrack called:', {
      trackTitle: track.title,
      newQueueLength: newQueue?.length,
      currentQueueLength: queue.length,
      shuffleEnabled
    });

    if (newQueue && newQueue.length > 0) {
      // New queue provided
      setOriginalQueue(newQueue);
      const finalQueue = shuffleEnabled ? shuffleArray([...newQueue]) : newQueue;
      setQueue(finalQueue);

      // Find index of track in the new queue
      const idx = finalQueue.findIndex(t => t.id === track.id);
      setCurrentIndex(idx >= 0 ? idx : 0);

      console.log('[Player] Queue setup:', {
        queueLength: finalQueue.length,
        currentIndex: idx >= 0 ? idx : 0,
        tracks: finalQueue.map(t => t.title)
      });
    } else if (queue.length === 0) {
      // No queue, single track playback
      setQueue([track]);
      setOriginalQueue([track]);
      setCurrentIndex(0);
      console.log('[Player] Single track playback');
    } else {
      console.log('[Player] Using existing queue, length:', queue.length);
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
      volumeRef.current = vol;

      // Se o volume foi ajustado para > 0 e estava mudo, desmutar
      if (vol > 0 && isMuted) {
        setIsMuted(false);
        audioRef.current.muted = false;
        isMutedRef.current = false;
      }

      // Atualizar o volume antes do mute se não estiver mudo
      if (!isMuted) {
        setVolumeBeforeMute(vol);
      }
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      const newMuted = !isMuted;

      if (newMuted) {
        // Mutando: salvar volume atual e definir para 0
        setVolumeBeforeMute(volume);
        audioRef.current.volume = 0;
        volumeRef.current = 0;
        setVolumeState(0); // Fix: Update state to keep it consistent
      } else {
        // Desmutando: restaurar volume anterior ou 0.5 se não houver
        const volumeToRestore = volumeBeforeMute > 0 ? volumeBeforeMute : 0.5;
        audioRef.current.volume = volumeToRestore;
        volumeRef.current = volumeToRestore;
        setVolumeState(volumeToRestore);
      }

      setIsMuted(newMuted);
      isMutedRef.current = newMuted;
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