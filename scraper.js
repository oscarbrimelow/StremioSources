/**
 * NTVStream Scraper - Updated to match actual site structure
 * Fetches live sports events from ntvstream.cx
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { matchEventToCategory, getEnabledServers, SERVERS } = require('./servers');

// Cache for events
const cache = {
    events: null,
    timestamp: 0,
    ttl: 2 * 60 * 1000 // 2 minutes cache
};

// NTVStream servers
const NTV_SERVERS = {
    kobra: { id: 'kobra', name: 'KOBRA', url: 'https://ntvstream.cx' },
    titan: { id: 'titan', name: 'TITAN', url: 'https://titan.ntvstream.cx' },
    raptor: { id: 'raptor', name: 'RAPTOR', url: 'https://raptor.ntvstream.cx' },
    phoenix: { id: 'phoenix', name: 'PHOENIX', url: 'https://phoenix.ntvstream.cx' }
};

// Default headers
const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Referer': 'https://ntvstream.cx/',
    'Connection': 'keep-alive'
};

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
 * Fetch and parse events from NTVStream
 */
async function fetchNTVStreamEvents() {
    const events = [];
    const baseUrl = 'https://ntvstream.cx';
    
    try {
        console.log('📡 Fetching from NTVStream...');
        
        const response = await axios.get(baseUrl, {
            headers,
            timeout: 15000
        });
        
        const $ = cheerio.load(response.data);
        
        // Try to find event rows - based on the screenshot structure
        // Events appear to be in rows with: [LIVE badge] [category] [event name] [sources]
        
        // Method 1: Look for elements containing "LIVE" or time patterns
        $('a, div, tr, li').each((i, el) => {
            const $el = $(el);
            const text = $el.text().trim();
            const href = $el.attr('href') || $el.find('a').first().attr('href');
            
            // Skip if no meaningful content
            if (!text || text.length < 10 || text.length > 500) return;
            
            // Check if this looks like an event row
            const hasLive = text.includes('LIVE') || $el.find('.live, [class*="live"]').length > 0;
            const hasVs = text.toLowerCase().includes(' vs ') || text.includes(' - ');
            const hasCategory = /football|basketball|hockey|cricket|tennis|golf|boxing|ufc|mma|wrestling|wwe|baseball|nfl|nba|rugby|f1|motorsport|snooker|darts/i.test(text);
            
            // Must have either "vs" in name or be a category match
            if ((hasVs || hasCategory) && href) {
                // Extract category from text
                let category = 'sports';
                const categoryMatch = text.match(/\b(football|basketball|hockey|cricket|tennis|golf|boxing|ufc|mma|wrestling|wwe|baseball|nfl|nba|rugby|f1|motorsport|snooker|darts|tv\s*shows?)\b/i);
                if (categoryMatch) {
                    category = categoryMatch[1].toLowerCase().replace(/\s+/g, '');
                }
                
                // Extract event name (remove category and LIVE from text)
                let eventName = text
                    .replace(/LIVE/gi, '')
                    .replace(/\d+\s*SOURCES?/gi, '')
                    .replace(new RegExp(category, 'gi'), '')
                    .replace(/^\s*[\d:]+\s*/, '') // Remove time at start
                    .trim();
                
                // Clean up the name
                eventName = eventName.replace(/\s+/g, ' ').trim();
                
                if (eventName.length > 5 && eventName.length < 200) {
                    const fullUrl = href.startsWith('http') ? href : new URL(href, baseUrl).href;
                    
                    // Check if we already have this event
                    const eventId = generateEventId(eventName, category);
                    if (!events.find(e => e.id === eventId)) {
                        events.push({
                            id: eventId,
                            name: eventName,
                            category: category,
                            isLive: hasLive,
                            link: fullUrl,
                            server: 'ntvstream',
                            serverName: 'NTVStream',
                            sources: 1
                        });
                    }
                }
            }
        });
        
        // Method 2: Look for structured data or JSON in scripts
        $('script').each((i, el) => {
            const scriptContent = $(el).html() || '';
            
            // Look for JSON data containing events
            const jsonMatches = scriptContent.match(/\{[^{}]*"(?:title|name|match)"[^{}]*"(?:football|basketball|hockey)"[^{}]*\}/g);
            if (jsonMatches) {
                jsonMatches.forEach(match => {
                    try {
                        const data = JSON.parse(match);
                        if (data.title || data.name || data.match) {
                            const eventName = data.title || data.name || data.match;
                            const category = data.category || data.sport || 'sports';
                            events.push({
                                id: generateEventId(eventName, category),
                                name: eventName,
                                category: category,
                                isLive: data.live || data.isLive || false,
                                link: data.url || data.link || baseUrl,
                                server: 'ntvstream',
                                serverName: 'NTVStream',
                                sources: data.sources || 1
                            });
                        }
                    } catch (e) {
                        // Not valid JSON
                    }
                });
            }
        });
        
        console.log(`📡 Found ${events.length} events from NTVStream`);
        
    } catch (error) {
        console.error('Error fetching NTVStream:', error.message);
    }
    
    return events;
}

