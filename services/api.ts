import { MOCK_ALBUMS, MOCK_PLAYLISTS, MOCK_TRACKS } from "../constants";
import { Album, Playlist, Track } from "../types";

// API Instances provided in reference
// Prioritize know working instances
const API_INSTANCES = [
  "https://wolf.qqdl.site",
  "https://tidal-api.binimum.org",
  "https://triton.squid.wtf",
  "https://maus.qqdl.site",
  "https://vogel.qqdl.site",
  "https://katze.qqdl.site",
  "https://hund.qqdl.site",
  "https://tidal.kinoplus.online"
];

const RATE_LIMIT_ERROR_MESSAGE = 'Too Many Requests. Please wait a moment and try again.';

// Helper to normalize response (from Monochrome)
function normalizeSearchResponse(data: any, key: string) {
  // Basic recursion to find the section
  const findSection = (source: any, k: string, visited: Set<any>): any => {
    if (!source || typeof source !== 'object') return;
    if (Array.isArray(source)) {
      for (const e of source) {
        const f = findSection(e, k, visited);
        if (f) return f;
      }
      return;
    }
    if (visited.has(source)) return;
    visited.add(source);
    if ('items' in source && Array.isArray(source.items)) return source;
    if (k in source) {
      const f = findSection(source[k], k, visited);
      if (f) return f;
    }
    for (const v of Object.values(source)) {
      const f = findSection(v, k, visited);
      if (f) return f;
    }
  };

  const section = findSection(data, key, new Set());
  const items = section?.items ?? [];
  return {
    items,
    limit: section?.limit ?? items.length,
    offset: section?.offset ?? 0,
    totalNumberOfItems: section?.totalNumberOfItems ?? items.length
  };
}

function getArtistPictureUrl(id: string | undefined, size = '750'): string {
  if (!id) return `https://picsum.photos/seed/${Math.random()}/${size}`;
  const formattedId = id.replace(/-/g, '/');
  return `https://resources.tidal.com/images/${formattedId}/${size}x${size}.jpg`;
}

// Helper to delay retry
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to fetch with retry across instances (Load Balancing & Failover)
async function fetchWithRetry(relativePath: string, options: RequestInit = {}): Promise<Response> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  // Try preferred instances first, then shuffle the rest
  const preferred = API_INSTANCES.slice(0, 2);
  const others = API_INSTANCES.slice(2).sort(() => Math.random() - 0.5);
  const sortedInstances = [...preferred, ...others];

  for (const baseUrl of sortedInstances) {
    const url = baseUrl.endsWith('/')
      ? `${baseUrl}${relativePath.startsWith('/') ? relativePath.substring(1) : relativePath}`
      : `${baseUrl}${relativePath.startsWith('/') ? relativePath : '/' + relativePath}`;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);

        if (response.status === 429) {
          throw new Error(RATE_LIMIT_ERROR_MESSAGE);
        }

        if (response.ok) {
          return response;
        }

        if (response.status >= 500 && attempt < maxRetries) {
          await delay(200 * attempt);
          continue;
        }

        // If 4xx error (not 429), it might be a real error (not found), so we might not want to retry
        if (response.status >= 400 && response.status < 500) {
          // However, sometimes instances return 404 if they are broken, so we try a few times across instances
          throw new Error(`Request failed with status ${response.status}`);
        }

        lastError = new Error(`Request failed with status ${response.status}`);
        break; // Break inner loop to try next instance
      } catch (error: any) {
        lastError = error;
        if (attempt < maxRetries) {
          await delay(200 * attempt);
        }
      }
    }
  }
  throw lastError || new Error(`All API instances failed for: ${relativePath}`);
}

