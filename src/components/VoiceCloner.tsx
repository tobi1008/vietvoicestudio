import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Upload,
  Play,
  Pause,
  Sparkles,
  Server,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  FileAudio,
  Radio,
  Clock,
  HelpCircle,
} from 'lucide-react';
import { AudioItem } from '../types';

interface VoiceClonerProps {
  onAudioGenerated: (audioItem: AudioItem) => void;
  onOpenDocs?: () => void;
}

const SAMPLE_REFERENCE_PRESETS = [
  {
    title: 'Mẫu Giới thiệu',
    refText: 'Xin chào, tôi là một chuyên gia lồng tiếng và sáng tạo nội dung tại Việt Nam.',
    targetText: 'Hôm nay chúng ta sẽ cùng khám phá ứng dụng trí tuệ nhân tạo đột phá trong lĩnh vực xử lý âm thanh tiếng Việt.',
  },
  {
    title: 'Mẫu Kể chuyện',
    refText: 'Ngày xửa ngày xưa, ở một ngôi làng nhỏ ven sông Đáy, có một người thợ mộc rất yêu nghề.',
    targetText: 'Mỗi buổi sáng tinh mơ, khi màn sương còn giăng kín trên ngọn tre già, tiếng đục đẽo rộn rã đã vang lên khắp thôn xóm.',
  },
  {
    title: 'Mẫu Podcast',
    refText: 'Chào mừng các bạn quay trở lại với tập podcast công nghệ và đời sống số tuần này.',
    targetText: 'Chúng tôi tin rằng công nghệ giọng nói AI sẽ mở ra cánh cửa sáng tạo không giới hạn cho mọi nhà sáng tạo nội dung.',
  },
];

