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

// Seed inicial (front usa logoUrl; DB usa logo_url)
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

  // converte o formato do banco (logo_url) para o tipo Provider (logoUrl)
  const normalizeRows = (rows: any[]): Provider[] => {
    return rows.map((row) => ({
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
    }));
  };

  useEffect(() => {
    let subscription: any;

    const fetchProviders = async () => {
      const { data, error } = await supabaseMaster.from('providers').select('*');

      if (error) {
        console.error('[ProviderContext fetch providers]', error);
        return;
      }

      if (data && data.length > 0) {
        setProviders(normalizeRows(data));
        return;
      }

      // Seed se tabela estiver vazia
      const nowIso = new Date().toISOString();
      const seedPayload = SEED_PROVIDERS.map((p) => ({
        id:
          typeof crypto !== 'undefined' &&
          'randomUUID' in crypto &&
          crypto.randomUUID()
            ? crypto.randomUUID()
            : Math.random().toString(36).slice(2, 11),
        name: p.name,
        type: p.type,
        category: p.category,
        description: p.description,
        cashbackPercent: p.cashbackPercent,
        revenueShareText: p.revenueShareText,
        link: p.link,
        logo_url: p.logoUrl ?? null,
        isActive: p.isActive,
        createdAt: nowIso,
        updatedAt: nowIso,
      }));

      const { data: seeded, error: seedErr } = await supabaseMaster
        .from('providers')
        .insert(seedPayload)
        .select('*');

      if (seedErr) {
        console.error('[ProviderContext seed providers]', seedErr);
        return;
      }

      if (seeded) setProviders(normalizeRows(seeded));
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
          if (!error && data) setProviders(normalizeRows(data));
        }
      )
      .subscribe();

    return () => {
      subscription?.unsubscribe?.();
    };
  }, []);

  const addProvider = async (p: Omit<Provider, 'id' | 'createdAt' | 'updatedAt'>) => {
    const nowIso = new Date().toISOString();

    const { logoUrl, ...rest } = p;

    const payload: any = {
      ...rest,
      logo_url: logoUrl ?? null,
      id:
        typeof crypto !== 'undefined' &&
        'randomUUID' in crypto &&
        crypto.randomUUID()
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2, 11),
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const { error } = await supabaseMaster.from('providers').insert([payload]);
    if (error) console.error('[ProviderContext addProvider]', error);
  };

  const updateProvider = async (id: string, p: Partial<Provider>) => {
    const { logoUrl, ...rest } = p;

    const payload: any = {
      ...rest,
      updatedAt: new Date().toISOString(),
    };

    if (logoUrl !== undefined) {
      payload.logo_url = logoUrl;
    }

    const { error } = await supabaseMaster
      .from('providers')
      .update(payload)
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
