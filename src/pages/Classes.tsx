import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Users,
  MapPin,
  User,
  Sparkles,
  X,
  Edit3,
  Trash2,
  GraduationCap,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { classesApi, settingsApi } from '@/api';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { showToast } from '@/components/ui/Toast';
import type { ClassInfo, CoursePlan, Campus, DictionaryItem } from '@shared/types';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五'];
const PERIODS = [
  { key: 'morning', label: '上午' },
  { key: 'afternoon', label: '下午' },
];

const CATEGORY_COLORS: Record<string, string> = {
  语言: 'bg-primary-100 text-primary-700 border-primary-200',
  数学: 'bg-accent-100 text-accent-700 border-accent-200',
  艺术: 'bg-warning-100 text-warning-700 border-warning-200',
  体育: 'bg-success-100 text-success-700 border-success-200',
  音乐: 'bg-pink-100 text-pink-700 border-pink-200',
  科学: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  社会: 'bg-purple-100 text-purple-700 border-purple-200',
  手工: 'bg-orange-100 text-orange-700 border-orange-200',
  其他: 'bg-ink-100 text-ink-700 border-ink-200',
};

const DEFAULT_CATEGORIES = [
  '语言',
  '数学',
  '艺术',
  '体育',
  '音乐',
  '科学',
  '社会',
  '手工',
  '其他',
];

interface ClassForm {
  name: string;
  campusId: number;
  teacherId: number;
  classroom: string;
  capacity: number;
  ageMin: number;
  ageMax: number;
}

const emptyClassForm: ClassForm = {
  name: '',
  campusId: 0,
  teacherId: 0,
  classroom: '',
  capacity: 20,
  ageMin: 3,
  ageMax: 6,
};

interface CourseForm {
  id?: number;
  name: string;
  category: string;
  period: string;
  weekDay: number;
  timeRange: string;
}

