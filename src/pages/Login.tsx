import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, Baby, Sparkles } from 'lucide-react';
import { authApi } from '@/api';
import { useAuthStore } from '@/store/authStore';
import { showToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

type RoleType = 'super_admin' | 'principal' | 'teacher' | 'parent' | 'finance';

interface RoleOption {
  value: RoleType;
  label: string;
  username: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  { value: 'super_admin', label: '超级管理员', username: 'admin' },
  { value: 'principal', label: '园长', username: 'principal1' },
  { value: 'teacher', label: '老师', username: 'teacher1' },
  { value: 'parent', label: '家长', username: 'parent1' },
  { value: 'finance', label: '财务', username: 'finance1' },
];

const FLOATING_EMOJIS = [
  { emoji: '🌻', delay: '0s', left: '10%', top: '15%' },
  { emoji: '🍎', delay: '1s', left: '80%', top: '20%' },
  { emoji: '🎨', delay: '2s', left: '15%', top: '70%' },
  { emoji: '🎪', delay: '1.5s', left: '75%', top: '75%' },
  { emoji: '🌈', delay: '0.5s', left: '50%', top: '10%' },
  { emoji: '🎈', delay: '2.5s', left: '90%', top: '50%' },
];

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [activeRole, setActiveRole] = useState<RoleType>('super_admin');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleRoleChange = (role: RoleType) => {
    setActiveRole(role);
    const option = ROLE_OPTIONS.find((r) => r.value === role);
    if (option) {
      setUsername(option.username);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      showToast('请输入账号和密码', 'warning');
      return;
    }

    setLoading(true);
    try {
      const response = await authApi.login({ username, password });
      login(response.user, response.token);
      localStorage.setItem('auth_token', response.token);
      showToast('登录成功', 'success');
      navigate('/dashboard');
    } catch (error) {
      if (error instanceof Error) {
        showToast(error.message || '登录失败', 'error');
      } else {
        showToast('登录失败', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-500 via-primary-400 to-accent-500 relative overflow-hidden">
        <div className="absolute inset-0 grain-overlay" />
        {FLOATING_EMOJIS.map((item, index) => (
          <span
            key={index}
            className="absolute text-5xl animate-float select-none opacity-80"
            style={{ left: item.left, top: item.top, animationDelay: item.delay }}
          >
            {item.emoji}
          </span>
        ))}

        <div className="absolute top-20 right-20 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute bottom-32 left-20 w-48 h-48 bg-white/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Baby className="w-8 h-8" />
            </div>
            <span className="text-2xl font-display">智慧园</span>
          </div>

          <h1 className="text-5xl xl:text-6xl font-display leading-tight mb-6">
            幼儿园智慧
            <br />
            <span className="flex items-center gap-3">
              管理平台
              <Sparkles className="w-10 h-10 text-yellow-300" />
            </span>
          </h1>

          <p className="text-xl text-white/90 leading-relaxed max-w-md">
            让每个孩子都能健康快乐成长
          </p>

          <div className="mt-12 flex items-center gap-6">
            <div className="flex -space-x-3">
              {[
                'bg-pink-400',
                'bg-yellow-400',
                'bg-green-400',
                'bg-blue-400',
              ].map((color, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-10 h-10 rounded-full border-2 border-white',
                    color
                  )}
                />
              ))}
            </div>
            <div>
              <p className="text-white/90 font-medium">1000+ 幼儿园的信赖选择</p>
              <p className="text-white/70 text-sm">50000+ 孩子的快乐陪伴</p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 sm:px-8 py-12 bg-gradient-to-br from-warm-50 to-accent-50">
        <div
          className={cn(
            'w-full max-w-md transition-all duration-700',
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          )}
        >
          <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <Baby className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-display text-ink-900">智慧园</span>
          </div>

          <div className="bg-white rounded-3xl shadow-card p-8 animate-scale-in">
            <div className="mb-8">
              <h2 className="text-3xl font-display text-ink-900 mb-2">欢迎回来</h2>
              <p className="text-ink-500">请选择您的角色并登录</p>
            </div>

            <div className="mb-6">
              <div className="grid grid-cols-5 gap-1.5 p-1 bg-warm-50 rounded-xl">
                {ROLE_OPTIONS.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => handleRoleChange(role.value)}
                    className={cn(
                      'px-2 py-2 rounded-lg text-xs font-medium transition-all duration-200',
                      activeRole === role.value
                        ? 'bg-white text-primary-600 shadow-soft'
                        : 'text-ink-500 hover:text-ink-700 hover:bg-white/60'
                    )}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label">账号</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="请输入账号"
                    className="input pl-11"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div>
                <label className="label">密码</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    className="input pl-11 pr-11"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-ink-100 text-ink-400 hover:text-ink-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded border-ink-300 text-primary-500 focus:ring-primary-400"
                  />
                  <span className="text-sm text-ink-600 group-hover:text-ink-900 transition-colors">
                    记住密码
                  </span>
                </label>
                <button type="button" className="text-sm text-primary-500 hover:text-primary-600 transition-colors">
                  忘记密码？
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={cn(
                  'w-full py-3 rounded-xl font-medium text-white transition-all duration-200',
                  'bg-gradient-to-r from-primary-500 to-primary-400 hover:from-primary-600 hover:to-primary-500',
                  'shadow-soft hover:shadow-float hover:scale-[1.02]',
                  'disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100'
                )}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="animate-spin w-5 h-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    登录中...
                  </span>
                ) : (
                  '登 录'
                )}
              </button>
            </form>

            <div className="mt-6 p-3 rounded-xl bg-warm-50 border border-warm-200">
              <p className="text-xs text-ink-500 mb-1.5">💡 测试账号提示</p>
              <p className="text-xs text-ink-600">
                已根据角色自动填充账号，密码统一为 <span className="font-mono font-medium text-primary-600">123456</span>
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-ink-500">
            © 2025 智慧园幼儿园管理平台 · 让爱陪伴成长
          </p>
        </div>
      </div>
    </div>
  );
}
