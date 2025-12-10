# Deploy Without Node.js Installed Locally

## Option 1: Deploy to Vercel (Recommended - Free)

### Step 1: Create a GitHub Account
1. Go to https://github.com and sign up

### Step 2: Create a New Repository
1. Click "New repository"
2. Name it `ntvstream-stremio-addon`
3. Make it Public
4. Don't initialize with README (we have our own)

### Step 3: Upload Your Code
You can drag and drop files directly on GitHub:
1. Open your repository
2. Click "uploading an existing file"
3. Drag all files from `C:\StremioSources\StremioSources\` into the browser
4. Click "Commit changes"

### Step 4: Deploy to Vercel
1. Go to https://vercel.com
2. Sign up with your GitHub account
3. Click "Add New Project"
4. Import your `ntvstream-stremio-addon` repository
5. Click "Deploy"
6. Wait for build to complete (2-3 minutes)

### Step 5: Get Your Addon URL
Your addon will be available at:
```
https://your-project-name.vercel.app/manifest.json
```

### Step 6: Install in Stremio
1. Open Stremio
2. Go to Addons → Community Addons
3. Paste your Vercel URL in the search box
4. Click Install

---

## Option 2: Deploy to Railway (Free Tier)

1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Railway will auto-detect and deploy
6. Get your URL from the deployment

---

## Option 3: Deploy to Render (Free)

1. Go to https://render.com
2. Sign up with GitHub
3. Click "New" → "Web Service"
4. Connect your repository
5. Set:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
6. Deploy and get your URL

---

## Option 4: Use Replit (Online IDE + Hosting)

1. Go to https://replit.com
2. Sign up for free
3. Click "Create Repl"
4. Choose "Import from GitHub"
5. Paste your repository URL
6. Replit will set up Node.js automatically
7. Click "Run" to start your addon
8. Get the URL from the preview panel

---

## Option 5: Use GitHub Codespaces (Free)

1. Go to your GitHub repository
2. Click the green "Code" button
3. Click "Codespaces" tab
4. Click "Create codespace on main"
5. A VS Code environment opens in your browser with Node.js pre-installed
6. Run: `npm install && npm start`
7. Use the forwarded port URL

---

## Option 6: Portable Node.js (No Install Required)

Download portable Node.js that runs without installation:

### Windows:
1. Go to https://nodejs.org/en/download/
2. Download "Windows Binary (.zip)" (not the installer)
3. Extract to a folder like `C:\nodejs-portable\`
4. Open Command Prompt in that folder
5. Run: `node.exe -v` to verify
6. Navigate to your addon: `cd C:\StremioSources\StremioSources`
7. Run: `C:\nodejs-portable\npm.cmd install`
8. Run: `C:\nodejs-portable\node.exe addon.js`

---

## Quick Comparison

| Option | Difficulty | Free | Persistent URL | Local Dev |
|--------|-----------|------|----------------|-----------|
| Vercel | ⭐ Easy | ✅ Yes | ✅ Yes | ❌ No |
| Railway | ⭐ Easy | ✅ Yes | ✅ Yes | ❌ No |
| Render | ⭐ Easy | ✅ Yes | ✅ Yes | ❌ No |
| Replit | ⭐ Easy | ✅ Yes | ✅ Yes | ✅ Yes |
| Codespaces | ⭐⭐ Medium | ✅ Limited | ❌ Temp | ✅ Yes |
| Portable Node | ⭐⭐ Medium | ✅ Yes | ❌ No | ✅ Yes |

## Recommended: Vercel

Vercel is the easiest and gives you a permanent HTTPS URL that works with Stremio!

