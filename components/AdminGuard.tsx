import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabaseMaster } from '../lib/supabase';

type AdminGuardProps = {
  children: React.ReactNode;
  redirectTo?: string;
};

const AdminGuard: React.FC<AdminGuardProps> = ({
  children,
  redirectTo = '/admin/login',
}) => {
  const [loading, setLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      try {
        const { data: sessionData, error: sessionError } =
          await supabaseMaster.auth.getSession();

        if (sessionError) {
          console.error('AdminGuard session error:', sessionError);
          return;
        }

        const user = sessionData.session?.user;
        if (!user) return;

        const { data: adminUser, error } = await supabaseMaster
          .from('admin_users')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('AdminGuard admin_users error:', error);
          return;
        }

        if (mounted) {
          setIsAllowed(!!adminUser);
        }
      } catch (e) {
        console.error('AdminGuard unexpected error:', e);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    check();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return null;
  if (!isAllowed) return <Navigate to={redirectTo} replace />;

  return <>{children}</>;
};

export default AdminGuard;
