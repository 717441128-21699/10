import { Router, type Request, type Response } from 'express'
import { recipes, recipe_feedbacks, children, users } from '../db.js'
import { success, error } from '../utils/response.js'
import { verifyToken } from '../middleware/auth.js'
import { getSeason } from '../utils/helpers.js'
import type {
  Recipe,
  RecipeFeedback,
  Dish,
  Meal,
  MealType,
  Season,
} from '@shared/types'

const router = Router()

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function formatDateTime(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

let recipeIdCounter = 1000
const nextRecipeId = () => recipeIdCounter++

let feedbackIdCounter = 1000
const nextFeedbackId = () => feedbackIdCounter++

const DISH_POOL: Record<Season, Record<MealType, Dish[]>> = {
  spring: {
    breakfast: [
      { name: '小米南瓜粥', ingredients: ['小米', '南瓜'], nutrition: '健脾养胃', allergens: [] },
      { name: '奶香馒头', ingredients: ['面粉', '牛奶'], nutrition: '补充碳水', allergens: ['牛奶', '小麦'] },
      { name: '水煮蛋', ingredients: ['鸡蛋'], nutrition: '优质蛋白', allergens: ['鸡蛋'] },
      { name: '荠菜馄饨', ingredients: ['荠菜', '猪肉', '面粉'], nutrition: '春季时令', allergens: ['小麦'] },
      { name: '豆浆油条', ingredients: ['黄豆', '面粉'], nutrition: '传统早餐', allergens: ['小麦', '大豆'] },
    ],
    snack_am: [
      { name: '草莓', ingredients: ['草莓'], nutrition: '维生素C', allergens: [] },
      { name: '酸奶', ingredients: ['牛奶'], nutrition: '益生菌', allergens: ['牛奶'] },
      { name: '小番茄', ingredients: ['圣女果'], nutrition: '番茄红素', allergens: [] },
      { name: '枇杷', ingredients: ['枇杷'], nutrition: '润肺止咳', allergens: [] },
    ],
    lunch: [
      { name: '红烧肉', ingredients: ['五花肉'], nutrition: '脂肪蛋白', allergens: [] },
      { name: '清炒时蔬', ingredients: ['青菜'], nutrition: '膳食纤维', allergens: [] },
      { name: '米饭', ingredients: ['大米'], nutrition: '碳水化合物', allergens: [] },
      { name: '春笋炒肉', ingredients: ['春笋', '猪肉'], nutrition: '春季时令', allergens: [] },
      { name: '清蒸鲈鱼', ingredients: ['鲈鱼'], nutrition: 'DHA', allergens: ['海鲜'] },
      { name: '马兰头拌香干', ingredients: ['马兰头', '香干'], nutrition: '春季野菜', allergens: ['大豆'] },
    ],
    snack_pm: [
      { name: '小面包', ingredients: ['面粉'], nutrition: '补充能量', allergens: ['小麦'] },
      { name: '苹果', ingredients: ['苹果'], nutrition: '维生素', allergens: [] },
      { name: '桂花糕', ingredients: ['糯米', '桂花'], nutrition: '春季特色', allergens: [] },
      { name: '桑葚', ingredients: ['桑葚'], nutrition: '花青素', allergens: [] },
    ],
    dinner: [
      { name: '虾仁蒸蛋', ingredients: ['鸡蛋', '虾仁'], nutrition: '优质蛋白', allergens: ['鸡蛋', '海鲜'] },
      { name: '蔬菜面条', ingredients: ['面粉', '蔬菜'], nutrition: '易消化', allergens: ['小麦'] },
      { name: '韭菜鸡蛋饼', ingredients: ['韭菜', '鸡蛋', '面粉'], nutrition: '春季时令', allergens: ['鸡蛋', '小麦'] },
      { name: '紫菜蛋花汤', ingredients: ['紫菜', '鸡蛋'], nutrition: '营养丰富', allergens: ['鸡蛋', '海鲜'] },
    ],
  },
  summer: {
    breakfast: [
      { name: '绿豆粥', ingredients: ['绿豆', '大米'], nutrition: '清热解暑', allergens: [] },
      { name: '玉米棒', ingredients: ['玉米'], nutrition: '膳食纤维', allergens: [] },
      { name: '凉拌黄瓜', ingredients: ['黄瓜'], nutrition: '清爽开胃', allergens: [] },
      { name: '皮蛋瘦肉粥', ingredients: ['大米', '皮蛋', '瘦肉'], nutrition: '清淡易消化', allergens: [] },
      { name: '藕粉', ingredients: ['莲藕'], nutrition: '清热生津', allergens: [] },
    ],
    snack_am: [
      { name: '西瓜', ingredients: ['西瓜'], nutrition: '补水消暑', allergens: [] },
      { name: '绿豆汤', ingredients: ['绿豆'], nutrition: '清热', allergens: [] },
      { name: '哈密瓜', ingredients: ['哈密瓜'], nutrition: '维生素', allergens: [] },
      { name: '荔枝', ingredients: ['荔枝'], nutrition: '夏季水果', allergens: [] },
    ],
    lunch: [
      { name: '清蒸鱼', ingredients: ['鱼肉'], nutrition: 'DHA', allergens: ['海鲜'] },
      { name: '番茄炒蛋', ingredients: ['番茄', '鸡蛋'], nutrition: '维生素', allergens: ['鸡蛋'] },
      { name: '米饭', ingredients: ['大米'], nutrition: '碳水化合物', allergens: [] },
      { name: '苦瓜炒肉', ingredients: ['苦瓜', '猪肉'], nutrition: '清热解暑', allergens: [] },
      { name: '冬瓜虾仁', ingredients: ['冬瓜', '虾仁'], nutrition: '消暑利水', allergens: ['海鲜'] },
      { name: '凉拌木耳', ingredients: ['木耳', '黄瓜'], nutrition: '清爽开胃', allergens: [] },
    ],
    snack_pm: [
      { name: '绿豆糕', ingredients: ['绿豆', '面粉'], nutrition: '解暑点心', allergens: ['小麦'] },
      { name: '哈密瓜', ingredients: ['哈密瓜'], nutrition: '维生素', allergens: [] },
      { name: '冰粉', ingredients: ['冰粉籽', '红糖'], nutrition: '消暑甜品', allergens: [] },
      { name: '桃子', ingredients: ['桃子'], nutrition: '夏季时令', allergens: [] },
    ],
    dinner: [
      { name: '冬瓜排骨汤', ingredients: ['冬瓜', '排骨'], nutrition: '消暑滋补', allergens: [] },
      { name: '米饭', ingredients: ['大米'], nutrition: '碳水化合物', allergens: [] },
      { name: '凉面', ingredients: ['面粉', '黄瓜', '芝麻酱'], nutrition: '夏季主食', allergens: ['小麦', '大豆'] },
      { name: '丝瓜蛋汤', ingredients: ['丝瓜', '鸡蛋'], nutrition: '清热消暑', allergens: ['鸡蛋'] },
    ],
  },
  autumn: {
    breakfast: [
      { name: '银耳莲子粥', ingredients: ['银耳', '莲子', '大米'], nutrition: '润肺滋阴', allergens: [] },
      { name: '红薯', ingredients: ['红薯'], nutrition: '膳食纤维', allergens: [] },
      { name: '荷包蛋', ingredients: ['鸡蛋'], nutrition: '优质蛋白', allergens: ['鸡蛋'] },
      { name: '南瓜饼', ingredients: ['南瓜', '糯米'], nutrition: '秋季时令', allergens: [] },
      { name: '黑芝麻糊', ingredients: ['黑芝麻', '糯米'], nutrition: '滋补肝肾', allergens: [] },
    ],
    snack_am: [
      { name: '梨', ingredients: ['梨'], nutrition: '润肺止咳', allergens: [] },
      { name: '牛奶', ingredients: ['牛奶'], nutrition: '钙和蛋白', allergens: ['牛奶'] },
      { name: '葡萄', ingredients: ['葡萄'], nutrition: '花青素', allergens: [] },
      { name: '石榴', ingredients: ['石榴'], nutrition: '秋季时令', allergens: [] },
    ],
    lunch: [
      { name: '板栗烧鸡', ingredients: ['鸡肉', '板栗'], nutrition: '温补', allergens: [] },
      { name: '蒜蓉西兰花', ingredients: ['西兰花'], nutrition: '维生素', allergens: [] },
      { name: '米饭', ingredients: ['大米'], nutrition: '碳水化合物', allergens: [] },
      { name: '山药炖排骨', ingredients: ['山药', '排骨'], nutrition: '健脾养胃', allergens: [] },
      { name: '藕片炒肉', ingredients: ['莲藕', '猪肉'], nutrition: '秋季时令', allergens: [] },
      { name: '百合炒西芹', ingredients: ['百合', '西芹'], nutrition: '润肺清燥', allergens: [] },
    ],
    snack_pm: [
      { name: '桂花糕', ingredients: ['糯米', '桂花'], nutrition: '秋季特色', allergens: [] },
      { name: '葡萄', ingredients: ['葡萄'], nutrition: '花青素', allergens: [] },
      { name: '柿子饼', ingredients: ['柿子'], nutrition: '秋季时令', allergens: [] },
      { name: '山楂片', ingredients: ['山楂'], nutrition: '开胃消食', allergens: [] },
    ],
    dinner: [
      { name: '萝卜牛腩', ingredients: ['白萝卜', '牛肉'], nutrition: '温补气血', allergens: [] },
      { name: '软米饭', ingredients: ['大米'], nutrition: '碳水化合物', allergens: [] },
      { name: '南瓜粥', ingredients: ['南瓜', '大米'], nutrition: '健脾养胃', allergens: [] },
      { name: '栗子焖鸡', ingredients: ['鸡肉', '板栗'], nutrition: '秋季滋补', allergens: [] },
    ],
  },
  winter: {
    breakfast: [
      { name: '腊八粥', ingredients: ['大米', '红豆', '花生', '红枣'], nutrition: '温补暖身', allergens: ['花生'] },
      { name: '葱油饼', ingredients: ['面粉', '葱'], nutrition: '补充能量', allergens: ['小麦'] },
      { name: '茶叶蛋', ingredients: ['鸡蛋'], nutrition: '优质蛋白', allergens: ['鸡蛋'] },
      { name: '羊肉汤面', ingredients: ['羊肉', '面粉'], nutrition: '暖身进补', allergens: ['小麦'] },
      { name: '糯米烧卖', ingredients: ['糯米', '猪肉', '面粉'], nutrition: '能量充足', allergens: ['小麦'] },
    ],
    snack_am: [
      { name: '橙子', ingredients: ['橙子'], nutrition: '维生素C', allergens: [] },
      { name: '热牛奶', ingredients: ['牛奶'], nutrition: '钙和蛋白', allergens: ['牛奶'] },
      { name: '烤红薯', ingredients: ['红薯'], nutrition: '暖身暖胃', allergens: [] },
      { name: '桂圆', ingredients: ['桂圆'], nutrition: '温补气血', allergens: [] },
    ],
    lunch: [
      { name: '红烧羊肉', ingredients: ['羊肉'], nutrition: '暖身进补', allergens: [] },
      { name: '醋溜白菜', ingredients: ['白菜'], nutrition: '膳食纤维', allergens: [] },
      { name: '米饭', ingredients: ['大米'], nutrition: '碳水化合物', allergens: [] },
      { name: '萝卜炖羊肉', ingredients: ['白萝卜', '羊肉'], nutrition: '温补暖身', allergens: [] },
      { name: '土豆烧牛肉', ingredients: ['土豆', '牛肉'], nutrition: '能量充足', allergens: [] },
      { name: '酸菜鱼', ingredients: ['酸菜', '鱼肉'], nutrition: '暖身开胃', allergens: ['海鲜'] },
    ],
    snack_pm: [
      { name: '八宝粥', ingredients: ['大米', '红豆', '花生'], nutrition: '温补', allergens: ['花生'] },
      { name: '香蕉', ingredients: ['香蕉'], nutrition: '钾元素', allergens: [] },
      { name: '芝麻糊', ingredients: ['黑芝麻', '糯米'], nutrition: '滋补暖身', allergens: [] },
      { name: '糖炒栗子', ingredients: ['板栗'], nutrition: '冬季零食', allergens: [] },
    ],
    dinner: [
      { name: '火锅丸子', ingredients: ['猪肉', '面粉'], nutrition: '暖身', allergens: ['小麦'] },
      { name: '蔬菜汤', ingredients: ['青菜', '番茄'], nutrition: '维生素', allergens: [] },
      { name: '饺子', ingredients: ['面粉', '猪肉', '白菜'], nutrition: '冬季传统', allergens: ['小麦'] },
      { name: '羊肉泡馍', ingredients: ['羊肉', '面粉'], nutrition: '暖身进补', allergens: ['小麦'] },
    ],
  },
}

const MEAL_TYPE_CONFIG: { type: MealType; typeName: string }[] = [
  { type: 'breakfast', typeName: '早餐' },
  { type: 'snack_am', typeName: '上午点心' },
  { type: 'lunch', typeName: '午餐' },
  { type: 'snack_pm', typeName: '下午点心' },
  { type: 'dinner', typeName: '晚餐' },
]

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomChoices<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, arr.length))
}

