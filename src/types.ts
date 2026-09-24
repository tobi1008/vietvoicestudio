export interface VoiceOption {
  id: string;
  name: string;
  gender: 'Female' | 'Male';
  region?: string;
  recommendedFor?: string;
  sampleText?: string;
  isNeural?: boolean;
  isBrowser?: boolean;
}

export interface AudioItem {
  id: string;
  title: string;
  text: string;
  voiceName: string;
  source: 'edge-tts' | 'web-speech' | 'voice-cloner';
  audioUrl: string;
  duration?: number;
  createdAt: number;
  fileSize?: string;
  mimeType: string;
  cloneDetails?: {
    engine: string;
    sampleName?: string;
    refText?: string;
  };
}

export interface TTSRequestOptions {
  text: string;
  voice: string;
  rate: number;
  pitch: number;
  volume: number;
  engine: 'edge' | 'browser';
}

export interface VoiceCloneRequestOptions {
  audioBlob: Blob;
  fileName: string;
  refText: string;
  genText: string;
  speed: number;
  genderHint: 'auto' | 'female' | 'male';
  workerUrl: string;
}
