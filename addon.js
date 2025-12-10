/**
 * NTVStream Stremio Addon
 * Serverless-compatible for Vercel deployment
 */

const { addonBuilder } = require('stremio-addon-sdk');
const { SERVERS, CATEGORIES, getCatalogDefinitions } = require('./servers');
const { getEventsByCategory, searchEvents, getEventById, fetchStreamUrls } = require('./scraper');

// Addon manifest
const manifest = {
    id: 'community.ntvstream.sports',
    version: '1.0.0',
    name: 'NTVStream Sports',
    description: 'Live sports streaming from NTVStream. Watch Football, Basketball, Hockey, Cricket, UFC, Boxing and more!',
    logo: 'https://img.icons8.com/color/512/stadium.png',
    background: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1920',
    resources: ['catalog', 'meta', 'stream'],
    types: ['tv'],
    idPrefixes: ['ntv_'],
    catalogs: getCatalogDefinitions(),
    behaviorHints: {
        configurable: false
    }
};

// Create builder
const builder = new addonBuilder(manifest);

// Store handlers
let catalogHandler, metaHandler, streamHandler;

/**
 * Convert event to Stremio meta format
 */
function eventToMeta(event) {
    if (!event) return null;
    
    const icon = event.matchedCategory?.icon || '🏆';
    return {
        id: event.id,
        type: 'tv',
        name: event.isLive ? `🔴 ${event.name}` : event.name,
        poster: `https://img.icons8.com/color/512/${event.matchedCategory?.id || 'sports'}.png`,
        posterShape: 'square',
        background: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1920',
        description: `${icon} ${event.matchedCategory?.name || 'Sports'}\n📺 ${event.serverName || 'NTVStream'}\n⏰ ${event.timeStr || 'Live'}\n📡 ${event.sources || 1} source(s)`,
        genres: event.matchedCategory?.genres || ['Sports'],
        releaseInfo: event.timeStr || 'Live',
        runtime: event.isLive ? 'LIVE NOW' : 'Scheduled'
    };
}

/**
 * Catalog Handler
 */
builder.defineCatalogHandler(async ({ type, id, extra }) => {
    try {
        console.log(`📋 Catalog request: type=${type}, id=${id}`);
        
        let events = [];
        
        // Add timeout for Vercel
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Catalog fetch timeout')), 8000)
        );
        
        if (extra?.search) {
            events = await Promise.race([
                searchEvents(extra.search),
                timeoutPromise
            ]);
        } else {
            events = await Promise.race([
                getEventsByCategory(id),
                timeoutPromise
            ]);
        }
        
        const skip = parseInt(extra?.skip) || 0;
        const meta = events.slice(skip, skip + 100)
            .map(eventToMeta)
            .filter(m => m !== null);
        
        console.log(`📋 Returning ${meta.length} items for catalog: ${id}`);
        return { meta };
    } catch (error) {
        console.error('Catalog error:', error.message || error);
        return { meta: [] };
    }
});

/**
 * Meta Handler
 */
builder.defineMetaHandler(async ({ type, id }) => {
    try {
        const event = await getEventById(id);
        return { meta: eventToMeta(event) };
    } catch (error) {
        console.error('Meta error:', error);
        return { meta: null };
    }
});

/**
 * Stream Handler
 */
builder.defineStreamHandler(async ({ type, id }) => {
    try {
        console.log(`🎬 Stream request: type=${type}, id=${id}`);
        
        const event = await getEventById(id);
        if (!event) {
            console.log(`🎬 Event not found for id: ${id}`);
            return { streams: [] };
        }
        
        console.log(`🎬 Found event: ${event.name}, link: ${event.link}`);
        
        const serverConfig = SERVERS[event.server] || { name: 'NTVStream', baseUrl: 'https://ntvstream.cx' };
        
        // Add timeout wrapper for Vercel (max 10s for free tier)
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Stream fetch timeout')), 8000)
        );
        
        const scrapedStreams = await Promise.race([
            fetchStreamUrls(event.link, serverConfig),
            timeoutPromise
        ]);
        
        if (!scrapedStreams || scrapedStreams.length === 0) {
            console.log(`🎬 No streams found, adding fallback`);
            // Return the watch page as fallback
            return {
                streams: [{
                    externalUrl: event.link,
                    title: `${serverConfig.name} - Watch in Browser`,
                    behaviorHints: { notWebReady: true }
                }]
            };
        }
        
        const streams = scrapedStreams.map((s, i) => {
            if (s.isEmbed || !s.url.match(/\.(m3u8|mp4|mpd)(\?|$)/i)) {
                return {
                    externalUrl: s.url,
                    title: s.title || `Stream ${i + 1}`,
                    behaviorHints: { notWebReady: true }
                };
            }
            return {
                url: s.url,
                title: s.title || `Stream ${i + 1}`
            };
        });
        
        console.log(`🎬 Returning ${streams.length} streams`);
        return { streams };
    } catch (error) {
        console.error('Stream error:', error.message || error);
        // Return fallback stream instead of empty
        return {
            streams: [{
                externalUrl: `https://ntvstream.cx`,
                title: 'Error loading stream - Click to open NTVStream',
                behaviorHints: { notWebReady: true }
            }]
        };
    }
});

