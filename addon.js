/**
 * NTVStream Stremio Addon
 * Based on working PPVstreams structure, adapted for NTVStream
 */

const { addonBuilder } = require('stremio-addon-sdk');
const { SERVERS, CATEGORIES, getCatalogDefinitions } = require('./servers');
const { getEventsByCategory, searchEvents, getEventById, fetchStreamUrls } = require('./scraper');

// Addon manifest - Single catalog like StreamsPPV
const manifest = {
    id: 'community.ntvstream.sports',
    version: '1.0.1',
    name: 'NTVStream',
    description: 'Live sports streaming from NTVStream. Watch Football, Basketball, Hockey, Cricket, UFC, Boxing and more!',
    logo: 'https://img.icons8.com/color/512/stadium.png',
    background: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1920',
    resources: [
        { name: 'stream', types: ['tv'] },
        { name: 'meta', types: ['tv'] },
        { name: 'catalog', types: ['tv'] }
    ],
    types: ['tv'],
    idPrefixes: ['ntv_'],
    catalogs: [
        { 
            id: 'streams', 
            type: 'tv', 
            name: 'NTVStream'
        }
    ]
};

// Create builder
const builder = new addonBuilder(manifest);

/**
 * Convert event to Stremio meta preview format (for catalog)
 */
function eventToMetaPreview(event) {
    if (!event || !event.id || !event.name) {
        return null;
    }
    
    // Simple format like StreamsPPV - just show the event name
    return {
        id: event.id,
        type: 'tv',
        name: event.isLive ? `🔴 ${event.name}` : event.name,
        poster: `https://img.icons8.com/color/512/${event.matchedCategory?.id || 'sports'}.png`,
        posterShape: 'landscape',
        background: `https://img.icons8.com/color/512/${event.matchedCategory?.id || 'sports'}.png`,
        description: event.name,
        logo: `https://img.icons8.com/color/512/${event.matchedCategory?.id || 'sports'}.png`,
    };
}

/**
 * Convert event to Stremio meta detail format (for meta handler)
 */
function eventToMetaDetail(event) {
    if (!event || !event.id || !event.name) {
        return null;
    }
    
    const icon = event.matchedCategory?.icon || '🏆';
    const categoryName = event.matchedCategory?.name || 'Sports';
    const descParts = [
        `${icon} ${categoryName}`,
        `📺 ${event.serverName || 'NTVStream'}`,
        `⏰ ${event.timeStr || 'Live'}`,
        `📡 ${event.sources || 1} source(s)`
    ];
    
    return {
        id: event.id,
        type: 'tv',
        name: event.isLive ? `🔴 ${event.name}` : event.name,
        poster: `https://img.icons8.com/color/512/${event.matchedCategory?.id || 'sports'}.png`,
        posterShape: 'landscape',
        background: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1920',
        description: descParts.join('\n'),
        genres: event.matchedCategory?.genres || ['Sports'],
        releaseInfo: new Date().getFullYear().toString(),
    };
}

/**
 * Catalog Handler - Single catalog with ALL events (like StreamsPPV)
 */
builder.defineCatalogHandler(async ({ type, id, extra }) => {
    try {
        console.log(`📋 Catalog: type=${type}, id=${id}`);
        
        let events = [];
        
        if (extra?.search) {
            // Search across all events
            events = await searchEvents(extra.search);
        } else {
            // Get ALL events regardless of category (single catalog)
            events = await getEventsByCategory('all');
        }
        
        if (!Array.isArray(events)) {
            console.error('Events is not an array');
            return { metas: [] };
        }
        
        console.log(`📋 Fetched ${events.length} events from scraper`);
        
        // If no events found, add a test event so catalog shows up
        if (events.length === 0) {
            console.warn('⚠️ No events found - adding test event');
            events = [{
                id: 'ntv_test_event',
                name: 'Test Event - NTVStream Scraper',
                category: 'sports',
                isLive: true,
                timeStr: '🔴 LIVE',
                link: 'https://ntvstream.cx',
                server: 'kobra',
                serverName: 'NTVStream KOBRA',
                sources: 1,
                matchedCategory: { id: 'sports', name: 'Sports', icon: '🏆' }
            }];
        }
        
        const skip = parseInt(extra?.skip) || 0;
        const limit = 100;
        const paginatedEvents = events.slice(skip, skip + limit);
        
        const results = paginatedEvents
            .map(eventToMetaPreview)
            .filter(m => m !== null);
        
        console.log(`📋 Returning ${results.length} items (all sports)`);
        return { metas: results };
        
    } catch (error) {
        console.error('Catalog error:', error);
        console.error('Error stack:', error.stack);
        // Return test event on error so catalog at least shows up
        return { 
            metas: [{
                id: 'ntv_error',
                type: 'tv',
                name: 'Error Loading Events',
                poster: 'https://img.icons8.com/color/512/sports.png',
                posterShape: 'landscape',
                background: 'https://img.icons8.com/color/512/sports.png',
                description: 'Check Vercel logs for errors',
                logo: 'https://img.icons8.com/color/512/sports.png'
            }]
        };
    }
});

