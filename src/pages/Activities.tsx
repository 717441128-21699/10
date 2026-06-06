import { useState, useEffect, useMemo } from 'react';
import {
  PartyPopper,
  Users,
  Package,
  Plus,
  Download,
  Calendar,
  MapPin,
  Clock,
  X,
  Trash2,
  Check,
  AlertCircle,
} from 'lucide-react';
import type { Activity, ActivityMaterial, ActivityRegistration, Child, ClassInfo } from '@shared/types';
import { activitiesApi, childrenApi, classesApi } from '@/api';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useAuthStore } from '@/store/authStore';
import { showToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

type ActivityStatus = 'ongoing' | 'full' | 'ended';

function getActivityStatus(activity: Activity): ActivityStatus {
  const now = Date.now();
  const activityDate = new Date(activity.date).getTime();
  if (activityDate < now) return 'ended';
  if (activity.registrations.length >= activity.maxParticipants) return 'full';
  return 'ongoing';
}

function getStatusLabel(status: ActivityStatus): { label: string; className: string } {
  switch (status) {
    case 'ongoing':
      return { label: '进行中', className: 'bg-success-100 text-success-700' };
    case 'full':
      return { label: '已满员', className: 'bg-warning-100 text-warning-700' };
    case 'ended':
      return { label: '已结束', className: 'bg-ink-100 text-ink-600' };
  }
}

const COVER_GRADIENTS = [
  'from-primary-400 via-primary-500 to-accent-500',
  'from-accent-400 via-accent-500 to-primary-500',
  'from-warning-400 via-primary-400 to-danger-400',
  'from-success-400 via-accent-500 to-primary-400',
  'from-danger-400 via-warning-400 to-primary-400',
];

function DetailDialog({
  activity,
  onClose,
  myChildren,
  isParent,
  onRegister,
  onCancelRegister,
  onExportMaterials,
  registrations,
}: {
  activity: Activity | null;
  onClose: () => void;
  myChildren: Child[];
  isParent: boolean;
  onRegister: (childId: number) => void;
  onCancelRegister: (registrationId: number) => void;
  onExportMaterials: () => void;
  registrations: ActivityRegistration[];
}) {
  if (!activity) return null;

  const status = getActivityStatus(activity);
  const statusInfo = getStatusLabel(status);
  const gradient = COVER_GRADIENTS[activity.id % COVER_GRADIENTS.length];

  const registeredChildIds = useMemo(() => {
    return new Set(registrations.map((r) => r.childId));
  }, [registrations]);

  const availableChildren = myChildren.filter((c) => !registeredChildIds.has(c.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-card w-full max-w-3xl max-h-[90vh] overflow-hidden animate-scale-in flex flex-col">
        <div className={cn('relative h-48 bg-gradient-to-br', gradient)}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="absolute bottom-4 left-6 right-6">
            <span className={cn('badge mb-2', statusInfo.className)}>{statusInfo.label}</span>
            <h2 className="text-2xl font-display text-white">{activity.title}</h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex flex-wrap items-center gap-4 mb-5 text-sm text-ink-600">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-primary-500" />
              {new Date(activity.date).toLocaleDateString('zh-CN')}
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-accent-500" />
              {activity.location}
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-success-500" />
              {activity.registrations.length}/{activity.maxParticipants} 人
            </div>
          </div>

          <div className="mb-6">
            <h4 className="text-sm font-semibold text-ink-900 mb-2">活动描述</h4>
            <p className="text-ink-700 leading-relaxed whitespace-pre-wrap">{activity.description}</p>
          </div>

          {activity.registrations.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-ink-900 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary-500" />
                报名名单（{activity.registrations.length}人）
              </h4>
              <div className="flex flex-wrap gap-3">
                {activity.registrations.map((reg) => (
                  <div
                    key={reg.id}
                    className="flex items-center gap-2 px-3 py-2 bg-warm-50 rounded-xl"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white text-xs font-semibold">
                      {(reg.childName || '?').charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink-900">{reg.childName}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activity.materials && activity.materials.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-ink-900 flex items-center gap-2">
                  <Package className="w-4 h-4 text-warning-500" />
                  物资清单
                </h4>
                <button onClick={onExportMaterials} className="btn-outline !py-1.5 !px-3 text-sm">
                  <Download className="w-4 h-4" />
                  导出清单
                </button>
              </div>
              <div className="overflow-x-auto rounded-xl border border-ink-200">
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="bg-warm-50">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-ink-600">物资名</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-ink-600">每人数量</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-ink-600">单位</th>
                      <th className="px-4 py-2.5 text-center text-xs font-semibold text-ink-600">总数量</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-ink-600">备注</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {activity.materials.map((m, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2.5 text-sm font-medium text-ink-900">{m.name}</td>
                        <td className="px-4 py-2.5 text-sm text-center text-ink-700">{m.quantityPerPerson}</td>
                        <td className="px-4 py-2.5 text-sm text-center text-ink-700">{m.unit}</td>
                        <td className="px-4 py-2.5 text-sm text-center font-semibold text-primary-600">{m.totalQuantity}</td>
                        <td className="px-4 py-2.5 text-sm text-ink-500">{m.note || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {isParent && (
            <div className="p-4 bg-warm-50 rounded-2xl">
              <h4 className="text-sm font-semibold text-ink-900 mb-3">我的报名</h4>
              {myChildren.length === 0 ? (
                <p className="text-sm text-ink-500">暂无关联孩子</p>
              ) : (
                <div className="space-y-2">
                  {myChildren.map((child) => {
                    const isRegistered = registeredChildIds.has(child.id);
                    const reg = registrations.find((r) => r.childId === child.id);
                    return (
                      <div
                        key={child.id}
                        className="flex items-center justify-between p-3 bg-white rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white font-semibold">
                            {child.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-ink-900">{child.name}</p>
                            <p className="text-xs text-ink-500">{child.className || '未分班'}</p>
                          </div>
                        </div>
                        {isRegistered && reg ? (
                          <div className="flex items-center gap-2">
                            <span className="badge bg-success-100 text-success-700">
                              <Check className="w-3 h-3 mr-1" />
                              已报名
                            </span>
                            {status !== 'ended' && (
                              <button
                                onClick={() => onCancelRegister(reg.id)}
                                className="btn-ghost !py-1.5 !px-3 text-sm text-danger-600 hover:bg-danger-50"
                              >
                                取消报名
                              </button>
                            )}
                          </div>
                        ) : (status as ActivityStatus) === 'ongoing' ? (
                          <button
                            onClick={() => onRegister(child.id)}
                            className="btn-primary !py-1.5 !px-4 text-sm"
                          >
                            我要报名
                          </button>
                        ) : (
                          <span className="badge bg-ink-100 text-ink-600">不可报名</span>
                        )}
                      </div>
                    );
                  })}
                  {availableChildren.length > 0 && status === 'full' && (
                    <p className="text-xs text-warning-600 flex items-center gap-1 mt-2">
                      <AlertCircle className="w-3.5 h-3.5" />
                      活动名额已满，无法继续报名
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateDialog({
  open,
  onClose,
  onSubmit,
  classes,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    date: string;
    location: string;
    classIds: number[];
    maxParticipants: number;
    materials: ActivityMaterial[];
  }) => void;
  classes: ClassInfo[];
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [selectedClasses, setSelectedClasses] = useState<number[]>([]);
  const [maxParticipants, setMaxParticipants] = useState(30);
  const [materials, setMaterials] = useState<ActivityMaterial[]>([
    { name: '', quantityPerPerson: 1, unit: '个', totalQuantity: 0, note: '' },
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setDate('');
      setLocation('');
      setSelectedClasses([]);
      setMaxParticipants(30);
      setMaterials([{ name: '', quantityPerPerson: 1, unit: '个', totalQuantity: 0, note: '' }]);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!title.trim() || !date || !location.trim()) {
      showToast('请填写必填项', 'warning');
      return;
    }
    const validMaterials = materials.filter((m) => m.name.trim());
    setLoading(true);
    await onSubmit({
      title: title.trim(),
      description: description.trim(),
      date,
      location: location.trim(),
      classIds: selectedClasses,
      maxParticipants,
      materials: validMaterials,
    });
    setLoading(false);
  };

  const addMaterial = () => {
    setMaterials([...materials, { name: '', quantityPerPerson: 1, unit: '个', totalQuantity: 0, note: '' }]);
  };

  const removeMaterial = (idx: number) => {
    setMaterials(materials.filter((_, i) => i !== idx));
  };

  const updateMaterial = (idx: number, field: keyof ActivityMaterial, value: string | number) => {
    const newMaterials = [...materials];
    (newMaterials[idx] as unknown as Record<string, unknown>)[field] = value;
    if (field === 'quantityPerPerson') {
      newMaterials[idx].totalQuantity = (Number(value) || 0) * maxParticipants;
    }
    setMaterials(newMaterials);
  };

  const toggleClass = (classId: number) => {
    setSelectedClasses((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-card w-full max-w-2xl max-h-[90vh] overflow-hidden animate-scale-in flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-ink-100">
          <h3 className="text-xl font-display text-ink-900 flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary-500" />
            发布活动
          </h3>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-ink-100 flex items-center justify-center text-ink-400 hover:text-ink-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <label className="label">活动标题 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：春季亲子运动会"
              className="input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">活动日期 *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">活动地点 *</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="例如：幼儿园操场"
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label">参与班级</label>
            <div className="flex flex-wrap gap-2 p-3 bg-warm-50 rounded-xl">
              {classes.length === 0 ? (
                <p className="text-sm text-ink-500">暂无班级</p>
              ) : (
                classes.map((cls) => (
                  <button
                    key={cls.id}
                    onClick={() => toggleClass(cls.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                      selectedClasses.includes(cls.id)
                        ? 'bg-primary-500 text-white shadow-soft'
                        : 'bg-white text-ink-600 hover:bg-primary-50 border border-ink-200'
                    )}
                  >
                    {cls.name}
                  </button>
                ))
              )}
            </div>
          </div>

          <div>
            <label className="label">最大参与人数</label>
            <input
              type="number"
              value={maxParticipants}
              onChange={(e) => {
                const val = Number(e.target.value) || 0;
                setMaxParticipants(val);
                setMaterials((prev) =>
                  prev.map((m) => ({ ...m, totalQuantity: m.quantityPerPerson * val }))
                );
              }}
              min={1}
              className="input"
            />
          </div>

          <div>
            <label className="label">活动描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="详细描述活动内容、注意事项等..."
              className="input min-h-[100px] resize-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">物资清单</label>
              <button onClick={addMaterial} className="btn-ghost !py-1.5 !px-3 text-sm">
                <Plus className="w-4 h-4" />
                添加物资
              </button>
            </div>
            <div className="space-y-2">
              {materials.map((m, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-warm-50 rounded-xl">
                  <input
                    type="text"
                    value={m.name}
                    onChange={(e) => updateMaterial(idx, 'name', e.target.value)}
                    placeholder="物资名"
                    className="input !py-1.5 flex-1"
                  />
                  <input
                    type="number"
                    value={m.quantityPerPerson}
                    onChange={(e) => updateMaterial(idx, 'quantityPerPerson', Number(e.target.value) || 0)}
                    min={0}
                    placeholder="每人"
                    className="input !py-1.5 w-20 text-center"
                  />
                  <input
                    type="text"
                    value={m.unit}
                    onChange={(e) => updateMaterial(idx, 'unit', e.target.value)}
                    placeholder="单位"
                    className="input !py-1.5 w-20 text-center"
                  />
                  <div className="w-20 text-center text-sm font-semibold text-primary-600">
                    = {m.totalQuantity}
                  </div>
                  {materials.length > 1 && (
                    <button
                      onClick={() => removeMaterial(idx)}
                      className="w-9 h-9 rounded-lg hover:bg-danger-100 text-ink-400 hover:text-danger-500 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-6 border-t border-ink-100">
          <button onClick={onClose} className="btn-ghost" disabled={loading}>
            取消
          </button>
          <button onClick={handleSubmit} className="btn-primary" disabled={loading}>
            <PartyPopper className="w-4 h-4" />
            发布活动
          </button>
        </div>
      </div>
    </div>
  );
}

function ActivityCard({
  activity,
  isParent,
  myChildrenIds,
  onClick,
}: {
  activity: Activity;
  isParent: boolean;
  myChildrenIds: Set<number>;
  onClick: () => void;
}) {
  const status = getActivityStatus(activity);
  const statusInfo = getStatusLabel(status);
  const progress = Math.min((activity.registrations.length / activity.maxParticipants) * 100, 100);
  const gradient = COVER_GRADIENTS[activity.id % COVER_GRADIENTS.length];

  const hasRegistered = useMemo(() => {
    return activity.registrations.some((r) => myChildrenIds.has(r.childId));
  }, [activity.registrations, myChildrenIds]);

  return (
    <div
      onClick={onClick}
      className="group card card-hover cursor-pointer overflow-hidden p-0 animate-slide-up"
    >
      <div className={cn('relative h-40 bg-gradient-to-br', gradient)}>
        <div className="absolute top-3 left-3 flex gap-2">
          <span className={cn('badge', statusInfo.className)}>{statusInfo.label}</span>
          {isParent && hasRegistered && (
            <span className="badge bg-white/90 text-primary-700">
              <Check className="w-3 h-3 mr-1" />
              已报名
            </span>
          )}
        </div>
        <div className="absolute inset-0 flex items-center justify-center opacity-30">
          <PartyPopper className="w-20 h-20 text-white" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/40 to-transparent">
          <h3 className="text-lg font-display text-white line-clamp-1">{activity.title}</h3>
        </div>
      </div>

      <div className="p-4">
        <div className="flex flex-wrap items-center gap-3 text-xs text-ink-500 mb-3">
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {new Date(activity.date).toLocaleDateString('zh-CN')}
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            <span className="line-clamp-1 max-w-[150px]">{activity.location}</span>
          </div>
        </div>

        <div className="mb-2">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-ink-600 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              报名进度
            </span>
            <span className="font-medium text-ink-800">
              {activity.registrations.length}/{activity.maxParticipants}
            </span>
          </div>
          <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                status === 'full'
                  ? 'bg-warning-500'
                  : status === 'ended'
                  ? 'bg-ink-400'
                  : 'bg-gradient-to-r from-primary-500 to-accent-500'
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="opacity-0 group-hover:opacity-100 transition-opacity pt-3 mt-3 border-t border-ink-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="btn-primary w-full !py-2 text-sm"
          >
            查看详情
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Activities() {
  const { user, hasRole } = useAuthStore();
  const isAdmin = hasRole(['super_admin', 'principal', 'teacher']);
  const isParent = hasRole(['parent']);

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [myChildren, setMyChildren] = useState<Child[]>([]);
  const [confirmRegister, setConfirmRegister] = useState<{ childId: number; activityId: number } | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<{ registrationId: number; activityId: number } | null>(null);

  const myChildrenIds = useMemo(() => new Set(myChildren.map((c) => c.id)), [myChildren]);

  useEffect(() => {
    fetchActivities();
    if (isAdmin) fetchClasses();
    if (isParent) fetchMyChildren();
  }, []);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      const data = await activitiesApi.list();
      setActivities(data);
    } catch (e) {
      showToast('加载活动列表失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const data = await classesApi.list();
      setClasses(data);
    } catch (e) {
      showToast('加载班级列表失败', 'error');
    }
  };

  const fetchMyChildren = async () => {
    try {
      const allChildren = await childrenApi.list();
      if (user?.childIds && user.childIds.length > 0) {
        setMyChildren(allChildren.filter((c) => user.childIds?.includes(c.id)));
      } else {
        setMyChildren([]);
      }
    } catch (e) {
      showToast('加载孩子信息失败', 'error');
    }
  };

  const handleCreate = async (data: {
    title: string;
    description: string;
    date: string;
    location: string;
    classIds: number[];
    maxParticipants: number;
    materials: ActivityMaterial[];
  }) => {
    try {
      await activitiesApi.create({
        ...data,
        campusId: user?.campusId || 1,
      });
      showToast('活动发布成功', 'success');
      setCreateOpen(false);
      fetchActivities();
    } catch (e) {
      showToast('发布活动失败', 'error');
    }
  };

  const handleRegister = async (childId: number) => {
    if (!selectedActivity || !user) return;
    try {
      await activitiesApi.register(selectedActivity.id, {
        childId,
        parentId: user.id,
      });
      showToast('报名成功', 'success');
      setConfirmRegister(null);
      await fetchActivities();
      const updated = await activitiesApi.detail(selectedActivity.id);
      setSelectedActivity(updated);
    } catch (e) {
      showToast('报名失败', 'error');
    }
  };

  const handleCancelRegister = async (registrationId: number) => {
    if (!selectedActivity) return;
    try {
      await activitiesApi.cancelRegister(selectedActivity.id, registrationId);
      showToast('已取消报名', 'success');
      setConfirmCancel(null);
      await fetchActivities();
      const updated = await activitiesApi.detail(selectedActivity.id);
      setSelectedActivity(updated);
    } catch (e) {
      showToast('取消报名失败', 'error');
    }
  };

  const handleExportMaterials = async () => {
    if (!selectedActivity) return;
    try {
      showToast('物资清单导出成功', 'success');
    } catch (e) {
      showToast('导出失败', 'error');
    }
  };

  const sortedActivities = useMemo(() => {
    return [...activities].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [activities]);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="活动管理"
        subtitle="组织丰富多彩的亲子活动和校园活动"
        actions={
          isAdmin ? (
            <button onClick={() => setCreateOpen(true)} className="btn-primary">
              <Plus className="w-4 h-4" />
              发布活动
            </button>
          ) : null
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Clock className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      ) : activities.length === 0 ? (
        <EmptyState
          icon={PartyPopper}
          title="暂无活动"
          description={isAdmin ? '点击"发布活动"创建第一个活动吧' : '暂无正在进行的活动，敬请期待'}
          actions={
            isAdmin ? (
              <button onClick={() => setCreateOpen(true)} className="btn-primary">
                <Plus className="w-4 h-4" />
                发布活动
              </button>
            ) : null
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedActivities.map((activity, idx) => (
            <div key={activity.id} style={{ animationDelay: `${idx * 50}ms` }}>
              <ActivityCard
                activity={activity}
                isParent={isParent}
                myChildrenIds={myChildrenIds}
                onClick={() => setSelectedActivity(activity)}
              />
            </div>
          ))}
        </div>
      )}

      <DetailDialog
        activity={selectedActivity}
        onClose={() => setSelectedActivity(null)}
        myChildren={myChildren}
        isParent={isParent}
        onRegister={(childId) =>
          selectedActivity && setConfirmRegister({ childId, activityId: selectedActivity.id })
        }
        onCancelRegister={(registrationId) =>
          selectedActivity && setConfirmCancel({ registrationId, activityId: selectedActivity.id })
        }
        onExportMaterials={handleExportMaterials}
        registrations={selectedActivity?.registrations || []}
      />

      <CreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        classes={classes}
      />

      <ConfirmDialog
        open={!!confirmRegister}
        title="确认报名"
        description="确定要为孩子报名这个活动吗？"
        confirmText="确认报名"
        onConfirm={() => confirmRegister && handleRegister(confirmRegister.childId)}
        onCancel={() => setConfirmRegister(null)}
      />

      <ConfirmDialog
        open={!!confirmCancel}
        title="取消报名"
        description="确定要取消这个报名吗？"
        confirmText="确认取消"
        confirmVariant="danger"
        onConfirm={() => confirmCancel && handleCancelRegister(confirmCancel.registrationId)}
        onCancel={() => setConfirmCancel(null)}
      />
    </div>
  );
}
