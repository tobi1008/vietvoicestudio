# VietVoice Studio - Nền tảng TTS & Voice Cloning Tiếng Việt

VietVoice Studio là ứng dụng Web Full-stack hoàn chỉnh chuyên xử lý giọng nói tiếng Việt (Text-to-Speech & Voice Cloning), kết hợp các mô hình AI Neural chất lượng cao và kiến trúc App Router Node.js runtime.

---

## 🚀 Các Tính Năng Nổi Bật

1. **Text-to-Speech (TTS) Tiếng Việt Chuẩn**:
   - Tích hợp **Microsoft Edge Neural TTS** hoàn toàn miễn phí, không giới hạn ký tự:
     - Giọng Nữ: `vi-VN-HoaiMyNeural` (Hoài My - truyền cảm, tự nhiên).
     - Giọng Nam: `vi-VN-NamMinhNeural` (Nam Minh - trầm ấm, quyền lực).
   - Tích hợp tùy chọn **Web Speech API** chạy hoàn toàn phía client-side không tốn tài nguyên máy chủ.
   - Bộ điều chỉnh Prosody: Tốc độ đọc (Rate: 0.5x - 2.0x), Cao độ (Pitch: -25Hz đến +25Hz), Âm lượng (Volume).
   - Mẫu câu tiếng Việt phong phú: Thời sự, Văn học, TVC Quảng cáo, Giao tiếp.

2. **Zero-Shot Voice Cloning (Sao Chép Giọng Nói)**:
   - Tải lên file âm thanh mẫu (3-15s) định dạng `.wav`, `.mp3`, `.m4a` hoặc **thu âm trực tiếp qua Micro**.
   - Cung cấp ô nhập **Reference Text** giúp mô hình căn chỉnh (align) âm vị tiếng Việt chuẩn xác.
   - Hỗ trợ **Dual Engine**:
     - **GPU Worker Mode**: Chuyển tiếp tới container Python chạy **F5-TTS** (Flow-Matching Diffusion) hoặc **XTTS-v2**.
     - **Intelligent Acoustic Timbre Matcher**: Tự động phân tích trường độ, cao độ và tần số của audio mẫu để mô phỏng tức thì ngay cả khi chưa có máy chủ GPU.
   - Thanh tiến trình 4 giai đoạn trực quan: Preprocessing -> Timbre Embeddings -> Phoneme Alignment -> Neural Vocoding.

3. **Audio Player Hiện Đại**:
   - Trực quan hóa sóng âm bằng HTML5 Canvas Waveform tương tác (nhấp vào sóng để chuyển đoạn tức thì).
   - Tua nhanh/lùi 5 giây, điều chỉnh tốc độ phát lại (0.75x, 1x, 1.25x, 1.5x).
   - Tải file âm thanh (.mp3, .wav) chất lượng cao về máy.

4. **Lịch Sử & Quản Lý Audio**:
   - Lưu trữ lịch sử các đoạn audio đã tạo trong phiên làm việc qua LocalStorage.
   - Nghe lại nhanh, sao chép văn bản, tải về hoặc xóa bỏ.

---

## 📁 Cấu Trúc Thư Mục Dự Án

```
├── app/
│   └── api/
│       ├── tts/
│       │   └── route.ts         # Route Handler Next.js 14 App Router cho Edge-TTS
│       └── clone/
│           └── route.ts         # Route Handler Gateway cho Voice Cloning
├── components/
│   ├── tts-generator.tsx        # Next.js component cho TTS
│   ├── voice-cloner.tsx         # Next.js component cho Voice Cloning
│   └── audio-player.tsx         # Next.js component cho Trình phát sóng âm
├── src/
│   ├── components/
│   │   ├── AudioPlayer.tsx      # Waveform canvas & playback controls
│   │   ├── TTSGenerator.tsx     # Form nhập văn bản & chọn giọng
│   │   ├── VoiceCloner.tsx      # Upload / Mic & clone pipeline
│   │   ├── AudioHistory.tsx     # Lịch sử và quản lý audio
│   │   └── DocsModal.tsx        # Hướng dẫn chi tiết & deploy
│   ├── types.ts                 # Định nghĩa TypeScript
│   ├── App.tsx                  # Giao diện chính Studio
│   └── index.css                # Tailwind CSS & animations
├── worker/
│   ├── app.py                   # FastAPI service cho F5-TTS / XTTS-v2
│   ├── Dockerfile               # Container GPU CUDA 12.1
│   ├── docker-compose.yml       # Docker Compose setup
│   └── requirements.txt         # Thư viện Python AI
├── server.ts                    # Full-Stack Express + Vite dev server
└── package.json
```

---

## 🛠 Hướng Dẫn Cài Đặt & Khởi Chạy

### 1. Khởi chạy Web Application (Next.js / Node.js)
```bash
# Cài đặt các thư viện
npm install

# Khởi chạy máy chủ phát triển
npm run dev
```
Mở trình duyệt tại `http://localhost:3000`.

### 2. Khởi chạy GPU Worker cho F5-TTS (Voice Cloning)

#### Cách 1: Sử dụng Docker Compose (Khuyên dùng)
```bash
cd worker
docker compose up -d --build
```
Kiểm tra logs container:
```bash
docker logs -f vietvoice-clone-worker
```

#### Cách 2: Chạy trực tiếp bằng Python
```bash
# Tạo môi trường ảo
python -m venv venv
source venv/bin/activate  # Trên Windows: venv\Scripts\activate

# Cài đặt PyTorch hỗ trợ CUDA
pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121

# Cài đặt F5-TTS và dependencies
pip install fastapi uvicorn python-multipart soundfile numpy f5-tts

# Chạy FastAPI worker
python worker/app.py
```
Worker sẽ khởi chạy tại `http://localhost:8000`. Tại giao diện web, nhấn nút **"Kiểm tra"** để kết nối!
