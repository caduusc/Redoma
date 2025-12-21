
import React, { useEffect, useRef } from 'react';
import { Message } from '../types';

interface MessageListProps {
  messages: Message[];
  currentType: 'client' | 'agent';
}

const MessageList: React.FC<MessageListProps> = ({ messages, currentType }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-slate-300 space-y-3">
          <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
             <div className="w-1.5 h-1.5 bg-slate-200 rounded-full animate-bounce" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Aguardando mensagens...</p>
        </div>
      ) : (
        messages.map((msg) => {
          const isOwn = msg.senderType === currentType;
          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] px-5 py-3 rounded-2xl text-sm leading-relaxed ${
                  isOwn
                    ? 'bg-redoma-steel text-white rounded-tr-none shadow-lg shadow-redoma-steel/10'
                    : 'bg-slate-50 text-slate-700 border border-slate-100 rounded-tl-none'
                }`}
              >
                <p>{msg.text}</p>
                <span className={`text-[10px] mt-2 block font-bold ${isOwn ? 'text-white/60' : 'text-slate-400'}`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default MessageList;
