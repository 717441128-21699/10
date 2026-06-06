import { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import {
  TrendingUp,
  Users,
  Heart,
  Star,
  AlertTriangle,
  Activity,
  Download,
  Filter,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Building2,
  UserRound,
  QrCode,
  Wallet,
  Loader2,
} from 'lucide-react';
import type { DashboardStats, WarningItem, Campus } from '@shared/types';
import { statsApi, reportsApi, settingsApi } from '@/api';
import PageHeader from '@/components/ui/PageHeader';
import { showToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  trend?: number;
  badge?: {
    type: 'danger' | 'warning' | 'success';
    value: string | number;
  };
  extra?: React.ReactNode;
  className?: string;
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  gradient,
  trend,
  badge,
  extra,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'stat-card card-hover transition-all duration-300 hover:scale-[1.02]',
        gradient,
        className
      )}
    >
      <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
      <div className="absolute right-8 bottom-0 w-20 h-20 bg-white/5 rounded-full translate-y-10" />

      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Icon className="w-6 h-6 text-white" />
          </div>
          {badge && (
            <span
              className={cn(
                'badge',
                badge.type === 'danger' && 'bg-danger-500 text-white',
                badge.type === 'warning' && 'bg-warning-500 text-white',
                badge.type === 'success' && 'bg-success-500 text-white'
              )}
            >
              {badge.value}
            </span>
          )}
        </div>

        <div className="mt-5">
          <p className="text-white/80 text-sm font-medium">{title}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-4xl font-display font-bold tracking-tight text-white">
              {value}
            </span>
            {trend !== undefined && (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 text-xs font-medium',
                  trend >= 0 ? 'text-green-200' : 'text-red-200'
                )}
              >
                {trend >= 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                )}
                {Math.abs(trend)}%
              </span>
            )}
          </div>
          {subtitle && <p className="text-white/70 text-xs mt-1">{subtitle}</p>}
          {extra}
        </div>
      </div>
    </div>
  );
}

