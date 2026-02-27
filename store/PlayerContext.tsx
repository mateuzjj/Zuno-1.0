import React, { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from 'react';
import { PlayerState, PlayerStatus, Track, RepeatMode, Lyrics } from '../types';
import { api } from '../services/api';
import { LyricsService } from '../services/lyricsService';
import { equalizerManager, EQ_FREQUENCIES, EQ_PRESETS } from '../services/equalizer';
import { toast } from '../components/UI/Toast';

let _cachedDownloadModule: any = null;
async function getCachedDownloadService() {
  if (!_cachedDownloadModule) {
    _cachedDownloadModule = await import('../services/download');
  }
  return _cachedDownloadModule;
}

const RADIO_CHUNK_SIZE = 3;

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let _loadIdCounter = 0;

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
  radioLoading: boolean;
  startRadioFromTrack: (track: Track) => Promise<void>;
  equalizerEnabled: boolean;
  setEqualizerEnabled: (enabled: boolean) => void;
  eqGains: number[];
  setEqBandGain: (index: number, gain: number) => void;
  applyEqPreset: (key: string) => void;
  resetEq: () => void;
  eqPresets: typeof EQ_PRESETS;
  eqFrequencies: number[];
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
  const [equalizerEnabled, setEqualizerEnabledState] = useState(() => equalizerManager.isEnabled());
  const [eqGains, setEqGainsState] = useState<number[]>(() => equalizerManager.getGains());

  // Refs to avoid stale closures in event handlers
  const repeatModeRef = useRef<RepeatMode>(repeatMode);
  const queueRef = useRef<Track[]>(queue);
  const currentIndexRef = useRef<number>(currentIndex);
  const statusRef = useRef<PlayerStatus>(status);
  const volumeRef = useRef<number>(volume);
  const isMutedRef = useRef<boolean>(isMuted);
  const playTrackInternalRef = useRef<((track: Track) => Promise<void>) | null>(null);
  const nextStreamUrlRef = useRef<{ id: string; url: string; blobUrl?: string } | null>(null);
  const activeLoadIdRef = useRef(0);

  const playTrackInternal = async (track: Track) => {
    if (!audioRef.current) return;

    const loadId = ++_loadIdCounter;
    activeLoadIdRef.current = loadId;

    audioRef.current.pause();
    const prevSrc = audioRef.current.src;
    if (prevSrc && prevSrc.startsWith('blob:')) {
      URL.revokeObjectURL(prevSrc);
    }
    audioRef.current.removeAttribute('src');
    audioRef.current.load();

    setCurrentTrack(track);
    setStatus(PlayerStatus.LOADING);
    setCurrentTime(0);
    setDuration(track.duration || 0);

    try {
      let streamUrl: string;

      const preloaded = nextStreamUrlRef.current;
      if (preloaded && preloaded.id === track.id) {
        streamUrl = preloaded.blobUrl || preloaded.url;
        nextStreamUrlRef.current = null;
      } else {
        const { DownloadService } = await getCachedDownloadService();
        if (activeLoadIdRef.current !== loadId) return;

        const downloadedUrl = await DownloadService.getDownloadedTrackUrl(track.id);
        if (activeLoadIdRef.current !== loadId) return;

        if (downloadedUrl) {
          streamUrl = downloadedUrl;
        } else {
          streamUrl = await api.getStreamUrl(track.id);
          if (activeLoadIdRef.current !== loadId) return;
          if (!streamUrl) throw new Error("Stream URL not found");
        }
      }

      if (activeLoadIdRef.current !== loadId) return;

      if (!equalizerManager.isInitialized() && audioRef.current) {
        equalizerManager.init(audioRef.current);
      }
      audioRef.current.src = streamUrl;
      if (equalizerManager.isInitialized()) {
        audioRef.current.volume = 1;
        equalizerManager.setVolume(isMutedRef.current ? 0 : volumeRef.current);
      } else {
        audioRef.current.volume = volumeRef.current;
        audioRef.current.muted = isMutedRef.current;
      }

      await equalizerManager.resume();
      if (activeLoadIdRef.current !== loadId) return;
      await audioRef.current.play();
      setStatus(PlayerStatus.PLAYING);

    } catch (err: any) {
      if (activeLoadIdRef.current !== loadId) return;
      if (err.name === 'NotAllowedError') {
        console.warn('[Player] Autoplay blocked - waiting for user interaction');
        setStatus(PlayerStatus.PAUSED);
      } else if (err.name === 'AbortError') {
        // Interrupted by a newer load — ignore silently
      } else {
        console.error('[Player] Playback failed:', err);
        setStatus(PlayerStatus.ERROR);
      }
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
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";
    // iOS: playsInline + não usar Web Audio no equalizer = áudio continua com tela bloqueada (Media Session API).
    audio.setAttribute('playsinline', 'true');
    (audio as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
    // EQ init no primeiro play (gesto do usuário) para AudioContext funcionar no iOS/Chrome

    let lastTimeUpdate = 0;
    const updateTime = () => {
      const now = performance.now();
      if (now - lastTimeUpdate < 250) return;
      lastTimeUpdate = now;
      setCurrentTime(audio.currentTime);
    };
    const updateDuration = () => {
      if (!Number.isNaN(audio.duration)) setDuration(audio.duration);
    };
    const handleEnded = () => {
      const currentRepeatMode = repeatModeRef.current;
      const currentQueue = queueRef.current;
      const currentIdx = currentIndexRef.current;
      const playTrackFn = playTrackInternalRef.current;

      if (!playTrackFn || currentQueue.length === 0) {
        setStatus(PlayerStatus.STOPPED);
        return;
      }

      if (currentRepeatMode === 'one') {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(console.error);
        }
        return;
      }

      const nextIdx = currentIdx + 1;

      if (nextIdx >= currentQueue.length) {
        if (currentRepeatMode === 'all') {
          const firstTrk = currentQueue[0];
          if (firstTrk) {
            setCurrentIndex(0);
            playTrackFn(firstTrk);
          }
        } else {
          setStatus(PlayerStatus.STOPPED);
        }
      } else {
        const nextTrk = currentQueue[nextIdx];
        if (nextTrk) {
          setCurrentIndex(nextIdx);
          playTrackFn(nextTrk);
        } else {
          setStatus(PlayerStatus.STOPPED);
        }
      }
    };
    const handleError = (e: any) => {
      if (!audio.src || audio.src === '' || audio.src === window.location.href) return;
      console.error('[Player] Audio error:', e);
      setStatus(PlayerStatus.ERROR);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('durationchange', updateDuration);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('durationchange', updateDuration);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.pause();
      audio.src = "";
    };
  }, []);

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
        const lyrics = await LyricsService.getLyricsForTrack(
          currentTrack.id,
          currentTrack.title,
          currentTrack.artist,
          currentTrack.album,
          currentTrack.duration
        );
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

  useEffect(() => {
    if (!currentTrack || queue.length <= 1) return;

    const controller = new AbortController();

    const preloadNext = async () => {
      try {
        let nextIdx = currentIndex + 1;
        if (nextIdx >= queue.length) {
          if (repeatMode === 'off') return;
          nextIdx = 0;
        }

        const nextTrk = queue[nextIdx];
        if (!nextTrk) return;
        if (nextStreamUrlRef.current?.id === nextTrk.id) return;

        // Revoke old preloaded blob if switching to a different track
        if (nextStreamUrlRef.current?.blobUrl) {
          URL.revokeObjectURL(nextStreamUrlRef.current.blobUrl);
          nextStreamUrlRef.current = null;
        }

        const { DownloadService } = await getCachedDownloadService();
        const downloadedUrl = await DownloadService.getDownloadedTrackUrl(nextTrk.id);

        if (downloadedUrl) {
          nextStreamUrlRef.current = { id: nextTrk.id, url: downloadedUrl, blobUrl: downloadedUrl };
          return;
        }

        const url = await api.getStreamUrl(nextTrk.id);
        if (!url || controller.signal.aborted) return;

        // Pre-fetch actual audio data as blob for instant playback on track switch
        try {
          const response = await fetch(url, { signal: controller.signal });
          if (response.ok) {
            const blob = await response.blob();
            if (controller.signal.aborted) return;
            const blobUrl = URL.createObjectURL(blob);
            nextStreamUrlRef.current = { id: nextTrk.id, url, blobUrl };
          } else {
            nextStreamUrlRef.current = { id: nextTrk.id, url };
          }
        } catch (e: any) {
          if (e.name === 'AbortError') return;
          // URL-only fallback if blob fetch fails
          nextStreamUrlRef.current = { id: nextTrk.id, url };
        }
      } catch {
        // Preload is best-effort; failures are non-critical
      }
    };

    preloadNext();

    return () => { controller.abort(); };
  }, [currentTrack, queue, currentIndex, repeatMode]);

  // Media Session API (Lock Screen / Control Center no iOS — necessário para áudio em segundo plano)
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    try {
      if (!currentTrack || typeof MediaMetadata === 'undefined') {
        navigator.mediaSession.metadata = null;
        navigator.mediaSession.playbackState = 'none';
        return;
      }

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

    import('../services/likedSongsService').then(({ LikedSongsService }) => {
      LikedSongsService.isTrackLiked(currentTrack.id).then(liked => {
        setIsLiked(liked);
      }).catch(() => setIsLiked(false));
    }).catch(() => setIsLiked(false));
  }, [currentTrack]);

  const toggleLike = async () => {
    if (!currentTrack) return;

    try {
      const { LikedSongsService } = await import('../services/likedSongsService');

      if (isLiked) {
        await LikedSongsService.unlikeTrack(currentTrack.id);
        setIsLiked(false);
      } else {
        await LikedSongsService.likeTrack(currentTrack);
        setIsLiked(true);
      }
    } catch (err) {
      console.error('[Player] toggleLike failed:', err);
    }
  };

  const [radioLoading, setRadioLoading] = useState(false);

  const playTrack = async (track: Track, newQueue?: Track[]) => {
    if (newQueue && newQueue.length > 0) {
      setOriginalQueue(newQueue);
      const finalQueue = shuffleEnabled ? shuffleArray([...newQueue]) : newQueue;
      setQueue(finalQueue);
      const idx = finalQueue.findIndex(t => t.id === track.id);
      setCurrentIndex(idx >= 0 ? idx : 0);
    } else if (queue.length === 0) {
      setQueue([track]);
      setOriginalQueue([track]);
      setCurrentIndex(0);
    }

    await playTrackInternal(track);
  };

  const startRadioFromTrack = useCallback(async (track: Track) => {
    setRadioLoading(true);
    try {
      let artistId: string | undefined = track.artistId;
      if (!artistId && track.artist) {
        const { items } = await api.searchArtists(track.artist, 1);
        artistId = items[0]?.id;
      }
      if (!artistId) {
        toast.show('Não foi possível identificar o artista.', 'info');
        return;
      }
      const { artist, albums } = await api.getArtist(artistId);
      if (!albums?.length) {
        toast.show('Nenhum álbum encontrado para este artista.', 'info');
        return;
      }
      const trackSet = new Set<string>();
      const allTracks: Track[] = [];
      for (let i = 0; i < albums.length; i += RADIO_CHUNK_SIZE) {
        const chunk = albums.slice(i, i + RADIO_CHUNK_SIZE);
        const results = await Promise.all(
          chunk.map((a) => api.getAlbum(a.id).then((r) => r.tracks).catch(() => []))
        );
        results.flat().forEach((t) => {
          if (!trackSet.has(t.id)) {
            trackSet.add(t.id);
            allTracks.push(t);
          }
        });
      }
      if (allTracks.length === 0) {
        toast.show('Nenhuma faixa encontrada.', 'info');
        return;
      }
      const shuffled = shuffleArray(allTracks);
      playTrack(shuffled[0], shuffled);
      toast.show(`Radio: ${shuffled.length} faixas de ${artist.name}`, 'success');
    } catch (e) {
      console.error('[Player] startRadioFromTrack failed:', e);
      toast.show('Não foi possível iniciar o rádio.', 'error');
    } finally {
      setRadioLoading(false);
    }
  }, [playTrack]);

  const togglePlay = async () => {
    if (!audioRef.current || !currentTrack) return;

    if (status === PlayerStatus.PLAYING) {
      audioRef.current.pause();
      setStatus(PlayerStatus.PAUSED);
    } else if (status === PlayerStatus.PAUSED || status === PlayerStatus.STOPPED) {
      try {
        await equalizerManager.resume();
        await audioRef.current.play();
        setStatus(PlayerStatus.PLAYING);
      } catch (e) {
        console.error('[Player] togglePlay failed:', e);
      }
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
      const effectiveVol = Math.max(0, Math.min(1, vol));
      if (equalizerManager.isInitialized()) {
        audioRef.current.volume = 1;
        equalizerManager.setVolume(effectiveVol);
      } else {
        audioRef.current.volume = effectiveVol;
      }
      setVolumeState(effectiveVol);
      volumeRef.current = effectiveVol;

      if (effectiveVol > 0 && isMuted) {
        setIsMuted(false);
        audioRef.current.muted = false;
        isMutedRef.current = false;
      }
      if (!isMuted) {
        setVolumeBeforeMute(effectiveVol);
      }
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const newMuted = !isMuted;
    if (newMuted) {
      setVolumeBeforeMute(volume);
      if (equalizerManager.isInitialized()) {
        audioRef.current.volume = 1;
        equalizerManager.setVolume(0);
      } else {
        audioRef.current.volume = 0;
      }
      volumeRef.current = 0;
      setVolumeState(0);
    } else {
      const volumeToRestore = volumeBeforeMute > 0 ? volumeBeforeMute : 0.5;
      if (equalizerManager.isInitialized()) {
        audioRef.current.volume = 1;
        equalizerManager.setVolume(volumeToRestore);
      } else {
        audioRef.current.volume = volumeToRestore;
      }
      volumeRef.current = volumeToRestore;
      setVolumeState(volumeToRestore);
    }
    setIsMuted(newMuted);
    isMutedRef.current = newMuted;
    audioRef.current.muted = newMuted;
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

  const setEqualizerEnabled = (enabled: boolean) => {
    equalizerManager.setEnabled(enabled);
    setEqualizerEnabledState(enabled);
  };

  const setEqBandGain = (index: number, gain: number) => {
    equalizerManager.setBandGain(index, gain);
    setEqGainsState(equalizerManager.getGains());
  };

  const applyEqPreset = (key: string) => {
    equalizerManager.applyPreset(key);
    setEqGainsState(equalizerManager.getGains());
  };

  const resetEq = () => {
    equalizerManager.reset();
    setEqGainsState(equalizerManager.getGains());
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
      toggleLike,
      radioLoading,
      startRadioFromTrack,
      equalizerEnabled,
      setEqualizerEnabled,
      eqGains,
      setEqBandGain,
      applyEqPreset,
      resetEq,
      eqPresets: EQ_PRESETS,
      eqFrequencies: EQ_FREQUENCIES
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