export const VoiceCloner: React.FC<VoiceClonerProps> = ({ onAudioGenerated, onOpenDocs }) => {
  // Audio sample state
  const [audioSourceMode, setAudioSourceMode] = useState<'upload' | 'record'>('upload');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [sampleDuration, setSampleDuration] = useState<number>(0);

  // Recording state
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

  // Preview sample audio
  const [isPlayingSample, setIsPlayingSample] = useState<boolean>(false);
  const sampleAudioRef = useRef<HTMLAudioElement | null>(null);

  // Text inputs
  const [refText, setRefText] = useState<string>(
    'Xin chào, tôi là một chuyên gia lồng tiếng và sáng tạo nội dung tại Việt Nam.'
  );
  const [genText, setGenText] = useState<string>(
    'Chào mừng các bạn đến với studio giọng nói trí tuệ nhân tạo. Giọng nói này đã được sao chép thành công từ mẫu audio gốc của bạn.'
  );

  // Tuning & Worker config
  const [speed, setSpeed] = useState<number>(1.0);
  const [genderHint, setGenderHint] = useState<'auto' | 'female' | 'male'>('auto');
  const [workerUrl, setWorkerUrl] = useState<string>('http://localhost:8000');
  const [workerStatus, setWorkerStatus] = useState<'checking' | 'online' | 'offline' | 'untested'>('untested');
  const [workerMsg, setWorkerMsg] = useState<string>('');

  // Generation state & progress
  const [isCloning, setIsCloning] = useState<boolean>(false);
  const [cloneStep, setCloneStep] = useState<number>(0);
  const [cloneProgress, setCloneProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Check worker health
  const handleCheckWorker = async () => {
    if (!workerUrl.trim()) return;
    setWorkerStatus('checking');
    try {
      const res = await fetch(`/api/worker-health?url=${encodeURIComponent(workerUrl.trim())}`);
      const data = await res.json();
      if (data.reachable) {
        setWorkerStatus('online');
        setWorkerMsg('Worker F5-TTS / XTTS-v2 đang trực tuyến và sẵn sàng xử lý!');
      } else {
        setWorkerStatus('offline');
        setWorkerMsg(data.error || 'Không thể kết nối đến URL Worker');
      }
    } catch (e: any) {
      setWorkerStatus('offline');
      setWorkerMsg('Không phản hồi: ' + e.message);
    }
  };

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAudioFile(file);
      if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl);
      const url = URL.createObjectURL(file);
      setAudioBlobUrl(url);

      // Measure audio duration
      const tempAudio = new Audio(url);
      tempAudio.onloadedmetadata = () => {
        setSampleDuration(Math.round(tempAudio.duration));
      };
    }
  };

  // Start recording from microphone
  const startRecording = async () => {
    try {
      setErrorMessage(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const recordedFile = new File([audioBlob], `mic-recording-${Date.now()}.webm`, {
          type: 'audio/webm',
        });
        setAudioFile(recordedFile);
        if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl);
        const url = URL.createObjectURL(audioBlob);
        setAudioBlobUrl(url);
        setSampleDuration(recordingSeconds);

        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 20) {
            stopRecording();
            return 20;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Microphone access denied:', err);
      setErrorMessage('Không thể truy cập Microphone. Vui lòng cấp quyền ghi âm trong trình duyệt.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  // Toggle sample playback
  const togglePlaySample = () => {
    if (!audioBlobUrl) return;
    if (!sampleAudioRef.current) {
      const audio = new Audio(audioBlobUrl);
      sampleAudioRef.current = audio;
      audio.onended = () => setIsPlayingSample(false);
    }

    if (isPlayingSample) {
      sampleAudioRef.current.pause();
      setIsPlayingSample(false);
    } else {
      sampleAudioRef.current.play().then(() => setIsPlayingSample(true));
    }
  };

  // Generate voice clone with step-by-step progress
  const handleCloneVoice = async () => {
    if (!audioFile) {
      setErrorMessage('Vui lòng tải lên hoặc ghi âm đoạn giọng nói mẫu (3-15 giây).');
      return;
    }
    if (!genText.trim()) {
      setErrorMessage('Vui lòng nhập đoạn văn bản tiếng Việt mới cần sao chép giọng.');
      return;
    }

    setErrorMessage(null);
    setIsCloning(true);
    setCloneStep(1);
    setCloneProgress(15);

    // Simulated progress steps for user feedback
    const stepTimer1 = setTimeout(() => {
      setCloneStep(2);
      setCloneProgress(45);
    }, 1200);

    const stepTimer2 = setTimeout(() => {
      setCloneStep(3);
      setCloneProgress(75);
    }, 2400);

    try {
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('ref_text', refText);
      formData.append('gen_text', genText);
      formData.append('speed', String(speed));
      formData.append('gender_hint', genderHint);
      if (workerStatus === 'online' && workerUrl) {
        formData.append('worker_url', workerUrl);
      }

      const response = await fetch('/api/clone', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({ error: 'Lỗi xử lý Voice Clone' }));
        throw new Error(errJson.error || `HTTP error ${response.status}`);
      }

      setCloneStep(4);
      setCloneProgress(95);

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const engineHeader = response.headers.get('x-voice-clone-engine') || 'acoustic-neural-synthesis';
      const isExternalWorker = engineHeader.includes('f5-tts') || engineHeader.includes('worker');

      const newAudioItem: AudioItem = {
        id: 'clone-' + Date.now(),
        title: 'Giọng Clone: ' + genText.slice(0, 32) + '...',
        text: genText,
        voiceName: isExternalWorker ? 'F5-TTS Voice Clone' : 'VietVoice Acoustic Match',
        source: 'voice-cloner',
        audioUrl: audioUrl,
        fileSize: (blob.size / 1024).toFixed(1) + ' KB',
        createdAt: Date.now(),
        mimeType: blob.type || 'audio/mpeg',
        cloneDetails: {
          engine: isExternalWorker ? 'F5-TTS GPU Diffusion' : 'Intelligent Timbre Matcher',
          sampleName: audioFile.name,
          refText: refText,
        },
      };

      setCloneProgress(100);
      setTimeout(() => {
        onAudioGenerated(newAudioItem);
        setIsCloning(false);
      }, 500);
    } catch (err: any) {
      console.error('Clone failed:', err);
      setErrorMessage(err.message || 'Lỗi trong quá trình tạo giọng clone.');
      setIsCloning(false);
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
    }
  };

  const applyPreset = (preset: typeof SAMPLE_REFERENCE_PRESETS[0]) => {
    setRefText(preset.refText);
    setGenText(preset.targetText);
  };

  return (
    <div className="space-y-6">
      {/* Overview & Dual Engine Banner */}
      <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-100">
              Công nghệ Voice Cloning tiếng Việt đa tầng
            </h3>
          </div>
          {onOpenDocs && (
            <button
              onClick={onOpenDocs}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Xem hướng dẫn chạy GPU Worker F5-TTS</span>
            </button>
          )}
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Ứng dụng cung cấp 2 chế độ sao chép giọng nói: (1) Kết nối trực tiếp với GPU Worker mô hình
          <span className="text-cyan-300 font-semibold"> F5-TTS / XTTS-v2</span> để clone nguyên vẹn âm sắc đặc trưng;
          (2) Chế độ <span className="text-emerald-300 font-semibold">Intelligent Acoustic Timbre Matcher</span> tự động nhận diện tần số cao độ và đặc trưng giọng của mẫu để mô phỏng phát âm tiếng Việt chuẩn xác ngay cả khi bạn chưa có máy chủ GPU.
        </p>
      </div>

      {/* Step 1: Input Audio Sample */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            1. Âm thanh giọng nói mẫu (3 - 15 giây)
          </label>
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setAudioSourceMode('upload')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                audioSourceMode === 'upload'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Tải file (.wav, .mp3)</span>
            </button>
            <button
              onClick={() => setAudioSourceMode('record')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                audioSourceMode === 'record'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Ghi âm trực tiếp qua Mic</span>
            </button>
          </div>
        </div>

        {audioSourceMode === 'upload' ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-800 hover:border-cyan-500/50 bg-slate-900/50 hover:bg-slate-900/80 rounded-xl p-6 text-center cursor-pointer transition-all"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="audio/*"
              className="hidden"
            />
            <div className="w-10 h-10 rounded-xl bg-slate-800 text-cyan-400 flex items-center justify-center mx-auto mb-2">
              <FileAudio className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-slate-200">
              {audioFile ? audioFile.name : 'Nhấp để chọn file âm thanh mẫu hoặc kéo thả vào đây'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Khuyên dùng file âm thanh rõ tiếng, ít tạp âm, định dạng WAV, MP3, M4A (3 - 15 giây)
            </p>
          </div>
        ) : (
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              {!isRecording ? (
                <button
                  onClick={startRecording}
                  className="px-5 py-3 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-rose-900/30 transition-transform hover:scale-105"
                >
                  <Radio className="w-4 h-4" />
                  <span>Bắt đầu ghi âm</span>
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="px-5 py-3 rounded-full bg-amber-600 hover:bg-amber-500 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-amber-900/30 animate-pulse"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>Dừng ghi âm ({recordingSeconds}s)</span>
                </button>
              )}
            </div>

            {isRecording && (
              <div className="text-xs text-rose-400 flex items-center justify-center gap-2 font-mono">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span>Đang thu âm qua Micro... Hãy đọc rõ ràng đoạn văn mẫu (3-15s)</span>
              </div>
            )}
          </div>
        )}

        {/* Audio sample preview player */}
        {audioBlobUrl && (
          <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlaySample}
                className="w-8 h-8 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center shadow-sm"
              >
                {isPlayingSample ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>
              <div>
                <span className="text-xs font-medium text-slate-200 block">
                  {audioFile ? audioFile.name : 'Đoạn ghi âm mẫu'}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Thời lượng: ~{sampleDuration}s · Đã sẵn sàng clone
                </span>
              </div>
            </div>
            <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Mẫu hợp lệ
            </span>
          </div>
        )}
      </div>

      {/* Preset Reference Pairs */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-400">Gợi ý mẫu ghép nối:</span>
        {SAMPLE_REFERENCE_PRESETS.map((preset, idx) => (
          <button
            key={idx}
            onClick={() => applyPreset(preset)}
            className="px-2.5 py-1 text-xs rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            {preset.title}
          </button>
        ))}
      </div>

      {/* Step 2: Reference Text (What the sample is saying) */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
          2. Nội dung văn bản của file mẫu (Reference Text)
        </label>
        <input
          type="text"
          value={refText}
          onChange={(e) => setRefText(e.target.value)}
          placeholder="Nhập chính xác nội dung câu nói trong file audio mẫu (để mô hình căn chỉnh âm vị phoneme)..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
        <p className="text-[11px] text-slate-400 mt-1">
          * Giúp mô hình F5-TTS / XTTS-v2 align chuẩn xác từng âm vị tiếng Việt giữa audio gốc và văn bản.
        </p>
      </div>

      {/* Step 3: Target Text (What we want the cloned voice to say) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            3. Văn bản tiếng Việt mới cần phát bằng giọng clone
          </label>
          <span className="text-xs text-slate-400 font-mono">{genText.length} ký tự</span>
        </div>
        <textarea
          value={genText}
          onChange={(e) => setGenText(e.target.value)}
          rows={4}
          placeholder="Nhập đoạn văn bản tiếng Việt mới mà bạn muốn giọng nói vừa sao chép đọc..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans leading-relaxed"
        />
      </div>

      {/* Step 4: Fine-Tuning & Optional External GPU Worker Setup */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              4. Cấu hình Worker & Tham số clone
            </h4>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Speed tuning */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Tốc độ phát âm (Speed)</span>
              <span className="font-mono tabular-nums text-cyan-400">{speed.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.7"
              max="1.5"
              step="0.05"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Gender hint */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 block">Định hướng âm vực giọng mẫu</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'auto', label: 'Tự động' },
                { id: 'female', label: 'Giọng Nữ' },
                { id: 'male', label: 'Giọng Nam' },
              ].map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGenderHint(g.id as any)}
                  className={`py-1.5 text-xs rounded-lg font-medium transition-colors border ${
                    genderHint === g.id
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Worker Endpoint Connection Input */}
        <div className="pt-2 border-t border-slate-800">
          <label className="block text-xs text-slate-300 mb-1.5">
            GPU Worker URL (Tùy chọn: F5-TTS / XTTS-v2 FastAPI server):
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Server className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={workerUrl}
                onChange={(e) => setWorkerUrl(e.target.value)}
                placeholder="http://localhost:8000 hoặc https://your-worker.hf.space"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button
              onClick={handleCheckWorker}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Kiểm tra</span>
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px]">
            {workerStatus === 'online' && (
              <span className="text-emerald-400 flex items-center gap-1">
                ● Trực tuyến · Đang dùng engine F5-TTS cao cấp
              </span>
            )}
            {workerStatus === 'offline' && (
              <span className="text-amber-400 flex items-center gap-1">
                ▲ Chưa kết nối worker ngoài · Hệ thống sẽ kích hoạt Intelligent Acoustic Matcher
              </span>
            )}
            {workerStatus === 'untested' && (
              <span className="text-slate-400">
                Nhập URL worker nếu bạn đã khởi chạy container local hoặc HuggingFace Space.
              </span>
            )}
            {workerStatus === 'checking' && (
              <span className="text-cyan-400 animate-pulse">Đang ping kiểm tra kết nối...</span>
            )}
          </div>
        </div>
      </div>

      {/* Progress Animation during cloning */}
      {isCloning && (
        <div className="p-4 bg-slate-900 border border-cyan-500/40 rounded-xl space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-cyan-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 animate-spin text-cyan-400" />
              Đang thực hiện Voice Cloning Tiếng Việt...
            </span>
            <span className="font-mono tabular-nums text-cyan-400">{cloneProgress}%</span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${cloneProgress}%` }}
            />
          </div>

          {/* Step indicators */}
          <div className="grid grid-cols-4 gap-2 pt-1 text-[11px]">
            <div className={`space-y-0.5 ${cloneStep >= 1 ? 'text-cyan-300' : 'text-slate-500'}`}>
              <span className="font-mono">01. Tiền xử lý</span>
              <p className="text-[10px] text-slate-400 truncate">Lọc ồn & cắt mẫu</p>
            </div>
            <div className={`space-y-0.5 ${cloneStep >= 2 ? 'text-cyan-300' : 'text-slate-500'}`}>
              <span className="font-mono">02. Trích xuất</span>
              <p className="text-[10px] text-slate-400 truncate">Timbre embedding</p>
            </div>
            <div className={`space-y-0.5 ${cloneStep >= 3 ? 'text-cyan-300' : 'text-slate-500'}`}>
              <span className="font-mono">03. Flow Match</span>
              <p className="text-[10px] text-slate-400 truncate">Đồng bộ tiếng Việt</p>
            </div>
            <div className={`space-y-0.5 ${cloneStep >= 4 ? 'text-cyan-300' : 'text-slate-500'}`}>
              <span className="font-mono">04. Xuất Audio</span>
              <p className="text-[10px] text-slate-400 truncate">Neural Vocoder</p>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {errorMessage && (
        <div className="p-3 bg-rose-950/50 border border-rose-800 rounded-xl flex items-center gap-2 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleCloneVoice}
        disabled={isCloning || !audioFile || !genText.trim()}
        className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/30 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.005] active:scale-[0.995]"
      >
        <Sparkles className="w-4 h-4" />
        <span>Tạo giọng clone tiếng Việt (Voice Cloning)</span>
      </button>
    </div>
  );
};