function enrichRecipeWithFeedback(recipe: Recipe): Recipe {
  const feedbacks = recipe_feedbacks
    .filter(f => f.recipeId === recipe.id)
    .map(f => {
      const parent = users.find(u => u.id === f.parentId)
      return {
        ...f,
        parentName: parent?.name ?? f.parentName,
      }
    })
  return {
    ...recipe,
    feedback: feedbacks,
  }
}

function generateMealsForSeason(season: Season): Meal[] {
  const dishPool = DISH_POOL[season]
  return MEAL_TYPE_CONFIG.map(mc => {
    const dishes = randomChoices(dishPool[mc.type], Math.min(3, dishPool[mc.type].length))
    return {
      type: mc.type,
      typeName: mc.typeName,
      dishes,
    }
  })
}

router.get('/', verifyToken, (req: Request, res: Response): void => {
  const { campusId, startDate, endDate, season } = req.query

  let results = [...recipes]

  if (campusId) {
    const cid = parseInt(campusId as string, 10)
    results = results.filter(r => r.campusId === cid)
  }

  if (startDate) {
    results = results.filter(r => r.date >= (startDate as string))
  }

  if (endDate) {
    results = results.filter(r => r.date <= (endDate as string))
  }

  if (season) {
    results = results.filter(r => r.season === (season as Season))
  }

  const enriched = results.map(enrichRecipeWithFeedback)
  res.json(success(enriched))
})

