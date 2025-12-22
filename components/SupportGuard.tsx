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
        const { data: userData } = await supabaseSupport.auth.getUser();
        const user = userData?.user;
        if (!user) return setOk(false);

        const { data, error } = await supabaseSupport
          .from('support_users')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle();

        setOk(!error && !!data);
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
