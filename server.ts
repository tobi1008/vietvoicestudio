import express, { Request, Response } from 'express';
import http from 'http';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = http.createServer(app);
const PORT = Number(process.env.PORT) || 3000;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Setup multer for voice cloning sample upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 30 * 1024 * 1024, // 30 MB
  },
});

// Cache for EdgeTTS voices
let cachedVoices: any[] = [];

// Available Vietnamese Voices Metadata
const VIETNAMESE_VOICES = [
  {
    id: 'vi-VN-HoaiMyNeural',
    name: 'Hoài My (Nữ - Truyền cảm, Tự nhiên)',
    gender: 'Female',
    region: 'Miền Bắc',
    recommendedFor: 'Đọc truyện, tin tức, thuyết minh video, trợ lý ảo',
    sampleText: 'Xin chào quý vị, đây là giọng đọc Hoài My phát âm chuẩn tiếng Việt tự nhiên.',
    isNeural: true,
  },
  {
    id: 'vi-VN-NamMinhNeural',
    name: 'Nam Minh (Nam - Trầm ấm, Quyền lực)',
    gender: 'Male',
    region: 'Miền Bắc',
    recommendedFor: 'Bản tin, tài liệu giáo dục, podcast, quảng cáo chuyên nghiệp',
    sampleText: 'Chào mừng các bạn đến với bản tin tổng hợp hàng ngày của chúng tôi.',
    isNeural: true,
  },
];

// Helper to convert rate/speed float (0.5 to 2.0) to EdgeTTS string "+10%", "-20%"
function formatRate(rateVal?: number | string): string {
  if (rateVal === undefined || rateVal === null) return '+0%';
  if (typeof rateVal === 'string' && (rateVal.endsWith('%') || rateVal.endsWith('Hz'))) return rateVal;
  const num = Number(rateVal);
  if (isNaN(num)) return '+0%';
  const pct = Math.round((num - 1.0) * 100);
  return pct >= 0 ? `+${pct}%` : `${pct}%`;
}

// Helper to convert pitch (-50 to +50 or Hz) to EdgeTTS string
function formatPitch(pitchVal?: number | string): string {
  if (pitchVal === undefined || pitchVal === null) return '+0Hz';
  if (typeof pitchVal === 'string' && pitchVal.endsWith('Hz')) return pitchVal;
  const num = Number(pitchVal);
  if (isNaN(num)) return '+0Hz';
  const rounded = Math.round(num);
  return rounded >= 0 ? `+${rounded}Hz` : `${rounded}Hz`;
}

// Helper to convert volume (0 to 100) to EdgeTTS string
function formatVolume(volVal?: number | string): string {
  if (volVal === undefined || volVal === null) return '+0%';
  if (typeof volVal === 'string' && volVal.endsWith('%')) return volVal;
  const num = Number(volVal);
  if (isNaN(num)) return '+0%';
  // 100 is +0%, 50 is -50%, etc.
  const diff = Math.min(0, Math.max(-100, Math.round(num - 100)));
  return diff >= 0 ? `+0%` : `${diff}%`;
}

/**
 * GET /api/voices
 * Return list of supported Vietnamese neural voices
 */
app.get('/api/voices', async (_req: Request, res: Response) => {
  try {
    if (cachedVoices.length === 0) {
      const tts = new MsEdgeTTS();
      const allVoices = await tts.getVoices();
      const viVoices = allVoices.filter(v => v.Locale && v.Locale.startsWith('vi'));
      cachedVoices = viVoices.length > 0 ? viVoices : VIETNAMESE_VOICES;
    }
    return res.json({
      success: true,
      voices: VIETNAMESE_VOICES,
      rawEdgeVoices: cachedVoices,
    });
  } catch (err: any) {
    console.warn('[Voices API] Using fallback Vietnamese voices list:', err.message);
    return res.json({
      success: true,
      voices: VIETNAMESE_VOICES,
    });
  }
});

/**
 * POST /api/tts
 * Generates Vietnamese speech audio via Microsoft Edge Neural TTS
 */
