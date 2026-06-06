import type {
  Campus,
  User,
  ClassInfo,
  Child,
  Guardian,
  DevelopmentScore,
  CoursePlan,
  LeaveRecord,
  LeaveType,
  FeeAdjustment,
  MorningCheck,
  HealthAlertLevel,
  CheckItem,
  HealthTracking,
  TrackingRecord,
  Recipe,
  RecipeFeedback,
  Meal,
  Dish,
  Season,
  MealType,
  PickupCode,
  PickupRecord,
  Activity,
  ActivityMaterial,
  ActivityRegistration,
  Bill,
  BillItem,
  BillStatus,
  DictionaryItem,
} from '@shared/types';

export const campuses: Campus[] = [];
export const users: User[] = [];
export const classes: ClassInfo[] = [];
export const children: Child[] = [];
export const course_plans: CoursePlan[] = [];
export const leave_records: LeaveRecord[] = [];
export const morning_checks: MorningCheck[] = [];
export const health_trackings: HealthTracking[] = [];
export const recipes: Recipe[] = [];
export const recipe_feedbacks: RecipeFeedback[] = [];
export const pickup_codes: PickupCode[] = [];
export const pickup_records: PickupRecord[] = [];
export const activities: Activity[] = [];
export const activity_registrations: ActivityRegistration[] = [];
export const bills: Bill[] = [];
export const dictionaries: DictionaryItem[] = [];

const MALE_NAMES = [
  '浩然', '子轩', '雨泽', '文博', '宇辰', '天佑', '梓豪', '俊杰', '嘉懿', '煜祺',
  '辰逸', '晟睿', '思源', '致远', '鸿涛', '伟祺', '荣轩', '越泽', '瑾瑜', '浩宇',
  '皓轩', '烨磊', '弘文', '哲瀚', '楷瑞', '峻熙', '擎宇', '明辉', '峻诚', '俊驰',
];

const FEMALE_NAMES = [
  '欣怡', '梓涵', '诗琪', '雨桐', '雅静', '佳怡', '梦琪', '语嫣', '若雪', '紫涵',
  '妙涵', '瑾萱', '梦涵', '诗涵', '思彤', '雨薇', '梦瑶', '沐卉', '雅琴', '书瑶',
  '芷涵', '语蝶', '宛儿', '向珊', '语诗', '若彤', '思琪', '雪慧', '乐萱', '芸熙',
];

const SURNAMES = [
  '王', '李', '张', '刘', '陈', '杨', '黄', '赵', '吴', '周',
  '徐', '孙', '胡', '朱', '高', '林', '何', '郭', '马', '罗',
  '梁', '宋', '郑', '谢', '韩', '唐', '冯', '于', '董', '萧',
];

const ALLERGENS = ['牛奶', '鸡蛋', '花生', '海鲜', '芒果', '小麦'];

const RELATIONS = ['爸爸', '妈妈', '爷爷', '奶奶', '外公', '外婆'];

const COURSE_NAMES = {
  morning_reading: ['古诗诵读', '故事时间', '儿歌学唱', '识字乐园', '拼音启蒙'],
  main1: ['数学思维', '科学探索', '创意美术', '音乐律动', '语言表达'],
  lunch: ['营养午餐'],
  nap: ['午休时光'],
  main2: ['手工制作', '绘本阅读', '英语启蒙', '安全教育', '社会交往'],
  outdoor: ['户外游戏', '体育锻炼', '自然观察', '集体游戏', '感统训练'],
};

