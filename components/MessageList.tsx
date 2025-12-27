import React, { useEffect, useRef } from 'react';
import { Message, Conversation } from '../types';

interface MessageListProps {
  messages: Message[];
  currentType: 'client' | 'agent';
  conversation?: Conversation;
}

const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

const renderTextWithLinks = (text: string) => {
  return text.split(urlRegex).map((part, index) => {
    if (part.match(urlRegex)) {
      const href = part.startsWith('http') ? part : `https://${part}`;
      return (
        <a
          key={index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-sky-300 hover:text-sky-200 break-all"
        >
          {part}
        </a>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

const MessageList: React.FC<MessageListProps> = ({ messages, currentType, conversation }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // autoscroll apenas se estiver perto do fundo
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isNearBottom = distanceFromBottom < 200; // px

    if (isNearBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  const lastOwnMsgId = [...messages].reverse().find((m) => m.senderType === currentType)?.id;

  const otherSeenAt =
    currentType === 'agent' ? conversation?.last_client_seen_at : conversation?.last_agent_seen_at;

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto p-6 space-y-6 bg-white">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-slate-300 space-y-3">
          <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
            <div className="w-1.5 h-1.5 bg-slate-200 rounded-full animate-bounce" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em]">
            Aguardando mensagens...
          </p>
        </div>
      ) : (
        messages.map((msg) => {
          const isOwn = msg.senderType === currentType;
          const isLastOwn = isOwn && msg.id === lastOwnMsgId;
          const isImage = msg.messageType === 'image';
          const textContent = msg.text || '';

          const wasSeen =
            !!(isLastOwn && otherSeenAt) &&
            new Date(otherSeenAt).getTime() >= new Date(msg.createdAt).getTime();

          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] px-5 py-3 rounded-2xl text-sm leading-relaxed break-words ${
                  isOwn
                    ? 'bg-redoma-steel text-white rounded-tr-none shadow-lg shadow-redoma-steel/10'
                    : 'bg-slate-50 text-slate-700 border border-slate-100 rounded-tl-none'
                }`}
              >
                {/* imagem, se tiver */}
                {isImage && msg.imageUrl && (
                  <div className={textContent ? 'mb-2' : ''}>
                    <a
                      href={msg.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src={msg.imageUrl}
                        alt="Anexo"
                        className="max-h-64 rounded-xl border border-white/10 object-contain"
                      />
                    </a>
                  </div>
                )}

                {/* texto (se existir) */}
                {textContent && <p>{renderTextWithLinks(textContent)}</p>}

                <div className="mt-2 flex items-center justify-end gap-2">
                  <span
                    className={`text-[10px] font-bold ${
                      isOwn ? 'text-white/60' : 'text-slate-400'
                    }`}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>

                  {isLastOwn && (
                    <span
                      className={`text-[10px] font-bold ${
                        wasSeen ? 'text-sky-300' : 'text-white/60'
                      }`}
                    >
                      ✓✓
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default MessageList;
