// Spotify OAuth PKCE Authentication

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;

// Dynamic redirect URI - works with localhost and LAN IPs
const getRedirectUri = () => {
    const origin = window.location.origin;
    return `${origin}/spotify/callback`;
};

const REDIRECT_URI = getRedirectUri();

const SCOPES = [
    'user-library-read',
    'user-follow-read',
    'playlist-read-private',
    'playlist-read-collaborative',
    'user-read-private',
    'user-read-email',
];

// Generate random string for PKCE
function generateRandomString(length: number): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return values.reduce((acc, x) => acc + possible[x % possible.length], '');
}

// SHA256 hash
async function sha256(plain: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return window.crypto.subtle.digest('SHA-256', data);
}

// Base64 encode
function base64encode(input: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(input)))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

/**
 * Initiate Spotify OAuth login
 */
export async function loginWithSpotify(): Promise<void> {
    // Generate or reuse code_verifier
    let codeVerifier = sessionStorage.getItem('spotify_code_verifier');

    if (!codeVerifier) {
        codeVerifier = generateRandomString(64);
        sessionStorage.setItem('spotify_code_verifier', codeVerifier);
        console.log('[SpotifyAuth] Generated new code_verifier');
    } else {
        console.log('[SpotifyAuth] Reusing existing code_verifier');
    }

    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64encode(hashed);

    const authUrl = new URL('https://accounts.spotify.com/authorize');
    authUrl.searchParams.append('client_id', CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', SCOPES.join(' '));
    authUrl.searchParams.append('code_challenge_method', 'S256');
    authUrl.searchParams.append('code_challenge', codeChallenge);

    console.log('[SpotifyAuth] Redirecting to Spotify authorize URL');
    window.location.href = authUrl.toString();
}

/**
 * Exchange authorization code for access token
 */
async function requestAccessToken(code: string): Promise<string> {
    console.log('[SpotifyAuth] Starting token exchange, code:', code.substring(0, 20) + '...');

    const codeVerifier = sessionStorage.getItem('spotify_code_verifier');
    if (!codeVerifier) {
        console.error('[SpotifyAuth] ERROR: Code verifier not found in sessionStorage!');
        throw new Error('Code verifier not found');
    }

    console.log('[SpotifyAuth] Found code_verifier in sessionStorage');

    const params = new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
    });

    console.log('[SpotifyAuth] Requesting token from Spotify...');
    console.log('[SpotifyAuth] redirect_uri:', REDIRECT_URI);

    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('[SpotifyAuth] Token exchange FAILED:', response.status, errorText);
        throw new Error(`Failed to get access token: ${response.status}`);
    }

    const data = await response.json();
    console.log('[SpotifyAuth] Token exchange SUCCESS! Got access_token');

    // Store tokens
    const expiresAt = Date.now() + (data.expires_in * 1000);
    sessionStorage.setItem('spotify_access_token', data.access_token);
    sessionStorage.setItem('spotify_token_expires_at', expiresAt.toString());
    if (data.refresh_token) {
        sessionStorage.setItem('spotify_refresh_token', data.refresh_token);
        console.log('[SpotifyAuth] Also stored refresh_token');
    }

    // Clean up code verifier
    sessionStorage.removeItem('spotify_code_verifier');
    console.log('[SpotifyAuth] Cleaned up code_verifier');

    return data.access_token;
}

/**
 * Refresh access token
 */
async function refreshAccessToken(): Promise<string> {
    const refreshToken = sessionStorage.getItem('spotify_refresh_token');
    if (!refreshToken) {
        throw new Error('No refresh token available');
    }

    const params = new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
    });

    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
    });

    if (!response.ok) {
        throw new Error('Failed to refresh token');
    }

    const data = await response.json();

    const expiresAt = Date.now() + (data.expires_in * 1000);
    sessionStorage.setItem('spotify_access_token', data.access_token);
    sessionStorage.setItem('spotify_token_expires_at', expiresAt.toString());

    if (data.refresh_token) {
        sessionStorage.setItem('spotify_refresh_token', data.refresh_token);
    }

    return data.access_token;
}

/**
 * Get valid access token (refresh if needed)
 */
export async function getAccessToken(): Promise<string | null> {
    const token = sessionStorage.getItem('spotify_access_token');
    const expiresAt = sessionStorage.getItem('spotify_token_expires_at');

    if (token && expiresAt) {
        const isExpired = Date.now() >= parseInt(expiresAt);
        if (!isExpired) {
            console.log('[SpotifyAuth] Using existing valid token');
            return token;
        }

        // Try to refresh
        try {
            console.log('[SpotifyAuth] Token expired, refreshing...');
            return await refreshAccessToken();
        } catch (error) {
            console.error('[SpotifyAuth] Failed to refresh token:', error);
            logout();
            return null;
        }
    }

    // Check for auth code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
        console.log('[SpotifyAuth] Found authorization code in URL, exchanging for token...');
        try {
            const newToken = await requestAccessToken(code);
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
            console.log('[SpotifyAuth] Successfully exchanged code for token, URL cleaned');
            return newToken;
        } catch (error) {
            console.error('[SpotifyAuth] Failed to exchange code for token:', error);
            return null;
        }
    }

    console.log('[SpotifyAuth] No token and no code - not authenticated');
    return null;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
    const token = sessionStorage.getItem('spotify_access_token');
    const expiresAt = sessionStorage.getItem('spotify_token_expires_at');

    if (!token || !expiresAt) return false;

    return Date.now() < parseInt(expiresAt);
}

/**
 * Logout and clear tokens
 */
export function logout(): void {
    sessionStorage.removeItem('spotify_access_token');
    sessionStorage.removeItem('spotify_refresh_token');
    sessionStorage.removeItem('spotify_token_expires_at');
    sessionStorage.removeItem('spotify_code_verifier');
}

export const SpotifyAuth = {
    login: loginWithSpotify,
    getAccessToken,
    isAuthenticated,
    logout,
};
