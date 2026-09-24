import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Terminal,
  Server,
  Layers,
  FileCode,
  ExternalLink,
  Cpu,
} from 'lucide-react';

interface DocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocsModal: React.FC<DocsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'docker' | 'nextjs' | 'python'>('docker');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const dockerCommand = `# 1. Di chuyển vào thư mục worker trong dự án
cd worker

# 2. Khởi chạy container Voice Cloning Worker F5-TTS với GPU NVIDIA
docker compose up -d --build

# 3. Kiểm tra logs container
docker logs -f vietvoice-clone-worker`;

  const pythonManualSetup = `# Cài đặt môi trường Python 3.10+
python -m venv venv
source venv/bin/activate  # Trên Windows: venv\\Scripts\\activate

# Cài đặt PyTorch hỗ trợ CUDA (GPU)
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121

# Cài đặt F5-TTS và FastAPI worker dependencies
pip install fastapi uvicorn python-multipart soundfile numpy f5-tts

# Khởi chạy server worker trên cổng 8000
python worker/app.py`;

  const nextjsInstallCmd = `# Khởi chạy dự án Next.js 14 App Router
npm install
npm run dev

# Mở trình duyệt tại http://localhost:3000`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-600/20 text-cyan-400 flex items-center justify-center">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Hướng dẫn triển khai Next.js 14 & Worker Voice Clone (F5-TTS)
              </h3>
              <p className="text-xs text-slate-400">
                Kiến trúc Full-Stack tách biệt: Next.js API Gateway + Python AI Worker
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 px-6 gap-2 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('docker')}
            className={`py-3 px-3 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'docker'
                ? 'border-cyan-500 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>1. Docker Compose (Khuyên dùng)</span>
          </button>

          <button
            onClick={() => setActiveTab('python')}
            className={`py-3 px-3 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'python'
                ? 'border-cyan-500 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>2. Cài đặt Python Local</span>
          </button>

          <button
            onClick={() => setActiveTab('nextjs')}
            className={`py-3 px-3 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'nextjs'
                ? 'border-cyan-500 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>3. Cấu trúc Next.js App Router</span>
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed">
          {activeTab === 'docker' && (
            <div className="space-y-4">
              <p>
                Dự án đã đính kèm sẵn cấu hình <code className="text-cyan-400 font-mono">worker/Dockerfile</code> và{' '}
                <code className="text-cyan-400 font-mono">worker/docker-compose.yml</code> tối ưu hóa cho mô hình
                Voice Cloning tiếng Việt. Bạn chỉ cần chạy lệnh sau trên máy chủ có GPU NVIDIA:
              </p>

              <div className="relative bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-slate-200">
                <button
                  onClick={() => copyToClipboard(dockerCommand, 'docker')}
                  className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Sao chép lệnh"
                >
                  {copiedKey === 'docker' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <pre className="overflow-x-auto text-[11px] leading-5">{dockerCommand}</pre>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                <span className="font-semibold text-slate-200 block">Kiểm tra kết nối sau khi bật Docker:</span>
                <p className="text-slate-400">
                  Truy cập trình duyệt tại <code className="text-cyan-400">http://localhost:8000/health</code> hoặc nhấn nút{' '}
                  <strong>&ldquo;Kiểm tra&rdquo;</strong> ngay tại giao diện Sao chép giọng để hệ thống tự động nhận diện Worker!
                </p>
              </div>
            </div>
          )}

          {activeTab === 'python' && (
            <div className="space-y-4">
              <p>
                Nếu bạn muốn chạy worker trực tiếp bằng Python mà không dùng Docker (ví dụ trên máy trạm Windows hoặc Linux Ubuntu có CUDA):
              </p>

              <div className="relative bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-slate-200">
                <button
                  onClick={() => copyToClipboard(pythonManualSetup, 'python')}
                  className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Sao chép lệnh"
                >
                  {copiedKey === 'python' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <pre className="overflow-x-auto text-[11px] leading-5">{pythonManualSetup}</pre>
              </div>

              <p className="text-slate-400">
                File thực thi worker được đặt tại <code className="text-cyan-400 font-mono">worker/app.py</code> đã hỗ trợ sẵn việc nhận multipart upload, xử lý cắt audio mẫu, và gọi F5-TTS inference để trả về luồng âm thanh WAV chất lượng cao 24kHz.
              </p>
            </div>
          )}

          {activeTab === 'nextjs' && (
            <div className="space-y-4">
              <p>
                Toàn bộ cấu trúc thư mục Next.js 14 (App Router) chuẩn đã được tạo trong dự án:
              </p>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-[11px] text-slate-300 space-y-1">
                <div>📁 <span className="text-cyan-300">app/</span></div>
                <div className="pl-4">📁 <span className="text-cyan-300">api/</span></div>
                <div className="pl-8">📁 <span className="text-amber-300">tts/route.ts</span> <span className="text-slate-500">← Xử lý Microsoft Edge Neural TTS tiếng Việt</span></div>
                <div className="pl-8">📁 <span className="text-amber-300">clone/route.ts</span> <span className="text-slate-500">← Gateway forward audio sample sang AI Worker</span></div>
                <div>📁 <span className="text-cyan-300">components/</span></div>
                <div className="pl-4">📄 <span className="text-slate-200">tts-generator.tsx</span> <span className="text-slate-500">← Giao diện nhập văn bản & chọn giọng Hoài My/Nam Minh</span></div>
                <div className="pl-4">📄 <span className="text-slate-200">voice-cloner.tsx</span> <span className="text-slate-500">← Giao diện upload/mic thu âm & clone giọng</span></div>
                <div className="pl-4">📄 <span className="text-slate-200">audio-player.tsx</span> <span className="text-slate-500">← Trình phát sóng âm (Waveform Canvas) & tải MP3</span></div>
                <div>📁 <span className="text-cyan-300">worker/</span></div>
                <div className="pl-4">📄 <span className="text-slate-200">app.py</span>, <span className="text-slate-200">Dockerfile</span>, <span className="text-slate-200">docker-compose.yml</span></div>
              </div>

              <div className="relative bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-slate-200">
                <button
                  onClick={() => copyToClipboard(nextjsInstallCmd, 'nextjs')}
                  className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Sao chép lệnh"
                >
                  {copiedKey === 'nextjs' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <pre className="overflow-x-auto text-[11px] leading-5">{nextjsInstallCmd}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-slate-800 flex justify-between items-center bg-slate-950/60">
          <span className="text-xs text-slate-400">
            VietVoice Studio · Thiết kế chuẩn Next.js 14 App Router & Node.js Runtime
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
          >
            Đóng hướng dẫn
          </button>
        </div>
      </div>
    </div>
  );
};