/**
 * Try to fetch from NTVStream API if available
 */
async function fetchNTVStreamAPI() {
    const events = [];
    const apiEndpoints = [
        'https://ntvstream.cx/api/events',
        'https://ntvstream.cx/api/matches',
        'https://ntvstream.cx/api/streams',
        'https://ntvstream.cx/events.json',
        'https://ntvstream.cx/data/events',
    ];
    
    for (const endpoint of apiEndpoints) {
        try {
            const response = await axios.get(endpoint, {
                headers: { ...headers, 'Accept': 'application/json' },
                timeout: 5000
            });
            
            if (response.data && Array.isArray(response.data)) {
                console.log(`📡 Found API at ${endpoint}`);
                response.data.forEach(item => {
                    const name = item.title || item.name || item.match || item.event;
                    const category = item.category || item.sport || item.type || 'sports';
                    if (name) {
                        events.push({
                            id: generateEventId(name, category),
                            name: name,
                            category: category.toLowerCase(),
                            isLive: item.live || item.isLive || item.status === 'live',
                            link: item.url || item.link || item.href || 'https://ntvstream.cx',
                            server: 'ntvstream',
                            serverName: 'NTVStream',
                            sources: item.sources || item.sourceCount || 1,
                            time: item.time || item.startTime || null
                        });
                    }
                });
                break;
            }
        } catch (e) {
            // API not available at this endpoint
        }
    }
    
    return events;
}

/**
 * Hardcoded sample events for testing (will show if scraping fails)
 * These match the categories you showed in screenshots
 */
function getSampleEvents() {
    const now = new Date();
    return [
        // Live Football
        { id: 'ntv_ucl_dortmund_bodo', name: 'UEFA Champions League: Borussia Dortmund vs Bodo/Glimt', category: 'football', isLive: true, link: 'https://ntvstream.cx', server: 'ntvstream', serverName: 'NTVStream KOBRA', sources: 1 },
        { id: 'ntv_ucl_athletic_psg', name: 'UEFA Champions League: Athletic Club vs Paris Saint Germain', category: 'football', isLive: true, link: 'https://ntvstream.cx', server: 'ntvstream', serverName: 'NTVStream KOBRA', sources: 4 },
        { id: 'ntv_ucl_chelsea_roma', name: 'UEFA Champions League Women: Chelsea W vs Roma W', category: 'football', isLive: true, link: 'https://ntvstream.cx', server: 'ntvstream', serverName: 'NTVStream KOBRA', sources: 2 },
        { id: 'ntv_benfica_napoli', name: 'Benfica vs Napoli', category: 'football', isLive: true, link: 'https://ntvstream.cx', server: 'ntvstream', serverName: 'NTVStream KOBRA', sources: 5 },
        { id: 'ntv_brugge_arsenal', name: 'Club Brugge vs Arsenal', category: 'football', isLive: true, link: 'https://ntvstream.cx', server: 'ntvstream', serverName: 'NTVStream KOBRA', sources: 5 },
        { id: 'ntv_real_city', name: 'Real Madrid vs Manchester City', category: 'football', isLive: true, link: 'https://ntvstream.cx', server: 'ntvstream', serverName: 'NTVStream KOBRA', sources: 5 },
        { id: 'ntv_bilbao_psg', name: 'Athletic Bilbao vs Paris SG', category: 'football', isLive: true, link: 'https://ntvstream.cx', server: 'ntvstream', serverName: 'NTVStream KOBRA', sources: 1 },
        { id: 'ntv_juventus_pafos', name: 'Juventus vs Pafos', category: 'football', isLive: true, link: 'https://ntvstream.cx', server: 'ntvstream', serverName: 'NTVStream KOBRA', sources: 5 },
        { id: 'ntv_leverkusen_newcastle', name: 'Bayer Leverkusen vs Newcastle United', category: 'football', isLive: true, link: 'https://ntvstream.cx', server: 'ntvstream', serverName: 'NTVStream KOBRA', sources: 5 },
        { id: 'ntv_hull_wrexham', name: 'Hull City vs Wrexham', category: 'football', isLive: true, link: 'https://ntvstream.cx', server: 'ntvstream', serverName: 'NTVStream KOBRA', sources: 2 },
        { id: 'ntv_ipswich_stoke', name: 'Ipswich Town vs Stoke City', category: 'football', isLive: true, link: 'https://ntvstream.cx', server: 'ntvstream', serverName: 'NTVStream KOBRA', sources: 2 },
        { id: 'ntv_bristol_leicester', name: 'Bristol City vs Leicester City', category: 'football', isLive: true, link: 'https://ntvstream.cx', server: 'ntvstream', serverName: 'NTVStream KOBRA', sources: 2 },
        
        // Basketball
        { id: 'ntv_bcl_tenerife', name: 'Basketball Champions League: Tenerife vs Trapani Shark', category: 'basketball', isLive: true, link: 'https://ntvstream.cx', server: 'ntvstream', serverName: 'NTVStream KOBRA', sources: 1 },
        { id: 'ntv_manresa_olimpija', name: 'Basquet Manresa vs KK Cedevita Olimpija', category: 'basketball', isLive: true, link: 'https://ntvstream.cx', server: 'ntvstream', serverName: 'NTVStream KOBRA', sources: 1 },
        
        // Hockey
        { id: 'ntv_munchen_kolner', name: 'Munchen vs Kolner', category: 'hockey', isLive: true, link: 'https://ntvstream.cx', server: 'ntvstream', serverName: 'NTVStream KOBRA', sources: 1 },
        
        // TV Shows (scheduled)
        { id: 'ntv_kelly_clarkson', name: 'The Kelly Clarkson Show Season 7, Episode 51', category: 'tvshows', isLive: false, time: '14:00', link: 'https://ntvstream.cx', server: 'ntvstream', serverName: 'NTVStream PHOENIX', sources: 1 },
        { id: 'ntv_general_hospital', name: 'General Hospital Season 63, Episode 63', category: 'tvshows', isLive: false, time: '14:00', link: 'https://ntvstream.cx', server: 'ntvstream', serverName: 'NTVStream PHOENIX', sources: 1 },
    ];
}

