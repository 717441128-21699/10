import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  Clock,
  User,
  FileText,
  Check,
  X,
  Plus,
  AlertCircle,
  Paperclip,
  Upload,
  X as XIcon,
  ChevronDown,
  Thermometer,
  Briefcase,
  MoreHorizontal,
} from 'lucide-react';
import { leaveApi, childrenApi } from '@/api';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { useAuthStore } from '@/store/authStore';
import { showToast } from '@/components/ui/Toast';
import type { LeaveRecord, FeeAdjustment, Child, LeaveType } from '@shared/types';
import { cn } from '@/lib/utils';

type TabKey = 'pending' | 'approved' | 'rejected' | 'mine';

const TABS: { key: TabKey; label: string; role?: string[] }[] = [
  { key: 'pending', label: '待审批', role: ['super_admin', 'principal', 'teacher'] },
  { key: 'approved', label: '已批准', role: ['super_admin', 'principal', 'teacher'] },
  { key: 'rejected', label: '已拒绝', role: ['super_admin', 'principal', 'teacher'] },
  { key: 'mine', label: '我发起的' },
];

const TYPE_CONFIG: Record<LeaveType, { label: string; bg: string; text: string; icon: typeof Thermometer }> = {
  sick: { label: '病假', bg: 'bg-warning-100', text: 'text-warning-700', icon: Thermometer },
  personal: { label: '事假', bg: 'bg-accent-100', text: 'text-accent-700', icon: Briefcase },
  other: { label: '其他', bg: 'bg-ink-100', text: 'text-ink-700', icon: MoreHorizontal },
};

const STATUS_CONFIG = {
  pending: { label: '待审批', bg: 'bg-warning-100', text: 'text-warning-700' },
  approved: { label: '已批准', bg: 'bg-success-100', text: 'text-success-700' },
  rejected: { label: '已拒绝', bg: 'bg-danger-100', text: 'text-danger-700' },
};