export default function Classes() {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [teachers, setTeachers] = useState<DictionaryItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [courses, setCourses] = useState<CoursePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<ClassInfo | null>(null);

  const [classFormOpen, setClassFormOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassInfo | null>(null);
  const [classForm, setClassForm] = useState<ClassForm>(emptyClassForm);

  const [courseFormOpen, setCourseFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CoursePlan | null>(null);
  const [courseForm, setCourseForm] = useState<CourseForm>({
    name: '',
    category: '语言',
    period: 'morning',
    weekDay: 1,
    timeRange: '',
  });

  const selected = classes.find((c) => c.id === selectedId) || null;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [classesData, campusesData, teachersData] = await Promise.all([
        classesApi.list(),
        settingsApi.campusList(),
        settingsApi.dictList('teacher'),
      ]);
      setClasses(classesData);
      setCampuses(campusesData);
      setTeachers(teachersData);
      if (classesData.length > 0) {
        setSelectedId((prev) => prev || classesData[0].id);
      }
    } catch {
      showToast('加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (selectedId) {
      fetchCourses(selectedId);
    }
  }, [selectedId]);

  const fetchCourses = async (id: number) => {
    try {
      const data = await classesApi.getCourses(id);
      setCourses(data || []);
    } catch {
      setCourses([]);
    }
  };

  const getCoursesForSlot = (weekDay: number, period: string) => {
    return courses.filter((c) => c.weekDay === weekDay && c.period === period);
  };

  const openNewClassForm = () => {
    setEditingClass(null);
    setClassForm({
      ...emptyClassForm,
      campusId: campuses[0]?.id || 0,
    });
    setClassFormOpen(true);
  };

  const openEditClassForm = (cls: ClassInfo) => {
    setEditingClass(cls);
    setClassForm({
      name: cls.name,
      campusId: cls.campusId,
      teacherId: cls.teacherId,
      classroom: cls.classroom,
      capacity: cls.capacity,
      ageMin: cls.ageRange[0],
      ageMax: cls.ageRange[1],
    });
    setClassFormOpen(true);
  };

  const handleClassSubmit = async () => {
    if (!classForm.name.trim()) {
      showToast('请输入班级名称', 'warning');
      return;
    }
    if (!classForm.campusId) {
      showToast('请选择校区', 'warning');
      return;
    }
    if (!classForm.classroom.trim()) {
      showToast('请输入教室', 'warning');
      return;
    }
    try {
      const payload = {
        ...classForm,
        ageRange: [classForm.ageMin, classForm.ageMax] as [number, number],
      };
      if (editingClass) {
        await classesApi.update(editingClass.id, payload);
        showToast('更新成功', 'success');
      } else {
        const created = await classesApi.create(payload);
        setSelectedId(created.id);
        showToast('创建成功', 'success');
      }
      setClassFormOpen(false);
      fetchData();
    } catch {
      showToast('操作失败', 'error');
    }
  };

  const handleDeleteClass = async () => {
    if (!deleteDialog) return;
    try {
      await classesApi.remove(deleteDialog.id);
      showToast('已删除', 'success');
      setDeleteDialog(null);
      setSelectedId(null);
      fetchData();
    } catch {
      showToast('删除失败', 'error');
    }
  };

  const openCourseForm = (
    weekDay: number,
    period: string,
    course?: CoursePlan
  ) => {
    setEditingCourse(course || null);
    setCourseForm({
      id: course?.id,
      name: course?.name || '',
      category: course?.category || '语言',
      period: course?.period || period,
      weekDay: course?.weekDay || weekDay,
      timeRange: '',
    });
    setCourseFormOpen(true);
  };

  const handleCourseSubmit = async () => {
    if (!courseForm.name.trim()) {
      showToast('请输入课程名称', 'warning');
      return;
    }
    try {
      let newCourses: CoursePlan[];
      if (editingCourse) {
        newCourses = courses.map((c) =>
          c.id === editingCourse.id
            ? {
                ...c,
                name: courseForm.name,
                category: courseForm.category,
                period: courseForm.period,
                weekDay: courseForm.weekDay,
              }
            : c
        );
      } else {
        const newCourse: CoursePlan = {
          id: Date.now(),
          classId: selectedId!,
          weekDay: courseForm.weekDay,
          period: courseForm.period,
          name: courseForm.name,
          category: courseForm.category,
        };
        newCourses = [...courses, newCourse];
      }
      await classesApi.saveCourses(selectedId!, newCourses);
      setCourses(newCourses);
      setCourseFormOpen(false);
      showToast('保存成功', 'success');
    } catch {
      showToast('保存失败', 'error');
    }
  };

  const handleRemoveCourse = async (courseId: number) => {
    try {
      const newCourses = courses.filter((c) => c.id !== courseId);
      await classesApi.saveCourses(selectedId!, newCourses);
      setCourses(newCourses);
      showToast('已删除', 'success');
    } catch {
      showToast('删除失败', 'error');
    }
  };

  const handleRecommendCourses = async () => {
    if (!selectedId) return;
    showToast('正在为班级推荐课程...', 'info');
    const recommended: CoursePlan[] = [];
    const templates = [
      { name: '语言启蒙', category: '语言' },
      { name: '数学思维', category: '数学' },
      { name: '创意美术', category: '艺术' },
      { name: '户外活动', category: '体育' },
      { name: '音乐律动', category: '音乐' },
      { name: '科学探索', category: '科学' },
      { name: '社会交往', category: '社会' },
      { name: '手工DIY', category: '手工' },
    ];
    let idx = 0;
    for (let day = 1; day <= 5; day++) {
      for (const period of ['morning', 'afternoon']) {
        if (idx < templates.length) {
          recommended.push({
            id: Date.now() + idx,
            classId: selectedId,
            weekDay: day,
            period,
            name: templates[idx].name,
            category: templates[idx].category,
          });
          idx++;
        }
      }
    }
    try {
      const finalCourses = [...courses, ...recommended];
      await classesApi.saveCourses(selectedId, finalCourses);
      setCourses(finalCourses);
      showToast(`已推荐 ${recommended.length} 门课程`, 'success');
    } catch {
      showToast('推荐失败', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="班级与课程"
        subtitle="管理班级信息和周课表安排"
        actions={
          <>
            {selected && (
              <button
                onClick={handleRecommendCourses}
                className="px-4 py-2 bg-accent-500 text-white rounded-xl text-sm font-medium hover:bg-accent-600 transition-colors flex items-center gap-2 shadow-soft"
              >
                <Sparkles className="w-4 h-4" />
                一键推荐课程
              </button>
            )}
            <button
              onClick={openNewClassForm}
              className="px-4 py-2 bg-primary-500 text-white rounded-xl text-sm font-medium hover:bg-primary-600 transition-colors flex items-center gap-2 shadow-soft"
            >
              <Plus className="w-4 h-4" />
              新增班级
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-ink-700 px-1">
            班级列表 ({classes.length})
          </h3>
          {classes.length === 0 ? (
            <EmptyState
              title="暂无班级"
              description="点击右上角新增第一个班级"
              className="bg-white rounded-2xl"
            />
          ) : (
            <div className="space-y-3">
              {classes.map((cls) => {
                const isSelected = cls.id === selectedId;
                const percent = Math.min(
                  (cls.studentCount / cls.capacity) * 100,
                  100
                );
                return (
                  <div
                    key={cls.id}
                    onClick={() => setSelectedId(cls.id)}
                    className={cn(
                      'bg-white rounded-2xl p-4 cursor-pointer transition-all border',
                      isSelected
                        ? 'shadow-float border-primary-300 ring-2 ring-primary-100'
                        : 'shadow-card border-ink-100 hover:border-primary-200 hover:shadow-soft'
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center',
                            isSelected
                              ? 'bg-primary-500 text-white'
                              : 'bg-primary-100 text-primary-600'
                          )}
                        >
                          <GraduationCap className="w-5 h-5" />
                        </div>
                        <div>
                          <h4
                            className={cn(
                              'font-semibold',
                              isSelected ? 'text-primary-700' : 'text-ink-900'
                            )}
                          >
                            {cls.name}
                          </h4>
                          <p className="text-xs text-ink-500">
                            {campuses.find((c) => c.id === cls.campusId)?.name}
                          </p>
                        </div>
                      </div>
                      {isSelected && (
                        <ChevronRight className="w-5 h-5 text-primary-500" />
                      )}
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-ink-600">
                        <User className="w-3.5 h-3.5 text-ink-400" />
                        <span>{cls.teacherName || '未分配老师'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-ink-600">
                        <MapPin className="w-3.5 h-3.5 text-ink-400" />
                        <span>{cls.classroom}</span>
                      </div>
                      <div className="flex items-center gap-2 text-ink-600">
                        <Users className="w-3.5 h-3.5 text-ink-400" />
                        <span>
                          {cls.ageRange[0]}-{cls.ageRange[1]}岁
                        </span>
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-ink-500 mb-1">
                        <span>人数</span>
                        <span>
                          {cls.studentCount}/{cls.capacity}
                        </span>
                      </div>
                      <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            percent >= 90
                              ? 'bg-danger-500'
                              : percent >= 70
                              ? 'bg-warning-500'
                              : 'bg-success-500'
                          )}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {isSelected && (
                      <div className="flex gap-2 mt-4 pt-3 border-t border-ink-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditClassForm(cls);
                          }}
                          className="flex-1 py-1.5 rounded-lg text-xs bg-ink-100 hover:bg-ink-200 text-ink-700 flex items-center justify-center gap-1 transition-colors"
                        >
                          <Edit3 className="w-3 h-3" />
                          编辑
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteDialog(cls);
                          }}
                          className="flex-1 py-1.5 rounded-lg text-xs bg-danger-50 hover:bg-danger-100 text-danger-600 flex items-center justify-center gap-1 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          删除
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          {!selected ? (
            <EmptyState
              title="请选择班级"
              description="从左侧选择一个班级查看课表"
              className="py-20"
            />
          ) : (
            <>
              <div className="p-5 border-b border-ink-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-ink-900 text-lg">
                    {selected.name} - 周课表
                  </h3>
                  <p className="text-sm text-ink-500 mt-0.5">
                    点击空白格添加课程，点击课程卡片编辑
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {DEFAULT_CATEGORIES.slice(0, 6).map((cat) => (
                    <span
                      key={cat}
                      className={cn(
                        'px-2 py-1 rounded-lg border',
                        CATEGORY_COLORS[cat] || CATEGORY_COLORS['其他']
                      )}
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="bg-ink-50">
                      <th className="w-20 p-3 text-sm font-medium text-ink-500 text-center">
                        时间
                      </th>
                      {WEEKDAYS.map((day, i) => (
                        <th
                          key={i}
                          className="p-3 text-sm font-medium text-ink-700 text-center"
                        >
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PERIODS.map((period) => (
                      <tr key={period.key} className="border-t border-ink-100">
                        <td className="p-3 align-top">
                          <div className="flex flex-col items-center justify-center h-full py-2">
                            <Clock className="w-4 h-4 text-ink-400 mb-1" />
                            <span className="text-sm font-medium text-ink-600">
                              {period.label}
                            </span>
                          </div>
                        </td>
                        {WEEKDAYS.map((_, dayIdx) => {
                          const weekDay = dayIdx + 1;
                          const slotCourses = getCoursesForSlot(
                            weekDay,
                            period.key
                          );
                          return (
                            <td
                              key={dayIdx}
                              className="p-2 align-top"
                            >
                              <div
                                className={cn(
                                  'min-h-[100px] rounded-xl p-2 space-y-2 border-2 border-dashed transition-colors',
                                  slotCourses.length === 0
                                    ? 'border-ink-100 hover:border-primary-200 hover:bg-primary-50/30 cursor-pointer'
                                    : 'border-transparent'
                                )}
                                onClick={() => {
                                  if (slotCourses.length === 0) {
                                    openCourseForm(weekDay, period.key);
                                  }
                                }}
                              >
                                {slotCourses.length === 0 ? (
                                  <div className="h-full flex items-center justify-center text-ink-300 text-xs">
                                    <Plus className="w-4 h-4 mr-1" />
                                    添加课程
                                  </div>
                                ) : (
                                  slotCourses.map((course) => (
                                    <div
                                      key={course.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openCourseForm(
                                          weekDay,
                                          period.key,
                                          course
                                        );
                                      }}
                                      className={cn(
                                        'group relative rounded-lg px-3 py-2 border text-sm cursor-pointer transition-all hover:scale-[1.02]',
                                        CATEGORY_COLORS[course.category] ||
                                          CATEGORY_COLORS['其他']
                                      )}
                                    >
                                      <div className="font-medium">
                                        {course.name}
                                      </div>
                                      <div className="text-xs opacity-70 mt-0.5">
                                        {course.category}
                                      </div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRemoveCourse(course.id);
                                        }}
                                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-ink-200 text-ink-400 hover:text-danger-500 hover:border-danger-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {classFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setClassFormOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-card w-full max-w-md animate-scale-in">
            <div className="p-5 border-b border-ink-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink-900">
                {editingClass ? '编辑班级' : '新增班级'}
              </h2>
              <button
                onClick={() => setClassFormOpen(false)}
                className="p-2 rounded-lg hover:bg-ink-100 text-ink-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">
                  班级名称 *
                </label>
                <input
                  type="text"
                  value={classForm.name}
                  onChange={(e) =>
                    setClassForm({ ...classForm, name: e.target.value })
                  }
                  placeholder="如：向日葵班"
                  className="w-full px-4 py-2.5 rounded-xl border border-ink-200 focus:outline-none focus:ring-2 focus:ring-primary-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">
                  所属校区 *
                </label>
                <select
                  value={classForm.campusId}
                  onChange={(e) =>
                    setClassForm({
                      ...classForm,
                      campusId: Number(e.target.value),
                    })
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
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">
                  班主任
                </label>
                <select
                  value={classForm.teacherId}
                  onChange={(e) =>
                    setClassForm({
                      ...classForm,
                      teacherId: Number(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-ink-200 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
                >
                  <option value={0}>请选择老师</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={Number(t.key)}>
                      {t.value}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">
                  教室 *
                </label>
                <input
                  type="text"
                  value={classForm.classroom}
                  onChange={(e) =>
                    setClassForm({ ...classForm, classroom: e.target.value })
                  }
                  placeholder="如：A栋201"
                  className="w-full px-4 py-2.5 rounded-xl border border-ink-200 focus:outline-none focus:ring-2 focus:ring-primary-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">
                  班级容量
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={classForm.capacity}
                  onChange={(e) =>
                    setClassForm({
                      ...classForm,
                      capacity: Number(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-ink-200 focus:outline-none focus:ring-2 focus:ring-primary-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">
                  年龄范围（岁）
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={classForm.ageMin}
                    onChange={(e) =>
                      setClassForm({
                        ...classForm,
                        ageMin: Number(e.target.value),
                      })
                    }
                    className="flex-1 px-4 py-2.5 rounded-xl border border-ink-200 focus:outline-none focus:ring-2 focus:ring-primary-300"
                  />
                  <span className="text-ink-400">至</span>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={classForm.ageMax}
                    onChange={(e) =>
                      setClassForm({
                        ...classForm,
                        ageMax: Number(e.target.value),
                      })
                    }
                    className="flex-1 px-4 py-2.5 rounded-xl border border-ink-200 focus:outline-none focus:ring-2 focus:ring-primary-300"
                  />
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-ink-100 flex justify-end gap-2">
              <button
                onClick={() => setClassFormOpen(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-ink-700 bg-ink-100 hover:bg-ink-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleClassSubmit}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 transition-colors shadow-soft"
              >
                {editingClass ? '保存修改' : '创建班级'}
              </button>
            </div>
          </div>
        </div>
      )}

      {courseFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setCourseFormOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-card w-full max-w-md animate-scale-in">
            <div className="p-5 border-b border-ink-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink-900">
                {editingCourse ? '编辑课程' : '添加课程'}
              </h2>
              <button
                onClick={() => setCourseFormOpen(false)}
                className="p-2 rounded-lg hover:bg-ink-100 text-ink-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">
                  课程名称 *
                </label>
                <input
                  type="text"
                  value={courseForm.name}
                  onChange={(e) =>
                    setCourseForm({ ...courseForm, name: e.target.value })
                  }
                  placeholder="如：语言启蒙"
                  className="w-full px-4 py-2.5 rounded-xl border border-ink-200 focus:outline-none focus:ring-2 focus:ring-primary-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">
                  课程分类
                </label>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCourseForm({ ...courseForm, category: cat })}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm border transition-colors',
                        courseForm.category === cat
                          ? CATEGORY_COLORS[cat]
                          : 'bg-white text-ink-600 border-ink-200 hover:bg-ink-50'
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">
                    星期
                  </label>
                  <select
                    value={courseForm.weekDay}
                    onChange={(e) =>
                      setCourseForm({
                        ...courseForm,
                        weekDay: Number(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-ink-200 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
                  >
                    {WEEKDAYS.map((d, i) => (
                      <option key={i} value={i + 1}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">
                    时段
                  </label>
                  <select
                    value={courseForm.period}
                    onChange={(e) =>
                      setCourseForm({ ...courseForm, period: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-ink-200 focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white"
                  >
                    {PERIODS.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-ink-100 flex justify-end gap-2">
              <button
                onClick={() => setCourseFormOpen(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-ink-700 bg-ink-100 hover:bg-ink-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCourseSubmit}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 transition-colors shadow-soft"
              >
                {editingCourse ? '保存修改' : '添加课程'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteDialog}
        title="确认删除班级"
        description={`确定要删除班级"${deleteDialog?.name}"吗？`}
        confirmText="删除"
        confirmVariant="danger"
        onConfirm={handleDeleteClass}
        onCancel={() => setDeleteDialog(null)}
      />
    </div>
  );
}
