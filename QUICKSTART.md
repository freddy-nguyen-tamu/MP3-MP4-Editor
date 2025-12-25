# Quick Start Guide

## 🚀 Get Running in 5 Minutes

### Step 1: Install FFmpeg

**Required**: FFmpeg must be installed before running the app.

#### macOS
```bash
brew install ffmpeg
```

#### Windows
1. Download from https://github.com/BtbN/FFmpeg-Builds/releases
2. Extract and add to PATH
3. Or place `ffmpeg.exe` and `ffprobe.exe` in `resources/ffmpeg/`

#### Linux (Ubuntu/Debian)
```bash
sudo apt update && sudo apt install ffmpeg
```

Verify installation:
```bash
ffmpeg -version
```

### Step 2: Install Dependencies

```bash
cd projects/ultimate-mp3-mp4-editor
npm install
```

This takes ~2-3 minutes to download all packages.

### Step 3: Run Development Mode

```bash
npm run dev
```

The app will open automatically! 🎉

## 📖 Your First Edit

### Cutting a File

1. **Import**: Click "Add Files" or drag & drop an MP3/MP4
2. **Select**: Click the file in the left panel
3. **Set Cuts**: 
   - Drag the **green START handle** to where you want to begin
   - Drag the **red END handle** to where you want to end
4. **Preview**: Click "Play Selection" to hear/see only your selected region
5. **Export**: Click "Export Cut Selection", choose format, click Export

### Keyboard Shortcuts for Precise Editing

- **Space**: Play/Pause
- **I**: Set start cut at current playhead
- **O**: Set end cut at current playhead  
- **←**: Seek backward 0.5s
- **→**: Seek forward 0.5s
- **Shift+←**: Seek backward 5s
- **Shift+→**: Seek forward 5s

### Merging Multiple Files

1. Add 2+ files
2. Drag to reorder (this sets merge order)
3. Optionally trim each file
4. Click "Merge All Files"
5. Configure settings (normalize, crossfade)
6. Export

## 🎯 Pro Tips

### Precise Cutting
- Type timestamps directly: `0:05:30.500` format
- Use I/O keys while playing to mark on-the-fly
- Handles snap to frame boundaries for video

### Fast Exports
- "Keep Original Quality" = stream copy (very fast, no quality loss)
- Works best when cutting at keyframes
- Disable for codec changes or filters

### Project Workflow
- Auto-saves every 5 seconds (enabled by default)
- Save manually: Ctrl+S (Cmd+S on Mac)
- Projects are small JSON files

## 🔧 Building for Production

### Create Installer

```bash
npm run package
```

Output in `release/` folder.

### Platform-Specific

```bash
npm run package:win   # Windows
npm run package:mac   # macOS
```

**Important for Distribution:**
- Add FFmpeg binaries to `resources/ffmpeg/`
- Review FFmpeg licensing (LGPL/GPL)

## ❓ Common Issues

### "FFmpeg not found"
- Install FFmpeg and add to PATH
- Or place binaries in `resources/ffmpeg/`
- Restart terminal after installing

### "Module not found"
```bash
rm -rf node_modules package-lock.json
npm install
```

### App won't start in dev mode
- Check: `npm run build:main` runs without errors
- Check: Port 5173 is available
- Look for errors in terminal

### Video won't play
- Check file path has no special characters
- Try copying file to desktop and reimporting
- Some exotic codecs may not be supported

### Export fails
- Check disk space
- Check output folder permissions
- Check FFmpeg can access input files
- Look at error message for details

## 📚 Next Steps

- Read [README.md](README.md) for full feature list
- Check [DEVELOPMENT.md](DEVELOPMENT.md) for architecture details
- Review code comments in `src/` folders

## 🎨 Key UI Elements