const DISH_POOL: Record<Season, Record<MealType, Dish[]>> = {
  spring: {
    breakfast: [
      { name: '小米南瓜粥', ingredients: ['小米', '南瓜'], nutrition: '健脾养胃', allergens: [] },
      { name: '奶香馒头', ingredients: ['面粉', '牛奶'], nutrition: '补充碳水', allergens: ['牛奶', '小麦'] },
      { name: '水煮蛋', ingredients: ['鸡蛋'], nutrition: '优质蛋白', allergens: ['鸡蛋'] },
    ],
    snack_am: [
      { name: '草莓', ingredients: ['草莓'], nutrition: '维生素C', allergens: [] },
      { name: '酸奶', ingredients: ['牛奶'], nutrition: '益生菌', allergens: ['牛奶'] },
    ],
    lunch: [
      { name: '红烧肉', ingredients: ['五花肉'], nutrition: '脂肪蛋白', allergens: [] },
      { name: '清炒时蔬', ingredients: ['青菜'], nutrition: '膳食纤维', allergens: [] },
      { name: '米饭', ingredients: ['大米'], nutrition: '碳水化合物', allergens: [] },
    ],
    snack_pm: [
      { name: '小面包', ingredients: ['面粉'], nutrition: '补充能量', allergens: ['小麦'] },
      { name: '苹果', ingredients: ['苹果'], nutrition: '维生素', allergens: [] },
    ],
    dinner: [
      { name: '虾仁蒸蛋', ingredients: ['鸡蛋', '虾仁'], nutrition: '优质蛋白', allergens: ['鸡蛋', '海鲜'] },
      { name: '蔬菜面条', ingredients: ['面粉', '蔬菜'], nutrition: '易消化', allergens: ['小麦'] },
    ],
  },
  summer: {
    breakfast: [
      { name: '绿豆粥', ingredients: ['绿豆', '大米'], nutrition: '清热解暑', allergens: [] },
      { name: '玉米棒', ingredients: ['玉米'], nutrition: '膳食纤维', allergens: [] },
      { name: '凉拌黄瓜', ingredients: ['黄瓜'], nutrition: '清爽开胃', allergens: [] },
    ],
    snack_am: [
      { name: '西瓜', ingredients: ['西瓜'], nutrition: '补水消暑', allergens: [] },
      { name: '绿豆汤', ingredients: ['绿豆'], nutrition: '清热', allergens: [] },
    ],
    lunch: [
      { name: '清蒸鱼', ingredients: ['鱼肉'], nutrition: 'DHA', allergens: ['海鲜'] },
      { name: '番茄炒蛋', ingredients: ['番茄', '鸡蛋'], nutrition: '维生素', allergens: ['鸡蛋'] },
      { name: '米饭', ingredients: ['大米'], nutrition: '碳水化合物', allergens: [] },
    ],
    snack_pm: [
      { name: '绿豆糕', ingredients: ['绿豆', '面粉'], nutrition: '解暑点心', allergens: ['小麦'] },
      { name: '哈密瓜', ingredients: ['哈密瓜'], nutrition: '维生素', allergens: [] },
    ],
    dinner: [
      { name: '冬瓜排骨汤', ingredients: ['冬瓜', '排骨'], nutrition: '消暑滋补', allergens: [] },
      { name: '米饭', ingredients: ['大米'], nutrition: '碳水化合物', allergens: [] },
    ],
  },
  autumn: {
    breakfast: [
      { name: '银耳莲子粥', ingredients: ['银耳', '莲子', '大米'], nutrition: '润肺滋阴', allergens: [] },
      { name: '红薯', ingredients: ['红薯'], nutrition: '膳食纤维', allergens: [] },
      { name: '荷包蛋', ingredients: ['鸡蛋'], nutrition: '优质蛋白', allergens: ['鸡蛋'] },
    ],
    snack_am: [
      { name: '梨', ingredients: ['梨'], nutrition: '润肺止咳', allergens: [] },
      { name: '牛奶', ingredients: ['牛奶'], nutrition: '钙和蛋白', allergens: ['牛奶'] },
    ],
    lunch: [
      { name: '板栗烧鸡', ingredients: ['鸡肉', '板栗'], nutrition: '温补', allergens: [] },
      { name: '蒜蓉西兰花', ingredients: ['西兰花'], nutrition: '维生素', allergens: [] },
      { name: '米饭', ingredients: ['大米'], nutrition: '碳水化合物', allergens: [] },
    ],
    snack_pm: [
      { name: '桂花糕', ingredients: ['糯米', '桂花'], nutrition: '秋季特色', allergens: [] },
      { name: '葡萄', ingredients: ['葡萄'], nutrition: '花青素', allergens: [] },
    ],
    dinner: [
      { name: '萝卜牛腩', ingredients: ['白萝卜', '牛肉'], nutrition: '温补气血', allergens: [] },
      { name: '软米饭', ingredients: ['大米'], nutrition: '碳水化合物', allergens: [] },
    ],
  },
  winter: {
    breakfast: [
      { name: '腊八粥', ingredients: ['大米', '红豆', '花生', '红枣'], nutrition: '温补暖身', allergens: ['花生'] },
      { name: '葱油饼', ingredients: ['面粉', '葱'], nutrition: '补充能量', allergens: ['小麦'] },
      { name: '茶叶蛋', ingredients: ['鸡蛋'], nutrition: '优质蛋白', allergens: ['鸡蛋'] },
    ],
    snack_am: [
      { name: '橙子', ingredients: ['橙子'], nutrition: '维生素C', allergens: [] },
      { name: '热牛奶', ingredients: ['牛奶'], nutrition: '钙和蛋白', allergens: ['牛奶'] },
    ],
    lunch: [
      { name: '红烧羊肉', ingredients: ['羊肉'], nutrition: '暖身进补', allergens: [] },
      { name: '醋溜白菜', ingredients: ['白菜'], nutrition: '膳食纤维', allergens: [] },
      { name: '米饭', ingredients: ['大米'], nutrition: '碳水化合物', allergens: [] },
    ],
    snack_pm: [
      { name: '八宝粥', ingredients: ['大米', '红豆', '花生'], nutrition: '温补', allergens: ['花生'] },
      { name: '香蕉', ingredients: ['香蕉'], nutrition: '钾元素', allergens: [] },
    ],
    dinner: [
      { name: '火锅丸子', ingredients: ['猪肉', '面粉'], nutrition: '暖身', allergens: ['小麦'] },
      { name: '蔬菜汤', ingredients: ['青菜', '番茄'], nutrition: '维生素', allergens: [] },
    ],
  },
};

