
import React, { useState } from 'react';
import { Send } from 'lucide-react';

interface MessageInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSend, disabled }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && !disabled) {
      onSend(text);
      setText('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-slate-100 flex gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={disabled ? "Conversa encerrada" : "O que você precisa?"}
        disabled={disabled}
        className="flex-1 px-5 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-redoma-steel focus:border-transparent disabled:bg-slate-50 disabled:cursor-not-allowed transition-all text-sm"
      />
      <button
        type="submit"
        disabled={!text.trim() || disabled}
        className="w-12 h-12 flex items-center justify-center bg-redoma-dark text-white rounded-2xl hover:bg-redoma-navy transition-all disabled:bg-slate-200 shadow-lg shadow-redoma-dark/10"
      >
        <Send size={20} />
      </button>
    </form>
  );
};

export default MessageInput;
