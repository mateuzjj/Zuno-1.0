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
function mapApiTrackToTrack(item: any): Track {
  const albumCover = item.album?.cover || item.cover || '';
  return {
    id: item.id?.toString(),
    title: item.title,
    artist: item.artist?.name || 'Unknown Artist',
    album: item.album?.title || 'Unknown Album',
    coverUrl: getCoverUrl(albumCover, '320'),
    duration: item.duration,
    streamUrl: '' // Fetched on demand via getStreamUrl
  };
}

export const api = {
  // Mocked Home Data (since we don't have user history on the backend yet)
  getFeatured: async (): Promise<{ albums: Album[], playlists: Playlist[], recent: Track[] }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          albums: MOCK_ALBUMS,
          playlists: MOCK_PLAYLISTS,
          recent: MOCK_TRACKS.slice(0, 3)
        });
      }, 300);
    });
  },

  // Real Search Implementation with Relevance Boost
  search: async (query: string): Promise<Track[]> => {
    try {
      const normalizedQuery = query.trim().toLowerCase();
      const response = await fetchWithRetry(`/search/?s=${encodeURIComponent(query)}&limit=25`);
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
  searchArtists: async (query: string): Promise<any[]> => {
    try {
      const response = await fetchWithRetry(`/search/?a=${encodeURIComponent(query)}&limit=10`);
      const data = await response.json();
      const normalized = normalizeSearchResponse(data, 'artists');

      return normalized.items.map((item: any) => ({
        id: item.id?.toString(),
        name: item.name,
        picture: item.picture || item.cover || getArtistPictureUrl(item.picture),
        type: item.type
      }));
    } catch (error) {
      console.warn("Artist search failed", error);
      return [];
    }
  },

  // Album Search
  searchAlbums: async (query: string): Promise<any[]> => {
    try {
      const response = await fetchWithRetry(`/search/?al=${encodeURIComponent(query)}&limit=10`);
      const data = await response.json();
      const normalized = normalizeSearchResponse(data, 'albums');

      return normalized.items.map((item: any) => ({
        id: item.id?.toString(),
        title: item.title,
        artist: item.artist?.name || 'Unknown',
        coverUrl: item.cover ? getCoverUrl(item.cover) : '',
        year: item.releaseDate ? new Date(item.releaseDate).getFullYear() : undefined
      }));
    } catch (error) {
      console.warn("Album search failed", error);
      return [];
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

      const tracks = Array.from(trackMap.values()).slice(0, 10); // Top 10

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
      console.error("Failed to fetch stream URL", error);

      // Fallback for the hardcoded Mock Tracks (t1, t2, t3...) 
      // so the demo still works if API fails or for initial items
      const mockTrack = MOCK_TRACKS.find(t => t.id === trackId);
      if (mockTrack) return mockTrack.streamUrl!;

      throw error;
    }
  },

  getCoverUrl
};