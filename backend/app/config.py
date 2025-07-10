import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", 8000))
    
    # Performance settings
    MAX_LATENCY_MS = 500
    AUDIO_SAMPLE_RATE = 16000
    AUDIO_CHUNK_SIZE = 1024