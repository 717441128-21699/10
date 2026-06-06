import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Baby,
  GraduationCap,
  CalendarX,
  HeartPulse,
  UtensilsCrossed,
  QrCode,
  PartyPopper,
  Wallet,
  Settings,
  Menu,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  User,
} from 'lucide-react';
import type { UserRole } from '@shared/types';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

interface MenuItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}

const MENU_ITEMS: MenuItem[] = [
  {
    path: '/dashboard',
    label: '大屏首页',
    icon: LayoutDashboard,
    roles: ['super_admin', 'principal', 'teacher', 'finance', 'parent'],
  },
  {
    path: '/children',
    label: '幼儿档案',
    icon: Baby,
    roles: ['super_admin', 'principal', 'teacher', 'finance'],
  },
  {
    path: '/classes',
    label: '班级课程',
    icon: GraduationCap,
    roles: ['super_admin', 'principal', 'teacher', 'finance'],
  },
  {
    path: '/leave',
    label: '请假管理',
    icon: CalendarX,
    roles: ['super_admin', 'principal', 'teacher', 'finance', 'parent'],
  },
  {
    path: '/health',
    label: '健康晨检',
    icon: HeartPulse,
    roles: ['super_admin', 'principal', 'teacher', 'finance'],
  },
  {
    path: '/recipes',
    label: '食谱管理',
    icon: UtensilsCrossed,
    roles: ['super_admin', 'principal', 'teacher', 'finance', 'parent'],
  },
  {
    path: '/pickup',
    label: '接送管理',
    icon: QrCode,
    roles: ['super_admin', 'principal', 'teacher', 'finance', 'parent'],
  },
  {
    path: '/activities',
    label: '活动管理',
    icon: PartyPopper,
    roles: ['super_admin', 'principal', 'teacher', 'finance', 'parent'],
  },
  {
    path: '/billing',
    label: '费用结算',
    icon: Wallet,
    roles: ['super_admin', 'principal', 'teacher', 'finance', 'parent'],
  },
  {
    path: '/settings',
    label: '系统设置',
    icon: Settings,
    roles: ['super_admin', 'principal', 'teacher', 'finance'],
  },
];

const BREADCRUMB_MAP: Record<string, string> = {
  '/dashboard': '大屏首页',
  '/children': '幼儿档案',
  '/classes': '班级课程',
  '/leave': '请假管理',
  '/health': '健康晨检',
  '/recipes': '食谱管理',
  '/pickup': '接送管理',
  '/activities': '活动管理',
  '/billing': '费用结算',
  '/settings': '系统设置',
};

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const filteredMenu = MENU_ITEMS.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

  const getBreadcrumb = () => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: { label: string; path: string }[] = [];
    let currentPath = '';
    for (const part of pathParts) {
      currentPath += `/${part}`;
      const label = BREADCRUMB_MAP[currentPath];
      if (label) {
        breadcrumbs.push({ label, path: currentPath });
      }
    }
    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumb();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarWidth = collapsed ? 'w-16' : 'w-60';

  return (
    <div className="min-h-screen bg-ink-50 flex">
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'bg-white border-r border-ink-200 flex flex-col transition-all duration-300 h-screen sticky top-0 z-50',
          sidebarWidth,
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          'fixed md:static'
        )}
      >
        <div
          className={cn(
            'h-16 flex items-center border-b border-ink-200 px-4',
            collapsed ? 'justify-center' : 'justify-between'
          )}
        >
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                <Baby className="w-5 h-5 text-white" />
              </div>
              <span className="font-display text-lg text-ink-900">智慧园</span>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
              <Baby className="w-5 h-5 text-white" />
            </div>
          )}
          <button
            className="hidden md:flex p-1.5 rounded-lg hover:bg-ink-100 text-ink-500"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {filteredMenu.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                    collapsed ? 'justify-center' : '',
                    isActive
                      ? 'bg-primary-50 text-primary-600 font-medium'
                      : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900'
                  )
                }
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="text-sm">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-ink-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              className="p-2 rounded-lg hover:bg-ink-100 md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <Menu className="w-5 h-5 text-ink-600" />
            </button>

            <nav className="hidden md:flex items-center gap-2 text-sm">
              <span className="text-ink-400">首页</span>
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.path} className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-ink-300" />
                  <span
                    className={
                      index === breadcrumbs.length - 1
                        ? 'text-ink-900 font-medium'
                        : 'text-ink-500'
                    }
                  >
                    {crumb.label}
                  </span>
                </div>
              ))}
            </nav>
          </div>

          <div className="relative">
            <button
              className="flex items-center gap-2 p-1.5 pr-3 rounded-xl hover:bg-ink-100 transition-colors"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white text-sm font-medium">
                  {user?.name?.charAt(0) || 'U'}
                </div>
              )}
              <div className="hidden md:block text-left">
                <div className="text-sm font-medium text-ink-900">
                  {user?.name || '用户'}
                </div>
                <div className="text-xs text-ink-500">
                  {user?.role === 'super_admin' && '超级管理员'}
                  {user?.role === 'principal' && '园长'}
                  {user?.role === 'teacher' && '教师'}
                  {user?.role === 'finance' && '财务'}
                  {user?.role === 'parent' && '家长'}
                </div>
              </div>
              <ChevronDown
                className={cn(
                  'w-4 h-4 text-ink-400 transition-transform',
                  userMenuOpen && 'rotate-180'
                )}
              />
            </button>

            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-card border border-ink-200 py-1.5 z-50 animate-scale-in">
                  <div className="px-3 py-2 border-b border-ink-100 md:hidden">
                    <div className="text-sm font-medium text-ink-900">
                      {user?.name || '用户'}
                    </div>
                    <div className="text-xs text-ink-500">
                      {user?.role === 'super_admin' && '超级管理员'}
                      {user?.role === 'principal' && '园长'}
                      {user?.role === 'teacher' && '教师'}
                      {user?.role === 'finance' && '财务'}
                      {user?.role === 'parent' && '家长'}
                    </div>
                  </div>
                  <button
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-ink-700 hover:bg-ink-50 transition-colors"
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/settings');
                    }}
                  >
                    <User className="w-4 h-4" />
                    <span>个人中心</span>
                  </button>
                  <button
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-danger-600 hover:bg-danger-50 transition-colors"
                    onClick={() => {
                      setUserMenuOpen(false);
                      handleLogout();
                    }}
                  >
                    <LogOut className="w-4 h-4" />
                    <span>退出登录</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
