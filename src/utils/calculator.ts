import { Subject, GradeScaleItem, Assignment, TargetAnalysis, SubjectStats, FeasibilityStatus } from '../types';

export const RUSSIAN_5_SCALE: GradeScaleItem[] = [
  { id: 'g5', name: 'Отлично (5)', minPoints: 85, maxPoints: 100, isPassing: true, color: '#10b981', gpaValue: 5.0 },
  { id: 'g4', name: 'Хорошо (4)', minPoints: 70, maxPoints: 84.99, isPassing: true, color: '#3b82f6', gpaValue: 4.0 },
  { id: 'g3', name: 'Удовл. (3)', minPoints: 50, maxPoints: 69.99, isPassing: true, color: '#f59e0b', gpaValue: 3.0 },
  { id: 'g2', name: 'Неуд. (2)', minPoints: 0, maxPoints: 49.99, isPassing: false, color: '#ef4444', gpaValue: 2.0 },
];

export const ECTS_SCALE: GradeScaleItem[] = [
  { id: 'ecta_a', name: 'A (Excellent)', minPoints: 90, maxPoints: 100, isPassing: true, color: '#10b981', gpaValue: 5.0 },
  { id: 'ecta_b', name: 'B (Very Good)', minPoints: 80, maxPoints: 89.99, isPassing: true, color: '#3b82f6', gpaValue: 4.5 },
  { id: 'ecta_c', name: 'C (Good)', minPoints: 70, maxPoints: 79.99, isPassing: true, color: '#06b6d4', gpaValue: 4.0 },
  { id: 'ecta_d', name: 'D (Satisfactory)', minPoints: 60, maxPoints: 69.99, isPassing: true, color: '#f59e0b', gpaValue: 3.5 },
  { id: 'ecta_e', name: 'E (Sufficient)', minPoints: 50, maxPoints: 59.99, isPassing: true, color: '#f97316', gpaValue: 3.0 },
  { id: 'ecta_f', name: 'F (Fail)', minPoints: 0, maxPoints: 49.99, isPassing: false, color: '#ef4444', gpaValue: 2.0 },
];

export const PASS_FAIL_SCALE: GradeScaleItem[] = [
  { id: 'pass', name: 'Зачёт', minPoints: 60, maxPoints: 100, isPassing: true, color: '#10b981', gpaValue: 5.0 },
  { id: 'fail', name: 'Незачёт', minPoints: 0, maxPoints: 59.99, isPassing: false, color: '#ef4444', gpaValue: 2.0 },
];

export function getMatchingGrade(score: number, scale: GradeScaleItem[]): GradeScaleItem | null {
  if (!scale || scale.length === 0) return null;
  // Sort descending by minPoints
  const sorted = [...scale].sort((a, b) => b.minPoints - a.minPoints);
  for (const grade of sorted) {
    if (score >= grade.minPoints) {
      return grade;
    }
  }
  return sorted[sorted.length - 1] || null;
}