let idCounter = 1;
const nextId = () => idCounter++;

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

function randomChoices<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function formatDateTime(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysLater(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function randomName(gender?: 'male' | 'female'): string {
  const surname = randomChoice(SURNAMES);
  const givenName = gender === 'male'
    ? randomChoice(MALE_NAMES)
    : gender === 'female'
    ? randomChoice(FEMALE_NAMES)
    : randomChoice([...MALE_NAMES, ...FEMALE_NAMES]);
  return surname + givenName;
}

function randomPhone(): string {
  const prefix = ['138', '139', '150', '151', '152', '158', '159', '186', '187', '188', '136', '137'];
  let phone = randomChoice(prefix);
  for (let i = 0; i < 8; i++) {
    phone += randomInt(0, 9);
  }
  return phone;
}

function randomBirthDate(age: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - age);
  d.setMonth(randomInt(0, 11));
  d.setDate(randomInt(1, 28));
  return formatDate(d);
}

function getSeason(date: Date): Season {
  const m = date.getMonth() + 1;
  if (m >= 3 && m <= 5) return 'spring';
  if (m >= 6 && m <= 8) return 'summer';
  if (m >= 9 && m <= 11) return 'autumn';
  return 'winter';
}

function randomAvatar(seed: string, gender?: 'male' | 'female'): string {
  const g = gender === 'male' ? 'boy' : gender === 'female' ? 'girl' : 'person';
  return `https://api.dicebear.com/7.x/${g}/svg?seed=${encodeURIComponent(seed)}`;
}

export function initMockData(): void {
  idCounter = 1;

  campuses.length = 0;
  users.length = 0;
  classes.length = 0;
  children.length = 0;
  course_plans.length = 0;
  leave_records.length = 0;
  morning_checks.length = 0;
  health_trackings.length = 0;
  recipes.length = 0;
  recipe_feedbacks.length = 0;
  pickup_codes.length = 0;
  pickup_records.length = 0;
  activities.length = 0;
  activity_registrations.length = 0;
  bills.length = 0;
  dictionaries.length = 0;

  initDictionaries();
  initCampuses();
  initUsers();
  initClasses();
  initChildren();
  initCoursePlans();
  initLeaveRecords();
  initMorningChecks();
  initHealthTrackings();
  initRecipes();
  initRecipeFeedbacks();
  initPickupCodes();
  initPickupRecords();
  initActivities();
  initBills();

  bindParentChildIds();
  updateClassStats();
  bindActivityRegistrationsToActivities();
}

function initDictionaries(): void {
  const allergenItems: DictionaryItem[] = ALLERGENS.map((v, i) => ({
    id: nextId(),
    type: 'allergen',
    key: v,
    value: v,
    sort: i + 1,
  }));

  const leaveTypeItems: DictionaryItem[] = [
    { id: nextId(), type: 'leave_type', key: 'sick', value: '病假', sort: 1 },
    { id: nextId(), type: 'leave_type', key: 'personal', value: '事假', sort: 2 },
    { id: nextId(), type: 'leave_type', key: 'other', value: '其他', sort: 3 },
  ];

  const courseCategoryItems: DictionaryItem[] = [
    { id: nextId(), type: 'course_category', key: 'morning_reading', value: '早读', sort: 1 },
    { id: nextId(), type: 'course_category', key: 'main', value: '主课', sort: 2 },
    { id: nextId(), type: 'course_category', key: 'lunch', value: '午餐', sort: 3 },
    { id: nextId(), type: 'course_category', key: 'nap', value: '午休', sort: 4 },
    { id: nextId(), type: 'course_category', key: 'outdoor', value: '户外活动', sort: 5 },
  ];

  const mealTypeItems: DictionaryItem[] = [
    { id: nextId(), type: 'meal_type', key: 'breakfast', value: '早餐', sort: 1 },
    { id: nextId(), type: 'meal_type', key: 'snack_am', value: '上午点心', sort: 2 },
    { id: nextId(), type: 'meal_type', key: 'lunch', value: '午餐', sort: 3 },
    { id: nextId(), type: 'meal_type', key: 'snack_pm', value: '下午点心', sort: 4 },
    { id: nextId(), type: 'meal_type', key: 'dinner', value: '晚餐', sort: 5 },
  ];

  dictionaries.push(
    ...allergenItems,
    ...leaveTypeItems,
    ...courseCategoryItems,
    ...mealTypeItems,
  );
}

function initCampuses(): void {
  campuses.push(
    { id: nextId(), name: '总部阳光园', address: '阳光路88号', phone: '021-58881001', status: 'active' },
    { id: nextId(), name: '分园彩虹园', address: '彩虹大道123号', phone: '021-58881002', status: 'active' },
    { id: nextId(), name: '分园星星园', address: '星辰路66号', phone: '021-58881003', status: 'active' },
  );
}

function initUsers(): void {
  users.push({
    id: nextId(),
    username: 'admin',
    name: '超级管理员',
    role: 'super_admin',
    phone: '13800000001',
    avatar: randomAvatar('admin'),
    status: 'active',
    createdAt: formatDateTime(daysAgo(90)),
  });

  const principalNames = ['李园长', '王园长'];
  for (let i = 0; i < 2; i++) {
    users.push({
      id: nextId(),
      username: `principal${i + 1}`,
      name: principalNames[i],
      role: 'principal',
      campusId: campuses[i].id,
      phone: randomPhone(),
      avatar: randomAvatar(`principal${i + 1}`),
      status: 'active',
      createdAt: formatDateTime(daysAgo(80 + i)),
    });
  }

  const teacherNames = ['张老师', '刘老师', '陈老师'];
  for (let i = 0; i < 3; i++) {
    users.push({
      id: nextId(),
      username: `teacher${i + 1}`,
      name: teacherNames[i],
      role: 'teacher',
      campusId: campuses[i % 3].id,
      phone: randomPhone(),
      avatar: randomAvatar(`teacher${i + 1}`, 'female'),
      status: 'active',
      createdAt: formatDateTime(daysAgo(70 + i)),
    });
  }

  for (let i = 0; i < 5; i++) {
    users.push({
      id: nextId(),
      username: `parent${i + 1}`,
      name: randomName() + '(家长)',
      role: 'parent',
      phone: randomPhone(),
      avatar: randomAvatar(`parent${i + 1}`),
      status: 'active',
      createdAt: formatDateTime(daysAgo(60 + i)),
      childIds: [],
    });
  }

  users.push({
    id: nextId(),
    username: 'finance1',
    name: '赵会计',
    role: 'finance',
    campusId: campuses[0].id,
    phone: randomPhone(),
    avatar: randomAvatar('finance1'),
    status: 'active',
    createdAt: formatDateTime(daysAgo(85)),
  });
}

function initClasses(): void {
  const classNames = ['小班', '中班', '大班'];
  const ageRanges: [number, number][] = [[2, 4], [4, 5], [5, 6]];
  const classroomNames: Record<number, string[]> = {};
  campuses.forEach((campus, idx) => {
    const prefix = ['阳光', '彩虹', '星星'][idx] || '教室';
    classroomNames[campus.id] = [`${prefix}A101`, `${prefix}A201`, `${prefix}A301`];
  });

  let teacherIdx = 0;
  for (const campus of campuses) {
    for (let i = 0; i < 3; i++) {
      const teacher = users.filter(u => u.role === 'teacher')[teacherIdx % 3];
      classes.push({
        id: nextId(),
        name: `${campus.name.slice(-2)}${classNames[i]}`,
        campusId: campus.id,
        teacherId: teacher.id,
        teacherName: teacher.name,
        classroom: classroomNames[campus.id][i],
        capacity: 25,
        studentCount: 0,
        ageRange: ageRanges[i],
        courses: [],
      });
      teacherIdx++;
    }
  }
}

function initChildren(): void {
  const classCounts: Record<number, number> = {};
  classes.forEach(c => { classCounts[c.id] = 0; });

  for (let i = 0; i < 60; i++) {
    const cls = classes[i % classes.length];
    classCounts[cls.id]++;
    const gender: 'male' | 'female' = randomChoice(['male', 'female']);
    const age = randomInt(cls.ageRange[0], cls.ageRange[1]);
    const allergyCount = Math.random() < 0.3 ? randomInt(1, 2) : 0;

    const guardians: Guardian[] = [];
    for (let g = 0; g < 2; g++) {
      const relation = g === 0 ? (randomChoice(['爸爸', '妈妈'])) : randomChoice(['爷爷', '奶奶', '外公', '外婆']);
      guardians.push({
        id: nextId(),
        name: randomName() + relation,
        relation,
        phone: randomPhone(),
        photo: randomAvatar(`guardian_${i}_${g}`),
      });
    }

    const devScore: DevelopmentScore = {
      language: randomInt(70, 95),
      motor: randomInt(70, 95),
      social: randomInt(70, 95),
      cognitive: randomInt(70, 95),
      overall: 0,
    };
    devScore.overall = Math.round((devScore.language + devScore.motor + devScore.social + devScore.cognitive) / 4);

    children.push({
      id: nextId(),
      name: randomName(gender),
      gender,
      birthDate: randomBirthDate(age),
      age,
      campusId: cls.campusId,
      classId: cls.id,
      className: cls.name,
      avatar: randomAvatar(`child_${i}`, gender),
      allergies: allergyCount > 0 ? randomChoices(ALLERGENS, allergyCount) : [],
      guardians,
      developmentScore: devScore,
      status: 'active',
      createdAt: formatDateTime(daysAgo(randomInt(30, 300))),
    });
  }
}

function initCoursePlans(): void {
  const periods = [
    { period: '08:00-08:30', category: 'morning_reading', pool: COURSE_NAMES.morning_reading },
    { period: '09:00-09:40', category: 'main', pool: COURSE_NAMES.main1 },
    { period: '11:30-12:30', category: 'lunch', pool: COURSE_NAMES.lunch },
    { period: '12:30-14:30', category: 'nap', pool: COURSE_NAMES.nap },
    { period: '15:00-15:40', category: 'main', pool: COURSE_NAMES.main2 },
    { period: '16:00-17:00', category: 'outdoor', pool: COURSE_NAMES.outdoor },
  ];

  for (const cls of classes) {
    for (let weekDay = 1; weekDay <= 5; weekDay++) {
      for (const p of periods) {
        course_plans.push({
          id: nextId(),
          classId: cls.id,
          weekDay,
          period: p.period,
          name: randomChoice(p.pool),
          category: p.category,
          description: '',
        });
      }
    }
  }
}

function initLeaveRecords(): void {
  const parentUsers = users.filter(u => u.role === 'parent');
  const teachers = users.filter(u => u.role === 'teacher');

  for (let i = 0; i < 15; i++) {
    const child = children[i % children.length];
    const parent = parentUsers[i % parentUsers.length];
    const startDate = daysAgo(randomInt(0, 25));
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + randomInt(0, 2));

    const status = randomChoice(['pending', 'approved', 'rejected'] as const);
    const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000));
    const feeAdjustment: FeeAdjustment = {
      mealFeeDeduction: days * 15,
      tuitionDeduction: 0,
      totalDeduction: days * 15,
      days,
    };

    leave_records.push({
      id: nextId(),
      childId: child.id,
      childName: child.name,
      parentId: parent.id,
      parentName: parent.name,
      type: randomChoice(['sick', 'personal', 'other'] as LeaveType[]),
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      reason: randomChoice(['发烧请假', '家里有事', '外出旅行', '咳嗽不适', '牙医就诊']),
      status,
      feeAdjustment,
      approvedBy: status !== 'pending' ? teachers[i % teachers.length].id : undefined,
      approvedAt: status !== 'pending' ? formatDateTime(daysAgo(randomInt(0, 10))) : undefined,
      createdAt: formatDateTime(daysAgo(randomInt(0, 25))),
    });
  }
}

