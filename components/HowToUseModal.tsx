import React, { useEffect, useMemo, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface HowToUseModalProps {
  open: boolean;
  onClose: () => void;
}

const HowToUseModal: React.FC<HowToUseModalProps> = ({ open, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = useMemo(
    () => [
      {
        title: 'Encontre o produto na loja de sua preferência',
        description:
          'Antes de usar a Redoma, procure normalmente o produto desejado no site da loja parceira. A área Parceiros & Cashback serve para mostrar quais lojas fazem parte da plataforma.',
        image: '/tutorial/tutorial-1.webp',
      },
      {
        title: 'Escolha quem você deseja apoiar',
        description:
          'Depois de decidir o produto que quer comprar, clique em Escolha a comunidade que deseja apoiar para selecionar a causa que vai receber o impacto da sua compra.',
        image: '/tutorial/tutorial-2.webp',
      },
      {
        title: 'Inicie o apoio à comunidade',
        description:
          'Ao entrar na página da comunidade, clique em Apoiar para abrir o atendimento e seguir com o processo pelo chat da Redoma.',
        image: '/tutorial/tutorial-3.webp',
      },
      {
        title: 'Envie o link do produto desejado',
        description:
          'No chat, compartilhe o link do produto que você deseja comprar. A equipe da Redoma irá validar o item e gerar o link correto para viabilizar o apoio à comunidade escolhida.',
        image: '/tutorial/tutorial-4.webp',
      },
      {
        title: 'Conclua sua compra pelo link gerado',
        description:
          'Com o novo link enviado pelo suporte, você pode seguir sua compra normalmente e garantir que ela gere impacto para a comunidade selecionada.',
        disclaimer:
          'O valor do produto permanece o mesmo para você. A compra continua sendo realizada na mesma loja, com o mesmo vendedor e a mesma entrega.',
        image: '/tutorial/tutorial-5.webp',
      },
    ],
    []
  );

  useEffect(() => {
    if (!open) {
      setCurrentStep(0);
    }
  }, [open]);

  if (!open) return null;

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleNext = () => {
    if (isLast) {
      onClose();
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100">
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold text-slate-800">Como usar a Redoma</h2>
            <p className="text-xs text-slate-400 mt-1">
              Passo {currentStep + 1} de {steps.length}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition shrink-0"
            aria-label="Fechar tutorial"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <img
            src={step.image}
            alt={step.title}
            className="w-full rounded-2xl border border-slate-200 object-cover"
          />

          <div>
            <h3 className="text-base font-bold text-slate-800">{step.title}</h3>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">{step.description}</p>

            {'disclaimer' in step && step.disclaimer ? (
              <div className="mt-3 rounded-2xl bg-slate-50 border border-slate-200 p-3">
                <p className="text-xs text-slate-600 leading-relaxed">{step.disclaimer}</p>
              </div>
            ) : null}
          </div>

          <div className="flex justify-center gap-2 pt-1">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep ? 'w-6 bg-redoma-dark' : 'w-2 bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="px-5 pb-5 flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrev}
            disabled={isFirst}
            className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 font-bold text-xs uppercase tracking-widest disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <ChevronLeft size={14} />
            Voltar
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="flex-1 px-4 py-3 rounded-2xl bg-redoma-dark text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2"
          >
            {isLast ? 'Entendi' : 'Próximo'}
            {!isLast ? <ChevronRight size={14} /> : null}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HowToUseModal;