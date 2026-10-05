import { Subject, SubjectTemplate, Assignment } from '../types';

/**
 * Creates a clean SubjectTemplate object from a single Subject.
 * @param subject The source subject
 * @param clearEarnedScores If true, sets earnedScore: null and completed: false (perfect for sharing with classmates)
 */
export function createSubjectTemplate(
  subject: Subject,
  clearEarnedScores: boolean = false
): SubjectTemplate {
  const cleanAssignments: Assignment[] = subject.assignments.map((a, idx) => ({
    id: `as_tpl_${idx + 1}`,
    name: a.name,
    maxScore: a.maxScore,
    earnedScore: clearEarnedScores ? null : a.earnedScore,
    completed: clearEarnedScores ? false : a.completed,
    category: a.category,
    dueDate: a.dueDate,
  }));

  return {
    format: 'smart_grade_template_v1',
    exportedAt: new Date().toISOString(),
    title: subject.name,
    description: subject.notes,
    isMulti: false,
    subject: {
      name: subject.name,
      code: subject.code,
      teacher: subject.teacher,
      maxTotalPoints: subject.maxTotalPoints,
      gradingScale: subject.gradingScale.map((g) => ({ ...g })),
      assignments: cleanAssignments,
      targetGradeId: subject.targetGradeId,
      customTargetScore: subject.customTargetScore,
      notes: subject.notes,
    },
  };
}

/**
 * Creates a multi-subject semester template from an array of Subjects.
 */
export function createSemesterTemplate(
  subjects: Subject[],
  title: string = 'Учебный семестр',
  clearEarnedScores: boolean = false
): SubjectTemplate {
  const cleanSubjects = subjects.map((subj) => {
    const cleanAssignments: Assignment[] = subj.assignments.map((a, idx) => ({
      id: `as_tpl_${idx + 1}`,
      name: a.name,
      maxScore: a.maxScore,
      earnedScore: clearEarnedScores ? null : a.earnedScore,
      completed: clearEarnedScores ? false : a.completed,
      category: a.category,
      dueDate: a.dueDate,
    }));

    return {
      name: subj.name,
      code: subj.code,
      teacher: subj.teacher,
      maxTotalPoints: subj.maxTotalPoints,
      gradingScale: subj.gradingScale.map((g) => ({ ...g })),
      assignments: cleanAssignments,
      targetGradeId: subj.targetGradeId,
      customTargetScore: subj.customTargetScore,
      notes: subj.notes,
    };
  });

  return {
    format: 'smart_grade_template_v1',
    exportedAt: new Date().toISOString(),
    title,
    isMulti: true,
    subjects: cleanSubjects,
  };
}

/**
 * Triggers a browser download of the template as a formatted JSON file.
 */
export function downloadTemplateAsJSON(template: SubjectTemplate, customFileName?: string) {
  const defaultName = template.isMulti
    ? `Шаблоны_семестра_${new Date().toISOString().slice(0, 10)}.json`
    : `Шаблон_${(template.subject?.name || 'предмет').replace(/[/\\?%*:|"<>]/g, '_')}.json`;

  const fileName = customFileName || defaultName;
  const jsonStr = JSON.stringify(template, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parses and validates template data from a JSON string or object.
 */
export function validateAndParseTemplate(raw: unknown): {
  valid: boolean;
  template?: SubjectTemplate;
  error?: string;
} {
  try {
    let parsed: any = raw;
    if (typeof raw === 'string') {
      parsed = JSON.parse(raw);
    }

    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'Файл не содержит корректного JSON-объекта.' };
    }

    // Support both our formal format and raw subject JSON export
    if (parsed.format === 'smart_grade_template_v1') {
      if (parsed.isMulti && Array.isArray(parsed.subjects) && parsed.subjects.length > 0) {
        return { valid: true, template: parsed as SubjectTemplate };
      }
      if (!parsed.isMulti && parsed.subject && parsed.subject.name) {
        return { valid: true, template: parsed as SubjectTemplate };
      }
    }

    // Fallback: if user uploaded raw single Subject export
    if (parsed.name && Array.isArray(parsed.gradingScale)) {
      const wrappedTemplate: SubjectTemplate = {
        format: 'smart_grade_template_v1',
        exportedAt: new Date().toISOString(),
        title: parsed.name,
        isMulti: false,
        subject: {
          name: parsed.name,
          code: parsed.code,
          teacher: parsed.teacher,
          maxTotalPoints: Number(parsed.maxTotalPoints) || 100,
          gradingScale: parsed.gradingScale,
          assignments: Array.isArray(parsed.assignments) ? parsed.assignments : [],
          targetGradeId: parsed.targetGradeId,
          customTargetScore: parsed.customTargetScore,
          notes: parsed.notes,
        },
      };
      return { valid: true, template: wrappedTemplate };
    }

    // Fallback: if user uploaded array of subjects
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.name) {
      const wrappedMulti: SubjectTemplate = {
        format: 'smart_grade_template_v1',
        exportedAt: new Date().toISOString(),
        title: 'Импортированные предметы',
        isMulti: true,
        subjects: parsed,
      };
      return { valid: true, template: wrappedMulti };
    }

    return {
      valid: false,
      error: 'Неверный формат шаблона: отсутствуют обязательные поля предмета (название, шкала баллов).',
    };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? `Ошибка чтения JSON: ${err.message}` : 'Ошибка чтения файла',
    };
  }
}