function initMorningChecks(): void {
  const teachers = users.filter(u => u.role === 'teacher');
  const today = new Date();

  for (let i = 0; i < 60; i++) {
    const child = children[i % children.length];
    const cls = classes.find(c => c.id === child.classId);
    const teacher = teachers[i % teachers.length];
    const isAbnormal = Math.random() < 0.12;

    let temperature = parseFloat((36.2 + Math.random() * 0.8).toFixed(1));
    let oralCheck: CheckItem = 'normal';
    let handCheck: CheckItem = 'normal';
    let skinCheck: CheckItem = 'normal';
    let spiritCheck: CheckItem = 'normal';
    let alertLevel: HealthAlertLevel = 'normal';
    let note: string | undefined;

    if (isAbnormal) {
      const abnormalType = randomInt(0, 3);
      if (abnormalType === 0) {
        temperature = parseFloat((37.5 + Math.random() * 1.2).toFixed(1));
        alertLevel = 'warning';
        note = '体温偏高，需要观察';
      } else if (abnormalType === 1) {
        oralCheck = 'abnormal';
        alertLevel = 'warning';
        note = '口腔有轻微溃疡';
      } else if (abnormalType === 2) {
        handCheck = 'abnormal';
        skinCheck = 'abnormal';
        alertLevel = 'danger';
        note = '手部有红疹，疑似手足口';
      } else {
        spiritCheck = 'abnormal';
        alertLevel = 'warning';
        note = '精神不佳，嗜睡';
      }
    }

    morning_checks.push({
      id: nextId(),
      childId: child.id,
      childName: child.name,
      teacherId: teacher.id,
      teacherName: teacher.name,
      classId: cls?.id,
      className: cls?.name,
      temperature,
      oralCheck,
      handCheck,
      skinCheck,
      spiritCheck,
      note,
      alertLevel,
      createdAt: formatDateTime(today),
    });
  }
}

