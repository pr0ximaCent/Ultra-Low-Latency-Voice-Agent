# Ultra-Low Latency AI Voice Agent

A real-time conversational AI system achieving sub-500ms voice-to-voice communication with voice-controlled form filling.

## 🚀 Features

- **Ultra-low latency** (<500ms voice-to-voice)
- **Real-time audio streaming** (no STT/TTS overhead)
- **Voice-controlled form filling**
- **Natural conversation flow** with interruption support
- **Performance monitoring** and metrics

## 🛠️ Tech Stack

- **Backend**: FastAPI + Pipecat + Gemini Live API
- **Frontend**: Next.js + TypeScript + Tailwind CSS
- **Communication**: WebSocket with RTVI protocol
- **Deployment**: Docker + Docker Compose

## 📋 Prerequisites

- Node.js 18+
- Python 3.11+
- Docker & Docker Compose
- Gemini API Key from Google AI Studio

## 🚀 Quick Start

### 1. Clone and Setup

```bash
git clone <your-repo>
cd voice-agent