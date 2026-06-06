import { get, post, put, del } from './request';
import type {
  User,
  Child,
  ClassInfo,
  LeaveRecord,
  FeeAdjustment,
  MorningCheck,
  HealthTracking,
  Recipe,
  RecipeFeedback,
  PickupCode,
  PickupRecord,
  Activity,
  ActivityMaterial,
  Bill,
  DashboardStats,
  Campus,
  DictionaryItem,
} from '@shared/types';

interface LoginPayload {
  username: string;
  password: string;
}

interface LoginResponse {
  user: User;
  token: string;
}

export const authApi = {
  login: (data: LoginPayload): Promise<LoginResponse> =>
    post<LoginResponse>('/auth/login', data),

  logout: (): Promise<void> => post<void>('/auth/logout'),

  getCurrentUser: (): Promise<User> => get<User>('/auth/me'),
};

export const childrenApi = {
  list: (params?: Record<string, unknown>): Promise<Child[]> =>
    get<Child[]>('/children', params),

  detail: (id: number): Promise<Child> => get<Child>(`/children/${id}`),

  create: (data: Partial<Child>): Promise<Child> =>
    post<Child>('/children', data),

  update: (id: number, data: Partial<Child>): Promise<Child> =>
    put<Child>(`/children/${id}`, data),

  remove: (id: number): Promise<void> => del<void>(`/children/${id}`),

  recommendClass: (id: number): Promise<ClassInfo> =>
    get<ClassInfo>(`/children/${id}/recommend-class`),

  assess: (id: number, data: unknown): Promise<Child['developmentScore']> =>
    post<Child['developmentScore']>(`/children/${id}/assess`, data),
};

export const classesApi = {
  list: (params?: Record<string, unknown>): Promise<ClassInfo[]> =>
    get<ClassInfo[]>('/classes', params),

  detail: (id: number): Promise<ClassInfo> => get<ClassInfo>(`/classes/${id}`),

  create: (data: Partial<ClassInfo>): Promise<ClassInfo> =>
    post<ClassInfo>('/classes', data),

  update: (id: number, data: Partial<ClassInfo>): Promise<ClassInfo> =>
    put<ClassInfo>(`/classes/${id}`, data),

  remove: (id: number): Promise<void> => del<void>(`/classes/${id}`),

  getCourses: (id: number): Promise<ClassInfo['courses']> =>
    get<ClassInfo['courses']>(`/classes/${id}/courses`),

  saveCourses: (
    id: number,
    courses: Partial<ClassInfo['courses']>
  ): Promise<ClassInfo['courses']> =>
    put<ClassInfo['courses']>(`/classes/${id}/courses`, courses),
};

interface CreateLeavePayload {
  childId: number;
  parentId: number;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  attachment?: string;
}

export const leaveApi = {
  list: (params?: Record<string, unknown>): Promise<LeaveRecord[]> =>
    get<LeaveRecord[]>('/leave', params),

  create: (data: CreateLeavePayload): Promise<LeaveRecord> =>
    post<LeaveRecord>('/leave', data),

  approve: (id: number, approvedBy: number): Promise<LeaveRecord> =>
    put<LeaveRecord>(`/leave/${id}/approve`, { approvedBy }),

  reject: (id: number, approvedBy: number): Promise<LeaveRecord> =>
    put<LeaveRecord>(`/leave/${id}/reject`, { approvedBy }),

  calculateFee: (data: {
    startDate: string;
    endDate: string;
  }): Promise<FeeAdjustment> =>
    post<FeeAdjustment>('/leave/calculate-fee', data),
};

interface CreateMorningCheckPayload {
  childId: number;
  teacherId: number;
  classId?: number;
  temperature: number;
  oralCheck: string;
  handCheck: string;
  skinCheck: string;
  spiritCheck: string;
  note?: string;
}

export const healthApi = {
  morningCheckList: (
    params?: Record<string, unknown>
  ): Promise<MorningCheck[]> =>
    get<MorningCheck[]>('/health/morning-checks', params),

  createMorningCheck: (
    data: CreateMorningCheckPayload
  ): Promise<MorningCheck> =>
    post<MorningCheck>('/health/morning-checks', data),

  trackingList: (
    params?: Record<string, unknown>
  ): Promise<HealthTracking[]> =>
    get<HealthTracking[]>('/health/trackings', params),

  updateTracking: (
    id: number,
    data: Partial<HealthTracking>
  ): Promise<HealthTracking> =>
    put<HealthTracking>(`/health/trackings/${id}`, data),
};

interface CreateRecipePayload {
  date: string;
  campusId: number;
  meals: Recipe['meals'];
}

export const recipesApi = {
  list: (params?: Record<string, unknown>): Promise<Recipe[]> =>
    get<Recipe[]>('/recipes', params),

  detail: (id: number): Promise<Recipe> => get<Recipe>(`/recipes/${id}`),

  create: (data: CreateRecipePayload): Promise<Recipe> =>
    post<Recipe>('/recipes', data),

  generateBySeason: (data: {
    campusId: number;
    startDate: string;
    endDate: string;
  }): Promise<Recipe[]> => post<Recipe[]>('/recipes/generate', data),

  feedbackList: (recipeId: number): Promise<RecipeFeedback[]> =>
    get<RecipeFeedback[]>(`/recipes/${recipeId}/feedbacks`),

  createFeedback: (
    recipeId: number,
    data: { parentId: number; rating: number; comment?: string }
  ): Promise<RecipeFeedback> =>
    post<RecipeFeedback>(`/recipes/${recipeId}/feedbacks`, data),
};

