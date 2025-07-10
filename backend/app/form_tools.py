from typing import Dict, Any, Optional
import json
import asyncio
from datetime import datetime

class FormManager:
    def __init__(self):
        self.forms = {}
        self.current_form = None
        
    async def create_form(self, form_type: str = "default") -> Dict[str, Any]:
        """Create a new form"""
        form_id = f"form_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        form_schema = {
            "id": form_id,
            "type": form_type,
            "fields": {
                "name": {"value": "", "required": True, "type": "text"},
                "email": {"value": "", "required": True, "type": "email"},
                "phone": {"value": "", "required": False, "type": "tel"},
                "message": {"value": "", "required": False, "type": "textarea"}
            },
            "status": "active",
            "created_at": datetime.now().isoformat()
        }
        
        self.forms[form_id] = form_schema
        self.current_form = form_id
        return form_schema
    
    async def update_field(self, field_name: str, value: str) -> Dict[str, Any]:
        """Update a form field"""
        if not self.current_form:
            raise ValueError("No active form")
            
        form = self.forms.get(self.current_form)
        if not form:
            raise ValueError("Form not found")
            
        if field_name not in form["fields"]:
            raise ValueError(f"Field '{field_name}' not found")
            
        form["fields"][field_name]["value"] = value
        form["updated_at"] = datetime.now().isoformat()
        
        return form
    
    async def submit_form(self) -> Dict[str, Any]:
        """Submit the current form"""
        if not self.current_form:
            raise ValueError("No active form")
            
        form = self.forms.get(self.current_form)
        if not form:
            raise ValueError("Form not found")
            
        # Validate required fields
        errors = []
        for field_name, field_info in form["fields"].items():
            if field_info["required"] and not field_info["value"]:
                errors.append(f"{field_name} is required")
        
        if errors:
            return {"status": "error", "errors": errors}
        
        form["status"] = "submitted"
        form["submitted_at"] = datetime.now().isoformat()
        
        return {"status": "success", "form": form}
    
    def get_current_form(self) -> Optional[Dict[str, Any]]:
        """Get the current active form"""
        if self.current_form:
            return self.forms.get(self.current_form)
        return None

# Tool calling functions for Gemini
def get_form_tools():
    return [
        {
            "name": "open_form",
            "description": "Open a new form for the user to fill",
            "parameters": {
                "type": "object",
                "properties": {
                    "form_type": {
                        "type": "string",
                        "description": "Type of form to open",
                        "default": "default"
                    }
                }
            }
        },
        {
            "name": "update_form_field",
            "description": "Update a specific field in the form",
            "parameters": {
                "type": "object",
                "properties": {
                    "field_name": {
                        "type": "string",
                        "description": "Name of the field to update (name, email, phone, message)"
                    },
                    "value": {
                        "type": "string",
                        "description": "Value to set for the field"
                    }
                },
                "required": ["field_name", "value"]
            }
        },
        {
            "name": "submit_form",
            "description": "Submit the completed form",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    ]