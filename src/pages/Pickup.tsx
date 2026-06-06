import { useState, useEffect, useMemo } from 'react';
import { QrCode, UserCheck, AlertCircle, RefreshCw, Camera, Clock, Search, CheckCircle, XCircle, ShieldAlert } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { PickupCode as PickupCodeType, PickupRecord, Child, Guardian } from '@shared/types';
import { pickupApi, childrenApi } from '@/api';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useAuthStore } from '@/store/authStore';
import { showToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

type TabKey = 'code' | 'records';

function formatTimeRemaining(expiresAt: string): { minutes: number; seconds: number; expired: boolean } {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return { minutes: 0, seconds: 0, expired: true };
  const totalSeconds = Math.floor(diff / 1000);
  return {
    minutes: Math.floor(totalSeconds / 60),
    seconds: totalSeconds % 60,
    expired: false,
  };
}

function ManualVerifyDialog({
  open,
  onClose,
  children,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  children: Child[];
  onSubmit: (data: { childId: number; guardianId: number; photoMatch: boolean; isAbnormal: boolean; abnormalNote?: string }) => void;
}) {
  const [childId, setChildId] = useState<number | ''>('');
  const [guardianId, setGuardianId] = useState<number | ''>('');
  const [photoMatch, setPhotoMatch] = useState(true);
  const [isAbnormal, setIsAbnormal] = useState(false);
  const [abnormalNote, setAbnormalNote] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedChild = children.find((c) => c.id === childId);

  const handleSubmit = async () => {
    if (!childId || !guardianId) {
      showToast('请选择幼儿和接送人', 'warning');
      return;
    }
    setLoading(true);
    await onSubmit({
      childId: childId as number,
      guardianId: guardianId as number,
      photoMatch,
      isAbnormal,
      abnormalNote: abnormalNote || undefined,
    });
    setLoading(false);
    setChildId('');
    setGuardianId('');
    setPhotoMatch(true);
    setIsAbnormal(false);
    setAbnormalNote('');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-card p-6 w-full max-w-lg animate-scale-in max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-ink-900 mb-5 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-warning-500" />
          手动核验
        </h3>

        <div className="space-y-4">
          <div>
            <label className="label">选择幼儿</label>
            <select
              value={childId}
              onChange={(e) => {
                setChildId(e.target.value ? Number(e.target.value) : '');
                setGuardianId('');
              }}
              className="input"
            >
              <option value="">请选择幼儿</option>
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}（{c.className || '未分班'}）
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">选择接送人</label>
            <select
              value={guardianId}
              onChange={(e) => setGuardianId(e.target.value ? Number(e.target.value) : '')}
              className="input"
              disabled={!selectedChild}
            >
              <option value="">请选择接送人</option>
              {selectedChild?.guardians.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}（{g.relation}）
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between p-4 bg-warm-50 rounded-xl">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-accent-500" />
              <span className="text-sm font-medium text-ink-800">照片比对结果</span>
            </div>
            <button
              onClick={() => setPhotoMatch(!photoMatch)}
              className={cn(
                'relative w-12 h-7 rounded-full transition-colors duration-200',
                photoMatch ? 'bg-success-500' : 'bg-ink-300'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-200',
                  photoMatch && 'translate-x-5'
                )}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-danger-50 rounded-xl">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-danger-500" />
              <span className="text-sm font-medium text-ink-800">标记为异常</span>
            </div>
            <button
              onClick={() => setIsAbnormal(!isAbnormal)}
              className={cn(
                'relative w-12 h-7 rounded-full transition-colors duration-200',
                isAbnormal ? 'bg-danger-500' : 'bg-ink-300'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-200',
                  isAbnormal && 'translate-x-5'
                )}
              />
            </button>
          </div>

          {isAbnormal && (
            <div>
              <label className="label">异常备注</label>
              <textarea
                value={abnormalNote}
                onChange={(e) => setAbnormalNote(e.target.value)}
                placeholder="请描述异常情况..."
                className="input min-h-[80px] resize-none"
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 mt-6">
          <button onClick={onClose} className="btn-ghost" disabled={loading}>
            取消
          </button>
          <button onClick={handleSubmit} className="btn-primary" disabled={loading}>
            <UserCheck className="w-4 h-4" />
            确认核验
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Pickup() {
  const { user, hasRole } = useAuthStore();
  const isAdmin = hasRole(['super_admin', 'principal', 'teacher']);
  const isParent = hasRole(['parent']);

  const [activeTab, setActiveTab] = useState<TabKey>(isAdmin ? 'records' : 'code');
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<number | ''>('');
  const [selectedGuardianId, setSelectedGuardianId] = useState<number | ''>('');
  const [pickupCode, setPickupCode] = useState<PickupCodeType | null>(null);
  const [timeRemaining, setTimeRemaining] = useState({ minutes: 0, seconds: 0, expired: true });
  const [generatingCode, setGeneratingCode] = useState(false);

  const [verifyInput, setVerifyInput] = useState('');
  const [verifyResult, setVerifyResult] = useState<{ success: boolean; record?: PickupRecord; message?: string } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  const [records, setRecords] = useState<PickupRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const selectedChild = useMemo(() => children.find((c) => c.id === selectedChildId), [children, selectedChildId]);
  const selectedGuardian = useMemo(
    () => selectedChild?.guardians.find((g) => g.id === selectedGuardianId),
    [selectedChild, selectedGuardianId]
  );

  useEffect(() => {
    fetchChildren();
    if (isAdmin) fetchRecords();
  }, []);

  useEffect(() => {
    if (isParent && children.length > 0 && user?.childIds && user.childIds.length > 0) {
      const firstChildId = user.childIds[0];
      setSelectedChildId(firstChildId);
      const firstChild = children.find((c) => c.id === firstChildId);
      if (firstChild?.guardians?.[0]) {
        setSelectedGuardianId(firstChild.guardians[0].id);
      }
    }
  }, [children, user, isParent]);

  useEffect(() => {
    if (pickupCode) {
      const timer = setInterval(() => {
        setTimeRemaining(formatTimeRemaining(pickupCode.expiresAt));
      }, 1000);
      setTimeRemaining(formatTimeRemaining(pickupCode.expiresAt));
      return () => clearInterval(timer);
    }
  }, [pickupCode]);

  useEffect(() => {
    if (selectedChildId && selectedGuardianId && isParent) {
      fetchPickupCode();
    }
  }, [selectedChildId, selectedGuardianId]);

  const fetchChildren = async () => {
    try {
      const data = await childrenApi.list();
      setChildren(data);
    } catch (e) {
      showToast('加载幼儿列表失败', 'error');
    }
  };

  const fetchPickupCode = async () => {
    if (!selectedChildId) return;
    try {
      const codes = await pickupApi.codes(selectedChildId as number);
      const valid = codes.find((c) => new Date(c.expiresAt).getTime() > Date.now());
      if (valid) {
        setPickupCode(valid);
      } else {
        setPickupCode(null);
      }
    } catch (e) {
      setPickupCode(null);
    }
  };

  const generatePickupCode = async () => {
    if (!selectedChildId || !selectedGuardianId) {
      showToast('请选择孩子和接送人', 'warning');
      return;
    }
    setGeneratingCode(true);
    try {
      const code = await pickupApi.generateCode({
        childId: selectedChildId as number,
        guardianId: selectedGuardianId as number,
      });
      setPickupCode(code);
      showToast('接送码已刷新', 'success');
    } catch (e) {
      showToast('生成接送码失败', 'error');
    } finally {
      setGeneratingCode(false);
    }
  };

  const fetchRecords = async () => {
    setLoadingRecords(true);
    try {
      const data = await pickupApi.records();
      setRecords(data);
    } catch (e) {
      showToast('加载接送记录失败', 'error');
    } finally {
      setLoadingRecords(false);
    }
  };

  const handleVerify = async () => {
    if (!verifyInput.trim()) {
      showToast('请输入接送码', 'warning');
      return;
    }
    setVerifying(true);
    setVerifyResult(null);
    try {
      const record = await pickupApi.verify({ code: verifyInput.trim() });
      setVerifyResult({ success: true, record });
      showToast('核验成功', 'success');
      setVerifyInput('');
      fetchRecords();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '核验失败';
      setVerifyResult({ success: false, message: msg || '接送码无效或已过期' });
      showToast('核验失败', 'error');
    } finally {
      setVerifying(false);
    }
  };

  const handleManualVerify = async (data: {
    childId: number;
    guardianId: number;
    photoMatch: boolean;
    isAbnormal: boolean;
    abnormalNote?: string;
  }) => {
    try {
      await pickupApi.verify(data);
      showToast('手动核验成功', 'success');
      setManualOpen(false);
      fetchRecords();
    } catch (e) {
      showToast('核验失败', 'error');
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="接送管理"
        subtitle={isAdmin ? '核验接送人身份，记录接送情况' : '生成接送码，安全接送孩子'}
        actions={
          isAdmin && activeTab === 'records' ? (
            <button onClick={fetchRecords} className="btn-outline" disabled={loadingRecords}>
              <RefreshCw className={cn('w-4 h-4', loadingRecords && 'animate-spin')} />
              刷新
            </button>
          ) : null
        }
      />

      <div className="flex items-center gap-1 p-1.5 bg-white rounded-2xl shadow-sm border border-ink-200 mb-6 w-fit">
        <button
          onClick={() => setActiveTab('code')}
          className={cn(
            'px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2',
            activeTab === 'code'
              ? 'bg-gradient-to-r from-primary-500 to-primary-400 text-white shadow-soft'
              : 'text-ink-600 hover:bg-warm-50'
          )}
        >
          <QrCode className="w-4 h-4" />
          接送码
        </button>
        <button
          onClick={() => setActiveTab('records')}
          className={cn(
            'px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2',
            activeTab === 'records'
              ? 'bg-gradient-to-r from-primary-500 to-primary-400 text-white shadow-soft'
              : 'text-ink-600 hover:bg-warm-50'
          )}
        >
          <Clock className="w-4 h-4" />
          接送记录
        </button>
      </div>

      {activeTab === 'code' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card animate-slide-up">
            <h3 className="text-lg font-semibold text-ink-900 mb-4 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-primary-500" />
              生成接送码
            </h3>

            <div className="space-y-4">
              <div>
                <label className="label">选择孩子</label>
                <select
                  value={selectedChildId}
                  onChange={(e) => {
                    setSelectedChildId(e.target.value ? Number(e.target.value) : '');
                    setSelectedGuardianId('');
                    setPickupCode(null);
                  }}
                  className="input"
                  disabled={!isParent && children.length === 0}
                >
                  <option value="">请选择孩子</option>
                  {children.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}（{c.className || '未分班'}）
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">选择接送人</label>
                <select
                  value={selectedGuardianId}
                  onChange={(e) => {
                    setSelectedGuardianId(e.target.value ? Number(e.target.value) : '');
                    setPickupCode(null);
                  }}
                  className="input"
                  disabled={!selectedChild}
                >
                  <option value="">请选择接送人</option>
                  {selectedChild?.guardians.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}（{g.relation}）
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={generatePickupCode}
                className="btn-primary w-full"
                disabled={generatingCode || !selectedChildId || !selectedGuardianId}
              >
                <RefreshCw className={cn('w-4 h-4', generatingCode && 'animate-spin')} />
                {pickupCode && !timeRemaining.expired ? '刷新接送码' : '生成接送码'}
              </button>
            </div>

            {isAdmin && (
              <>
                <div className="divider" />
                <h4 className="text-sm font-semibold text-ink-800 mb-3 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-accent-500" />
                  老师核验
                </h4>
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                    <input
                      type="text"
                      value={verifyInput}
                      onChange={(e) => setVerifyInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                      placeholder="输入/扫描接送码"
                      className="input pl-10"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleVerify} className="btn-primary flex-1" disabled={verifying}>
                      <UserCheck className="w-4 h-4" />
                      核验
                    </button>
                    <button onClick={() => setManualOpen(true)} className="btn-outline">
                      手动核验
                    </button>
                  </div>
                </div>

                {verifyResult && (
                  <div
                    className={cn(
                      'mt-4 p-4 rounded-2xl animate-scale-in',
                      verifyResult.success ? 'bg-success-50 border border-success-200' : 'bg-danger-50 border border-danger-200'
                    )}
                  >
                    {verifyResult.success && verifyResult.record ? (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle className="w-5 h-5 text-success-500" />
                          <span className="font-semibold text-success-700">核验成功</span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <p className="text-ink-700">
                            <span className="text-ink-500">幼儿：</span>
                            <span className="font-medium">{verifyResult.record.childName}</span>
                          </p>
                          <p className="text-ink-700">
                            <span className="text-ink-500">接送人：</span>
                            <span className="font-medium">{verifyResult.record.guardianName}</span>
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <XCircle className="w-5 h-5 text-danger-500" />
                        <span className="font-semibold text-danger-700">{verifyResult.message || '核验失败'}</span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="lg:col-span-2 card animate-slide-up" style={{ animationDelay: '100ms' }}>
            {pickupCode && !timeRemaining.expired && selectedGuardian ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="bg-white p-6 rounded-3xl shadow-float border-4 border-primary-100 mb-6">
                  <QRCodeSVG
                    value={pickupCode.code}
                    size={240}
                    level="H"
                    includeMargin={false}
                    fgColor="#2D3436"
                    bgColor="#FFFFFF"
                  />
                </div>

                <div className="flex items-center gap-3 mb-3">
                  {selectedGuardian.photo ? (
                    <img
                      src={selectedGuardian.photo}
                      alt={selectedGuardian.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-primary-200"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white font-semibold text-lg">
                      {selectedGuardian.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-ink-900 text-lg">{selectedGuardian.name}</p>
                    <p className="text-sm text-ink-500">{selectedGuardian.relation}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-warning-600 mb-2">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">
                    有效期：{String(timeRemaining.minutes).padStart(2, '0')}:
                    {String(timeRemaining.seconds).padStart(2, '0')}
                  </span>
                </div>

                <p className="text-sm text-ink-500 text-center max-w-xs mt-2">
                  💡 接送时请出示此二维码给老师核验
                </p>
              </div>
            ) : (
              <EmptyState
                icon={QrCode}
                title={pickupCode && timeRemaining.expired ? '接送码已过期' : '暂无接送码'}
                description={pickupCode && timeRemaining.expired ? '点击"刷新接送码"重新生成' : '请先选择孩子和接送人生成接送码'}
                actions={
                  <button
                    onClick={generatePickupCode}
                    className="btn-primary"
                    disabled={!selectedChildId || !selectedGuardianId}
                  >
                    <RefreshCw className="w-4 h-4" />
                    {pickupCode ? '刷新接送码' : '生成接送码'}
                  </button>
                }
              />
            )}
          </div>
        </div>
      )}

      {activeTab === 'records' && (
        <div className="card animate-slide-up">
          {loadingRecords ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
          ) : records.length === 0 ? (
            <EmptyState icon={Clock} title="暂无接送记录" description="今天还没有接送记录" />
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr>
                    <th className="table-header">时间</th>
                    <th className="table-header">幼儿</th>
                    <th className="table-header">接送人</th>
                    <th className="table-header">照片比对</th>
                    <th className="table-header">状态</th>
                    <th className="table-header">操作人</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {records.map((record) => (
                    <tr
                      key={record.id}
                      className={cn(
                        'transition-colors hover:bg-warm-50',
                        record.isAbnormal && 'bg-danger-50 hover:bg-danger-100'
                      )}
                    >
                      <td className="table-cell">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-ink-400" />
                          {new Date(record.createdAt).toLocaleString('zh-CN')}
                        </div>
                      </td>
                      <td className="table-cell font-medium text-ink-900">{record.childName}</td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          {record.guardianPhoto ? (
                            <img
                              src={record.guardianPhoto}
                              alt={record.guardianName}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white text-xs font-semibold">
                              {(record.guardianName || '?').charAt(0)}
                            </div>
                          )}
                          <span>{record.guardianName}</span>
                        </div>
                      </td>
                      <td className="table-cell">
                        {record.photoMatch ? (
                          <span className="badge bg-success-100 text-success-700">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            匹配
                          </span>
                        ) : (
                          <span className="badge bg-danger-100 text-danger-700">
                            <XCircle className="w-3 h-3 mr-1" />
                            不匹配
                          </span>
                        )}
                      </td>
                      <td className="table-cell">
                        {record.isAbnormal ? (
                          <span className="badge bg-danger-100 text-danger-700">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            异常
                          </span>
                        ) : (
                          <span className="badge bg-success-100 text-success-700">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            正常
                          </span>
                        )}
                        {record.isAbnormal && record.abnormalNote && (
                          <p className="text-xs text-danger-600 mt-1 ml-1">备注：{record.abnormalNote}</p>
                        )}
                      </td>
                      <td className="table-cell text-ink-600">
                        {record.operatorId ? `老师 #${record.operatorId}` : '系统核验'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <ManualVerifyDialog
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        children={children}
        onSubmit={handleManualVerify}
      />

      <ConfirmDialog
        open={confirmCancel}
        title="确认取消"
        description="确定要取消当前操作吗？"
        onConfirm={() => setConfirmCancel(false)}
        onCancel={() => setConfirmCancel(false)}
      />
    </div>
  );
}
