import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type AdminGuardProps = {
  children: React.ReactNode;
  redirectTo?: string;
};

const AdminGuard: React.FC<AdminGuardProps> = ({ children, redirectTo = '/admin/login' }) => {
  const [loading, setLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;

        if (!user) {
          setIsAllowed(false);
          return;
        }

        const { data: adminUser, error } = await supabase
          .from('admin_users')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('AdminGuard admin_users error:', error);
          setIsAllowed(false);
          return;
        }

        setIsAllowed(!!adminUser);
      } catch (e) {
        console.error('AdminGuard unexpected error:', e);
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

export default AdminGuard;