/**
 * Meta Handler
 */
builder.defineMetaHandler(async ({ type, id }) => {
    try {
        const event = await getEventById(id);
        if (!event) {
            return { meta: null };
        }
        
        const meta = eventToMetaDetail(event);
        return { meta };
        
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
        console.log(`🎬 Stream: type=${type}, id=${id}`);
        
        const event = await getEventById(id);
        if (!event) {
            console.log(`🎬 Event not found: ${id}`);
            return { streams: [] };
        }
        
        const serverConfig = SERVERS[event.server] || { name: 'NTVStream', baseUrl: 'https://ntvstream.cx' };
        const scrapedStreams = await fetchStreamUrls(event.link, serverConfig);
        
        if (!scrapedStreams || scrapedStreams.length === 0) {
            // Return watch page as fallback
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
        console.error('Stream error:', error);
        // Return fallback
        return {
            streams: [{
                externalUrl: 'https://ntvstream.cx',
                title: 'Error - Open NTVStream',
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
        console.log(`📥 Request: ${req.method} ${req.url || req.path || '/'}`);
        
        // Set CORS headers FIRST
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        if (req.method === 'OPTIONS') {
            res.status(200).end();
            return;
        }
        
        // Parse URL
        const url = req.url || req.path || req.originalUrl || '/';
        const path = url.split('?')[0].split('#')[0];
        const query = new URLSearchParams((url.split('?')[1] || ''));
        
        // Handle manifest FIRST (before configure)
        if (path === '/manifest.json') {
            try {
                console.log('📄 Manifest request received');
                
                // Ensure manifest exists
                if (!addonInterface || !addonInterface.manifest) {
                    console.error('❌ addonInterface or manifest is missing');
                    res.setHeader('Content-Type', 'application/json');
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.status(500).json({ error: 'Manifest not available' });
                    return;
                }
                
                const manifestData = addonInterface.manifest;
                console.log('📄 Manifest data:', JSON.stringify(manifestData, null, 2));
                
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
                res.setHeader('Cache-Control', 'public, max-age=3600');
                
                res.status(200).json(manifestData);
                console.log('✅ Manifest sent successfully');
            } catch (err) {
                console.error('❌ Manifest error:', err);
                console.error('Error stack:', err.stack);
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.status(500).json({ 
                    error: 'Failed to generate manifest',
                    message: err.message 
                });
            }
            return;
        }
        
        // Handle configure page
        if (path === '/' || path === '/configure') {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            
            try {
                const configureHTML = require('./configure-html.js');
                res.send(configureHTML);
            } catch (e) {
                const host = req.headers.host || 'localhost';
                const protocol = req.headers['x-forwarded-proto'] || 'https';
                const baseUrl = `${protocol}://${host}`;
                res.send(`<!DOCTYPE html><html><head><title>NTVStream Sports</title><style>body{font-family:system-ui;background:#0a0a0f;color:#e0e0e8;padding:4rem 2rem;text-align:center}h1{color:#00ff88}button{background:#00ff88;color:#000;border:none;padding:1rem 2rem;border-radius:8px;font-size:1rem;font-weight:600;cursor:pointer;margin:1rem}</style></head><body><h1>🏟️ NTVStream Sports</h1><p>Live sports streaming for Stremio</p><button onclick="window.location.href='stremio://'+window.location.host+'/manifest.json'">⚡ Install in Stremio</button><p style='margin-top:2rem;color:#8b8b9e;font-size:0.9rem'>Manifest: <code>${baseUrl}/manifest.json</code></p></body></html>`);
            }
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
                res.setHeader('Content-Type', 'application/json');
                res.json({ metas: [] });
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
                res.setHeader('Content-Type', 'application/json');
                res.json({ meta: null });
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
                res.setHeader('Content-Type', 'application/json');
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
