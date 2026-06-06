import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  Plus,
  User,
  Phone,
  X,
  Edit3,
  Sparkles,
  BarChart3,
  Star,
  Trash2,
  Plus as PlusIcon,
  Filter,
  ChevronDown,
  Upload,
  AlertCircle,
} from 'lucide-react';
import { childrenApi, classesApi, settingsApi } from '@/api';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useAuthStore } from '@/store/authStore';
import { showToast } from '@/components/ui/Toast';
import type {
  Child,
  Guardian,
  DevelopmentScore,
  ClassInfo,
  Campus,
} from '@shared/types';
import { cn } from '@/lib/utils';

const AVATAR_COLORS = [
  'bg-primary-100 text-primary-600',
  'bg-accent-100 text-accent-600',
  'bg-success-100 text-success-600',
  'bg-warning-100 text-warning-600',
  'bg-danger-100 text-danger-600',
];

const ALLERGY_OPTIONS = ['牛奶', '鸡蛋', '花生', '海鲜', '小麦', '坚果', '大豆'];

const getAvatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('zh-CN');
};

const calcAge = (birthDate: string) => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

interface FormState {
  name: string;
  gender: 'male' | 'female';
  birthDate: string;
  campusId: number;
  classId?: number;
  allergies: string[];
  medicalHistory: string;
  guardians: Guardian[];
  developmentScore: DevelopmentScore;
}

const emptyForm: FormState = {
  name: '',
  gender: 'male',
  birthDate: '',
  campusId: 0,
  classId: undefined,
  allergies: [],
  medicalHistory: '',
  guardians: [],
  developmentScore: { language: 0, motor: 0, social: 0, cognitive: 0, overall: 0 },
};