```
┌─────────────────────────────────────────────────────────┐
│  Ultimate MP3/MP4 Editor    [Open] [Save] [↶↷] [⚙️]    │
├──────────────┬──────────────────────────────────────────┤
│              │                                          │
│  FILES       │  VIDEO/AUDIO PREVIEW                     │
│              │                                          │
│  [+Add Files]│  [The video plays here]                 │
│              │                                          │
│  ⋮⋮ file1.mp3│                                          │
│  ⋮⋮ file2.mp4│  [▶Play] [▶Selection] [▶From Start]    │
│  ⋮⋮ file3.wav│                                          │
│              │  ┌────────────────────────────────────┐  │
│              │  │  [START]      [END]                │  │
│              │  │    |░░░░░░░░░░|                    │  │
│              │  │        ^                           │  │
│              │  │     Playhead                       │  │
│              │  └────────────────────────────────────┘  │
│              │                                          │
│              │  Start: 0:00:05.000  End: 0:01:30.000   │
│              │                                          │
│              │  [✂️ Export Cut] [🔗 Merge All (3)]      │
│              │                                          │
└──────────────┴──────────────────────────────────────────┘
```

**Legend:**
- `[START]` = Green draggable handle
- `[END]` = Red draggable handle  
- `^` = White playhead (current position)
- `░` = Selected region (highlighted)

## 💡 Understanding the Timeline

The timeline is the heart of the app:

1. **Waveform/Video** shows your media
2. **Two Handles** define your selection:
   - **START (green)**: Where cut begins
   - **END (red)**: Where cut ends
3. **Selected Region** (colored) = what gets exported
4. **Playhead** (white line) = current playback position

**Workflow:**
1. Play through media
2. When you hear/see where you want to start → press **I**
3. Keep playing to where you want to end → press **O**
4. Click **"Play Selection"** to preview
5. Fine-tune by dragging handles
6. Export when perfect

## 🎬 Example: Making a Podcast Clip

```bash
# You have: podcast-full.mp3 (60 minutes)
# You want: Just the interview segment (5:30 to 18:45)

1. Import podcast-full.mp3
2. Press Space to play, listen for interview start
3. At 5:30, press I (sets start cut)
4. Keep playing to 18:45, press O (sets end cut)
5. Click "Play Selection" to verify
6. Click "Export Cut Selection"
7. Choose MP3, "Keep Original Quality" ON
8. Export → Done in ~2 seconds! (stream copy)
```

## 🎵 Example: Creating a Mix

```bash
# You have: song1.mp3, song2.mp3, song3.mp3
# You want: Seamless mix with crossfades

1. Add all 3 songs
2. Drag to order (song1, song2, song3)
3. Select song1 → trim ending if needed
4. Select song2 → trim intro and outro
5. Select song3 → trim intro
6. Click "Merge All Files (3)"
7. Enable "Normalize Audio" 
8. Set "Crossfade Duration" to 2.0 seconds
9. Export → Your mix is ready!
```

## 🛠️ Customization

### Default Settings

Edit in Settings (⚙️ icon):
- **Theme**: Dark or Light
- **Default Output Folder**: Where exports go
- **Auto-save**: Enable/disable auto-recovery

### Keyboard Shortcuts

All shortcuts listed at bottom of timeline. Main ones:
- `Space` → Play/Pause
- `I` → In point (start)
- `O` → Out point (end)
- `Ctrl+Z` → Undo
- `Ctrl+S` → Save project

## 🎓 Learning Path

1. **Basic Cut** (5 min)
   - Import file → drag handles → export
   
2. **Keyboard Workflow** (10 min)
   - Use I/O keys → arrow key seeking → space play
   
3. **Quality Settings** (10 min)
   - Try stream copy vs re-encode
   - Experiment with CRF values
   
4. **Merging** (15 min)
   - Multi-file project
   - Per-file trimming
   - Crossfades
   
5. **Project Management** (10 min)
   - Save/load projects
   - Recent projects
   - Export history

Total learning time: ~50 minutes to master all features!

## 📞 Support

Need help? Check:
1. Error message in the app (usually explains the issue)
2. Terminal output (shows FFmpeg details)
3. This guide's "Common Issues" section
4. README.md for detailed docs

---

**Happy Editing! 🎬🎵**
