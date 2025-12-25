# Development Guide

## Architecture Overview

### Electron Multi-Process Model

- **Main Process** (`src/main/main.ts`): Node.js backend, IPC handlers, FFmpeg operations
- **Renderer Process** (`src/renderer/`): React UI running in Chromium
- **Preload Script** (`src/main/preload.ts`): Secure bridge using contextBridge

### Key Design Decisions

#### Timeline with Draggable Cut Handles

The core UX feature is implemented in `Timeline.tsx`:

```typescript
// Two draggable handles: START (green) and END (red)
// - Mouse down on handle activates drag mode
// - Mouse move updates cut position
// - Mouse up finalizes and calls onCutChange callback
// - Visual feedback via CSS transforms
```

**Handle positions** are calculated as percentages:
```typescript
const startPercent = (startCut / file.duration) * 100;
const endPercent = (endCut / file.duration) * 100;
```

**Dragging logic**:
1. `onMouseDown` on handle → set `isDraggingStart` or `isDraggingEnd`
2. Global `mousemove` listener calculates new position from mouse X
3. Convert X position to time: `time = (x / width) * duration`
4. Update local state during drag
5. `onMouseUp` → call `onCutChange` with final values

#### Play Selection Feature

When "Play Selection" is clicked:

```typescript
// 1. Set playMode to 'selection'
setPlayMode('selection');

// 2. Seek to start cut
mediaRef.current.currentTime = startCut;

// 3. Start playback
mediaRef.current.play();

// 4. Monitor with requestAnimationFrame
const updateTime = () => {
  const time = mediaRef.current.currentTime;
  
  // Auto-stop at end cut
  if (playMode === 'selection' && time >= endCut) {
    mediaRef.current.pause();
    mediaRef.current.currentTime = startCut;
    setIsPlaying(false);
    return;
  }
  
  requestAnimationFrame(updateTime);
};
```

#### FFmpeg Smart Cutting

The `cutMedia` method in `ffmpeg.service.ts`:

```typescript
// Try stream copy first (fast, no quality loss)
if (keepOriginalQuality) {
  command.outputOptions(['-c copy', '-avoid_negative_ts make_zero']);
}
// Fallback: re-encode with quality settings
else {
  command.videoCodec(videoCodec)
         .audioCodec(audioCodec)
         .outputOptions([`-crf ${crf}`, `-preset ${preset}`]);
}
```

Stream copy works for:
- Cutting at keyframe boundaries (video)
- Any position (audio-only files)

Re-encode needed when:
- Changing codecs
- Applying filters
- Non-keyframe cuts (for pixel-perfect accuracy)

### State Management

No external state library used. State managed with React hooks:

- `App.tsx`: Global app state (files, settings, history)
- `Timeline.tsx`: Local timeline state (playback, dragging)
- Props drilling for component communication
- IPC for main process communication

### File Structure Rationale

```
src/
├── main/              # Backend (Node.js)
│   ├── main.ts        # Electron lifecycle, IPC
│   ├── preload.ts     # Secure API exposure
│   └── services/      # Business logic
│       ├── ffmpeg.service.ts    # Media operations
│       └── project.service.ts   # Persistence
│
└── renderer/          # Frontend (React)
    ├── components/    # UI components
    ├── App.tsx        # Root component
    ├── types.ts       # Shared types
    └── *.css          # Component styles
```

## Development Workflow

### Initial Setup

```bash
cd projects/ultimate-mp3-mp4-editor
npm install
```

### Running Dev Mode

```bash
npm run dev
```

This runs:
1. `vite` dev server (port 5173) with HMR
2. TypeScript compiler for main process
3. Electron app pointing to dev server

Hot reload works for renderer changes. Main process changes require restart.

### Building

```bash
# Build both processes
npm run build

# Package for current platform
npm run package
```

Output:
- `dist/`: Compiled code
- `release/`: Packaged apps (.exe, .dmg, etc.)

## Testing Strategy

### Unit Tests (Jest)

Located in `__tests__/` folders:

```bash
npm test
```

Current coverage:
- FFmpeg service operations
- Mock-based (requires test fixtures for real tests)

### Manual Testing Checklist

**Import:**
- [ ] Add files via button
- [ ] Drag & drop files
- [ ] Multiple file selection
- [ ] Invalid file handling

**Timeline:**
- [ ] Drag start handle
- [ ] Drag end handle
- [ ] Drag playhead
- [ ] Manual timestamp input
- [ ] Keyboard shortcuts (I, O, arrows)

**Playback:**
- [ ] Play/pause
- [ ] Play selection (auto-stop)
- [ ] Play from start cut
- [ ] Play full
- [ ] Video preview sync
- [ ] Audio waveform display

**Export:**
- [ ] Cut with stream copy
- [ ] Cut with re-encode
- [ ] Quality settings
- [ ] Progress reporting
- [ ] Cancel operation
- [ ] Error handling

