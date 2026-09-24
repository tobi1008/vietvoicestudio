import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Download,
  Share2,
  Check,
  Sparkles,
} from 'lucide-react';
import { AudioItem } from '../types';

interface AudioPlayerProps {
  currentAudio: AudioItem | null;
  onDownload?: (item: AudioItem) => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ currentAudio, onDownload }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [copied, setCopied] = useState<boolean>(false);
  const [staticWaveform, setStaticWaveform] = useState<number[]>([]);

  // Generate pseudo-waveform bars when currentAudio changes
  useEffect(() => {
    if (!currentAudio) {
      setStaticWaveform([]);
      return;
    }
    // Generate 60 pseudo-random bars seeded by audio title/text for consistent aesthetic
    const seed = currentAudio.text.length + currentAudio.createdAt;
    const bars: number[] = [];
    for (let i = 0; i < 64; i++) {
      const val = Math.abs(Math.sin((i + 1) * 0.35 + seed) * 0.7 + Math.cos(i * 0.2) * 0.3);
      bars.push(Math.max(0.15, Math.min(1.0, val)));
    }
    setStaticWaveform(bars);
    setIsPlaying(false);
    setCurrentTime(0);
  }, [currentAudio]);

  // Handle Web Audio API Analyser for real-time visualization
  const setupAudioContext = () => {
    if (!audioRef.current || audioContextRef.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(ctx.destination);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      sourceNodeRef.current = source;
    } catch (e) {
      // AudioContext might be blocked until user gesture or already connected
    }
  };

  // Canvas waveform rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const barCount = 64;
      const barWidth = (width / barCount) - 2;
      const progressRatio = duration > 0 ? currentTime / duration : 0;

      let frequencyData: Uint8Array | null = null;
      if (analyserRef.current && isPlaying) {
        frequencyData = new Uint8Array(analyserRef.current.frequencyBinCount);
        (analyserRef.current as any).getByteFrequencyData(frequencyData);
      }

      for (let i = 0; i < barCount; i++) {
        let barHeightRatio = staticWaveform[i] || 0.3;
        if (frequencyData && isPlaying) {
          const freqIndex = Math.floor((i / barCount) * frequencyData.length);
          const dynamicVal = frequencyData[freqIndex] / 255;
          barHeightRatio = dynamicVal * 0.8 + barHeightRatio * 0.2;
        }

        const barHeight = Math.max(4, barHeightRatio * (height - 8));
        const x = i * (barWidth + 2);
        const y = (height - barHeight) / 2;

        const isPlayed = i / barCount <= progressRatio;

        if (isPlayed) {
          // Gradient for played part: Cyan to Emerald
          const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
          gradient.addColorStop(0, '#06b6d4');
          gradient.addColorStop(1, '#10b981');
          ctx.fillStyle = gradient;
        } else {
          ctx.fillStyle = '#334155';
        }

        // Draw rounded bar
        ctx.beginPath();
        ctx.roundRect(x, y, Math.max(1, barWidth), barHeight, 2);
        ctx.fill();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, currentTime, duration, staticWaveform]);

  // Audio element events
  const togglePlay = async () => {
    if (!audioRef.current || !currentAudio) return;
    setupAudioContext();
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.error('Playback error:', err);
      });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const seekRelative = (delta: number) => {
    if (!audioRef.current) return;
    const newTime = Math.max(0, Math.min(duration, audioRef.current.currentTime + delta));
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !audioRef.current || duration <= 0) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickRatio = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = clickRatio * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
    }
    setIsMuted(newVol === 0);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.muted = false;
      setIsMuted(false);
    } else {
      audioRef.current.muted = true;
      setIsMuted(true);
    }
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const handleCopyText = () => {
    if (!currentAudio) return;
    navigator.clipboard.writeText(currentAudio.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!currentAudio) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 text-center">
        <div className="max-w-md mx-auto space-y-2">
          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <Volume2 className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-slate-200">Trình phát âm thanh sẵn sàng</h4>
          <p className="text-xs text-slate-400">
            Hãy nhập văn bản và nhấn &ldquo;Tạo giọng đọc TTS&rdquo; hoặc thực hiện &ldquo;Sao chép giọng nói&rdquo; để nghe thử và tải file âm thanh chất lượng cao.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl relative overflow-hidden">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={currentAudio.audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80 mb-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-cyan-400 tracking-wide">
              {currentAudio.source === 'edge-tts' && 'MICROSOFT EDGE NEURAL'}
              {currentAudio.source === 'voice-cloner' && 'VOICE CLONE PIPELINE'}
              {currentAudio.source === 'web-speech' && 'WEB SPEECH CLIENT'}
            </span>
            <span className="text-slate-600 text-xs">·</span>
            <span className="text-xs text-slate-300 font-medium truncate">
              {currentAudio.voiceName}
            </span>
            {currentAudio.cloneDetails && (
              <>
                <span className="text-slate-600 text-xs">·</span>
                <span className="text-[11px] text-amber-400 flex items-center gap-1 font-mono">
                  <Sparkles className="w-3 h-3" />
                  {currentAudio.cloneDetails.engine}
                </span>
              </>
            )}
          </div>
          <p className="text-sm text-slate-200 font-medium truncate" title={currentAudio.text}>
            &ldquo;{currentAudio.text}&rdquo;
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyText}
            title="Sao chép văn bản"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-xs flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
          </button>

          <a
            href={currentAudio.audioUrl}
            download={`${currentAudio.title.replace(/\s+/g, '_') || 'vietvoice'}.${currentAudio.mimeType.includes('wav') ? 'wav' : 'mp3'}`}
            onClick={() => onDownload?.(currentAudio)}
            className="px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Tải Audio ({currentAudio.mimeType.includes('wav') ? 'WAV' : 'MP3'})</span>
          </a>
        </div>
      </div>

      {/* Interactive Waveform Canvas */}
      <div className="relative mb-4 group cursor-pointer" onClick={() => {}}>
        <canvas
          ref={canvasRef}
          width={720}
          height={68}
          onClick={handleWaveformClick}
          className="w-full h-16 bg-slate-950/60 rounded-lg border border-slate-800/80 transition-all hover:border-slate-700"
          title="Nhấp vào thanh sóng âm để chuyển đoạn"
        />
        <div className="flex justify-between items-center px-1 mt-1 text-[11px] font-mono tabular-nums text-slate-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Player Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => seekRelative(-5)}
            title="Lùi 5 giây"
            className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={togglePlay}
            title={isPlaying ? 'Tạm dừng' : 'Phát'}
            className="w-11 h-11 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center justify-center transition-transform hover:scale-105 shadow-md shadow-cyan-500/20"
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          <button
            onClick={() => seekRelative(5)}
            title="Tua tới 5 giây"
            className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Playback Speed selector */}
        <div className="flex items-center gap-1 bg-slate-800/60 p-1 rounded-lg">
          {[0.75, 1.0, 1.25, 1.5].map((rate) => (
            <button
              key={rate}
              onClick={() => handleRateChange(rate)}
              className={`px-2 py-1 text-[11px] font-mono rounded font-medium transition-colors ${
                playbackRate === rate
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>

        {/* Volume Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="text-slate-400 hover:text-slate-200 transition-colors"
            title={isMuted ? 'Bật âm' : 'Tắt âm'}
          >
            {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-20 accent-cyan-400 h-1 bg-slate-700 rounded-lg cursor-pointer"
            title={`Âm lượng: ${Math.round(volume * 100)}%`}
          />
        </div>
      </div>
    </div>
  );
};