function initHealthTrackings(): void {
  const abnormalChecks = morning_checks.filter(c => c.alertLevel !== 'normal').slice(0, 5);

  for (let i = 0; i < abnormalChecks.length; i++) {
    const check = abnormalChecks[i];
    const child = children.find(c => c.id === check.childId);
    if (!child) continue;

    const records: TrackingRecord[] = [
      {
        id: nextId(),
        date: formatDate(daysAgo(i)),
        status: '晨检异常，已通知家长',
        note: check.note,
        operator: check.teacherName || '老师',
      },
      {
        id: nextId(),
        date: formatDate(daysAgo(Math.max(0, i - 1))),
        status: i < 3 ? '追踪观察中' : '症状缓解',
        note: i < 3 ? '持续观察体温和症状' : '体温恢复正常，精神良好',
        operator: '保健医',
      },
    ];
    if (i >= 2) {
      records.push({
        id: nextId(),
        date: formatDate(daysAgo(Math.max(0, i - 2))),
        status: '已康复',
        note: '各项指标正常，解除追踪',
        operator: '保健医',
      });
    }

    health_trackings.push({
      id: nextId(),
      childId: child.id,
      childName: child.name,
      checkId: check.id,
      records,
      status: i >= 2 ? 'recovered' : 'tracking',
      createdAt: formatDateTime(daysAgo(i)),
    });
  }
}

