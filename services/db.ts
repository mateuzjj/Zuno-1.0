import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Playlist, Track, Album, Artist } from '../types';

// Database Schema
interface ZunoDB extends DBSchema {
    playlists: {
        key: string;
        value: Playlist;
        indexes: { 'by-updatedAt': number };
    };
    likedTracks: {
        key: string;
        value: { track: Track; likedAt: number };
        indexes: { 'by-likedAt': number };
    };
    likedAlbums: {
        key: string;
        value: { album: Album; likedAt: number };
        indexes: { 'by-likedAt': number };
    };
    followedArtists: {
        key: string;
        value: { artist: Artist; followedAt: number };
        indexes: { 'by-followedAt': number };
    };
    lyricsCache: {
        key: string;
        value: {
            trackId: string;
            lyrics: any | null;
            timestamp: number;
            trackName: string;
            artistName: string;
        };
        indexes: { 'by-timestamp': number };
    };
    recommendationsCache: {
        key: string;
        value: {
            key: string;
            recommendations: Track[];
            timestamp: number;
        };
        indexes: { 'by-timestamp': number };
    };
    downloadedTracks: {
        key: string;
        value: {
            track: Track;
            audioBlob: Blob;
            coverBlob?: Blob;
            downloadedAt: number;
            fileSize: number;
        };
        indexes: { 'by-downloadedAt': number };
    };
}

const DB_NAME = 'ZunoMusicDB';
const DB_VERSION = 5;

let dbInstance: IDBPDatabase<ZunoDB> | null = null;
let dbPromise: Promise<IDBPDatabase<ZunoDB>> | null = null;

function createDB(): Promise<IDBPDatabase<ZunoDB>> {
    return openDB<ZunoDB>(DB_NAME, DB_VERSION, {
        blocked() {
            console.warn('[DB] Upgrade blocked — closing stale connections');
        },
        upgrade(db, oldVersion, newVersion, transaction) {
            // Create playlists store
            if (!db.objectStoreNames.contains('playlists')) {
                const playlistStore = db.createObjectStore('playlists', { keyPath: 'id' });
                playlistStore.createIndex('by-updatedAt', 'updatedAt');
            }

            // Create likedTracks store
            if (!db.objectStoreNames.contains('likedTracks')) {
                const likedStore = db.createObjectStore('likedTracks', { keyPath: 'track.id' });
                likedStore.createIndex('by-likedAt', 'likedAt');
            }

            // Create likedAlbums store (kept for schema consistency, data stored in localStorage)
            if (!db.objectStoreNames.contains('likedAlbums')) {
                const likedAlbumsStore = db.createObjectStore('likedAlbums', { keyPath: 'album.id' });
                likedAlbumsStore.createIndex('by-likedAt', 'likedAt');
            }

            // Create followedArtists store
            if (!db.objectStoreNames.contains('followedArtists')) {
                const followStore = db.createObjectStore('followedArtists', { keyPath: 'artist.id' });
                followStore.createIndex('by-followedAt', 'followedAt');
            }

            // Create lyricsCache store
            if (!db.objectStoreNames.contains('lyricsCache')) {
                const lyricsStore = db.createObjectStore('lyricsCache', { keyPath: 'trackId' });
                lyricsStore.createIndex('by-timestamp', 'timestamp');
            } else if (oldVersion < 3) {
                transaction.objectStore('lyricsCache').clear();
                console.log('[DB] Cleared lyrics cache for version upgrade');
            }

            // Create recommendationsCache store
            if (!db.objectStoreNames.contains('recommendationsCache')) {
                const recStore = db.createObjectStore('recommendationsCache', { keyPath: 'key' });
                recStore.createIndex('by-timestamp', 'timestamp');
            }

            // Create downloadedTracks store
            if (!db.objectStoreNames.contains('downloadedTracks')) {
                const downloadedStore = db.createObjectStore('downloadedTracks', { keyPath: 'track.id' });
                downloadedStore.createIndex('by-downloadedAt', 'downloadedAt');
            }
        },
    });
}

function deleteDB(): Promise<void> {
    return new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase(DB_NAME);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
    });
}

function verifyStores(db: IDBPDatabase<ZunoDB>): boolean {
    const required = ['playlists', 'likedTracks', 'followedArtists', 'lyricsCache', 'downloadedTracks'];
    return required.every(s => db.objectStoreNames.contains(s));
}

export async function getDB(): Promise<IDBPDatabase<ZunoDB>> {
    if (dbInstance) return dbInstance;
    if (dbPromise) return dbPromise;

    const doOpen = async (): Promise<IDBPDatabase<ZunoDB>> => {
        try {
            let db = await createDB();
            if (!verifyStores(db)) {
                console.warn('[DB] Missing stores, recreating database...');
                db.close();
                await deleteDB();
                db = await createDB();
            }
            dbInstance = db;
            return db;
        } catch (err) {
            console.error('[DB] Failed to open, resetting database...', err);
            dbInstance = null;
            await deleteDB();
            const db = await createDB();
            dbInstance = db;
            return db;
        } finally {
            dbPromise = null;
        }
    };

    dbPromise = doOpen();
    return dbPromise;
}

export function closeDB(): void {
    if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
    }
}
