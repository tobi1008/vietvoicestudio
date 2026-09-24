import React, { useState, useEffect } from 'react';
import {
  Volume2,
  Sliders,
  Sparkles,
  RotateCcw,
  BookOpen,
  Mic,
  Cpu,
  Globe,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { AudioItem, VoiceOption } from '../types';

interface TTSGeneratorProps {
  onAudioGenerated: (audioItem: AudioItem) => void;
  activeVoices: VoiceOption[];
}

// Preset samples for quick Vietnamese testing
const SAMPLE_TEXTS = [
  {
    label: 'Tin tức & Thời sự',
    category: 'Bản tin',
    text: 'Chào mừng quý vị và các bạn đến với bản tin chuyển đổi số Việt Nam. Hôm nay, các giải pháp trí tuệ nhân tạo tạo sinh đang được ứng dụng mạnh mẽ trong nhiều lĩnh vực công nghệ cao và đời sống.',
  },
  {
    label: 'Đọc truyện đêm khuya',
    category: 'Văn học',
    text: 'Đêm đã về khuya, không gian lắng đọng chỉ còn tiếng lá bàng rơi nghiêng trên hè phố vắng. Ánh đèn vàng hắt hiu qua khung cửa sổ mang theo nỗi nhớ dịu êm của những ngày xưa cũ.',
  },
  {
    label: 'Quảng cáo & TVC',
    category: 'Marketing',
    text: 'Trải nghiệm đỉnh cao công nghệ âm thanh thế hệ mới! Với độ phân giải siêu nét và khả năng tùy biến thông minh, sản phẩm sẽ đồng hành cùng bạn trên mọi nẻo đường thành công.',
  },
  {
    label: 'Hội thoại thường ngày',
    category: 'Giao tiếp',
    text: 'Alo, bạn có đang rảnh không? Chiều nay chúng mình ghé quán cà phê quen làm việc một chút nhé, mình có một ý tưởng dự án rất thú vị muốn thảo luận cùng bạn!',
  },
];

export const TTSGenerator: React.FC<TTSGeneratorProps> = ({ onAudioGenerated, activeVoices }) => {
  const [text, setText] = useState<string>(
    'Xin chào! Tôi là trợ lý giọng nói tiếng Việt tự nhiên của VietVoice Studio. Bạn có thể nhập bất kỳ văn bản nào để trải nghiệm giọng đọc truyền cảm chất lượng cao.'
  );
  const [selectedVoice, setSelectedVoice] = useState<string>('vi-VN-HoaiMyNeural');
  const [engine, setEngine] = useState<'edge' | 'browser'>('edge');
  const [rate, setRate] = useState<number>(1.0);
  const [pitch, setPitch] = useState<number>(0);
  const [volume, setVolume] = useState<number>(100);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Browser Web Speech API voices
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const updateVoices = () => {
        const v = window.speechSynthesis.getVoices();
        // Priority to Vietnamese voices or all available
        const vi = v.filter(voice => voice.lang.includes('vi') || voice.lang.includes('VN'));
        setBrowserVoices(vi.length > 0 ? vi : v);
      };
      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Text metrics
  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const estSeconds = Math.max(1, Math.round(wordCount / (2.5 * rate)));

  // Generate speech via Edge-TTS (Server) or Web Speech API (Client)
  const handleGenerate = async () => {
    if (!text.trim()) {
      setErrorMessage('Vui lòng nhập văn bản tiếng Việt để bắt đầu.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    if (engine === 'browser') {
      // Client-side Web Speech API
      if (!('speechSynthesis' in window)) {
        setErrorMessage('Trình duyệt của bạn không hỗ trợ Web Speech API. Vui lòng chọn Microsoft Edge TTS.');
        setIsLoading(false);
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.pitch = 1 + pitch / 50; // map -50..50 to 0..2
      utterance.volume = volume / 100;

      const chosenBrowserVoice = browserVoices.find(v => v.voiceURI === selectedVoice);
      if (chosenBrowserVoice) {
        utterance.voice = chosenBrowserVoice;
      }

      utterance.onend = () => {
        setIsLoading(false);
      };
      utterance.onerror = (e) => {
        setIsLoading(false);
        setErrorMessage('Lỗi phát âm Web Speech API: ' + e.error);
      };

      window.speechSynthesis.speak(utterance);

      // Create dummy audio item for session history tracker
      const newAudioItem: AudioItem = {
        id: 'ws-' + Date.now(),
        title: text.slice(0, 35) + (text.length > 35 ? '...' : ''),
        text: text,
        voiceName: chosenBrowserVoice ? chosenBrowserVoice.name : 'Trình duyệt Web Speech',
        source: 'web-speech',
        audioUrl: '', // Web Speech does not yield direct audio blob in standard specs
        createdAt: Date.now(),
        mimeType: 'audio/client-speech',
      };
      onAudioGenerated(newAudioItem);
      setIsLoading(false);
      return;
    }

    // Server-side Microsoft Edge TTS
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice: selectedVoice,
          rate,
          pitch,
          volume,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({ error: 'Lỗi máy chủ TTS' }));
        throw new Error(errJson.error || `HTTP error ${response.status}`);
      }

      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      const voiceObj = activeVoices.find(v => v.id === selectedVoice);

      const newAudioItem: AudioItem = {
        id: 'edge-' + Date.now(),
        title: text.slice(0, 38) + (text.length > 38 ? '...' : ''),
        text: text,
        voiceName: voiceObj ? voiceObj.name : selectedVoice,
        source: 'edge-tts',
        audioUrl: audioUrl,
        fileSize: (blob.size / 1024).toFixed(1) + ' KB',
        duration: estSeconds,
        createdAt: Date.now(),
        mimeType: 'audio/mpeg',
      };

      onAudioGenerated(newAudioItem);
    } catch (err: any) {
      console.error('TTS error:', err);
      setErrorMessage(err.message || 'Không thể tổng hợp âm thanh. Hãy kiểm tra lại kết nối mạng.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSettings = () => {
    setRate(1.0);
    setPitch(0);
    setVolume(100);
  };

  return (
    <div className="space-y-6">
      {/* Engine Selection Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Động cơ TTS:</span>
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => {
                setEngine('edge');
                setSelectedVoice('vi-VN-HoaiMyNeural');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                engine === 'edge'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Microsoft Edge Neural (Khuyên dùng)</span>
            </button>
            <button
              onClick={() => {
                setEngine('browser');
                if (browserVoices.length > 0) setSelectedVoice(browserVoices[0].voiceURI);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                engine === 'browser'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Web Speech API (Trình duyệt)</span>
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-400">
          {engine === 'edge' ? (
            <span className="text-emerald-400">● Miễn phí 100% · Giọng đọc AI tự nhiên</span>
          ) : (
            <span className="text-amber-400">● Chạy trực tiếp client · Không tốn server</span>
          )}
        </div>
      </div>

      {/* Voice Selection Cards */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
          1. Chọn giọng đọc Tiếng Việt
        </label>

        {engine === 'edge' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeVoices.map((voice) => {
              const isSelected = selectedVoice === voice.id;
              return (
                <div
                  key={voice.id}
                  onClick={() => setSelectedVoice(voice.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-500/70 shadow-lg shadow-cyan-950/50'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${
                          voice.gender === 'Female'
                            ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}
                      >
                        {voice.gender === 'Female' ? 'Nữ' : 'Nam'}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-100">{voice.name}</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span>{voice.region || 'Giọng chuẩn'}</span>
                          <span aria-hidden="true">·</span>
                          <span>{voice.gender === 'Female' ? 'Nữ tính, diễn cảm' : 'Nam tính, trầm ấm'}</span>
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-xs text-cyan-400 font-semibold flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> Đã chọn
                      </span>
                    )}
                  </div>

                  {voice.recommendedFor && (
                    <p className="text-xs text-slate-400 mt-3 pt-2 border-t border-slate-800/80">
                      Phù hợp: <span className="text-slate-300">{voice.recommendedFor}</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              {browserVoices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang}) {v.default ? ' [Mặc định]' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Textarea & Presets */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            2. Nhập văn bản tiếng Việt
          </label>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>{charCount} ký tự</span>
            <span aria-hidden="true">·</span>
            <span>{wordCount} từ</span>
            <span aria-hidden="true">·</span>
            <span className="text-cyan-400 font-mono">~{estSeconds} giây đọc</span>
          </div>
        </div>

        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder="Nhập hoặc dán văn bản tiếng Việt tại đây (hỗ trợ văn bản dài, dấu câu chuẩn xác)..."
            className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-sans leading-relaxed"
          />
        </div>

        {/* Preset Sentences */}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5" /> Mẫu câu:
          </span>
          {SAMPLE_TEXTS.map((sample, idx) => (
            <button
              key={idx}
              onClick={() => setText(sample.text)}
              className="px-2.5 py-1 text-xs rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              {sample.label}
            </button>
          ))}
          <button
            onClick={() => setText('')}
            className="px-2.5 py-1 text-xs rounded-md bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 transition-colors ml-auto"
          >
            Xóa trắng
          </button>
        </div>
      </div>

      {/* Audio Parameters Sliders */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              3. Tinh chỉnh âm thanh (Prosody)
            </h4>
          </div>
          <button
            onClick={handleResetSettings}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Mặc định</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1">
          {/* Speed / Rate */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Tốc độ (Speed)</span>
              <span className="font-mono tabular-nums text-cyan-400 font-semibold">{rate.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.05"
              value={rate}
              onChange={(e) => setRate(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0.5x (Chậm)</span>
              <span>1.0x</span>
              <span>2.0x (Nhanh)</span>
            </div>
          </div>

          {/* Pitch */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Cao độ (Pitch)</span>
              <span className="font-mono tabular-nums text-cyan-400 font-semibold">
                {pitch >= 0 ? `+${pitch}` : pitch} Hz
              </span>
            </div>
            <input
              type="range"
              min="-25"
              max="25"
              step="1"
              value={pitch}
              onChange={(e) => setPitch(parseInt(e.target.value, 10))}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>-25Hz (Trầm)</span>
              <span>0Hz</span>
              <span>+25Hz (Thanh)</span>
            </div>
          </div>

          {/* Volume */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Âm lượng (Volume)</span>
              <span className="font-mono tabular-nums text-cyan-400 font-semibold">{volume}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="100"
              step="5"
              value={volume}
              onChange={(e) => setVolume(parseInt(e.target.value, 10))}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>20%</span>
              <span>60%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error display */}
      {errorMessage && (
        <div className="p-3 bg-rose-950/50 border border-rose-800 rounded-xl flex items-center gap-2 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleGenerate}
        disabled={isLoading || !text.trim()}
        className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/30 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.005] active:scale-[0.995]"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            <span>Đang tổng hợp giọng nói tiếng Việt...</span>
          </>
        ) : (
          <>
            <Volume2 className="w-4 h-4" />
            <span>Tạo giọng đọc TTS (Text-to-Speech)</span>
          </>
        )}
      </button>
    </div>
  );
};
