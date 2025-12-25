# Installation & Setup Guide

## 🚀 Quick Install (3 Steps)

### Step 1: Install FFmpeg

FFmpeg is **required** for the app to function.

#### macOS
```bash
brew install ffmpeg
```

#### Windows
**Option A - Automatic (Recommended):**
```bash
# Using Chocolatey
choco install ffmpeg

# Using Scoop
scoop install ffmpeg
```

**Option B - Manual:**
1. Download from: https://github.com/BtbN/FFmpeg-Builds/releases
2. Extract the archive
3. Add `bin` folder to your PATH
4. Or place `ffmpeg.exe` and `ffprobe.exe` in `resources/ffmpeg/` folder

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install ffmpeg
```

#### Linux (Fedora/RHEL)
```bash
sudo dnf install ffmpeg
```

**Verify Installation:**
```bash
ffmpeg -version
ffprobe -version
```

You should see version information. If not, FFmpeg is not properly installed.

---

### Step 2: Install Node.js Dependencies

```bash
cd projects/ultimate-mp3-mp4-editor
npm install
```

This will take 2-3 minutes and install ~400 packages.

**Expected output:**
```
added 450 packages, and audited 451 packages in 2m
...
found 0 vulnerabilities
```

---

### Step 3: Run the App!

```bash
npm run dev
```

**What happens:**
1. Vite dev server starts on port 5173
2. Main process compiles (TypeScript → JavaScript)
3. Electron window opens automatically
4. You should see the "Ultimate MP3/MP4 Editor" interface

**First time might take 10-20 seconds to compile everything.**

---

## ✅ Verification Checklist

After running `npm run dev`, verify:

- [ ] Electron window opens
- [ ] You see "Ultimate MP3/MP4 Editor" title
- [ ] Left panel shows "Files" section with "+ Add Files" button
- [ ] No red error messages in the window
- [ ] Terminal shows no critical errors

**If something fails, see Troubleshooting below.**

---

## 🎬 Your First Edit (2 Minutes)

1. **Get a test file:**
   - Use any MP3 or MP4 you have
   - Or download a sample: https://file-examples.com/

2. **Import:**
   - Click "+ Add Files"
   - Select your media file
   - It appears in the file list

3. **Edit:**
   - Click on the file to load it
   - See video/waveform appear
   - Drag the green START handle
   - Drag the red END handle
   - Click "Play Selection"

4. **Export:**
   - Click "Export Cut Selection"
   - Choose location
   - Click "Export"
   - Wait for progress bar
   - Done!

---

## 🔧 Troubleshooting

### "FFmpeg not found" or FFmpeg errors

**Symptoms:**
- Error: "Cannot find ffmpeg"
- Waveform doesn't generate
- Export fails immediately

**Solutions:**

1. **Check FFmpeg is installed:**
   ```bash
   ffmpeg -version
   ```
   If this fails, FFmpeg is not installed or not in PATH.

2. **Reinstall FFmpeg:**
   Follow Step 1 instructions above carefully.

3. **Manual FFmpeg path (Windows):**
   Place `ffmpeg.exe` and `ffprobe.exe` in:
   ```
   projects/ultimate-mp3-mp4-editor/resources/ffmpeg/
   ```

4. **Restart terminal:**
   After installing FFmpeg, close and reopen your terminal.

### "Cannot find module" or npm errors

**Symptoms:**
- Import errors in terminal
- "Module not found"
- App won't start

**Solutions:**

1. **Clean install:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check Node.js version:**
   ```bash
   node --version  # Should be 18+ or 20+
   ```
   If older, update Node.js from https://nodejs.org/

3. **Check npm version:**
   ```bash
   npm --version  # Should be 9+ or 10+
   ```

### Port 5173 already in use

**Symptoms:**
- "Port 5173 is in use"
- Dev server won't start

**Solutions:**

1. **Kill process using port:**
   ```bash
   # macOS/Linux
   lsof -ti:5173 | xargs kill -9
   
   # Windows
   netstat -ano | findstr :5173
   taskkill /PID <PID> /F
   ```

2. **Change port (optional):**
   Edit `vite.config.ts`, change port to 5174.

### App opens but shows blank screen

**Symptoms:**
- Electron window opens
- Window is completely white/blank
- No UI appears

**Solutions:**

1. **Check dev server:**
   Look for "Local: http://localhost:5173" in terminal.
   
2. **Open dev tools:**
   While app is open, press `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (Mac).
   Check Console tab for errors.

