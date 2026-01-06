import React from 'react';
import { ChevronLeft } from 'lucide-react';
import Logo from './Logo';

interface ChatLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  actions?: React.ReactNode;
  isAgent?: boolean;
}

const ChatLayout: React.FC<ChatLayoutProps> = ({
  children,
  title,
  subtitle,
  showBack,
  onBack,
  actions,
  isAgent,
}) => {
  return (
    // h-dvh = altura dinâmica do viewport (melhor em mobile que h-screen)
    <div className="flex flex-col h-dvh max-w-5xl mx-auto bg-white shadow-2xl">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-redoma-dark text-white sticky top-0 z-10 relative overflow-hidden h-24">
        {/* Visual Effect Background */}
        <div className="absolute inset-0 pointer-events-none opacity-50">
          <style>
            {`
              @keyframes header-orbit-giant {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              @keyframes header-pulse-bright {
                0%, 100% { opacity: 0.5; transform: scale(0.8); filter: blur(1px); }
                50% { opacity: 1; transform: scale(1.5); filter: blur(0px); }
              }
              .header-animate-orbit-giant { 
                animation: header-orbit-giant 50s linear infinite; 
                transform-origin: center; 
              }
              .header-animate-pulse-bright { 
                animation: header-pulse-bright 3s ease-in-out infinite; 
              }
            `}
          </style>

          <svg
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400%] h-[600%]"
            viewBox="0 0 100 100"
          >
            <g className="header-animate-orbit-giant">
              <ellipse
                cx="50"
                cy="50"
                rx="45"
                ry="15"
                stroke="white"
                strokeWidth="0.8"
                fill="none"
                transform="rotate(-25 50 50)"
                opacity="0.4"
              />
              <ellipse
                cx="50"
                cy="50"
                rx="38"
                ry="50"
                stroke="white"
                strokeWidth="0.5"
                fill="none"
                transform="rotate(45 50 50)"
                opacity="0.3"
              />
              <ellipse
                cx="50"
                cy="50"
                rx="25"
                ry="42"
                stroke="white"
                strokeWidth="0.3"
                fill="none"
                transform="rotate(110 50 50)"
                opacity="0.2"
              />
              <ellipse
                cx="50"
                cy="50"
                rx="55"
                ry="20"
                stroke="white"
                strokeWidth="0.6"
                fill="none"
                transform="rotate(-60 50 50)"
                opacity="0.3"
              />

              <circle
                cx="20"
                cy="35"
                r="3.5"
                fill="#F4F4DC"
                className="header-animate-pulse-bright"
              />
              <circle
                cx="85"
                cy="60"
                r="2.5"
                fill="#F4F4DC"
                className="header-animate-pulse-bright"
                style={{ animationDelay: '1s' }}
              />
              <circle
                cx="45"
                cy="85"
                r="4.5"
                fill="#F4F4DC"
                className="header-animate-pulse-bright"
                style={{ animationDelay: '2s' }}
              />
              <circle
                cx="10"
                cy="75"
                r="2"
                fill="#F4F4DC"
                className="header-animate-pulse-bright"
                style={{ animationDelay: '0.5s' }}
              />
              <circle
                cx="90"
                cy="20"
                r="3"
                fill="#F4F4DC"
                className="header-animate-pulse-bright"
                style={{ animationDelay: '1.5s' }}
              />
              <circle cx="50" cy="10" r="1.5" fill="#F4F4DC" />
            </g>
          </svg>
        </div>

        <div className="flex items-center gap-4 relative z-10">
          {showBack ? (
            <button
              onClick={onBack}
              className="p-3 -ml-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ChevronLeft size={28} className="text-white" />
            </button>
          ) : (
            <Logo size={48} />
          )}
          <div className="flex flex-col">
            <h1 className="text-lg font-black leading-tight tracking-tight drop-shadow-md">
              {title}
            </h1>
            {(subtitle || isAgent) && (
              <p className="text-[11px] text-redoma-glow font-black uppercase tracking-[0.2em] mt-0.5 drop-shadow-sm">
                {subtitle ?? 'Painel Administrativo'}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 relative z-10">{actions}</div>
      </header>

      {/* min-h-0 evita que o conteúdo interno estoure e force scroll da página inteira */}
      <main className="flex-1 min-h-0 overflow-hidden relative bg-redoma-bg">
        {children}
      </main>
    </div>
  );
};

export default ChatLayout;
