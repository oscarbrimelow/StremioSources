#!/usr/bin/env node

/**
 * NTVStream Stremio Addon
 * Live sports streaming with multiple server support
 */

const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const express = require('express');
const path = require('path');
const { SERVERS, CATEGORIES, getCatalogDefinitions, getCategoryById, getEnabledServers } = require('./servers');
const { getEventsByCategory, searchEvents, getEventById, fetchStreamUrls } = require('./scraper');

// Addon configuration
const ADDON_ID = 'community.ntvstream.sports';
const ADDON_VERSION = '1.0.0';
const ADDON_NAME = 'NTVStream Sports';

// Generate manifest
const manifest = {
    id: ADDON_ID,
    version: ADDON_VERSION,
    name: ADDON_NAME,
    description: 'Live sports streaming addon with multiple server support. Watch Football, Cricket, UFC, Boxing, and more!',
    
    logo: 'https://img.icons8.com/color/512/stadium.png',
    background: 'https://images.unsplash.com/photo-1461896836934- voices-from-boredom-to-bliss?w=1920',
    
    // Resources this addon provides
    resources: ['catalog', 'meta', 'stream'],
    
    // Content types
    types: ['tv', 'channel'],
    
    // ID prefixes we handle
    idPrefixes: ['ntv_'],
    
    // Catalogs for each sports category
    catalogs: getCatalogDefinitions(),
    
    // User configuration
    behaviorHints: {
        configurable: true,
        configurationRequired: false
    },
    
    // Configuration fields
    config: [
        {
            key: 'servers',
            type: 'checkbox',
            title: 'Select Streaming Servers',
            options: Object.values(SERVERS).map(s => s.id),
            optionNames: Object.values(SERVERS).reduce((acc, s) => {
                acc[s.id] = `${s.name} - ${s.description}`;
                return acc;
            }, {}),
            default: Object.values(SERVERS).filter(s => s.enabled).map(s => s.id)
        }
    ]
};

// Create addon builder
const builder = new addonBuilder(manifest);

/**
 * Parse user configuration from URL
 */
function parseUserConfig(config) {
    if (!config) return {};
    
    try {
        if (typeof config === 'string') {
            return JSON.parse(Buffer.from(config, 'base64').toString());
        }
        return config;
    } catch {
        return {};
    }
}

/**
 * Convert event to Stremio meta preview format
 */
function eventToMetaPreview(event) {
    const liveIndicator = event.isLive ? '🔴 LIVE: ' : '';
    const categoryIcon = event.matchedCategory ? event.matchedCategory.icon : '🏆';
    
    return {
        id: event.id,
        type: 'tv',
        name: `${liveIndicator}${event.name}`,
        poster: `https://img.icons8.com/color/512/${event.matchedCategory?.id || 'sports'}.png`,
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
function eventToMeta(event) {
    return {
        ...eventToMetaPreview(event),
        background: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1920',
        logo: `https://img.icons8.com/color/256/${event.matchedCategory?.id || 'trophy'}.png`,
        runtime: 'Live Event',
        website: event.link
    };
}

/**
 * Catalog Handler - Returns list of events for each category
 */
builder.defineCatalogHandler(async ({ type, id, extra }) => {
    console.log(`📋 Catalog request: type=${type}, id=${id}, extra=${JSON.stringify(extra)}`);
    
    try {
        const userConfig = parseUserConfig(extra?.config);
        const skip = parseInt(extra?.skip) || 0;
        const limit = 50;
        
        let events = [];
        
        // Handle search
        if (extra?.search) {
            events = await searchEvents(extra.search, userConfig);
        } else {
            // Get events for this category
            events = await getEventsByCategory(id, userConfig);
        }
        
        // Apply pagination
        const paginatedEvents = events.slice(skip, skip + limit);
        
        // Convert to meta previews
        const metas = paginatedEvents.map(eventToMetaPreview);
        
        console.log(`📋 Returning ${metas.length} items for ${id}`);
        
        return { metas };
        
    } catch (error) {
        console.error('Catalog error:', error);
        return { metas: [] };
    }
});

/**
 * Meta Handler - Returns detailed info about a specific event
 */
builder.defineMetaHandler(async ({ type, id }) => {
    console.log(`📝 Meta request: type=${type}, id=${id}`);
    
    try {
        const event = await getEventById(id);
        
        if (!event) {
            console.log(`📝 Event not found: ${id}`);
            return { meta: null };
        }
        
        const meta = eventToMeta(event);
        console.log(`📝 Returning meta for: ${event.name}`);
        
        return { meta };
        
    } catch (error) {
        console.error('Meta error:', error);
        return { meta: null };
    }
});

/**
 * Stream Handler - Returns available streams for an event
 */
builder.defineStreamHandler(async ({ type, id }) => {
    console.log(`🎬 Stream request: type=${type}, id=${id}`);
    
    try {
        const event = await getEventById(id);
        
        if (!event) {
            console.log(`🎬 Event not found: ${id}`);
            return { streams: [] };
        }
        
        // Get the server config for this event
        const serverConfig = SERVERS[event.server];
        if (!serverConfig) {
            console.log(`🎬 Server not found: ${event.server}`);
            return { streams: [] };
        }
        
        // Fetch available streams
        const streams = await fetchStreamUrls(event.link, serverConfig);
        
        console.log(`🎬 Returning ${streams.length} streams for: ${event.name}`);
        
        return { streams };
        
    } catch (error) {
        console.error('Stream error:', error);
        return { streams: [] };
    }
});

// Get the addon interface
const addonInterface = builder.getInterface();

// Create Express app for additional routes
const app = express();

// Serve static files (configuration page)
app.use('/configure', express.static(path.join(__dirname, 'public')));

// Configuration endpoint - serves HTML page
app.get('/configure', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'configure.html'));
});

