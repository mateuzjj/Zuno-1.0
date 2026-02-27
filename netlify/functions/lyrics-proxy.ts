import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';

const LRCLIB_API_BASE = 'https://lrclib.net/api';
const REQUEST_TIMEOUT_MS = 15000; // 15 seconds

/**
 * Netlify Function to proxy requests to lrclib.net API
 * This bypasses CORS restrictions and provides better error handling
 */
const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
    // Set CORS headers for all responses
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Accept',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    };

    // Handle preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers,
            body: '',
        };
    }

    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    try {
        // Parse the path to determine which lrclib endpoint to call
        // Remove function path and leading slash
        let path = event.path.replace('/.netlify/functions/lyrics-proxy', '');
        if (!path.startsWith('/')) {
            path = '/' + path;
        }

        const queryString = event.rawQuery || '';

        // Construct the lrclib API URL
        const lrclibUrl = `${LRCLIB_API_BASE}${path}${queryString ? `?${queryString}` : ''}`;

        console.log('[Lyrics Proxy] Forwarding request to:', lrclibUrl);

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        try {
            // Make request to lrclib API
            const response = await fetch(lrclibUrl, {
                method: 'GET',
                headers: {
                    'User-Agent': 'Zuno-Music-App/1.0',
                    'Accept': 'application/json',
                },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            // Get response body
            const contentType = response.headers.get('content-type') || '';
            let data: string;

            if (contentType.includes('application/json')) {
                const jsonData = await response.json();
                data = JSON.stringify(jsonData);
            } else {
                data = await response.text();
            }

            // Return response with CORS headers
            return {
                statusCode: response.status,
                headers: {
                    ...headers,
                    'Content-Type': contentType || 'application/json',
                },
                body: data,
            };
        } catch (fetchError) {
            clearTimeout(timeoutId);
            
            if (fetchError instanceof Error && fetchError.name === 'AbortError') {
                console.error('[Lyrics Proxy] Request timeout');
                return {
                    statusCode: 504,
                    headers,
                    body: JSON.stringify({
                        error: 'Gateway Timeout',
                        message: 'Request to LRCLIB API timed out',
                    }),
                };
            }
            throw fetchError;
        }
    } catch (error) {
        console.error('[Lyrics Proxy] Error:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const statusCode = errorMessage.includes('timeout') ? 504 : 500;

        return {
            statusCode,
            headers,
            body: JSON.stringify({
                error: 'Failed to fetch lyrics',
                message: errorMessage,
            }),
        };
    }
};

export { handler };