// Helper to extract stream URL from manifest (Reference Logic)
function extractStreamUrlFromManifest(manifest: string): string | null {
  try {
    const decoded = atob(manifest);
    try {
      const parsed = JSON.parse(decoded);
      if (parsed?.urls?.[0]) {
        return parsed.urls[0];
      }
    } catch {
      // If not JSON, try regex extraction
      const match = decoded.match(/https?:\/\/[\w\-.~:?#[@!$&'()*+,;=%/]+/);
      return match ? match[0] : null;
    }
    return null;
  } catch (error) {
    console.error('Failed to decode manifest:', error);
    return null;
  }
}

// Helper to build cover URL (Reference Logic)
function getCoverUrl(id: string | undefined, size = '640'): string {
  if (!id) {
    return `https://picsum.photos/seed/${Math.random()}/${size}`;
  }
  // Tidal resources use path structure with slashes
  const formattedId = id.replace(/-/g, '/');
  return `https://resources.tidal.com/images/${formattedId}/${size}x${size}.jpg`;
}

// Mapper: Converts Raw API Track to ZUNO Track
function mapApiTrackToTrack(item: any, fallbackArtistName?: string): Track {
  const albumCover = item.album?.cover || item.cover || '';
  const artistName = item.artist?.name || fallbackArtistName || 'Unknown Artist';
  // Save numeric IDs for recommendation endpoints (/artist/similar/, /album/similar/)
  const artistId = item.artist?.id?.toString() ||
    (Array.isArray(item.artists) && item.artists[0]?.id?.toString()) ||
    undefined;
  const albumId = item.album?.id?.toString() || undefined;

  return {
    id: item.id?.toString(),
    title: item.title,
    artist: artistName,
    artistId,
    album: item.album?.title || 'Unknown Album',
    albumId,
    coverUrl: getCoverUrl(albumCover, '320'),
    duration: item.duration,
    streamUrl: '', // Fetched on demand via getStreamUrl
    // Required recommendation fields — defaults (Tidal API doesn't provide these)
    genre: [],
    bpm: 0,
    energy: 0.5,
    valence: 0.5,
    popularity: 0
  };
}

// Helper function to get featured albums (defined before api object)
async function getFeaturedAlbumsHelper(): Promise<Album[]> {
  try {
    const queries = [
      'New Releases', 'Top Albums', 'Trending', 'Hits',
      'Best of', 'Classics', 'Essential'
    ];

    const randomQuery = queries[Math.floor(Math.random() * queries.length)];

    // Add timeout to prevent infinite loading
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Album search timeout')), 5000)
    );

    const response = await Promise.race([
      fetchWithRetry(`/search/?al=${encodeURIComponent(randomQuery)}&limit=12`),
      timeoutPromise
    ]);

    const data = await response.json();
    const normalized = normalizeSearchResponse(data, 'albums');

    const seen = new Set<string>();
    const albums = normalized.items
      .map((item: any) => {
        // Try multiple ways to get artist name
        let artistName = 'Unknown';
        if (item.artist?.name) {
          artistName = item.artist.name;
        } else if (item.artists && Array.isArray(item.artists) && item.artists.length > 0) {
          // Handle array of artists (take first one)
          artistName = item.artists[0]?.name || item.artists[0] || 'Unknown';
        } else if (typeof item.artist === 'string') {
          artistName = item.artist;
        } else if (item.artistName) {
          artistName = item.artistName;
        }

        return {
          id: item.id?.toString(),
          title: item.title,
          artist: artistName,
          coverUrl: item.cover ? getCoverUrl(item.cover) : '',
          year: item.releaseDate ? new Date(item.releaseDate).getFullYear() : undefined,
          releaseDate: item.releaseDate
        };
      })
      .filter((a: Album) => {
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      })
      .slice(0, 12);

    return albums.length > 0 ? albums : MOCK_ALBUMS;
  } catch (error) {
    console.warn("Failed to get featured albums, using mocks", error);
    return MOCK_ALBUMS;
  }
}

// Helper function to get featured playlists (defined before api object)
async function getFeaturedPlaylistsHelper(): Promise<{ playlists: Playlist[], query: string }> {
  const queries = [
    'Top 50', 'Viral', 'Trending', 'New Music', 'Hits',
    'Chill', 'Workout', 'Focus', 'Party', 'Relax',
    'Summer', 'Classics', 'Indie', 'Hip Hop', 'Electronic'
  ];
  const randomQuery = queries[Math.floor(Math.random() * queries.length)];

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Playlist search timeout')), 5000)
    );

    const response = await Promise.race([
      fetchWithRetry(`/search/?pl=${encodeURIComponent(randomQuery)}&limit=12`),
      timeoutPromise
    ]);

    const data = await response.json();
    const normalized = normalizeSearchResponse(data, 'playlists');

    const seen = new Set<string>();
    const playlists = normalized.items
      .map((item: any) => ({
        id: item.id?.toString(),
        name: item.title || item.name || 'Unknown Playlist',
        description: item.description || undefined,
        coverUrl: item.cover ? getCoverUrl(item.cover) : undefined,
        tracks: [],
        createdAt: item.createdAt || Date.now(),
        updatedAt: item.updatedAt || Date.now()
      }))
      .filter((p: Playlist) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      })
      .slice(0, 12);

    return {
      playlists: playlists.length > 0 ? playlists : MOCK_PLAYLISTS,
      query: randomQuery
    };
  } catch (error) {
    console.warn("Failed to get featured playlists, using mocks", error);
    return { playlists: MOCK_PLAYLISTS, query: randomQuery };
  }
}