export const pickupApi = {
  generateCode: (data: {
    childId: number;
    guardianId: number;
  }): Promise<PickupCode> => post<PickupCode>('/pickup/generate-code', data),

  codes: (childId: number): Promise<PickupCode[]> =>
    get<PickupCode[]>(`/pickup/codes/${childId}`),

  verify: (data: {
    code?: string;
    childId?: number;
    guardianId?: number;
    photoMatch?: boolean;
    isAbnormal?: boolean;
    abnormalNote?: string;
  }): Promise<PickupRecord> => post<PickupRecord>('/pickup/verify', data),

  records: (params?: Record<string, unknown>): Promise<PickupRecord[]> =>
    get<PickupRecord[]>('/pickup/records', params),
};

interface CreateActivityPayload {
  title: string;
  description: string;
  campusId: number;
  classIds?: number[];
  date: string;
  location: string;
  maxParticipants: number;
  materials: ActivityMaterial[];
}

export const activitiesApi = {
  list: (params?: Record<string, unknown>): Promise<Activity[]> =>
    get<Activity[]>('/activities', params),

  detail: (id: number): Promise<Activity> => get<Activity>(`/activities/${id}`),

  create: (data: CreateActivityPayload): Promise<Activity> =>
    post<Activity>('/activities', data),

  update: (id: number, data: Partial<Activity>): Promise<Activity> =>
    put<Activity>(`/activities/${id}`, data),

  remove: (id: number): Promise<void> => del<void>(`/activities/${id}`),

  register: (
    id: number,
    data: { childId: number; parentId: number; note?: string }
  ): Promise<Activity> => post<Activity>(`/activities/${id}/register`, data),

  cancelRegister: (id: number, registrationId: number): Promise<Activity> =>
    del<Activity>(`/activities/${id}/register/${registrationId}`),

  getMaterialList: (id: number): Promise<ActivityMaterial[]> =>
    get<ActivityMaterial[]>(`/activities/${id}/materials`),
};

export const billingApi = {
  billList: (params?: Record<string, unknown>): Promise<Bill[]> =>
    get<Bill[]>('/billing', params),

  createBill: (data: Partial<Bill>): Promise<Bill> =>
    post<Bill>('/billing', data),

  pay: (id: number, amount: number): Promise<Bill> =>
    put<Bill>(`/billing/${id}/pay`, { amount }),

  suspendedList: (params?: Record<string, unknown>): Promise<Bill[]> =>
    get<Bill[]>('/billing/suspended/list', params),

  restore: (id: number): Promise<Bill> =>
    post<Bill>(`/billing/${id}/restore`),
};

export const statsApi = {
  dashboard: (params?: Record<string, unknown>): Promise<DashboardStats> =>
    get<DashboardStats>('/stats/dashboard', params),
};

interface CreateUserPayload {
  username: string;
  name: string;
  role: string;
  phone: string;
  password?: string;
  campusId?: number;
  status?: 'active' | 'disabled';
}

export const settingsApi = {
  userList: (params?: Record<string, unknown>): Promise<User[]> =>
    get<User[]>('/settings/users', params),

  createUser: (data: CreateUserPayload): Promise<User> =>
    post<User>('/settings/users', data),

  updateUser: (
    id: number,
    data: Partial<CreateUserPayload>
  ): Promise<User> => put<User>(`/settings/users/${id}`, data),

  removeUser: (id: number): Promise<void> =>
    del<void>(`/settings/users/${id}`),

  campusList: (params?: Record<string, unknown>): Promise<Campus[]> =>
    get<Campus[]>('/settings/campuses', params),

  createCampus: (data: Partial<Campus>): Promise<Campus> =>
    post<Campus>('/settings/campuses', data),

  updateCampus: (id: number, data: Partial<Campus>): Promise<Campus> =>
    put<Campus>(`/settings/campuses/${id}`, data),

  dictList: (type?: string): Promise<DictionaryItem[]> =>
    get<DictionaryItem[]>('/settings/dictionaries', type ? { type } : undefined),

  createDict: (data: Partial<DictionaryItem>): Promise<DictionaryItem> =>
    post<DictionaryItem>('/settings/dictionaries', data),

  updateDict: (
    id: number,
    data: Partial<DictionaryItem>
  ): Promise<DictionaryItem> =>
    put<DictionaryItem>(`/settings/dictionaries/${id}`, data),

  removeDict: (id: number): Promise<void> =>
    del<void>(`/settings/dictionaries/${id}`),
};

export const reportsApi = {
  export: (params: {
    type: 'attendance' | 'health' | 'billing' | 'activity';
    startDate: string;
    endDate: string;
    campusId?: number;
    format?: 'json' | 'csv';
  }): Promise<unknown> => get<unknown>('/reports/export', params),
};
