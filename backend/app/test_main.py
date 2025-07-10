import asyncio
import json
import logging
from typing import Dict, Any, Optional
import websockets
from fastapi import WebSocket
from .form_tools import FormManager, get_form_tools
from .config import Config

logger = logging.getLogger(__name__)

class SimpleVoiceAgent:
    def __init__(self):
        self.config = Config()
        self.form_manager = FormManager()
        self.active_connections = {}
        
    async def handle_tool_call(self, tool_name: str, args: Dict[str, Any]) -> Dict[str, Any]:
        """Handle tool calling"""
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
    
    async def handle_connection(self, websocket: WebSocket):
        """Handle individual WebSocket connections"""
        connection_id = id(websocket)
        logger.info(f"New connection: {connection_id}")
        
        try:
            await websocket.accept()
            self.active_connections[connection_id] = websocket
            
            while True:
                # Wait for messages
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Handle different message types
                if message.get("type") == "tool_call":
                    result = await self.handle_tool_call(
                        message.get("tool"),
                        message.get("args", {})
                    )
                    await websocket.send_text(json.dumps(result))
                
                elif message.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
                
                else:
                    # Echo back for now
                    await websocket.send_text(json.dumps({
                        "type": "echo",
                        "data": message
                    }))
                    
        except Exception as e:
            logger.error(f"Connection error: {e}")
        finally:
            if connection_id in self.active_connections:
                del self.active_connections[connection_id]
            logger.info(f"Connection closed: {connection_id}")
    
    def get_form_status(self) -> Optional[Dict[str, Any]]:
        """Get current form status"""
        return self.form_manager.get_current_form()