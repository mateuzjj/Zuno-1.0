// Spotify OAuth PKCE Authentication

// TEMPORARY: Hardcoded fallback while Netlify env var is being configured
// TODO: Remove this once VITE_SPOTIFY_CLIENT_ID is properly set in Netlify
const FALLBACK_CLIENT_ID = '4abe3f7f4bde4b66807e5a1a24740e7';

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || FALLBACK_CLIENT_ID;

// Validate CLIENT_ID is configured
if (!CLIENT_ID || CLIENT_ID === 'undefined') {
    console.error('[SpotifyAuth] CRITICAL: VITE_SPOTIFY_CLIENT_ID is not configured!');
    console.error('[SpotifyAuth] Please ensure the environment variable is set in your .env file or Netlify dashboard');
    console.error('[SpotifyAuth] Current value:', CLIENT_ID);
} else if (CLIENT_ID === FALLBACK_CLIENT_ID) {
    console.warn('[SpotifyAuth] WARNING: Using hardcoded CLIENT_ID fallback');
    console.warn('[SpotifyAuth] Please configure VITE_SPOTIFY_CLIENT_ID in Netlify for production');
}

// Dynamic redirect URI - works with localhost and LAN IPs
const getRedirectUri = () => {
    const origin = window.location.origin;
    return `${origin}/spotify/callback`;
};

const REDIRECT_URI = getRedirectUri();

console.log('[SpotifyAuth] Initialized with CLIENT_ID:', CLIENT_ID ? `${CLIENT_ID.substring(0, 8)}...` : 'MISSING');
console.log('[SpotifyAuth] Redirect URI:', REDIRECT_URI);

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

// SHA-256 polyfill for insecure contexts where crypto.subtle is unavailable
function sha256Polyfill(str: string): ArrayBuffer {
    // Convert string to bytes
    const encoder = new TextEncoder();
    const data = encoder.encode(str);

    // SHA-256 constants
    const K = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];

    // Initial hash values
    let H = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
        0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ];

    // Pre-processing
    const msgLen = data.length;
    const bitLen = msgLen * 8;
    const paddedLen = Math.ceil((msgLen + 9) / 64) * 64;
    const padded = new Uint8Array(paddedLen);
    padded.set(data);
    padded[msgLen] = 0x80;

    // Append length as 64-bit big-endian
    const view = new DataView(padded.buffer);
    view.setUint32(paddedLen - 4, bitLen & 0xffffffff, false);
    view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);

    // Process each 512-bit chunk
    for (let chunkStart = 0; chunkStart < paddedLen; chunkStart += 64) {
        const W = new Uint32Array(64);

        // Copy chunk into first 16 words
        for (let i = 0; i < 16; i++) {
            W[i] = view.getUint32(chunkStart + i * 4, false);
        }

        // Extend the first 16 words into the remaining 48 words
        for (let i = 16; i < 64; i++) {
            const s0 = rightRotate(W[i - 15], 7) ^ rightRotate(W[i - 15], 18) ^ (W[i - 15] >>> 3);
            const s1 = rightRotate(W[i - 2], 17) ^ rightRotate(W[i - 2], 19) ^ (W[i - 2] >>> 10);
            W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
        }

        // Initialize working variables
        let [a, b, c, d, e, f, g, h] = H;

        // Main loop
        for (let i = 0; i < 64; i++) {
            const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
            const ch = (e & f) ^ (~e & g);
            const temp1 = (h + S1 + ch + K[i] + W[i]) >>> 0;
            const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
            const maj = (a & b) ^ (a & c) ^ (b & c);
            const temp2 = (S0 + maj) >>> 0;

            h = g;
            g = f;
            f = e;
            e = (d + temp1) >>> 0;
            d = c;
            c = b;
            b = a;
            a = (temp1 + temp2) >>> 0;
        }

        // Add compressed chunk to current hash value
        H = [
            (H[0] + a) >>> 0, (H[1] + b) >>> 0, (H[2] + c) >>> 0, (H[3] + d) >>> 0,
            (H[4] + e) >>> 0, (H[5] + f) >>> 0, (H[6] + g) >>> 0, (H[7] + h) >>> 0
        ];
    }

    // Produce final hash value
    const result = new ArrayBuffer(32);
    const resultView = new DataView(result);
    for (let i = 0; i < 8; i++) {
        resultView.setUint32(i * 4, H[i], false);
    }

    return result;
}

// Helper function for right rotation
function rightRotate(n: number, bits: number): number {
    return (n >>> bits) | (n << (32 - bits));
}

