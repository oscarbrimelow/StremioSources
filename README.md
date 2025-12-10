# 🏟️ NTVStream Sports - Stremio Addon

A feature-rich Stremio addon for live sports streaming with multiple server support. Watch Football, Cricket, UFC, Boxing, PPV events and more!

Inspired by [stremio-addon-ppvstreams](https://github.com/jpants36/stremio-addon-ppvstreams).

## ✨ Features

- 📺 **16 Sports Categories**: Football, Cricket, UFC/MMA, Boxing, Basketball, Tennis, Darts, PPV events and more
- 🌐 **Multiple Server Support**: Configure which streaming servers to use
- ⚙️ **User Configuration**: Select your preferred servers through a beautiful configuration page
- 🔴 **Live Event Indicators**: See which events are currently live
- 🔄 **Auto-refreshing Cache**: Event listings automatically refresh every 5 minutes
- 🎯 **Smart Stream Extraction**: Automatically finds HLS, DASH, MP4, and embedded streams
- 📱 **Cross-platform**: Works on all Stremio platforms (Windows, macOS, Linux, Android, iOS)

## 📺 Categories

| Category | Sports Included |
|----------|----------------|
| ⚽ Football | Soccer, Premier League, La Liga, Champions League, Serie A, Bundesliga |
| 🏈 American Football | NFL, NCAA Football, Super Bowl |
| 🏀 Basketball | NBA, NCAA Basketball, EuroLeague |
| 🏏 Cricket | IPL, T20, Test Cricket, ODI, BBL, PSL |
| 🥊 UFC/MMA | UFC, Bellator, ONE Championship, PFL |
| 🥊 Boxing | Boxing events, PPV fights |
| 🤼 Wrestling | WWE, AEW, Impact, NXT |
| 🎾 Tennis | ATP, WTA, Grand Slams, Wimbledon |
| 🏒 Hockey | NHL, KHL, Stanley Cup |
| ⚾ Baseball | MLB, World Series |
| 🏎️ Motorsport | F1, NASCAR, MotoGP, IndyCar, WRC |
| 🏉 Rugby | Rugby Union, Rugby League, Six Nations |
| ⛳ Golf | PGA, Masters, Ryder Cup |
| 🎯 Darts | PDC, World Darts Championship |
| 🎟️ PPV Events | Pay-Per-View special events |
| 🏆 Other Sports | Olympics, Esports, and more |

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v16 or higher
- [Stremio](https://www.stremio.com/) desktop or mobile app

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/ntvstream-stremio-addon.git
cd ntvstream-stremio-addon

# Install dependencies
npm install

# Build TypeScript (optional, for production)
npm run build

# Start the addon
npm start
```

### Quick Launch (Development)

```bash
# JavaScript version (no build required)
npm run start:js

# TypeScript version with auto-launch
npm run dev

# Watch mode for development
npm run watch
```

## 📱 Installing in Stremio

1. Start the addon (`npm start` or `npm run start:js`)
2. Open the configuration page at `http://127.0.0.1:7000/configure`
3. Select your preferred streaming servers
4. Click **"Install in Stremio"** or copy the manifest URL
5. Alternatively, paste `http://127.0.0.1:7000/manifest.json` into Stremio's addon search

## ⚙️ Configuration

### Web Configuration Page

Visit `http://127.0.0.1:7000/configure` to:

- ✅ Enable/disable streaming servers
- 📺 View all available sports categories
- 🔗 Get your personalized addon URL
- ⚡ One-click install to Stremio

### Available Servers

| Server | Description | Default |
|--------|-------------|---------|
| NTVStream | Primary live sports streaming source | ✅ Enabled |
| NTVStream Backup | Backup NTVStream server | ✅ Enabled |
| PPVLand | PPV and live sports events | ❌ Disabled |
| SportSurge | Sports streaming aggregator | ❌ Disabled |
| CrackStreams | Sports streaming alternative | ❌ Disabled |

## 📁 Project Structure

```
ntvstream-stremio-addon/
├── src/                    # TypeScript source files
│   ├── addon.ts           # Main addon logic
│   ├── server.ts          # HTTP server
│   ├── scraper.ts         # Web scraping module
│   ├── config.ts          # Server & category configs
│   └── types.ts           # TypeScript types
├── public/
│   └── configure.html     # Configuration web page
├── dist/                   # Compiled JavaScript (after build)
├── addon.js               # JavaScript version (standalone)
├── servers.js             # Server configs (JS version)
├── scraper.js             # Scraper (JS version)
├── package.json
├── tsconfig.json
├── vercel.json            # Vercel deployment config
├── beamup.json            # BeamUp deployment config
└── README.md
```

## 🌐 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Build and deploy
npm run build
npm run deploy:vercel
```

### BeamUp (Stremio's Hosting)

```bash
# Deploy to BeamUp
npm run build
npm run deploy:beamup
```

See [BeamUp documentation](https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/deploying/beamup.md) for details.

### Local Network

```bash
HOST=0.0.0.0 PORT=7000 npm start
```

Access from other devices: `http://YOUR_IP:7000/manifest.json`

**Note:** Remote addon URLs must use HTTPS (except `127.0.0.1`).

## 🔌 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `/manifest.json` | Addon manifest |
| `/catalog/:type/:id.json` | Category catalog |
| `/meta/:type/:id.json` | Event metadata |
| `/stream/:type/:id.json` | Stream links |
| `/configure` | Configuration page |
| `/api/config` | Server/category config (JSON) |
| `/health` | Health check endpoint |

## 🛠️ Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `7000` |
| `HOST` | Server host | `0.0.0.0` |
| `NODE_ENV` | Environment | `development` |

## 🔧 Customization

### Adding New Servers

Edit `src/config.ts` (TypeScript) or `servers.js` (JavaScript):

```typescript
export const SERVERS = {
    // ... existing servers
    myserver: {
        id: 'myserver',
        name: 'My Server',
        baseUrl: 'https://myserver.com',
        enabled: false,
        priority: 10,
        description: 'My custom server'
    }
};
```

### Adding New Categories

```typescript
export const CATEGORIES = {
    // ... existing categories
    esports: {
        id: 'esports',
        name: 'Esports',
        type: 'tv',
        genres: ['Esports', 'Gaming', 'League of Legends'],
        icon: '🎮',
        keywords: ['esports', 'gaming', 'lol', 'dota', 'csgo']
    }
};
```

## 🐛 Troubleshooting

### No streams showing
1. Check if the streaming website is accessible
2. Verify your internet connection
3. Try enabling different servers in configuration
4. Check console for error messages

### Addon not installing
1. Ensure Stremio is running
2. Verify the manifest URL is correct
3. For remote access, ensure HTTPS is enabled

### Build errors
```bash
npm run clean
npm install
npm run build
```

## ⚠️ Legal Disclaimer

This addon is provided for **educational purposes only**.

- Users are responsible for ensuring they have the right to access the content
- This addon does not host any content
- Please respect copyright laws in your jurisdiction
- The developers are not responsible for how this addon is used

## 🤝 Contributing

Contributions are welcome! Feel free to:

- 🐛 Report bugs
- 💡 Suggest new features
- 🌐 Add support for new streaming sources
- 🔧 Improve the scraping logic
- 📖 Improve documentation

## 📚 Resources

- [Stremio Addon SDK](https://github.com/Stremio/stremio-addon-sdk)
- [Stremio Addon Guide](https://stremio.github.io/stremio-addon-guide)
- [Protocol Specification](https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/protocol.md)
- [PPVStreams Addon](https://github.com/jpants36/stremio-addon-ppvstreams) - Inspiration

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

---

Built with ❤️ using the [Stremio Addon SDK](https://github.com/Stremio/stremio-addon-sdk)