function initRecipes(): void {
  const mealTypeConfig: { type: MealType; typeName: string }[] = [
    { type: 'breakfast', typeName: '早餐' },
    { type: 'snack_am', typeName: '上午点心' },
    { type: 'lunch', typeName: '午餐' },
    { type: 'snack_pm', typeName: '下午点心' },
    { type: 'dinner', typeName: '晚餐' },
  ];

  for (const campus of campuses) {
    for (let d = 0; d < 7; d++) {
      const date = daysAgo(6 - d);
      const season = getSeason(date);
      const dishPool = DISH_POOL[season];

      const meals: Meal[] = mealTypeConfig.map(mc => ({
        type: mc.type,
        typeName: mc.typeName,
        dishes: [...dishPool[mc.type]],
      }));

      recipes.push({
        id: nextId(),
        date: formatDate(date),
        campusId: campus.id,
        season,
        meals,
        feedback: [],
      });
    }
  }
}

function initRecipeFeedbacks(): void {
  const parentUsers = users.filter(u => u.role === 'parent');

  for (let i = 0; i < 20; i++) {
    const recipe = recipes[i % recipes.length];
    const parent = parentUsers[i % parentUsers.length];

    recipe_feedbacks.push({
      id: nextId(),
      recipeId: recipe.id,
      parentId: parent.id,
      parentName: parent.name,
      rating: randomInt(3, 5),
      comment: randomChoice([
        '孩子很喜欢今天的饭菜',
        '营养搭配很均衡',
        '希望能多一些蔬菜',
        '味道不错，孩子都吃光了',
        '点心很精致',
      ]),
      createdAt: formatDateTime(daysAgo(randomInt(0, 5))),
    });
  }
}