function StarRating({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-ink-700">{label}</span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className="p-0.5 hover:scale-110 transition-transform"
          >
            <Star
              className={cn(
                'w-5 h-5',
                n <= value
                  ? 'fill-warning-400 text-warning-400'
                  : 'text-ink-300'
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function GuardianCard({
  guardian,
  index,
  onChange,
  onRemove,
}: {
  guardian: Guardian;
  index: number;
  onChange: (g: Guardian) => void;
  onRemove: () => void;
}) {
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onChange({ ...guardian, photo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="border border-ink-200 rounded-xl p-4 space-y-3 bg-ink-50/50">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink-700">
          接送人 {index + 1}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="text-danger-500 hover:text-danger-600 p-1"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          {guardian.photo ? (
            <img
              src={guardian.photo}
              alt={guardian.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-primary-200"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-ink-200 flex items-center justify-center">
              <User className="w-8 h-8 text-ink-400" />
            </div>
          )}
          <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-primary-600 transition-colors">
            <Upload className="w-3.5 h-3.5 text-white" />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </label>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-2">
          <input
            type="text"
            placeholder="姓名"
            value={guardian.name}
            onChange={(e) => onChange({ ...guardian, name: e.target.value })}
            className="px-3 py-2 rounded-lg border border-ink-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
          <input
            type="text"
            placeholder="关系"
            value={guardian.relation}
            onChange={(e) =>
              onChange({ ...guardian, relation: e.target.value })
            }
            className="px-3 py-2 rounded-lg border border-ink-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
          <input
            type="tel"
            placeholder="联系电话"
            value={guardian.phone}
            onChange={(e) => onChange({ ...guardian, phone: e.target.value })}
            className="px-3 py-2 rounded-lg border border-ink-200 text-sm col-span-2 focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>
      </div>
    </div>
  );
}

export default function Children() {
  const { user } = useAuthStore();
  const isParent = user?.role === 'parent';

  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [campusFilter, setCampusFilter] = useState<number | ''>('');
  const [classFilter, setClassFilter] = useState<number | ''>('');
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);

  const [selected, setSelected] = useState<Child | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Child | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [customAllergy, setCustomAllergy] = useState('');

  const [deleteDialog, setDeleteDialog] = useState<Child | null>(null);
  const [assessDialog, setAssessDialog] = useState<Child | null>(null);
  const [assessScore, setAssessScore] = useState<DevelopmentScore>({
    language: 0,
    motor: 0,
    social: 0,
    cognitive: 0,
    overall: 0,
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = {};
      if (isParent && user?.childIds) {
        params.ids = user.childIds;
      }
      const [childrenData, campusesData, classesData] = await Promise.all([
        childrenApi.list(params),
        settingsApi.campusList(),
        classesApi.list(),
      ]);
      setChildren(childrenData);
      setCampuses(campusesData);
      setClasses(classesData);
    } catch {
      showToast('加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [isParent, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredChildren = useMemo(() => {
    return children.filter((c) => {
      if (search && !c.name.includes(search)) return false;
      if (campusFilter !== '' && c.campusId !== campusFilter) return false;
      if (classFilter !== '' && c.classId !== classFilter) return false;
      return true;
    });
  }, [children, search, campusFilter, classFilter]);

  const openNewForm = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      campusId: campuses[0]?.id || 0,
    });
    setCustomAllergy('');
    setFormOpen(true);
  };

  const openEditForm = (child: Child) => {
    setEditing(child);
    setForm({
      name: child.name,
      gender: child.gender,
      birthDate: child.birthDate,
      campusId: child.campusId,
      classId: child.classId,
      allergies: [...child.allergies],
      medicalHistory: child.medicalHistory || '',
      guardians: child.guardians.map((g) => ({ ...g })),
      developmentScore: child.developmentScore || {
        ...emptyForm.developmentScore,
      },
    });
    setCustomAllergy('');
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      showToast('请输入姓名', 'warning');
      return;
    }
    if (!form.birthDate) {
      showToast('请选择生日', 'warning');
      return;
    }
    if (!form.campusId) {
      showToast('请选择校区', 'warning');
      return;
    }

    try {
      const payload = {
        ...form,
        age: calcAge(form.birthDate),
        status: 'active' as const,
      };

      if (editing) {
        await childrenApi.update(editing.id, payload);
        showToast('更新成功', 'success');
      } else {
        await childrenApi.create(payload);
        showToast('创建成功', 'success');
      }
      setFormOpen(false);
      fetchData();
    } catch {
      showToast('操作失败', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;
    try {
      await childrenApi.remove(deleteDialog.id);
      showToast('已删除', 'success');
      setDeleteDialog(null);
      setDetailOpen(false);
      fetchData();
    } catch {
      showToast('删除失败', 'error');
    }
  };

  const handleRecommend = async (child: Child) => {
    try {
      const recommended = await childrenApi.recommendClass(child.id);
      showToast(`推荐班级：${recommended.name}`, 'success');
    } catch {
      showToast('推荐失败', 'error');
    }
  };

  const handleAssess = async () => {
    if (!assessDialog) return;
    try {
      const overall = Math.round(
        (assessScore.language +
          assessScore.motor +
          assessScore.social +
          assessScore.cognitive) /
          4
      );
      await childrenApi.assess(assessDialog.id, {
        ...assessScore,
        overall,
      });
      showToast('评估完成', 'success');
      setAssessDialog(null);
      fetchData();
    } catch {
      showToast('评估失败', 'error');
    }
  };

  const toggleAllergy = (allergy: string) => {
    setForm((f) =>
      f.allergies.includes(allergy)
        ? { ...f, allergies: f.allergies.filter((a) => a !== allergy) }
        : { ...f, allergies: [...f.allergies, allergy] }
    );
  };

  const addCustomAllergy = () => {
    if (customAllergy.trim() && !form.allergies.includes(customAllergy.trim())) {
      setForm((f) => ({ ...f, allergies: [...f.allergies, customAllergy.trim()] }));
      setCustomAllergy('');
    }
  };

  const addGuardian = () => {
    setForm((f) => ({
      ...f,
      guardians: [
        ...f.guardians,
        { id: Date.now(), name: '', relation: '', phone: '', photo: '' },
      ],
    }));
  };

  const updateGuardian = (index: number, g: Guardian) => {
    setForm((f) => {
      const guardians = [...f.guardians];
      guardians[index] = g;
      return { ...f, guardians };
    });
  };

  const removeGuardian = (index: number) => {
    setForm((f) => ({
      ...f,
      guardians: f.guardians.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="幼儿档案"
        subtitle={isParent ? '查看您孩子的档案信息' : '管理园区所有幼儿信息'}
        actions={
          <>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                placeholder="搜索幼儿姓名..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-xl border border-ink-200 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
            </div>
            {!isParent && (
              <>
                <div className="relative">
                  <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
                  <select
                    value={campusFilter}
                    onChange={(e) =>
                      setCampusFilter(
                        e.target.value === '' ? '' : Number(e.target.value)
                      )
                    }
                    className="pl-9 pr-8 py-2 rounded-xl border border-ink-200 text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
                  >
                    <option value="">全部校区</option>
                    {campuses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
                </div>
                <div className="relative">
                  <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
                  <select
                    value={classFilter}
                    onChange={(e) =>
                      setClassFilter(
                        e.target.value === '' ? '' : Number(e.target.value)
                      )
                    }
                    className="pl-9 pr-8 py-2 rounded-xl border border-ink-200 text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-primary-300"
                  >
                    <option value="">全部班级</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
                </div>
                <button
                  onClick={openNewForm}
                  className="px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors flex items-center gap-2 shadow-soft"
                >
                  <Plus className="w-4 h-4" />
                  新增幼儿
                </button>
              </>
            )}
          </>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredChildren.length === 0 ? (
        <EmptyState
          title="暂无幼儿数据"
          description={isParent ? '您还没有绑定任何孩子' : '点击"新增幼儿"按钮添加第一个幼儿'}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredChildren.map((child) => (
            <div
              key={child.id}
              onClick={() => {
                setSelected(child);
                setDetailOpen(true);
              }}
              className="bg-white rounded-2xl p-5 shadow-card hover:shadow-float transition-all cursor-pointer group border border-ink-100 hover:border-primary-200"
            >
              <div className="flex items-start gap-3 mb-4">
                {child.avatar ? (
                  <img
                    src={child.avatar}
                    alt={child.name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-soft"
                  />
                ) : (
                  <div
                    className={cn(
                      'w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold',
                      getAvatarColor(child.name)
                    )}
                  >
                    {child.name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-ink-900 truncate">
                      {child.name}
                    </h3>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-medium',
                        child.status === 'active'
                          ? 'bg-success-100 text-success-700'
                          : child.status === 'suspended'
                          ? 'bg-warning-100 text-warning-700'
                          : 'bg-ink-100 text-ink-600'
                      )}
                    >
                      {child.status === 'active'
                        ? '在园'
                        : child.status === 'suspended'
                        ? '休学'
                        : '毕业'}
                    </span>
                  </div>
                  <p className="text-sm text-ink-500 mt-0.5">
                    {child.gender === 'male' ? '男' : '女'} · {child.age}岁
                  </p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-ink-600">
                  <User className="w-3.5 h-3.5 text-ink-400" />
                  <span>{child.className || '未分班'}</span>
                </div>
                {child.allergies.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {child.allergies.slice(0, 3).map((a) => (
                      <span
                        key={a}
                        className="px-2 py-0.5 bg-danger-100 text-danger-700 rounded-full text-xs"
                      >
                        {a}过敏
                      </span>
                    ))}
                    {child.allergies.length > 3 && (
                      <span className="px-2 py-0.5 bg-danger-50 text-danger-600 rounded-full text-xs">
                        +{child.allergies.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {detailOpen && selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setDetailOpen(false)}
          />
          <div className="relative w-full max-w-md bg-white shadow-float animate-slide-up overflow-y-auto">
            <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-ink-100 p-5 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-ink-900">幼儿详情</h2>
              <button
                onClick={() => setDetailOpen(false)}
                className="p-2 rounded-lg hover:bg-ink-100 text-ink-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-6">
              <div className="flex items-center gap-4">
                {selected.avatar ? (
                  <img
                    src={selected.avatar}
                    alt={selected.name}
                    className="w-20 h-20 rounded-full object-cover border-4 border-primary-100"
                  />
                ) : (
                  <div
                    className={cn(
                      'w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold border-4 border-white shadow-soft',
                      getAvatarColor(selected.name)
                    )}
                  >
                    {selected.name.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold text-ink-900">
                    {selected.name}
                  </h3>
                  <p className="text-ink-500 text-sm mt-1">
                    {selected.gender === 'male' ? '男' : '女'} · {selected.age}岁 ·{' '}
                    {formatDate(selected.birthDate)}
                  </p>
                  <p className="text-ink-500 text-sm">
                    {campuses.find((c) => c.id === selected.campusId)?.name ||
                      '未知校区'}
                    {' · '}
                    {selected.className || '未分班'}
                  </p>
                </div>
              </div>

              {selected.allergies.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-ink-900 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-danger-500" />
                    过敏史
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selected.allergies.map((a) => (
                      <span
                        key={a}
                        className="px-3 py-1 bg-danger-100 text-danger-700 rounded-full text-sm"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selected.medicalHistory && (
                <div>
                  <h4 className="text-sm font-semibold text-ink-900 mb-2">
                    病史
                  </h4>
                  <p className="text-ink-600 text-sm bg-ink-50 rounded-xl p-3">
                    {selected.medicalHistory}
                  </p>
                </div>
              )}

              <div>
                <h4 className="text-sm font-semibold text-ink-900 mb-3">
                  接送人 ({selected.guardians.length})
                </h4>
                <div className="space-y-3">
                  {selected.guardians.length === 0 ? (
                    <p className="text-ink-400 text-sm">暂无接送人信息</p>
                  ) : (
                    selected.guardians.map((g) => (
                      <div
                        key={g.id}
                        className="flex items-center gap-3 p-3 bg-ink-50 rounded-xl"
                      >
                        {g.photo ? (
                          <img
                            src={g.photo}
                            alt={g.name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-white"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-accent-100 flex items-center justify-center">
                            <User className="w-6 h-6 text-accent-600" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-ink-900 text-sm">
                            {g.name || '未命名'}
                          </p>
                          <p className="text-ink-500 text-xs">
                            {g.relation || '关系未设置'}
                          </p>
                        </div>
                        <a
                          href={`tel:${g.phone}`}
                          className="p-2 rounded-lg bg-primary-100 text-primary-600 hover:bg-primary-200 transition-colors"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-ink-900 mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-accent-500" />
                  发展评估
                </h4>
                {selected.developmentScore ? (
                  <div className="space-y-2 bg-gradient-to-br from-accent-50 to-primary-50 rounded-xl p-4">
                    {[
                      { key: 'language', label: '语言能力' },
                      { key: 'motor', label: '运动能力' },
                      { key: 'social', label: '社交能力' },
                      { key: 'cognitive', label: '认知能力' },
                    ].map((d) => (
                      <div
                        key={d.key}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm text-ink-600">
                          {d.label}
                        </span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star
                              key={n}
                              className={cn(
                                'w-4 h-4',
                                n <=
                                (selected.developmentScore?.[
                                  d.key as keyof DevelopmentScore
                                ] || 0)
                                  ? 'fill-warning-400 text-warning-400'
                                  : 'text-ink-200'
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                    <div className="pt-2 mt-2 border-t border-ink-200/60 flex items-center justify-between">
                      <span className="text-sm font-medium text-ink-700">
                        综合评分
                      </span>
                      <span className="text-lg font-bold text-primary-600">
                        {selected.developmentScore.overall}/5
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-ink-400 text-sm bg-ink-50 rounded-xl p-4 text-center">
                    暂无评估数据
                  </p>
                )}
              </div>

              {!isParent && (
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <button
                    onClick={() => openEditForm(selected)}
                    className="flex flex-col items-center gap-1 py-3 rounded-xl bg-ink-50 hover:bg-ink-100 text-ink-700 transition-colors"
                  >
                    <Edit3 className="w-5 h-5" />
                    <span className="text-xs">编辑</span>
                  </button>
                  <button
                    onClick={() => handleRecommend(selected)}
                    className="flex flex-col items-center gap-1 py-3 rounded-xl bg-accent-50 hover:bg-accent-100 text-accent-700 transition-colors"
                  >
                    <Sparkles className="w-5 h-5" />
                    <span className="text-xs">分班推荐</span>
                  </button>
                  <button
                    onClick={() => {
                      setAssessDialog(selected);
                      setAssessScore(
                        selected.developmentScore || {
                          language: 0,
                          motor: 0,
                          social: 0,
                          cognitive: 0,
                          overall: 0,
                        }
                      );
                    }}
                    className="flex flex-col items-center gap-1 py-3 rounded-xl bg-primary-50 hover:bg-primary-100 text-primary-700 transition-colors"
                  >
                    <BarChart3 className="w-5 h-5" />
                    <span className="text-xs">发展评估</span>
                  </button>
                  <button
                    onClick={() => setDeleteDialog(selected)}
                    className="col-span-3 flex items-center justify-center gap-2 py-3 rounded-xl bg-danger-50 hover:bg-danger-100 text-danger-600 transition-colors mt-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-sm">删除档案</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setFormOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-card w-full max-w-2xl max-h-[90vh] overflow-hidden animate-scale-in">
            <div className="sticky top-0 bg-white border-b border-ink-100 p-5 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-ink-900">
                {editing ? '编辑幼儿档案' : '新增幼儿档案'}
              </h2>
              <button
                onClick={() => setFormOpen(false)}
                className="p-2 rounded-lg hover:bg-ink-100 text-ink-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">
                    姓名 *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-ink-200 focus:outline-none focus:ring-2 focus:ring-primary-300"
                    placeholder="请输入幼儿姓名"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">
                    性别 *
                  </label>
                  <div className="flex gap-2">
                    {(['male', 'female'] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setForm({ ...form, gender: g })}
                        className={cn(
                          'flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors border',
                          form.gender === g
                            ? g === 'male'
                              ? 'bg-primary-500 text-white border-primary-500'
                              : 'bg-accent-500 text-white border-accent-500'
                            : 'bg-white text-ink-600 border-ink-200 hover:bg-ink-50'
                        )}
                      >
                        {g === 'male' ? '男' : '女'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">
                    出生日期 *
                  </label>
                  <input
                    type="date"
                    value={form.birthDate}
                    onChange={(e) =>
                      setForm({ ...form, birthDate: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-ink-200 focus:outline-none focus:ring-2 focus:ring-primary-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">
                    校区 *
                  </label>
                  <select
                    value={form.campusId}
                    onChange={(e) =>
                      setForm({ ...form, campusId: Number(e.target.value) })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-ink-200 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
                  >
                    <option value={0}>请选择校区</option>
                    {campuses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">
                    班级
                  </label>
                  <select
                    value={form.classId || ''}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        classId: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-ink-200 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
                  >
                    <option value="">暂不分配</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.teacherName || '未分配老师'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-700 mb-2">
                  过敏史
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {ALLERGY_OPTIONS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleAllergy(a)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm transition-colors',
                        form.allergies.includes(a)
                          ? 'bg-danger-500 text-white'
                          : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
                      )}
                    >
                      {a}
                    </button>
                  ))}
                  {form.allergies
                    .filter((a) => !ALLERGY_OPTIONS.includes(a))
                    .map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => toggleAllergy(a)}
                        className="px-3 py-1.5 rounded-full text-sm bg-danger-500 text-white"
                      >
                        {a} ×
                      </button>
                    ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customAllergy}
                    onChange={(e) => setCustomAllergy(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addCustomAllergy();
                    }}
                    placeholder="自定义过敏源"
                    className="flex-1 px-4 py-2 rounded-xl border border-ink-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                  />
                  <button
                    type="button"
                    onClick={addCustomAllergy}
                    className="px-4 py-2 rounded-xl bg-ink-100 hover:bg-ink-200 text-ink-700 text-sm"
                  >
                    添加
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">
                  病史备注
                </label>
                <textarea
                  value={form.medicalHistory}
                  onChange={(e) =>
                    setForm({ ...form, medicalHistory: e.target.value })
                  }
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-ink-200 focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
                  placeholder="如有特殊病史请填写..."
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-ink-700">
                    接送人
                  </label>
                  <button
                    type="button"
                    onClick={addGuardian}
                    className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    <PlusIcon className="w-4 h-4" />
                    添加接送人
                  </button>
                </div>
                <div className="space-y-3">
                  {form.guardians.length === 0 && (
                    <p className="text-ink-400 text-sm text-center py-6 bg-ink-50 rounded-xl">
                      暂无接送人，点击上方按钮添加
                    </p>
                  )}
                  {form.guardians.map((g, i) => (
                    <GuardianCard
                      key={g.id}
                      guardian={g}
                      index={i}
                      onChange={(ng) => updateGuardian(i, ng)}
                      onRemove={() => removeGuardian(i)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-700 mb-3">
                  发展评估量表
                </label>
                <div className="bg-gradient-to-br from-accent-50 to-primary-50 rounded-xl p-4 space-y-3">
                  <StarRating
                    label="语言能力"
                    value={form.developmentScore.language}
                    onChange={(v) =>
                      setForm({
                        ...form,
                        developmentScore: {
                          ...form.developmentScore,
                          language: v,
                        },
                      })
                    }
                  />
                  <StarRating
                    label="运动能力"
                    value={form.developmentScore.motor}
                    onChange={(v) =>
                      setForm({
                        ...form,
                        developmentScore: {
                          ...form.developmentScore,
                          motor: v,
                        },
                      })
                    }
                  />
                  <StarRating
                    label="社交能力"
                    value={form.developmentScore.social}
                    onChange={(v) =>
                      setForm({
                        ...form,
                        developmentScore: {
                          ...form.developmentScore,
                          social: v,
                        },
                      })
                    }
                  />
                  <StarRating
                    label="认知能力"
                    value={form.developmentScore.cognitive}
                    onChange={(v) =>
                      setForm({
                        ...form,
                        developmentScore: {
                          ...form.developmentScore,
                          cognitive: v,
                        },
                      })
                    }
                  />
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-ink-100 p-5 flex justify-end gap-2">
              <button
                onClick={() => setFormOpen(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-ink-700 bg-ink-100 hover:bg-ink-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 transition-colors shadow-soft"
              >
                {editing ? '保存修改' : '创建档案'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteDialog}
        title="确认删除"
        description={`确定要删除幼儿"${deleteDialog?.name}"的档案吗？此操作不可恢复。`}
        confirmText="删除"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog(null)}
      />

      {assessDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setAssessDialog(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-card w-full max-w-md p-6 animate-scale-in">
            <h3 className="text-lg font-semibold text-ink-900 mb-4">
              发展评估 - {assessDialog.name}
            </h3>
            <div className="space-y-3">
              <StarRating
                label="语言能力"
                value={assessScore.language}
                onChange={(v) => setAssessScore({ ...assessScore, language: v })}
              />
              <StarRating
                label="运动能力"
                value={assessScore.motor}
                onChange={(v) => setAssessScore({ ...assessScore, motor: v })}
              />
              <StarRating
                label="社交能力"
                value={assessScore.social}
                onChange={(v) => setAssessScore({ ...assessScore, social: v })}
              />
              <StarRating
                label="认知能力"
                value={assessScore.cognitive}
                onChange={(v) =>
                  setAssessScore({ ...assessScore, cognitive: v })
                }
              />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setAssessDialog(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-ink-700 bg-ink-100 hover:bg-ink-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAssess}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 transition-colors"
              >
                提交评估
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
