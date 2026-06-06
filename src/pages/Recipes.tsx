import { useState, useEffect, useMemo } from 'react';
import { UtensilsCrossed, Calendar, Star, MessageSquare, ChevronLeft, ChevronRight, RefreshCw, Edit3, Send } from 'lucide-react';
import type { Season, MealType, Recipe as RecipeType, Dish, RecipeFeedback } from '@shared/types';
import { recipesApi } from '@/api';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useAuthStore } from '@/store/authStore';
import { showToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

const SEASONS: { key: Season; label: string; emoji: string }[] = [
  { key: 'spring', label: '春', emoji: '🌸' },
  { key: 'summer', label: '夏', emoji: '☀️' },
  { key: 'autumn', label: '秋', emoji: '🍂' },
  { key: 'winter', label: '冬', emoji: '❄️' },
];

const MEAL_CONFIG: { type: MealType; name: string; emoji: string; color: string }[] = [
  { type: 'breakfast', name: '早餐', emoji: '🥣', color: 'bg-warning-100 text-warning-700 border-warning-200' },
  { type: 'snack_am', name: '上午点心', emoji: '🍪', color: 'bg-accent-100 text-accent-700 border-accent-200' },
  { type: 'lunch', name: '午餐', emoji: '🍱', color: 'bg-primary-100 text-primary-700 border-primary-200' },
  { type: 'snack_pm', name: '下午点心', emoji: '🍎', color: 'bg-success-100 text-success-700 border-success-200' },
  { type: 'dinner', name: '晚餐', emoji: '🍲', color: 'bg-danger-100 text-danger-700 border-danger-200' },
];

const COMMON_ALLERGENS = ['花生', '牛奶', '鸡蛋', '海鲜', '坚果', '小麦', '大豆'];

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getWeekDates(baseDate: Date): Date[] {
  const dates: Date[] = [];
  const day = baseDate.getDay() || 7;
  const monday = new Date(baseDate);
  monday.setDate(baseDate.getDate() - day + 1);
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function getSeasonFromDate(date: Date): Season {
  const month = date.getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

function DishCard({ dish, isAdmin, onEdit }: { dish: Dish; isAdmin: boolean; onEdit?: () => void }) {
  const hasAllergens = dish.allergens && dish.allergens.length > 0;
  return (
    <div className="group bg-warm-50 rounded-2xl p-4 border border-warm-200 hover:border-primary-300 hover:shadow-soft transition-all duration-300">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h5 className="font-semibold text-ink-900">{dish.name}</h5>
        {isAdmin && (
          <button
            onClick={onEdit}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-white text-ink-400 hover:text-primary-500 transition-all"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        )}
      </div>
      {dish.ingredients && dish.ingredients.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {dish.ingredients.map((ing, idx) => (
            <span key={idx} className="badge bg-white text-ink-600 border border-ink-200">
              {ing}
            </span>
          ))}
        </div>
      )}
      {dish.nutrition && (
        <p className="text-xs text-ink-500 mb-2">营养：{dish.nutrition}</p>
      )}
      {hasAllergens && (
        <div className="flex flex-wrap gap-1.5">
          {dish.allergens.map((allergen, idx) => (
            <span key={idx} className="badge bg-danger-100 text-danger-700">
              ⚠️ {allergen}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function FeedbackDialog({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (rating: number, comment: string) => void;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    await onSubmit(rating, comment);
    setLoading(false);
    setRating(5);
    setComment('');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-card p-6 w-full max-w-md animate-scale-in">
        <h3 className="text-lg font-semibold text-ink-900 mb-4">食谱反馈</h3>
        <div className="mb-4">
          <label className="label">评分</label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(n)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={cn(
                    'w-8 h-8 transition-colors',
                    n <= rating ? 'fill-warning-400 text-warning-400' : 'text-ink-300'
                  )}
                />
              </button>
            ))}
          </div>
        </div>
        <div className="mb-6">
          <label className="label">评论（可选）</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="说说您对今天食谱的看法..."
            className="input min-h-[100px] resize-none"
          />
        </div>
        <div className="flex items-center justify-end gap-2">
          <button onClick={onClose} className="btn-ghost" disabled={loading}>
            取消
          </button>
          <button onClick={handleSubmit} className="btn-primary" disabled={loading}>
            <Send className="w-4 h-4" />
            提交反馈
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Recipes() {
  const { user, hasRole } = useAuthStore();
  const isAdmin = hasRole(['super_admin', 'principal', 'teacher']);
  const isParent = hasRole(['parent']);

  const [season, setSeason] = useState<Season>('spring');
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay() || 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - day + 1);
    return monday;
  });
  const [recipes, setRecipes] = useState<RecipeType[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<RecipeType | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbacks, setFeedbacks] = useState<RecipeFeedback[]>([]);
  const [confirmGenerate, setConfirmGenerate] = useState(false);

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);

  useEffect(() => {
    setSeason(getSeasonFromDate(weekStart));
  }, [weekStart]);

  useEffect(() => {
    fetchRecipes();
  }, [weekStart]);

  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const startDate = formatDate(weekDates[0]);
      const endDate = formatDate(weekDates[6]);
      const data = await recipesApi.list({ startDate, endDate });
      setRecipes(data);
    } catch (e) {
      showToast('加载食谱失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedbacks = async (recipeId: number) => {
    try {
      const data = await recipesApi.feedbackList(recipeId);
      setFeedbacks(data);
    } catch (e) {
      showToast('加载反馈失败', 'error');
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const startDate = formatDate(weekDates[0]);
      const endDate = formatDate(weekDates[6]);
      const data = await recipesApi.generateBySeason({
        campusId: user?.campusId || 1,
        startDate,
        endDate,
      });
      setRecipes(data);
      showToast('已按季节智能生成本周食谱', 'success');
    } catch (e) {
      showToast('生成食谱失败', 'error');
    } finally {
      setGenerating(false);
      setConfirmGenerate(false);
    }
  };

  const handlePrevWeek = () => {
    const newWeek = new Date(weekStart);
    newWeek.setDate(weekStart.getDate() - 7);
    setWeekStart(newWeek);
  };

  const handleNextWeek = () => {
    const newWeek = new Date(weekStart);
    newWeek.setDate(weekStart.getDate() + 7);
    setWeekStart(newWeek);
  };

  const handleSubmitFeedback = async (rating: number, comment: string) => {
    if (!selectedRecipe || !user) return;
    try {
      await recipesApi.createFeedback(selectedRecipe.id, {
        parentId: user.id,
        rating,
        comment: comment || undefined,
      });
      showToast('反馈提交成功', 'success');
      setFeedbackOpen(false);
      await fetchFeedbacks(selectedRecipe.id);
      await fetchRecipes();
    } catch (e) {
      showToast('提交反馈失败', 'error');
    }
  };

  const avgRating = useMemo(() => {
    if (!selectedRecipe || !selectedRecipe.feedback || selectedRecipe.feedback.length === 0) return 0;
    const sum = selectedRecipe.feedback.reduce((a, b) => a + b.rating, 0);
    return sum / selectedRecipe.feedback.length;
  }, [selectedRecipe]);

  const ratingDistribution = useMemo(() => {
    if (!selectedRecipe || !selectedRecipe.feedback) return [0, 0, 0, 0, 0];
    const dist = [0, 0, 0, 0, 0];
    selectedRecipe.feedback.forEach((f) => {
      if (f.rating >= 1 && f.rating <= 5) dist[f.rating - 1]++;
    });
    return dist;
  }, [selectedRecipe]);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="食谱管理"
        subtitle="为孩子们制定营养均衡的四季食谱"
        actions={
          <>
            <button onClick={handlePrevWeek} className="btn-ghost !p-2.5">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl border border-ink-200 shadow-sm">
              <Calendar className="w-4 h-4 text-primary-500" />
              <span className="text-sm font-medium text-ink-800">
                {formatDate(weekDates[0])} ~ {formatDate(weekDates[6])}
              </span>
            </div>
            <button onClick={handleNextWeek} className="btn-ghost !p-2.5">
              <ChevronRight className="w-5 h-5" />
            </button>
            {isAdmin && (
              <button onClick={() => setConfirmGenerate(true)} className="btn-primary" disabled={generating}>
                <RefreshCw className={cn('w-4 h-4', generating && 'animate-spin')} />
                按季节智能生成
              </button>
            )}
          </>
        }
      />

      <div className="flex items-center gap-1 p-1.5 bg-white rounded-2xl shadow-sm border border-ink-200 mb-6 w-fit">
        {SEASONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSeason(s.key)}
            className={cn(
              'px-5 py-2 rounded-xl text-sm font-medium transition-all duration-200',
              season === s.key
                ? 'bg-gradient-to-r from-primary-500 to-primary-400 text-white shadow-soft'
                : 'text-ink-600 hover:bg-warm-50'
            )}
          >
            <span className="mr-1.5">{s.emoji}</span>
            {s.label}季
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      ) : recipes.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="暂无食谱"
          description={isAdmin ? '点击"按季节智能生成"创建本周食谱' : '本周食谱尚未发布，请稍后查看'}
          actions={
            isAdmin ? (
              <button onClick={() => setConfirmGenerate(true)} className="btn-primary">
                <RefreshCw className="w-4 h-4" />
                智能生成
              </button>
            ) : null
          }
        />
      ) : (
        <div className="space-y-6">
          {weekDates.map((date) => {
            const recipe = recipes.find((r) => r.date === formatDate(date));
            const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
            const dayIdx = (date.getDay() || 7) - 1;
            const isToday = formatDate(date) === formatDate(new Date());

            return (
              <div
                key={formatDate(date)}
                className={cn(
                  'card animate-slide-up',
                  isToday && 'ring-2 ring-primary-300 ring-offset-2'
                )}
                style={{ animationDelay: `${dayIdx * 50}ms` }}
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-display',
                        isToday
                          ? 'bg-gradient-to-br from-primary-500 to-primary-400 text-white shadow-soft'
                          : 'bg-warm-100 text-ink-800'
                      )}
                    >
                      <span className="text-xs opacity-80">{dayNames[dayIdx]}</span>
                      <span className="text-lg">{date.getDate()}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-ink-900">
                        {formatDate(date)}
                        {isToday && <span className="ml-2 badge bg-primary-100 text-primary-700">今天</span>}
                      </h3>
                      {recipe && (
                        <p className="text-sm text-ink-500">
                          {SEASONS.find((s) => s.key === recipe.season)?.emoji}{' '}
                          {SEASONS.find((s) => s.key === recipe.season)?.label}季食谱
                        </p>
                      )}
                    </div>
                  </div>
                  {recipe && isParent && (
                    <button
                      onClick={() => {
                        setSelectedRecipe(recipe);
                        fetchFeedbacks(recipe.id);
                        setFeedbackOpen(true);
                      }}
                      className="btn-outline"
                    >
                      <MessageSquare className="w-4 h-4" />
                      我要反馈
                    </button>
                  )}
                  {recipe && (
                    <button
                      onClick={() => {
                        setSelectedRecipe(recipe);
                        fetchFeedbacks(recipe.id);
                      }}
                      className="btn-ghost"
                    >
                      <Star className="w-4 h-4 text-warning-400 fill-warning-400" />
                      查看反馈
                    </button>
                  )}
                </div>

                {recipe ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {MEAL_CONFIG.map((mealConfig) => {
                      const meal = recipe.meals.find((m) => m.type === mealConfig.type);
                      return (
                        <div key={mealConfig.type} className="rounded-2xl border border-ink-200 overflow-hidden">
                          <div className={cn('px-4 py-2.5 border-b flex items-center gap-2', mealConfig.color)}>
                            <span className="text-lg">{mealConfig.emoji}</span>
                            <span className="font-semibold">{mealConfig.name}</span>
                          </div>
                          <div className="p-3 space-y-2">
                            {meal && meal.dishes.length > 0 ? (
                              meal.dishes.map((dish, idx) => (
                                <DishCard key={idx} dish={dish} isAdmin={isAdmin} />
                              ))
                            ) : (
                              <p className="text-center text-ink-400 text-sm py-4">暂未安排</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-ink-400">
                    <UtensilsCrossed className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>当日食谱暂未安排</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {selectedRecipe && selectedRecipe.feedback && selectedRecipe.feedback.length > 0 && (
        <div className="card mt-6 animate-slide-up">
          <h3 className="text-lg font-semibold text-ink-900 mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary-500" />
            家长反馈
            <span className="badge bg-primary-100 text-primary-700">{selectedRecipe.feedback.length}条</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="md:col-span-1 bg-warm-50 rounded-2xl p-5">
              <div className="text-center">
                <div className="text-5xl font-display gradient-text mb-2">
                  {avgRating.toFixed(1)}
                </div>
                <div className="flex items-center justify-center gap-0.5 mb-3">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={cn(
                        'w-5 h-5',
                        n <= Math.round(avgRating) ? 'fill-warning-400 text-warning-400' : 'text-ink-200'
                      )}
                    />
                  ))}
                </div>
                <p className="text-sm text-ink-500">平均评分</p>
              </div>
              <div className="mt-5 space-y-2">
                {[5, 4, 3, 2, 1].map((n) => {
                  const count = ratingDistribution[n - 1];
                  const total = selectedRecipe.feedback.length;
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <div key={n} className="flex items-center gap-2">
                      <span className="text-xs text-ink-600 w-6">{n}星</span>
                      <div className="flex-1 h-2 bg-ink-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-warning-400 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-ink-500 w-6">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="md:col-span-2 space-y-3 max-h-[340px] overflow-y-auto pr-2">
              {selectedRecipe.feedback.map((fb) => (
                <div key={fb.id} className="flex gap-3 p-4 bg-warm-50 rounded-2xl">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center text-white font-semibold flex-shrink-0">
                    {(fb.parentName || '?').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-ink-900">{fb.parentName || '匿名家长'}</span>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            className={cn(
                              'w-3.5 h-3.5',
                              n <= fb.rating ? 'fill-warning-400 text-warning-400' : 'text-ink-200'
                            )}
                          />
                        ))}
                      </div>
                    </div>
                    {fb.comment && <p className="text-sm text-ink-700 mb-1">{fb.comment}</p>}
                    <p className="text-xs text-ink-400">
                      {new Date(fb.createdAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <FeedbackDialog
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        onSubmit={handleSubmitFeedback}
      />

      <ConfirmDialog
        open={confirmGenerate}
        title="智能生成食谱"
        description={`将根据当前季节（${SEASONS.find((s) => s.key === season)?.emoji}${SEASONS.find((s) => s.key === season)?.label}季）生成本周（${formatDate(weekDates[0])} ~ ${formatDate(weekDates[6])}）的食谱，是否继续？`}
        confirmText="确认生成"
        onConfirm={handleGenerate}
        onCancel={() => setConfirmGenerate(false)}
        loading={generating}
      />
    </div>
  );
}
