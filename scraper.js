/**
 * Web scraper module for fetching live sports streams
 * Supports multiple streaming sources
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { matchEventToCategory, getEnabledServers } = require('./servers');

// Cache for storing fetched events (TTL: 5 minutes)
const cache = {
    events: new Map(),
    ttl: 5 * 60 * 1000
};

// Generate a unique ID for an event
function generateEventId(event) {
    const cleanName = event.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .substring(0, 50);
    return `ntv_${cleanName}_${Date.now().toString(36)}`;
}

// Parse time string to Date object
function parseEventTime(timeStr) {
    try {
        // Handle various time formats
        if (!timeStr) return new Date();
        
        // Check if it's "LIVE" or similar
        if (timeStr.toLowerCase().includes('live')) {
            return new Date();
        }
        
        return new Date(timeStr);
    } catch {
        return new Date();
    }
}

/**
 * Fetch events from NTVStream
 */
async function fetchNTVStreamEvents(serverConfig) {
    const events = [];
    
    try {
        const response = await axios.get(serverConfig.baseUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Referer': serverConfig.baseUrl
            },
            timeout: 10000
        });

        const $ = cheerio.load(response.data);
        
        // Parse event listings - adjust selectors based on actual site structure
        // These selectors are examples and may need adjustment
        const eventSelectors = [
            '.event-item',
            '.match-item', 
            '.stream-item',
            '.schedule-item',
            'tr.match',
            '.competition-events li',
            '[data-event]'
        ];
        
        for (const selector of eventSelectors) {
            $(selector).each((i, element) => {
                try {
                    const $el = $(element);
                    
                    // Try multiple ways to get event info
                    const name = $el.find('.event-name, .match-name, .title, h3, h4, .teams').first().text().trim() ||
                                $el.find('a').first().text().trim() ||
                                $el.text().trim().substring(0, 100);
                    
                    if (!name || name.length < 3) return;
                    
                    const link = $el.find('a').first().attr('href') || 
                                $el.attr('href') ||
                                $el.data('link');
                    
                    const time = $el.find('.time, .event-time, .match-time, .date').first().text().trim() ||
                                $el.data('time') ||
                                '';
                    
                    const category = $el.find('.category, .sport, .league').first().text().trim() ||
                                    $el.data('category') ||
                                    '';
                    
                    const isLive = $el.hasClass('live') || 
                                  $el.find('.live, .live-badge').length > 0 ||
                                  time.toLowerCase().includes('live');
                    
                    const fullLink = link ? new URL(link, serverConfig.baseUrl).href : serverConfig.baseUrl;
                    
                    events.push({
                        id: generateEventId({ name }),
                        name: name,
                        link: fullLink,
                        time: parseEventTime(time),
                        timeStr: time || (isLive ? '🔴 LIVE' : 'Scheduled'),
                        category: category,
                        isLive: isLive,
                        server: serverConfig.id,
                        serverName: serverConfig.name,
                        matchedCategory: matchEventToCategory(name, category)
                    });
                } catch (err) {
                    // Skip malformed entries
                }
            });
        }
        
        // Also try to find direct stream links
        $('a[href*="stream"], a[href*="watch"], a[href*="live"]').each((i, element) => {
            try {
                const $el = $(element);
                const name = $el.text().trim();
                const link = $el.attr('href');
                
                if (name && name.length > 3 && link && !events.find(e => e.name === name)) {
                    const fullLink = new URL(link, serverConfig.baseUrl).href;
                    events.push({
                        id: generateEventId({ name }),
                        name: name,
                        link: fullLink,
                        time: new Date(),
                        timeStr: '🔴 LIVE',
                        category: '',
                        isLive: true,
                        server: serverConfig.id,
                        serverName: serverConfig.name,
                        matchedCategory: matchEventToCategory(name, '')
                    });
                }
            } catch (err) {
                // Skip malformed entries
            }
        });
        
    } catch (error) {
        console.error(`Error fetching from ${serverConfig.name}:`, error.message);
    }
    
    return events;
}

/**
 * Fetch stream URLs from an event page
 */
