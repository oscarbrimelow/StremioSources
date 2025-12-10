/**
 * Enhanced web scraper for fetching live sports streams
 * Supports multiple streaming sources with improved extraction
 */

import axios, { AxiosRequestConfig } from 'axios';
import * as cheerio from 'cheerio';
import { SportEvent, ServerConfig, StreamLink, CacheEntry, ScrapedStream, UserConfig } from './types';
import { SERVERS, matchEventToCategory, getEnabledServers } from './config';

// Cache for storing fetched events
const cache = {
    events: new Map<string, CacheEntry<SportEvent[]>>(),
    streams: new Map<string, CacheEntry<ScrapedStream[]>>(),
    ttl: 5 * 60 * 1000 // 5 minutes
};

// Common headers for requests
const DEFAULT_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
};

/**
 * Generate a unique ID for an event
 */
export function generateEventId(eventName: string): string {
    const cleanName = eventName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .substring(0, 50);
    const hash = Buffer.from(eventName).toString('base64').substring(0, 8);
    return `ntv_${cleanName}_${hash}`;
}

/**
 * Parse time string to Date object
 */
function parseEventTime(timeStr: string): Date {
    if (!timeStr) return new Date();
    
    const lower = timeStr.toLowerCase();
    if (lower.includes('live') || lower.includes('now') || lower.includes('playing')) {
        return new Date();
    }
    
    try {
        // Try parsing as ISO date
        const parsed = new Date(timeStr);
        if (!isNaN(parsed.getTime())) {
            return parsed;
        }
    } catch {
        // Fall through
    }
    
    return new Date();
}

/**
 * Make HTTP request with retry logic
 */
