/**
 * NTVStream Stremio Addon
 * Serverless-compatible for Vercel deployment
 */

const { addonBuilder, getRouter } = require('stremio-addon-sdk');
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

/**
 * Convert event to Stremio meta format
 */
function eventToMeta(event) {
    const icon = event.matchedCategory?.icon || '🏆';
    return {
        id: event.id,
        type: 'tv',
        name: event.isLive ? `🔴 ${event.name}` : event.name,
        poster: `https://img.icons8.com/color/512/${event.matchedCategory?.id || 'sports'}.png`,
        posterShape: 'square',
        background: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1920',
        description: `${icon} ${event.matchedCategory?.name || 'Sports'}\n📺 ${event.serverName}\n⏰ ${event.timeStr}\n📡 ${event.sources} source(s)`,
        genres: event.matchedCategory?.genres || ['Sports'],
        releaseInfo: event.timeStr,
        runtime: event.isLive ? 'LIVE NOW' : 'Scheduled'
    };
}

/**
 * Catalog Handler
 */
builder.defineCatalogHandler(async ({ type, id, extra }) => {
    console.log(`📋 Catalog: ${id}`);
    
    try {
        let events = [];
        
        if (extra?.search) {
            events = await searchEvents(extra.search);
        } else {
            events = await getEventsByCategory(id);
        }
        
        const skip = parseInt(extra?.skip) || 0;
        const metas = events.slice(skip, skip + 100).map(eventToMeta);
        
        console.log(`📋 Returning ${metas.length} events`);
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
    console.log(`📝 Meta: ${id}`);
    
    try {
        const event = await getEventById(id);
        if (!event) return { meta: null };
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
    console.log(`🎬 Stream: ${id}`);
    
    try {
        const event = await getEventById(id);
        if (!event) return { streams: [] };
        
        const serverConfig = SERVERS[event.server] || { name: 'NTVStream' };
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
        
        console.log(`🎬 Returning ${streams.length} streams`);
        return { streams };
    } catch (error) {
        console.error('Stream error:', error);
        return { streams: [] };
    }
});

// Get the router for serverless
const addonInterface = builder.getInterface();

// Export for Vercel serverless
module.exports = (req, res) => {
    const router = getRouter(addonInterface);
    router(req, res);
};

// Also allow local running
if (require.main === module) {
    const { serveHTTP } = require('stremio-addon-sdk');
    serveHTTP(addonInterface, { port: process.env.PORT || 7000 })
        .then(({ url }) => {
            console.log(`✅ Addon running at: ${url}`);
            console.log(`📋 Manifest: ${url}/manifest.json`);
        });
}