function initPickupCodes(): void {
  for (let i = 0; i < 30; i++) {
    const child = children[i % children.length];
    const guardian = child.guardians[i % child.guardians.length];

    pickup_codes.push({
      id: nextId(),
      childId: child.id,
      guardianId: guardian.id,
      guardianName: guardian.name,
      guardianPhoto: guardian.photo,
      code: Math.random().toString().slice(2, 8).padStart(6, '0'),
      expiresAt: formatDateTime(daysLater(randomInt(0, 2))),
      createdAt: formatDateTime(daysAgo(randomInt(0, 2))),
    });
  }
}

function initPickupRecords(): void {
  for (let i = 0; i < 40; i++) {
    const child = children[i % children.length];
    const guardian = child.guardians[i % child.guardians.length];
    const isAbnormal = i >= 38;

    pickup_records.push({
      id: nextId(),
      childId: child.id,
      childName: child.name,
      guardianId: guardian.id,
      guardianName: guardian.name,
      guardianPhoto: guardian.photo,
      photoMatch: !isAbnormal,
      isAbnormal,
      abnormalNote: isAbnormal ? (i === 38 ? '人脸比对不通过，已人工核验' : '非登记接送人，已拒绝') : undefined,
      operatorId: users.find(u => u.role === 'teacher')?.id,
      createdAt: formatDateTime(daysAgo(Math.floor(i / 6))),
    });
  }
}

function initActivities(): void {
  const allClassIds = classes.map(c => c.id);
  const midLargeClassIds = classes.filter((_, i) => i >= 3).map(c => c.id);
  const largeClassIds = classes.filter((_, i) => i % 3 === 2).map(c => c.id);

  const activityTemplates = [
    { title: '春季亲子运动会', description: '和爸爸妈妈一起参加趣味运动比赛，增进亲子感情', location: '园区操场', classIds: allClassIds },
    { title: '春游踏青活动', description: '前往植物园，认识各种植物，感受春天的气息', location: '市植物园', classIds: midLargeClassIds },
    { title: '六一文艺汇演', description: '孩子们展示才艺，庆祝自己的节日', location: '多功能厅', classIds: allClassIds },
    { title: '中秋节亲子DIY', description: '和家长一起制作月饼，了解传统节日文化', location: '各班教室', classIds: allClassIds },
    { title: '冬季趣味运动会', description: '冬季主题趣味运动项目，锻炼身体', location: '室内体育馆', classIds: allClassIds },
    { title: '毕业典礼', description: '大班孩子的毕业典礼，留下美好回忆', location: '多功能厅', classIds: largeClassIds },
  ];

  const materialTemplates: ActivityMaterial[][] = [
    [
      { name: '运动服', quantityPerPerson: 1, unit: '套', totalQuantity: 0 },
      { name: '矿泉水', quantityPerPerson: 1, unit: '瓶', totalQuantity: 0 },
      { name: '奖牌', quantityPerPerson: 1, unit: '块', totalQuantity: 0 },
    ],
    [
      { name: '午餐便当', quantityPerPerson: 1, unit: '份', totalQuantity: 0 },
      { name: '遮阳帽', quantityPerPerson: 1, unit: '顶', totalQuantity: 0 },
      { name: '垃圾袋', quantityPerPerson: 1, unit: '个', totalQuantity: 0 },
    ],
    [
      { name: '演出服装', quantityPerPerson: 1, unit: '套', totalQuantity: 0 },
      { name: '化妆用品', quantityPerPerson: 1, unit: '套', totalQuantity: 0 },
      { name: '节目单', quantityPerPerson: 1, unit: '份', totalQuantity: 0 },
    ],
    [
      { name: '月饼材料包', quantityPerPerson: 1, unit: '份', totalQuantity: 0 },
      { name: '一次性手套', quantityPerPerson: 2, unit: '只', totalQuantity: 0 },
      { name: '包装盒', quantityPerPerson: 1, unit: '个', totalQuantity: 0 },
    ],
    [
      { name: '围巾', quantityPerPerson: 1, unit: '条', totalQuantity: 0 },
      { name: '热姜茶', quantityPerPerson: 1, unit: '杯', totalQuantity: 0 },
      { name: '奖品', quantityPerPerson: 1, unit: '份', totalQuantity: 0 },
    ],
    [
      { name: '毕业服', quantityPerPerson: 1, unit: '套', totalQuantity: 0 },
      { name: '毕业证书', quantityPerPerson: 1, unit: '本', totalQuantity: 0 },
      { name: '纪念册', quantityPerPerson: 1, unit: '本', totalQuantity: 0 },
    ],
  ];

  const principal = users.find(u => u.role === 'principal')!;

  for (let i = 0; i < activityTemplates.length; i++) {
    const tpl = activityTemplates[i];
    const campus = campuses[i % campuses.length];
    const date = daysLater(randomInt(3, 30));
    const materials = materialTemplates[i].map(m => ({
      ...m,
      totalQuantity: m.quantityPerPerson * 50,
    }));

    activities.push({
      id: nextId(),
      title: tpl.title,
      description: tpl.description,
      campusId: campus.id,
      campusName: campus.name,
      classIds: tpl.classIds,
      date: formatDate(date),
      location: tpl.location,
      maxParticipants: 100,
      registrations: [],
      materials,
      createdBy: principal.id,
      createdAt: formatDateTime(daysAgo(randomInt(5, 15))),
    });
  }

  const parentUsers = users.filter(u => u.role === 'parent');
  let regIdx = 0;
  for (const activity of activities) {
    const eligibleChildren = children.filter(c => activity.classIds?.includes(c.classId!));
    const count = randomInt(5, Math.min(20, eligibleChildren.length));
    for (let j = 0; j < count; j++) {
      const child = eligibleChildren[j % eligibleChildren.length];
      const parent = parentUsers[regIdx % parentUsers.length];
      activity_registrations.push({
        id: nextId(),
        activityId: activity.id,
        childId: child.id,
        childName: child.name,
        parentId: parent.id,
        note: randomChoice(['准时参加', '需要特殊饮食', '']),
        createdAt: formatDateTime(daysAgo(randomInt(0, 5))),
      });
      regIdx++;
    }
  }
}

