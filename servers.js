/**
 * Server configurations for NTVStream and other streaming sources
 * Users can enable/disable servers from the configuration page
 */

const SERVERS = {
    ntvstream: {
        id: 'ntvstream',
        name: 'NTVStream',
        baseUrl: 'https://ntvstream.cx',
        enabled: true,
        priority: 1,
        description: 'Primary live sports streaming source',
        logo: 'https://ntvstream.cx/favicon.ico'
    },
    ntvstream_backup: {
        id: 'ntvstream_backup',
        name: 'NTVStream Backup',
        baseUrl: 'https://ntvstream.live',
        enabled: true,
        priority: 2,
        description: 'Backup NTVStream server'
    },
    stream2watch: {
        id: 'stream2watch',
        name: 'Stream2Watch',
        baseUrl: 'https://stream2watch.sx',
        enabled: false,
        priority: 3,
        description: 'Alternative sports streaming'
    },
    crackstreams: {
        id: 'crackstreams',
        name: 'CrackStreams',
        baseUrl: 'https://crackstreams.biz',
        enabled: false,
        priority: 4,
        description: 'Sports streaming alternative'
    }
};

// Sports categories supported by the addon
const CATEGORIES = {
    football: {
        id: 'football',
        name: 'Football / Soccer',
        type: 'tv',
        genres: ['Football', 'Soccer', 'Premier League', 'La Liga', 'Champions League'],
        icon: '⚽',
        keywords: ['football', 'soccer', 'premier', 'liga', 'champions', 'epl', 'uefa']
    },
    american_football: {
        id: 'american_football',
        name: 'American Football',
        type: 'tv',
        genres: ['NFL', 'NCAA Football', 'American Football'],
        icon: '🏈',
        keywords: ['nfl', 'ncaa', 'american football', 'superbowl']
    },
    basketball: {
        id: 'basketball',
        name: 'Basketball',
        type: 'tv',
        genres: ['NBA', 'Basketball', 'NCAA Basketball'],
        icon: '🏀',
        keywords: ['nba', 'basketball', 'ncaa']
    },
    cricket: {
        id: 'cricket',
        name: 'Cricket',
        type: 'tv',
        genres: ['Cricket', 'IPL', 'Test Cricket', 'T20'],
        icon: '🏏',
        keywords: ['cricket', 'ipl', 't20', 'test', 'odi', 'bbl']
    },
    ufc_mma: {
        id: 'ufc_mma',
        name: 'UFC / MMA',
        type: 'tv',
        genres: ['UFC', 'MMA', 'Mixed Martial Arts', 'Bellator'],
        icon: '🥊',
        keywords: ['ufc', 'mma', 'bellator', 'fight', 'martial']
    },
    boxing: {
        id: 'boxing',
        name: 'Boxing',
        type: 'tv',
        genres: ['Boxing', 'Fight Night'],
        icon: '🥊',
        keywords: ['boxing', 'fight', 'heavyweight', 'ppv']
    },
    wrestling: {
        id: 'wrestling',
        name: 'Wrestling / WWE',
        type: 'tv',
        genres: ['WWE', 'Wrestling', 'AEW'],
        icon: '🤼',
        keywords: ['wwe', 'wrestling', 'aew', 'raw', 'smackdown']
    },
    tennis: {
        id: 'tennis',
        name: 'Tennis',
        type: 'tv',
        genres: ['Tennis', 'ATP', 'WTA', 'Grand Slam'],
        icon: '🎾',
        keywords: ['tennis', 'atp', 'wta', 'wimbledon', 'usopen']
    },
    hockey: {
        id: 'hockey',
        name: 'Hockey',
        type: 'tv',
        genres: ['NHL', 'Hockey', 'Ice Hockey'],
        icon: '🏒',
        keywords: ['nhl', 'hockey', 'ice hockey']
    },
    baseball: {
        id: 'baseball',
        name: 'Baseball',
        type: 'tv',
        genres: ['MLB', 'Baseball'],
        icon: '⚾',
        keywords: ['mlb', 'baseball']
    },
    motorsport: {
        id: 'motorsport',
        name: 'Motorsport',
        type: 'tv',
        genres: ['F1', 'Formula 1', 'NASCAR', 'MotoGP'],
        icon: '🏎️',
        keywords: ['f1', 'formula', 'nascar', 'motogp', 'racing']
    },
    rugby: {
        id: 'rugby',
        name: 'Rugby',
        type: 'tv',
        genres: ['Rugby', 'Rugby Union', 'Rugby League'],
        icon: '🏉',
        keywords: ['rugby', 'union', 'league']
    },
    golf: {
        id: 'golf',
        name: 'Golf',
        type: 'tv',
        genres: ['Golf', 'PGA', 'Masters'],
        icon: '⛳',
        keywords: ['golf', 'pga', 'masters']
    },
    other_sports: {
        id: 'other_sports',
        name: 'Other Sports',
        type: 'tv',
        genres: ['Sports', 'Live Events'],
        icon: '🏆',
        keywords: ['sports', 'live', 'event']
    }
};

// Generate catalog definitions for the addon manifest
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

// Get all enabled servers sorted by priority
function getEnabledServers(userConfig = {}) {
    return Object.values(SERVERS)
        .filter(server => {
            // Check user config first, fall back to default
            if (userConfig.servers && userConfig.servers[server.id] !== undefined) {
                return userConfig.servers[server.id];
            }
            return server.enabled;
        })
        .sort((a, b) => a.priority - b.priority);
}

// Get category by ID
function getCategoryById(categoryId) {
    // Remove prefix if present
    const cleanId = categoryId.replace('ntvstream_', '');
    return CATEGORIES[cleanId] || null;
}

// Match an event to a category based on keywords
function matchEventToCategory(eventName, eventDescription = '') {
    const searchText = `${eventName} ${eventDescription}`.toLowerCase();
    
    for (const [id, category] of Object.entries(CATEGORIES)) {
        for (const keyword of category.keywords) {
            if (searchText.includes(keyword.toLowerCase())) {
                return category;
            }
        }
    }
    
    return CATEGORIES.other_sports;
}

module.exports = {
    SERVERS,
    CATEGORIES,
    getCatalogDefinitions,
    getEnabledServers,
    getCategoryById,
    matchEventToCategory
};