export const api = {
  // Enhanced Home Data with real API calls
  getFeatured: async (): Promise<{ albums: Album[], playlists: Playlist[], recent: Track[], playlistSectionTitle: string }> => {
    try {
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise<{ albums: Album[], playlists: Playlist[], recent: Track[], playlistSectionTitle: string }>((_, reject) =>
        setTimeout(() => reject(new Error('getFeatured timeout')), 10000)
      );

      const featuredPromise = (async () => {
        // Try to get real data from API using helper functions
        const [albums, playlistResult] = await Promise.all([
          getFeaturedAlbumsHelper().catch(() => MOCK_ALBUMS),
          getFeaturedPlaylistsHelper().catch(() => ({ playlists: MOCK_PLAYLISTS, query: 'Destaque' }))
        ]);

        // Get recent tracks from personalized feed with timeout
        const recent = await Promise.race([
          import('./zunoApi')
            .then(m => m.ZunoAPI.getNextFeedSection(0))
            .then(section => section.tracks.slice(0, 3))
            .catch(() => MOCK_TRACKS.slice(0, 3)),
          new Promise<Track[]>((_, reject) =>
            setTimeout(() => reject(new Error('Recent tracks timeout')), 5000)
          )
        ]).catch(() => MOCK_TRACKS.slice(0, 3));

        return {
          albums,
          playlists: playlistResult.playlists,
          recent,
          playlistSectionTitle: `Playlists: ${playlistResult.query}`
        };
      })();

      return await Promise.race([featuredPromise, timeoutPromise]);
    } catch (error) {
      console.warn("Failed to get featured data, using mocks", error);
      return {
        albums: MOCK_ALBUMS,
        playlists: MOCK_PLAYLISTS,
        recent: MOCK_TRACKS.slice(0, 3),
        playlistSectionTitle: 'Playlists em Destaque'
      };
    }
  },

  // Real Search Implementation with Relevance Boost
  search: async (query: string, limit: number = 20, offset: number = 0): Promise<Track[]> => {
    try {
      const normalizedQuery = query.trim().toLowerCase();
      const response = await fetchWithRetry(`/search/?s=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`);
      const data = await response.json();

      let items: any[] = [];

      // Handle various response structures
      if (data.data?.items) {
        // v2 structure (wolf, binimum)
        items = data.data.items;
      } else if (data.tracks?.items) {
        items = data.tracks.items;
      } else if (data.data?.tracks?.items) {
        items = data.data.tracks.items;
      } else if (Array.isArray(data)) {
        items = data;
      }

      let tracks = items.map((t: any) => mapApiTrackToTrack(t));

      // Deduplication: Remove duplicates based on title + artist
      const seen = new Set<string>();
      tracks = tracks.filter(t => {
        const key = `${t.title?.toLowerCase()}_${t.artist?.toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Relevance Boost: Tracks where artist or title matches query exactly go first
      tracks.sort((a, b) => {
        const aArtistMatch = a.artist?.toLowerCase().includes(normalizedQuery) ? 1 : 0;
        const aTitleMatch = a.title?.toLowerCase().includes(normalizedQuery) ? 1 : 0;
        const bArtistMatch = b.artist?.toLowerCase().includes(normalizedQuery) ? 1 : 0;
        const bTitleMatch = b.title?.toLowerCase().includes(normalizedQuery) ? 1 : 0;

        const aScore = (aArtistMatch * 2) + aTitleMatch; // Artist match is more important
        const bScore = (bArtistMatch * 2) + bTitleMatch;

        return bScore - aScore; // Higher score first
      });

      return tracks;

    } catch (error) {
      console.warn("API Search failed", error);
      return [];
    }
  },

  // Artist Search
  searchArtists: async (query: string, limit: number = 6, offset: number = 0): Promise<{ items: any[], total: number }> => {
    try {
      // Add timeout to prevent long waits
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Artist search timeout')), 6000)
      );

      const searchPromise = fetchWithRetry(`/search/?a=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`);
      const response = await Promise.race([searchPromise, timeoutPromise]);

      const data = await response.json();
      const normalized = normalizeSearchResponse(data, 'artists');

      const items = normalized.items.map((item: any) => ({
        id: item.id?.toString(),
        name: item.name,
        picture: getArtistPictureUrl(item.picture || item.cover, '320'),
        type: item.type
      }));

      return {
        items,
        total: normalized.totalNumberOfItems
      };
    } catch (error) {
      console.warn("Artist search failed", error);
      return { items: [], total: 0 };
    }
  },

  // Album Search
  searchAlbums: async (query: string, limit: number = 6, offset: number = 0): Promise<{ items: any[], total: number }> => {
    try {
      // Add timeout to prevent long waits
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Album search timeout')), 6000)
      );

      const searchPromise = fetchWithRetry(`/search/?al=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`);
      const response = await Promise.race([searchPromise, timeoutPromise]);

      const data = await response.json();
      const normalized = normalizeSearchResponse(data, 'albums');

      const items = normalized.items.map((item: any) => {
        // Debug: log first item structure to understand API response
        if (normalized.items.indexOf(item) === 0) {
          console.log('[Album Search] Sample item structure:', {
            id: item.id,
            title: item.title,
            artist: item.artist,
            artists: item.artists,
            artistName: item.artistName,
            allKeys: Object.keys(item)
          });
        }

        // Try multiple ways to get artist name
        let artistName = 'Unknown';
        if (item.artist?.name) {
          artistName = item.artist.name;
        } else if (item.artists && Array.isArray(item.artists) && item.artists.length > 0) {
          // Handle array of artists (take first one)
          artistName = item.artists[0]?.name || item.artists[0] || 'Unknown';
        } else if (typeof item.artist === 'string') {
          artistName = item.artist;
        } else if (item.artistName) {
          artistName = item.artistName;
        }

        return {
          id: item.id?.toString(),
          title: item.title,
          artist: artistName,
          coverUrl: item.cover ? getCoverUrl(item.cover) : '',
          year: item.releaseDate ? new Date(item.releaseDate).getFullYear() : undefined
        };
      });

      return {
        items,
        total: normalized.totalNumberOfItems
      };
    } catch (error) {
      console.warn("Album search failed", error);
      return { items: [], total: 0 };
    }
  },

  // Get Artist Details (Bio + Top Tracks + Albums)
  getArtist: async (artistId: string) => {
    try {
      const [primaryResponse, contentResponse] = await Promise.all([
        fetchWithRetry(`/artist/?id=${artistId}`),
        fetchWithRetry(`/artist/?f=${artistId}`)
      ]);

      const primaryJson = await primaryResponse.json();
      const primaryData = primaryJson.data || primaryJson;
      const rawArtist = primaryData.artist || (Array.isArray(primaryData) ? primaryData[0] : primaryData);

      const artist = {
        id: rawArtist.id?.toString(),
        name: rawArtist.name,
        picture: getArtistPictureUrl(rawArtist.picture),
        type: rawArtist.type
      };

      const contentJson = await contentResponse.json();
      const contentData = contentJson.data || contentJson;

      // Aggregate tracks and albums from content response (Monochrome Logic)
      const entries = Array.isArray(contentData) ? contentData : [contentData];
      const albumMap = new Map();
      const trackMap = new Map();

      const scan = (value: any, visited = new Set()) => {
        if (!value || typeof value !== 'object' || visited.has(value)) return;
        visited.add(value);

        if (Array.isArray(value)) {
          value.forEach(item => scan(item, visited));
          return;
        }

        const item = value.item || value;
        // Check for album
        if (item?.id && 'numberOfTracks' in item) {
          albumMap.set(item.id, {
            id: item.id?.toString(),
            title: item.title,
            artist: item.artist?.name,
            coverUrl: getCoverUrl(item.cover),
            releaseDate: item.releaseDate
          });
        }
        // Check for track
        if (item?.id && item.duration && item.album) {
          trackMap.set(item.id, mapApiTrackToTrack(item));
        }

        Object.values(value).forEach(nested => scan(nested, visited));
      };

      entries.forEach(entry => scan(entry));

      const albums = Array.from(albumMap.values()).sort((a, b) =>
        new Date(b.releaseDate || 0).getTime() - new Date(a.releaseDate || 0).getTime()
      );

      // Pass artist name to track mapper
      const tracks = Array.from(trackMap.values())
        .map(track => ({
          ...track,
          artist: artist.name || track.artist // Ensure artist name is correct
        }))
        .slice(0, 10); // Top 10

      return { artist, albums, tracks };

    } catch (error) {
      console.error("Get Artist failed", error);
      throw error;
    }
  },

  // Real Stream URL Extraction
  getStreamUrl: async (trackId: string): Promise<string> => {
    try {
      // Try High Quality first, fallback logic could be added
      const quality = 'HIGH';
      const response = await fetchWithRetry(`/track/?id=${trackId}&quality=${quality}`);
      const jsonResponse = await response.json();

      const data = jsonResponse.data || jsonResponse;

      // 1. Check for direct URL
      if (data.OriginalTrackUrl) return data.OriginalTrackUrl;

      // 2. Check for Manifest
      if (data.manifest) {
        const url = extractStreamUrlFromManifest(data.manifest);
        if (url) return url;
      }

      // 3. Check for specific audioQuality info
      if (data.audioQuality === 'HI_RES' || data.audioQuality === 'LOSSLESS') {
        // Sometimes manifest needs different handling for HiRes, but the extractor above covers most.
      }

      throw new Error('No stream URL found in response');

    } catch (error) {
      console.warn("Failed to fetch stream URL, using Demo Fallback", error);

      // Fallback for the hardcoded Mock Tracks OR Real Tracks when API fails
      // This ensures the player UI always works for the demo
      const mockTrack = MOCK_TRACKS.find(t => t.id === trackId);
      if (mockTrack && mockTrack.streamUrl) return mockTrack.streamUrl;

      // Ultimate Fallback (Copyright Free Demo Track)
      // "Impact Moderato" by Kevin MacLeod (incompetech.com)
      return "https://cdn.pixabay.com/audio/2022/01/18/audio_d0a13f69d0.mp3";
    }
  },

  getCoverUrl,

  // Get Album Details (Tracks)
  getAlbum: async (albumId: string) => {
    try {
      const response = await fetchWithRetry(`/album/?id=${albumId}`);
      const jsonData = await response.json();
      const data = jsonData.data || jsonData;

      // Try multiple ways to get artist name
      let artistName: string | undefined;
      if (data.artist?.name) {
        artistName = data.artist.name;
      } else if (data.artists && Array.isArray(data.artists) && data.artists.length > 0) {
        // Handle array of artists (take first one)
        artistName = data.artists[0]?.name || data.artists[0];
      } else if (typeof data.artist === 'string') {
        artistName = data.artist;
      } else if (data.artistName) {
        artistName = data.artistName;
      }

      let album: any = {
        id: data.id?.toString(),
        title: data.title,
        artist: artistName,
        coverUrl: getCoverUrl(data.cover),
        releaseDate: data.releaseDate
      };

      let rawTracks: any[] = [];
      if (data.tracks?.items) {
        rawTracks = data.tracks.items;
      } else if (data.items) {
        rawTracks = data.items;
      }

      // Map tracks, handling nested "item" property (Monochrome logic)
      const tracks = rawTracks.map((t: any) => {
        const item = t.item || t;
        return mapApiTrackToTrack(item);
      });

      // Fix: If album metadata is missing in root but exists in tracks
      if (!album.title && tracks.length > 0) {
        album.title = tracks[0].album;
        album.artist = tracks[0].artist;
        album.coverUrl = tracks[0].coverUrl;
      }

      return { album, tracks };

    } catch (e) {
      console.error("Get Album failed", e);
      throw e;
    }
  },

  // Search for Playlists (Tidal API compatible)
  searchPlaylists: async (query: string, limit: number = 20, offset: number = 0): Promise<{ items: Playlist[], total: number }> => {
    try {
      const response = await fetchWithRetry(`/search/?pl=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`);
      const data = await response.json();
      const normalized = normalizeSearchResponse(data, 'playlists');

      const items = normalized.items.map((item: any) => ({
        id: item.id?.toString(),
        name: item.title || item.name || 'Unknown Playlist',
        description: item.description || undefined,
        coverUrl: item.cover ? getCoverUrl(item.cover) : undefined,
        tracks: [], // Tracks are fetched separately via getPlaylist
        createdAt: item.createdAt || Date.now(),
        updatedAt: item.updatedAt || Date.now()
      }));

      return {
        items,
        total: normalized.totalNumberOfItems
      };
    } catch (error) {
      console.warn("Playlist search failed", error);
      return { items: [], total: 0 };
    }
  },

  // Get Playlist Details (Tracks)
  getPlaylist: async (playlistId: string): Promise<{ playlist: Playlist, tracks: Track[] }> => {
    try {
      const response = await fetchWithRetry(`/playlist/?id=${playlistId}`);
      const jsonData = await response.json();
      const data = jsonData.data || jsonData;

      const playlist: Playlist = {
        id: data.id?.toString(),
        name: data.title || data.name || 'Unknown Playlist',
        description: data.description || undefined,
        coverUrl: data.cover ? getCoverUrl(data.cover) : undefined,
        tracks: [],
        createdAt: data.createdAt || Date.now(),
        updatedAt: data.updatedAt || Date.now()
      };

      let rawTracks: any[] = [];
      if (data.tracks?.items) {
        rawTracks = data.tracks.items;
      } else if (data.items) {
        rawTracks = data.items;
      }

      const tracks = rawTracks.map((t: any) => {
        const item = t.item || t;
        return mapApiTrackToTrack(item);
      });

      return { playlist, tracks };
    } catch (e) {
      console.error("Get Playlist failed", e);
      throw e;
    }
  },

  // Get Featured/Recommended Playlists (using search with popular queries)
  getFeaturedPlaylists: async (): Promise<Playlist[]> => {
    const result = await getFeaturedPlaylistsHelper();
    return result.playlists;
  },

  // Get Featured Albums (using search with popular queries)
  getFeaturedAlbums: async (): Promise<Album[]> => {
    return getFeaturedAlbumsHelper();
  },

  // ─── Recommendation Endpoints (from Monochrome) ───────────────────────────

  /**
   * Fetches artists similar to a given artist (alinhado ao Monochrome).
   * Uses Tidal's /artist/similar/?id= endpoint.
   * @param artistId — numeric Tidal artist ID (stored in Track.artistId)
   */
  getSimilarArtists: async (artistId: string): Promise<any[]> => {
    try {
      const response = await fetchWithRetry(`/artist/similar/?id=${artistId}`);
      const data = await response.json();
      // Mesma ordem do Monochrome + suporte a resposta aninhada (data.data.artists)
      const raw: any[] =
        data.artists ||
        data.items ||
        (data.data && (Array.isArray(data.data) ? data.data : data.data.artists || data.data.items)) ||
        (Array.isArray(data) ? data : []);
      // Só artistas: têm "name"; excluir álbuns (numberOfTracks / title sem name)
      const artistItems = raw.filter(
        (a: any) =>
          a &&
          typeof (a.name ?? a.artist?.name) === 'string' &&
          (a.name ?? a.artist?.name).trim() !== '' &&
          !('numberOfTracks' in a)
      );
      // prepareArtist-style: artistTypes → type (Monochrome)
      const mapped = artistItems.map((a: any) => {
        const name = (a.name ?? a.artist?.name ?? '').trim();
        const type = a.type ?? (Array.isArray(a.artistTypes) && a.artistTypes.length > 0 ? a.artistTypes[0] : undefined);
        const id = (a.id ?? a.artist?.id)?.toString();
        return { id, name, picture: getArtistPictureUrl(a.picture ?? a.cover ?? a.coverUrl, '320'), type };
      });
      return mapped.filter((a) => a.id && a.name);
    } catch (e) {
      console.warn('[getSimilarArtists] failed:', e);
      return [];
    }
  },

  /**
   * Fetches albums similar to a given album.
   * Uses Tidal's /album/similar/ endpoint.
   * @param albumId — numeric Tidal album ID (stored in Track.albumId)
   */
  getSimilarAlbums: async (albumId: string): Promise<any[]> => {
    try {
      const response = await fetchWithRetry(`/album/similar/?id=${albumId}`);
      const data = await response.json();
      const items: any[] = data.items || data.albums || data.data || (Array.isArray(data) ? data : []);
      return items.map((a: any) => ({
        id: a.id?.toString(),
        title: a.title,
        artist: a.artist?.name || 'Unknown',
        coverUrl: getCoverUrl(a.cover)
      }));
    } catch (e) {
      console.warn('[getSimilarAlbums] failed:', e);
      return [];
    }
  },

  /**
   * Fetches a Tidal Mix (algorithmically curated playlist).
   * Uses Tidal's /mix/ endpoint.
   * @param mixId — Tidal Mix ID (e.g. from a known mix)
   */
  getMix: async (mixId: string): Promise<{ mix: any; tracks: Track[] }> => {
    try {
      const response = await fetchWithRetry(`/mix/?id=${mixId}`);
      const data = await response.json();
      const mixData = data.mix;
      const items: any[] = data.items || [];
      if (!mixData) throw new Error('Mix metadata not found');
      const tracks = items.map((i: any) => mapApiTrackToTrack(i.item || i));
      const mix = {
        id: mixData.id,
        title: mixData.title,
        subTitle: mixData.subTitle,
        description: mixData.description,
        mixType: mixData.mixType,
        cover: mixData.images?.LARGE?.url || mixData.images?.MEDIUM?.url || mixData.images?.SMALL?.url || null
      };
      return { mix, tracks };
    } catch (e) {
      console.warn('[getMix] failed:', e);
      return { mix: null, tracks: [] };
    }
  },

  /**
   * Fetches top tracks from artists similar to those in the user's history.
   * Core of the "Similar Artist Discovery" feed strategy.
   * @param artistIds — array of numeric Tidal artist IDs
   * @param excludeIds — track IDs already shown (to avoid repeats)
   * @param limit — max tracks to return
   */
  getTracksFromSimilarArtists: async (
    artistIds: string[],
    excludeIds: string[] = [],
    limit = 20
  ): Promise<Track[]> => {
    if (artistIds.length === 0) return [];
    const seenIds = new Set(excludeIds);
    const result: Track[] = [];

    // Pick up to 3 random artist IDs to avoid too many requests
    const sample = artistIds.sort(() => Math.random() - 0.5).slice(0, 3);

    await Promise.all(sample.map(async (artistId) => {
      try {
        // 1. Get similar artists
        const similar = await api.getSimilarArtists(artistId);
        if (similar.length === 0) return;

        // 2. Pick one random similar artist
        const pick = similar[Math.floor(Math.random() * similar.length)];
        if (!pick?.id) return;

        // 3. Search tracks by that artist
        const tracks = await api.search(pick.name, 10);
        const fresh = tracks.filter(t => !seenIds.has(t.id));
        fresh.forEach(t => { seenIds.add(t.id); result.push(t); });
      } catch (e) {
        console.warn('[getTracksFromSimilarArtists] artist fetch failed:', e);
      }
    }));

    return result.sort(() => Math.random() - 0.5).slice(0, limit);
  },

  /**
   * Recommended tracks from seed tracks (Monochrome-style).
   * Extracts artist IDs from seeds → getArtist(id) → collect that artist's tracks.
   * If fewer than 3 artists from seeds, tries search to get full metadata (artistId).
   * @param tracks — seed tracks (e.g. from history); must have artistId when possible
   * @param limit — max tracks to return
   */
  getRecommendedTracksForPlaylist: async (tracks: Track[], limit = 20): Promise<Track[]> => {
    let artistIds = [...new Set(tracks.filter(t => t.artistId).map(t => t.artistId as string))];

    if (artistIds.length < 3) {
      for (const track of tracks.slice(0, 5)) {
        if (artistIds.length >= 5) break;
        try {
          const query = `"${track.title}" ${track.artist || ''}`.trim();
          const searchResults = await api.search(query, 5);
          const first = searchResults[0];
          if (first?.artistId && !artistIds.includes(first.artistId)) {
            artistIds.push(first.artistId);
          }
        } catch (e) {
          console.warn('[getRecommendedTracksForPlaylist] search fallback failed:', e);
        }
      }
    }

    if (artistIds.length === 0) return [];

    const seenTrackIds = new Set(tracks.map(t => t.id));
    const recommended: Track[] = [];
    const artistsToProcess = artistIds.slice(0, 5);

    for (const artistId of artistsToProcess) {
      try {
        const artistData = await api.getArtist(artistId);
        if (artistData?.tracks?.length) {
          const newTracks = artistData.tracks
            .filter(t => !seenTrackIds.has(t.id))
            .slice(0, 4);
          newTracks.forEach(t => {
            seenTrackIds.add(t.id);
            recommended.push(t);
          });
        }
      } catch (e) {
        console.warn('[getRecommendedTracksForPlaylist] getArtist failed for', artistId, e);
      }
    }

    return recommended.sort(() => Math.random() - 0.5).slice(0, limit);
  },

  /**
   * Fetches top tracks for a specific artist.
   * Uses Tidal's /artist/toptracks/ endpoint.
   * @param artistId — numeric Tidal artist ID
   * @param limit — max tracks to return
   */
  getArtistTopTracks: async (artistId: string, limit = 10): Promise<Track[]> => {
    try {
      const response = await fetchWithRetry(`/artist/toptracks/?id=${artistId}&limit=${limit}`);
      const data = await response.json();
      const items: any[] = data.items || data.tracks || data.data || (Array.isArray(data) ? data : []);
      return items.map((i: any) => mapApiTrackToTrack(i.item || i)).slice(0, limit);
    } catch (e) {
      console.warn('[getArtistTopTracks] failed:', e);
      return [];
    }
  }
};