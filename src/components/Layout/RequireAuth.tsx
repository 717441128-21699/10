import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Lock } from 'lucide-react';
import type { UserRole } from '@shared/types';
import { useAuthStore } from '@/store/authStore';

interface RequireAuthProps {
  children: React.ReactNode;
  roles?: UserRole[];
}

export default function RequireAuth({ children, roles }: RequireAuthProps) {
  const { token, user, isAuthenticated, hasRole } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (token) {
      useAuthStore.getState().setToken(token);
    }
  }, [token]);

  if (!isAuthenticated()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && roles.length > 0 && !hasRole(roles)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50 p-4">
        <div className="bg-white rounded-2xl shadow-card p-8 md:p-12 text-center max-w-md w-full animate-scale-in">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-warning-100 flex items-center justify-center">
            <Lock className="w-10 h-10 text-warning-500" />
          </div>
          <h2 className="text-2xl font-display text-ink-900 mb-2">无权限访问</h2>
          <p className="text-ink-500 mb-6">
            您当前账号角色「{user?.role}」暂无权限访问此页面
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-2.5 rounded-xl bg-primary-500 text-white font-medium hover:bg-primary-600 transition-colors"
          >
            返回上一页
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
