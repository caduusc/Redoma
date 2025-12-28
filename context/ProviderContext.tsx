import React, { createContext, useContext, useState, useEffect } from 'react';
import { Provider } from '../types';
import { supabaseMaster } from '../lib/supabase';

interface ProviderContextType {
  providers: Provider[];
  addProvider: (provider: Omit<Provider, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProvider: (id: string, provider: Partial<Provider>) => Promise<void>;
  deleteProvider: (id: string) => Promise<void>;
  toggleActive: (id: string) => Promise<void>;
  getActiveProviders: () => Provider[];
}

const ProviderContext = createContext<ProviderContextType | undefined>(undefined);

/**
 * Mapeia linha do banco (logo_url) -> modelo do app (logoUrl)
 */
const mapFromDb = (row: any): Provider => ({
  id: row.id,
  name: row.name,
  type: row.type,
  category: row.category,
  description: row.description,
  cashbackPercent: row.cashbackPercent,
  revenueShareText: row.revenueShareText,
  link: row.link ?? '',
  logoUrl: row.logo_url ?? null,
  isActive: row.isActive,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

/**
 * Mapeia Provider completo -> payload de insert (logoUrl -> logo_url)
 */
const mapToDbInsert = (p: Provider) => ({
  id: p.id,
  name: p.name,
  type: p.type,
  category: p.category,
  description: p.description,
  cashbackPercent: p.cashbackPercent,
  revenueShareText: p.revenueShareText,
  link: p.link,
  logo_url: p.logoUrl ?? null,
  isActive: p.isActive,
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
});

/**
 * Mapeia Partial<Provider> -> payload de update (logoUrl -> logo_url)
 */
const mapToDbUpdate = (p: Partial<Provider>) => {
  const db: any = { ...p };

  if ('logoUrl' in db) {
    db.logo_url = db.logoUrl ?? null;
    delete db.logoUrl;
  }

  return db;
};

const SEED_PROVIDERS: Omit<Provider, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Mercado Livre',
    type: 'ecommerce',
    category: 'Varejo',
    description: 'Tudo o que você precisa com entrega rápida e segura.',
    cashbackPercent: 5.0,
    revenueShareText: 'Parte do valor retorna para o fundo da sua comunidade.',
    link: 'https://www.mercadolivre.com.br',
    logoUrl: null,
    isActive: true,
  },
  {
    name: 'Shopee',
    type: 'ecommerce',
    category: 'Varejo',
    description: 'Ofertas incríveis e cupons de frete grátis todos os dias.',
    cashbackPercent: 5.0,
    revenueShareText: 'Ajude sua comunidade comprando na Shopee.',
    link: 'https://shopee.com.br',
    logoUrl: null,
    isActive: true,
  },
  {
    name: 'Redoma Reformas',
    type: 'service',
    category: 'Manutenção',
    description: 'Serviços especializados de pintura e elétrica.',
    cashbackPercent: 5.0,
    revenueShareText: 'Serviço premium com benefício direto para a comunidade.',
    link: '#',
    logoUrl: null,
    isActive: true,
  },
];

export const ProviderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [providers, setProviders] = useState<Provider[]>([]);

  useEffect(() => {
    let subscription: any;

    const fetchProviders = async () => {
      const { data, error } = await supabaseMaster.from('providers').select('*');

      if (error) {
        console.error('[ProviderContext fetch providers]', error);
        return;
      }

      if (data && data.length > 0) {
        // 🔁 converte logo_url -> logoUrl
        setProviders(data.map(mapFromDb));
        return;
      }

      // Seed se tabela estiver vazia
      const nowIso = new Date().toISOString();
      const seedPayload = SEED_PROVIDERS.map((p) => {
        const id =
          typeof crypto !== 'undefined' && 'randomUUID' in crypto && crypto.randomUUID()
            ? crypto.randomUUID()
            : Math.random().toString(36).slice(2, 11);

        const provider: Provider = {
          ...p,
          id,
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        return mapToDbInsert(provider);
      });

      const { data: seeded, error: seedErr } = await supabaseMaster
        .from('providers')
        .insert(seedPayload)
        .select();

      if (seedErr) {
        console.error('[ProviderContext seed providers]', seedErr);
        return;
      }

      if (seeded) setProviders((seeded as any[]).map(mapFromDb));
    };

    fetchProviders();

    // Realtime: qualquer mudança em providers -> refetch
    subscription = supabaseMaster
      .channel('providers_channel')
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'providers' },
        async () => {
          const { data, error } = await supabaseMaster.from('providers').select('*');
          if (!error && data) setProviders(data.map(mapFromDb));
        }
      )
      .subscribe();

    return () => {
      subscription?.unsubscribe?.();
    };
  }, []);

  const addProvider = async (p: Omit<Provider, 'id' | 'createdAt' | 'updatedAt'>) => {
    const nowIso = new Date().toISOString();

    const provider: Provider = {
      ...p,
      id:
        typeof crypto !== 'undefined' &&
        'randomUUID' in crypto &&
        crypto.randomUUID()
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2, 11),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const dbPayload = mapToDbInsert(provider);

    const { error } = await supabaseMaster.from('providers').insert([dbPayload]);
    if (error) console.error('[ProviderContext addProvider]', error);
  };

  const updateProvider = async (id: string, p: Partial<Provider>) => {
    const dbPayload = mapToDbUpdate({
      ...p,
      updatedAt: new Date().toISOString(),
    });

    const { error } = await supabaseMaster
      .from('providers')
      .update(dbPayload)
      .eq('id', id);

    if (error) console.error('[ProviderContext updateProvider]', error);
  };

  const deleteProvider = async (id: string) => {
    const { error } = await supabaseMaster.from('providers').delete().eq('id', id);
    if (error) console.error('[ProviderContext deleteProvider]', error);
  };

  const toggleActive = async (id: string) => {
    const p = providers.find((item) => item.id === id);
    if (p) {
      await updateProvider(id, { isActive: !p.isActive });
    }
  };

  const getActiveProviders = () => providers.filter((p) => p.isActive);

  return (
    <ProviderContext.Provider
      value={{ providers, addProvider, updateProvider, deleteProvider, toggleActive, getActiveProviders }}
    >
      {children}
    </ProviderContext.Provider>
  );
};

export const useProviders = () => {
  const context = useContext(ProviderContext);
  if (!context) {
    throw new Error('useProviders must be used within a ProviderProvider');
  }
  return context;
};
