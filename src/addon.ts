/**
 * NTVStream Sports Stremio Addon
 * Main addon logic with catalog, meta, and stream handlers
 */

import { addonBuilder } from 'stremio-addon-sdk';
import { SERVERS, CATEGORIES, getCatalogDefinitions, ADDON_CONFIG } from './config';
import { getEventsByCategory, searchEvents, getEventById, fetchStreamUrls } from './scraper';
import { SportEvent, UserConfig, StremioMeta, StremioStream } from './types';

// Build manifest
const manifest = {
    id: ADDON_CONFIG.id,
    version: ADDON_CONFIG.version,
    name: ADDON_CONFIG.name,
    description: ADDON_CONFIG.description,
    logo: ADDON_CONFIG.logo,
    background: ADDON_CONFIG.background,
    
    resources: ['catalog', 'meta', 'stream'],
    types: ['tv'],
    idPrefixes: ['ntv_'],
    
    catalogs: getCatalogDefinitions(),
    
    behaviorHints: {
        configurable: true,
        configurationRequired: false
    },
    
    config: [
        {
            key: 'servers',
            type: 'checkbox',
            title: 'Select Streaming Servers',
            options: Object.values(SERVERS).map(s => s.id),
            optionNames: Object.values(SERVERS).reduce((acc, s) => {
                acc[s.id] = `${s.name} - ${s.description}`;
                return acc;
            }, {} as Record<string, string>),
            default: Object.values(SERVERS).filter(s => s.enabled).map(s => s.id)
        }
    ]
};

// Create addon builder
const builder = new addonBuilder(manifest);

/**
 * Parse user configuration from URL or extra params
 */
function parseUserConfig(config?: string | Record<string, unknown>): UserConfig {
    if (!config) return {};
    
    try {
        if (typeof config === 'string') {
            return JSON.parse(Buffer.from(config, 'base64').toString()) as UserConfig;
        }
        return config as UserConfig;
    } catch {
        return {};
    }
}

/**
 * Convert event to Stremio meta preview format
 */
function eventToMetaPreview(event: SportEvent): StremioMeta {
    const liveIndicator = event.isLive ? '🔴 LIVE: ' : '';
    const categoryIcon = event.matchedCategory?.icon || '🏆';
    
    return {
        id: event.id,
        type: 'tv',
        name: `${liveIndicator}${event.name}`,
        poster: event.poster || `https://img.icons8.com/color/512/${event.matchedCategory?.id || 'sports'}.png`,
        posterShape: 'square',
        description: `${categoryIcon} ${event.matchedCategory?.name || 'Sports'}\n📺 ${event.serverName}\n⏰ ${event.timeStr}`,
        genres: event.matchedCategory?.genres || ['Sports'],
        releaseInfo: event.timeStr,
        links: [
            { name: event.serverName, category: 'Servers', url: event.link }
        ]
    };
}

/**
 * Convert event to full Stremio meta format
 */
function eventToMeta(event: SportEvent): StremioMeta {
    return {
        ...eventToMetaPreview(event),
        background: ADDON_CONFIG.background,
        logo: `https://img.icons8.com/color/256/${event.matchedCategory?.id || 'trophy'}.png`,
        runtime: event.isLive ? 'Live Now' : 'Scheduled',
        website: event.link
    };
}

/**
 * Catalog Handler
 */
builder.defineCatalogHandler(async ({ type, id, extra }) => {
    console.log(`📋 Catalog: type=${type}, id=${id}, search=${extra.search || 'none'}`);
    
    try {
        const userConfig = parseUserConfig(extra.config);
        const skip = parseInt(extra.skip || '0');
        const limit = 100;
        
        let events: SportEvent[];
        
        if (extra.search) {
            events = await searchEvents(extra.search, userConfig);
        } else {
            events = await getEventsByCategory(id, userConfig);
        }
        
        const paginatedEvents = events.slice(skip, skip + limit);
        const metas = paginatedEvents.map(eventToMetaPreview);
        
        console.log(`📋 Returning ${metas.length} items`);
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
    console.log(`📝 Meta: type=${type}, id=${id}`);
    
    try {
        const event = await getEventById(id);
        
        if (!event) {
            console.log(`📝 Event not found: ${id}`);
            return { meta: null };
        }
        
        const meta = eventToMeta(event);
        console.log(`📝 Found: ${event.name}`);
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
    console.log(`🎬 Stream: type=${type}, id=${id}`);
    
    try {
        const event = await getEventById(id);
        
        if (!event) {
            console.log(`🎬 Event not found: ${id}`);
            return { streams: [] };
        }
        
        const server = SERVERS[event.server];
        if (!server) {
            console.log(`🎬 Server not found: ${event.server}`);
            return { streams: [] };
        }
        
        const scrapedStreams = await fetchStreamUrls(event.link, server);
        
        const streams: StremioStream[] = scrapedStreams.map((stream, index) => {
            const isDirectStream = stream.url.match(/\.(m3u8|mpd|mp4)(\?|$)/i);
            
            if (isDirectStream) {
                return {
                    url: stream.url,
                    title: `${event.serverName} - ${stream.title || `Stream ${index + 1}`}`,
                    name: stream.quality || 'HD',
                    behaviorHints: stream.headers ? {
                        proxyHeaders: { request: stream.headers }
                    } : undefined
                };
            } else {
                return {
                    externalUrl: stream.url,
                    title: `${event.serverName} - ${stream.title || `Link ${index + 1}`}`,
                    name: stream.isEmbed ? 'Web Player' : 'External',
                    behaviorHints: {
                        notWebReady: true
                    }
                };
            }
        });
        
        console.log(`🎬 Found ${streams.length} streams for: ${event.name}`);
        return { streams };
        
    } catch (error) {
        console.error('Stream error:', error);
        return { streams: [] };
    }
});

// Export the addon interface
export const addonInterface = builder.getInterface();
export { manifest };

