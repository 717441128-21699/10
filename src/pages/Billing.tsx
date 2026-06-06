import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Wallet,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  Filter,
  CreditCard,
  RefreshCw,
  X,
  TrendingUp,
  DollarSign,
  AlertOctagon,
  PauseCircle,
} from 'lucide-react';
import { billingApi, settingsApi } from '@/api';
import { useAuthStore } from '@/store/authStore';
import { showToast } from '@/components/ui/Toast';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { cn } from '@/lib/utils';
import type { Bill, Campus } from '@shared/types';

type BillingTab = 'all' | 'overdue' | 'suspended';

interface PayDialogState {
  open: boolean;
  bill: Bill | null;
  amount: string;
}

export default function Billing() {
  const { user, hasRole } = useAuthStore();
  const [tabs, setTabs] = useState<BillingTab>('all');
  const [bills, setBills] = useState<Bill[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedCampus, setSelectedCampus] = useState<number | 'all'>('all');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [payDialog, setPayDialog] = useState<PayDialogState>({
    open: false,
    bill: null,
    amount: '',
  });
  const [paying, setPaying] = useState(false);
  const [restoreDialog, setRestoreDialog] = useState<{
    open: boolean;
    bill: Bill | null;
  }>({ open: false, bill: null });
  const [restoring, setRestoring] = useState(false);
  const [campusDropdownOpen, setCampusDropdownOpen] = useState(false);

  const isParent = hasRole(['parent']);
  const isAdminOrFinance = hasRole(['super_admin', 'principal', 'finance']);

  const fetchBills = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { month: selectedMonth };
      if (selectedCampus !== 'all') {
        params.campusId = selectedCampus;
      }
      if (tabs === 'suspended') {
        const data = await billingApi.suspendedList(params);
        setBills(data);
      } else {
        const data = await billingApi.billList(params);
        setBills(data);
      }
    } catch {
      showToast('获取账单数据失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedCampus, tabs]);

  const fetchCampuses = useCallback(async () => {
    try {
      const data = await settingsApi.campusList();
      setCampuses(data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchBills();
    if (isAdminOrFinance) {
      fetchCampuses();
    }
  }, [fetchBills, fetchCampuses, isAdminOrFinance]);

  const suspendedCount = useMemo(
    () => bills.filter((b) => b.status === 'suspended').length,
    [bills]
  );

  const summary = useMemo(() => {
    const total = bills.reduce((sum, b) => sum + b.totalAmount, 0);
    const paid = bills.reduce((sum, b) => sum + b.paidAmount, 0);
    const unpaid = total - paid;
    const suspended = bills.filter((b) => b.status === 'suspended').length;
    return { total, paid, unpaid, suspended };
  }, [bills]);

  const filteredBills = useMemo(() => {
    let result = bills;
    if (tabs === 'overdue') {
      result = bills.filter((b) => b.overdueDays > 0 && b.status !== 'suspended');
      result = [...result].sort((a, b) => b.overdueDays - a.overdueDays);
    } else if (tabs === 'suspended') {
      result = bills.filter((b) => b.status === 'suspended');
    }
    if (isParent && user?.childIds) {
      result = result.filter((b) => user.childIds?.includes(b.childId));
    }
    return result;
  }, [bills, tabs, isParent, user]);

  const toggleRow = (id: number) => {
    const next = new Set(expandedRows);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedRows(next);
  };

  const openPayDialog = (bill: Bill) => {
    const remaining = bill.totalAmount - bill.paidAmount;
    setPayDialog({
      open: true,
      bill,
      amount: remaining.toFixed(2),
    });
  };

  const handlePay = async () => {
    if (!payDialog.bill) return;
    const amount = parseFloat(payDialog.amount);
    if (isNaN(amount) || amount <= 0) {
      showToast('请输入有效金额', 'warning');
      return;
    }
    const remaining = payDialog.bill.totalAmount - payDialog.bill.paidAmount;
    if (amount > remaining) {
      showToast('付款金额不能超过应付金额', 'warning');
      return;
    }
    setPaying(true);
    try {
      await billingApi.pay(payDialog.bill.id, amount);
      showToast('缴费成功', 'success');
      setPayDialog({ open: false, bill: null, amount: '' });
      fetchBills();
    } catch {
      showToast('缴费失败，请重试', 'error');
    } finally {
      setPaying(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreDialog.bill) return;
    setRestoring(true);
    try {
      await billingApi.restore(restoreDialog.bill.id);
      showToast('恢复入园成功', 'success');
      setRestoreDialog({ open: false, bill: null });
      fetchBills();
    } catch {
      showToast('恢复入园失败，请重试', 'error');
    } finally {
      setRestoring(false);
    }
  };

  const handleRemind = (bill: Bill) => {
    showToast(`已向 ${bill.childName} 家长发送催缴提醒`, 'success');
  };

  const getStatusBadge = (status: Bill['status']) => {
    switch (status) {
      case 'paid':
        return <span className="badge badge-success"><CheckCircle className="w-3 h-3 mr-1" />已付</span>;
      case 'partial':
        return <span className="badge badge-warning"><AlertTriangle className="w-3 h-3 mr-1" />部分付</span>;
      case 'unpaid':
        return <span className="badge bg-ink-100 text-ink-600">未付</span>;
      case 'suspended':
        return <span className="badge badge-danger"><PauseCircle className="w-3 h-3 mr-1" />已暂停</span>;
    }
  };

  const monthOptions = useMemo(() => {
    const options: string[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      options.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return options;
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="费用结算"
        subtitle={isParent ? '查看孩子的账单和缴费记录' : '管理全园账单、欠费和暂停入园状态'}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {!isParent && (
              <>
                <div className="relative">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="input pr-8 appearance-none cursor-pointer"
                  >
                    {monthOptions.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-ink-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {campuses.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setCampusDropdownOpen(!campusDropdownOpen)}
                      className="btn-ghost !px-3 !py-2.5"
                    >
                      <Filter className="w-4 h-4" />
                      <span>{selectedCampus === 'all' ? '全部校区' : campuses.find((c) => c.id === selectedCampus)?.name}</span>
                      <ChevronDown className={cn('w-4 h-4 transition-transform', campusDropdownOpen && 'rotate-180')} />
                    </button>
                    {campusDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setCampusDropdownOpen(false)} />
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-card border border-ink-200 py-1.5 z-50 animate-scale-in">
                          <button
                            onClick={() => { setSelectedCampus('all'); setCampusDropdownOpen(false); }}
                            className={cn(
                              'w-full text-left px-3 py-2 text-sm hover:bg-ink-50 transition-colors',
                              selectedCampus === 'all' && 'text-primary-600 font-medium bg-primary-50'
                            )}
                          >
                            全部校区
                          </button>
                          {campuses.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => { setSelectedCampus(c.id); setCampusDropdownOpen(false); }}
                              className={cn(
                                'w-full text-left px-3 py-2 text-sm hover:bg-ink-50 transition-colors',
                                selectedCampus === c.id && 'text-primary-600 font-medium bg-primary-50'
                              )}
                            >
                              {c.name}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                <span className="badge badge-danger">
                  <AlertOctagon className="w-3 h-3 mr-1" />
                  欠费预警 {suspendedCount}
                </span>
              </>
            )}
            <button
              onClick={fetchBills}
              className="btn-ghost !px-3 !py-2.5"
              disabled={loading}
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card bg-gradient-to-br from-primary-500 to-primary-400 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">本月应收</p>
              <p className="text-2xl font-display mt-1">¥{summary.total.toFixed(2)}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-success-500 to-success-400 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">已收总额</p>
              <p className="text-2xl font-display mt-1">¥{summary.paid.toFixed(2)}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-warning-500 to-warning-400 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">欠费总额</p>
              <p className="text-2xl font-display mt-1">¥{summary.unpaid.toFixed(2)}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-danger-500 to-danger-400 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">暂停入园</p>
              <p className="text-2xl font-display mt-1">{summary.suspended}人</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <PauseCircle className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="flex border-b border-ink-100 px-4">
          {([
            { key: 'all', label: '全部账单' },
            { key: 'overdue', label: '欠费管理' },
            { key: 'suspended', label: '已暂停入园' },
          ] as { key: BillingTab; label: string }[]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTabs(t.key)}
              className={cn(
                'px-4 py-3.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                tabs === t.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-ink-500 hover:text-ink-700'
              )}
            >
              {t.label}
              {t.key === 'overdue' && (
                <span className="ml-1.5 badge badge-danger !text-[10px] !py-0.5">
                  {bills.filter((b) => b.overdueDays > 0 && b.status !== 'suspended').length}
                </span>
              )}
              {t.key === 'suspended' && (
                <span className="ml-1.5 badge badge-danger !text-[10px] !py-0.5">
                  {suspendedCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-16 text-center text-ink-500">加载中...</div>
        ) : filteredBills.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title={tabs === 'suspended' ? '暂无暂停入园记录' : tabs === 'overdue' ? '暂无欠费账单' : '暂无账单数据'}
            description={tabs === 'all' ? '请选择其他月份查看' : '所有账单状态正常'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header w-10"></th>
                  <th className="table-header">幼儿姓名</th>
                  <th className="table-header">班级</th>
                  <th className="table-header">月份</th>
                  <th className="table-header">总额</th>
                  <th className="table-header">已付</th>
                  <th className="table-header">状态</th>
                  <th className="table-header">到期日</th>
                  {tabs === 'overdue' && <th className="table-header">逾期天数</th>}
                  {tabs === 'suspended' && <th className="table-header">暂停时间</th>}
                  <th className="table-header text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {filteredBills.map((bill) => {
                  const isExpanded = expandedRows.has(bill.id);
                  return (
                    <>
                      <tr key={bill.id} className={cn('hover:bg-ink-50/50 transition-colors', bill.status === 'suspended' && 'bg-danger-50/30')}>
                        <td className="table-cell">
                          <button
                            onClick={() => toggleRow(bill.id)}
                            className="p-1 rounded-lg hover:bg-ink-100 text-ink-400"
                          >
                            <ChevronDown className={cn('w-4 h-4 transition-transform', isExpanded && 'rotate-180')} />
                          </button>
                        </td>
                        <td className="table-cell font-medium text-ink-900">{bill.childName}</td>
                        <td className="table-cell text-ink-600">-</td>
                        <td className="table-cell text-ink-600">{bill.month}</td>
                        <td className="table-cell font-semibold text-ink-900">¥{bill.totalAmount.toFixed(2)}</td>
                        <td className="table-cell text-success-600 font-medium">¥{bill.paidAmount.toFixed(2)}</td>
                        <td className="table-cell">{getStatusBadge(bill.status)}</td>
                        <td className="table-cell text-ink-600">{bill.dueDate}</td>
                        {tabs === 'overdue' && (
                          <td className="table-cell">
                            <span className={cn(
                              'font-semibold',
                              bill.overdueDays > 30 ? 'text-danger-600' : 'text-warning-600'
                            )}>
                              {bill.overdueDays} 天
                            </span>
                          </td>
                        )}
                        {tabs === 'suspended' && (
                          <td className="table-cell text-danger-600">{bill.suspendedAt}</td>
                        )}
                        <td className="table-cell">
                          <div className="flex items-center justify-end gap-1.5">
                            {bill.status !== 'suspended' && bill.status !== 'paid' && (
                              <button
                                onClick={() => openPayDialog(bill)}
                                className="btn-primary !px-3 !py-1.5 !text-xs"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                缴费
                              </button>
                            )}
                            {tabs === 'overdue' && isAdminOrFinance && (
                              <button
                                onClick={() => handleRemind(bill)}
                                className="btn-outline !px-3 !py-1.5 !text-xs"
                              >
                                催缴
                              </button>
                            )}
                            {tabs === 'suspended' && isAdminOrFinance && (
                              <button
                                onClick={() => setRestoreDialog({ open: true, bill })}
                                className="btn-success !px-3 !py-1.5 !text-xs"
                              >
                                恢复入园
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${bill.id}-detail`} className="bg-ink-50/50">
                          <td></td>
                          <td colSpan={tabs === 'overdue' || tabs === 'suspended' ? 8 : 7} className="py-4 px-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              {bill.items.map((item, idx) => (
                                <div key={idx} className="bg-white rounded-xl p-3 border border-ink-100">
                                  <p className="text-xs text-ink-500 mb-1">{item.name}</p>
                                  <p className="font-semibold text-ink-900">¥{item.amount.toFixed(2)}</p>
                                  {item.deduction && item.deduction > 0 && (
                                    <p className="text-xs text-danger-600 mt-1">扣减: -¥{item.deduction.toFixed(2)}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {payDialog.bill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => !paying && setPayDialog({ open: false, bill: null, amount: '' })} />
          <div className="relative bg-white rounded-2xl shadow-card p-6 w-full max-w-md animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-ink-900">账单缴费</h3>
              <button
                onClick={() => !paying && setPayDialog({ open: false, bill: null, amount: '' })}
                className="p-1.5 rounded-lg hover:bg-ink-100 text-ink-400"
                disabled={paying}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-warm-50 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-ink-500">幼儿姓名</span>
                  <span className="font-medium text-ink-900">{payDialog.bill.childName}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-ink-500">账单月份</span>
                  <span className="font-medium text-ink-900">{payDialog.bill.month}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-ink-500">应付金额</span>
                  <span className="text-xl font-display text-primary-600">
                    ¥{(payDialog.bill.totalAmount - payDialog.bill.paidAmount).toFixed(2)}
                  </span>
                </div>
              </div>

              {payDialog.bill.paidAmount > 0 && (
                <div className="bg-warning-50 rounded-xl p-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning-500 flex-shrink-0" />
                  <p className="text-sm text-warning-700">
                    已部分付款 ¥{payDialog.bill.paidAmount.toFixed(2)}，本次可部分付款
                  </p>
                </div>
              )}

              <div>
                <label className="label">付款金额</label>
                <input
                  type="number"
                  value={payDialog.amount}
                  onChange={(e) => setPayDialog({ ...payDialog, amount: e.target.value })}
                  className="input"
                  placeholder="请输入付款金额"
                  step="0.01"
                  min="0"
                  max={payDialog.bill.totalAmount - payDialog.bill.paidAmount}
                  disabled={paying}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={() => setPayDialog({ open: false, bill: null, amount: '' })}
                disabled={paying}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-ink-700 bg-ink-100 hover:bg-ink-200 transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handlePay}
                disabled={paying}
                className="btn-primary"
              >
                <CreditCard className="w-4 h-4" />
                {paying ? '处理中...' : '确认缴费'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={restoreDialog.open}
        title="恢复入园确认"
        description={`确定要为 ${restoreDialog.bill?.childName} 恢复入园吗？恢复后将重新计算账单状态。`}
        confirmText="确认恢复"
        confirmVariant="primary"
        loading={restoring}
        onConfirm={handleRestore}
        onCancel={() => !restoring && setRestoreDialog({ open: false, bill: null })}
      />
    </div>
  );
}
