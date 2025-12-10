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
        const html = response.data;
        
        // Try multiple selector strategies - NTVStream might use different classes
        const selectors = [
            '.match-card',
            '.event-card',
            '.game-card',
            '.match-item',
            '.event-item',
            '[data-match]',
            '[data-event]',
            '.card',
            'article',
            '.match',
            'tr[data-match]',
            'li.match',
            'a[href*="/watch"]',
            'a[href*="/match"]',
            'a[href*="/stream"]'
        ];
        
        const processedNames = new Set();
        
        // Try each selector
        for (const selector of selectors) {
            $(selector).each((i, el) => {
                try {
                    const $el = $(el);
                    
                    // Try to get title from multiple places
                    let title = '';
                    const titleSelectors = [
                        '.match-title',
                        '.event-title',
                        '.game-title',
                        'h3', 'h4', 'h2',
                        '.title',
                        '.name',
                        'a',
                        '.team-names',
                        '.teams'
                    ];
                    
                    for (const ts of titleSelectors) {
                        const found = $el.find(ts).first().text().trim();
                        if (found && found.length > 3) {
                            title = found;
                            break;
                        }
                    }
                    
                    // If no title found, try the element itself
                    if (!title) {
                        title = $el.text().trim().split('\n')[0].substring(0, 100);
                    }
                    
                    // Clean up title
                    title = title.replace(/\s+/g, ' ').trim();
                    
                    // Skip if too short or already processed
                    if (!title || title.length < 3 || processedNames.has(title.toLowerCase())) {
                        return;
                    }
                    processedNames.add(title.toLowerCase());
                    
                    // Get link - try multiple ways
                    let link = '';
                    const linkSelectors = [
                        'a[href]',
                        '[href]',
                        '[data-href]',
                        '[data-link]',
                        '[data-url]'
                    ];
                    
                    for (const ls of linkSelectors) {
                        const found = $el.find(ls).first().attr('href') || 
                                     $el.find(ls).first().attr('data-href') ||
                                     $el.find(ls).first().attr('data-link') ||
                                     $el.find(ls).first().attr('data-url');
                        if (found) {
                            link = found;
                            break;
                        }
                    }
                    
                    // Try onclick attribute
                    if (!link) {
                        const onclick = $el.attr('onclick') || $el.find('[onclick]').first().attr('onclick');
                        if (onclick) {
                            link = extractWatchUrl(onclick);
                        }
                    }
                    
                    // If still no link, try parent link
                    if (!link) {
                        link = $el.closest('a').attr('href') || '';
                    }
                    
                    // Make link absolute
                    if (link && !link.startsWith('http')) {
                        if (link.startsWith('/')) {
                            link = `https://ntvstream.cx${link}`;
                        } else {
                            link = `https://ntvstream.cx/${link}`;
                        }
                    }
                    
                    // Get category
                    const category = $el.attr('data-category') || 
                                   $el.find('[data-category]').first().attr('data-category') ||
                                   'sports';
                    
                    // Check if live
                    const isLive = $el.find('.live, .live-badge, [class*="live"]').length > 0 ||
                                  $el.text().toLowerCase().includes('live') ||
                                  $el.attr('class')?.toLowerCase().includes('live');
                    
                    // Get time
                    let timeStr = isLive ? '🔴 LIVE' : 'Scheduled';
                    const timeEl = $el.find('.time, .time-badge, .date, .scheduled, [class*="time"]').first();
                    if (timeEl.length > 0) {
                        timeStr = timeEl.text().trim() || timeStr;
                    }
                    
                    // Get source count
                    const metaText = $el.find('.meta, .match-meta, .sources, [class*="source"]').text();
                    const sources = parseSourceCount(metaText);
                    
                    // Only add if we have title and link
                    if (title && link) {
                        const eventId = generateEventId(title, category);
                        
                        events.push({
                            id: eventId,
                            name: title,
                            category: category,
                            isLive: isLive,
                            timeStr: timeStr,
                            link: link,
                            server: server.id,
                            serverName: `NTVStream ${server.name}`,
                            sources: sources,
                            matchedCategory: matchEventToCategory(title, category)
                        });
                    }
                } catch (err) {
                    // Skip malformed element
                    console.log(`Skipping element: ${err.message}`);
                }
            });
            
            // If we found events with this selector, break
            if (events.length > 0) {
                console.log(`✅ Found events using selector: ${selector}`);
                break;
            }
        }
        
        // Fallback: Look for any links that might be matches
        if (events.length === 0) {
            console.log('⚠️ No events found with standard selectors, trying fallback...');
            $('a[href*="watch"], a[href*="match"], a[href*="stream"]').each((i, el) => {
                try {
                    const $el = $(el);
                    const title = $el.text().trim();
                    const link = $el.attr('href');
                    
                    if (title && title.length > 3 && link && !processedNames.has(title.toLowerCase())) {
                        processedNames.add(title.toLowerCase());
                        const fullLink = link.startsWith('http') ? link : `https://ntvstream.cx${link}`;
                        const eventId = generateEventId(title, 'sports');
                        
                        events.push({
                            id: eventId,
                            name: title,
                            category: 'sports',
                            isLive: false,
                            timeStr: 'Live',
                            link: fullLink,
                            server: server.id,
                            serverName: `NTVStream ${server.name}`,
                            sources: 1,
                            matchedCategory: matchEventToCategory(title, 'sports')
                        });
                    }
                } catch (err) {
                    // Skip
                }
            });
        }
        
        console.log(`✅ Found ${events.length} events from ${server.name}`);
        
    } catch (error) {
        console.error(`❌ Error fetching from ${server.name}:`, error.message);
        console.error('Error stack:', error.stack);
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

        // Follow embedded players to discover direct HLS/DASH links
        const embedLinks = streams.filter(s => s.isEmbed).map(s => s.url);
        for (const embed of embedLinks) {
            try {
                const resp = await axios.get(embed, { headers });
                const $e = cheerio.load(resp.data);
                // find m3u8
                const m3u8ChildMatches = resp.data.match(/(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/gi) || [];
                m3u8ChildMatches.forEach((url, i) => {
                    if (!streams.find(s => s.url === url)) {
                        streams.push({
                            url,
                            title: `${serverConfig.name} - HLS ${i + 1}`,
                            isEmbed: false
                        });
                    }
                });
                // direct video sources
                $e('video source, video[src]').each((i, el) => {
                    const src = $e(el).attr('src');
                    if (src && src.startsWith('http') && !streams.find(s => s.url === src)) {
                        streams.push({
                            url: src,
                            title: `${serverConfig.name} - Direct Video`,
                            isEmbed: false
                        });
                    }
                });
            } catch (e) {
                // ignore
            }
        }
        
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
