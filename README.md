# Ultimate MP3/MP4 Editor

A production-ready desktop application for cutting and merging MP3 and MP4 files with an intuitive timeline UI featuring draggable cut handles and precise media playback controls.

![Ultimate MP3/MP4 Editor](https://via.placeholder.com/800x450?text=Ultimate+MP3/MP4+Editor)

## Key Features

### Core UX: Timeline Editing
- **Two Draggable Cut Handles**: Precise START and END handles on the timeline that you can drag to set cut points
- **Play Selection**: Play button that plays ONLY the selected region (from Start Cut to End Cut) and auto-stops
- **Waveform Visualization**: Visual waveform for audio files
- **Video Preview**: Live video preview for MP4 files with accurate sync
- **Precise Timestamps**: HH:MM:SS.mmm display with manual input support

### Import & Management
- **Drag & Drop**: Drag files directly into the app
- **"Add Files" Button**: Browse and add multiple files
- **Supported Formats**: MP3, MP4, M4A, WAV, AAC (extensible to more)
- **File Details**: Duration, codec info, resolution, file size
- **Reorder Items**: Drag to reorder files for merge order

### Cutting Operations
- Export cut segments to chosen format/container
- Smart cut with stream copy when possible (fast, no quality loss)
- Re-encode fallback with quality presets
- Options: output filename, destination folder, quality settings
- Progress bar with cancel support

### Merging Operations
- Merge multiple MP3s or MP4s into one file
- Per-item trimming before merge
- Audio normalization option
- Crossfade option with duration slider
- Handle mismatched resolutions/frame rates

### Keyboard Shortcuts
- **Space**: Play/Pause
- **I**: Set Start Cut to current playhead position
- **O**: Set End Cut to current playhead position
- **←/→**: Small seek (0.5 seconds)
- **Shift+←/→**: Large seek (5 seconds)
- **Ctrl+Z**: Undo
- **Ctrl+Shift+Z**: Redo
- **Ctrl+S**: Save Project
- **Ctrl+O**: Open Project

### Quality-of-Life Features
- **Undo/Redo**: For trim handle changes and reorder operations
- **Save/Load Project**: JSON project files (.umpe) with file paths and settings
- **Auto-save Recovery**: Automatic recovery every 5 seconds
- **Recent Projects List**: Quick access to previous work
- **Dark/Light Theme**: Toggle between themes
- **Export History**: Track exports with quick folder access
- **User-friendly Errors**: Clear error messages

## Tech Stack

- **Frontend**: Electron + React + TypeScript
- **Backend**: Node.js with FFmpeg integration
- **Media Processing**: FFmpeg (fluent-ffmpeg wrapper)
- **UI**: Custom CSS with dark/light theme support
- **Build Tool**: Vite for fast development
- **Package Manager**: npm
- **Platform**: Cross-platform (Windows, macOS, Linux)

## Installation

### Prerequisites

1. **Node.js**: Version 18 or higher
2. **FFmpeg**: Must be installed and available in system PATH

#### Installing FFmpeg

**Windows:**
1. Download FFmpeg from https://ffmpeg.org/download.html
2. Extract and add to PATH, or place `ffmpeg.exe` and `ffprobe.exe` in `resources/ffmpeg/`

**macOS:**
```bash
brew install ffmpeg
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install ffmpeg
```

### Setup

1. Clone or extract the project:
```bash
cd projects/ultimate-mp3-mp4-editor
```

2. Install dependencies:
```bash
npm install
```

## Development

Run the app in development mode:

```bash
npm run dev
```

This will:
- Start the Vite dev server for the React frontend
- Compile the Electron main process
- Launch the Electron app with hot-reload

## Building for Production

### Build the application:

```bash
npm run build
```

### Package for distribution:

**All platforms:**
```bash
npm run package
```

**Windows only:**
```bash
npm run package:win
```

**macOS only:**
```bash
npm run package:mac
```

The packaged app will be in the `release/` directory.

### Important: FFmpeg Binaries

For distribution, you must include FFmpeg binaries:

1. Download FFmpeg binaries for your target platform
2. Place them in `resources/ffmpeg/`:
   - Windows: `ffmpeg.exe`, `ffprobe.exe`
   - macOS/Linux: `ffmpeg`, `ffprobe`
3. These will be automatically included in the packaged app

**Note:** FFmpeg is licensed under LGPL/GPL. Ensure compliance with licensing requirements when distributing.

## 📖 Usage Guide

### Quick Start

1. **Import Files**: 
   - Click "Add Files" or drag & drop media files
   - Supported: MP3, MP4, M4A, WAV, AAC

2. **Select File**: 
   - Click on a file in the list to load it in the timeline

3. **Set Cut Points**:
   - Drag the green START handle to set the beginning
   - Drag the red END handle to set the ending
   - Or use I/O keys while playing to mark positions

4. **Preview Selection**:
   - Click "Play Selection" to preview only the selected region
   - The playback will auto-stop at the End Cut point

5. **Export**:
   - Click "Export Cut Selection" to export the trimmed segment
   - Choose format and quality settings
   - Click "Export" and select destination

### Merging Multiple Files

1. Add 2+ files to the list
2. Reorder by dragging (this determines merge order)
3. Optionally trim each file using the timeline
4. Click "Merge All Files"
5. Configure merge settings:
   - Normalize audio levels
   - Add crossfade between clips
   - Choose output format
6. Export

### Project Management

- **Save Project**: File menu or Ctrl+S
- **Load Project**: File menu or Ctrl+O
- **Auto-save**: Enabled by default (every 5 seconds)
- Projects save file references, cut points, and settings

### Settings

Access via gear icon:
- **Theme**: Dark or Light mode
- **Default Output Folder**: Set where exports go by default
- **Auto-save**: Enable/disable auto-recovery
- **Export History**: View recent exports

## Testing

Run the FFmpeg wrapper tests:

```bash
npm test
```

## Project Structure

```
ultimate-mp3-mp4-editor/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── main.ts              # Entry point, IPC handlers
│   │   ├── preload.ts           # Context bridge
│   │   └── services/
│   │       ├── ffmpeg.service.ts    # FFmpeg operations
│   │       └── project.service.ts   # Project save/load
│   └── renderer/                # React frontend
│       ├── components/
│       │   ├── Header.tsx       # Top menu bar
│       │   ├── FileList.tsx     # File list with drag-reorder
│       │   ├── Timeline.tsx     # Timeline with cut handles
│       │   ├── Controls.tsx     # Export controls
│       │   ├── ExportDialog.tsx # Export settings dialog
│       │   └── SettingsDialog.tsx # App settings
│       ├── App.tsx              # Main app component
│       ├── types.ts             # TypeScript types
│       ├── main.tsx             # React entry point
│       └── index.html
├── resources/                   # Static resources
│   └── ffmpeg/                  # FFmpeg binaries (not in repo)
├── dist/                        # Build output
├── release/                     # Packaged apps
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Key Implementation Details

### Timeline UI with Draggable Handles

The timeline component (`Timeline.tsx`) implements:

1. **Two handles**: START (green) and END (red)
2. **Dragging**: Mouse down on handle → drag → mouse up updates cut points
3. **Snapping**: Frame-accurate for video, small time steps for audio
4. **Visual feedback**: Selected region highlighted, playhead shows current position
5. **Manual input**: Type timestamps directly (HH:MM:SS.mmm format)

### Play Selection Logic

When "Play Selection" is clicked:
1. Media currentTime set to `startCut`
2. Playback starts
3. RequestAnimationFrame monitors playback
4. When currentTime ≥ `endCut`, auto-pause and reset to `startCut`
5. Visual highlight on selected region during playback

### FFmpeg Operations

The `ffmpeg.service.ts` provides:

- **probeMedia**: Extract duration, codec, resolution, etc.
- **cutMedia**: Extract segment with optional re-encode
- **mergeMedia**: Concatenate multiple files
- **generateWaveform**: Create waveform PNG for audio visualization

Smart cutting:
- Attempts `-c copy` (stream copy) first for speed
- Falls back to re-encode if needed
- Frame-accurate cutting for video

## FFmpeg Licensing

This application uses FFmpeg for media processing. FFmpeg is licensed under the GNU Lesser General Public License (LGPL) version 2.1 or later.

**Important licensing notes:**
- FFmpeg binaries are NOT included in this repository
- Users must install FFmpeg separately or provide binaries
- If distributing this application with FFmpeg, you must comply with LGPL terms
- Consider dynamically linking and providing source code access

For more information: https://ffmpeg.org/legal.html

## Known Issues

- Waveform generation may be slow for very long audio files
- Some exotic codecs may not support stream copy
- Crossfade feature in merge requires re-encoding

## Future Enhancements

- Timeline zoom and pan
- Multi-track editing
- Audio effects (fade in/out, EQ)
- Batch processing
- Video effects and filters
- Custom keyboard shortcuts
- Plugin system

## Support

For issues and feature requests, please open an issue on the project repository.

## License

MIT License - see LICENSE file for details

Note: This application uses FFmpeg which has its own licensing terms (LGPL/GPL).

---

**Built with ❤️ using Electron, React, and FFmpeg**