async function fetchStreamUrls(eventUrl, serverConfig) {
    const streams = [];
    
    try {
        const response = await axios.get(eventUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Referer': serverConfig.baseUrl
            },
            timeout: 10000
        });

        const $ = cheerio.load(response.data);
        
        // Look for embedded iframes (common for streaming sites)
        $('iframe').each((i, element) => {
            const src = $(element).attr('src') || $(element).attr('data-src');
            if (src && (src.includes('embed') || src.includes('player') || src.includes('stream'))) {
                streams.push({
                    type: 'externalUrl',
                    url: src.startsWith('http') ? src : `https:${src}`,
                    title: `${serverConfig.name} - Stream ${i + 1}`,
                    behaviorHints: {
                        notWebReady: true
                    }
                });
            }
        });
        
        // Look for direct video sources
        $('video source, video').each((i, element) => {
            const src = $(element).attr('src');
            if (src) {
                streams.push({
                    url: src.startsWith('http') ? src : new URL(src, eventUrl).href,
                    title: `${serverConfig.name} - Direct ${i + 1}`
                });
            }
        });
        
        // Look for m3u8/HLS links in scripts
        const pageContent = response.data;
        const m3u8Regex = /(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/gi;
        const m3u8Matches = pageContent.match(m3u8Regex) || [];
        
        m3u8Matches.forEach((url, i) => {
            if (!streams.find(s => s.url === url)) {
                streams.push({
                    url: url,
                    title: `${serverConfig.name} - HLS ${i + 1}`
                });
            }
        });
        
        // Look for server/quality options
        $('.server-item, .quality-option, [data-stream], .stream-link').each((i, element) => {
            const $el = $(element);
            const streamUrl = $el.attr('href') || $el.data('stream') || $el.data('url');
            const quality = $el.text().trim() || $el.data('quality') || '';
            
            if (streamUrl) {
                streams.push({
                    type: streamUrl.includes('.m3u8') ? undefined : 'externalUrl',
                    url: streamUrl.startsWith('http') ? streamUrl : new URL(streamUrl, eventUrl).href,
                    title: `${serverConfig.name} - ${quality || 'Server ' + (i + 1)}`,
                    behaviorHints: streamUrl.includes('.m3u8') ? undefined : { notWebReady: true }
                });
            }
        });
        
        // If no streams found, return the event page as external URL
        if (streams.length === 0) {
            streams.push({
                type: 'externalUrl',
                url: eventUrl,
                title: `${serverConfig.name} - Watch in Browser`,
                behaviorHints: {
                    notWebReady: true
                }
            });
        }
        
    } catch (error) {
        console.error(`Error fetching streams from ${eventUrl}:`, error.message);
        
        // Return event page as fallback
        streams.push({
            type: 'externalUrl',
            url: eventUrl,
            title: `${serverConfig.name} - Watch in Browser`,
            behaviorHints: {
                notWebReady: true
            }
        });
    }
    
    return streams;
}

/**
 * Fetch all events from all enabled servers
 */
async function fetchAllEvents(userConfig = {}) {
    // Check cache
    const cacheKey = 'all_events';
    const cached = cache.events.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cache.ttl) {
        return cached.data;
    }
    
    const servers = getEnabledServers(userConfig);
    const allEvents = [];
    
    // Fetch from all servers in parallel
    const fetchPromises = servers.map(async server => {
        try {
            if (server.id === 'ntvstream' || server.id === 'ntvstream_backup') {
                return await fetchNTVStreamEvents(server);
            }
            // Add more server-specific fetchers here
            return [];
        } catch (error) {
            console.error(`Failed to fetch from ${server.name}:`, error.message);
            return [];
        }
    });
    
    const results = await Promise.all(fetchPromises);
    results.forEach(events => allEvents.push(...events));
    
    // Sort by live status first, then by time
    allEvents.sort((a, b) => {
        if (a.isLive && !b.isLive) return -1;
        if (!a.isLive && b.isLive) return 1;
        return new Date(a.time) - new Date(b.time);
    });
    
    // Update cache
    cache.events.set(cacheKey, {
        data: allEvents,
        timestamp: Date.now()
    });
    
    return allEvents;
}

/**
 * Get events filtered by category
 */
async function getEventsByCategory(categoryId, userConfig = {}) {
    const allEvents = await fetchAllEvents(userConfig);
    
    if (!categoryId || categoryId === 'all') {
        return allEvents;
    }
    
    const cleanCategoryId = categoryId.replace('ntvstream_', '');
    return allEvents.filter(event => 
        event.matchedCategory && event.matchedCategory.id === cleanCategoryId
    );
}

/**
 * Search events by query
 */
async function searchEvents(query, userConfig = {}) {
    const allEvents = await fetchAllEvents(userConfig);
    const searchLower = query.toLowerCase();
    
    return allEvents.filter(event => 
        event.name.toLowerCase().includes(searchLower) ||
        (event.category && event.category.toLowerCase().includes(searchLower))
    );
}

/**
 * Get event by ID
 */
async function getEventById(eventId, userConfig = {}) {
    const allEvents = await fetchAllEvents(userConfig);
    return allEvents.find(event => event.id === eventId);
}

// Clear cache periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of cache.events.entries()) {
        if (now - value.timestamp > cache.ttl) {
            cache.events.delete(key);
        }
    }
}, cache.ttl);

module.exports = {
    fetchAllEvents,
    getEventsByCategory,
    searchEvents,
    getEventById,
    fetchStreamUrls,
    generateEventId
};