function WarningItemCard({
  warning,
  onHandle,
}: {
  warning: WarningItem;
  onHandle: (id: number) => void;
}) {
  const Icon = useMemo(() => {
    switch (warning.type) {
      case 'health':
        return Heart;
      case 'pickup':
        return QrCode;
      case 'billing':
        return Wallet;
      default:
        return AlertTriangle;
    }
  }, [warning.type]);

  const levelConfig = useMemo(() => {
    switch (warning.level) {
      case 'danger':
        return {
          bg: 'bg-danger-50',
          border: 'border-danger-200',
          badge: 'bg-danger-500',
          iconBg: 'bg-danger-100',
          iconColor: 'text-danger-600',
          text: '紧急',
        };
      case 'warning':
        return {
          bg: 'bg-warning-50',
          border: 'border-warning-200',
          badge: 'bg-warning-500',
          iconBg: 'bg-warning-100',
          iconColor: 'text-warning-600',
          text: '预警',
        };
      default:
        return {
          bg: 'bg-accent-50',
          border: 'border-accent-200',
          badge: 'bg-accent-500',
          iconBg: 'bg-accent-100',
          iconColor: 'text-accent-600',
          text: '提示',
        };
    }
  }, [warning.level]);

  return (
    <div
      className={cn(
        'p-4 rounded-xl border transition-all duration-200 hover:shadow-soft',
        levelConfig.bg,
        levelConfig.border
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
            levelConfig.iconBg
          )}
        >
          <Icon className={cn('w-5 h-5', levelConfig.iconColor)} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white',
                levelConfig.badge
              )}
            >
              {levelConfig.text}
            </span>
            <span className="text-xs text-ink-400">
              {warning.createdAt}
            </span>
          </div>
          <p className="mt-1.5 text-sm text-ink-800 line-clamp-2">
            {warning.message}
          </p>
        </div>

        <button
          onClick={() => onHandle(warning.id)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-ink-700 hover:bg-ink-50 border border-ink-200 transition-colors flex-shrink-0"
        >
          处理
        </button>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="card animate-pulse">
      <div className="flex items-start justify-between">
        <div className="w-11 h-11 rounded-xl bg-ink-200" />
        <div className="w-12 h-6 rounded-full bg-ink-200" />
      </div>
      <div className="mt-5 space-y-2">
        <div className="h-4 w-20 rounded bg-ink-200" />
        <div className="h-10 w-28 rounded bg-ink-200" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [selectedCampus, setSelectedCampus] = useState<number | undefined>();
  const [dateRange, setDateRange] = useState<string>('30days');
  const [campusDropdownOpen, setCampusDropdownOpen] = useState(false);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsData, campusesData] = await Promise.all([
          statsApi.dashboard({ campusId: selectedCampus }),
          settingsApi.campusList(),
        ]);
        setStats(statsData);
        setCampuses(campusesData);
      } catch (error) {
        if (error instanceof Error) {
          showToast(error.message || '加载数据失败', 'error');
        } else {
          showToast('加载数据失败', 'error');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedCampus]);

  const attendanceTrendOption = useMemo(() => {
    if (!stats) return {};
    const days = stats.attendance.trend.length;
    return {
      grid: { left: '3%', right: '4%', bottom: '3%', top: '15%', containLabel: true },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderColor: '#EEEEEE',
        borderWidth: 1,
        textStyle: { color: '#2D3436' },
        formatter: (params: any) => {
          const d = params[0];
          return `<div style="font-size:12px">第${d.dataIndex + 1}天<br/><span style="color:#FF8C42;font-weight:600">出勤率: ${d.value}%</span></div>`;
        },
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: stats.attendance.trend.map((_, i) => `第${i + 1}天`),
        axisLine: { lineStyle: { color: '#EEEEEE' } },
        axisLabel: { color: '#9E9E9E', fontSize: 10 },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        max: 100,
        min: 80,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#9E9E9E', fontSize: 10, formatter: '{value}%' },
        splitLine: { lineStyle: { color: '#F5F5F5', type: 'dashed' } },
      },
      series: [
        {
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          showSymbol: false,
          data: stats.attendance.trend,
          lineStyle: { width: 3, color: '#FF8C42' },
          itemStyle: { color: '#FF8C42', borderWidth: 2, borderColor: '#fff' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(255, 140, 66, 0.35)' },
              { offset: 1, color: 'rgba(255, 140, 66, 0.02)' },
            ]),
          },
          emphasis: { focus: 'series', itemStyle: { showSymbol: true } },
        },
      ],
    };
  }, [stats]);

  const healthPieOption = useMemo(() => {
    if (!stats) return {};
    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderColor: '#EEEEEE',
        borderWidth: 1,
        textStyle: { color: '#2D3436' },
        formatter: '{b}: {c}次 ({d}%)',
      },
      legend: {
        orient: 'vertical',
        right: '5%',
        top: 'center',
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 12,
        textStyle: { color: '#757575', fontSize: 12 },
      },
      series: [
        {
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['35%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
          label: { show: false },
          emphasis: {
            label: { show: true, fontSize: 14, fontWeight: 'bold', formatter: '{b}\n{d}%' },
          },
          labelLine: { show: false },
          data: stats.health.eventDistribution.map((item, index) => ({
            value: item.value,
            name: item.name,
            itemStyle: {
              color: ['#FF6B6B', '#FFC107', '#4CAF50', '#4ECDC4', '#FF8C42'][
                index % 5
              ],
            },
          })),
        },
      ],
    };
  }, [stats]);

  const activityBarOption = useMemo(() => {
    if (!stats) return {};
    const data = stats.activities.popularity.slice(0, 5).reverse();
    return {
      grid: { left: '3%', right: '10%', bottom: '3%', top: '5%', containLabel: true },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderColor: '#EEEEEE',
        borderWidth: 1,
        textStyle: { color: '#2D3436' },
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const d = params[0];
          return `<div style="font-size:12px">${d.name}<br/><span style="color:#4ECDC4;font-weight:600">参与: ${d.value}人</span></div>`;
        },
      },
      xAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#9E9E9E', fontSize: 10 },
        splitLine: { lineStyle: { color: '#F5F5F5', type: 'dashed' } },
      },
      yAxis: {
        type: 'category',
        data: data.map((d) => d.name),
        axisLine: { lineStyle: { color: '#EEEEEE' } },
        axisTick: { show: false },
        axisLabel: { color: '#757575', fontSize: 11 },
      },
      series: [
        {
          type: 'bar',
          data: data.map((d) => d.count),
          barWidth: 18,
          itemStyle: {
            borderRadius: [0, 8, 8, 0],
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#81DCD4' },
              { offset: 1, color: '#4ECDC4' },
            ]),
          },
          label: {
            show: true,
            position: 'right',
            color: '#4ECDC4',
            fontWeight: 600,
            fontSize: 12,
          },
        },
      ],
    };
  }, [stats]);

  const satisfactionBarOption = useMemo(() => {
    if (!stats) return {};
    const distribution = stats.satisfaction.distribution || [0, 0, 0, 0, 0];
    return {
      grid: { left: '3%', right: '5%', bottom: '3%', top: '5%', containLabel: true },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderColor: '#EEEEEE',
        borderWidth: 1,
        textStyle: { color: '#2D3436' },
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const d = params[0];
          return `<div style="font-size:12px">${d.name}<br/><span style="color:#FF8C42;font-weight:600">${d.value}条评价</span></div>`;
        },
      },
      xAxis: {
        type: 'category',
        data: ['1星', '2星', '3星', '4星', '5星'],
        axisLine: { lineStyle: { color: '#EEEEEE' } },
        axisTick: { show: false },
        axisLabel: { color: '#757575', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#9E9E9E', fontSize: 10 },
        splitLine: { lineStyle: { color: '#F5F5F5', type: 'dashed' } },
      },
      series: [
        {
          type: 'bar',
          data: distribution,
          barWidth: 28,
          itemStyle: {
            borderRadius: [8, 8, 0, 0],
            color: (params: any) => {
              const colors = ['#FF6B6B', '#FFC107', '#FFB875', '#4CAF50', '#4ECDC4'];
              return colors[params.dataIndex];
            },
          },
          label: {
            show: true,
            position: 'top',
            color: '#757575',
            fontSize: 12,
          },
        },
      ],
    };
  }, [stats]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await reportsApi.export({
        type: 'attendance',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        campusId: selectedCampus,
      });
      showToast('报表导出成功', 'success');
    } catch (error) {
      if (error instanceof Error) {
        showToast(error.message || '导出失败', 'error');
      } else {
        showToast('导出失败', 'error');
      }
    } finally {
      setExporting(false);
    }
  };

  const handleWarning = (id: number) => {
    showToast('处理预警功能开发中', 'info');
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              'w-4 h-4',
              star <= Math.round(rating)
                ? 'text-warning-400 fill-warning-400'
                : 'text-ink-200'
            )}
          />
        ))}
      </div>
    );
  };

  const todayTrend = stats ? stats.attendance.trend[stats.attendance.trend.length - 1] - stats.attendance.trend[stats.attendance.trend.length - 2] || 0 : 0;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="大屏首页"
        subtitle="实时掌握园区运营数据"
        actions={
          <>
            <div className="relative">
              <button
                onClick={() => {
                  setCampusDropdownOpen(!campusDropdownOpen);
                  setDateDropdownOpen(false);
                }}
                className="btn-outline"
              >
                <Building2 className="w-4 h-4" />
                <span>{campuses.find((c) => c.id === selectedCampus)?.name || '全部校区'}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              {campusDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setCampusDropdownOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-card border border-ink-200 py-1.5 z-50 animate-scale-in">
                    <button
                      onClick={() => {
                        setSelectedCampus(undefined);
                        setCampusDropdownOpen(false);
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-ink-50 transition-colors',
                        !selectedCampus ? 'text-primary-600 font-medium' : 'text-ink-700'
                      )}
                    >
                      <Filter className="w-4 h-4" />
                      全部校区
                    </button>
                    {campuses.map((campus) => (
                      <button
                        key={campus.id}
                        onClick={() => {
                          setSelectedCampus(campus.id);
                          setCampusDropdownOpen(false);
                        }}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-ink-50 transition-colors',
                          selectedCampus === campus.id ? 'text-primary-600 font-medium' : 'text-ink-700'
                        )}
                      >
                        <UserRound className="w-4 h-4" />
                        {campus.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => {
                  setDateDropdownOpen(!dateDropdownOpen);
                  setCampusDropdownOpen(false);
                }}
                className="btn-outline"
              >
                <Calendar className="w-4 h-4" />
                <span>
                  {dateRange === '7days' ? '近7天' : dateRange === '90days' ? '近90天' : '近30天'}
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>
              {dateDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setDateDropdownOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-xl shadow-card border border-ink-200 py-1.5 z-50 animate-scale-in">
                    {[
                      { value: '7days', label: '近7天' },
                      { value: '30days', label: '近30天' },
                      { value: '90days', label: '近90天' },
                    ].map((item) => (
                      <button
                        key={item.value}
                        onClick={() => {
                          setDateRange(item.value);
                          setDateDropdownOpen(false);
                        }}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-ink-50 transition-colors',
                          dateRange === item.value ? 'text-primary-600 font-medium' : 'text-ink-700'
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={handleExport}
              disabled={exporting}
              className="btn-primary disabled:opacity-60"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              导出报表
            </button>
          </>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
            <StatCard
              title="今日出勤率"
              value={`${stats.attendance.todayRate}%`}
              subtitle="较昨日变化"
              icon={TrendingUp}
              gradient="bg-gradient-to-br from-primary-500 to-primary-600"
              trend={todayTrend}
            />
            <StatCard
              title="在园人数"
              value={stats.attendance.todayPresent}
              subtitle={`总人数 ${stats.attendance.todayTotal} 人`}
              icon={Users}
              gradient="bg-gradient-to-br from-accent-500 to-accent-600"
            />
            <StatCard
              title="健康事件"
              value={stats.health.todayEvents}
              subtitle="今日发生"
              icon={Heart}
              gradient="bg-gradient-to-br from-danger-400 to-danger-600"
              badge={{ type: 'danger', value: `${stats.health.activeAlerts}条待处理` }}
            />
            <StatCard
              title="活动参与"
              value={stats.activities.totalRegistrations}
              subtitle={`进行中 ${stats.activities.ongoingCount} 场`}
              icon={Activity}
              gradient="bg-gradient-to-br from-success-400 to-success-600"
            />
            <StatCard
              title="家长满意度"
              value={stats.satisfaction.average.toFixed(1)}
              subtitle={`共 ${stats.satisfaction.totalCount} 条评价`}
              icon={Star}
              gradient="bg-gradient-to-br from-warning-400 to-warning-600"
              extra={<div className="mt-2">{renderStars(stats.satisfaction.average)}</div>}
            />
          </div>
        )
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <div className="xl:col-span-2 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-display text-ink-900">出勤率趋势</h3>
                  <p className="text-xs text-ink-500 mt-0.5">近30天</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-primary-500" />
                </div>
              </div>
              {loading ? (
                <div className="h-64 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-ink-300" />
                </div>
              ) : (
                <ReactECharts
                  option={attendanceTrendOption}
                  style={{ height: '256px' }}
                  notMerge={true}
                  lazyUpdate={true}
                />
              )}
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-display text-ink-900">健康事件分布</h3>
                  <p className="text-xs text-ink-500 mt-0.5">今日统计</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-danger-50 flex items-center justify-center">
                  <Heart className="w-4 h-4 text-danger-500" />
                </div>
              </div>
              {loading ? (
                <div className="h-64 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-ink-300" />
                </div>
              ) : (
                <ReactECharts
                  option={healthPieOption}
                  style={{ height: '256px' }}
                  notMerge={true}
                  lazyUpdate={true}
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-display text-ink-900">活动热度 Top5</h3>
                  <p className="text-xs text-ink-500 mt-0.5">参与人数排行</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-accent-50 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-accent-500" />
                </div>
              </div>
              {loading ? (
                <div className="h-64 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-ink-300" />
                </div>
              ) : (
                <ReactECharts
                  option={activityBarOption}
                  style={{ height: '256px' }}
                  notMerge={true}
                  lazyUpdate={true}
                />
              )}
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-display text-ink-900">满意度分布</h3>
                  <p className="text-xs text-ink-500 mt-0.5">星级评价统计</p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-warning-50 flex items-center justify-center">
                  <Star className="w-4 h-4 text-warning-500" />
                </div>
              </div>
              {loading ? (
                <div className="h-64 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-ink-300" />
                </div>
              ) : (
                <ReactECharts
                  option={satisfactionBarOption}
                  style={{ height: '256px' }}
                  notMerge={true}
                  lazyUpdate={true}
                />
              )}
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-display text-ink-900">班级出勤率</h3>
                <p className="text-xs text-ink-500 mt-0.5">各班级今日出勤情况</p>
              </div>
            </div>
            {loading ? (
              <div className="h-48 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-ink-300" />
              </div>
            ) : stats ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="table-header rounded-l-xl">班级名称</th>
                      <th className="table-header">出勤人数</th>
                      <th className="table-header">总人数</th>
                      <th className="table-header rounded-r-xl">出勤率</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {stats.attendance.byClass.map((item, index) => (
                      <tr key={index} className="hover:bg-warm-50/50 transition-colors">
                        <td className="table-cell font-medium">{item.name}</td>
                        <td className="table-cell">
                          <span className="text-success-600 font-medium">{item.present}</span>
                        </td>
                        <td className="table-cell text-ink-600">{item.total}</td>
                        <td className="table-cell">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 max-w-[180px] h-2 bg-ink-100 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-all duration-500',
                                  item.rate >= 95
                                    ? 'bg-gradient-to-r from-success-400 to-success-500'
                                    : item.rate >= 85
                                    ? 'bg-gradient-to-r from-warning-400 to-warning-500'
                                    : 'bg-gradient-to-r from-danger-400 to-danger-500'
                                )}
                                style={{ width: `${item.rate}%` }}
                              />
                            </div>
                            <span
                              className={cn(
                                'text-sm font-medium min-w-[48px]',
                                item.rate >= 95
                                  ? 'text-success-600'
                                  : item.rate >= 85
                                  ? 'text-warning-600'
                                  : 'text-danger-600'
                              )}
                            >
                              {item.rate}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-display text-ink-900">实时预警</h3>
              <p className="text-xs text-ink-500 mt-0.5">
                {stats ? `共 ${stats.warnings.length} 条待处理` : ''}
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-danger-50 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-danger-500" />
            </div>
          </div>
          {loading ? (
            <div className="h-[calc(100vh-320px)] flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-ink-300" />
            </div>
          ) : stats && stats.warnings.length > 0 ? (
            <div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
              {stats.warnings.map((warning) => (
                <WarningItemCard
                  key={warning.id}
                  warning={warning}
                  onHandle={handleWarning}
                />
              ))}
            </div>
          ) : (
            <div className="h-[calc(100vh-320px)] flex flex-col items-center justify-center text-ink-400">
              <div className="w-16 h-16 rounded-full bg-success-50 flex items-center justify-center mb-3">
                <TrendingUp className="w-8 h-8 text-success-500" />
              </div>
              <p className="text-sm">暂无预警信息</p>
              <p className="text-xs text-ink-300 mt-1">系统运行正常</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
