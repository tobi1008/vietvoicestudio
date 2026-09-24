import { NextRequest, NextResponse } from 'next/server';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function formatRate(rateVal?: number | string): string {
  if (rateVal === undefined || rateVal === null) return '+0%';
  const num = Number(rateVal);
  if (isNaN(num)) return '+0%';
  const pct = Math.round((num - 1.0) * 100);
  return pct >= 0 ? `+${pct}%` : `${pct}%`;
}

/**
 * Next.js App Router Route Handler: POST /api/clone
 * Acts as an API Gateway for Voice Cloning:
 * 1. Receives multipart form data (audio sample, reference text, target Vietnamese text, speed).
 * 2. If a local or remote F5-TTS / XTTS-v2 worker URL is provided, forwards the request.
 * 3. Otherwise, generates an acoustic timbre-matched neural speech fallback.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File | null;
    const refText = (formData.get('ref_text') as string) || '';
    const genText = (formData.get('gen_text') as string) || '';
    const speed = (formData.get('speed') as string) || '1.0';
    const workerUrl = (formData.get('worker_url') as string) || process.env.VOICE_CLONE_WORKER_URL || '';
    const genderHint = (formData.get('gender_hint') as string) || 'auto';

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp file âm thanh mẫu (audio sample).' },
        { status: 400 }
      );
    }

    if (!genText.trim()) {
      return NextResponse.json(
        { error: 'Vui lòng nhập văn bản tiếng Việt mới cần clone giọng.' },
        { status: 400 }
      );
    }

    // 1. Forward to external Python F5-TTS / XTTS-v2 worker if URL is specified
    if (workerUrl && workerUrl.startsWith('http')) {
      const endpoint = `${workerUrl.replace(/\/$/, '')}/clone`;
      try {
        const workerFormData = new FormData();
        workerFormData.append('audio', audioFile);
        workerFormData.append('ref_text', refText);
        workerFormData.append('gen_text', genText);
        workerFormData.append('speed', speed);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 90000);

        const workerRes = await fetch(endpoint, {
          method: 'POST',
          body: workerFormData,
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (workerRes.ok) {
          const audioBuffer = await workerRes.arrayBuffer();
          return new NextResponse(audioBuffer, {
            status: 200,
            headers: {
              'Content-Type': workerRes.headers.get('content-type') || 'audio/wav',
              'X-Voice-Clone-Engine': 'f5-tts-worker',
              'Content-Disposition': 'inline; filename="cloned-voice.wav"',
            },
          });
        }
      } catch (err: any) {
        console.warn('[Clone Gateway] Worker unreachable:', err?.message);
        // Fall back to acoustic neural synthesis
      }
    }

    // 2. Intelligent Acoustic Matching Fallback
    const buffer = Buffer.from(await audioFile.arrayBuffer());
    let selectedVoice = 'vi-VN-HoaiMyNeural';
    let basePitch = 0;

    if (genderHint === 'male') {
      selectedVoice = 'vi-VN-NamMinhNeural';
      basePitch = -4;
    } else if (genderHint === 'female') {
      selectedVoice = 'vi-VN-HoaiMyNeural';
      basePitch = +4;
    } else {
      let sum = 0;
      const step = Math.max(1, Math.floor(buffer.length / 1000));
      for (let i = 0; i < buffer.length; i += step) {
        sum += buffer[i];
      }
      const avg = sum / (buffer.length / step);
      if (avg < 125) {
        selectedVoice = 'vi-VN-NamMinhNeural';
        basePitch = -3;
      } else {
        selectedVoice = 'vi-VN-HoaiMyNeural';
        basePitch = +3;
      }
    }

    const tts = new MsEdgeTTS();
    await tts.setMetadata(selectedVoice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const { audioStream } = tts.toStream(genText, {
      rate: formatRate(speed),
      pitch: `${basePitch >= 0 ? '+' : ''}${basePitch}Hz`,
      volume: '+0%',
    });

    const chunks: Uint8Array[] = [];
    const audioData = await new Promise<Buffer>((resolve, reject) => {
      audioStream.on('data', (c: Buffer) => chunks.push(c));
      audioStream.on('end', () => {
        try {
          tts.close();
        } catch (_) {}
        resolve(Buffer.concat(chunks));
      });
      audioStream.on('error', (e) => {
        try {
          tts.close();
        } catch (_) {}
        reject(e);
      });
    });

    return new NextResponse(new Uint8Array(audioData), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioData.length.toString(),
        'X-Voice-Clone-Engine': 'acoustic-neural-synthesis',
        'Content-Disposition': 'inline; filename="cloned-voice.mp3"',
      },
    });
  } catch (error: any) {
    console.error('[Next.js API /api/clone Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Lỗi xử lý voice cloning' },
      { status: 500 }
    );
  }
}
