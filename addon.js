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
        
        // Configure is handled by dedicated function at /api/configure
        // Skip it here to avoid conflicts
        if (path === '/configure' || path === '/configure.html') {
            res.status(404).json({ error: 'Not found' });
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
