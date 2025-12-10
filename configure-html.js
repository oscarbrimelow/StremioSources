/**
 * Configure page HTML - exported for use in addon.js
 */

module.exports = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NTVStream Sports - Stremio Addon</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
            --bg: #0a0a0f;
            --surface: #151520;
            --surface-hover: #1a1a2e;
            --text: #e0e0e8;
            --text-muted: #8b8b9e;
            --accent: #00ff88;
            --accent-hover: #00cc6a;
            --border: rgba(255, 255, 255, 0.08);
        }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: var(--bg);
            color: var(--text);
            min-height: 100vh;
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 4rem 2rem;
        }
        .header {
            text-align: center;
            margin-bottom: 4rem;
        }
        .logo {
            font-size: 3.5rem;
            margin-bottom: 1rem;
            display: inline-block;
        }
        h1 {
            font-size: 2rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            letter-spacing: -0.02em;
        }
        .tagline {
            color: var(--text-muted);
            font-size: 1rem;
            font-weight: 400;
        }
        .main-card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 3rem;
            margin-bottom: 2rem;
            backdrop-filter: blur(10px);
        }
        .install-btn {
            width: 100%;
            padding: 1.25rem 2rem;
            background: var(--accent);
            color: #000;
            border: none;
            border-radius: 12px;
            font-size: 1rem;
            font-weight: 600;
            font-family: inherit;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.75rem;
            margin-bottom: 1.5rem;
        }
        .install-btn:hover {
            background: var(--accent-hover);
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(0, 255, 136, 0.3);
        }
        .url-display {
            background: rgba(0, 0, 0, 0.3);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 1rem;
            font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
            font-size: 0.85rem;
            color: var(--text-muted);
            word-break: break-all;
            text-align: center;
            margin-bottom: 1rem;
        }
        .copy-btn {
            width: 100%;
            padding: 0.875rem;
            background: transparent;
            color: var(--text);
            border: 1px solid var(--border);
            border-radius: 8px;
            font-size: 0.9rem;
            font-weight: 500;
            font-family: inherit;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .copy-btn:hover {
            background: var(--surface-hover);
            border-color: var(--accent);
        }
        .toast {
            position: fixed;
            bottom: 2rem;
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            background: var(--surface);
            border: 1px solid var(--border);
            color: var(--text);
            padding: 1rem 1.5rem;
            border-radius: 12px;
            font-size: 0.9rem;
            font-weight: 500;
            opacity: 0;
            transition: all 0.3s ease;
            z-index: 1000;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }
        .toast.show {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
        .footer {
            text-align: center;
            margin-top: 3rem;
            padding-top: 2rem;
            border-top: 1px solid var(--border);
            color: var(--text-muted);
            font-size: 0.875rem;
        }
        .footer a {
            color: var(--accent);
            text-decoration: none;
        }
        @media (max-width: 640px) {
            .container { padding: 2rem 1.5rem; }
            .main-card { padding: 2rem 1.5rem; }
            h1 { font-size: 1.75rem; }
            .logo { font-size: 3rem; }
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <div class="logo">🏟️</div>
            <h1>NTVStream Sports</h1>
            <p class="tagline">Live sports streaming for Stremio</p>
        </header>
        <div class="main-card">
            <button class="install-btn" onclick="installAddon()">
                <span>⚡</span>
                <span>Install in Stremio</span>
            </button>
            <div class="url-display" id="manifestUrl">Loading...</div>
            <button class="copy-btn" onclick="copyUrl()">Copy URL</button>
        </div>
        <footer class="footer">
            <p>Built with <a href="https://github.com/Stremio/stremio-addon-sdk" target="_blank">Stremio Addon SDK</a></p>
        </footer>
    </div>
    <div class="toast" id="toast"></div>
    <script>
        const baseUrl = window.location.origin;
        document.getElementById('manifestUrl').textContent = baseUrl + '/manifest.json';
        function installAddon() {
            const manifestUrl = baseUrl + '/manifest.json';
            const stremioUrl = 'stremio://' + manifestUrl.replace(/^https?:\\/\\//, '');
            const link = document.createElement('a');
            link.href = stremioUrl;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            setTimeout(() => document.body.removeChild(link), 100);
            document.getElementById('toast').textContent = 'Opening Stremio...';
            document.getElementById('toast').classList.add('show');
            setTimeout(() => document.getElementById('toast').classList.remove('show'), 3000);
        }
        function copyUrl() {
            const url = baseUrl + '/manifest.json';
            navigator.clipboard.writeText(url).then(() => {
                document.getElementById('toast').textContent = 'URL copied!';
                document.getElementById('toast').classList.add('show');
                setTimeout(() => document.getElementById('toast').classList.remove('show'), 3000);
            });
        }
    </script>
</body>
</html>`;

