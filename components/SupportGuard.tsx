import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type SupportGuardProps = {
  children: React.ReactNode;
  redirectTo?: string;
};

const SupportGuard: React.FC<SupportGuardProps> = ({ children, redirectTo = '/agent/login' }) => {
  const [loading, setLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        const user = userData?.user;

        if (userErr || !user) {
          setIsAllowed(false);
          return;
        }

        const { data, error } = await supabase
          .from('support_users')
          .select('user_id')
          .eq('user_id', user.id)
          .limit(1);

        if (error) {
          console.error('Support check error:', error);
          setIsAllowed(false);
          return;
        }

        setIsAllowed((data?.length ?? 0) > 0);
      } catch (e) {
        console.error('Support check unexpected error:', e);
        setIsAllowed(false);
      } finally {
        setLoading(false);
      }
    };

    check();
  }, []);

  if (loading) return null;
  if (!isAllowed) return <Navigate to={redirectTo} replace />;

  return <>{children}</>;
};

export default SupportGuard;
