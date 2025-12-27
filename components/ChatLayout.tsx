import React from 'react';
import { ChevronLeft } from 'lucide-react';
import Logo from './Logo';

interface ChatLayoutProps {
  children: React.ReactNode;
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  actions?: React.ReactNode;
  isAgent?: boolean;
}

const ChatLayout: React.FC<ChatLayoutProps> = ({
  children,
  title,
  showBack,
  onBack,
  actions,
  isAgent,
}) => {
  return (
    // 🔹 h-dvh = altura dinâmica do viewport (melhor em mobile que h-screen)
    <div className="flex flex-col h-dvh max-w-5xl mx-auto bg-white shadow-2xl">
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-redoma-dark text-white sticky top-0 z-10">
        <div className="flex items-center gap-4">
          {showBack ? (
            <button
              onClick={onBack}
              className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ChevronLeft size={24} className="text-white" />
            </button>
          ) : (
            <Logo size={32} />
          )}
          <div>
            <h1 className="text-base font-bold leading-tight">{title}</h1>
            {isAgent && (
              <p className="text-[10px] text-redoma-glow font-bold uppercase tracking-widest">
                Painel Administrativo
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">{actions}</div>
      </header>

      {/* 🔹 min-h-0 evita que o conteúdo interno estoure e force scroll da página inteira */}
      <main className="flex-1 min-h-0 overflow-hidden relative bg-redoma-bg">
        {children}
      </main>
    </div>
  );
};

export default ChatLayout;