async function fetchWithRetry(url: string, options: AxiosRequestConfig = {}, retries = 2): Promise<string> {
    const config: AxiosRequestConfig = {
        ...options,
        timeout: 15000,
        headers: {
            ...DEFAULT_HEADERS,
            ...options.headers
        },
        maxRedirects: 5
    };
    
    for (let i = 0; i <= retries; i++) {
        try {
            const response = await axios.get(url, config);
            return response.data;
        } catch (error) {
            if (i === retries) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
    }
    
    throw new Error('Failed to fetch after retries');
}

/**
 * Extract stream URLs from page content
 */
function extractStreamUrls(html: string, baseUrl: string): ScrapedStream[] {
    const streams: ScrapedStream[] = [];
    const $ = cheerio.load(html);
    const seenUrls = new Set<string>();
    
    // Extract iframes (common for embedded players)
    $('iframe').each((_, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src') || $(el).data('lazy-src');
        if (src && !seenUrls.has(src)) {
            const fullUrl = src.startsWith('http') ? src : src.startsWith('//') ? `https:${src}` : new URL(src, baseUrl).href;
            if (fullUrl.includes('embed') || fullUrl.includes('player') || fullUrl.includes('stream')) {
                seenUrls.add(fullUrl);
                streams.push({
                    url: fullUrl,
                    title: 'Embedded Player',
                    isEmbed: true
                });
            }
        }
    });
    
    // Extract video sources
    $('video source, video[src]').each((_, el) => {
        const src = $(el).attr('src');
        if (src && !seenUrls.has(src)) {
            const fullUrl = src.startsWith('http') ? src : new URL(src, baseUrl).href;
            seenUrls.add(fullUrl);
            streams.push({
                url: fullUrl,
                title: 'Direct Video',
                quality: $(el).attr('label') || $(el).attr('data-quality')
            });
        }
    });
    
    // Extract HLS/m3u8 links from scripts
    const m3u8Regex = /(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/gi;
    const m3u8Matches = html.match(m3u8Regex) || [];
    m3u8Matches.forEach(url => {
        if (!seenUrls.has(url)) {
            seenUrls.add(url);
            streams.push({
                url,
                title: 'HLS Stream'
            });
        }
    });
    
    // Extract MPD/DASH links
    const mpdRegex = /(https?:\/\/[^\s"'<>]+\.mpd[^\s"'<>]*)/gi;
    const mpdMatches = html.match(mpdRegex) || [];
    mpdMatches.forEach(url => {
        if (!seenUrls.has(url)) {
            seenUrls.add(url);
            streams.push({
                url,
                title: 'DASH Stream'
            });
        }
    });
    
    // Extract direct MP4 links
    const mp4Regex = /(https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*)/gi;
    const mp4Matches = html.match(mp4Regex) || [];
    mp4Matches.forEach(url => {
        if (!seenUrls.has(url) && !url.includes('poster') && !url.includes('thumb')) {
            seenUrls.add(url);
            streams.push({
                url,
                title: 'MP4 Video'
            });
        }
    });
    
    // Extract server/quality links
    $('.server-item, .quality-option, [data-stream], .stream-link, .btn-stream, [data-url]').each((i, el) => {
        const $el = $(el);
        const streamUrl = $el.attr('href') || $el.data('stream') || $el.data('url') || $el.data('link');
        const quality = $el.text().trim() || $el.data('quality') || $el.attr('title') || '';
        
        if (streamUrl && typeof streamUrl === 'string' && !seenUrls.has(streamUrl)) {
            const fullUrl = streamUrl.startsWith('http') ? streamUrl : new URL(streamUrl, baseUrl).href;
            seenUrls.add(fullUrl);
            streams.push({
                url: fullUrl,
                title: quality || `Server ${i + 1}`,
                quality
            });
        }
    });
    
    return streams;
}

/**
 * Fetch events from NTVStream
 */
async function fetchNTVStreamEvents(server: ServerConfig): Promise<SportEvent[]> {
    const events: SportEvent[] = [];
    
    try {
        const html = await fetchWithRetry(server.baseUrl, {
            headers: { Referer: server.baseUrl }
        });
        
        const $ = cheerio.load(html);
        
        // Multiple selector strategies for different site layouts
        const eventSelectors = [
            '.event-item',
            '.match-item',
            '.stream-item',
            '.schedule-item',
            'tr.match',
            '.competition-events li',
            '[data-event]',
            '.event-card',
            '.game-card',
            '.fixture',
            '.listing-item'
        ];
        
        const processedNames = new Set<string>();
        
        for (const selector of eventSelectors) {
            $(selector).each((_, element) => {
                try {
                    const $el = $(element);
                    
                    // Try multiple ways to get event name
                    let name = '';
                    const nameSelectors = ['.event-name', '.match-name', '.title', 'h3', 'h4', '.teams', '.event-title', '.fixture-teams'];
                    for (const ns of nameSelectors) {
                        const found = $el.find(ns).first().text().trim();
                        if (found && found.length > 3) {
                            name = found;
                            break;
                        }
                    }
                    if (!name) {
                        name = $el.find('a').first().text().trim() || $el.text().trim().substring(0, 100);
                    }
                    
                    // Skip if name is too short or already processed
                    if (!name || name.length < 3 || processedNames.has(name.toLowerCase())) {
                        return;
                    }
                    processedNames.add(name.toLowerCase());
                    
                    // Get link
                    const link = $el.find('a').first().attr('href') || 
                                $el.attr('href') ||
                                $el.data('link') ||
                                $el.data('href');
                    
                    const fullLink = link ? new URL(link, server.baseUrl).href : server.baseUrl;
                    
                    // Get time
                    const timeStr = $el.find('.time, .event-time, .match-time, .date, .kickoff').first().text().trim() ||
                                   $el.data('time') || '';
                    
                    // Check if live
                    const isLive = $el.hasClass('live') ||
                                  $el.find('.live, .live-badge, .live-indicator, .now-live').length > 0 ||
                                  timeStr.toLowerCase().includes('live') ||
                                  $el.text().toLowerCase().includes('live now');
                    
                    // Get category
                    const category = $el.find('.category, .sport, .league, .competition').first().text().trim() ||
                                    $el.data('category') || '';
                    
                    const matchedCategory = matchEventToCategory(name, category);
                    
                    events.push({
                        id: generateEventId(name),
                        name,
                        link: fullLink,
                        time: parseEventTime(timeStr),
                        timeStr: isLive ? '🔴 LIVE' : timeStr || 'Scheduled',
                        category,
                        isLive,
                        server: server.id,
                        serverName: server.name,
                        matchedCategory,
                        poster: `https://img.icons8.com/color/256/${matchedCategory.id}.png`,
                        description: `${matchedCategory.icon} ${matchedCategory.name} - ${server.name}`
                    });
                } catch {
                    // Skip malformed entries
                }
            });
        }
        
        // Also scan for direct watch/stream links
        $('a[href*="stream"], a[href*="watch"], a[href*="live"]').each((_, el) => {
            try {
                const $el = $(el);
                const name = $el.text().trim();
                const link = $el.attr('href');
                
                if (name && name.length > 5 && link && !processedNames.has(name.toLowerCase())) {
                    processedNames.add(name.toLowerCase());
                    const fullLink = new URL(link, server.baseUrl).href;
                    const matchedCategory = matchEventToCategory(name, '');
                    
                    events.push({
                        id: generateEventId(name),
                        name,
                        link: fullLink,
                        time: new Date(),
                        timeStr: '🔴 LIVE',
                        category: '',
                        isLive: true,
                        server: server.id,
                        serverName: server.name,
                        matchedCategory,
                        poster: `https://img.icons8.com/color/256/${matchedCategory.id}.png`,
                        description: `${matchedCategory.icon} ${matchedCategory.name} - ${server.name}`
                    });
                }
            } catch {
                // Skip
            }
        });
        
    } catch (error) {
        console.error(`Error fetching from ${server.name}:`, error instanceof Error ? error.message : 'Unknown error');
    }
    
    return events;
}

/**
 * Fetch stream URLs from an event page
 */
export async function fetchStreamUrls(eventUrl: string, server: ServerConfig): Promise<ScrapedStream[]> {
    // Check cache
    const cacheKey = eventUrl;
    const cached = cache.streams.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cache.ttl) {
        return cached.data;
    }
    
    let streams: ScrapedStream[] = [];
    
    try {
        const html = await fetchWithRetry(eventUrl, {
            headers: { Referer: server.baseUrl }
        });
        
        streams = extractStreamUrls(html, eventUrl);
        streams = streams.map(s => ({
            ...s,
            headers: {
                Referer: server.baseUrl,
                'User-Agent': DEFAULT_HEADERS['User-Agent']
            }
        }));

        // Follow embedded players to discover direct HLS/DASH links
        const embedLinks = streams.filter(s => s.isEmbed).map(s => s.url);
        const discovered: ScrapedStream[] = [];
        for (const embed of embedLinks) {
            try {
                const embedHtml = await fetchWithRetry(embed, { headers: { Referer: eventUrl } });
                const childStreams = extractStreamUrls(embedHtml, embed).map(cs => ({
                    ...cs,
                    headers: {
                        Referer: server.baseUrl,
                        'User-Agent': DEFAULT_HEADERS['User-Agent']
                    }
                }));
                childStreams.forEach(cs => discovered.push(cs));
            } catch {
                // ignore
            }
        }
        // Merge discovered direct streams
        const seen = new Set(streams.map(s => s.url));
        for (const s of discovered) {
            if (s.url && !seen.has(s.url)) {
                seen.add(s.url);
                streams.push(s);
            }
        }
        
        // If no streams found, add the page as external URL
        if (streams.length === 0) {
            streams.push({
                url: eventUrl,
                title: `${server.name} - Watch in Browser`,
                isEmbed: true
            });
        }
        
        // Cache results
        cache.streams.set(cacheKey, {
            data: streams,
            timestamp: Date.now()
        });
        
    } catch (error) {
        console.error(`Error fetching streams from ${eventUrl}:`, error instanceof Error ? error.message : 'Unknown error');
        
        // Fallback to event page
        streams.push({
            url: eventUrl,
            title: `${server.name} - Watch in Browser`,
            isEmbed: true
        });
    }
    
    return streams;
}

/**
 * Fetch all events from all enabled servers
 */
export async function fetchAllEvents(userConfig: UserConfig = {}): Promise<SportEvent[]> {
    // Check cache
    const cacheKey = 'all_events_' + JSON.stringify(userConfig.servers || {});
    const cached = cache.events.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cache.ttl) {
        return cached.data;
    }
    
    const servers = getEnabledServers(userConfig.servers || {});
    const allEvents: SportEvent[] = [];
    
    // Fetch from all servers in parallel
    const results = await Promise.allSettled(
        servers.map(async server => {
            return await fetchNTVStreamEvents(server);
        })
    );
    
    results.forEach(result => {
        if (result.status === 'fulfilled') {
            allEvents.push(...result.value);
        }
    });
    
    // Sort: live first, then by time
    allEvents.sort((a, b) => {
        if (a.isLive && !b.isLive) return -1;
        if (!a.isLive && b.isLive) return 1;
        return new Date(a.time).getTime() - new Date(b.time).getTime();
    });
    
    // Remove duplicates by name similarity
    const uniqueEvents: SportEvent[] = [];
    const seenNames = new Set<string>();
    
    for (const event of allEvents) {
        const normalizedName = event.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!seenNames.has(normalizedName)) {
            seenNames.add(normalizedName);
            uniqueEvents.push(event);
        }
    }
    
    // Cache results
    cache.events.set(cacheKey, {
        data: uniqueEvents,
        timestamp: Date.now()
    });
    
    return uniqueEvents;
}

/**
 * Get events filtered by category
 */
export async function getEventsByCategory(categoryId: string, userConfig: UserConfig = {}): Promise<SportEvent[]> {
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
export async function searchEvents(query: string, userConfig: UserConfig = {}): Promise<SportEvent[]> {
    const allEvents = await fetchAllEvents(userConfig);
    const searchLower = query.toLowerCase();
    
    return allEvents.filter(event =>
        event.name.toLowerCase().includes(searchLower) ||
        (event.category && event.category.toLowerCase().includes(searchLower)) ||
        (event.matchedCategory && event.matchedCategory.name.toLowerCase().includes(searchLower))
    );
}

/**
 * Get event by ID
 */
export async function getEventById(eventId: string, userConfig: UserConfig = {}): Promise<SportEvent | undefined> {
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
    for (const [key, value] of cache.streams.entries()) {
        if (now - value.timestamp > cache.ttl) {
            cache.streams.delete(key);
        }
    }
}, cache.ttl);