export interface AcademicPreset {
  id: string;
  title: string;
  badge: string;
  category?: 'university' | 'technical' | 'credits' | 'custom';
  description: string;
  scaleType: string;
  subjectsCount: number;
  template: SubjectTemplate;
}

/**
 * Feature flag & developer configuration for ready-made presets.
 * Hidden by default to keep the UI clean and minimalist.
 * Can be activated anytime via:
 * 1. URL parameter: ?presets=1 or ?presets=true
 * 2. LocalStorage flag: sgc_curated_presets_mode_v2 = 'true'
 * 3. Secret click on the security shield in the Cloud modal footer
 */
export const PRESETS_CONFIG = {
  storageKey: 'sgc_curated_presets_mode_v2',
  isEnabled: (): boolean => {
    try {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('presets') === 'true' || urlParams.get('presets') === '1') {
          return true;
        }
        return localStorage.getItem('sgc_curated_presets_mode_v2') === 'true';
      }
    } catch {}
    return false;
  },
  toggle: (forceState?: boolean): boolean => {
    try {
      const current = PRESETS_CONFIG.isEnabled();
      const next = forceState !== undefined ? forceState : !current;
      localStorage.setItem('sgc_curated_presets_mode_v2', String(next));
      return next;
    } catch {
      return false;
    }
  },
};

