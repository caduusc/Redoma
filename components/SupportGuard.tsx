import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabaseSupport } from '../lib/supabase';

type Props = { children: React.ReactNode; redirectTo?: string };

const SupportGuard: React.FC<Props> = ({ children, redirectTo = '/agent/login' }) => {
  const [loading, setLoading] = useState(true);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // 1) Verificação rápida via localStorage (sem rede) — crucial no PWA
        const { data: sessionData } = await supabaseSupport.auth.getSession();
        const session = sessionData?.session;

        if (!session?.user) {
          setOk(false);
          return;
        }

        const userId = session.user.id;

        // 2) Verifica permissão na tabela support_users
        const { data, error } = await supabaseSupport
          .from('support_users')
          .select('user_id')
          .eq('user_id', userId)
          .maybeSingle();

        setOk(!error && !!data);
      } catch {
        setOk(false);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return null;
  if (!ok) return <Navigate to={redirectTo} replace />;
  return <>{children}</>;
};

export default SupportGuard;