3. **Build main process:**
   ```bash
   npm run build:main
   ```
   Then try `npm run dev` again.

### Video/Audio won't play

**Symptoms:**
- File imports successfully
- But clicking play does nothing
- Or video shows black screen

**Solutions:**

1. **Check file format:**
   Supported: MP3, MP4, M4A, WAV, AAC
   Try a different file to isolate the issue.

2. **Check file path:**
   Avoid special characters in filename or path.
   Try copying file to desktop and importing from there.

3. **Check codecs:**
   Some exotic codecs may not play in browser.
   Use VLC or MediaInfo to check file codecs.

### TypeScript errors

**Symptoms:**
- Red squiggly lines in IDE
- Type errors when building

**Solutions:**

1. **Run type check:**
   ```bash
   npm run type-check
   ```

2. **Check TypeScript version:**
   Should be 5.x (specified in package.json).

3. **Restart TypeScript server:**
   In VS Code: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"

---

## 🏗️ Building for Distribution

Once everything works in dev mode:

### Build the App

```bash
npm run build
```

This compiles everything to the `dist/` folder.

### Package as Installer

**Current platform:**
```bash
npm run package
```

**Windows installer:**
```bash
npm run package:win
```

**macOS installer:**
```bash
npm run package:mac
```

**Output:** Check `release/` folder for installers.

### Before Distribution

1. **Add FFmpeg binaries:**
   Place FFmpeg executables in `resources/ffmpeg/`:
   - Windows: `ffmpeg.exe`, `ffprobe.exe`
   - macOS: `ffmpeg`, `ffprobe`

2. **Test the packaged app:**
   Don't just build and ship. Test the .exe/.dmg on a clean machine.

3. **Code signing (optional but recommended):**
   - macOS: Requires Apple Developer account
   - Windows: Requires code signing certificate

---

## 📦 System Requirements

### Development

- **Node.js:** 18.x or 20.x
- **npm:** 9.x or 10.x
- **FFmpeg:** 4.x or 5.x
- **RAM:** 4GB minimum, 8GB recommended
- **Disk:** 500MB for node_modules + FFmpeg

### Running the App

- **OS:** Windows 10+, macOS 10.14+, Ubuntu 20.04+
- **RAM:** 2GB minimum, 4GB for large videos
- **Disk:** 100MB + space for exports
- **FFmpeg:** Must be installed

---

## 🌐 Platform-Specific Notes

### Windows

- Use PowerShell or Command Prompt (not Git Bash for `npm run dev`)
- If using Windows Defender, allow Electron through firewall
- Path separators: Use `\` or escape `\\` in paths

### macOS

- First time opening packaged app: Right-click → Open (to bypass Gatekeeper)
- If camera/mic permissions requested, grant them (for screen recording features, if added)
- FFmpeg via Homebrew is simplest method

### Linux

- May need to install additional codecs: `sudo apt install ubuntu-restricted-extras`
- Some distros require `libavcodec-extra` for certain formats
- AppImage may need execute permission: `chmod +x *.AppImage`

---

## 🆘 Still Having Issues?

1. **Check all error messages carefully** - they usually point to the problem
2. **Search the error** - Google or Stack Overflow
3. **Verify prerequisites:**
   - Node.js version: `node -v`
   - npm version: `npm -v`
   - FFmpeg installed: `ffmpeg -version`
4. **Try on a different machine** - to rule out environment issues

---

## 🎓 Next Steps

Once installed and running:

1. **Read QUICKSTART.md** - Learn basic editing workflow
2. **Try all features** - Import, edit, export, merge
3. **Explore keyboard shortcuts** - Master the I/O keys
4. **Save a project** - Test project persistence
5. **Read DEVELOPMENT.md** - If you want to modify the code

---

## ✨ You're Ready!

If you've:
- ✅ Installed FFmpeg
- ✅ Run `npm install` successfully
- ✅ Started app with `npm run dev`
- ✅ Seen the UI load

**Congratulations! You're ready to edit media files.** 🎉

Refer to **QUICKSTART.md** for usage examples.