function countDays(start: string, end: string) {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  if (e < s) return 0;
  return Math.floor((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

export default function Leave() {
  const { user } = useAuthStore();
  const isParent = user?.role === 'parent';

  const [activeTab, setActiveTab] = useState<TabKey>(isParent ? 'mine' : 'pending');
  const [records, setRecords] = useState<LeaveRecord[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);

  const [approveDialog, setApproveDialog] = useState<LeaveRecord | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState<LeaveRecord | null>(null);

  const [form, setForm] = useState({
    childId: 0,
    type: 'sick' as LeaveType,
    startDate: '',
    endDate: '',
    reason: '',
    attachment: '',
  });
  const [feePreview, setFeePreview] = useState<FeeAdjustment | null>(null);

  const visibleTabs = useMemo(() => {
    return TABS.filter((t) => !t.role || (user && t.role.includes(user.role)));
  }, [user]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = {};
      if (isParent && user) {
        params.parentId = user.id;
      }
      const [recordsData, childrenData] = await Promise.all([
        leaveApi.list(params),
        childrenApi.list(isParent && user?.childIds ? { ids: user.childIds } : undefined),
      ]);
      setRecords(recordsData);
      setChildren(childrenData);
    } catch {
      showToast('加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [isParent, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const calcFeePreview = useCallback(async () => {
    if (form.startDate && form.endDate) {
      try {
        const fee = await leaveApi.calculateFee({
          startDate: form.startDate,
          endDate: form.endDate,
        });
        setFeePreview(fee);
      } catch {
        setFeePreview(null);
      }
    } else {
      setFeePreview(null);
    }
  }, [form.startDate, form.endDate]);

  useEffect(() => {
    calcFeePreview();
  }, [calcFeePreview]);

  const filteredRecords = useMemo(() => {
    if (activeTab === 'mine') {
      return records.filter((r) => r.parentId === user?.id);
    }
    return records.filter((r) => r.status === activeTab);
  }, [records, activeTab, user]);

  const handleCreate = async () => {
    if (!form.childId) {
      showToast('请选择孩子', 'warning');
      return;
    }
    if (!form.startDate || !form.endDate) {
      showToast('请选择请假日期', 'warning');
      return;
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      showToast('结束日期不能早于开始日期', 'warning');
      return;
    }
    if (!form.reason.trim()) {
      showToast('请填写请假原因', 'warning');
      return;
    }
    try {
      await leaveApi.create({
        ...form,
        parentId: user!.id,
      });
      showToast('请假申请已提交', 'success');
      setCreateOpen(false);
      setForm({
        childId: 0,
        type: 'sick',
        startDate: '',
        endDate: '',
        reason: '',
        attachment: '',
      });
      fetchData();
    } catch {
      showToast('提交失败', 'error');
    }
  };

  const handleApprove = async () => {
    if (!approveDialog || !user) return;
    try {
      await leaveApi.approve(approveDialog.id, user.id);
      showToast('已批准', 'success');
      setApproveDialog(null);
      fetchData();
    } catch {
      showToast('操作失败', 'error');
    }
  };

  const handleReject = async () => {
    if (!approveDialog || !user) return;
    try {
      await leaveApi.reject(approveDialog.id, user.id);
      showToast('已拒绝', 'error');
      setApproveDialog(null);
      fetchData();
    } catch {
      showToast('操作失败', 'error');
    }
  };

  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm({ ...form, attachment: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const counts = useMemo(() => {
    return {
      pending: records.filter((r) => r.status === 'pending').length,
      approved: records.filter((r) => r.status === 'approved').length,
      rejected: records.filter((r) => r.status === 'rejected').length,
      mine: records.filter((r) => r.parentId === user?.id).length,
    };
  }, [records, user]);

  const days = countDays(form.startDate, form.endDate);

  return (
    <div className="space-y-6">
      <PageHeader
        title="请假管理"
        subtitle={isParent ? '管理您的孩子请假申请' : '审批和查看幼儿请假记录'}
        actions={
          isParent ? (
            <button
              onClick={() => {
                if (children.length > 0) {
                  setForm({ ...form, childId: children[0].id });
                }
                setCreateOpen(true);
              }}
              className="px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors flex items-center gap-2 shadow-soft"
            >
              <Plus className="w-4 h-4" />
              发起请假
            </button>
          ) : null
        }
      />

      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <div className="flex border-b border-ink-100 overflow-x-auto">
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = counts[tab.key];
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors relative',
                  isActive
                    ? 'text-primary-600'
                    : 'text-ink-500 hover:text-ink-700 hover:bg-ink-50'
                )}
              >
                <span className="flex items-center gap-2">
                  {tab.label}
                  {count > 0 && (
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-medium',
                        isActive
                          ? 'bg-primary-100 text-primary-700'
                          : 'bg-ink-100 text-ink-600'
                      )}
                    >
                      {count}
                    </span>
                  )}
                </span>
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
        ) : filteredRecords.length === 0 ? (
          <EmptyState
            title="暂无记录"
            description={
              activeTab === 'pending'
                ? '当前没有待审批的请假申请'
                : activeTab === 'mine'
                ? '您还没有发起过请假申请'
                : '当前没有记录'
            }
            className="py-16"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-ink-50/50">
                  <th className="text-left px-6 py-3 text-xs font-medium text-ink-500 uppercase tracking-wider">
                    幼儿姓名
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-ink-500 uppercase tracking-wider">
                    家长
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-ink-500 uppercase tracking-wider">
                    类型
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-ink-500 uppercase tracking-wider">
                    请假时间
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-ink-500 uppercase tracking-wider">
                    天数
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-ink-500 uppercase tracking-wider">
                    费用扣减
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-ink-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-ink-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {filteredRecords.map((record) => {
                  const typeCfg = TYPE_CONFIG[record.type];
                  const statusCfg = STATUS_CONFIG[record.status];
                  return (
                    <tr
                      key={record.id}
                      className="hover:bg-ink-50/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-semibold">
                            {record.childName?.charAt(0)}
                          </div>
                          <span className="font-medium text-ink-900">
                            {record.childName}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-ink-600">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-ink-400" />
                          {record.parentName || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
                            typeCfg.bg,
                            typeCfg.text
                          )}
                        >
                          <typeCfg.icon className="w-3 h-3" />
                          {typeCfg.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-ink-600">
                        <div className="flex flex-col">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-ink-400" />
                            {record.startDate} ~ {record.endDate}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-ink-700">
                          {record.feeAdjustment?.days || 0}天
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-danger-600">
                          -¥{record.feeAdjustment?.totalDeduction?.toFixed(2) || '0.00'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            'px-2.5 py-1 rounded-full text-xs font-medium',
                            statusCfg.bg,
                            statusCfg.text
                          )}
                        >
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {record.status === 'pending' && !isParent ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setDetailOpen(record)}
                              className="text-sm text-ink-600 hover:text-ink-800 transition-colors"
                            >
                              详情
                            </button>
                            <button
                              onClick={() => setApproveDialog(record)}
                              className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
                            >
                              审批
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDetailOpen(record)}
                            className="text-sm text-primary-600 hover:text-primary-700 transition-colors"
                          >
                            查看详情
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {approveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setApproveDialog(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-card w-full max-w-lg animate-scale-in overflow-hidden">
            <div className="p-5 border-b border-ink-100">
              <h2 className="text-lg font-semibold text-ink-900">审批请假</h2>
            </div>
            <div className="p-5 space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xl font-bold">
                  {approveDialog.childName?.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-ink-900 text-lg">
                    {approveDialog.childName}
                  </h3>
                  <p className="text-ink-500 text-sm">
                    家长：{approveDialog.parentName}
                  </p>
                </div>
                <span
                  className={cn(
                    'ml-auto px-3 py-1 rounded-full text-xs font-medium',
                    TYPE_CONFIG[approveDialog.type].bg,
                    TYPE_CONFIG[approveDialog.type].text
                  )}
                >
                  {TYPE_CONFIG[approveDialog.type].label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-ink-50 rounded-xl">
                <div>
                  <p className="text-xs text-ink-500 mb-1">开始日期</p>
                  <p className="text-sm font-medium text-ink-800 flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-ink-400" />
                    {approveDialog.startDate}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-ink-500 mb-1">结束日期</p>
                  <p className="text-sm font-medium text-ink-800 flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-ink-400" />
                    {approveDialog.endDate}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-ink-500 mb-1">请假原因</p>
                  <p className="text-sm text-ink-800 bg-white rounded-lg p-3">
                    {approveDialog.reason}
                  </p>
                </div>
                {approveDialog.attachment && (
                  <div className="col-span-2">
                    <p className="text-xs text-ink-500 mb-1">附件</p>
                    <img
                      src={approveDialog.attachment}
                      alt="附件"
                      className="w-full max-h-40 object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>

              <div className="p-4 bg-gradient-to-br from-danger-50 to-warning-50 rounded-xl border border-danger-100">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4 text-danger-500" />
                  <h4 className="text-sm font-semibold text-ink-900">
                    费用调整（自动计算）
                  </h4>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-ink-600">请假天数</span>
                    <span className="font-medium text-ink-800">
                      {approveDialog.feeAdjustment?.days || 0} 天
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-600">餐费扣减</span>
                    <span className="text-danger-600 font-medium">
                      -¥{approveDialog.feeAdjustment?.mealFeeDeduction?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-600">保教费扣减</span>
                    <span className="text-danger-600 font-medium">
                      -¥{approveDialog.feeAdjustment?.tuitionDeduction?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-danger-100/60">
                    <span className="font-semibold text-ink-800">合计扣减</span>
                    <span className="text-danger-700 font-bold text-base">
                      -¥{approveDialog.feeAdjustment?.totalDeduction?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-ink-100 flex justify-end gap-2">
              <button
                onClick={() => setApproveDialog(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-ink-700 bg-ink-100 hover:bg-ink-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleReject}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-danger-500 hover:bg-danger-600 transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                拒绝
              </button>
              <button
                onClick={handleApprove}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-success-500 hover:bg-success-600 transition-colors flex items-center gap-2 shadow-soft"
              >
                <Check className="w-4 h-4" />
                批准
              </button>
            </div>
          </div>
        </div>
      )}

      {detailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setDetailOpen(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-card w-full max-w-lg animate-scale-in overflow-hidden">
            <div className="p-5 border-b border-ink-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink-900">请假详情</h2>
              <button
                onClick={() => setDetailOpen(null)}
                className="p-2 rounded-lg hover:bg-ink-100 text-ink-500"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xl font-bold">
                  {detailOpen.childName?.charAt(0)}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-ink-900 text-lg">
                    {detailOpen.childName}
                  </h3>
                  <p className="text-ink-500 text-sm">
                    家长：{detailOpen.parentName}
                  </p>
                </div>
                <span
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium',
                    STATUS_CONFIG[detailOpen.status].bg,
                    STATUS_CONFIG[detailOpen.status].text
                  )}
                >
                  {STATUS_CONFIG[detailOpen.status].label}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-ink-50 rounded-xl">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      TYPE_CONFIG[detailOpen.type].bg
                    )}
                  >
                    {(() => {
                      const Icon = TYPE_CONFIG[detailOpen.type].icon;
                      return <Icon className={cn('w-5 h-5', TYPE_CONFIG[detailOpen.type].text)} />;
                    })()}
                  </div>
                  <div>
                    <p className="text-xs text-ink-500">请假类型</p>
                    <p className="font-medium text-ink-800">
                      {TYPE_CONFIG[detailOpen.type].label}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-ink-50 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-accent-100 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-accent-600" />
                  </div>
                  <div>
                    <p className="text-xs text-ink-500">请假时间</p>
                    <p className="font-medium text-ink-800">
                      {detailOpen.startDate} 至 {detailOpen.endDate}（{detailOpen.feeAdjustment?.days || 0}天）
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-ink-50 rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-warning-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-warning-600" />
                  </div>
                  <div>
                    <p className="text-xs text-ink-500">请假原因</p>
                    <p className="font-medium text-ink-800">
                      {detailOpen.reason}
                    </p>
                  </div>
                </div>
                {detailOpen.attachment && (
                  <div className="p-3 bg-ink-50 rounded-xl">
                    <p className="text-xs text-ink-500 mb-2 flex items-center gap-1">
                      <Paperclip className="w-3.5 h-3.5" />
                      附件
                    </p>
                    <img
                      src={detailOpen.attachment}
                      alt="附件"
                      className="w-full max-h-48 object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>

              {detailOpen.feeAdjustment && (
                <div className="p-4 bg-gradient-to-br from-danger-50 to-warning-50 rounded-xl border border-danger-100">
                  <h4 className="text-sm font-semibold text-ink-900 mb-3">
                    费用调整
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-ink-600">餐费扣减</span>
                      <span className="text-danger-600">
                        -¥{detailOpen.feeAdjustment.mealFeeDeduction.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-600">保教费扣减</span>
                      <span className="text-danger-600">
                        -¥{detailOpen.feeAdjustment.tuitionDeduction.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-danger-100/60">
                      <span className="font-semibold text-ink-800">合计扣减</span>
                      <span className="text-danger-700 font-bold">
                        -¥{detailOpen.feeAdjustment.totalDeduction.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setCreateOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-card w-full max-w-lg animate-scale-in overflow-hidden">
            <div className="p-5 border-b border-ink-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink-900">发起请假</h2>
              <button
                onClick={() => setCreateOpen(false)}
                className="p-2 rounded-lg hover:bg-ink-100 text-ink-500"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">
                  选择孩子 *
                </label>
                <div className="relative">
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
                  <select
                    value={form.childId}
                    onChange={(e) =>
                      setForm({ ...form, childId: Number(e.target.value) })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-ink-200 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white appearance-none"
                  >
                    <option value={0}>请选择孩子</option>
                    {children.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.className || '未分班'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">
                  请假类型 *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(TYPE_CONFIG) as LeaveType[]).map((type) => {
                    const cfg = TYPE_CONFIG[type];
                    const isActive = form.type === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setForm({ ...form, type })}
                        className={cn(
                          'flex flex-col items-center gap-1 py-3 rounded-xl border transition-all',
                          isActive
                            ? `${cfg.bg} ${cfg.text} border-current shadow-soft`
                            : 'bg-white border-ink-200 text-ink-500 hover:bg-ink-50'
                        )}
                      >
                        <cfg.icon className="w-5 h-5" />
                        <span className="text-sm font-medium">{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">
                    开始日期 *
                  </label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) =>
                      setForm({ ...form, startDate: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-ink-200 focus:outline-none focus:ring-2 focus:ring-primary-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">
                    结束日期 *
                  </label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) =>
                      setForm({ ...form, endDate: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-ink-200 focus:outline-none focus:ring-2 focus:ring-primary-300"
                  />
                </div>
              </div>

              {feePreview && days > 0 && (
                <div className="p-3 bg-gradient-to-br from-accent-50 to-primary-50 rounded-xl border border-accent-200">
                  <p className="text-xs text-ink-600 mb-2">费用预览</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink-600">共 {days} 天，预计扣减</span>
                    <span className="text-lg font-bold text-danger-600">
                      -¥{feePreview.totalDeduction.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">
                  请假原因 *
                </label>
                <textarea
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  rows={3}
                  placeholder="请详细说明请假原因..."
                  className="w-full px-4 py-2.5 rounded-xl border border-ink-200 focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">
                  附件（可选）
                </label>
                {form.attachment ? (
                  <div className="relative">
                    <img
                      src={form.attachment}
                      alt="附件"
                      className="w-full max-h-40 object-cover rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, attachment: '' })}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 backdrop-blur text-ink-600 flex items-center justify-center hover:bg-white shadow-sm"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center py-8 rounded-xl border-2 border-dashed border-ink-200 hover:border-primary-300 hover:bg-primary-50/30 cursor-pointer transition-colors">
                    <Upload className="w-8 h-8 text-ink-400 mb-2" />
                    <span className="text-sm text-ink-500">点击上传凭证图片</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAttachmentUpload}
                    />
                  </label>
                )}
              </div>
            </div>
            <div className="p-5 border-t border-ink-100 flex justify-end gap-2">
              <button
                onClick={() => setCreateOpen(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-ink-700 bg-ink-100 hover:bg-ink-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 transition-colors shadow-soft"
              >
                提交申请
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
