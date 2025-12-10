/**
 * NTVStream Scraper - Properly configured for actual site structure
 * Based on actual HTML from ntvstream.cx
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { matchEventToCategory, SERVERS } = require('./servers');

// Cache
const cache = {
    events: null,
    timestamp: 0,
    ttl: 2 * 60 * 1000 // 2 minutes
};

// Request headers
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
};

// NTVStream server URLs
const NTV_SERVERS = [
    { id: 'kobra', name: 'KOBRA', url: 'https://ntvstream.cx/matches/kobra' },
    { id: 'titan', name: 'TITAN', url: 'https://ntvstream.cx/matches/titan' },
    { id: 'raptor', name: 'RAPTOR', url: 'https://ntvstream.cx/matches/raptor' },
    { id: 'phoenix', name: 'PHOENIX', url: 'https://ntvstream.cx/matches/phoenix' },
    { id: 'scorpion', name: 'SCORPION', url: 'https://ntvstream.cx/matches/scorpion' },
    { id: 'viper', name: 'VIPER', url: 'https://ntvstream.cx/matches/viper' }
];

/**
 * Generate unique event ID
 */
function generateEventId(name, category) {
    const clean = `${name}_${category}`
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .substring(0, 60);
    return `ntv_${clean}`;
}

/**
 * Extract watch URL from onclick attribute
 */
function extractWatchUrl(onclick) {
    if (!onclick) return null;
    const match = onclick.match(/location\.href=['"](\/watch\/[^'"]+)['"]/);
    return match ? `https://ntvstream.cx${match[1]}` : null;
}

/**
 * Parse source count from text like "4 sources"
 */
function parseSourceCount(text) {
    const match = text.match(/(\d+)\s*sources?/i);
    return match ? parseInt(match[1]) : 1;
}

/**
 * Fetch events from a single NTVStream server
 */
async function fetchServerEvents(server) {
    const events = [];
    
    try {
        console.log(`📡 Fetching from ${server.name}: ${server.url}`);
        
        const response = await axios.get(server.url, {
            headers: {
                ...headers,
                'Referer': 'https://ntvstream.cx/'
            },
            timeout: 15000
        });
        
        const $ = cheerio.load(response.data);
        
        // Find all match cards using the exact class from the HTML
        $('.match-card').each((i, el) => {
            try {
                const $card = $(el);
                
                // Get category from data attribute
                const category = $card.attr('data-category') || 'sports';
                
                // Get watch URL from onclick
                const onclick = $card.attr('onclick');
                const watchUrl = extractWatchUrl(onclick);
                
                // Get title
                const title = $card.find('.match-title').text().trim();
                
                // Check if live
                const isLive = $card.find('.live-badge').length > 0;
                
                // Get scheduled time if not live
                let timeStr = isLive ? '🔴 LIVE' : 'Scheduled';
                const timeEl = $card.find('.time-badge, .scheduled-badge');
                if (timeEl.length > 0) {
                    timeStr = timeEl.text().trim();
                }
                
                // Get source count
                const metaText = $card.find('.match-meta').text();
                const sources = parseSourceCount(metaText);
                
                if (title && watchUrl) {
                    const eventId = generateEventId(title, category);
                    
                    events.push({
                        id: eventId,
                        name: title,
                        category: category,
                        isLive: isLive,
                        timeStr: timeStr,
                        link: watchUrl,
                        server: server.id,
                        serverName: `NTVStream ${server.name}`,
                        sources: sources,
                        matchedCategory: matchEventToCategory(title, category)
                    });
                }
            } catch (err) {
                // Skip malformed card
            }
        });
        
        console.log(`✅ Found ${events.length} events from ${server.name}`);
        
    } catch (error) {
        console.error(`❌ Error fetching from ${server.name}:`, error.message);
    }
    
    return events;
}

/**
 * Fetch all events from all NTVStream servers
 */
