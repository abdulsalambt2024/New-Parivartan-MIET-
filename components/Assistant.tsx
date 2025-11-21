
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2, Bot, Mic, Volume2, VolumeX, Trash2 } from 'lucide-react';
import { geminiService } from '../services/geminiService';

const CHAT_STORAGE_KEY = 'parivartan_ai_chat_history';

export const Assistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load history from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse chat history", e);
        setMessages([{ role: 'model', text: 'Hi! I am your community assistant. How can I help you today?' }]);
      }
    } else {
      setMessages([{ role: 'model', text: 'Hi! I am your community assistant. How can I help you today?' }]);
    }
  }, []);

  // Save history to LocalStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Stop speaking when closed
  useEffect(() => {
    if (!isOpen) {
        stopSpeaking();
    }
  }, [isOpen]);

  const stopSpeaking = () => {
      if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
      }
  };

  const handleClearChat = () => {
    if (window.confirm("Are you sure you want to clear the chat history?")) {
      const defaultMsg: {role: 'model', text: string}[] = [{ role: 'model', text: 'Chat cleared. How can I help you now?' }];
      setMessages(defaultMsg);
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(defaultMsg));
      stopSpeaking();
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input;
    setInput('');
    
    // Optimistically add user message
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    // Format history for Gemini (exclude the message we just added optimistically if we were using state, 
    // but here 'messages' is stale inside this closure so it represents history perfectly)
    const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
    }));

    const response = await geminiService.chat(userMsg, history);
    
    setMessages(prev => [...prev, { role: 'model', text: response }]);
    setLoading(false);

    if (!isMuted) {
        speak(response);
    }
  };

  const speak = (text: string) => {
      if ('speechSynthesis' in window) {
          // Cancel any previous speech
          window.speechSynthesis.cancel();
          // Strip markdown asterisks for cleaner speech
          const cleanText = text.replace(/\*/g, '');
          const utterance = new SpeechSynthesisUtterance(cleanText);
          window.speechSynthesis.speak(utterance);
      }
  };

  const toggleMute = () => {
      if (!isMuted) {
          stopSpeaking();
      }
      setIsMuted(!isMuted);
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
        alert("Voice input is not supported in this browser.");
        return;
    }
    
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event: any) => {
        const speechResult = event.results[0][0].transcript;
        setInput(speechResult);
    };

    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-32 right-4 md:bottom-20 md:right-6 w-14 h-14 bg-black text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 z-40 ${isOpen ? 'scale-0' : 'scale-100'}`}
        title="AI Assistant"
      >
        <Bot size={28} />
      </button>

      {isOpen && (
        <div className="fixed bottom-32 right-4 md:bottom-20 md:right-6 w-full max-w-sm h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50 animate-fade-in-up overflow-hidden">
          {/* Header */}
          <div className="p-4 bg-gray-900 text-white flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Bot size={20} />
              <span className="font-semibold">AI Assistant</span>
            </div>
            <div className="flex items-center gap-3">
                <button onClick={handleClearChat} className="text-gray-300 hover:text-white" title="Clear History">
                    <Trash2 size={18} />
                </button>
                <button onClick={toggleMute} className="text-gray-300 hover:text-white" title={isMuted ? "Unmute" : "Mute"}>
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <button onClick={() => setIsOpen(false)} className="text-gray-300 hover:text-white">
                    <X size={20} />
                </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-xl text-sm relative group ${m.role === 'user' ? 'bg-primary text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm'}`}>
                  {/* Render with simple whitespace handling */}
                  <p className="whitespace-pre-wrap">{m.text}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                   <Loader2 size={16} className="animate-spin text-primary" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex gap-2 items-center">
            <button 
                type="button"
                onClick={startListening}
                className={`p-2 rounded-full transition ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'text-gray-500 hover:bg-gray-100'}`}
                title="Voice Input"
            >
                <Mic size={20} />
            </button>
            <input
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
              placeholder="Ask me anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button 
              type="submit" 
              disabled={loading}
              className="p-2 bg-primary text-white rounded-lg hover:bg-indigo-600 transition disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
