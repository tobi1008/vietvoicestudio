import { NextRequest, NextResponse } from 'next/server';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function formatRate(rateVal?: number | string): string {
  if (rateVal === undefined || rateVal === null) return '+0%';
  if (typeof rateVal === 'string' && (rateVal.endsWith('%') || rateVal.endsWith('Hz'))) return rateVal;
  const num = Number(rateVal);
  if (isNaN(num)) return '+0%';
  const pct = Math.round((num - 1.0) * 100);
  return pct >= 0 ? `+${pct}%` : `${pct}%`;
}

function formatPitch(pitchVal?: number | string): string {
  if (pitchVal === undefined || pitchVal === null) return '+0Hz';
  if (typeof pitchVal === 'string' && pitchVal.endsWith('Hz')) return pitchVal;
  const num = Number(pitchVal);
  if (isNaN(num)) return '+0Hz';
  const rounded = Math.round(num);
  return rounded >= 0 ? `+${rounded}Hz` : `${rounded}Hz`;
}

function formatVolume(volVal?: number | string): string {
  if (volVal === undefined || volVal === null) return '+0%';
  if (typeof volVal === 'string' && volVal.endsWith('%')) return volVal;
  const num = Number(volVal);
  if (isNaN(num)) return '+0%';
  const diff = Math.min(0, Math.max(-100, Math.round(num - 100)));
  return diff >= 0 ? `+0%` : `${diff}%`;
}

/**
 * Next.js App Router Route Handler: POST /api/tts
 * Generates natural Vietnamese speech audio using Microsoft Edge Neural TTS.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      text,
      voice = 'vi-VN-HoaiMyNeural',
      rate = 1.0,
      pitch = 0,
      volume = 100,
    } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Vui lòng cung cấp nội dung văn bản (text) cần chuyển đổi.' },
        { status: 400 }
      );
    }

    const cleanText = text.trim();
    const prosodyRate = formatRate(rate);
    const prosodyPitch = formatPitch(pitch);
    const prosodyVolume = formatVolume(volume);

    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const { audioStream } = tts.toStream(cleanText, {
      rate: prosodyRate,
      pitch: prosodyPitch,
      volume: prosodyVolume,
    });

    const chunks: Uint8Array[] = [];

    const audioData = await new Promise<Buffer>((resolve, reject) => {
      audioStream.on('data', (chunk: Buffer) => chunks.push(chunk));
      audioStream.on('end', () => {
        try {
          tts.close();
        } catch (_) {}
        resolve(Buffer.concat(chunks));
      });
      audioStream.on('error', (err) => {
        try {
          tts.close();
        } catch (_) {}
        reject(err);
      });
    });

    return new NextResponse(new Uint8Array(audioData), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioData.length.toString(),
        'Content-Disposition': 'inline; filename="vietvoice-tts.mp3"',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('[Next.js API /api/tts Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Lỗi xử lý Text-to-Speech' },
      { status: 500 }
    );
  }
}