router.get('/:id', verifyToken, (req: Request, res: Response): void => {
  const id = parseInt(req.params.id, 10)
  const recipe = recipes.find(r => r.id === id)

  if (!recipe) {
    res.status(404).json(error('食谱不存在', 404))
    return
  }

  res.json(success(enrichRecipeWithFeedback(recipe)))
})

router.post('/', verifyToken, (req: Request, res: Response): void => {
  const { date, campusId, meals } = req.body

  if (!date || !campusId || !meals) {
    res.status(400).json(error('缺少必要参数：date, campusId, meals'))
    return
  }

  const season = getSeason(date)

  const newRecipe: Recipe = {
    id: nextRecipeId(),
    date,
    campusId: parseInt(campusId as string, 10),
    season,
    meals,
    feedback: [],
  }

  recipes.push(newRecipe)
  res.json(success(newRecipe, '食谱创建成功'))
})

router.post('/generate', verifyToken, (req: Request, res: Response): void => {
  const { campusId, startDate, endDate } = req.body

  if (!campusId || !startDate || !endDate) {
    res.status(400).json(error('缺少必要参数：campusId, startDate, endDate'))
    return
  }

  const start = new Date(startDate)
  const end = new Date(endDate)
  const generatedRecipes: Recipe[] = []

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      continue
    }

    const dateStr = formatDate(d)
    const season = getSeason(dateStr)
    const meals = generateMealsForSeason(season)

    const recipe: Recipe = {
      id: nextRecipeId(),
      date: dateStr,
      campusId: parseInt(campusId as string, 10),
      season,
      meals,
      feedback: [],
    }

    recipes.push(recipe)
    generatedRecipes.push(recipe)
  }

  res.json(success(generatedRecipes, `成功生成 ${generatedRecipes.length} 天食谱`))
})

