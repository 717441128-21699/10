import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Thermometer,
  Smile,
  Frown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  X,
  Plus,
  Activity,
  Heart,
  FileText,
  ChevronRight,
  Send,
} from 'lucide-react';
import { healthApi, childrenApi } from '@/api';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { useAuthStore } from '@/store/authStore';
import { showToast } from '@/components/ui/Toast';
import type {
  Child,
  MorningCheck,
  HealthTracking,
  CheckItem,
  HealthAlertLevel,
} from '@shared/types';
import { cn } from '@/lib/utils';

type TabKey = 'input' | 'records' | 'tracking';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'input', label: '晨检录入' },
  { key: 'records', label: '晨检记录' },
  { key: 'tracking', label: '健康追踪' },
];

const CHECK_ITEMS: {
  key: 'oralCheck' | 'handCheck' | 'skinCheck' | 'spiritCheck';
  label: string;
  icon: typeof Activity;
}[] = [
  { key: 'oralCheck', label: '口腔', icon: Smile },
  { key: 'handCheck', label: '手部', icon: Activity },
  { key: 'skinCheck', label: '皮肤', icon: Heart },
  { key: 'spiritCheck', label: '精神', icon: FileText },
];

const AVATAR_COLORS = [
  'bg-primary-100 text-primary-600',
  'bg-accent-100 text-accent-600',
  'bg-success-100 text-success-600',
  'bg-warning-100 text-warning-600',
];

const getAvatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const todayStr = () => new Date().toISOString().split('T')[0];

type CheckStatus = 'unchecked' | 'normal' | 'abnormal';