function initBills(): void {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  for (let i = 0; i < 60; i++) {
    const child = children[i];
    const isSuspended = i < 3;
    const isPartial = !isSuspended && i < 8;
    const isUnpaid = !isSuspended && !isPartial && i < 20;

    const items: BillItem[] = [
      { type: 'tuition', name: '保教费', amount: 1800 },
      { type: 'meal', name: '伙食费', amount: 660, deduction: 0 },
      { type: 'other', name: '杂费', amount: 100 },
    ];
    const totalAmount = items.reduce((sum, it) => sum + it.amount - (it.deduction || 0), 0);

    let status: BillStatus;
    let paidAmount: number;
    let overdueDays: number;
    let suspendedAt: string | undefined;
    let paidAt: string | undefined;

    const dueDate = new Date(now.getFullYear(), now.getMonth(), 10);

    if (isSuspended) {
      status = 'suspended';
      paidAmount = 0;
      overdueDays = 20 + i;
      suspendedAt = formatDateTime(daysAgo(15 + i));
    } else if (isPartial) {
      status = 'partial';
      paidAmount = 1000;
      overdueDays = 5 + i;
    } else if (isUnpaid) {
      status = 'unpaid';
      paidAmount = 0;
      overdueDays = i - 8;
      if (overdueDays < 0) overdueDays = 0;
    } else {
      status = 'paid';
      paidAmount = totalAmount;
      overdueDays = 0;
      paidAt = formatDateTime(daysAgo(randomInt(0, 10)));
    }

    bills.push({
      id: nextId(),
      childId: child.id,
      childName: child.name,
      month,
      campusId: child.campusId,
      items,
      totalAmount,
      paidAmount,
      status,
      dueDate: formatDate(dueDate),
      suspendedAt,
      paidAt,
      overdueDays,
      createdAt: formatDateTime(daysAgo(20)),
    });
  }
}

function bindParentChildIds(): void {
  const parentUsers = users.filter(u => u.role === 'parent');
  for (let i = 0; i < children.length; i++) {
    const parent = parentUsers[i % parentUsers.length];
    if (!parent.childIds) parent.childIds = [];
    if (!parent.childIds.includes(children[i].id)) {
      parent.childIds.push(children[i].id);
    }
  }
}

function updateClassStats(): void {
  for (const cls of classes) {
    cls.studentCount = children.filter(c => c.classId === cls.id).length;
    cls.courses = course_plans.filter(cp => cp.classId === cls.id);
  }
}

function bindActivityRegistrationsToActivities(): void {
  for (const activity of activities) {
    activity.registrations = activity_registrations.filter(ar => ar.activityId === activity.id);
  }
}
