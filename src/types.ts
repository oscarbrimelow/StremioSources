/**
 * Type definitions for the NTVStream Sports addon
 */

export interface ServerConfig {
    id: string;
    name: string;
    baseUrl: string;
    enabled: boolean;
    priority: number;
    description: string;
    logo?: string;
}

export interface CategoryConfig {
    id: string;
    name: string;
    type: string;
    genres: string[];
    icon: string;
    keywords: string[];
}

export interface SportEvent {
    id: string;
    name: string;
    link: string;
    time: Date;
    timeStr: string;
    category: string;
    isLive: boolean;
    server: string;
    serverName: string;
    matchedCategory: CategoryConfig | null;
    streams?: StreamLink[];
    poster?: string;
    description?: string;
}

export interface StreamLink {
    url: string;
    title: string;
    quality?: string;
    server?: string;
    type?: 'hls' | 'dash' | 'mp4' | 'embed' | 'external';
    headers?: Record<string, string>;
}

export interface UserConfig {
    servers?: Record<string, boolean>;
    preferredQuality?: string;
    autoPlay?: boolean;
}

export interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

export interface ScrapedStream {
    url: string;
    title: string;
    quality?: string;
    isEmbed?: boolean;
    headers?: Record<string, string>;
}

// Stremio specific types
export interface StremioStream {
    url?: string;
    externalUrl?: string;
    title?: string;
    name?: string;
    behaviorHints?: {
        notWebReady?: boolean;
        bingeGroup?: string;
        proxyHeaders?: {
            request?: Record<string, string>;
            response?: Record<string, string>;
        };
    };
}

export interface StremioMeta {
    id: string;
    type: string;
    name: string;
    poster?: string;
    posterShape?: 'square' | 'poster' | 'landscape';
    background?: string;
    logo?: string;
    description?: string;
    genres?: string[];
    releaseInfo?: string;
    runtime?: string;
    website?: string;
    links?: Array<{
        name: string;
        category: string;
        url: string;
    }>;
}

