import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Building2,
  Shield,
  Book,
  Plus,
  Edit,
  Trash2,
  Ban,
  Check,
  X,
  ChevronRight,
  RefreshCw,
  KeyRound,
  Phone,
  MapPin,
} from 'lucide-react';
import { settingsApi } from '@/api';
import { useAuthStore } from '@/store/authStore';
import { showToast } from '@/components/ui/Toast';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { cn } from '@/lib/utils';
import type { User, Campus, DictionaryItem, UserRole } from '@shared/types';

type SettingsTab = 'users' | 'campuses' | 'permissions' | 'dictionaries';
type DictType = 'allergy' | 'leave_type' | 'course_type';

interface UserFormState {
  open: boolean;
  editing: User | null;
  username: string;
  name: string;
  role: UserRole;
  password: string;
  phone: string;
  campusId: number | '';
}

interface CampusFormState {
  open: boolean;
  editing: Campus | null;
  name: string;
  address: string;
  phone: string;
  status: 'active' | 'inactive';
}

interface DictFormState {
  open: boolean;
  editing: DictionaryItem | null;
  key: string;
  value: string;
  sort: number;
}

const ROLE_LABELS: Record<UserRole, { label: string; className: string }> = {
  super_admin: { label: '超级管理员', className: 'badge bg-purple-100 text-purple-700' },
  principal: { label: '园长', className: 'badge badge-primary' },
  teacher: { label: '老师', className: 'badge badge-accent' },
  finance: { label: '财务', className: 'badge badge-warning' },
  parent: { label: '家长', className: 'badge badge-success' },
};

const PERMISSION_MATRIX: {
  module: string;
  permissions: Record<UserRole, 'read' | 'write' | 'none'>;
}[] = [
  { module: '大屏首页', permissions: { super_admin: 'write', principal: 'write', teacher: 'read', finance: 'read', parent: 'read' } },
  { module: '幼儿档案', permissions: { super_admin: 'write', principal: 'write', teacher: 'write', finance: 'read', parent: 'none' } },
  { module: '班级课程', permissions: { super_admin: 'write', principal: 'write', teacher: 'write', finance: 'read', parent: 'none' } },
  { module: '请假管理', permissions: { super_admin: 'write', principal: 'write', teacher: 'write', finance: 'read', parent: 'write' } },
  { module: '健康晨检', permissions: { super_admin: 'write', principal: 'write', teacher: 'write', finance: 'read', parent: 'none' } },
  { module: '食谱管理', permissions: { super_admin: 'write', principal: 'write', teacher: 'read', finance: 'read', parent: 'read' } },
  { module: '接送管理', permissions: { super_admin: 'write', principal: 'write', teacher: 'write', finance: 'read', parent: 'write' } },
  { module: '活动管理', permissions: { super_admin: 'write', principal: 'write', teacher: 'write', finance: 'read', parent: 'write' } },
  { module: '费用结算', permissions: { super_admin: 'write', principal: 'write', teacher: 'read', finance: 'write', parent: 'read' } },
  { module: '系统设置', permissions: { super_admin: 'write', principal: 'write', teacher: 'none', finance: 'none', parent: 'none' } },
];

const DICT_TYPE_LABELS: Record<DictType, string> = {
  allergy: '过敏源',
  leave_type: '请假类型',
  course_type: '课程类型',
};