// Get the addon interface
const addonInterface = builder.getInterface();

// Vercel serverless handler
module.exports = async (req, res) => {
    try {
        // CHECK CONFIGURE FIRST - before ANYTHING else!
        // Get path from every possible source
        const rawUrl = req.url || req.path || req.originalUrl || '';
        const rawPath = rawUrl.split('?')[0].split('#')[0];
        
        // Check if this is a configure request - be VERY aggressive
        const isConfigure = rawPath === '/configure' || 
                           rawPath === '/configure.html' || 
                           rawPath.startsWith('/configure') ||
                           rawUrl.includes('/configure') ||
                           rawUrl.includes('configure') ||
                           (req.url && String(req.url).includes('configure')) ||
                           (req.path && String(req.path).includes('configure'));
        
        if (isConfigure) {
            // Set headers
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.setHeader('Access-Control-Allow-Origin', '*');
            
            // Get base URL
            const host = req.headers.host || req.get?.('host') || 'localhost';
            const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http') || 'https';
            const baseUrl = `${protocol}://${host}`;
            
            // Try to load from module, fallback to inline
            try {
                const configureHTML = require('./configure-html.js');
                res.send(configureHTML);
            } catch (e) {
                // Inline HTML - always works
                res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NTVStream Sports - Stremio Addon</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
            --bg: #0a0a0f;
            --surface: #151520;
            --text: #e0e0e8;
            --text-muted: #8b8b9e;
            --accent: #00ff88;
            --border: rgba(255, 255, 255, 0.08);
        }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: var(--bg);
            color: var(--text);
            min-height: 100vh;
            line-height: 1.6;
            padding: 4rem 2rem;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 4rem;
        }
        .logo {
            font-size: 3.5rem;
            margin-bottom: 1rem;
        }
        h1 {
            font-size: 2rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
        }
        .tagline {
            color: var(--text-muted);
            font-size: 1rem;
        }
        .main-card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 3rem;
            margin-bottom: 2rem;
        }
        .install-btn {
            width: 100%;
            padding: 1.25rem 2rem;
            background: var(--accent);
            color: #000;
            border: none;
            border-radius: 12px;
            font-size: 1rem;
            font-weight: 600;
            font-family: inherit;
            cursor: pointer;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.75rem;
            transition: all 0.2s;
        }
        .install-btn:hover {
            background: #00cc6a;
            transform: translateY(-2px);
        }
        .url-display {
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 1rem;
            font-family: monospace;
            font-size: 0.85rem;
            color: var(--text-muted);
            word-break: break-all;
            text-align: center;
            margin-bottom: 1rem;
        }
        .copy-btn {
            width: 100%;
            padding: 0.875rem;
            background: transparent;
            color: var(--text);
            border: 1px solid var(--border);
            border-radius: 8px;
            font-size: 0.9rem;
            font-weight: 500;
            font-family: inherit;
            cursor: pointer;
            transition: all 0.2s;
        }
        .copy-btn:hover {
            background: #1a1a2e;
            border-color: var(--accent);
        }
        .footer {
            text-align: center;
            margin-top: 3rem;
            padding-top: 2rem;
            border-top: 1px solid var(--border);
            color: var(--text-muted);
            font-size: 0.875rem;
        }
        .footer a {
            color: var(--accent);
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <div class="logo">🏟️</div>
            <h1>NTVStream Sports</h1>
            <p class="tagline">Live sports streaming for Stremio</p>
        </header>
        <div class="main-card">
            <button class="install-btn" onclick="installAddon()">
                <span>⚡</span>
                <span>Install in Stremio</span>
            </button>
            <div class="url-display" id="manifestUrl">${baseUrl}/manifest.json</div>
            <button class="copy-btn" onclick="copyUrl()">Copy URL</button>
        </div>
        <footer class="footer">
            <p>Built with <a href="https://github.com/Stremio/stremio-addon-sdk" target="_blank">Stremio Addon SDK</a></p>
        </footer>
    </div>
    <script>
        const baseUrl = window.location.origin;
        document.getElementById('manifestUrl').textContent = baseUrl + '/manifest.json';
        function installAddon() {
            const manifestUrl = baseUrl + '/manifest.json';
            const stremioUrl = 'stremio://' + manifestUrl.replace(/^https?:\\/\\//, '');
            const link = document.createElement('a');
            link.href = stremioUrl;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            setTimeout(() => document.body.removeChild(link), 100);
        }
        function copyUrl() {
            const url = baseUrl + '/manifest.json';
            navigator.clipboard.writeText(url).then(() => {
                alert('URL copied to clipboard!');
            });
        }
    </script>
</body>
</html>`);
            }
            return; // MUST return - don't continue!
        }
        
        // Set CORS headers for other requests
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        if (req.method === 'OPTIONS') {
            res.status(200).end();
            return;
        }
        
        // Parse URL - handle both query string and path
        const url = req.url || req.path || req.originalUrl || '/';
        const path = url.split('?')[0].split('#')[0];
        const query = new URLSearchParams((url.split('?')[1] || ''));
        
        // Handle manifest
        if (path === '/manifest.json' || path === '/') {
            res.setHeader('Content-Type', 'application/json');
            res.json(addonInterface.manifest);
            return;
        }
        
        // Handle catalog: /catalog/:type/:id.json
        const catalogMatch = path.match(/^\/catalog\/([^\/]+)\/([^\/]+)\.json$/);
        if (catalogMatch) {
            const [, type, id] = catalogMatch;
            const extra = {};
            query.forEach((value, key) => {
                extra[key] = value;
            });
            try {
                // Add timeout wrapper
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Request timeout')), 9000)
                );
                
                const result = await Promise.race([
                    addonInterface.catalog.get({ type, id, extra }),
                    timeoutPromise
                ]);
                
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.json(result);
            } catch (err) {
                console.error('Catalog handler error:', err.message || err);
                // Return empty catalog instead of error
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.json({ meta: [] });
            }
            return;
        }
        
        // Handle meta: /meta/:type/:id.json
        const metaMatch = path.match(/^\/meta\/([^\/]+)\/([^\/]+)\.json$/);
        if (metaMatch) {
            const [, type, id] = metaMatch;
            try {
                const result = await addonInterface.meta.get({ type, id });
                res.setHeader('Content-Type', 'application/json');
                res.json(result);
            } catch (err) {
                console.error('Meta handler error:', err);
                res.status(500).json({ error: err.message });
            }
            return;
        }
        
        // Handle stream: /stream/:type/:id.json
        const streamMatch = path.match(/^\/stream\/([^\/]+)\/([^\/]+)\.json$/);
        if (streamMatch) {
            const [, type, id] = streamMatch;
            try {
                // Add timeout wrapper
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Request timeout')), 9000)
                );
                
                const result = await Promise.race([
                    addonInterface.stream.get({ type, id }),
                    timeoutPromise
                ]);
                
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.json(result);
            } catch (err) {
                console.error('Stream handler error:', err.message || err);
                // Return empty streams instead of error to prevent Stremio errors
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.json({ streams: [] });
            }
            return;
        }
        
        // 404 for unknown routes
        res.status(404).json({ error: 'Not found', path });
        
    } catch (error) {
        console.error('Serverless error:', error);
        res.status(500).json({ 
            error: 'Internal server error', 
            message: error.message
        });
    }
};

// Also allow local running
if (require.main === module) {
    const { serveHTTP } = require('stremio-addon-sdk');
    serveHTTP(addonInterface, { port: process.env.PORT || 7000 })
        .then(({ url }) => {
            console.log(`✅ Addon running at: ${url}`);
            console.log(`📋 Manifest: ${url}/manifest.json`);
        })
        .catch(err => {
            console.error('Failed to start:', err);
            process.exit(1);
        });
}