export function calculateTargetAnalysis(subject: Subject): TargetAnalysis {
  const assignments = Array.isArray(subject?.assignments) ? subject.assignments : [];
  const gradingScale = Array.isArray(subject?.gradingScale) && subject.gradingScale.length > 0 ? subject.gradingScale : RUSSIAN_5_SCALE;
  const maxTotalPoints = Number(subject?.maxTotalPoints) || 100;

  const currentScore = assignments.reduce((sum, a) => {
    return sum + (a && a.completed && a.earnedScore !== null && a.earnedScore !== undefined ? Number(a.earnedScore) : 0);
  }, 0);

  const maxPointsSoFar = assignments.reduce((sum, a) => {
    return sum + (a && a.completed ? Number(a.maxScore || 0) : 0);
  }, 0);

  const remainingAssignments = assignments.filter((a) => a && !a.completed);
  const remainingPointsFromAssignments = remainingAssignments.reduce((sum, a) => sum + Number(a?.maxScore || 0), 0);

  // If sum of assignment maxScores doesn't match maxTotalPoints, remaining is difference from maxTotalPoints
  const remainingPoints = Math.max(0, Math.max(remainingPointsFromAssignments, maxTotalPoints - maxPointsSoFar));

  // Determine target score
  let targetScore = 0;
  let targetGrade: GradeScaleItem | null = null;

  if (subject?.customTargetScore !== undefined && subject?.customTargetScore !== null) {
    targetScore = Number(subject.customTargetScore);
    targetGrade = getMatchingGrade(targetScore, gradingScale);
  } else if (subject?.targetGradeId) {
    const found = gradingScale.find((g) => g.id === subject.targetGradeId);
    if (found) {
      targetGrade = found;
      targetScore = found.minPoints;
    }
  }

  // Fallback to highest passing grade if none specified
  if (!targetGrade && gradingScale.length > 0) {
    const sorted = [...gradingScale].sort((a, b) => b.minPoints - a.minPoints);
    const firstPassing = sorted.find((g) => g.isPassing) || sorted[0];
    targetGrade = firstPassing;
    targetScore = firstPassing.minPoints;
  }

  const neededPoints = Math.max(0, targetScore - currentScore);
  const isAchieved = currentScore >= targetScore;
  const isImpossible = currentScore + remainingPoints < targetScore;

  let neededPercentOfRemaining = 0;
  if (remainingPoints > 0) {
    neededPercentOfRemaining = Math.round((neededPoints / remainingPoints) * 100);
  }

  let feasibility: FeasibilityStatus = 'moderate';
  let feasibilityLabel = 'Требует усилий';
  let feasibilityColor = 'text-amber-400 bg-amber-400/10 border-amber-400/20';

  if (isAchieved) {
    feasibility = 'achieved';
    feasibilityLabel = 'Цель достигнута! 🎉';
    feasibilityColor = 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
  } else if (isImpossible) {
    feasibility = 'impossible';
    feasibilityLabel = 'Математически недостижимо';
    feasibilityColor = 'text-rose-400 bg-rose-400/10 border-rose-400/20';
  } else if (neededPercentOfRemaining <= 50) {
    feasibility = 'easy';
    feasibilityLabel = 'Легко достижимо';
    feasibilityColor = 'text-teal-400 bg-teal-400/10 border-teal-400/20';
  } else if (neededPercentOfRemaining <= 80) {
    feasibility = 'moderate';
    feasibilityLabel = 'Умеренная нагрузка';
    feasibilityColor = 'text-sky-400 bg-sky-400/10 border-sky-400/20';
  } else {
    feasibility = 'challenging';
    feasibilityLabel = 'Высокая сложность';
    feasibilityColor = 'text-amber-400 bg-amber-400/10 border-amber-400/20';
  }

  const currentGrade = getMatchingGrade(currentScore, subject.gradingScale);
  const completionPercent = subject.maxTotalPoints > 0
    ? Math.min(100, Math.round((maxPointsSoFar / subject.maxTotalPoints) * 100))
    : 0;

  return {
    targetGrade,
    targetScore,
    currentScore: Math.round(currentScore * 10) / 10,
    maxPointsSoFar: Math.round(maxPointsSoFar * 10) / 10,
    remainingPoints: Math.round(remainingPoints * 10) / 10,
    neededPoints: Math.round(neededPoints * 10) / 10,
    neededPercentOfRemaining,
    feasibility,
    feasibilityLabel,
    feasibilityColor,
    isAchieved,
    isImpossible,
    currentGrade,
    completionPercent,
  };
}

export function calculateSubjectStats(subject: Subject): SubjectStats {
  const targetAnalysis = calculateTargetAnalysis(subject);
  const currentPercentage = subject.maxTotalPoints > 0
    ? Math.round((targetAnalysis.currentScore / subject.maxTotalPoints) * 100)
    : 0;

  const completedCount = subject.assignments.filter((a) => a.completed).length;

  return {
    currentScore: targetAnalysis.currentScore,
    maxPossibleTotal: subject.maxTotalPoints,
    maxPointsSoFar: targetAnalysis.maxPointsSoFar,
    remainingPoints: targetAnalysis.remainingPoints,
    currentPercentage,
    projectedGrade: targetAnalysis.currentGrade,
    completedCount,
    totalAssignmentsCount: subject.assignments.length,
    targetAnalysis,
  };
}