**Merge:**
- [ ] Merge audio files
- [ ] Merge video files
- [ ] Per-file trimming
- [ ] Audio normalization
- [ ] Crossfade

**Project:**
- [ ] Save project
- [ ] Load project
- [ ] Auto-save
- [ ] Recent projects

**UI:**
- [ ] File reordering
- [ ] Undo/redo
- [ ] Theme toggle
- [ ] Settings persistence

## Common Development Tasks

### Adding a New Keyboard Shortcut

1. Add to `Timeline.tsx` or `App.tsx` `useEffect` with keydown listener:

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'YOUR_KEY') {
      e.preventDefault();
      yourAction();
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [dependencies]);
```

2. Update shortcuts display in `Timeline.tsx` bottom bar
3. Document in README

### Adding a New Export Setting

1. Update `CutSettings` or `MergeSettings` interface in `ffmpeg.service.ts`
2. Add UI control in `ExportDialog.tsx`
3. Pass setting to FFmpeg command in service method
4. Add to project save format if should persist

### Adding a New IPC Handler

1. Main process (`main.ts`):
```typescript
ipcMain.handle('your:operation', async (_event, arg) => {
  return yourService.doSomething(arg);
});
```

2. Preload (`preload.ts`):
```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  yourOperation: (arg: Type) => ipcRenderer.invoke('your:operation', arg),
});
```

3. Type declaration in preload.ts:
```typescript
declare global {
  interface Window {
    electronAPI: {
      yourOperation: (arg: Type) => Promise<Result>;
    };
  }
}
```

4. Use in renderer:
```typescript
const result = await window.electronAPI.yourOperation(arg);
```

## Debugging

### Renderer Process (React)

- Dev tools open by default in dev mode
- Use React DevTools browser extension
- Console.log available
- Breakpoints in Sources tab

### Main Process (Node)

Add to main.ts:
```typescript
if (process.env.NODE_ENV === 'development') {
  require('electron-debug')();
}
```

Or use VS Code debugger:
```json
// .vscode/launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Electron Main",
  "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
  "program": "${workspaceFolder}/dist/main/main.js"
}
```

### FFmpeg Issues

Enable FFmpeg logging:
```typescript
command
  .on('start', (cmd) => console.log('FFmpeg command:', cmd))
  .on('stderr', (line) => console.log('FFmpeg stderr:', line));
```

## Performance Optimization

### Waveform Generation

Currently synchronous and blocking. Optimize by:
- Generate at lower resolution
- Cache results
- Use Web Audio API for faster rendering
- Background thread/worker

### Large File Handling

For files > 1 hour:
- Implement timeline virtualization
- Lazy load waveform segments
- Stream processing for merge

### Memory Management

- Clean up video elements when switching files
- Cancel FFmpeg operations on component unmount
- Limit export history size

## Security Considerations

### Context Isolation

Enabled: `contextIsolation: true`

All IPC must go through preload script. No direct Node.js access from renderer.

### Node Integration

Disabled: `nodeIntegration: false`

Renderer cannot require Node modules directly.

### File Access

All file operations validated:
- User must select files via dialog
- Paths validated before FFmpeg operations
- No arbitrary file system access from renderer

### Future Security Enhancements

- Content Security Policy (CSP)
- Code signing for distributed apps
- Update mechanism with signature verification

## Distribution

### Code Signing

**macOS:**
```bash
export APPLE_ID=your@email.com
export APPLE_ID_PASSWORD=app-specific-password
npm run package:mac
```

**Windows:**
Requires certificate (.pfx file):
```json
// package.json
"win": {
  "certificateFile": "path/to/cert.pfx",
  "certificatePassword": "password"
}
```

### Auto-Updates

Consider integrating:
- electron-updater
- Server for update manifests
- Staged rollout strategy

## Troubleshooting

### FFmpeg Not Found

**Symptom:** "FFmpeg command not found" errors

**Solutions:**
1. Install FFmpeg: `brew install ffmpeg` (macOS) or download binaries
2. Add to PATH
3. Or place in `resources/ffmpeg/`

### Module Not Found Errors

**Symptom:** Import errors after adding new dependencies

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Build Fails

**Symptom:** `npm run build` errors

**Check:**
1. TypeScript errors: `npm run type-check`
2. All dependencies installed
3. Node.js version >= 18

### App Won't Start

**Check:**
1. Main process compiled: `dist/main/main.js` exists
2. Console errors in dev tools
3. Electron version compatibility

## Contributing

When adding features:

1. Follow existing patterns
2. Add TypeScript types
3. Update README if user-facing
4. Test on multiple platforms if possible
5. Consider accessibility (keyboard nav, ARIA labels)

## Resources

- [Electron Docs](https://www.electronjs.org/docs)
- [React Docs](https://react.dev)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [fluent-ffmpeg API](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg)
