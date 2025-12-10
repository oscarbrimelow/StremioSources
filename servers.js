/**
 * Server and category configurations for NTVStream
 * All servers from ntvstream.cx
 */

const SERVERS = {
    kobra: {
        id: 'kobra',
        name: 'NTVStream KOBRA',
        baseUrl: 'https://ntvstream.cx/matches/kobra',
        enabled: true,
        priority: 1,
        description: 'KOBRA Server - Primary'
    },
    titan: {
        id: 'titan',
        name: 'NTVStream TITAN',
        baseUrl: 'https://ntvstream.cx/matches/titan',
        enabled: true,
        priority: 2,
        description: 'TITAN Server'
    },
    raptor: {
        id: 'raptor',
        name: 'NTVStream RAPTOR',
        baseUrl: 'https://ntvstream.cx/matches/raptor',
        enabled: true,
        priority: 3,
        description: 'RAPTOR Server'
    },
    phoenix: {
        id: 'phoenix',
        name: 'NTVStream PHOENIX',
        baseUrl: 'https://ntvstream.cx/matches/phoenix',
        enabled: true,
        priority: 4,
        description: 'PHOENIX Server'
    },
    scorpion: {
        id: 'scorpion',
        name: 'NTVStream SCORPION',
        baseUrl: 'https://ntvstream.cx/matches/scorpion',
        enabled: true,
        priority: 5,
        description: 'SCORPION Server'
    },
    viper: {
        id: 'viper',
        name: 'NTVStream VIPER',
        baseUrl: 'https://ntvstream.cx/matches/viper',
        enabled: true,
        priority: 6,
        description: 'VIPER Server'
    },
    ntvstream: {
        id: 'ntvstream',
        name: 'NTVStream',
        baseUrl: 'https://ntvstream.cx',
        enabled: true,
        priority: 0,
        description: 'Main NTVStream'
    }
};

// Categories based on NTVStream
const CATEGORIES = {
    football: {
        id: 'football',
        name: 'Football / Soccer',
        type: 'tv',
        genres: ['Football', 'Soccer', 'Champions League', 'Premier League', 'La Liga'],
        icon: '⚽',
        keywords: ['football', 'soccer', 'premier', 'liga', 'champions', 'uefa', 'serie', 'bundesliga', 'championship', 'fa cup', 'league one', 'league two']
    },
    basketball: {
        id: 'basketball',
        name: 'Basketball',
        type: 'tv',
        genres: ['Basketball', 'NBA', 'EuroLeague'],
        icon: '🏀',
        keywords: ['basketball', 'nba', 'ncaa', 'euroleague', 'bcl']
    },
    hockey: {
        id: 'hockey',
        name: 'Hockey',
        type: 'tv',
        genres: ['Hockey', 'NHL', 'Ice Hockey'],
        icon: '🏒',
        keywords: ['hockey', 'nhl', 'ice']
    },
    cricket: {
        id: 'cricket',
        name: 'Cricket',
        type: 'tv',
        genres: ['Cricket', 'IPL', 'T20'],
        icon: '🏏',
        keywords: ['cricket', 'ipl', 't20', 'test', 'odi']
    },
    tennis: {
        id: 'tennis',
        name: 'Tennis',
        type: 'tv',
        genres: ['Tennis', 'ATP', 'WTA'],
        icon: '🎾',
        keywords: ['tennis', 'atp', 'wta', 'wimbledon', 'open']
    },
    golf: {
        id: 'golf',
        name: 'Golf',
        type: 'tv',
        genres: ['Golf', 'PGA'],
        icon: '⛳',
        keywords: ['golf', 'pga', 'masters']
    },
    ufc_mma: {
        id: 'ufc_mma',
        name: 'UFC / MMA',
        type: 'tv',
        genres: ['UFC', 'MMA', 'Fighting'],
        icon: '🥊',
        keywords: ['ufc', 'mma', 'bellator', 'fight', 'martial']
    },
    boxing: {
        id: 'boxing',
        name: 'Boxing',
        type: 'tv',
        genres: ['Boxing'],
        icon: '🥊',
        keywords: ['boxing', 'box']
    },
    wrestling: {
        id: 'wrestling',
        name: 'WWE / Wrestling',
        type: 'tv',
        genres: ['WWE', 'Wrestling', 'AEW'],
        icon: '🤼',
        keywords: ['wwe', 'wrestling', 'aew', 'raw', 'smackdown']
    },
    nfl: {
        id: 'nfl',
        name: 'NFL',
        type: 'tv',
        genres: ['NFL', 'American Football'],
        icon: '🏈',
        keywords: ['nfl', 'american football', 'super bowl']
    },
    baseball: {
        id: 'baseball',
        name: 'Baseball / MLB',
        type: 'tv',
        genres: ['MLB', 'Baseball'],
        icon: '⚾',
        keywords: ['mlb', 'baseball']
    },
    rugby: {
        id: 'rugby',
        name: 'Rugby',
        type: 'tv',
        genres: ['Rugby'],
        icon: '🏉',
        keywords: ['rugby', 'six nations']
    },
    motorsport: {
        id: 'motorsport',
        name: 'Motorsport / F1',
        type: 'tv',
        genres: ['F1', 'NASCAR', 'MotoGP'],
        icon: '🏎️',
        keywords: ['f1', 'formula', 'nascar', 'motogp', 'racing']
    },
    snooker: {
        id: 'snooker',
        name: 'Snooker',
        type: 'tv',
        genres: ['Snooker'],
        icon: '🎱',
        keywords: ['snooker', 'pool']
    },
    darts: {
        id: 'darts',
        name: 'Darts',
        type: 'tv',
        genres: ['Darts'],
        icon: '🎯',
        keywords: ['darts', 'pdc']
    },
    handball: {
        id: 'handball',
        name: 'Handball',
        type: 'tv',
        genres: ['Handball'],
        icon: '🤾',
        keywords: ['handball']
    },
    tvshows: {
        id: 'tvshows',
        name: 'TV Shows',
        type: 'tv',
        genres: ['TV Shows', 'Entertainment'],
        icon: '📺',
        keywords: ['tv shows', 'show', 'episode', 'season']
    },
    other: {
        id: 'other',
        name: 'Other Sports',
        type: 'tv',
        genres: ['Sports'],
        icon: '🏆',
        keywords: ['sports', 'live']
    }
};

// Generate catalog definitions
function getCatalogDefinitions() {
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

// Get enabled servers
function getEnabledServers(userConfig = {}) {
    return Object.values(SERVERS)
        .filter(s => s.enabled)
        .sort((a, b) => a.priority - b.priority);
}

// Get category by ID
function getCategoryById(categoryId) {
    const cleanId = categoryId.replace('ntvstream_', '');
    return CATEGORIES[cleanId] || null;
}

// Match event to category
function matchEventToCategory(eventName, eventCategory = '') {
    const searchText = `${eventName} ${eventCategory}`.toLowerCase();
    
    // Direct match first
    if (eventCategory && CATEGORIES[eventCategory.toLowerCase()]) {
        return CATEGORIES[eventCategory.toLowerCase()];
    }
    
    // Keyword search
    for (const cat of Object.values(CATEGORIES)) {
        for (const keyword of cat.keywords) {
            if (searchText.includes(keyword)) {
                return cat;
            }
        }
    }
    
    return CATEGORIES.other;
}

module.exports = {
    SERVERS,
    CATEGORIES,
    getCatalogDefinitions,
    getEnabledServers,
    getCategoryById,
    matchEventToCategory
};