export const ACADEMIC_PRESET_TEMPLATES: AcademicPreset[] = [
  {
    id: 'it_hse_10',
    title: 'IT и разработка ПО',
    badge: '10-балльная ВШЭ',
    description: 'Алгоритмы, Базы данных, Линейная алгебра и Архитектура ЭВМ с 10-балльной накопительной шкалой.',
    scaleType: '10 баллов',
    subjectsCount: 4,
    template: {
      format: 'smart_grade_template_v1',
      exportedAt: new Date().toISOString(),
      title: 'IT и разработка ПО (10-балльная шкала)',
      isMulti: true,
      subjects: [
        {
          name: 'Алгоритмы и структуры данных',
          code: 'CS-201',
          teacher: 'Кафедра информатики',
          maxTotalPoints: 10,
          targetGradeId: 's8',
          notes: 'Накопленная оценка 0.6 + Экзамен 0.4',
          gradingScale: [
            { id: 's10', name: '10 (Превосходно)', minPoints: 9.5, maxPoints: 10, isPassing: true, color: '#10b981' },
            { id: 's9', name: '9 (Отлично)', minPoints: 8.5, maxPoints: 9.49, isPassing: true, color: '#10b981' },
            { id: 's8', name: '8 (Почти отлично)', minPoints: 7.5, maxPoints: 8.49, isPassing: true, color: '#3b82f6' },
            { id: 's7', name: '7 (Очень хорошо)', minPoints: 6.5, maxPoints: 7.49, isPassing: true, color: '#3b82f6' },
            { id: 's6', name: '6 (Хорошо)', minPoints: 5.5, maxPoints: 6.49, isPassing: true, color: '#06b6d4' },
            { id: 's5', name: '5 (Удовлетворительно)', minPoints: 4.5, maxPoints: 5.49, isPassing: true, color: '#f59e0b' },
            { id: 's4', name: '4 (Достаточно)', minPoints: 3.5, maxPoints: 4.49, isPassing: true, color: '#f97316' },
            { id: 's3', name: '3 (Неудовлетворительно)', minPoints: 0, maxPoints: 3.49, isPassing: false, color: '#ef4444' },
          ],
          assignments: [
            { id: 'a1', name: 'Домашние задания и контесты', maxScore: 3, earnedScore: null, completed: false, category: 'homework' },
            { id: 'a2', name: 'Рубежный коллоквиум', maxScore: 3, earnedScore: null, completed: false, category: 'test' },
            { id: 'a3', name: 'Письменный экзамен', maxScore: 4, earnedScore: null, completed: false, category: 'exam' },
          ],
        },
        {
          name: 'Базы данных и проектирование SQL',
          code: 'DB-102',
          teacher: 'Кафедра системного анализа',
          maxTotalPoints: 10,
          targetGradeId: 's8',
          gradingScale: [
            { id: 's10', name: '10 (Превосходно)', minPoints: 9.5, maxPoints: 10, isPassing: true, color: '#10b981' },
            { id: 's9', name: '9 (Отлично)', minPoints: 8.5, maxPoints: 9.49, isPassing: true, color: '#10b981' },
            { id: 's8', name: '8 (Почти отлично)', minPoints: 7.5, maxPoints: 8.49, isPassing: true, color: '#3b82f6' },
            { id: 's7', name: '7 (Очень хорошо)', minPoints: 6.5, maxPoints: 7.49, isPassing: true, color: '#3b82f6' },
            { id: 's6', name: '6 (Хорошо)', minPoints: 5.5, maxPoints: 6.49, isPassing: true, color: '#06b6d4' },
            { id: 's5', name: '5 (Удовлетворительно)', minPoints: 4.5, maxPoints: 5.49, isPassing: true, color: '#f59e0b' },
            { id: 's4', name: '4 (Достаточно)', minPoints: 3.5, maxPoints: 4.49, isPassing: true, color: '#f97316' },
            { id: 's3', name: '3 (Неудовлетворительно)', minPoints: 0, maxPoints: 3.49, isPassing: false, color: '#ef4444' },
          ],
          assignments: [
            { id: 'a1', name: 'Лабораторные работы по SQL', maxScore: 3.5, earnedScore: null, completed: false, category: 'lab' },
            { id: 'a2', name: 'Курсовой мини-проект БД', maxScore: 2.5, earnedScore: null, completed: false, category: 'homework' },
            { id: 'a3', name: 'Итоговый экзамен', maxScore: 4, earnedScore: null, completed: false, category: 'exam' },
          ],
        },
        {
          name: 'Линейная алгебра и геометрия',
          code: 'MATH-110',
          maxTotalPoints: 10,
          targetGradeId: 's8',
          gradingScale: [
            { id: 's10', name: '10 (Превосходно)', minPoints: 9.5, maxPoints: 10, isPassing: true, color: '#10b981' },
            { id: 's9', name: '9 (Отлично)', minPoints: 8.5, maxPoints: 9.49, isPassing: true, color: '#10b981' },
            { id: 's8', name: '8 (Почти отлично)', minPoints: 7.5, maxPoints: 8.49, isPassing: true, color: '#3b82f6' },
            { id: 's7', name: '7 (Очень хорошо)', minPoints: 6.5, maxPoints: 7.49, isPassing: true, color: '#3b82f6' },
            { id: 's6', name: '6 (Хорошо)', minPoints: 5.5, maxPoints: 6.49, isPassing: true, color: '#06b6d4' },
            { id: 's5', name: '5 (Удовлетворительно)', minPoints: 4.5, maxPoints: 5.49, isPassing: true, color: '#f59e0b' },
            { id: 's4', name: '4 (Достаточно)', minPoints: 3.5, maxPoints: 4.49, isPassing: true, color: '#f97316' },
            { id: 's3', name: '3 (Неудовлетворительно)', minPoints: 0, maxPoints: 3.49, isPassing: false, color: '#ef4444' },
          ],
          assignments: [
            { id: 'a1', name: 'Контрольная работа 1 (Матрицы)', maxScore: 2.5, earnedScore: null, completed: false, category: 'test' },
            { id: 'a2', name: 'Контрольная работа 2 (Векторные пространства)', maxScore: 2.5, earnedScore: null, completed: false, category: 'test' },
            { id: 'a3', name: 'Семинарская активность', maxScore: 1, earnedScore: null, completed: false, category: 'seminar' },
            { id: 'a4', name: 'Экзаменационный билет', maxScore: 4, earnedScore: null, completed: false, category: 'exam' },
          ],
        },
      ],
    },
  },
  {
    id: 'tech_eng_100',
    title: 'Технический бакалавриат',
    badge: '100 баллов / Автомат от 85',
    description: 'Высшая математика, Общая физика, Теоретическая механика и Начертательная геометрия.',
    scaleType: '100 баллов (5-балльная)',
    subjectsCount: 3,
    template: {
      format: 'smart_grade_template_v1',
      exportedAt: new Date().toISOString(),
      title: 'Инженерный бакалавриат (100-балльная шкала)',
      isMulti: true,
      subjects: [
        {
          name: 'Высшая математика (Матанализ)',
          code: 'ВМ-1',
          maxTotalPoints: 100,
          targetGradeId: 'g5',
          notes: 'Автомат на оценку «5» при наборе от 85 баллов за семестр',
          gradingScale: [
            { id: 'g5', name: '5 (Отлично)', minPoints: 85, maxPoints: 100, isPassing: true, color: '#10b981' },
            { id: 'g4', name: '4 (Хорошо)', minPoints: 70, maxPoints: 84.99, isPassing: true, color: '#3b82f6' },
            { id: 'g3', name: '3 (Удовлетворительно)', minPoints: 50, maxPoints: 69.99, isPassing: true, color: '#f59e0b' },
            { id: 'g2', name: '2 (Неудовлетворительно)', minPoints: 0, maxPoints: 49.99, isPassing: false, color: '#ef4444' },
          ],
          assignments: [
            { id: 'a1', name: 'Типовой расчет: Пределы и производные', maxScore: 20, earnedScore: null, completed: false, category: 'homework' },
            { id: 'a2', name: 'Рубежная контрольная работа', maxScore: 20, earnedScore: null, completed: false, category: 'test' },
            { id: 'a3', name: 'Семинары и посещаемость', maxScore: 10, earnedScore: null, completed: false, category: 'seminar' },
            { id: 'a4', name: 'Семестровый экзамен', maxScore: 50, earnedScore: null, completed: false, category: 'exam' },
          ],
        },
        {
          name: 'Общая физика (Механика)',
          code: 'ФИЗ-101',
          maxTotalPoints: 100,
          targetGradeId: 'g5',
          gradingScale: [
            { id: 'g5', name: '5 (Отлично)', minPoints: 85, maxPoints: 100, isPassing: true, color: '#10b981' },
            { id: 'g4', name: '4 (Хорошо)', minPoints: 70, maxPoints: 84.99, isPassing: true, color: '#3b82f6' },
            { id: 'g3', name: '3 (Удовлетворительно)', minPoints: 50, maxPoints: 69.99, isPassing: true, color: '#f59e0b' },
            { id: 'g2', name: '2 (Неудовлетворительно)', minPoints: 0, maxPoints: 49.99, isPassing: false, color: '#ef4444' },
          ],
          assignments: [
            { id: 'a1', name: 'Цикл лабораторных работ (5 шт.)', maxScore: 30, earnedScore: null, completed: false, category: 'lab' },
            { id: 'a2', name: 'Коллоквиум по теории механики', maxScore: 20, earnedScore: null, completed: false, category: 'test' },
            { id: 'a3', name: 'Итоговый письменный экзамен', maxScore: 50, earnedScore: null, completed: false, category: 'exam' },
          ],
        },
        {
          name: 'Теоретическая механика',
          code: 'ТМ-201',
          maxTotalPoints: 100,
          targetGradeId: 'g4',
          gradingScale: [
            { id: 'g5', name: '5 (Отлично)', minPoints: 85, maxPoints: 100, isPassing: true, color: '#10b981' },
            { id: 'g4', name: '4 (Хорошо)', minPoints: 70, maxPoints: 84.99, isPassing: true, color: '#3b82f6' },
            { id: 'g3', name: '3 (Удовлетворительно)', minPoints: 50, maxPoints: 69.99, isPassing: true, color: '#f59e0b' },
            { id: 'g2', name: '2 (Неудовлетворительно)', minPoints: 0, maxPoints: 49.99, isPassing: false, color: '#ef4444' },
          ],
          assignments: [
            { id: 'a1', name: 'Расчетно-графическая работа 1 (Статика)', maxScore: 25, earnedScore: null, completed: false, category: 'homework' },
            { id: 'a2', name: 'Расчетно-графическая работа 2 (Кинематика)', maxScore: 25, earnedScore: null, completed: false, category: 'homework' },
            { id: 'a3', name: 'Экзаменационный билет', maxScore: 50, earnedScore: null, completed: false, category: 'exam' },
          ],
        },
      ],
    },
  },
  {
    id: 'passfail_credits',
    title: 'Зачётная сессия',
    badge: 'Зачёт / Незачёт 60+',
    description: 'Иностранный язык, Физическая культура, БЖД и Правоведение с порогом сдачи от 60 баллов.',
    scaleType: 'Зачёт от 60 б.',
    subjectsCount: 3,
    template: {
      format: 'smart_grade_template_v1',
      exportedAt: new Date().toISOString(),
      title: 'Зачётный семестр (Зачёт / Незачёт)',
      isMulti: true,
      subjects: [
        {
          name: 'Иностранный язык (Английский)',
          code: 'ENG-1',
          maxTotalPoints: 100,
          targetGradeId: 'pass',
          gradingScale: [
            { id: 'pass', name: 'Зачёт', minPoints: 60, maxPoints: 100, isPassing: true, color: '#10b981' },
            { id: 'fail', name: 'Незачёт', minPoints: 0, maxPoints: 59.99, isPassing: false, color: '#ef4444' },
          ],
          assignments: [
            { id: 'a1', name: 'Модульный лексический тест', maxScore: 25, earnedScore: null, completed: false, category: 'test' },
            { id: 'a2', name: 'Презентация научного проекта', maxScore: 25, earnedScore: null, completed: false, category: 'seminar' },
            { id: 'a3', name: 'Работа на практических занятиях', maxScore: 20, earnedScore: null, completed: false, category: 'seminar' },
            { id: 'a4', name: 'Итоговое собеседование (Зачёт)', maxScore: 30, earnedScore: null, completed: false, category: 'exam' },
          ],
        },
        {
          name: 'Физическая культура и спорт',
          code: 'ФК-1',
          maxTotalPoints: 100,
          targetGradeId: 'pass',
          gradingScale: [
            { id: 'pass', name: 'Зачёт', minPoints: 60, maxPoints: 100, isPassing: true, color: '#10b981' },
            { id: 'fail', name: 'Незачёт', minPoints: 0, maxPoints: 59.99, isPassing: false, color: '#ef4444' },
          ],
          assignments: [
            { id: 'a1', name: 'Посещение обязательных занятий', maxScore: 60, earnedScore: null, completed: false, category: 'seminar' },
            { id: 'a2', name: 'Сдача нормативов ОФП', maxScore: 30, earnedScore: null, completed: false, category: 'test' },
            { id: 'a3', name: 'Теоретический тест', maxScore: 10, earnedScore: null, completed: false, category: 'test' },
          ],
        },
        {
          name: 'Безопасность жизнедеятельности (БЖД)',
          code: 'БЖД-1',
          maxTotalPoints: 100,
          targetGradeId: 'pass',
          gradingScale: [
            { id: 'pass', name: 'Зачёт', minPoints: 60, maxPoints: 100, isPassing: true, color: '#10b981' },
            { id: 'fail', name: 'Незачёт', minPoints: 0, maxPoints: 59.99, isPassing: false, color: '#ef4444' },
          ],
          assignments: [
            { id: 'a1', name: 'Практические семинары', maxScore: 30, earnedScore: null, completed: false, category: 'seminar' },
            { id: 'a2', name: 'Реферат / Презентация', maxScore: 20, earnedScore: null, completed: false, category: 'homework' },
            { id: 'a3', name: 'Итоговый дифференцированный зачёт', maxScore: 50, earnedScore: null, completed: false, category: 'exam' },
          ],
        },
      ],
    },
  },
];


/**
 * Converts a validated SubjectTemplate into ready-to-use Subject instances.
 */
export function instantiateSubjectsFromTemplate(template: SubjectTemplate): Subject[] {
  const timestamp = new Date().toISOString();

  if (template.isMulti && template.subjects) {
    return template.subjects.map((s, idx) => ({
      ...s,
      id: `subj_imported_${Date.now()}_${idx}`,
      createdAt: timestamp,
      updatedAt: timestamp,
      assignments: (s.assignments || []).map((a, aIdx) => ({
        ...a,
        id: `as_imp_${Date.now()}_${idx}_${aIdx}`,
      })),
    }));
  }

  if (template.subject) {
    const s = template.subject;
    return [
      {
        ...s,
        id: `subj_imported_${Date.now()}`,
        createdAt: timestamp,
        updatedAt: timestamp,
        assignments: (s.assignments || []).map((a, aIdx) => ({
          ...a,
          id: `as_imp_${Date.now()}_${aIdx}`,
        })),
      },
    ];
  }

  return [];
}