async function fetchAllEvents(userConfig = {}) {
    // Check cache first
    if (cache.events && Date.now() - cache.timestamp < cache.ttl) {
        console.log(`📦 Using cached events (${cache.events.length} events)`);
        return cache.events;
    }
    
    console.log('🔄 Fetching fresh events from NTVStream...');
    
    let allEvents = [];
    
    // Try all servers and combine results
    for (const server of NTV_SERVERS) {
        try {
            console.log(`🔄 Fetching from ${server.name}...`);
            const serverEvents = await fetchServerEvents(server);
            console.log(`✅ Got ${serverEvents.length} events from ${server.name}`);
            allEvents = allEvents.concat(serverEvents);
        } catch (err) {
            console.error(`❌ Error fetching from ${server.name}:`, err.message);
            // Continue to next server
        }
    }
    
    // If still no events, return empty array
    if (allEvents.length === 0) {
        console.warn('⚠️ No events fetched from any server');
        return [];
    }
    
    // Sort: Live first, then by source count, then alphabetically
    allEvents.sort((a, b) => {
        // Live events first
        if (a.isLive && !b.isLive) return -1;
        if (!a.isLive && b.isLive) return 1;
        // Then by source count (more sources = higher priority)
        if (a.sources !== b.sources) return b.sources - a.sources;
        // Then alphabetically
        return a.name.localeCompare(b.name);
    });
    
    // Remove duplicates by name
    const seen = new Set();
    allEvents = allEvents.filter(event => {
        const key = event.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    
    // Update cache
    cache.events = allEvents;
    cache.timestamp = Date.now();
    
    console.log(`📺 Total unique events: ${allEvents.length}`);
    return allEvents;
}

/**
 * Get events filtered by category
 */
async function getEventsByCategory(categoryId, userConfig = {}) {
    const events = await fetchAllEvents(userConfig);
    
    if (!categoryId || categoryId === 'all' || categoryId === 'ntvstream_all') {
        return events;
    }
    
    const cleanId = categoryId.replace('ntvstream_', '');
    
    return events.filter(event => {
        // Match by direct category
        if (event.category === cleanId) return true;
        // Match by matched category
        if (event.matchedCategory && event.matchedCategory.id === cleanId) return true;
        return false;
    });
}

/**
 * Search events by query
 */
async function searchEvents(query, userConfig = {}) {
    const events = await fetchAllEvents(userConfig);
    const q = query.toLowerCase();
    
    return events.filter(event =>
        event.name.toLowerCase().includes(q) ||
        event.category.toLowerCase().includes(q)
    );
}

/**
 * Get event by ID
 */
async function getEventById(eventId, userConfig = {}) {
    const events = await fetchAllEvents(userConfig);
    return events.find(event => event.id === eventId);
}

/**
 * Fetch stream URLs from watch page
 */
async function fetchStreamUrls(eventUrl, serverConfig) {
    const streams = [];
    
    try {
        console.log(`🎬 Fetching streams from: ${eventUrl}`);
        
        const response = await axios.get(eventUrl, {
            headers: {
                ...headers,
                'Referer': 'https://ntvstream.cx/'
            },
            timeout: 15000
        });
        
        const $ = cheerio.load(response.data);
        const html = response.data;
        
        // Look for iframe embeds
        $('iframe').each((i, el) => {
            const src = $(el).attr('src') || $(el).attr('data-src');
            if (src) {
                const fullUrl = src.startsWith('http') ? src : 
                               src.startsWith('//') ? `https:${src}` :
                               `https://ntvstream.cx${src}`;
                streams.push({
                    url: fullUrl,
                    title: `${serverConfig.name} - Stream ${i + 1}`,
                    isEmbed: true
                });
            }
        });
        
        // Look for m3u8 HLS streams in scripts/page
        const m3u8Matches = html.match(/(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/gi) || [];
        m3u8Matches.forEach((url, i) => {
            if (!streams.find(s => s.url === url)) {
                streams.push({
                    url: url,
                    title: `${serverConfig.name} - HLS ${i + 1}`,
                    isEmbed: false
                });
            }
        });
        
        // Look for source selector options
        $('select option, .source-item, [data-source]').each((i, el) => {
            const $el = $(el);
            const sourceUrl = $el.attr('value') || $el.attr('data-source') || $el.attr('data-url');
            const sourceName = $el.text().trim() || `Source ${i + 1}`;
            
            if (sourceUrl && sourceUrl.startsWith('http')) {
                streams.push({
                    url: sourceUrl,
                    title: `${serverConfig.name} - ${sourceName}`,
                    isEmbed: true
                });
            }
        });
        
    } catch (error) {
        console.error('Error fetching stream page:', error.message);
    }
    
    // Always add the watch page as a fallback
    if (streams.length === 0 || !streams.find(s => !s.isEmbed)) {
        streams.push({
            url: eventUrl,
            title: `${serverConfig.name} - Watch in Browser`,
            isEmbed: true
        });
    }
    
    console.log(`🎬 Found ${streams.length} streams`);
    return streams;
}

/**
 * Clear cache (useful for forcing refresh)
 */
function clearCache() {
    cache.events = null;
    cache.timestamp = 0;
    console.log('🗑️ Cache cleared');
}

module.exports = {
    fetchAllEvents,
    getEventsByCategory,
    searchEvents,
    getEventById,
    fetchStreamUrls,
    generateEventId,
    clearCache,
    NTV_SERVERS
};
