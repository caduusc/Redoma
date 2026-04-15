import React, { createContext, useContext, useEffect, useState } from 'react';
import { Community } from '../types';
import { supabaseMaster } from '../lib/supabase';

interface CommunityContextType {
  communities: Community[];
  addCommunity: (
    c: Omit<Community, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<Community | null>;
  updateCommunity: (id: string, c: Partial<Community>) => Promise<void>;
  deleteCommunity: (id: string) => Promise<void>;
  toggleActive: (id: string) => Promise<void>;
  getActiveCommunities: () => Community[];
}

const CommunityContext = createContext<CommunityContextType | undefined>(undefined);

const SEED_COMMUNITIES: Omit<Community, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Unidos Somos Fortes',
    slug: 'unidos-somos-fortes',
    description: 'Comunidade de apoio social e renda colaborativa.',
    logo_url: null,
    instagram_url: null,
    isActive: true,
  },
  {
    name: 'Instituto Luz',
    slug: 'instituto-luz',
    description: 'Projetos educacionais e impacto social.',
    logo_url: null,
    instagram_url: null,
    isActive: true,
  },
  {
    name: 'Condomínio Parque Verde',
    slug: 'condominio-parque-verde',
    description: 'Fundo coletivo para melhorias do condomínio.',
    logo_url: null,
    instagram_url: null,
    isActive: true,
  },
  {
    name: 'Igreja Vida Nova',
    slug: 'igreja-vida-nova',
    description: 'Ações sociais e projetos comunitários.',
    logo_url: null,
    instagram_url: null,
    isActive: true,
  },
  {
    name: 'Atletas do Bem',
    slug: 'atletas-do-bem',
    description: 'Esporte como ferramenta de transformação.',
    logo_url: null,
    instagram_url: null,
    isActive: true,
  },
];

export const CommunityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [communities, setCommunities] = useState<Community[]>([]);

  useEffect(() => {
    let subscription: any;

    const fetchCommunities = async () => {
      const { data, error } = await supabaseMaster.from('communities').select('*');

      if (error) {
        console.error('[CommunityContext fetch communities]', error);
        return;
      }

      if (data && data.length > 0) {
        setCommunities(data as Community[]);
        return;
      }

      if ((import.meta as any).env?.PROD) {
        console.warn('[CommunityContext] tabela vazia em produção — seed bloqueado');
        return;
      }

      const { data: seeded, error: seedErr } = await supabaseMaster
        .from('communities')
        .insert(
          SEED_COMMUNITIES.map((c) => ({
            ...c,
            id:
              typeof crypto !== 'undefined' &&
              'randomUUID' in crypto &&
              crypto.randomUUID()
                ? crypto.randomUUID()
                : Math.random().toString(36).slice(2, 11),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }))
        )
        .select();

      if (seedErr) {
        console.error('[CommunityContext seed communities]', seedErr);
        return;
      }

      if (seeded) setCommunities(seeded as Community[]);
    };

    fetchCommunities();

    subscription = supabaseMaster
      .channel('communities_channel')
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'communities' },
        async () => {
          const { data, error } = await supabaseMaster.from('communities').select('*');
          if (!error && data) setCommunities(data as Community[]);
        }
      )
      .subscribe();

    return () => subscription?.unsubscribe?.();
  }, []);

  const addCommunity = async (
    c: Omit<Community, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Community | null> => {
    const newC: Community = {
      ...c,
      id:
        typeof crypto !== 'undefined' &&
        'randomUUID' in crypto &&
        crypto.randomUUID()
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2, 11),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { data, error } = await supabaseMaster
      .from('communities')
      .insert([newC])
      .select()
      .single();

    if (error) {
      console.error('[CommunityContext addCommunity]', error);
      return null;
    }

    return data as Community;
  };

  const updateCommunity = async (id: string, c: Partial<Community>) => {
    const { error } = await supabaseMaster
      .from('communities')
      .update({ ...c, updatedAt: new Date().toISOString() })
      .eq('id', id);

    if (error) console.error('[CommunityContext updateCommunity]', error);
  };

  const deleteCommunity = async (id: string) => {
    const { error } = await supabaseMaster.from('communities').delete().eq('id', id);
    if (error) console.error('[CommunityContext deleteCommunity]', error);
  };

  const toggleActive = async (id: string) => {
    const c = communities.find((item) => item.id === id);
    if (c) await updateCommunity(id, { isActive: !c.isActive });
  };

  const getActiveCommunities = () => communities.filter((c) => c.isActive);

  return (
    <CommunityContext.Provider
      value={{
        communities,
        addCommunity,
        updateCommunity,
        deleteCommunity,
        toggleActive,
        getActiveCommunities,
      }}
    >
      {children}
    </CommunityContext.Provider>
  );
};

export const useCommunities = () => {
  const context = useContext(CommunityContext);
  if (!context) throw new Error('useCommunities must be used within a CommunityProvider');
  return context;
};