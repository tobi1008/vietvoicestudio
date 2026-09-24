import React, { useState } from 'react';
import {
  History,
  Play,
  Download,
  Trash2,
  Copy,
  Check,
  Search,
  Volume2,
  Sparkles,
} from 'lucide-react';
import { AudioItem } from '../types';

interface AudioHistoryProps {
  history: AudioItem[];
  onPlay: (item: AudioItem) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  currentAudioId?: string;
}

export const AudioHistory: React.FC<AudioHistoryProps> = ({
  history,
  onPlay,
  onDelete,
  onClearAll,
  currentAudioId,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredHistory = history.filter((item) =>
    item.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.voiceName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopy = (item: AudioItem) => {
    navigator.clipboard.writeText(item.text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-slate-100">
            Lịch sử tạo âm thanh ({history.length})
          </h3>
        </div>

        {history.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Xóa tất cả</span>
          </button>
        )}
      </div>

      {/* Search Filter */}
      {history.length > 2 && (
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm theo nội dung hoặc giọng..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      )}

      {/* List */}
      {filteredHistory.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-400">
          Chưa có file âm thanh nào được lưu. Hãy thử tạo giọng đọc TTS hoặc Voice Clone ở trên!
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
          {filteredHistory.map((item) => {
            const isPlayingThis = currentAudioId === item.id;
            return (
              <div
                key={item.id}
                className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                  isPlayingThis
                    ? 'bg-cyan-950/40 border-cyan-500/60 shadow-md shadow-cyan-950/30'
                    : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950'
                }`}
              >
                {/* Play Button & Info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {item.audioUrl ? (
                    <button
                      onClick={() => onPlay(item)}
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform hover:scale-105 ${
                        isPlayingThis
                          ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                      }`}
                      title="Phát âm thanh"
                    >
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </button>
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-slate-800/50 text-slate-500 flex items-center justify-center shrink-0">
                      <Volume2 className="w-4 h-4" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-200 truncate" title={item.text}>
                      {item.text}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-1">
                      <span className="font-medium text-slate-300">{item.voiceName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-cyan-400/90 uppercase tracking-wider text-[10px]">
                        {item.source === 'edge-tts' && 'Edge Neural'}
                        {item.source === 'voice-cloner' && 'Voice Clone'}
                        {item.source === 'web-speech' && 'Web Speech'}
                      </span>
                      {item.fileSize && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">{item.fileSize}</span>
                        </>
                      )}
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-slate-500">{formatTimestamp(item.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleCopy(item)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                    title="Sao chép văn bản"
                  >
                    {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  {item.audioUrl && (
                    <a
                      href={item.audioUrl}
                      download={`vietvoice_${item.id}.${item.mimeType.includes('wav') ? 'wav' : 'mp3'}`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
                      title="Tải về máy (.mp3 / .wav)"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  )}

                  <button
                    onClick={() => onDelete(item.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                    title="Xóa mục này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