// Proportional distribution of needed points among remaining assignments
export function distributePointsOverAssignments(
  assignments: Assignment[],
  neededPoints: number
): { assignmentId: string; recommendedScore: number; maxScore: number; percentage: number }[] {
  const remaining = assignments.filter((a) => !a.completed);
  const totalRemainingMax = remaining.reduce((s, a) => s + a.maxScore, 0);

  if (totalRemainingMax === 0 || neededPoints <= 0) {
    return remaining.map((a) => ({
      assignmentId: a.id,
      recommendedScore: 0,
      maxScore: a.maxScore,
      percentage: 0,
    }));
  }

  const ratio = Math.min(1, neededPoints / totalRemainingMax);

  return remaining.map((a) => {
    const recommended = Math.min(a.maxScore, Math.ceil(a.maxScore * ratio * 10) / 10);
    return {
      assignmentId: a.id,
      recommendedScore: recommended,
      maxScore: a.maxScore,
      percentage: Math.round((recommended / a.maxScore) * 100),
    };
  });
}

// Default initial subjects for first-time use
export const INITIAL_DEFAULT_SUBJECTS: Subject[] = [
  {
    id: 'subj_math_analysis',
    name: 'Математический анализ',
    code: 'МАТ-101',
    teacher: 'Проф. Соколов А.В.',
    maxTotalPoints: 100,
    gradingScale: RUSSIAN_5_SCALE,
    targetGradeId: 'g5', // Target: 5 (85+)
    assignments: [
      { id: 'as1', name: 'Коллоквиум 1 (Пределы и ряды)', maxScore: 15, earnedScore: 14, completed: true, category: 'test' },
      { id: 'as2', name: 'Типовой расчет №1', maxScore: 10, earnedScore: 9.5, completed: true, category: 'homework' },
      { id: 'as3', name: 'Лабораторный практикум', maxScore: 15, earnedScore: 13, completed: true, category: 'lab' },
      { id: 'as4', name: 'Рубежный контроль (Интегралы)', maxScore: 20, earnedScore: null, completed: false, category: 'test' },
      { id: 'as5', name: 'Итоговый письменный экзамен', maxScore: 40, earnedScore: null, completed: false, category: 'exam' },
    ],
    notes: 'Для автомата на 5 нужно не менее 85 баллов за семестр.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'subj_programming',
    name: 'Алгоритмы и структуры данных',
    code: 'ИНФ-202',
    teacher: 'Доц. Морозов Д.И.',
    maxTotalPoints: 100,
    gradingScale: RUSSIAN_5_SCALE,
    targetGradeId: 'g4', // Target: 4 (70+)
    assignments: [
      { id: 'prog1', name: 'Лабораторная 1: Сортировки', maxScore: 10, earnedScore: 10, completed: true, category: 'lab' },
      { id: 'prog2', name: 'Лабораторная 2: Деревья поиска', maxScore: 15, earnedScore: 12, completed: true, category: 'lab' },
      { id: 'prog3', name: 'Контест по динамическому программированию', maxScore: 20, earnedScore: 14, completed: true, category: 'test' },
      { id: 'prog4', name: 'Курсовой проект: Графовый анализатор', maxScore: 25, earnedScore: null, completed: false, category: 'homework' },
      { id: 'prog5', name: 'Устный экзамен по теории', maxScore: 30, earnedScore: null, completed: false, category: 'exam' },
    ],
    notes: 'Курсовой проект обязателен к защите до зачетной недели.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'subj_physics',
    name: 'Общая физика: Электродинамика',
    code: 'ФИЗ-103',
    teacher: 'Проф. Васильева Е.С.',
    maxTotalPoints: 100,
    gradingScale: PASS_FAIL_SCALE,
    targetGradeId: 'pass', // Target: Зачёт (60+)
    assignments: [
      { id: 'ph1', name: 'Лабораторная 1: Закон Ома', maxScore: 10, earnedScore: 9, completed: true, category: 'lab' },
      { id: 'ph2', name: 'Лабораторная 2: Магнитное поле', maxScore: 10, earnedScore: 8, completed: true, category: 'lab' },
      { id: 'ph3', name: 'Коллоквиум по уравнениям Максвелла', maxScore: 25, earnedScore: 18, completed: true, category: 'test' },
      { id: 'ph4', name: 'Зачетный тест', maxScore: 30, earnedScore: null, completed: false, category: 'exam' },
      { id: 'ph5', name: 'Семинарская активность', maxScore: 25, earnedScore: null, completed: false, category: 'seminar' },
    ],
    notes: 'Зачет ставится при 60+ баллах и защите всех лабораторок.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
