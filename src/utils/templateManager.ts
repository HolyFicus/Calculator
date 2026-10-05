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

/**
 * Compresses and encodes a SubjectTemplate into a URL-safe self-contained string.
 * Works 100% reliably on static hosts like GitHub Pages without any backend server!
 */
export async function encodeTemplateToUrlCode(template: SubjectTemplate): Promise<string> {
  const minified: any = {
    v: 1,
    t: template.title || 'Предмет',
    m: template.isMulti ? 1 : 0,
  };

  if (template.isMulti && Array.isArray(template.subjects)) {
    minified.s = template.subjects.map((s) => ({
      n: s.name,
      c: s.code,
      t: s.teacher,
      m: s.maxTotalPoints,
      g: (s.gradingScale || []).map((g) => ({ id: g.id, n: g.name, min: g.minPoints, p: g.isPassing ? 1 : 0 })),
      a: (s.assignments || []).map((a) => ({ n: a.name, m: a.maxScore, c: a.category, d: a.dueDate })),
    }));
  } else if (template.subject) {
    const s = template.subject;
    minified.s = [
      {
        n: s.name,
        c: s.code,
        t: s.teacher,
        m: s.maxTotalPoints,
        g: (s.gradingScale || []).map((g) => ({ id: g.id, n: g.name, min: g.minPoints, p: g.isPassing ? 1 : 0 })),
        a: (s.assignments || []).map((a) => ({ n: a.name, m: a.maxScore, c: a.category, d: a.dueDate })),
      },
    ];
  }

  const json = JSON.stringify(minified);

  // Modern browser compression with CompressionStream
  try {
    if (typeof CompressionStream !== 'undefined') {
      const cs = new CompressionStream('deflate-raw');
      const writer = cs.writable.getWriter();
      writer.write(new TextEncoder().encode(json));
      writer.close();
      const chunks: Uint8Array[] = [];
      const reader = cs.readable.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
      const total = new Uint8Array(totalLen);
      let off = 0;
      for (const c of chunks) {
        total.set(c, off);
        off += c.length;
      }
      let binary = '';
      for (let i = 0; i < total.byteLength; i++) {
        binary += String.fromCharCode(total[i]);
      }
      const b64 = btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      return `SUBJ-${b64}`;
    }
  } catch (e) {
    console.warn('CompressionStream fallback:', e);
  }

  // Fallback to base64url
  const utf8 = encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, p1) =>
    String.fromCharCode(parseInt(p1, 16))
  );
  const b64 = btoa(utf8)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `SUBJ-${b64}`;
}

/**
 * Decodes a SubjectTemplate from a share code, URL or encoded string.
 */
export async function decodeTemplateFromUrlCode(input: string): Promise<SubjectTemplate | null> {
  if (!input || typeof input !== 'string') return null;

  let raw = input.trim();

  // If user pasted a full URL (e.g. https://.../?tpl=SUBJ-...)
  if (raw.includes('tpl=')) {
    try {
      const url = new URL(raw, 'https://dummy.org');
      const param = url.searchParams.get('tpl');
      if (param) raw = param.trim();
    } catch {
      const match = raw.match(/[?&]tpl=([^&]+)/);
      if (match && match[1]) {
        raw = decodeURIComponent(match[1]).trim();
      }
    }
  }

  // Strip known prefixes
  const payload = raw.replace(/^SUBJ-|^PLAN-|^TPL-/, '').trim();
  if (!payload) return null;

  // Restore base64 padding
  let b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) {
    b64 += '=';
  }

  let jsonStr = '';

  // Try DecompressionStream
  try {
    if (typeof DecompressionStream !== 'undefined') {
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const ds = new DecompressionStream('deflate-raw');
      const writer = ds.writable.getWriter();
      writer.write(bytes);
      writer.close();
      const chunks: Uint8Array[] = [];
      const reader = ds.readable.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
      const total = new Uint8Array(totalLen);
      let off = 0;
      for (const c of chunks) {
        total.set(c, off);
        off += c.length;
      }
      jsonStr = new TextDecoder().decode(total);
    }
  } catch {
    // If not deflated, try raw base64 decode
    try {
      const binary = atob(b64);
      jsonStr = decodeURIComponent(
        Array.from(binary)
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
    } catch {}
  }

  if (!jsonStr) {
    try {
      const binary = atob(b64);
      jsonStr = decodeURIComponent(
        Array.from(binary)
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
    } catch {}
  }

  if (!jsonStr) return null;

  try {
    const data = JSON.parse(jsonStr);

    // If minified format
    if (data && data.s && Array.isArray(data.s)) {
      const subjects: any[] = data.s.map((s: any) => ({
        name: s.n || 'Предмет',
        code: s.c || undefined,
        teacher: s.t || undefined,
        maxTotalPoints: Number(s.m) || 100,
        gradingScale: Array.isArray(s.g)
          ? s.g.map((g: any) => ({
              id: g.id || `g_${Date.now()}`,
              name: g.n || 'Оценка',
              minPoints: Number(g.min) || 0,
              maxPoints: Number(s.m) || 100,
              isPassing: g.p !== 0,
            }))
          : [],
        assignments: Array.isArray(s.a)
          ? s.a.map((a: any, aIdx: number) => ({
              id: `as_${Date.now()}_${aIdx}`,
              name: a.n || 'Задание',
              maxScore: Number(a.m) || 10,
              earnedScore: null,
              completed: false,
              category: a.c || 'test',
              dueDate: a.d || undefined,
            }))
          : [],
      }));

      if (data.m && subjects.length > 1) {
        return {
          format: 'smart_grade_template_v1',
          exportedAt: new Date().toISOString(),
          title: data.t || 'Учебный семестр',
          isMulti: true,
          subjects,
        };
      } else {
        const single = subjects[0];
        return {
          format: 'smart_grade_template_v1',
          exportedAt: new Date().toISOString(),
          title: single.name,
          isMulti: false,
          subject: single,
        };
      }
    }

    const validated = validateAndParseTemplate(data);
    if (validated.valid && validated.template) {
      return validated.template;
    }
  } catch (e) {
    console.error('Failed to parse decoded template JSON:', e);
  }

  return null;
}

/**
 * Builds the direct 1-click shareable URL for classmates.
 */
export function generateShareableLink(code: string): string {
  if (typeof window === 'undefined') return code;
  const baseUrl = `${window.location.origin}${window.location.pathname}`.replace(/\/+$/, '');
  return `${baseUrl}?tpl=${encodeURIComponent(code)}`;
}
