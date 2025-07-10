import asyncio
import json
import logging
from typing import Dict, Any, Optional
import websockets
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineTask
from pipecat.processors.aggregators.sentence import SentenceAggregator
from pipecat.services.gemini import GeminiLLMService
from pipecat.transports.network.websocket_server import WebsocketServerTransport
from pipecat.vad.silero import SileroVAD
from .form_tools import FormManager, get_form_tools
from .config import Config

logger = logging.getLogger(__name__)

class VoiceAgent:
    def __init__(self):
        self.config = Config()
        self.form_manager = FormManager()
        self.active_connections = {}
        
    async def handle_tool_call(self, tool_name: str, args: Dict[str, Any]) -> Dict[str, Any]:
        """Handle tool calling from Gemini"""
        try:
            if tool_name == "open_form":
                form = await self.form_manager.create_form(args.get("form_type", "default"))
                return {
                    "status": "success",
                    "message": "Form opened successfully. You can now provide your details.",
                    "form": form
                }
            
            elif tool_name == "update_form_field":
                field_name = args.get("field_name")
                value = args.get("value")
                
                if not field_name or value is None:
                    return {"status": "error", "message": "Field name and value are required"}
                
                form = await self.form_manager.update_field(field_name, value)
                return {
                    "status": "success",
                    "message": f"Updated {field_name} field successfully",
                    "form": form
                }
            
            elif tool_name == "submit_form":
                result = await self.form_manager.submit_form()
                if result["status"] == "success":
                    return {
                        "status": "success",
                        "message": "Form submitted successfully!",
                        "form": result["form"]
                    }
                else:
                    return {
                        "status": "error",
                        "message": f"Form validation failed: {', '.join(result['errors'])}",
                        "errors": result["errors"]
                    }
            
            else:
                return {"status": "error", "message": f"Unknown tool: {tool_name}"}
                
        except Exception as e:
            logger.error(f"Tool call error: {e}")
            return {"status": "error", "message": str(e)}
    
    async def create_pipeline(self, websocket_transport):
        """Create the Pipecat pipeline"""
        
        # Configure Gemini service
        gemini_service = GeminiLLMService(
            api_key=self.config.GEMINI_API_KEY,
            model="gemini-1.5-flash",
            tools=get_form_tools()
        )
        
        # Set up tool calling handler
        gemini_service.set_tool_handler(self.handle_tool_call)
        
        # Configure VAD for interruption
        vad = SileroVAD()
        
        # Create aggregators
        sentence_aggregator = SentenceAggregator()
        
        # Create pipeline
        pipeline = Pipeline([
            websocket_transport.input_processor(),
            vad,
            sentence_aggregator,
            gemini_service,
            websocket_transport.output_processor()
        ])
        
        return pipeline
    
    async def handle_connection(self, websocket):
        """Handle individual WebSocket connections"""
        connection_id = id(websocket)
        logger.info(f"New connection: {connection_id}")
        
        try:
            # Create transport for this connection
            transport = WebsocketServerTransport(
                websocket=websocket,
                audio_sample_rate=self.config.AUDIO_SAMPLE_RATE,
                audio_channels=1
            )
            
            # Create pipeline
            pipeline = await self.create_pipeline(transport)
            
            # Create and run pipeline task
            task = PipelineTask(pipeline)
            runner = PipelineRunner()
            
            self.active_connections[connection_id] = {
                "websocket": websocket,
                "transport": transport,
                "pipeline": pipeline,
                "task": task,
                "runner": runner
            }
            
            # Run the pipeline
            await runner.run(task)
            
        except Exception as e:
            logger.error(f"Connection error: {e}")
        finally:
            if connection_id in self.active_connections:
                del self.active_connections[connection_id]
            logger.info(f"Connection closed: {connection_id}")
    
    async def broadcast_form_update(self, form_data: Dict[str, Any]):
        """Broadcast form updates to all connected clients"""
        message = {
            "type": "form_update",
            "data": form_data
        }
        
        for connection in self.active_connections.values():
            try:
                await connection["websocket"].send(json.dumps(message))
            except:
                pass  # Connection may be closed
    
    def get_form_status(self) -> Optional[Dict[str, Any]]:
        """Get current form status"""
        return self.form_manager.get_current_form()