router.get('/:id/feedbacks', verifyToken, (req: Request, res: Response): void => {
  const id = parseInt(req.params.id, 10)
  const recipe = recipes.find(r => r.id === id)

  if (!recipe) {
    res.status(404).json(error('食谱不存在', 404))
    return
  }

  const feedbacks = recipe_feedbacks
    .filter(f => f.recipeId === id)
    .map(f => {
      const parent = users.find(u => u.id === f.parentId)
      return {
        ...f,
        parentName: parent?.name ?? f.parentName,
      }
    })

  res.json(success(feedbacks))
})

router.post('/:id/feedbacks', verifyToken, (req: Request, res: Response): void => {
  const id = parseInt(req.params.id, 10)
  const { parentId, rating, comment } = req.body

  const recipe = recipes.find(r => r.id === id)
  if (!recipe) {
    res.status(404).json(error('食谱不存在', 404))
    return
  }

  if (!parentId || rating === undefined) {
    res.status(400).json(error('缺少必要参数：parentId, rating'))
    return
  }

  if (rating < 1 || rating > 5) {
    res.status(400).json(error('评分应在1-5之间'))
    return
  }

  const parent = users.find(u => u.id === parentId)

  const newFeedback: RecipeFeedback = {
    id: nextFeedbackId(),
    recipeId: id,
    parentId,
    parentName: parent?.name,
    rating,
    comment,
    createdAt: formatDateTime(new Date()),
  }

  recipe_feedbacks.push(newFeedback)
  res.json(success(newFeedback, '反馈创建成功'))
})

export default router
