import ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';

export interface MediaInfo {
  duration: number;
  codec: string;
  videoCodec?: string;
  audioCodec?: string;
  width?: number;
  height?: number;
  frameRate?: number;
  bitRate?: number;
  sampleRate?: number;
  channels?: number;
  format: string;
  size: number;
}

export interface CutSettings {
  keepOriginalQuality?: boolean;
  videoCodec?: string;
  audioCodec?: string;
  videoBitrate?: string;
  audioBitrate?: string;
  crf?: number;
  preset?: string;
}

export interface MergeSettings {
  normalizeAudio?: boolean;
  crossfadeDuration?: number;
  outputFormat?: string;
  targetResolution?: { width: number; height: number };
  targetFrameRate?: number;
  keepOriginalQuality?: boolean;
  videoCodec?: string;
  audioCodec?: string;
}

export class FFmpegService {
  private currentCommand: any = null;

  constructor() {
    this.setupFFmpegPath();
  }

  private setupFFmpegPath() {
    // Set FFmpeg path based on platform
    const ffmpegPath = this.getFFmpegPath();
    const ffprobePath = this.getFFprobePath();

    if (fs.existsSync(ffmpegPath)) {
      ffmpeg.setFfmpegPath(ffmpegPath);
    }
    if (fs.existsSync(ffprobePath)) {
      ffmpeg.setFfprobePath(ffprobePath);
    }
  }

  private getFFmpegPath(): string {
    if (app.isPackaged) {
      const resourcePath = process.resourcesPath;
      if (process.platform === 'win32') {
        return path.join(resourcePath, 'ffmpeg', 'ffmpeg.exe');
      }
      return path.join(resourcePath, 'ffmpeg', 'ffmpeg');
    }
    
    // Development mode - expect ffmpeg in PATH or resources folder
    return process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  }

  private getFFprobePath(): string {
    if (app.isPackaged) {
      const resourcePath = process.resourcesPath;
      if (process.platform === 'win32') {
        return path.join(resourcePath, 'ffmpeg', 'ffprobe.exe');
      }
      return path.join(resourcePath, 'ffmpeg', 'ffprobe');
    }
    
    return process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe';
  }

  async probeMedia(filePath: string): Promise<MediaInfo> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const videoStream = metadata.streams.find((s: any) => s.codec_type === 'video');
        const audioStream = metadata.streams.find((s: any) => s.codec_type === 'audio');
        
        const info: MediaInfo = {
          duration: metadata.format.duration || 0,
          codec: metadata.format.format_name || 'unknown',
          format: metadata.format.format_name || 'unknown',
          bitRate: parseInt(String(metadata.format.bit_rate || '0')),
          size: parseInt(String(metadata.format.size || '0')),
        };

        if (videoStream) {
          info.videoCodec = videoStream.codec_name;
          info.width = videoStream.width;
          info.height = videoStream.height;
          
          // Calculate frame rate
          if (videoStream.r_frame_rate) {
            const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
            info.frameRate = num / den;
          }
        }

        if (audioStream) {
          info.audioCodec = audioStream.codec_name;
          info.sampleRate = audioStream.sample_rate;
          info.channels = audioStream.channels;
        }