export default function Health() {
  const { user } = useAuthStore();
  const isTeacher = user?.role === 'teacher';

  const [activeTab, setActiveTab] = useState<TabKey>('input');
  const [children, setChildren] = useState<Child[]>([]);
  const [morningChecks, setMorningChecks] = useState<MorningCheck[]>([]);
  const [trackings, setTrackings] = useState<HealthTracking[]>([]);
  const [loading, setLoading] = useState(true);

  const [checkDialog, setCheckDialog] = useState<Child | null>(null);
  const [trackingDialog, setTrackingDialog] = useState<HealthTracking | null>(null);
  const [newNote, setNewNote] = useState('');

  const [checkForm, setCheckForm] = useState<{
    temperature: string;
    oralCheck: CheckItem;
    handCheck: CheckItem;
    skinCheck: CheckItem;
    spiritCheck: CheckItem;
    note: string;
  }>({
    temperature: '36.5',
    oralCheck: 'normal',
    handCheck: 'normal',
    skinCheck: 'normal',
    spiritCheck: 'normal',
    note: '',
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = {};
      if (isTeacher && user?.campusId) {
        params.campusId = user.campusId;
      }
      const [childrenData, checksData, trackingsData] = await Promise.all([
        childrenApi.list(params),
        healthApi.morningCheckList({ date: todayStr() }),
        healthApi.trackingList(),
      ]);
      setChildren(childrenData);
      setMorningChecks(checksData);
      setTrackings(trackingsData);
    } catch {
      showToast('加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [isTeacher, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const checksMap = useMemo(() => {
    const map = new Map<number, MorningCheck>();
    morningChecks.forEach((c) => map.set(c.childId, c));
    return map;
  }, [morningChecks]);

  const stats = useMemo(() => {
    const total = children.length;
    const checked = morningChecks.length;
    const abnormal = morningChecks.filter(
      (c) => c.alertLevel !== 'normal'
    ).length;
    const tracking = trackings.filter((t) => t.status === 'tracking').length;
    return { total, checked, abnormal, tracking };
  }, [children, morningChecks, trackings]);

  const getChildCheckStatus = (childId: number): CheckStatus => {
    const check = checksMap.get(childId);
    if (!check) return 'unchecked';
    return check.alertLevel === 'normal' ? 'normal' : 'abnormal';
  };

  const openCheckDialog = (child: Child) => {
    setCheckDialog(child);
    setCheckForm({
      temperature: '36.5',
      oralCheck: 'normal',
      handCheck: 'normal',
      skinCheck: 'normal',
      spiritCheck: 'normal',
      note: '',
    });
  };

  const submitMorningCheck = async () => {
    if (!checkDialog || !user) return;
    const temp = parseFloat(checkForm.temperature);
    if (isNaN(temp) || temp < 34 || temp > 42) {
      showToast('请输入有效体温', 'warning');
      return;
    }

    const hasAbnormal =
      temp >= 37.5 ||
      checkForm.oralCheck === 'abnormal' ||
      checkForm.handCheck === 'abnormal' ||
      checkForm.skinCheck === 'abnormal' ||
      checkForm.spiritCheck === 'abnormal';

    const alertLevel: HealthAlertLevel = temp >= 38
      ? 'danger'
      : temp >= 37.5 || hasAbnormal
      ? 'warning'
      : 'normal';

    try {
      await healthApi.createMorningCheck({
        childId: checkDialog.id,
        teacherId: user.id,
        temperature: temp,
        oralCheck: checkForm.oralCheck,
        handCheck: checkForm.handCheck,
        skinCheck: checkForm.skinCheck,
        spiritCheck: checkForm.spiritCheck,
        note: checkForm.note || undefined,
      });

      if (alertLevel !== 'normal') {
        showToast('晨检异常，已自动通知家长和园长并创建健康追踪', 'warning');
      } else {
        showToast('晨检记录已保存', 'success');
      }

      setCheckDialog(null);
      fetchData();
    } catch {
      showToast('保存失败', 'error');
    }
  };

  const confirmRecovered = async (tracking: HealthTracking) => {
    try {
      await healthApi.updateTracking(tracking.id, { status: 'recovered' });
      showToast('已确认康复', 'success');
      setTrackingDialog(null);
      fetchData();
    } catch {
      showToast('操作失败', 'error');
    }
  };

  const addTrackingNote = async (tracking: HealthTracking) => {
    if (!newNote.trim()) return;
    try {
      const newRecord = {
        id: Date.now(),
        date: new Date().toISOString(),
        status: '继续观察',
        note: newNote,
        operator: user?.name || '老师',
      };
      await healthApi.updateTracking(tracking.id, {
        records: [...tracking.records, newRecord],
      });
      setNewNote('');
      showToast('追踪记录已添加', 'success');
      fetchData();
    } catch {
      showToast('添加失败', 'error');
    }
  };

  const isTempHigh = parseFloat(checkForm.temperature) >= 37.5;

  return (
    <div className="space-y-6">
      <PageHeader
        title="健康晨检"
        subtitle={isTeacher ? '对本班幼儿进行每日晨检录入' : '查看幼儿健康状况和晨检记录'}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-accent-100 flex items-center justify-center">
              <User className="w-5 h-5 text-accent-600" />
            </div>
            <div>
              <p className="text-xs text-ink-500">今日晨检人数</p>
              <p className="text-2xl font-bold text-ink-900">
                {stats.checked}
                <span className="text-sm font-normal text-ink-400 ml-1">
                  /{stats.total}
                </span>
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-danger-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-danger-600" />
            </div>
            <div>
              <p className="text-xs text-ink-500">异常人数</p>
              <p className="text-2xl font-bold text-danger-600">
                {stats.abnormal}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-warning-100 flex items-center justify-center">
              <Activity className="w-5 h-5 text-warning-600" />
            </div>
            <div>
              <p className="text-xs text-ink-500">正在追踪</p>
              <p className="text-2xl font-bold text-warning-600">
                {stats.tracking}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-success-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-success-600" />
            </div>
            <div>
              <p className="text-xs text-ink-500">晨检完成率</p>
              <p className="text-2xl font-bold text-success-600">
                {stats.total > 0
                  ? Math.round((stats.checked / stats.total) * 100)
                  : 0}
                %
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <div className="flex border-b border-ink-100">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'px-6 py-4 text-sm font-medium transition-colors relative',
                  isActive
                    ? 'text-primary-600'
                    : 'text-ink-500 hover:text-ink-700 hover:bg-ink-50'
                )}
              >
                {tab.label}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
                )}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activeTab === 'input' ? (
          <div className="p-6">
            {children.length === 0 ? (
              <EmptyState
                title="暂无幼儿"
                description="当前班级还没有幼儿档案"
              />
            ) : (
              <>
                <div className="flex items-center gap-6 mb-5 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-ink-300" />
                    <span className="text-ink-600">未晨检</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-success-500 bg-success-50" />
                    <span className="text-ink-600">正常</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-danger-500 bg-danger-50" />
                    <span className="text-ink-600">异常</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                  {children.map((child) => {
                    const status = getChildCheckStatus(child.id);
                    const check = checksMap.get(child.id);
                    return (
                      <div
                        key={child.id}
                        onClick={() => {
                          if (status === 'unchecked') {
                            openCheckDialog(child);
                          }
                        }}
                        className={cn(
                          'flex flex-col items-center p-3 rounded-2xl cursor-pointer transition-all border-2',
                          status === 'unchecked'
                            ? 'border-ink-200 hover:border-primary-300 hover:bg-primary-50/30 bg-ink-50/50'
                            : status === 'normal'
                            ? 'border-success-300 bg-success-50/50 cursor-default'
                            : 'border-danger-300 bg-danger-50/50 cursor-default'
                        )}
                      >
                        <div
                          className={cn(
                            'w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold border-3 mb-2',
                            status === 'normal' && 'border-success-200',
                            status === 'abnormal' && 'border-danger-200',
                            status === 'unchecked' && 'border-ink-200',
                            getAvatarColor(child.name)
                          )}
                        >
                          {child.name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-ink-800 text-center truncate w-full">
                          {child.name}
                        </span>
                        {status !== 'unchecked' && check && (
                          <span
                            className={cn(
                              'text-xs mt-1',
                              status === 'normal'
                                ? 'text-success-600'
                                : 'text-danger-600'
                            )}
                          >
                            {check.temperature.toFixed(1)}°C
                          </span>
                        )}
                        {status === 'unchecked' && (
                          <span className="text-xs text-ink-400 mt-1">
                            点击晨检
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        ) : activeTab === 'records' ? (
          morningChecks.length === 0 ? (
            <EmptyState
              title="暂无晨检记录"
              description="今天还没有晨检记录"
              className="py-16"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-ink-50/50">
                    <th className="text-left px-6 py-3 text-xs font-medium text-ink-500 uppercase tracking-wider">
                      幼儿
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-ink-500 uppercase tracking-wider">
                      体温
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-ink-500 uppercase tracking-wider">
                      口腔
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-ink-500 uppercase tracking-wider">
                      手部
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-ink-500 uppercase tracking-wider">
                      皮肤
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-ink-500 uppercase tracking-wider">
                      精神
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-ink-500 uppercase tracking-wider">
                      晨检老师
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-ink-500 uppercase tracking-wider">
                      状态
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {morningChecks.map((check) => (
                    <tr key={check.id} className="hover:bg-ink-50/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold',
                              getAvatarColor(check.childName || '')
                            )}
                          >
                            {check.childName?.charAt(0)}
                          </div>
                          <span className="font-medium text-ink-900">
                            {check.childName}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            'font-semibold',
                            check.temperature >= 37.5
                              ? 'text-danger-600'
                              : 'text-ink-800'
                          )}
                        >
                          {check.temperature.toFixed(1)}°C
                        </span>
                      </td>
                      {(['oralCheck', 'handCheck', 'skinCheck', 'spiritCheck'] as const).map(
                        (key) => (
                          <td key={key} className="px-6 py-4">
                            {check[key] === 'normal' ? (
                              <span className="inline-flex items-center gap-1 text-success-600 text-sm">
                                <CheckCircle2 className="w-4 h-4" />
                                正常
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-danger-600 text-sm">
                                <Frown className="w-4 h-4" />
                                异常
                              </span>
                            )}
                          </td>
                        )
                      )}
                      <td className="px-6 py-4 text-sm text-ink-600">
                        {check.teacherName || '-'}
                      </td>
                      <td className="px-6 py-4">
                        {check.alertLevel === 'normal' ? (
                          <span className="px-2.5 py-1 bg-success-100 text-success-700 text-xs rounded-full font-medium">
                            正常
                          </span>
                        ) : check.alertLevel === 'warning' ? (
                          <span className="px-2.5 py-1 bg-warning-100 text-warning-700 text-xs rounded-full font-medium">
                            需关注
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-danger-100 text-danger-700 text-xs rounded-full font-medium">
                            异常
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : trackings.length === 0 ? (
          <EmptyState
            title="暂无追踪记录"
            description="目前没有需要追踪的健康记录"
            className="py-16"
          />
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trackings.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setTrackingDialog(t)}
                  className="bg-ink-50 rounded-2xl p-4 cursor-pointer hover:bg-ink-100/80 transition-colors border border-ink-100 hover:border-primary-200"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={cn(
                        'w-12 h-12 rounded-full flex items-center justify-center text-base font-semibold',
                        getAvatarColor(t.childName || '')
                      )}
                    >
                      {t.childName?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-ink-900">
                        {t.childName}
                      </h4>
                      <p className="text-xs text-ink-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        开始于 {new Date(t.createdAt).toLocaleDateString('zh-CN')}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'px-2.5 py-1 rounded-full text-xs font-medium',
                        t.status === 'tracking'
                          ? 'bg-warning-100 text-warning-700'
                          : 'bg-success-100 text-success-700'
                      )}
                    >
                      {t.status === 'tracking' ? '追踪中' : '已康复'}
                    </span>
                  </div>
                  <div className="text-sm text-ink-600">
                    追踪记录：{t.records.length} 条
                  </div>
                  <div className="mt-3 flex items-center justify-end text-primary-600 text-sm font-medium">
                    查看详情
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {checkDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setCheckDialog(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-card w-full max-w-md animate-scale-in overflow-hidden">
            <div className="p-5 border-b border-ink-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-ink-900">
                  晨检录入 - {checkDialog.name}
                </h2>
                <p className="text-sm text-ink-500">
                  {checkDialog.gender === 'male' ? '男' : '女'} · {checkDialog.age}岁
                </p>
              </div>
              <button
                onClick={() => setCheckDialog(null)}
                className="p-2 rounded-lg hover:bg-ink-100 text-ink-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-2">
                  体温（°C）
                </label>
                <div className="relative">
                  <Thermometer
                    className={cn(
                      'w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2',
                      isTempHigh ? 'text-danger-500' : 'text-ink-400'
                    )}
                  />
                  <input
                    type="number"
                    step="0.1"
                    min="34"
                    max="42"
                    value={checkForm.temperature}
                    onChange={(e) =>
                      setCheckForm({ ...checkForm, temperature: e.target.value })
                    }
                    className={cn(
                      'w-full pl-12 pr-4 py-3 rounded-xl border-2 text-lg font-semibold focus:outline-none transition-colors',
                      isTempHigh
                        ? 'border-danger-300 bg-danger-50 text-danger-700 focus:ring-2 focus:ring-danger-200'
                        : 'border-ink-200 focus:ring-2 focus:ring-primary-300'
                    )}
                  />
                </div>
                {isTempHigh && (
                  <p className="mt-2 text-sm text-danger-600 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    体温超过37.5°C，将自动标记为异常
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-700 mb-3">
                  健康检查
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {CHECK_ITEMS.map((item) => {
                    const value = checkForm[item.key];
                    const isNormal = value === 'normal';
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() =>
                          setCheckForm({
                            ...checkForm,
                            [item.key]: isNormal ? 'abnormal' : 'normal',
                          })
                        }
                        className={cn(
                          'p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1.5',
                          isNormal
                            ? 'bg-success-50 border-success-300 hover:bg-success-100'
                            : 'bg-danger-50 border-danger-300 hover:bg-danger-100'
                        )}
                      >
                        <Icon
                          className={cn(
                            'w-6 h-6',
                            isNormal ? 'text-success-600' : 'text-danger-600'
                          )}
                        />
                        <span
                          className={cn(
                            'text-sm font-medium',
                            isNormal ? 'text-success-700' : 'text-danger-700'
                          )}
                        >
                          {item.label}
                        </span>
                        <span
                          className={cn(
                            'text-xs',
                            isNormal ? 'text-success-600' : 'text-danger-600'
                          )}
                        >
                          {isNormal ? '正常' : '异常'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">
                  备注
                </label>
                <textarea
                  value={checkForm.note}
                  onChange={(e) =>
                    setCheckForm({ ...checkForm, note: e.target.value })
                  }
                  rows={2}
                  placeholder="如有异常情况请详细说明..."
                  className="w-full px-4 py-2.5 rounded-xl border border-ink-200 focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
                />
              </div>

              {(isTempHigh ||
                checkForm.oralCheck === 'abnormal' ||
                checkForm.handCheck === 'abnormal' ||
                checkForm.skinCheck === 'abnormal' ||
                checkForm.spiritCheck === 'abnormal') && (
                <div className="p-3 bg-warning-50 border border-warning-200 rounded-xl">
                  <p className="text-sm text-warning-700 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    晨检结果异常，提交后将自动通知家长和园长，并创建健康追踪记录
                  </p>
                </div>
              )}
            </div>
            <div className="p-5 border-t border-ink-100 flex justify-end gap-2">
              <button
                onClick={() => setCheckDialog(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-ink-700 bg-ink-100 hover:bg-ink-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={submitMorningCheck}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 transition-colors shadow-soft flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                提交晨检
              </button>
            </div>
          </div>
        </div>
      )}

      {trackingDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setTrackingDialog(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-card w-full max-w-lg animate-scale-in overflow-hidden">
            <div className="p-5 border-b border-ink-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold',
                    getAvatarColor(trackingDialog.childName || '')
                  )}
                >
                  {trackingDialog.childName?.charAt(0)}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-ink-900">
                    健康追踪 - {trackingDialog.childName}
                  </h2>
                  <p className="text-xs text-ink-500">
                    开始于 {new Date(trackingDialog.createdAt).toLocaleDateString('zh-CN')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTrackingDialog(null)}
                className="p-2 rounded-lg hover:bg-ink-100 text-ink-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-1">
                {trackingDialog.records.length === 0 && (
                  <p className="text-ink-400 text-sm text-center py-4">
                    暂无追踪记录
                  </p>
                )}
                {trackingDialog.records.map((record, idx) => (
                  <div key={record.id} className="relative pl-6 pb-4">
                    {idx < trackingDialog.records.length - 1 && (
                      <div className="absolute left-[11px] top-5 bottom-0 w-0.5 bg-ink-200" />
                    )}
                    <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-white border-2 border-primary-300 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-primary-500" />
                    </div>
                    <div className="bg-ink-50 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-ink-800">
                          {record.status}
                        </span>
                        <span className="text-xs text-ink-400">
                          {new Date(record.date).toLocaleString('zh-CN', {
                            month: 'numeric',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      {record.note && (
                        <p className="text-sm text-ink-600">{record.note}</p>
                      )}
                      <p className="text-xs text-ink-400 mt-1">
                        操作人：{record.operator}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {trackingDialog.status === 'tracking' && (
                <div className="space-y-2 pt-2 border-t border-ink-100">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={2}
                    placeholder="输入追踪处理意见..."
                    className="w-full px-4 py-2.5 rounded-xl border border-ink-200 focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none text-sm"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => confirmRecovered(trackingDialog!)}
                      className="px-4 py-2 rounded-xl text-sm font-medium text-success-700 bg-success-100 hover:bg-success-200 transition-colors flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      确认康复
                    </button>
                    <button
                      onClick={() => addTrackingNote(trackingDialog)}
                      disabled={!newNote.trim()}
                      className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-soft"
                    >
                      <Send className="w-4 h-4" />
                      添加记录
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
