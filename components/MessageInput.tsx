import React, { useRef, useState } from 'react';
import { Send, Paperclip } from 'lucide-react';

interface MessageInputProps {
  onSend: (text: string) => void | Promise<void>;
  onSendImage?: (file: File) => void | Promise<void>;
  disabled?: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSend, onSendImage, disabled }) => {
  const [text, setText] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;

    await onSend(trimmed);
    setText('');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onSendImage || disabled) return;

    await onSendImage(file);
    e.target.value = ''; // reseta o input pra poder enviar o mesmo arquivo depois se quiser
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 bg-white border-t border-slate-100 flex gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]"
    >
      {/* Botão de anexar imagem */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => fileInputRef.current?.click()}
        className="w-12 h-12 flex items-center justify-center rounded-2xl border border-slate-200 text-slate-400 hover:border-redoma-dark/40 hover:text-redoma-dark disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        title="Anexar imagem"
      >
        <Paperclip size={20} />
      </button>

      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={disabled ? 'Conversa encerrada' : 'O que você precisa?'}
        disabled={disabled}
        className="flex-1 px-5 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-redoma-steel focus:border-transparent disabled:bg-slate-50 disabled:cursor-not-allowed transition-all text-sm"
      />

      <button
        type="submit"
        disabled={!text.trim() || disabled}
        className="w-12 h-12 flex items-center justify-center bg-redoma-dark text-white rounded-2xl hover:bg-redoma-navy transition-all disabled:bg-slate-200 disabled:cursor-not-allowed shadow-lg shadow-redoma-dark/10"
      >
        <Send size={20} />
      </button>

      {/* input real de arquivo (escondido) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </form>
  );
};

export default MessageInput;