        resolve(info);
      });
    });
  }

  async cutMedia(
    inputPath: string,
    outputPath: string,
    startTime: number,
    endTime: number,
    settings: CutSettings = {},
    onProgress?: (progress: { percent: number; currentTime: number }) => void
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const duration = endTime - startTime;
      
      this.currentCommand = ffmpeg(inputPath)
        .setStartTime(startTime)
        .setDuration(duration);

      // Apply settings
      if (settings.keepOriginalQuality !== false) {
        // Try stream copy for fast cutting
        this.currentCommand
          .outputOptions(['-c copy', '-avoid_negative_ts make_zero']);
      } else {
        // Re-encode with specified settings
        if (settings.videoCodec) {
          this.currentCommand.videoCodec(settings.videoCodec);
        }
        if (settings.audioCodec) {
          this.currentCommand.audioCodec(settings.audioCodec);
        }
        if (settings.videoBitrate) {
          this.currentCommand.videoBitrate(settings.videoBitrate);
        }
        if (settings.audioBitrate) {
          this.currentCommand.audioBitrate(settings.audioBitrate);
        }
        if (settings.crf !== undefined) {
          this.currentCommand.outputOptions([`-crf ${settings.crf}`]);
        }
        if (settings.preset) {
          this.currentCommand.outputOptions([`-preset ${settings.preset}`]);
        }
      }

      this.currentCommand
        .on('progress', (progress: any) => {
          if (onProgress) {
            const percent = (progress.timemark ? this.parseTimemark(progress.timemark) / duration : 0) * 100;
            onProgress({ 
              percent: Math.min(percent, 100),
              currentTime: progress.timemark ? this.parseTimemark(progress.timemark) : 0
            });
          }
        })
        .on('end', () => {
          this.currentCommand = null;
          resolve(true);
        })
        .on('error', (err: Error) => {
          this.currentCommand = null;
          reject(err);
        })
        .save(outputPath);
    });
  }

  async mergeMedia(
    inputs: Array<{ path: string; startTime?: number; endTime?: number }>,
    outputPath: string,
    settings: MergeSettings = {},
    onProgress?: (progress: { percent: number }) => void
  ): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const isVideo = inputs.some(input => this.isVideoFile(input.path));
      
      // Create concat file list
      const tempDir = app.getPath('temp');
      const listFilePath = path.join(tempDir, `concat-${Date.now()}.txt`);
      
      try {
        // Pre-process files if needed (trimming)
        const processedFiles: string[] = [];
        
        for (let i = 0; i < inputs.length; i++) {
          const input = inputs[i];
          
          if (input.startTime !== undefined || input.endTime !== undefined) {
            // Need to trim this file first
            const tempOutput = path.join(tempDir, `temp-${i}-${Date.now()}${path.extname(input.path)}`);
            const mediaInfo = await this.probeMedia(input.path);
            const start = input.startTime || 0;
            const end = input.endTime || mediaInfo.duration;
            
            await this.cutMedia(input.path, tempOutput, start, end, { keepOriginalQuality: true });
            processedFiles.push(tempOutput);
          } else {
            processedFiles.push(input.path);
          }
        }

        // Create concat list file
        const listContent = processedFiles.map(f => `file '${f.replace(/'/g, "'\\''")}'`).join('\n');
        fs.writeFileSync(listFilePath, listContent);

        // Build merge command
        this.currentCommand = ffmpeg()
          .input(listFilePath)
          .inputOptions(['-f concat', '-safe 0']);

        if (isVideo) {
          // Video merge settings
          if (settings.keepOriginalQuality !== false) {
            this.currentCommand.outputOptions(['-c copy']);
          } else {
            this.currentCommand
              .videoCodec(settings.videoCodec || 'libx264')
              .audioCodec(settings.audioCodec || 'aac');
            
            if (settings.targetResolution) {
              this.currentCommand.size(`${settings.targetResolution.width}x${settings.targetResolution.height}`);
            }
            if (settings.targetFrameRate) {
              this.currentCommand.fps(settings.targetFrameRate);
            }
          }
        } else {
          // Audio merge settings
          this.currentCommand.audioCodec(settings.audioCodec || 'libmp3lame');
          
          if (settings.normalizeAudio) {
            this.currentCommand.audioFilters('loudnorm');
          }
        }

        this.currentCommand
          .on('progress', (progress: any) => {
            if (onProgress && progress.percent) {
              onProgress({ percent: Math.min(progress.percent, 100) });
            }
          })
          .on('end', () => {
            // Cleanup
            fs.unlinkSync(listFilePath);
            processedFiles.forEach((f, i) => {
              if (inputs[i].startTime !== undefined || inputs[i].endTime !== undefined) {
                if (fs.existsSync(f)) fs.unlinkSync(f);
              }
            });
            this.currentCommand = null;
            resolve(true);
          })
          .on('error', (err: Error) => {
            // Cleanup on error
            if (fs.existsSync(listFilePath)) fs.unlinkSync(listFilePath);
            processedFiles.forEach((f, i) => {
              if (inputs[i].startTime !== undefined || inputs[i].endTime !== undefined) {
                if (fs.existsSync(f)) fs.unlinkSync(f);
              }
            });
            this.currentCommand = null;
            reject(err);
          })
          .save(outputPath);
      } catch (error) {
        if (fs.existsSync(listFilePath)) fs.unlinkSync(listFilePath);
        reject(error);
      }
    });
  }

  async generateWaveform(
    filePath: string,
    width: number = 800,
    height: number = 100
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const tempDir = app.getPath('temp');
      const outputPath = path.join(tempDir, `waveform-${Date.now()}.png`);

      ffmpeg(filePath)
        .complexFilter([
          `[0:a]showwavespic=s=${width}x${height}:colors=#4a9eff[v]`
        ])
        .map('[v]')
        .on('end', () => {
          // Read the image as base64
          const imageBuffer = fs.readFileSync(outputPath);
          const base64 = imageBuffer.toString('base64');
          fs.unlinkSync(outputPath);
          resolve(`data:image/png;base64,${base64}`);
        })
        .on('error', (err: Error) => {
          reject(err);
        })
        .save(outputPath);
    });
  }

  cancelCurrentOperation() {
    if (this.currentCommand) {
      this.currentCommand.kill('SIGKILL');
      this.currentCommand = null;
    }
  }

  private parseTimemark(timemark: string): number {
    const parts = timemark.split(':');
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    const seconds = parseFloat(parts[2]) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  }

  private isVideoFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ['.mp4', '.mkv', '.avi', '.mov', '.webm'].includes(ext);
  }
}
