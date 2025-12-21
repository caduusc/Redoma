
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import ChatLayout from '../components/ChatLayout';
import MessageList from '../components/MessageList';
import MessageInput from '../components/MessageInput';
import { Sparkles, LayoutGrid } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

const ClientChat: React.FC = () => {
  const navigate = useNavigate();
  const { getConversation, getMessages, addMessage } = useChat();
  const [convId, setConvId] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem('redoma_active_conv');
    if (!id) {
      navigate('/client/start');
    } else {
      setConvId(id);
    }
  }, [navigate]);

  if (!convId) return null;

  const conversation = getConversation(convId);
  const messages = getMessages(convId);

  const handleSend = (text: string) => {
    addMessage(convId, text, 'client');
  };

  // Upgraded simulation to use Gemini AI for realistic, professional support responses
  const simulateAgent = async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const lastUserMessage = messages.filter(m => m.senderType === 'client').pop()?.text || "Olá, preciso de ajuda.";

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `O usuário enviou: "${lastUserMessage}". Responda como um atendente de suporte da Redoma Tech de forma prestativa e profissional.`,
        config: {
          systemInstruction: "Você é um atendente de suporte especializado da Redoma Tech, uma empresa focada em soluções para condomínios e comunidades. Seja cordial, direto e profissional em suas respostas.",
        }
      });

      if (response.text) {
        addMessage(convId, response.text, 'agent');
      }
    } catch (error) {
      console.error("AI Simulation failed:", error);
      // Fallback responses if the AI service is unavailable
      const responses = [
        "Olá! Como posso ajudar você hoje?",
        "Vou verificar essa informação no sistema, só um momento.",
        "O seu chamado foi registrado com sucesso.",
        "Pode me enviar uma foto do ocorrido?",
        "Entendido. O técnico deve chegar em até 2 horas."
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      addMessage(convId, randomResponse, 'agent');
    }
  };

  return (
    <ChatLayout 
      title={`Chat: ${conversation?.communityId || 'Carregando...'}`} 
      showBack 
      onBack={() => navigate('/client/start')}
      actions={
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/client/providers')}
            className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold bg-white/10 text-white px-3 py-1.5 rounded-full hover:bg-white/20 transition-colors border border-white/10 uppercase tracking-widest"
            title="Ver Fornecedores"
          >
            <LayoutGrid size={14} />
            <span>Benefícios</span>
          </button>
          <button 
            onClick={simulateAgent}
            className="flex items-center gap-1.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors border border-indigo-200 uppercase tracking-widest"
          >
            <Sparkles size={14} />
            <span>Simular AI</span>
          </button>
        </div>
      }
    >
      <div className="flex flex-col h-full">
        <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-2 text-[10px] text-indigo-600 font-bold text-center uppercase tracking-[0.15em]">
          Suporte Redoma Ativo
        </div>
        <MessageList messages={messages} currentType="client" />
        <MessageInput onSend={handleSend} disabled={conversation?.status === 'closed'} />
      </div>
    </ChatLayout>
  );
};

export default ClientChat;