// SHA256 hash with fallback for insecure contexts
async function sha256(plain: string): Promise<ArrayBuffer> {
    // Check if crypto.subtle is available (secure context)
    if (window.crypto?.subtle?.digest) {
        // Use native Web Crypto API
        const encoder = new TextEncoder();
        const data = encoder.encode(plain);
        return window.crypto.subtle.digest('SHA-256', data);
    } else {
        // Fallback to polyfill for insecure contexts
        console.warn('[SpotifyAuth] crypto.subtle not available, using SHA-256 polyfill. For better security, serve this app over HTTPS.');
        return sha256Polyfill(plain);
    }
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
    // Validate CLIENT_ID before starting auth flow
    if (!CLIENT_ID || CLIENT_ID === 'undefined') {
        const errorMsg = 'Spotify Client ID is not configured. Please check your environment variables.';
        console.error('[SpotifyAuth]', errorMsg);
        throw new Error(errorMsg);
    }

    console.log('[SpotifyAuth] Starting OAuth flow...');
    console.log('[SpotifyAuth] CLIENT_ID:', CLIENT_ID ? `${CLIENT_ID.substring(0, 8)}...` : 'MISSING');
    console.log('[SpotifyAuth] REDIRECT_URI:', REDIRECT_URI);

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
    console.log('[SpotifyAuth] Full auth URL:', authUrl.toString().substring(0, 100) + '...');

    // Store redirect info for after callback
    sessionStorage.setItem('spotify_redirect_after_auth', window.location.pathname);

    window.location.href = authUrl.toString();
}

/**
 * Exchange authorization code for access token
 */
async function requestAccessToken(code: string): Promise<string> {
    console.log('[SpotifyAuth] Starting token exchange');
    console.log('[SpotifyAuth] Code received (first 20 chars):', code.substring(0, 20) + '...');
    console.log('[SpotifyAuth] Code length:', code.length);

    const codeVerifier = sessionStorage.getItem('spotify_code_verifier');
    if (!codeVerifier) {
        console.error('[SpotifyAuth] ERROR: Code verifier not found in sessionStorage!');
        console.error('[SpotifyAuth] Available sessionStorage keys:', Object.keys(sessionStorage));
        throw new Error('Code verifier not found. Please try connecting again.');
    }

    console.log('[SpotifyAuth] Found code_verifier in sessionStorage');
    console.log('[SpotifyAuth] CLIENT_ID:', CLIENT_ID ? `${CLIENT_ID.substring(0, 8)}...` : 'MISSING');
    console.log('[SpotifyAuth] REDIRECT_URI:', REDIRECT_URI);

    const params = new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
    });

    console.log('[SpotifyAuth] Requesting token from Spotify...');
    console.log('[SpotifyAuth] Request params (without code_verifier):', {
        client_id: CLIENT_ID ? `${CLIENT_ID.substring(0, 8)}...` : 'MISSING',
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
        code_length: code.length,
    });

    try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params,
        });

        console.log('[SpotifyAuth] Response status:', response.status);
        console.log('[SpotifyAuth] Response ok:', response.ok);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[SpotifyAuth] Token exchange FAILED');
            console.error('[SpotifyAuth] Status:', response.status);
            console.error('[SpotifyAuth] Status text:', response.statusText);
            console.error('[SpotifyAuth] Error response:', errorText);

            let errorMessage = `Failed to get access token: ${response.status}`;
            try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.error_description) {
                    errorMessage = errorJson.error_description;
                } else if (errorJson.error) {
                    errorMessage = errorJson.error;
                }
            } catch {
                // If not JSON, use the text as is
                errorMessage = errorText || errorMessage;
            }

            throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log('[SpotifyAuth] Token exchange SUCCESS!');
        console.log('[SpotifyAuth] Got access_token (length):', data.access_token?.length || 0);
        console.log('[SpotifyAuth] Expires in:', data.expires_in, 'seconds');
        console.log('[SpotifyAuth] Has refresh_token:', !!data.refresh_token);

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
    } catch (error: any) {
        console.error('[SpotifyAuth] Exception during token exchange:', error);
        if (error.message) {
            throw error;
        }
        throw new Error(`Failed to exchange code for token: ${error}`);
    }
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
    const error = urlParams.get('error');

    if (error) {
        console.error('[SpotifyAuth] OAuth error received:', error);
        throw new Error(`Spotify authorization error: ${error}`);
    }

    if (code) {
        console.log('[SpotifyAuth] Found authorization code in URL, exchanging for token...');
        console.log('[SpotifyAuth] Code (first 20 chars):', code.substring(0, 20));
        try {
            const newToken = await requestAccessToken(code);
            // Clean URL - remove code and state from query string
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('code');
            newUrl.searchParams.delete('state');
            newUrl.searchParams.delete('error');
            window.history.replaceState({}, document.title, newUrl.pathname + newUrl.search);
            console.log('[SpotifyAuth] Successfully exchanged code for token, URL cleaned');
            return newToken;
        } catch (error: any) {
            console.error('[SpotifyAuth] Failed to exchange code for token:', error);
            // Clean URL even on error
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('code');
            newUrl.searchParams.delete('state');
            newUrl.searchParams.delete('error');
            window.history.replaceState({}, document.title, newUrl.pathname + newUrl.search);
            throw error; // Re-throw to let caller handle
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
