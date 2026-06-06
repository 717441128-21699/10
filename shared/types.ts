export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export type UserRole = 'super_admin' | 'principal' | 'teacher' | 'parent' | 'finance';

export interface User {
  id: number;
  username: string;
  name: string;
  role: UserRole;
  campusId?: number;
  phone: string;
  avatar?: string;
  status: 'active' | 'disabled';
  createdAt: string;
  childIds?: number[];
}

export interface Campus {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  status: 'active' | 'inactive';
}

export interface Guardian {
  id: number;
  name: string;
  relation: string;
  phone: string;
  photo: string;
  idCard?: string;
}

export interface DevelopmentScore {
  language: number;
  motor: number;
  social: number;
  cognitive: number;
  overall: number;
}

export interface Child {
  id: number;
  name: string;
  gender: 'male' | 'female';
  birthDate: string;
  age: number;
  campusId: number;
  classId?: number;
  className?: string;
  avatar?: string;
  allergies: string[];
  medicalHistory?: string;
  guardians: Guardian[];
  developmentScore?: DevelopmentScore;
  status: 'active' | 'suspended' | 'graduated';
  createdAt: string;
}

export interface CoursePlan {
  id: number;
  classId: number;
  weekDay: number;
  period: string;
  name: string;
  category: string;
  description?: string;
}

export interface ClassInfo {
  id: number;
  name: string;
  campusId: number;
  teacherId: number;
  teacherName?: string;
  classroom: string;
  capacity: number;
  studentCount: number;
  ageRange: [number, number];
  courses: CoursePlan[];
}

export type LeaveStatus = 'pending' | 'approved' | 'rejected';
export type LeaveType = 'sick' | 'personal' | 'other';

export interface FeeAdjustment {
  mealFeeDeduction: number;
  tuitionDeduction: number;
  totalDeduction: number;
  days: number;
}

export interface LeaveRecord {
  id: number;
  childId: number;
  childName?: string;
  parentId: number;
  parentName?: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  attachment?: string;
  status: LeaveStatus;
  feeAdjustment: FeeAdjustment;
  approvedBy?: number;
  approvedAt?: string;
  createdAt: string;
}

export type HealthAlertLevel = 'normal' | 'warning' | 'danger';
export type CheckItem = 'normal' | 'abnormal';

export interface MorningCheck {
  id: number;
  childId: number;
  childName?: string;
  teacherId: number;
  teacherName?: string;
  classId?: number;
  className?: string;
  temperature: number;
  oralCheck: CheckItem;
  handCheck: CheckItem;
  skinCheck: CheckItem;
  spiritCheck: CheckItem;
  note?: string;
  alertLevel: HealthAlertLevel;
  createdAt: string;
}

export interface TrackingRecord {
  id: number;
  date: string;
  status: string;
  note?: string;
  operator: string;
}

export interface HealthTracking {
  id: number;
  childId: number;
  childName?: string;
  checkId: number;
  records: TrackingRecord[];
  status: 'tracking' | 'recovered';
  createdAt: string;
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack_am' | 'snack_pm';

export interface Dish {
  name: string;
  ingredients: string[];
  nutrition: string;
  allergens: string[];
}

export interface Meal {
  type: MealType;
  typeName: string;
  dishes: Dish[];
}

export interface RecipeFeedback {
  id: number;
  recipeId: number;
  parentId: number;
  parentName?: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface Recipe {
  id: number;
  date: string;
  campusId: number;
  season: Season;
  meals: Meal[];
  feedback: RecipeFeedback[];
}

export interface PickupCode {
  id: number;
  childId: number;
  guardianId: number;
  guardianName?: string;
  guardianPhoto?: string;
  code: string;
  expiresAt: string;
  createdAt: string;
}

export interface PickupRecord {
  id: number;
  childId: number;
  childName?: string;
  guardianId: number;
  guardianName?: string;
  guardianPhoto?: string;
  photoMatch: boolean;
  isAbnormal: boolean;
  abnormalNote?: string;
  operatorId?: number;
  createdAt: string;
}

export interface ActivityMaterial {
  name: string;
  quantityPerPerson: number;
  unit: string;
  totalQuantity: number;
  note?: string;
}

export interface ActivityRegistration {
  id: number;
  activityId: number;
  childId: number;
  childName?: string;
  parentId: number;
  note?: string;
  createdAt: string;
}

export interface Activity {
  id: number;
  title: string;
  description: string;
  campusId: number;
  campusName?: string;
  classIds?: number[];
  date: string;
  location: string;
  maxParticipants: number;
  registrations: ActivityRegistration[];
  materials: ActivityMaterial[];
  createdBy: number;
  createdAt: string;
}

export type BillStatus = 'unpaid' | 'partial' | 'paid' | 'suspended';
export type BillItemType = 'tuition' | 'meal' | 'activity' | 'other';

export interface BillItem {
  type: BillItemType;
  name: string;
  amount: number;
  deduction?: number;
  note?: string;
}

export interface Bill {
  id: number;
  childId: number;
  childName?: string;
  month: string;
  campusId: number;
  items: BillItem[];
  totalAmount: number;
  paidAmount: number;
  status: BillStatus;
  dueDate: string;
  suspendedAt?: string;
  paidAt?: string;
  overdueDays: number;
  createdAt: string;
}

export interface WarningItem {
  id: number;
  type: 'health' | 'pickup' | 'billing';
  level: 'warning' | 'danger';
  message: string;
  createdAt: string;
}

export interface DashboardStats {
  attendance: {
    todayRate: number;
    todayPresent: number;
    todayTotal: number;
    trend: number[];
    byClass: { name: string; rate: number; present: number; total: number }[];
  };
  health: {
    todayEvents: number;
    activeAlerts: number;
    eventDistribution: { name: string; value: number }[];
    trackingCount: number;
  };
  activities: {
    ongoingCount: number;
    totalRegistrations: number;
    popularity: { name: string; count: number }[];
  };
  satisfaction: {
    average: number;
    totalCount: number;
    distribution: number[];
  };
  warnings: WarningItem[];
}

export interface DictionaryItem {
  id: number;
  type: string;
  key: string;
  value: string;
  sort: number;
}
