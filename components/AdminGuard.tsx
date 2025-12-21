import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase'; // ajuste se necessário

type AdminGuardProps = {
  children: React.ReactNode;
  redirectTo?: string;
};

const AdminGuard: React.FC<AdminGuardProps> = ({ children, redirectTo = '/agent/login' }) => {
  const [loading, setLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        const user = userData?.user;

        if (userErr || !user) {
          setIsAllowed(false);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('admin_users')
          .select('user_id')
          .eq('user_id', user.id)
          .limit(1);

        if (error) {
          setIsAllowed(false);
        } else {
          setIsAllowed((data?.length ?? 0) > 0);
        }
      } catch {
        setIsAllowed(false);
      } finally {
        setLoading(false);
      }
    };

    check();
  }, []);

  if (loading) return null; // se quiser, troca por um loader
  if (!isAllowed) return <Navigate to={redirectTo} replace />;

  return <>{children}</>;
};

export default AdminGuard;
