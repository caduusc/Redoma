import {
  ShoppingBag,
  CalendarDays,
  Share2,
  Instagram,
} from 'lucide-react';

const rules = [
  {
    id: 'purchase-support',
    title: 'Apoio em compras',
    description: '1 ponto a cada R$ 0,50 apoiado',
    icon: ShoppingBag,
  },
  {
    id: 'daily-access',
    title: 'Acesso diário',
    description: '+5 pontos por dia',
    icon: CalendarDays,
  },
  {
    id: 'share-community',
    title: 'Compartilhar comunidade',
    description: '+10 pontos, até 10x por mês',
    icon: Share2,
  },
  {
    id: 'visit-instagram',
    title: 'Visitar Instagram da comunidade',
    description: '+10 pontos, 1x por comunidade',
    icon: Instagram,
  },
];

export function PointsEarningRulesCard() {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-[17px] font-semibold tracking-tight text-slate-900">
          Como acumular pontos
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Veja as formas disponíveis para aumentar seu saldo de Impact Points.
        </p>
      </div>

      <div className="space-y-3">
        {rules.map((rule) => {
          const Icon = rule.icon;

          return (
            <div
              key={rule.id}
              className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                <Icon size={18} strokeWidth={2.2} />
              </div>

              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-900">
                  {rule.title}
                </h3>
                <p className="mt-1 text-sm leading-5 text-slate-500">
                  {rule.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-sm leading-5 text-slate-500">
          Resgates estão disponíveis na <span className="font-semibold text-slate-700">Redoma Store</span>.
        </p>
      </div>
    </section>
  );
}

export default PointsEarningRulesCard;