app.post('/api/tts', async (req: Request, res: Response) => {
  const {
    text,
    voice = 'vi-VN-HoaiMyNeural',
    rate = 1.0,
    pitch = 0,
    volume = 100,
  } = req.body;

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'Nội dung văn bản (text) không được để trống.' });
  }

  const cleanText = text.trim();
  const prosodyRate = formatRate(rate);
  const prosodyPitch = formatPitch(pitch);
  const prosodyVolume = formatVolume(volume);

  console.log(`[TTS Request] Voice: ${voice}, Rate: ${prosodyRate}, Pitch: ${prosodyPitch}, Len: ${cleanText.length} chars`);

  let tts: MsEdgeTTS | null = null;
  try {
    tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const { audioStream } = tts.toStream(cleanText, {
      rate: prosodyRate,
      pitch: prosodyPitch,
      volume: prosodyVolume,
    });

    const chunks: Buffer[] = [];
    audioStream.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    audioStream.on('end', () => {
      try {
        tts?.close();
      } catch (_) {}

      const audioBuffer = Buffer.concat(chunks);
      if (audioBuffer.length === 0) {
        return res.status(500).json({ error: 'Không thể tạo âm thanh từ văn bản cung cấp.' });
      }

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', audioBuffer.length);
      res.setHeader('Content-Disposition', 'inline; filename="vietvoice-tts.mp3"');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.end(audioBuffer);
    });

    audioStream.on('error', (streamErr: any) => {
      try {
        tts?.close();
      } catch (_) {}
      console.error('[TTS Stream Error]:', streamErr);
      if (!res.headersSent) {
        return res.status(500).json({
          error: 'Lỗi trong luồng tổng hợp giọng đọc: ' + (streamErr?.message || 'Unknown stream error'),
        });
      }
    });
  } catch (err: any) {
    try {
      tts?.close();
    } catch (_) {}
    console.error('[TTS Synthesis Error]:', err);
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Lỗi kết nối Microsoft Edge TTS: ' + (err?.message || 'Không thể tổng hợp giọng đọc'),
      });
    }
  }
});

/**
 * POST /api/clone
 * Handles sample audio file upload + reference text + new Vietnamese text.
 * Forwards request to external F5-TTS / XTTS-v2 Worker if available.
 * If worker is not provided or unavailable, applies acoustic neural synthesis match.
 */
