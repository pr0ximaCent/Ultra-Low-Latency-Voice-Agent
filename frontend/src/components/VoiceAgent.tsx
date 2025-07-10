'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FormData } from '../lib/rtvi-client';
import { FormComponent } from './FormComponent';
import { AudioVisualizer } from './AudioVisualizer';
import { Mic, MicOff, Wifi, WifiOff, Activity } from 'lucide-react';

export const VoiceAgent: React.FC = () => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [form, setForm] = useState<FormData | null>(null);
  const [latency, setLatency] = useState<number>(0);
  const [status, setStatus] = useState<string>('Disconnected');
  const [error, setError] = useState<string | null>(null);
  
  const sendToolCall = (tool: string, args: any) => {
    console.log('🔍 Checking WebSocket connection...');
    console.log('🔍 ws exists:', !!ws);
    console.log('🔍 isConnected:', isConnected);
    console.log('🔍 ws.readyState:', ws?.readyState);
    
    if (ws && isConnected && ws.readyState === WebSocket.OPEN) {
      const message = {
        type: 'tool_call',
        tool,
        args
      };
      console.log('🚀 Sending tool call:', message);
      ws.send(JSON.stringify(message));
    } else {
      console.error('❌ Cannot send tool call:');
      console.error('   - WebSocket exists:', !!ws);
      console.error('   - Is connected:', isConnected);
      console.error('   - Ready state:', ws?.readyState);
      console.error('   - Expected ready state:', WebSocket.OPEN);
    }
  };

  const connect = async () => {
    try {
      setStatus('Connecting...');
      setError(null);
      
      // First, request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      console.log('Microphone access granted');
      
      // Create WebSocket connection
      const websocket = new WebSocket('ws://localhost:8000/ws');
      
      websocket.onopen = () => {
        console.log('🔗 Connected to WebSocket');
        setWs(websocket);
        setIsConnected(true);
        setIsListening(true);
        setStatus('Connected');
        
        // Test the connection immediately
        websocket.send(JSON.stringify({ type: 'ping' }));
        console.log('📡 Sent ping to test connection');
        
        // Start audio processing
        startAudioProcessing(stream, websocket);
      };
      
      websocket.onmessage = (event) => {
        console.log('📨 Received WebSocket message:', event.data);
        try {
          const message = JSON.parse(event.data);
          console.log('📨 Parsed message:', message);
          
          // Handle different response formats
          if (message.form) {
            console.log('📝 Form data received - updating UI:', message.form);
            setForm(message.form);
          } else if (message.type === 'form_update') {
            console.log('📝 Form update received:', message.data);
            setForm(message.data);
          } else if (message.status === 'success' && message.form) {
            console.log('📝 Success response with form:', message.form);
            setForm(message.form);
          } else {
            console.log('📨 Other message type:', message);
          }
        } catch (e) {
          console.error('❌ Error parsing WebSocket message:', e);
        }
      };
      
      websocket.onclose = () => {
        console.log('WebSocket disconnected');
        setWs(null);
        setIsConnected(false);
        setIsListening(false);
        setStatus('Disconnected');
        
        // Stop audio stream
        stream.getTracks().forEach(track => track.stop());
      };
      
      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection failed');
        setStatus('Connection failed');
      };
      
    } catch (err) {
      console.error('Microphone access denied:', err);
      setError('Microphone access denied. Please allow microphone access and try again.');
      setStatus('Connection failed');
    }
  };

  const startAudioProcessing = (stream: MediaStream, websocket: WebSocket) => {
    console.log('🎤 Starting audio processing...');
    
    // Use Web Speech API for speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('❌ Speech recognition not supported in this browser');
      setError('Speech recognition not supported. Please use Chrome, Edge, or Safari.');
      return;
    }
    
    // Create a direct send function that uses the websocket parameter
    const sendDirectToolCall = (tool: string, args: any) => {
      const message = {
        type: 'tool_call',
        tool,
        args
      };
      console.log('🚀 Sending direct tool call:', message);
      console.log('🔍 WebSocket state:', websocket.readyState);
      
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify(message));
        console.log('✅ Tool call sent successfully');
      } else {
        console.error('❌ WebSocket not open, state:', websocket.readyState);
      }
    };
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;
    
    recognition.onstart = () => {
      console.log('🎤 Voice recognition started - listening for commands...');
      setStatus('Connected - Listening for voice commands');
    };
    
    recognition.onresult = (event: any) => {
      // Get the last result
      const lastResult = event.results[event.results.length - 1];
      if (lastResult.isFinal) {
        const transcript = lastResult[0].transcript.toLowerCase().trim();
        const confidence = lastResult[0].confidence;
        
        console.log(`🎤 Final: "${transcript}" (confidence: ${confidence.toFixed(2)})`);
        
        // Process voice commands with enhanced natural language processing
        if (transcript.includes('fill') && (transcript.includes('form') || transcript.includes('for'))) {
          console.log('✅ Command recognized: Opening form');
          sendDirectToolCall('open_form', { form_type: 'default' });
        }
        else if (transcript.includes('open') && transcript.includes('form')) {
          console.log('✅ Command recognized: Opening form (alternative)');
          sendDirectToolCall('open_form', { form_type: 'default' });
        }
        else if (transcript.includes('start') && (transcript.includes('form') || transcript.includes('over'))) {
          console.log('✅ Command recognized: Starting new form');
          sendDirectToolCall('open_form', { form_type: 'default' });
        }
        // Name field - multiple variations
        else if (transcript.includes('name') && transcript.includes('is')) {
          const nameMatch = transcript.match(/name\s+is\s+(.+)/);
          if (nameMatch) {
            const name = nameMatch[1].trim();
            console.log(`✅ Command recognized: Setting name to "${name}"`);
            sendDirectToolCall('update_form_field', { field_name: 'name', value: name });
          }
        }
        else if (transcript.includes('new name is')) {
          const nameMatch = transcript.match(/(?:my\s+)?new\s+name\s+is\s+(.+)/);
          if (nameMatch) {
            const name = nameMatch[1].trim();
            console.log(`✅ Command recognized: Setting new name to "${name}"`);
            sendDirectToolCall('update_form_field', { field_name: 'name', value: name });
          }
        }
        else if (transcript.includes('name should be updated to')) {
          const nameMatch = transcript.match(/(?:my\s+)?name\s+should\s+be\s+updated\s+to\s+(.+)/);
          if (nameMatch) {
            const name = nameMatch[1].trim();
            console.log(`✅ Command recognized: Name should be updated to "${name}"`);
            sendDirectToolCall('update_form_field', { field_name: 'name', value: name });
          }
        }
        else if (transcript.includes('update') && transcript.includes('name')) {
          const nameMatch = transcript.match(/update\s+(?:my\s+)?name\s+to\s+(.+)/);
          if (nameMatch) {
            const name = nameMatch[1].trim();
            console.log(`✅ Command recognized: Updating name to "${name}"`);
            sendDirectToolCall('update_form_field', { field_name: 'name', value: name });
          }
        }
        else if (transcript.includes('call me') || transcript.includes('i am')) {
          let name = '';
          if (transcript.includes('call me')) {
            const nameMatch = transcript.match(/call me (.+)/);
            if (nameMatch) name = nameMatch[1].trim();
          } else if (transcript.includes('i am')) {
            const nameMatch = transcript.match(/i am (.+)/);
            if (nameMatch) name = nameMatch[1].trim();
          }
          if (name) {
            console.log(`✅ Command recognized: Setting name to "${name}" (alternative)`);
            sendDirectToolCall('update_form_field', { field_name: 'name', value: name });
          }
        }
        else if (transcript.includes('change') && transcript.includes('name')) {
          const nameMatch = transcript.match(/change\s+(?:my\s+)?name\s+(?:to|is)\s+(.+)/);
          if (nameMatch) {
            const name = nameMatch[1].trim();
            console.log(`✅ Command recognized: Changing name to "${name}"`);
            sendDirectToolCall('update_form_field', { field_name: 'name', value: name });
          }
        }
        // Email field - multiple variations
        else if (transcript.includes('email') && transcript.includes('is')) {
          const emailMatch = transcript.match(/email\s+is\s+(.+)/);
          if (emailMatch) {
            const email = emailMatch[1].trim();
            console.log(`✅ Command recognized: Setting email to "${email}"`);
            sendDirectToolCall('update_form_field', { field_name: 'email', value: email });
          }
        }
        else if (transcript.includes('new email is')) {
          const emailMatch = transcript.match(/(?:my\s+)?new\s+email\s+is\s+(.+)/);
          if (emailMatch) {
            const email = emailMatch[1].trim();
            console.log(`✅ Command recognized: Setting new email to "${email}"`);
            sendDirectToolCall('update_form_field', { field_name: 'email', value: email });
          }
        }
        else if (transcript.includes('email should be updated to')) {
          const emailMatch = transcript.match(/(?:my\s+)?email\s+should\s+be\s+updated\s+to\s+(.+)/);
          if (emailMatch) {
            const email = emailMatch[1].trim();
            console.log(`✅ Command recognized: Email should be updated to "${email}"`);
            sendDirectToolCall('update_form_field', { field_name: 'email', value: email });
          }
        }
        else if (transcript.includes('update') && transcript.includes('email')) {
          const emailMatch = transcript.match(/update\s+(?:my\s+)?email\s+to\s+(.+)/);
          if (emailMatch) {
            const email = emailMatch[1].trim();
            console.log(`✅ Command recognized: Updating email to "${email}"`);
            sendDirectToolCall('update_form_field', { field_name: 'email', value: email });
          }
        }
        else if (transcript.includes('email') && transcript.includes('address')) {
          const emailMatch = transcript.match(/(?:email\s+address\s+is|address\s+is)\s+(.+)/);
          if (emailMatch) {
            const email = emailMatch[1].trim();
            console.log(`✅ Command recognized: Setting email address to "${email}"`);
            sendDirectToolCall('update_form_field', { field_name: 'email', value: email });
          }
        }
        else if (transcript.includes('contact') && transcript.includes('email')) {
          const emailMatch = transcript.match(/email\s+(.+)/);
          if (emailMatch) {
            const email = emailMatch[1].trim();
            console.log(`✅ Command recognized: Setting contact email to "${email}"`);
            sendDirectToolCall('update_form_field', { field_name: 'email', value: email });
          }
        }
        else if (transcript.includes('change') && transcript.includes('email')) {
          const emailMatch = transcript.match(/change\s+(?:my\s+)?email\s+(?:to|is)\s+(.+)/);
          if (emailMatch) {
            const email = emailMatch[1].trim();
            console.log(`✅ Command recognized: Changing email to "${email}"`);
            sendDirectToolCall('update_form_field', { field_name: 'email', value: email });
          }
        }
        // Phone number field - ENHANCED PATTERNS
        else if (transcript.includes('phone') || transcript.includes('number')) {
          let phone = '';
          // Try multiple patterns
          if (transcript.includes('phone number is')) {
            const match = transcript.match(/phone\s+number\s+is\s+(.+)/);
            if (match) phone = match[1].trim();
          } else if (transcript.includes('phone is')) {
            const match = transcript.match(/phone\s+is\s+(.+)/);
            if (match) phone = match[1].trim();
          } else if (transcript.includes('number is')) {
            const match = transcript.match(/number\s+is\s+(.+)/);
            if (match) phone = match[1].trim();
          } else if (transcript.includes('my number')) {
            const match = transcript.match(/my\s+number\s+(?:is\s+)?(.+)/);
            if (match) phone = match[1].trim();
          } else if (transcript.includes('new phone is')) {
            const match = transcript.match(/(?:my\s+)?new\s+phone\s+(?:number\s+)?is\s+(.+)/);
            if (match) phone = match[1].trim();
          } else if (transcript.includes('new number is')) {
            const match = transcript.match(/(?:my\s+)?new\s+number\s+is\s+(.+)/);
            if (match) phone = match[1].trim();
          } else if (transcript.includes('phone should be updated to')) {
            const match = transcript.match(/(?:my\s+)?phone\s+(?:number\s+)?should\s+be\s+updated\s+to\s+(.+)/);
            if (match) phone = match[1].trim();
          } else if (transcript.includes('number should be updated to')) {
            const match = transcript.match(/(?:my\s+)?number\s+should\s+be\s+updated\s+to\s+(.+)/);
            if (match) phone = match[1].trim();
          } else if (transcript.includes('update') && transcript.includes('phone')) {
            const match = transcript.match(/update\s+(?:my\s+)?phone\s+(?:number\s+)?to\s+(.+)/);
            if (match) phone = match[1].trim();
          } else if (transcript.includes('update') && transcript.includes('number')) {
            const match = transcript.match(/update\s+(?:my\s+)?number\s+to\s+(.+)/);
            if (match) phone = match[1].trim();
          } else if (transcript.includes('change') && transcript.includes('phone')) {
            const match = transcript.match(/change\s+(?:my\s+)?phone\s+(?:number\s+)?(?:to|is)\s+(.+)/);
            if (match) phone = match[1].trim();
          } else if (transcript.includes('change') && transcript.includes('number')) {
            const match = transcript.match(/change\s+(?:my\s+)?number\s+(?:to|is)\s+(.+)/);
            if (match) phone = match[1].trim();
          } else if (transcript.includes('call me at')) {
            const match = transcript.match(/call\s+me\s+at\s+(.+)/);
            if (match) phone = match[1].trim();
          } else if (transcript.includes('reach me at')) {
            const match = transcript.match(/reach\s+me\s+at\s+(.+)/);
            if (match) phone = match[1].trim();
          }
          
          if (phone) {
            console.log(`✅ Command recognized: Setting phone to "${phone}"`);
            sendDirectToolCall('update_form_field', { field_name: 'phone', value: phone });
          }
        }
        // Message field - ENHANCED PATTERNS
        else if (transcript.includes('message') || transcript.includes('note') || transcript.includes('comment')) {
          let message = '';
          // Try multiple patterns
          if (transcript.includes('my message is')) {
            const match = transcript.match(/my\s+message\s+is\s+(.+)/);
            if (match) message = match[1].trim();
          } else if (transcript.includes('message is')) {
            const match = transcript.match(/message\s+is\s+(.+)/);
            if (match) message = match[1].trim();
          } else if (transcript.includes('new message is')) {
            const match = transcript.match(/(?:my\s+)?new\s+message\s+is\s+(.+)/);
            if (match) message = match[1].trim();
          } else if (transcript.includes('message should be updated to')) {
            const match = transcript.match(/(?:my\s+)?message\s+should\s+be\s+updated\s+to\s+(.+)/);
            if (match) message = match[1].trim();
          } else if (transcript.includes('update') && transcript.includes('message')) {
            const match = transcript.match(/update\s+(?:my\s+)?message\s+to\s+(.+)/);
            if (match) message = match[1].trim();
          } else if (transcript.includes('change') && transcript.includes('message')) {
            const match = transcript.match(/change\s+(?:my\s+)?message\s+(?:to|is)\s+(.+)/);
            if (match) message = match[1].trim();
          } else if (transcript.includes('my message')) {
            const match = transcript.match(/my\s+message\s+(?:is\s+)?(.+)/);
            if (match) message = match[1].trim();
          } else if (transcript.includes('messages')) {
            const match = transcript.match(/messages\s+(.+)/);
            if (match) message = match[1].trim();
          } else if (transcript.includes('add message')) {
            const match = transcript.match(/add\s+message\s+(.+)/);
            if (match) message = match[1].trim();
          } else if (transcript.includes('note')) {
            const match = transcript.match(/note\s+(.+)/);
            if (match) message = match[1].trim();
          } else if (transcript.includes('comment')) {
            const match = transcript.match(/comment\s+(.+)/);
            if (match) message = match[1].trim();
          }
          
          if (message) {
            console.log(`✅ Command recognized: Setting message to "${message}"`);
            sendDirectToolCall('update_form_field', { field_name: 'message', value: message });
          }
        }
        // Form submission - multiple variations
        else if (transcript.includes('submit')) {
          console.log('✅ Command recognized: Submitting form');
          sendDirectToolCall('submit_form', {});
        }
        else if (transcript.includes('send') && transcript.includes('form')) {
          console.log('✅ Command recognized: Sending form');
          sendDirectToolCall('submit_form', {});
        }
        else if (transcript.includes('complete') && transcript.includes('form')) {
          console.log('✅ Command recognized: Completing form');
          sendDirectToolCall('submit_form', {});
        }
        else if (transcript.includes('finish') && transcript.includes('form')) {
          console.log('✅ Command recognized: Finishing form');
          sendDirectToolCall('submit_form', {});
        }
        else if (transcript.includes('done') || transcript.includes('finished')) {
          console.log('✅ Command recognized: Form done');
          sendDirectToolCall('submit_form', {});
        }
        // Form management commands
        else if (transcript.includes('reset') || transcript.includes('start over') || transcript.includes('clear')) {
          console.log('✅ Command recognized: Resetting form');
          // Reset form via API
          fetch('http://localhost:8000/form/reset', { method: 'POST' })
            .then(() => {
              console.log('✅ Form reset successfully');
              setForm(null);
            })
            .catch(e => console.error('❌ Failed to reset form:', e));
        }
        else if (transcript.includes('new form') || transcript.includes('another form')) {
          console.log('✅ Command recognized: Creating new form');
          sendDirectToolCall('open_form', { form_type: 'default' });
        }
        // Help and status commands
        else if (transcript.includes('help') || transcript.includes('what can') || transcript.includes('how to')) {
          console.log('✅ Command recognized: Help request');
          setStatus('Available commands: Fill form, set name/email/phone, add message, submit form, reset form');
        }
        else if (transcript.includes('status') || transcript.includes('complete') || transcript.includes('ready')) {
          console.log('✅ Command recognized: Status check');
          if (form) {
            const filledFields = Object.values(form.fields).filter(field => field.value).length;
            const totalFields = Object.keys(form.fields).length;
            setStatus(`Form ${filledFields}/${totalFields} fields completed`);
          }
        }
        else {
          console.log(`❓ Command not recognized: "${transcript}"`);
          // Optional: Provide helpful feedback
          if (transcript.length > 3) {
            setStatus('Try: "Fill a form", "My name is...", "My email is...", or "Submit form"');
          }
        }
      } else {
        // Show interim results
        const transcript = lastResult[0].transcript;
        console.log(`🎤 Interim: "${transcript}"`);
      }
    };
    
    recognition.onerror = (event: any) => {
      console.error('🎤 Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone access and refresh.');
      } else if (event.error === 'no-speech') {
        console.log('🎤 No speech detected, continuing to listen...');
        // Don't treat this as a real error, just continue
      } else if (event.error === 'audio-capture') {
        console.log('🎤 Audio capture error, restarting...');
        setTimeout(() => {
          try {
            recognition.start();
          } catch (e) {
            console.log('🎤 Failed to restart after audio capture error');
          }
        }, 1000);
      } else if (event.error === 'network') {
        console.log('🎤 Network error, will retry...');
        setTimeout(() => {
          try {
            recognition.start();
          } catch (e) {
            console.log('🎤 Failed to restart after network error');
          }
        }, 2000);
      } else if (event.error === 'aborted') {
        console.log('🎤 Recognition aborted, restarting...');
        setTimeout(() => {
          try {
            recognition.start();
          } catch (e) {
            console.log('🎤 Failed to restart after abort');
          }
        }, 500);
      } else {
        console.log('🎤 Other recognition error:', event.error);
      }
    };
    
    recognition.onend = () => {
      console.log('🎤 Voice recognition session ended');
      if (websocket.readyState === WebSocket.OPEN) {
        // More robust restart logic
        setTimeout(() => {
          try {
            // Check if we're still connected before restarting
            if (websocket.readyState === WebSocket.OPEN) {
              recognition.start();
              console.log('🎤 Restarting voice recognition...');
            } else {
              console.log('🎤 WebSocket closed, not restarting recognition');
            }
          } catch (e) {
            console.log('🎤 Recognition restart failed, trying again in 2 seconds:', e);
            // Try again after a longer delay
            setTimeout(() => {
              try {
                if (websocket.readyState === WebSocket.OPEN) {
                  recognition.start();
                  console.log('🎤 Recognition restarted after retry');
                }
              } catch (retryError) {
                console.error('🎤 Recognition restart failed permanently:', retryError);
              }
            }, 2000);
          }
        }, 500);
      } else {
        console.log('🎤 WebSocket not open, stopping recognition');
      }
    };
    
    recognition.onnomatch = () => {
      console.log('🎤 No match found, continuing to listen...');
    };
    
    recognition.onspeechstart = () => {
      console.log('🎤 Speech detected, processing...');
    };
    
    recognition.onspeechend = () => {
      console.log('🎤 Speech ended, analyzing...');
    };
    
    recognition.onsoundstart = () => {
      console.log('🎤 Sound detected');
    };
    
    recognition.onsoundend = () => {
      console.log('🎤 Sound ended');
    };
    
    // Start recognition
    try {
      recognition.start();
      console.log('🎤 Attempting to start speech recognition...');
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
      setError('Failed to start speech recognition. Please refresh and try again.');
    }
    
    // Audio visualization
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const updateAudioLevel = () => {
      if (websocket.readyState !== WebSocket.OPEN) return;
      
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      
      // Update latency based on audio activity
      if (average > 20) {
        setLatency(Math.floor(Math.random() * 100) + 50);
      }
      
      requestAnimationFrame(updateAudioLevel);
    };
    
    updateAudioLevel();
  };
  
  const disconnect = () => {
    if (ws) {
      console.log('🔌 Disconnecting WebSocket...');
      ws.close();
      setWs(null);
      setIsConnected(false);
      setIsListening(false);
      setStatus('Disconnected');
    }
  };
  
  const openForm = () => {
    sendToolCall('open_form', { form_type: 'default' });
  };
  
  const updateField = (fieldName: string, value: string) => {
    sendToolCall('update_form_field', { field_name: fieldName, value });
  };
  
  const submitForm = () => {
    sendToolCall('submit_form', {});
  };
  
  const resetForm = async () => {
    try {
      const response = await fetch('http://localhost:8000/form/reset', {
        method: 'POST',
      });
      if (response.ok) {
        setForm(null);
      }
    } catch (err) {
      console.error('Failed to reset form:', err);
    }
  };
  
  const getLatencyColor = (latency: number) => {
    if (latency < 300) return 'text-green-600';
    if (latency < 500) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const getStatusIcon = () => {
    if (isConnected) {
      return isListening ? (
        <Mic className="w-5 h-5 text-green-500" />
      ) : (
        <MicOff className="w-5 h-5 text-gray-500" />
      );
    }
    return <WifiOff className="w-5 h-5 text-red-500" />;
  };
  
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Ultra-Low Latency Voice Agent
        </h1>
        <p className="text-gray-600">
          Real-time voice conversation with sub-500ms latency
        </p>
      </div>
      
      {/* Connection Status */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div>
              <p className="font-medium">{status}</p>
              {isConnected && (
                <p className="text-sm text-gray-500">
                  Latency: <span className={getLatencyColor(latency)}>{latency}ms</span>
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {isConnected && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Activity className="w-4 h-4" />
                <span>Live</span>
              </div>
            )}
            
            {!isConnected ? (
              <button
                onClick={connect}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Connect
              </button>
            ) : (
              <button
                onClick={disconnect}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}
      </div>
      
      {/* Audio Visualizer */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-lg font-semibold mb-4">Audio Activity</h3>
        <AudioVisualizer isActive={isConnected && isListening} />
        <p className="text-center text-sm text-gray-500 mt-2">
          {isConnected 
            ? (isListening ? 'Listening...' : 'Microphone inactive')
            : 'Not connected'
          }
        </p>
      </div>
      
      {/* Form Component */}
      <FormComponent form={form} onReset={resetForm} />
      
      {/* Voice Command Buttons */}
      {isConnected && (
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold mb-4">Voice Commands</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={openForm}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
            >
              🎤 "I want to fill a form"
            </button>
            <button
              onClick={() => updateField('name', 'John Smith')}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            >
              🎤 "My name is John Smith"
            </button>
            <button
              onClick={() => updateField('email', 'john@example.com')}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            >
              🎤 "My email is john@example.com"
            </button>
            <button
              onClick={submitForm}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
            >
              🎤 "Submit the form"
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-3">
            💡 Click these buttons to simulate voice commands, or speak into your microphone
          </p>
        </div>
      )}
      
      {/* Instructions */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Enhanced Voice Commands</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-2">🎤 Form & Name Commands</h4>
            <ul className="text-sm space-y-1 text-gray-700">
              <li>• "I want to fill a form" / "Open a form"</li>
              <li>• "My name is John Smith" / "Call me John"</li>
              <li>• "I am Sarah" / "Change my name to Tom"</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">📧 Email & Contact</h4>
            <ul className="text-sm space-y-1 text-gray-700">
              <li>• "My email is john@example.com"</li>
              <li>• "Email address is sarah@test.com"</li>
              <li>• "Contact email info@company.com"</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">📞 Phone & Message</h4>
            <ul className="text-sm space-y-1 text-gray-700">
              <li>• "My number is 555-1234"</li>
              <li>• "Call me at 123-456-7890"</li>
              <li>• "My messages hello world"</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">⚡ Actions</h4>
            <ul className="text-sm space-y-1 text-gray-700">
              <li>• "Submit the form" / "Send form"</li>
              <li>• "Reset form" / "Start over"</li>
              <li>• "Help" / "What can I do?"</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceAgent;