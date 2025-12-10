/**
 * Server and category configurations
 */

import { ServerConfig, CategoryConfig } from './types';

export const SERVERS: Record<string, ServerConfig> = {
    kobra: {
        id: 'kobra',
        name: 'NTVStream KOBRA',
        baseUrl: 'https://ntvstream.cx/matches/kobra',
        enabled: true,
        priority: 1,
        description: 'KOBRA server match list'
    },
    titan: {
        id: 'titan',
        name: 'NTVStream TITAN',
        baseUrl: 'https://ntvstream.cx/matches/titan',
        enabled: true,
        priority: 2,
        description: 'TITAN server match list'
    },
    raptor: {
        id: 'raptor',
        name: 'NTVStream RAPTOR',
        baseUrl: 'https://ntvstream.cx/matches/raptor',
        enabled: true,
        priority: 3,
        description: 'RAPTOR server match list'
    },
    phoenix: {
        id: 'phoenix',
        name: 'NTVStream PHOENIX',
        baseUrl: 'https://ntvstream.cx/matches/phoenix',
        enabled: true,
        priority: 4,
        description: 'PHOENIX server match list'
    },
    scorpion: {
        id: 'scorpion',
        name: 'NTVStream SCORPION',
        baseUrl: 'https://ntvstream.cx/matches/scorpion',
        enabled: true,
        priority: 5,
        description: 'SCORPION server match list'
    },
    viper: {
        id: 'viper',
        name: 'NTVStream VIPER',
        baseUrl: 'https://ntvstream.cx/matches/viper',
        enabled: true,
        priority: 6,
        description: 'VIPER server match list'
    },
    ntvstream: {
        id: 'ntvstream',
        name: 'NTVStream',
        baseUrl: 'https://ntvstream.cx',
        enabled: true,
        priority: 10,
        description: 'Primary live sports streaming source',
        logo: 'https://ntvstream.cx/favicon.ico'
    },
    ntvstream_backup: {
        id: 'ntvstream_backup',
        name: 'NTVStream Backup',
        baseUrl: 'https://ntvstream.live',
        enabled: true,
        priority: 11,
        description: 'Backup NTVStream server'
    },
    ppvland: {
        id: 'ppvland',
        name: 'PPVLand',
        baseUrl: 'https://ppvland.tv',
        enabled: false,
        priority: 3,
        description: 'PPV and live sports events'
    },
    sportsurge: {
        id: 'sportsurge',
        name: 'SportSurge',
        baseUrl: 'https://sportsurge.io',
        enabled: false,
        priority: 4,
        description: 'Sports streaming aggregator'
    },
    crackstreams: {
        id: 'crackstreams',
        name: 'CrackStreams',
        baseUrl: 'https://crackstreams.biz',
        enabled: false,
        priority: 5,
        description: 'Sports streaming alternative'
    }
};

