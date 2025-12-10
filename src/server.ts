/**
 * NTVStream Sports Stremio Addon Server
 * HTTP server with configuration page
 */

import { serveHTTP } from 'stremio-addon-sdk';
import express from 'express';
import path from 'path';
import { addonInterface, manifest } from './addon';
import { SERVERS, CATEGORIES, getEnabledServers } from './config';

const app = express();

// Serve static files
app.use('/configure', express.static(path.join(__dirname, '..', 'public')));

// Configuration page
app.get('/configure', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'configure.html'));
});

// API: Get configuration
app.get('/api/config', (_req, res) => {
    res.json({
        servers: SERVERS,
        categories: CATEGORIES,
        manifest
    });
});

// API: Generate manifest URL
app.get('/api/manifest/:config', (req, res) => {
    try {
        const config = JSON.parse(Buffer.from(req.params.config, 'base64').toString());
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.headers['x-forwarded-host'] || req.get('host');
        const manifestUrl = `${protocol}://${host}/${req.params.config}/manifest.json`;
        
        res.json({
            installUrl: `stremio://${host}/${req.params.config}/manifest.json`,
            manifestUrl,
            config
        });
    } catch {
        res.status(400).json({ error: 'Invalid configuration' });
    }
});

// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', version: manifest.version });
});

// Start server
const PORT = parseInt(process.env.PORT || '7000');
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
    try {
        const { url } = await serveHTTP(addonInterface, {
            port: PORT,
            getRouter: (router) => {
                router.use(app);
                return router;
            }
        });
        
        console.log('\n' + '═'.repeat(60));
        console.log('🏟️  NTVStream Sports Stremio Addon');
        console.log('═'.repeat(60));
        console.log(`\n✅ Server running at: ${url}`);
        console.log(`\n📋 Manifest: ${url}/manifest.json`);
        console.log(`⚙️  Configure: ${url}/configure`);
        console.log('\n📱 Install in Stremio:');
        console.log(`   Paste this URL: ${url}/manifest.json`);
        console.log('\n' + '═'.repeat(60));
        console.log('\n📺 Categories:');
        Object.values(CATEGORIES).forEach(cat => {
            console.log(`   ${cat.icon} ${cat.name}`);
        });
        console.log('\n🌐 Servers:');
        getEnabledServers().forEach(server => {
            console.log(`   ✓ ${server.name}`);
        });
        console.log('\n' + '═'.repeat(60) + '\n');
        
        // Auto-launch if requested
        const args = process.argv.slice(2);
        if (args.includes('--launch') || args.includes('--install')) {
            const { exec } = await import('child_process');
            const stremioUrl = args.includes('--install')
                ? `stremio://${url.replace(/^https?:\/\//, '')}/manifest.json`
                : url;
            
            console.log('🚀 Opening Stremio...');
            
            const platform = process.platform;
            let command: string;
            
            if (platform === 'win32') {
                command = `start "" "${stremioUrl}"`;
            } else if (platform === 'darwin') {
                command = `open "${stremioUrl}"`;
            } else {
                command = `xdg-open "${stremioUrl}"`;
            }
            
            exec(command, (error) => {
                if (error) {
                    console.log('⚠️ Could not auto-open Stremio');
                }
            });
        }
        
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

start();