// API endpoint to get current configuration
app.get('/api/config', (req, res) => {
    res.json({
        servers: SERVERS,
        categories: CATEGORIES
    });
});

// API endpoint to generate configured manifest URL
app.get('/api/manifest/:config', (req, res) => {
    try {
        const config = JSON.parse(Buffer.from(req.params.config, 'base64').toString());
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers['x-forwarded-host'] || req.get('host');
        const manifestUrl = `${protocol}://${host}/${req.params.config}/manifest.json`;
        
        res.json({
            installUrl: `stremio://${host}/${req.params.config}/manifest.json`,
            manifestUrl: manifestUrl,
            config: config
        });
    } catch (error) {
        res.status(400).json({ error: 'Invalid configuration' });
    }
});

// Start the server
const PORT = process.env.PORT || 7000;
const HOST = process.env.HOST || '0.0.0.0';

// Check for command line arguments
const args = process.argv.slice(2);
const shouldLaunch = args.includes('--launch');
const shouldInstall = args.includes('--install');

// Use serveHTTP for the addon routes
serveHTTP(addonInterface, { 
    port: PORT,
    getRouter: (router) => {
        // Add our custom routes to the addon router
        router.use(app);
        return router;
    }
}).then(({ url }) => {
    console.log('\n' + '='.repeat(60));
    console.log('🏟️  NTVStream Sports Stremio Addon');
    console.log('='.repeat(60));
    console.log(`\n✅ Addon is running at: ${url}`);
    console.log(`\n📋 Manifest URL: ${url}/manifest.json`);
    console.log(`\n⚙️  Configuration page: ${url}/configure`);
    console.log('\n📱 To install in Stremio:');
    console.log(`   1. Open Stremio`);
    console.log(`   2. Go to Addons section`);
    console.log(`   3. Click "Install addon" at the top`);
    console.log(`   4. Paste this URL: ${url}/manifest.json`);
    console.log('\n' + '='.repeat(60));
    console.log('\n📺 Available Categories:');
    Object.values(CATEGORIES).forEach(cat => {
        console.log(`   ${cat.icon} ${cat.name}`);
    });
    console.log('\n🌐 Enabled Servers:');
    getEnabledServers().forEach(server => {
        console.log(`   ✓ ${server.name} (${server.baseUrl})`);
    });
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Launch Stremio if requested
    if (shouldLaunch || shouldInstall) {
        const { exec } = require('child_process');
        const stremioUrl = shouldInstall 
            ? `stremio://${url.replace(/^https?:\/\//, '')}/manifest.json`
            : url;
        
        console.log(`🚀 Opening Stremio with addon...`);
        
        // Try to open Stremio based on OS
        const platform = process.platform;
        let command;
        
        if (platform === 'win32') {
            command = `start "" "${stremioUrl}"`;
        } else if (platform === 'darwin') {
            command = `open "${stremioUrl}"`;
        } else {
            command = `xdg-open "${stremioUrl}"`;
        }
        
        exec(command, (error) => {
            if (error) {
                console.log(`⚠️  Could not auto-open Stremio. Please open manually.`);
            }
        });
    }
});