export default function Settings() {
  const { hasRole } = useAuthStore();
  const isSuperAdmin = hasRole(['super_admin']);

  const [activeTab, setActiveTab] = useState<SettingsTab>('users');

  const [users, setUsers] = useState<User[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [dictItems, setDictItems] = useState<DictionaryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeDictType, setActiveDictType] = useState<DictType>('allergy');

  const [userForm, setUserForm] = useState<UserFormState>({
    open: false, editing: null, username: '', name: '',
    role: 'teacher', password: '', phone: '', campusId: '',
  });
  const [submittingUser, setSubmittingUser] = useState(false);

  const [campusForm, setCampusForm] = useState<CampusFormState>({
    open: false, editing: null, name: '', address: '', phone: '', status: 'active',
  });
  const [submittingCampus, setSubmittingCampus] = useState(false);

  const [dictForm, setDictForm] = useState<DictFormState>({
    open: false, editing: null, key: '', value: '', sort: 0,
  });
  const [submittingDict, setSubmittingDict] = useState(false);

  const [userActionDialog, setUserActionDialog] = useState<{
    open: boolean; user: User | null; action: 'toggle' | 'reset';
  }>({ open: false, user: null, action: 'toggle' });
  const [processingUserAction, setProcessingUserAction] = useState(false);

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean; type: 'campus' | 'dict'; id: number | null; name: string;
  }>({ open: false, type: 'dict', id: null, name: '' });
  const [processingDelete, setProcessingDelete] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await settingsApi.userList();
      setUsers(data);
    } catch {
      showToast('获取用户列表失败', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCampuses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await settingsApi.campusList();
      setCampuses(data);
    } catch {
      showToast('获取校区列表失败', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDictItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await settingsApi.dictList(activeDictType);
      setDictItems(data);
    } catch {
      showToast('获取字典数据失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeDictType]);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'campuses') fetchCampuses();
    if (activeTab === 'dictionaries') fetchDictItems();
  }, [activeTab, fetchUsers, fetchCampuses, fetchDictItems]);

  const openCreateUser = () => {
    setUserForm({
      open: true, editing: null, username: '', name: '',
      role: 'teacher', password: '', phone: '', campusId: '',
    });
  };

  const openEditUser = (user: User) => {
    setUserForm({
      open: true, editing: user, username: user.username, name: user.name,
      role: user.role, password: '', phone: user.phone, campusId: user.campusId || '',
    });
  };

  const handleSubmitUser = async () => {
    if (!userForm.username || !userForm.name || !userForm.phone) {
      showToast('请填写必填项', 'warning');
      return;
    }
    if (!userForm.editing && !userForm.password) {
      showToast('请设置密码', 'warning');
      return;
    }
    setSubmittingUser(true);
    try {
      const payload = {
        username: userForm.username,
        name: userForm.name,
        role: userForm.role,
        phone: userForm.phone,
        ...(userForm.password && { password: userForm.password }),
        ...(userForm.campusId && { campusId: Number(userForm.campusId) }),
      };
      if (userForm.editing) {
        await settingsApi.updateUser(userForm.editing.id, payload);
        showToast('用户更新成功', 'success');
      } else {
        await settingsApi.createUser(payload as Parameters<typeof settingsApi.createUser>[0]);
        showToast('用户创建成功', 'success');
      }
      setUserForm({ ...userForm, open: false });
      fetchUsers();
    } catch {
      showToast(userForm.editing ? '更新用户失败' : '创建用户失败', 'error');
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleUserAction = async () => {
    if (!userActionDialog.user) return;
    setProcessingUserAction(true);
    try {
      if (userActionDialog.action === 'toggle') {
        await settingsApi.updateUser(userActionDialog.user.id, {
          status: userActionDialog.user.status === 'active' ? 'disabled' : 'active',
        });
        showToast(userActionDialog.user.status === 'active' ? '已禁用用户' : '已启用用户', 'success');
      } else {
        await settingsApi.updateUser(userActionDialog.user.id, { password: '123456' });
        showToast('密码已重置为 123456', 'success');
      }
      setUserActionDialog({ open: false, user: null, action: 'toggle' });
      fetchUsers();
    } catch {
      showToast('操作失败', 'error');
    } finally {
      setProcessingUserAction(false);
    }
  };

  const openCreateCampus = () => {
    setCampusForm({
      open: true, editing: null, name: '', address: '', phone: '', status: 'active',
    });
  };

  const openEditCampus = (campus: Campus) => {
    setCampusForm({
      open: true, editing: campus, name: campus.name,
      address: campus.address || '', phone: campus.phone || '', status: campus.status,
    });
  };

  const handleSubmitCampus = async () => {
    if (!campusForm.name) {
      showToast('请填写校区名称', 'warning');
      return;
    }
    setSubmittingCampus(true);
    try {
      const payload = {
        name: campusForm.name,
        address: campusForm.address,
        phone: campusForm.phone,
        status: campusForm.status,
      };
      if (campusForm.editing) {
        await settingsApi.updateCampus(campusForm.editing.id, payload);
        showToast('校区更新成功', 'success');
      } else {
        await settingsApi.createCampus(payload);
        showToast('校区创建成功', 'success');
      }
      setCampusForm({ ...campusForm, open: false });
      fetchCampuses();
    } catch {
      showToast(campusForm.editing ? '更新校区失败' : '创建校区失败', 'error');
    } finally {
      setSubmittingCampus(false);
    }
  };

  const openCreateDict = () => {
    setDictForm({ open: false, editing: null, key: '', value: '', sort: 0 });
    setDictForm({ ...dictForm, open: true });
  };

  const openEditDict = (item: DictionaryItem) => {
    setDictForm({
      open: true, editing: item, key: item.key, value: item.value, sort: item.sort,
    });
  };

  const handleSubmitDict = async () => {
    if (!dictForm.key || !dictForm.value) {
      showToast('请填写 Key 和 Value', 'warning');
      return;
    }
    setSubmittingDict(true);
    try {
      const payload = {
        type: activeDictType,
        key: dictForm.key,
        value: dictForm.value,
        sort: dictForm.sort,
      };
      if (dictForm.editing) {
        await settingsApi.updateDict(dictForm.editing.id, payload);
        showToast('字典项更新成功', 'success');
      } else {
        await settingsApi.createDict(payload);
        showToast('字典项创建成功', 'success');
      }
      setDictForm({ ...dictForm, open: false });
      fetchDictItems();
    } catch {
      showToast(dictForm.editing ? '更新字典项失败' : '创建字典项失败', 'error');
    } finally {
      setSubmittingDict(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.id) return;
    setProcessingDelete(true);
    try {
      if (deleteDialog.type === 'dict') {
        await settingsApi.removeDict(deleteDialog.id);
      }
      showToast('删除成功', 'success');
      setDeleteDialog({ open: false, type: 'dict', id: null, name: '' });
      if (deleteDialog.type === 'dict') fetchDictItems();
      else fetchCampuses();
    } catch {
      showToast('删除失败', 'error');
    } finally {
      setProcessingDelete(false);
    }
  };

  const renderPermissionIcon = (level: 'read' | 'write' | 'none') => {
    if (level === 'write') return <span className="text-primary-600 font-semibold">✎</span>;
    if (level === 'read') return <span className="text-success-600 font-semibold">✓</span>;
    return <span className="text-ink-300 font-semibold">✗</span>;
  };

  const sidebarItems = [
    { key: 'users' as SettingsTab, label: '用户管理', icon: Users },
    { key: 'campuses' as SettingsTab, label: '校区管理', icon: Building2 },
    { key: 'permissions' as SettingsTab, label: '权限说明', icon: Shield },
    { key: 'dictionaries' as SettingsTab, label: '字典管理', icon: Book },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="系统设置"
        subtitle="管理用户、校区、权限和系统字典"
        actions={
          <button
            onClick={() => {
              if (activeTab === 'users') fetchUsers();
              if (activeTab === 'campuses') fetchCampuses();
              if (activeTab === 'dictionaries') fetchDictItems();
            }}
            className="btn-ghost !px-3 !py-2.5"
            disabled={loading}
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
        }
      />

      <div className="flex flex-col md:flex-row gap-6">
        <aside className="w-full md:w-56 flex-shrink-0">
          <div className="card p-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 last:mb-0 text-left transition-colors',
                    active
                      ? 'bg-primary-50 text-primary-600 font-medium'
                      : 'text-ink-600 hover:bg-ink-50'
                  )}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{item.label}</span>
                  {active && <ChevronRight className="w-4 h-4 ml-auto" />}
                </button>
              );
            })}
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          {activeTab === 'users' && (
            <div className="card p-0 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-ink-100">
                <h3 className="font-semibold text-ink-900">用户列表</h3>
                <button onClick={openCreateUser} className="btn-primary !py-2 !text-sm">
                  <Plus className="w-4 h-4" />
                  新增用户
                </button>
              </div>
              {loading ? (
                <div className="py-16 text-center text-ink-500">加载中...</div>
              ) : users.length === 0 ? (
                <EmptyState icon={Users} title="暂无用户" description="点击右上角新增用户" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="table-header">账号</th>
                        <th className="table-header">姓名</th>
                        <th className="table-header">角色</th>
                        <th className="table-header">所属校区</th>
                        <th className="table-header">手机号</th>
                        <th className="table-header">状态</th>
                        <th className="table-header text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-ink-50/50 transition-colors">
                          <td className="table-cell font-medium text-ink-900">{u.username}</td>
                          <td className="table-cell">{u.name}</td>
                          <td className="table-cell">
                            <span className={ROLE_LABELS[u.role].className}>
                              {ROLE_LABELS[u.role].label}
                            </span>
                          </td>
                          <td className="table-cell text-ink-600">
                            {campuses.find((c) => c.id === u.campusId)?.name || '-'}
                          </td>
                          <td className="table-cell text-ink-600">{u.phone}</td>
                          <td className="table-cell">
                            {u.status === 'active' ? (
                              <span className="badge badge-success"><Check className="w-3 h-3 mr-1" />启用</span>
                            ) : (
                              <span className="badge bg-ink-100 text-ink-600"><Ban className="w-3 h-3 mr-1" />禁用</span>
                            )}
                          </td>
                          <td className="table-cell">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openEditUser(u)}
                                className="p-1.5 rounded-lg hover:bg-ink-100 text-ink-500 hover:text-primary-600 transition-colors"
                                title="编辑"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setUserActionDialog({ open: true, user: u, action: 'reset' })}
                                className="p-1.5 rounded-lg hover:bg-ink-100 text-ink-500 hover:text-warning-600 transition-colors"
                                title="重置密码"
                              >
                                <KeyRound className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setUserActionDialog({ open: true, user: u, action: 'toggle' })}
                                className={cn(
                                  'p-1.5 rounded-lg transition-colors',
                                  u.status === 'active'
                                    ? 'hover:bg-danger-50 text-ink-500 hover:text-danger-600'
                                    : 'hover:bg-success-50 text-ink-500 hover:text-success-600'
                                )}
                                title={u.status === 'active' ? '禁用' : '启用'}
                              >
                                {u.status === 'active' ? <Ban className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'campuses' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-ink-900">校区列表</h3>
                {isSuperAdmin && (
                  <button onClick={openCreateCampus} className="btn-primary !py-2 !text-sm">
                    <Plus className="w-4 h-4" />
                    新增校区
                  </button>
                )}
              </div>
              {loading ? (
                <div className="py-16 text-center text-ink-500">加载中...</div>
              ) : campuses.length === 0 ? (
                <EmptyState icon={Building2} title="暂无校区" description="点击右上角新增校区" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {campuses.map((c) => (
                    <div key={c.id} className="card card-hover">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="font-semibold text-lg text-ink-900">{c.name}</h4>
                          <div className="mt-1">
                            {c.status === 'active' ? (
                              <span className="badge badge-success">运营中</span>
                            ) : (
                              <span className="badge bg-ink-100 text-ink-600">已停用</span>
                            )}
                          </div>
                        </div>
                        {isSuperAdmin && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditCampus(c)}
                              className="p-1.5 rounded-lg hover:bg-ink-100 text-ink-500 hover:text-primary-600 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteDialog({ open: true, type: 'campus', id: c.id, name: c.name })}
                              className="p-1.5 rounded-lg hover:bg-danger-50 text-ink-500 hover:text-danger-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2 text-sm">
                        {c.address && (
                          <div className="flex items-center gap-2 text-ink-600">
                            <MapPin className="w-4 h-4 text-ink-400" />
                            <span>{c.address}</span>
                          </div>
                        )}
                        {c.phone && (
                          <div className="flex items-center gap-2 text-ink-600">
                            <Phone className="w-4 h-4 text-ink-400" />
                            <span>{c.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className="card">
              <h3 className="font-semibold text-ink-900 mb-2">权限矩阵说明</h3>
              <p className="text-sm text-ink-500 mb-4">
                <span className="text-success-600 font-semibold">✓</span> 可读 &nbsp;
                <span className="text-primary-600 font-semibold">✎</span> 可写 &nbsp;
                <span className="text-ink-300 font-semibold">✗</span> 无权限
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-ink-500 uppercase bg-warm-50 rounded-tl-xl">
                        功能模块
                      </th>
                      {(['super_admin', 'principal', 'teacher', 'finance', 'parent'] as UserRole[]).map((r) => (
                        <th key={r} className="px-4 py-3 text-center text-xs font-semibold text-ink-500 uppercase bg-warm-50">
                          {ROLE_LABELS[r].label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {PERMISSION_MATRIX.map((row) => (
                      <tr key={row.module} className="hover:bg-ink-50/50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-ink-900">{row.module}</td>
                        {(['super_admin', 'principal', 'teacher', 'finance', 'parent'] as UserRole[]).map((r) => (
                          <td key={r} className="px-4 py-3 text-center text-lg">
                            {renderPermissionIcon(row.permissions[r])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-6 p-4 bg-warm-50 rounded-xl space-y-2 text-sm text-ink-600">
                <p><strong className="text-ink-900">超级管理员：</strong>拥有系统所有功能的读写权限，管理全部校区。</p>
                <p><strong className="text-ink-900">园长：</strong>管理本校区的所有业务，可编辑幼儿、班级、活动等数据。</p>
                <p><strong className="text-ink-900">老师：</strong>负责幼儿日常管理，包括晨检、请假审批、接送确认等。</p>
                <p><strong className="text-ink-900">财务：</strong>负责费用结算和账单管理，查看幼儿和班级基础数据。</p>
                <p><strong className="text-ink-900">家长：</strong>仅可查看自己孩子的相关信息，提交请假、活动报名、缴费等。</p>
              </div>
            </div>
          )}

          {activeTab === 'dictionaries' && (
            <div className="card p-0 overflow-hidden">
              <div className="flex border-b border-ink-100 px-4">
                {(Object.keys(DICT_TYPE_LABELS) as DictType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveDictType(t)}
                    className={cn(
                      'px-4 py-3.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                      activeDictType === t
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-ink-500 hover:text-ink-700'
                    )}
                  >
                    {DICT_TYPE_LABELS[t]}
                  </button>
                ))}
                <div className="ml-auto flex items-center py-2">
                  <button onClick={openCreateDict} className="btn-primary !py-2 !text-sm">
                    <Plus className="w-4 h-4" />
                    新增字典项
                  </button>
                </div>
              </div>
              {loading ? (
                <div className="py-16 text-center text-ink-500">加载中...</div>
              ) : dictItems.length === 0 ? (
                <EmptyState icon={Book} title="暂无字典项" description="点击右上角新增字典项" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="table-header">Key</th>
                        <th className="table-header">Value</th>
                        <th className="table-header">排序</th>
                        <th className="table-header text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-100">
                      {[...dictItems].sort((a, b) => a.sort - b.sort).map((item) => (
                        <tr key={item.id} className="hover:bg-ink-50/50 transition-colors">
                          <td className="table-cell font-mono text-sm text-ink-700">{item.key}</td>
                          <td className="table-cell">{item.value}</td>
                          <td className="table-cell text-ink-600">{item.sort}</td>
                          <td className="table-cell">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openEditDict(item)}
                                className="p-1.5 rounded-lg hover:bg-ink-100 text-ink-500 hover:text-primary-600 transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteDialog({ open: true, type: 'dict', id: item.id, name: item.value })}
                                className="p-1.5 rounded-lg hover:bg-danger-50 text-ink-500 hover:text-danger-600 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {userForm.open && (
        <ModalDialog
          title={userForm.editing ? '编辑用户' : '新增用户'}
          onClose={() => !submittingUser && setUserForm({ ...userForm, open: false })}
        >
          <div className="space-y-4">
            <div>
              <label className="label">账号 <span className="text-danger-500">*</span></label>
              <input
                type="text"
                className="input"
                value={userForm.username}
                onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                placeholder="请输入登录账号"
                disabled={submittingUser || !!userForm.editing}
              />
            </div>
            <div>
              <label className="label">姓名 <span className="text-danger-500">*</span></label>
              <input
                type="text"
                className="input"
                value={userForm.name}
                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                placeholder="请输入姓名"
                disabled={submittingUser}
              />
            </div>
            <div>
              <label className="label">角色 <span className="text-danger-500">*</span></label>
              <select
                className="input"
                value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value as UserRole })}
                disabled={submittingUser}
              >
                {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r].label}</option>
                ))}
              </select>
            </div>
            {!userForm.editing && (
              <div>
                <label className="label">密码 <span className="text-danger-500">*</span></label>
                <input
                  type="password"
                  className="input"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder="请设置初始密码"
                  disabled={submittingUser}
                />
              </div>
            )}
            <div>
              <label className="label">手机号 <span className="text-danger-500">*</span></label>
              <input
                type="tel"
                className="input"
                value={userForm.phone}
                onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                placeholder="请输入手机号"
                disabled={submittingUser}
              />
            </div>
            <div>
              <label className="label">所属校区</label>
              <select
                className="input"
                value={userForm.campusId}
                onChange={(e) => setUserForm({ ...userForm, campusId: e.target.value ? Number(e.target.value) : '' })}
                disabled={submittingUser}
              >
                <option value="">请选择校区</option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <ModalFooter
            onCancel={() => setUserForm({ ...userForm, open: false })}
            onConfirm={handleSubmitUser}
            confirmText={userForm.editing ? '保存修改' : '创建用户'}
            loading={submittingUser}
          />
        </ModalDialog>
      )}

      {campusForm.open && (
        <ModalDialog
          title={campusForm.editing ? '编辑校区' : '新增校区'}
          onClose={() => !submittingCampus && setCampusForm({ ...campusForm, open: false })}
        >
          <div className="space-y-4">
            <div>
              <label className="label">校区名称 <span className="text-danger-500">*</span></label>
              <input
                type="text"
                className="input"
                value={campusForm.name}
                onChange={(e) => setCampusForm({ ...campusForm, name: e.target.value })}
                placeholder="请输入校区名称"
                disabled={submittingCampus}
              />
            </div>
            <div>
              <label className="label">地址</label>
              <input
                type="text"
                className="input"
                value={campusForm.address}
                onChange={(e) => setCampusForm({ ...campusForm, address: e.target.value })}
                placeholder="请输入校区地址"
                disabled={submittingCampus}
              />
            </div>
            <div>
              <label className="label">联系电话</label>
              <input
                type="tel"
                className="input"
                value={campusForm.phone}
                onChange={(e) => setCampusForm({ ...campusForm, phone: e.target.value })}
                placeholder="请输入联系电话"
                disabled={submittingCampus}
              />
            </div>
            <div>
              <label className="label">状态</label>
              <select
                className="input"
                value={campusForm.status}
                onChange={(e) => setCampusForm({ ...campusForm, status: e.target.value as 'active' | 'inactive' })}
                disabled={submittingCampus}
              >
                <option value="active">运营中</option>
                <option value="inactive">已停用</option>
              </select>
            </div>
          </div>
          <ModalFooter
            onCancel={() => setCampusForm({ ...campusForm, open: false })}
            onConfirm={handleSubmitCampus}
            confirmText={campusForm.editing ? '保存修改' : '创建校区'}
            loading={submittingCampus}
          />
        </ModalDialog>
      )}

      {dictForm.open && (
        <ModalDialog
          title={dictForm.editing ? '编辑字典项' : '新增字典项'}
          onClose={() => !submittingDict && setDictForm({ ...dictForm, open: false })}
        >
          <div className="space-y-4">
            <div>
              <label className="label">Key <span className="text-danger-500">*</span></label>
              <input
                type="text"
                className="input font-mono"
                value={dictForm.key}
                onChange={(e) => setDictForm({ ...dictForm, key: e.target.value })}
                placeholder="请输入唯一标识 Key"
                disabled={submittingDict || !!dictForm.editing}
              />
            </div>
            <div>
              <label className="label">Value <span className="text-danger-500">*</span></label>
              <input
                type="text"
                className="input"
                value={dictForm.value}
                onChange={(e) => setDictForm({ ...dictForm, value: e.target.value })}
                placeholder="请输入显示名称"
                disabled={submittingDict}
              />
            </div>
            <div>
              <label className="label">排序</label>
              <input
                type="number"
                className="input"
                value={dictForm.sort}
                onChange={(e) => setDictForm({ ...dictForm, sort: parseInt(e.target.value) || 0 })}
                placeholder="数字越小越靠前"
                disabled={submittingDict}
              />
            </div>
          </div>
          <ModalFooter
            onCancel={() => setDictForm({ ...dictForm, open: false })}
            onConfirm={handleSubmitDict}
            confirmText={dictForm.editing ? '保存修改' : '创建字典项'}
            loading={submittingDict}
          />
        </ModalDialog>
      )}

      <ConfirmDialog
        open={userActionDialog.open}
        title={
          userActionDialog.action === 'toggle'
            ? userActionDialog.user?.status === 'active' ? '禁用用户确认' : '启用用户确认'
            : '重置密码确认'
        }
        description={
          userActionDialog.action === 'toggle'
            ? `确定要${userActionDialog.user?.status === 'active' ? '禁用' : '启用'}用户「${userActionDialog.user?.name}」吗？`
            : `确定要将用户「${userActionDialog.user?.name}」的密码重置为 123456 吗？`
        }
        confirmText={userActionDialog.action === 'toggle' ? (userActionDialog.user?.status === 'active' ? '禁用' : '启用') : '重置密码'}
        confirmVariant={userActionDialog.action === 'toggle' && userActionDialog.user?.status === 'active' ? 'danger' : 'primary'}
        loading={processingUserAction}
        onConfirm={handleUserAction}
        onCancel={() => !processingUserAction && setUserActionDialog({ open: false, user: null, action: 'toggle' })}
      />

      <ConfirmDialog
        open={deleteDialog.open}
        title="删除确认"
        description={`确定要删除「${deleteDialog.name}」吗？此操作不可恢复。`}
        confirmText="确认删除"
        confirmVariant="danger"
        loading={processingDelete}
        onConfirm={handleDelete}
        onCancel={() => !processingDelete && setDeleteDialog({ open: false, type: 'dict', id: null, name: '' })}
      />
    </div>
  );
}

interface ModalDialogProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}

function ModalDialog({ title, children, onClose }: ModalDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-card p-6 w-full max-w-md animate-scale-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-ink-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-ink-100 text-ink-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

interface ModalFooterProps {
  onCancel: () => void;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
}

function ModalFooter({
  onCancel,
  onConfirm,
  confirmText = '确认',
  cancelText = '取消',
  loading = false,
}: ModalFooterProps) {
  return (
    <div className="flex items-center justify-end gap-2 mt-6">
      <button
        onClick={onCancel}
        disabled={loading}
        className="px-4 py-2.5 rounded-xl text-sm font-medium text-ink-700 bg-ink-100 hover:bg-ink-200 transition-colors disabled:opacity-50"
      >
        {cancelText}
      </button>
      <button
        onClick={onConfirm}
        disabled={loading}
        className="btn-primary"
      >
        {loading ? '处理中...' : confirmText}
      </button>
    </div>
  );
}