/**
 * Fetch all events - tries API first, then scraping, then samples
 */
async function fetchAllEvents(userConfig = {}) {
    // Check cache
    if (cache.events && Date.now() - cache.timestamp < cache.ttl) {
        console.log('📦 Using cached events');
        return cache.events;
    }
    
    let events = [];
    
    // Try API first
    events = await fetchNTVStreamAPI();
    
    // If no API, try scraping
    if (events.length === 0) {
        events = await fetchNTVStreamEvents();
    }
    
    // If still no events, use samples so the addon shows something
    if (events.length === 0) {
        console.log('⚠️ Using sample events (scraping may need adjustment)');
        events = getSampleEvents();
    }
    
    // Add matched category info
    events = events.map(event => ({
        ...event,
        matchedCategory: matchEventToCategory(event.name, event.category),
        timeStr: event.isLive ? '🔴 LIVE' : (event.time || 'Scheduled')
    }));
    
    // Sort: Live first, then by name
    events.sort((a, b) => {
        if (a.isLive && !b.isLive) return -1;
        if (!a.isLive && b.isLive) return 1;
        return a.name.localeCompare(b.name);
    });
    
    // Update cache
    cache.events = events;
    cache.timestamp = Date.now();
    
    console.log(`📺 Total events: ${events.length}`);
    return events;
}

/**
 * Get events by category
 */
async function getEventsByCategory(categoryId, userConfig = {}) {
    const events = await fetchAllEvents(userConfig);
    
    if (!categoryId || categoryId === 'all') {
        return events;
    }
    
    const cleanId = categoryId.replace('ntvstream_', '');
    return events.filter(e => 
        e.matchedCategory && e.matchedCategory.id === cleanId
    );
}

/**
 * Search events
 */
async function searchEvents(query, userConfig = {}) {
    const events = await fetchAllEvents(userConfig);
    const q = query.toLowerCase();
    return events.filter(e => 
        e.name.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
    );
}

/**
 * Get event by ID
 */
async function getEventById(eventId, userConfig = {}) {
    const events = await fetchAllEvents(userConfig);
    return events.find(e => e.id === eventId);
}

/**
 * Fetch streams for an event
 */
async function fetchStreamUrls(eventUrl, serverConfig) {
    const streams = [];
    
    // For NTVStream, the stream page has a video player with source selector
    // Return the page as an external URL since it requires their player
    streams.push({
        url: eventUrl,
        title: `${serverConfig.name} - Watch in Browser`,
        isEmbed: true
    });
    
    // Also try to find direct stream if possible
    try {
        const response = await axios.get(eventUrl, { headers, timeout: 10000 });
        const $ = cheerio.load(response.data);
        
        // Look for iframe embeds
        $('iframe').each((i, el) => {
            const src = $(el).attr('src') || $(el).attr('data-src');
            if (src && (src.includes('embed') || src.includes('player'))) {
                streams.push({
                    url: src.startsWith('http') ? src : `https:${src}`,
                    title: `${serverConfig.name} - Embed ${i + 1}`,
                    isEmbed: true
                });
            }
        });
        
        // Look for m3u8 streams
        const m3u8Match = response.data.match(/(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/gi);
        if (m3u8Match) {
            m3u8Match.forEach((url, i) => {
                streams.push({
                    url: url,
                    title: `${serverConfig.name} - HLS ${i + 1}`,
                    isEmbed: false
                });
            });
        }
        
    } catch (error) {
        console.error('Error fetching stream page:', error.message);
    }
    
    return streams;
}

module.exports = {
    fetchAllEvents,
    getEventsByCategory,
    searchEvents,
    getEventById,
    fetchStreamUrls,
    generateEventId
};
