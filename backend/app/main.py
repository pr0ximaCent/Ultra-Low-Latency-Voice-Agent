import asyncio
import logging
from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from .simple_voice_agent import SimpleVoiceAgent
from .config import Config

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Ultra-Low Latency Voice Agent")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize voice agent
voice_agent = SimpleVoiceAgent()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for voice communication"""
    await voice_agent.handle_connection(websocket)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "voice-agent"}

@app.get("/form/status")
async def get_form_status():
    """Get current form status"""
    form = voice_agent.get_form_status()
    if form:
        return {"status": "success", "form": form}
    return {"status": "no_active_form"}

@app.post("/form/reset")
async def reset_form():
    """Reset the current form"""
    voice_agent.form_manager.current_form = None
    return {"status": "success", "message": "Form reset"}

if __name__ == "__main__":
    config = Config()
    uvicorn.run(
        "app.main:app",
        host=config.HOST,
        port=config.PORT,
        log_level="info",
        reload=True
    )