export const CATEGORIES: Record<string, CategoryConfig> = {
    football: {
        id: 'football',
        name: 'Football / Soccer',
        type: 'tv',
        genres: ['Football', 'Soccer', 'Premier League', 'La Liga', 'Champions League', 'Serie A', 'Bundesliga'],
        icon: '⚽',
        keywords: ['football', 'soccer', 'premier', 'liga', 'champions', 'epl', 'uefa', 'serie a', 'bundesliga', 'fa cup', 'world cup']
    },
    american_football: {
        id: 'american_football',
        name: 'American Football',
        type: 'tv',
        genres: ['NFL', 'NCAA Football', 'American Football', 'Super Bowl'],
        icon: '🏈',
        keywords: ['nfl', 'ncaa', 'american football', 'superbowl', 'super bowl', 'college football']
    },
    basketball: {
        id: 'basketball',
        name: 'Basketball',
        type: 'tv',
        genres: ['NBA', 'Basketball', 'NCAA Basketball', 'EuroLeague'],
        icon: '🏀',
        keywords: ['nba', 'basketball', 'ncaa', 'euroleague', 'fiba', 'wnba']
    },
    cricket: {
        id: 'cricket',
        name: 'Cricket',
        type: 'tv',
        genres: ['Cricket', 'IPL', 'Test Cricket', 'T20', 'ODI', 'BBL', 'PSL'],
        icon: '🏏',
        keywords: ['cricket', 'ipl', 't20', 'test', 'odi', 'bbl', 'psl', 'ashes', 'world cup cricket']
    },
    ufc_mma: {
        id: 'ufc_mma',
        name: 'UFC / MMA',
        type: 'tv',
        genres: ['UFC', 'MMA', 'Mixed Martial Arts', 'Bellator', 'ONE Championship'],
        icon: '🥊',
        keywords: ['ufc', 'mma', 'bellator', 'fight', 'martial', 'one fc', 'pfl', 'cage']
    },
    boxing: {
        id: 'boxing',
        name: 'Boxing',
        type: 'tv',
        genres: ['Boxing', 'Fight Night', 'PPV Boxing'],
        icon: '🥊',
        keywords: ['boxing', 'fight', 'heavyweight', 'ppv', 'canelo', 'fury', 'joshua']
    },
    wrestling: {
        id: 'wrestling',
        name: 'Wrestling / WWE',
        type: 'tv',
        genres: ['WWE', 'Wrestling', 'AEW', 'Impact', 'NXT'],
        icon: '🤼',
        keywords: ['wwe', 'wrestling', 'aew', 'raw', 'smackdown', 'nxt', 'impact', 'wrestlemania']
    },
    tennis: {
        id: 'tennis',
        name: 'Tennis',
        type: 'tv',
        genres: ['Tennis', 'ATP', 'WTA', 'Grand Slam', 'Wimbledon'],
        icon: '🎾',
        keywords: ['tennis', 'atp', 'wta', 'wimbledon', 'usopen', 'french open', 'australian open', 'roland garros']
    },
    hockey: {
        id: 'hockey',
        name: 'Hockey',
        type: 'tv',
        genres: ['NHL', 'Hockey', 'Ice Hockey', 'KHL'],
        icon: '🏒',
        keywords: ['nhl', 'hockey', 'ice hockey', 'khl', 'stanley cup']
    },
    baseball: {
        id: 'baseball',
        name: 'Baseball',
        type: 'tv',
        genres: ['MLB', 'Baseball', 'World Series'],
        icon: '⚾',
        keywords: ['mlb', 'baseball', 'world series']
    },
    motorsport: {
        id: 'motorsport',
        name: 'Motorsport',
        type: 'tv',
        genres: ['F1', 'Formula 1', 'NASCAR', 'MotoGP', 'IndyCar', 'WRC'],
        icon: '🏎️',
        keywords: ['f1', 'formula', 'nascar', 'motogp', 'racing', 'indycar', 'wrc', 'le mans', 'grand prix']
    },
    rugby: {
        id: 'rugby',
        name: 'Rugby',
        type: 'tv',
        genres: ['Rugby', 'Rugby Union', 'Rugby League', 'Six Nations'],
        icon: '🏉',
        keywords: ['rugby', 'union', 'league', 'six nations', 'super rugby']
    },
    golf: {
        id: 'golf',
        name: 'Golf',
        type: 'tv',
        genres: ['Golf', 'PGA', 'Masters', 'Ryder Cup'],
        icon: '⛳',
        keywords: ['golf', 'pga', 'masters', 'ryder cup', 'open championship']
    },
    darts: {
        id: 'darts',
        name: 'Darts',
        type: 'tv',
        genres: ['Darts', 'PDC', 'World Darts'],
        icon: '🎯',
        keywords: ['darts', 'pdc', 'world darts', 'premier league darts']
    },
    ppv: {
        id: 'ppv',
        name: 'PPV Events',
        type: 'tv',
        genres: ['PPV', 'Pay Per View', 'Special Events'],
        icon: '🎟️',
        keywords: ['ppv', 'pay per view', 'special', 'event', 'main event']
    },
    other_sports: {
        id: 'other_sports',
        name: 'Other Sports',
        type: 'tv',
        genres: ['Sports', 'Live Events', 'Olympics'],
        icon: '🏆',
        keywords: ['sports', 'live', 'event', 'olympics', 'esports']
    }
};

// Generate catalog definitions for the addon manifest
export function getCatalogDefinitions() {
    return Object.values(CATEGORIES).map(cat => ({
        type: cat.type,
        id: `ntvstream_${cat.id}`,
        name: `${cat.icon} ${cat.name}`,
        extra: [
            { name: 'skip', isRequired: false },
            { name: 'search', isRequired: false }
        ]
    }));
}

// Get all enabled servers sorted by priority
export function getEnabledServers(userConfig: Record<string, boolean> = {}): ServerConfig[] {
    return Object.values(SERVERS)
        .filter(server => {
            if (userConfig[server.id] !== undefined) {
                return userConfig[server.id];
            }
            return server.enabled;
        })
        .sort((a, b) => a.priority - b.priority);
}

// Get category by ID
export function getCategoryById(categoryId: string): CategoryConfig | null {
    const cleanId = categoryId.replace('ntvstream_', '');
    return CATEGORIES[cleanId] || null;
}

// Match an event to a category based on keywords
export function matchEventToCategory(eventName: string, eventDescription: string = ''): CategoryConfig {
    const searchText = `${eventName} ${eventDescription}`.toLowerCase();
    
    for (const category of Object.values(CATEGORIES)) {
        for (const keyword of category.keywords) {
            if (searchText.includes(keyword.toLowerCase())) {
                return category;
            }
        }
    }
    
    return CATEGORIES.other_sports;
}

// Addon metadata
export const ADDON_CONFIG = {
    id: 'community.ntvstream.sports',
    version: '1.0.0',
    name: 'NTVStream Sports',
    description: 'Live sports streaming addon with multiple server support. Watch Football, Cricket, UFC, Boxing, PPV events and more!',
    logo: 'https://img.icons8.com/color/512/stadium.png',
    background: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1920'
};

