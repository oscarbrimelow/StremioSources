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
        let events = [];
        
        if (extra?.search) {
            events = await searchEvents(extra.search);
        } else {
            events = await getEventsByCategory(id);
        }
        
        const skip = parseInt(extra?.skip) || 0;
        const metas = events.slice(skip, skip + 100)
            .map(eventToMeta)
            .filter(m => m !== null);
        
        return { metas };
    } catch (error) {
        console.error('Catalog error:', error);
        return { metas: [] };
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
        const event = await getEventById(id);
        if (!event) return { streams: [] };
        
        const serverConfig = SERVERS[event.server] || { name: 'NTVStream', baseUrl: 'https://ntvstream.cx' };
        const scrapedStreams = await fetchStreamUrls(event.link, serverConfig);
        
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
        
        return { streams };
    } catch (error) {
        console.error('Stream error:', error);
        return { streams: [] };
    }
});

// Get the addon interface
const addonInterface = builder.getInterface();

// Vercel serverless handler
module.exports = async (req, res) => {
    try {
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        if (req.method === 'OPTIONS') {
            res.status(200).end();
            return;
        }
        
        // Parse URL - handle both query string and path
        const url = req.url || '/';
        const [path, queryString] = url.split('?');
        const query = new URLSearchParams(queryString || '');
        
        // Skip configure - handled by dedicated function at /api/configure
        if (path === '/configure' || path === '/configure.html') {
            res.status(404).json({ error: 'Use /api/configure' });
            return;
        }
        
        // REMOVED: Configure page handling - now in separate function
        if (false && path === '/configure' || path === '/configure.html') {
            const fs = require('fs');
            const pathModule = require('path');
            try {
                // Try multiple possible paths for serverless
                const possiblePaths = [
                    pathModule.join(__dirname, 'public', 'configure.html'),
                    pathModule.join(process.cwd(), 'public', 'configure.html'),
                    pathModule.join(__dirname, '..', 'public', 'configure.html'),
                    pathModule.join(process.cwd(), '..', 'public', 'configure.html')
                ];
                
                let html = null;
                for (const htmlPath of possiblePaths) {
                    try {
                        if (fs.existsSync(htmlPath)) {
                            html = fs.readFileSync(htmlPath, 'utf8');
                            break;
                        }
                    } catch (e) {
                        // Try next path
                    }
                }
                
                if (!html) {
                    // Fallback: return inline HTML
                    html = `<!DOCTYPE html>
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
            --surface-hover: #1a1a2e;
            --text: #e0e0e8;
            --text-muted: #8b8b9e;
            --accent: #00ff88;
            --accent-hover: #00cc6a;
            --border: rgba(255, 255, 255, 0.08);
        }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: var(--bg);
            color: var(--text);
            min-height: 100vh;
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 4rem 2rem;
        }
        .header {
            text-align: center;
            margin-bottom: 4rem;
        }
        .logo {
            font-size: 3.5rem;
            margin-bottom: 1rem;
            display: inline-block;
        }
        h1 {
            font-size: 2rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            letter-spacing: -0.02em;
        }
        .tagline {
            color: var(--text-muted);
            font-size: 1rem;
            font-weight: 400;
        }
        .main-card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 3rem;
            margin-bottom: 2rem;
            backdrop-filter: blur(10px);
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
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.75rem;
            margin-bottom: 1.5rem;
        }
        .install-btn:hover {
            background: var(--accent-hover);
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(0, 255, 136, 0.3);
        }
        .url-display {
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 1rem;
            font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
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
            transition: all 0.2s ease;
        }
        .copy-btn:hover {
            background: var(--surface-hover);
            border-color: var(--accent);
        }
        .toast {
            position: fixed;
            bottom: 2rem;
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            background: var(--surface);
            border: 1px solid var(--border);
            color: var(--text);
            padding: 1rem 1.5rem;
            border-radius: 12px;
            font-size: 0.9rem;
            font-weight: 500;
            opacity: 0;
            transition: all 0.3s ease;
            z-index: 1000;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }
        .toast.show {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
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
            <div class="url-display" id="manifestUrl">Loading...</div>
            <button class="copy-btn" onclick="copyUrl()">Copy URL</button>
        </div>
        <footer class="footer">
            <p>Built with <a href="https://github.com/Stremio/stremio-addon-sdk" target="_blank">Stremio Addon SDK</a></p>
        </footer>
    </div>
    <div class="toast" id="toast"></div>
    <script>
        const baseUrl = window.location.origin;
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
            navigator.clipboard.writeText(baseUrl + '/manifest.json').then(() => {
                document.getElementById('toast').textContent = 'URL copied!';
                document.getElementById('toast').classList.add('show');
                setTimeout(() => document.getElementById('toast').classList.remove('show'), 3000);
            });
        }
    </script>
</body>
</html>`;
                }
                
                res.setHeader('Content-Type', 'text/html');
                res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                res.setHeader('Pragma', 'no-cache');
                res.setHeader('Expires', '0');
                res.send(html);
            } catch (err) {
                console.error('Configure page error:', err);
                res.status(500).send('Error loading configure page');
            }
            return;
        }
        
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
                const result = await addonInterface.catalog.get({ type, id, extra });
                res.setHeader('Content-Type', 'application/json');
                res.json(result);
            } catch (err) {
                console.error('Catalog handler error:', err);
                res.status(500).json({ error: err.message });
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
                const result = await addonInterface.stream.get({ type, id });
                res.setHeader('Content-Type', 'application/json');
                res.json(result);
            } catch (err) {
                console.error('Stream handler error:', err);
                res.status(500).json({ error: err.message });
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
