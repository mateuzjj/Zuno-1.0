import React, { useState } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

interface SmartBarProps {
  onSearch: (text: string) => void;
  isProcessing: boolean;
}

const SmartBar: React.FC<SmartBarProps> = ({ onSearch, isProcessing }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSearch(input);
      setInput('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-2xl">
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full opacity-30 group-hover:opacity-75 transition duration-500 blur"></div>
        <div className="relative flex items-center bg-zinc-900 border border-zinc-800 rounded-full px-4 py-3 shadow-xl">
            <Sparkles className={`w-5 h-5 mr-3 ${isProcessing ? 'text-indigo-400 animate-pulse' : 'text-zinc-500'}`} />
            <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isProcessing ? "ZUNO is thinking..." : "Ask ZUNO (e.g., 'I need energy for gym', 'Late night coding')"}
                className="flex-1 bg-transparent border-none outline-none text-white placeholder-zinc-500 text-sm"
                disabled={isProcessing}
            />
            <button 
                type="submit"
                disabled={!input.trim() || isProcessing}
                className="ml-2 p-1.5 bg-zinc-800 text-zinc-400 rounded-full hover:bg-white hover:text-black transition-all disabled:opacity-50 disabled:hover:bg-zinc-800 disabled:hover:text-zinc-400"
            >
                <ArrowRight size={16} />
            </button>
        </div>
      </div>
    </form>
  );
};

export default SmartBar;