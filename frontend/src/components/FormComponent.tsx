import React from 'react';
import { FormData } from '../lib/rtvi-client';

interface FormComponentProps {
  form: FormData | null;
  onReset: () => void;
}

export const FormComponent: React.FC<FormComponentProps> = ({ form, onReset }) => {
  if (!form) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Voice Form</h3>
        <p className="text-gray-600">Say "I want to fill a form" to get started</p>
      </div>
    );
  }
  
  const getFieldIcon = (type: string) => {
    switch (type) {
      case 'email': return '✉️';
      case 'tel': return '📞';
      case 'textarea': return '💬';
      default: return '👤';
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-green-100 text-green-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Voice Form</h3>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(form.status)}`}>
            {form.status.toUpperCase()}
          </span>
          <button
            onClick={onReset}
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            Reset
          </button>
        </div>
      </div>
      
      <div className="space-y-4">
        {Object.entries(form.fields).map(([fieldName, fieldInfo]) => (
          <div key={fieldName} className="border rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-lg">{getFieldIcon(fieldInfo.type)}</span>
              <label className="font-medium capitalize">
                {fieldName}
                {fieldInfo.required && <span className="text-red-500 ml-1">*</span>}
              </label>
            </div>
            
            <div className="bg-gray-50 p-2 rounded min-h-[40px] flex items-center">
              {fieldInfo.value ? (
                <span className="text-gray-800">{fieldInfo.value}</span>
              ) : (
                <span className="text-gray-400 italic">
                  Say your {fieldName} to fill this field
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {form.status === 'active' && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 <strong>Voice Commands:</strong>
          </p>
          <ul className="text-sm text-blue-700 mt-2 space-y-1">
            <li>• "My name is John Smith"</li>
            <li>• "My email is john@example.com"</li>
            <li>• "Submit the form"</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default FormComponent;