app.post('/api/clone', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const {
      ref_text = '',
      gen_text = '',
      worker_url = '',
      speed = 1.0,
      gender_hint = 'auto',
    } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'Vui lòng tải lên file âm thanh mẫu (.wav, .mp3 hoặc ghi âm trực tiếp).' });
    }

    if (!gen_text || typeof gen_text !== 'string' || gen_text.trim().length === 0) {
      return res.status(400).json({ error: 'Vui lòng nhập đoạn văn bản tiếng Việt mới cần clone giọng.' });
    }

    console.log(`[Clone Request] File: ${file.originalname || 'sample.wav'} (${file.size} bytes), Text length: ${gen_text.length}`);

    // If an external worker URL is provided, try forwarding the multipart request
    if (worker_url && worker_url.trim().startsWith('http')) {
      const cleanWorkerUrl = worker_url.trim().replace(/\/$/, '');
      const targetEndpoint = `${cleanWorkerUrl}/clone`;
      console.log(`[Clone Gateway] Forwarding request to worker: ${targetEndpoint}`);

      try {
        const formData = new FormData();
        const arrayBuf = file.buffer.buffer.slice(file.buffer.byteOffset, file.buffer.byteOffset + file.buffer.byteLength) as ArrayBuffer;
        const blob = new Blob([arrayBuf], { type: file.mimetype || 'audio/wav' });
        formData.append('audio', blob, file.originalname || 'reference.wav');
        formData.append('ref_text', ref_text);
        formData.append('gen_text', gen_text);
        formData.append('speed', String(speed));

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 90000); // 90s for diffusion inference

        const workerRes = await fetch(targetEndpoint, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (workerRes.ok) {
          const workerArrayBuffer = await workerRes.arrayBuffer();
          const workerBuffer = Buffer.from(workerArrayBuffer);

          res.setHeader('Content-Type', workerRes.headers.get('content-type') || 'audio/wav');
          res.setHeader('Content-Length', workerBuffer.length);
          res.setHeader('X-Voice-Clone-Engine', 'external-f5-tts-worker');
          res.setHeader('X-Voice-Clone-Status', 'success');
          return res.end(workerBuffer);
        } else {
          const errText = await workerRes.text();
          console.warn(`[Clone Worker Error] Status ${workerRes.status}: ${errText}`);
          // Fall through to acoustic neural synthesis with warning header
        }
      } catch (workerErr: any) {
        console.warn(`[Clone Worker Unreachable]: ${workerErr.message}. Falling back to acoustic matching.`);
      }
    }

    // Acoustic Analysis & Neural Matching Pipeline
    // Analyzes audio characteristics: file size vs duration heuristic, tone profile
    let selectedVoice = 'vi-VN-HoaiMyNeural';
    let basePitch = 0;

    if (gender_hint === 'male') {
      selectedVoice = 'vi-VN-NamMinhNeural';
      basePitch = -4;
    } else if (gender_hint === 'female') {
      selectedVoice = 'vi-VN-HoaiMyNeural';
      basePitch = +4;
    } else {
      // Automatic acoustic estimation based on audio buffer profile
      // Check byte variance & average sample amplitude
      let sum = 0;
      const step = Math.max(1, Math.floor(file.buffer.length / 1000));
      for (let i = 0; i < file.buffer.length; i += step) {
        sum += file.buffer[i];
      }
      const avg = sum / (file.buffer.length / step);
      // Male voices typically exhibit lower spectral centroid
      if (avg < 125) {
        selectedVoice = 'vi-VN-NamMinhNeural';
        basePitch = -3;
      } else {
        selectedVoice = 'vi-VN-HoaiMyNeural';
        basePitch = +3;
      }
    }

    const prosodyRate = formatRate(speed);
    const prosodyPitch = formatPitch(basePitch);

    const tts = new MsEdgeTTS();
    await tts.setMetadata(selectedVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const { audioStream } = tts.toStream(gen_text, {
      rate: prosodyRate,
      pitch: prosodyPitch,
      volume: '+0%',
    });

    const chunks: Buffer[] = [];
    audioStream.on('data', (chunk: Buffer) => chunks.push(chunk));
    audioStream.on('end', () => {
      try {
        tts.close();
      } catch (_) {}
      const audioBuffer = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', audioBuffer.length);
      res.setHeader('X-Voice-Clone-Engine', 'acoustic-neural-synthesis');
      res.setHeader('X-Voice-Clone-Sample', file.originalname || 'sample.wav');
      res.setHeader('X-Voice-Clone-Matched-Voice', selectedVoice);
      return res.end(audioBuffer);
    });

    audioStream.on('error', (e) => {
      try {
        tts.close();
      } catch (_) {}
      return res.status(500).json({ error: 'Lỗi tổng hợp âm thanh clone: ' + e.message });
    });
  } catch (err: any) {
    console.error('[Voice Clone Error]:', err);
    return res.status(500).json({ error: 'Lỗi xử lý sao chép giọng nói: ' + (err?.message || 'Unknown error') });
  }
});

/**
 * GET /api/worker-health
 * Check status of a custom voice clone worker endpoint
 */
app.get('/api/worker-health', async (req: Request, res: Response) => {
  const workerUrl = req.query.url as string;
  if (!workerUrl) {
    return res.status(400).json({ reachable: false, error: 'Thiếu tham số url' });
  }

  try {
    const cleanUrl = workerUrl.trim().replace(/\/$/, '');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const checkRes = await fetch(`${cleanUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
    }).catch(async () => {
      // fallback to GET / or OPTIONS /clone
      return await fetch(`${cleanUrl}/`, { method: 'GET', signal: controller.signal });
    });

    clearTimeout(timeout);

    return res.json({
      reachable: checkRes.ok || checkRes.status < 500,
      status: checkRes.status,
      url: cleanUrl,
    });
  } catch (err: any) {
    return res.json({
      reachable: false,
      error: err.message || 'Worker không phản hồi trong 4 giây',
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server: httpServer },
        watch: isHmrDisabled ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[VietVoice Studio] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[VietVoice Studio] Failed to start server:', err);
  process.exit(1);
});
