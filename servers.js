/**
 * Server and category configurations for NTVStream
 * Updated based on actual site structure
 */

const SERVERS = {
    ntvstream: {
        id: 'ntvstream',
        name: 'NTVStream',
        baseUrl: 'https://ntvstream.cx',
        enabled: true,
        priority: 1,
        description: 'Primary live sports streaming (KOBRA server)'
    },
    ntvstream_titan: {
        id: 'ntvstream_titan',
        name: 'NTVStream TITAN',
        baseUrl: 'https://ntvstream.cx',
        enabled: true,
        priority: 2,
        description: 'TITAN server'
    },
    ntvstream_raptor: {
        id: 'ntvstream_raptor',
        name: 'NTVStream RAPTOR',
        baseUrl: 'https://ntvstream.cx',
        enabled: true,
        priority: 3,
        description: 'RAPTOR server'
    },
    ntvstream_phoenix: {
        id: 'ntvstream_phoenix',
        name: 'NTVStream PHOENIX',
        baseUrl: 'https://ntvstream.cx',
        enabled: true,
        priority: 4,
        description: 'PHOENIX server (TV Shows & more)'
    }
};

// Categories based on actual NTVStream categories from screenshots
const CATEGORIES = {
    football: {
        id: 'football',
        name: 'Football / Soccer',
        type: 'tv',
        genres: ['Football', 'Soccer', 'Premier League', 'La Liga', 'Champions League', 'Serie A', 'Bundesliga', 'Championship'],
        icon: '⚽',
        keywords: ['football', 'soccer', 'premier', 'liga', 'champions', 'epl', 'uefa', 'serie a', 'bundesliga', 'fa cup', 'world cup', 'league one', 'league two', 'championship']
    },
    basketball: {
        id: 'basketball',
        name: 'Basketball',
        type: 'tv',
        genres: ['Basketball', 'NBA', 'NCAA', 'EuroLeague', 'Champions League Basketball'],
        icon: '🏀',
        keywords: ['basketball', 'nba', 'ncaa', 'euroleague', 'fiba', 'wnba', 'bcl']
    },
    hockey: {
        id: 'hockey',
        name: 'Hockey',
        type: 'tv',
        genres: ['Hockey', 'NHL', 'Ice Hockey', 'Field Hockey'],
        icon: '🏒',
        keywords: ['hockey', 'nhl', 'ice hockey', 'field hockey', 'khl']
    },
    cricket: {
        id: 'cricket',
        name: 'Cricket',
        type: 'tv',
        genres: ['Cricket', 'IPL', 'Test Cricket', 'T20', 'ODI'],
        icon: '🏏',
        keywords: ['cricket', 'ipl', 't20', 'test', 'odi', 'bbl', 'psl', 'ashes']
    },
    tennis: {
        id: 'tennis',
        name: 'Tennis',
        type: 'tv',
        genres: ['Tennis', 'ATP', 'WTA', 'Grand Slam'],
        icon: '🎾',
        keywords: ['tennis', 'atp', 'wta', 'wimbledon', 'usopen', 'french open', 'australian open']
    },
    golf: {
        id: 'golf',
        name: 'Golf',
        type: 'tv',
        genres: ['Golf', 'PGA', 'Masters', 'Ryder Cup'],
        icon: '⛳',
        keywords: ['golf', 'pga', 'masters', 'ryder cup', 'open championship']
    },
    ufc_mma: {
        id: 'ufc_mma',
        name: 'UFC / MMA',
        type: 'tv',
        genres: ['UFC', 'MMA', 'Mixed Martial Arts', 'Bellator'],
        icon: '🥊',
        keywords: ['ufc', 'mma', 'bellator', 'fight', 'martial', 'one fc', 'pfl']
    },
    boxing: {
        id: 'boxing',
        name: 'Boxing',
        type: 'tv',
        genres: ['Boxing', 'Fight Night', 'PPV Boxing'],
        icon: '🥊',
        keywords: ['boxing', 'fight', 'heavyweight', 'ppv']
    },
    wrestling: {
        id: 'wrestling',
        name: 'WWE / Wrestling',
        type: 'tv',
        genres: ['WWE', 'Wrestling', 'AEW', 'NXT'],
        icon: '🤼',
        keywords: ['wwe', 'wrestling', 'aew', 'raw', 'smackdown', 'nxt', 'wrestlemania']
    },
    nfl: {
        id: 'nfl',
        name: 'NFL / American Football',
        type: 'tv',
        genres: ['NFL', 'American Football', 'NCAA Football', 'Super Bowl'],
        icon: '🏈',
        keywords: ['nfl', 'american football', 'superbowl', 'ncaa football', 'college football']
    },
    nba: {
        id: 'nba',
        name: 'NBA',
        type: 'tv',
        genres: ['NBA', 'Basketball'],
        icon: '🏀',
        keywords: ['nba']
    },
    baseball: {
        id: 'baseball',
        name: 'Baseball / MLB',
        type: 'tv',
        genres: ['MLB', 'Baseball', 'World Series'],
        icon: '⚾',
        keywords: ['mlb', 'baseball', 'world series']
    },
    rugby: {
        id: 'rugby',
        name: 'Rugby',
        type: 'tv',
        genres: ['Rugby', 'Rugby Union', 'Rugby League', 'Six Nations'],
        icon: '🏉',
        keywords: ['rugby', 'union', 'league', 'six nations']
    },
    motorsport: {
        id: 'motorsport',
        name: 'Motorsport / F1',
        type: 'tv',
        genres: ['F1', 'Formula 1', 'NASCAR', 'MotoGP', 'IndyCar'],
        icon: '🏎️',
        keywords: ['f1', 'formula', 'nascar', 'motogp', 'racing', 'indycar', 'grand prix']
    },
    snooker: {
        id: 'snooker',
        name: 'Snooker',
        type: 'tv',
        genres: ['Snooker', 'Pool', 'Billiards'],
        icon: '🎱',
        keywords: ['snooker', 'pool', 'billiards']
    },
    darts: {
        id: 'darts',
        name: 'Darts',
        type: 'tv',
        genres: ['Darts', 'PDC'],
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
    futsal: {
        id: 'futsal',
        name: 'Futsal',
        type: 'tv',
        genres: ['Futsal', 'Indoor Football'],
        icon: '⚽',
        keywords: ['futsal', 'indoor']
    },
    tvshows: {
        id: 'tvshows',
        name: 'TV Shows',
        type: 'tv',
        genres: ['TV Shows', 'Entertainment', 'Talk Shows'],
        icon: '📺',
        keywords: ['tv shows', 'tvshows', 'show', 'episode', 'season', 'talk show']
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
        .filter(server => {
            if (userConfig.servers && userConfig.servers[server.id] !== undefined) {
                return userConfig.servers[server.id];
            }
            return server.enabled;
        })
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
    
    // Direct category match first
    if (eventCategory) {
        const directMatch = Object.values(CATEGORIES).find(cat => 
            cat.id === eventCategory.toLowerCase() ||
            cat.keywords.includes(eventCategory.toLowerCase())
        );
        if (directMatch) return directMatch;
    }
    
    // Keyword search
    for (const category of Object.values(CATEGORIES)) {
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
