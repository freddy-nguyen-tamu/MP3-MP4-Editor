import { FFmpegService } from '../ffmpeg.service';
import * as path from 'path';

describe('FFmpegService', () => {
  let ffmpegService: FFmpegService;

  beforeEach(() => {
    ffmpegService = new FFmpegService();
  });

  afterEach(() => {
    ffmpegService.cancelCurrentOperation();
  });

  describe('probeMedia', () => {
    it('should probe media file and return metadata', async () => {
      // This test requires a real media file
      // In a real test environment, you'd have test fixtures
      
      // Mock test - in production, use actual test files
      const mockFilePath = path.join(__dirname, 'fixtures', 'test-audio.mp3');
      
      // Skip if test file doesn't exist
      if (!require('fs').existsSync(mockFilePath)) {
        console.log('Skipping test - no test fixture available');
        return;
      }

      const result = await ffmpegService.probeMedia(mockFilePath);
      
      expect(result).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
      expect(result.codec).toBeDefined();
      expect(result.format).toBeDefined();
    });

    it('should throw error for invalid file', async () => {
      await expect(
        ffmpegService.probeMedia('/nonexistent/file.mp3')
      ).rejects.toThrow();
    });
  });

  describe('cutMedia', () => {
    it('should cut media file with stream copy', async () => {
      const mockInput = path.join(__dirname, 'fixtures', 'test-audio.mp3');
      const mockOutput = path.join(__dirname, 'fixtures', 'output-cut.mp3');
      
      if (!require('fs').existsSync(mockInput)) {
        console.log('Skipping test - no test fixture available');
        return;
      }

      const settings = {
        keepOriginalQuality: true,
      };

      const result = await ffmpegService.cutMedia(
        mockInput,
        mockOutput,
        0,
        10,
        settings
      );

      expect(result).toBe(true);
    }, 30000); // 30 second timeout

    it('should report progress during cutting', async () => {
      const mockInput = path.join(__dirname, 'fixtures', 'test-audio.mp3');
      const mockOutput = path.join(__dirname, 'fixtures', 'output-cut.mp3');
      
      if (!require('fs').existsSync(mockInput)) {
        console.log('Skipping test - no test fixture available');
        return;
      }

      const progressUpdates: number[] = [];

      await ffmpegService.cutMedia(
        mockInput,
        mockOutput,
        0,
        10,
        { keepOriginalQuality: true },
        (progress) => {
          progressUpdates.push(progress.percent);
        }
      );

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1]).toBeCloseTo(100, 0);
    }, 30000);
  });

  describe('mergeMedia', () => {
    it('should merge multiple media files', async () => {
      const mockInput1 = path.join(__dirname, 'fixtures', 'test-audio-1.mp3');
      const mockInput2 = path.join(__dirname, 'fixtures', 'test-audio-2.mp3');
      const mockOutput = path.join(__dirname, 'fixtures', 'output-merged.mp3');
      
      if (!require('fs').existsSync(mockInput1) || !require('fs').existsSync(mockInput2)) {
        console.log('Skipping test - no test fixtures available');
        return;
      }

      const inputs = [
        { path: mockInput1 },
        { path: mockInput2 },
      ];

      const settings = {
        keepOriginalQuality: true,
      };

      const result = await ffmpegService.mergeMedia(
        inputs,
        mockOutput,
        settings
      );

      expect(result).toBe(true);
    }, 60000); // 60 second timeout

    it('should merge with trimming', async () => {
      const mockInput1 = path.join(__dirname, 'fixtures', 'test-audio-1.mp3');
      const mockInput2 = path.join(__dirname, 'fixtures', 'test-audio-2.mp3');
      const mockOutput = path.join(__dirname, 'fixtures', 'output-merged-trimmed.mp3');
      
      if (!require('fs').existsSync(mockInput1) || !require('fs').existsSync(mockInput2)) {
        console.log('Skipping test - no test fixtures available');
        return;
      }

      const inputs = [
        { path: mockInput1, startTime: 0, endTime: 5 },
        { path: mockInput2, startTime: 0, endTime: 5 },
      ];

      const settings = {
        keepOriginalQuality: true,
      };

      const result = await ffmpegService.mergeMedia(
        inputs,
        mockOutput,
        settings
      );

      expect(result).toBe(true);
    }, 60000);
  });

  describe('generateWaveform', () => {
    it('should generate waveform for audio file', async () => {
      const mockInput = path.join(__dirname, 'fixtures', 'test-audio.mp3');
      
      if (!require('fs').existsSync(mockInput)) {
        console.log('Skipping test - no test fixture available');
        return;
      }

      const waveform = await ffmpegService.generateWaveform(mockInput, 800, 100);

      expect(waveform).toBeDefined();
      expect(waveform).toMatch(/^data:image\/png;base64,/);
    }, 30000);
  });

  describe('cancelCurrentOperation', () => {
    it('should cancel ongoing operation', async () => {
      const mockInput = path.join(__dirname, 'fixtures', 'test-video.mp4');
      const mockOutput = path.join(__dirname, 'fixtures', 'output-cut.mp4');
      
      if (!require('fs').existsSync(mockInput)) {
        console.log('Skipping test - no test fixture available');
        return;
      }

      // Start a long operation
      const cutPromise = ffmpegService.cutMedia(
        mockInput,
        mockOutput,
        0,
        100,
        { keepOriginalQuality: false }
      );

      // Cancel after a short delay
      setTimeout(() => {
        ffmpegService.cancelCurrentOperation();
      }, 100);

      // Should reject
      await expect(cutPromise).rejects.toThrow();
    }, 30000);
  });
});
