import React, { useState, useEffect } from 'react';
import {
  Mic,
  Volume2,
  Sparkles,
  History,
  BookOpen,
  Terminal,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Waves,
  Zap,
} from 'lucide-react';
import { AudioPlayer } from './components/AudioPlayer';
import { TTSGenerator } from './components/TTSGenerator';
import { VoiceCloner } from './components/VoiceCloner';
import { AudioHistory } from './components/AudioHistory';
import { DocsModal } from './components/DocsModal';
import { AudioItem, VoiceOption } from './types';

const INITIAL_VOICES: VoiceOption[] = [
  {
    id: 'vi-VN-HoaiMyNeural',
    name: 'Hoài My (Nữ - Truyền cảm, Tự nhiên)',
    gender: 'Female',
    region: 'Miền Bắc',
    recommendedFor: 'Đọc truyện, tin tức, thuyết minh video, trợ lý ảo',
    isNeural: true,
  },
  {
    id: 'vi-VN-NamMinhNeural',
    name: 'Nam Minh (Nam - Trầm ấm, Quyền lực)',
    gender: 'Male',
    region: 'Miền Bắc',
    recommendedFor: 'Bản tin tài chính, podcast, quảng cáo chuyên nghiệp',
    isNeural: true,
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'tts' | 'clone' | 'history'>('tts');
  const [voices, setVoices] = useState<VoiceOption[]>(INITIAL_VOICES);
  const [history, setHistory] = useState<AudioItem[]>([]);
  const [currentAudio, setCurrentAudio] = useState<AudioItem | null>(null);
  const [isDocsOpen, setIsDocsOpen] = useState<boolean>(false);

  // Load history from LocalStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('vietvoice_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setHistory(parsed);
          setCurrentAudio(parsed[0]);
        }
      }
    } catch (e) {
      console.warn('Could not read history from localStorage');
    }

    // Fetch dynamic voices from /api/voices
    fetch('/api/voices')
      .then((res) => res.json())
      .then((data) => {
        if (data.voices && Array.isArray(data.voices)) {
          setVoices(data.voices);
        }
      })
      .catch((err) => console.warn('Using default voices:', err));
  }, []);

  // Save history to LocalStorage
  const saveHistory = (items: AudioItem[]) => {
    setHistory(items);
    try {
      localStorage.setItem('vietvoice_history', JSON.stringify(items));
    } catch (e) {
      console.warn('Could not save history to localStorage');
    }
  };

  const handleAudioGenerated = (item: AudioItem) => {
    setCurrentAudio(item);
    const updated = [item, ...history.filter((h) => h.id !== item.id)].slice(0, 50);
    saveHistory(updated);
  };

  const handleDeleteHistoryItem = (id: string) => {
    const updated = history.filter((item) => item.id !== id);
    saveHistory(updated);
    if (currentAudio?.id === id) {
      setCurrentAudio(updated[0] || null);
    }
  };

  const handleClearAllHistory = () => {
    saveHistory([]);
    setCurrentAudio(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-cyan-500/20">
              <Waves className="w-5 h-5 text-slate-950" />
            </div>
            <a href="/" className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>VietVoice Studio</span>
              <span className="text-[10px] font-mono text-cyan-400 font-normal px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800/60 hidden sm:inline-block">
                TTS & Voice Clone
              </span>
            </a>
          </div>

          {/* Zone 2: Navigation segmented tabs */}
          <nav className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
            <button
              onClick={() => setActiveTab('tts')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'tts'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Chuyển văn bản (TTS)</span>
            </button>

            <button
              onClick={() => setActiveTab('clone')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'clone'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sao chép giọng (Voice Clone)</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Lịch sử ({history.length})</span>
            </button>
          </nav>

          {/* Zone 3: Primary actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDocsOpen(true)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 transition-colors flex items-center gap-1.5"
            >
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">Tài liệu Next.js & F5-TTS</span>
              <span className="md:hidden">Tài liệu</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Hero Banner / Subtitle */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="text-cyan-400 font-semibold">Giọng đọc tiếng Việt AI</span>
            <span aria-hidden="true">·</span>
            <span>Microsoft Edge Neural (Hoài My / Nam Minh)</span>
            <span aria-hidden="true">·</span>
            <span>Mô hình F5-TTS & XTTS-v2 Diffusion</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-400 font-medium">100% Miễn phí & Mã nguồn mở</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white text-balance">
            Nền tảng Text-to-Speech & Sao chép giọng nói Tiếng Việt
          </h1>
          <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
            Chuyển đổi văn bản thành giọng đọc tự nhiên chuẩn miền Bắc / miền Nam, hoặc nhân bản bất kỳ giọng nói tiếng Việt nào chỉ từ 3-10 giây âm thanh mẫu.
          </p>
        </div>

        {/* Persistent High-Fidelity Audio Player */}
        <section aria-label="Audio Player Section">
          <AudioPlayer currentAudio={currentAudio} />
        </section>

        {/* Content Tabs */}
        <section className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-sm">
          {activeTab === 'tts' && (
            <TTSGenerator
              onAudioGenerated={handleAudioGenerated}
              activeVoices={voices}
            />
          )}

          {activeTab === 'clone' && (
            <VoiceCloner
              onAudioGenerated={handleAudioGenerated}
              onOpenDocs={() => setIsDocsOpen(true)}
            />
          )}

          {activeTab === 'history' && (
            <AudioHistory
              history={history}
              onPlay={(item) => setCurrentAudio(item)}
              onDelete={handleDeleteHistoryItem}
              onClearAll={handleClearAllHistory}
              currentAudioId={currentAudio?.id}
            />
          )}
        </section>

        {/* Technology Highlights Matrix */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs uppercase tracking-wider">
              <Zap className="w-4 h-4" />
              <span>Microsoft Edge Neural TTS</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Sử dụng các giọng đọc neural tiếng Việt chính thức (<code className="text-cyan-300">vi-VN-HoaiMyNeural</code>, <code className="text-cyan-300">vi-VN-NamMinhNeural</code>) với đầy đủ âm sắc tự nhiên, ngắt nghỉ dấu câu chuẩn xác không ngắt quãng.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Zero-Shot Voice Cloning</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Tích hợp kiến trúc API Gateway chuyển tiếp multipart sang worker F5-TTS hoặc XTTS-v2 dựa trên mô hình Flow-Matching diffusion, tái hiện trọn vẹn đặc trưng thanh quản và âm sắc từ file thu âm ngắn.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Next.js 14 & Node.js Runtime</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Được thiết kế theo cấu trúc App Router chuẩn với Route Handlers phân luồng stream âm thanh trực tiếp (audio chunk streaming), tối ưu bộ nhớ đệm và không gây nghẽn tiến trình xử lý.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 mt-12 bg-slate-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">VietVoice Studio</span>
            <span>·</span>
            <span>Dự án mã nguồn mở Text-to-Speech & Voice Cloning tiếng Việt</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDocsOpen(true)}
              className="hover:text-cyan-400 transition-colors"
            >
              Cấu trúc Next.js App Router
            </button>
            <span>·</span>
            <button
              onClick={() => setActiveTab('tts')}
              className="hover:text-cyan-400 transition-colors"
            >
              Thử nghiệm TTS
            </button>
            <span>·</span>
            <button
              onClick={() => setActiveTab('clone')}
              className="hover:text-cyan-400 transition-colors"
            >
              Sao chép giọng
            </button>
          </div>
        </div>
      </footer>

      {/* Deployment & Architecture Documentation Modal */}
      <DocsModal isOpen={isDocsOpen} onClose={() => setIsDocsOpen(false)} />
    </div>
  );
}
