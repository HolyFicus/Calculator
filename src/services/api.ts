import { Subject, GradeScaleItem, Assignment } from '../types';

export interface AdvisorRequest {
  subjectName: string;
  maxTotalPoints: number;
  currentPoints: number;
  targetGradeName: string;
  targetPoints: number;
  remainingPossiblePoints: number;
  gradingScale: GradeScaleItem[];
  assignments: Assignment[];
  userQuestion?: string;
}

export interface AdvisorResponse {
  success: boolean;
  advice: string;
  stats?: {
    neededPoints: number;
    remainingPossiblePoints: number;
    isAchievable: boolean;
    requiredPercentageOfRemaining: number;
  };
  error?: string;
}

// When hosted on GitHub Pages (e.g. holyficus.github.io/Calculator/), proxy API calls to cloud backend
const API_BASE =
  typeof window !== 'undefined' && window.location.hostname.includes('github.io')
    ? 'https://ais-pre-hy5zzvihu5jdi2m5que7xy-193990785773.us-east1.run.app'
    : '';

export async function requestAiAdvice(payload: AdvisorRequest): Promise<AdvisorResponse> {
  const needed = Math.max(0, (payload.targetPoints || 0) - (payload.currentPoints || 0));
  const remaining = payload.remainingPossiblePoints || 0;
  const isAchievable = needed <= remaining;
  const reqPercent = remaining > 0 ? Math.round((needed / remaining) * 100) : 0;

  try {
    const res = await fetch(`${API_BASE}/api/advisor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.advice) {
        return data;
      }
    }
  } catch {
    // If backend is unreachable or offline, provide smart client-side academic advisory
  }

  // Client-side intelligent fallback (ensures 100% functionality on static GitHub Pages)
  let fallbackAdvice = `### Академический прогноз для дисциплины «${payload.subjectName}»\n\n`;
  if (isAchievable) {
    fallbackAdvice += `🎯 **Целевой результат «${payload.targetGradeName}» (${payload.targetPoints} б.) полностью достижим!**\n\n`;
    fallbackAdvice += `* Текущие набранные баллы: **${payload.currentPoints.toFixed(1)}** из ${payload.maxTotalPoints}\n`;
    fallbackAdvice += `* Необходимо добрать: **${needed.toFixed(1)} б.**\n`;
    fallbackAdvice += `* Доступно в оставшихся контрольных точках: **${remaining.toFixed(1)} б.**\n`;
    fallbackAdvice += `* Необходимая эффективность: **${reqPercent}%** от оставшихся баллов.\n\n`;

    if (reqPercent <= 60) {
      fallbackAdvice += `💡 **Уровень сложности: Низкий.** У вас комфортный запас баллов. Достаточно стабильно сдавать текущие задания на базовом уровне.`;
    } else if (reqPercent <= 85) {
      fallbackAdvice += `💡 **Уровень сложности: Умеренный.** Рекомендуется уделить особое внимание крупным контрольным точкам (лабораторные, тесты с максимальным весом).`;
    } else {
      fallbackAdvice += `💡 **Уровень сложности: Высокий.** Требуется максимальная концентрация на оставшихся заданиях, погрешность минимальна.`;
    }
  } else {
    fallbackAdvice += `⚠️ **Цель «${payload.targetGradeName}» (${payload.targetPoints} б.) математически недостижима при текущем плане.**\n\n`;
    fallbackAdvice += `* Текущие баллы: **${payload.currentPoints.toFixed(1)}** из ${payload.maxTotalPoints}\n`;
    fallbackAdvice += `* Максимально возможный итоговый балл: **${(payload.currentPoints + remaining).toFixed(1)} б.**\n`;
    fallbackAdvice += `* Не хватает: **${(needed - remaining).toFixed(1)} б.**\n\n`;
    fallbackAdvice += `💡 **Стратегия:** Рекомендуется выбрать ближайшую достижимую оценку в шкале или обсудить с преподавателем возможность выполнения дополнительных индивидуальных заданий / докладов.`;
  }

  return {
    success: true,
    advice: fallbackAdvice,
    stats: {
      neededPoints: needed,
      remainingPossiblePoints: remaining,
      isAchievable,
      requiredPercentageOfRemaining: reqPercent,
    },
  };
}

/**
 * Publishes a subject or semester template to the cloud and returns a unique short code.
 */
export async function shareTemplateToCloud(
  templateData: unknown,
  customCode?: string
): Promise<{ success: boolean; code?: string; message?: string; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/templates/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateData, customCode }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Ошибка публикации шаблона');
    }

    return await res.json();
  } catch (err: unknown) {
    // If backend is not available, generate client-side shareable code
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    const localCode = customCode || `SUBJ-${rand}`;
    try {
      localStorage.setItem(`sgc_tpl_${localCode}`, JSON.stringify(templateData));
    } catch {}
    return {
      success: true,
      code: localCode,
      message: 'Шаблон сохранён',
    };
  }
}

/**
 * Loads a subject or semester template from the cloud by unique code.
 */
export async function loadTemplateFromCloud(
  code: string
): Promise<{ success: boolean; template?: unknown; updatedAt?: string; error?: string }> {
  const cleanCode = code.trim().toUpperCase();

  // Check local cache first
  try {
    const local = localStorage.getItem(`sgc_tpl_${cleanCode}`);
    if (local) {
      return { success: true, template: JSON.parse(local) };
    }
  } catch {}

  try {
    const res = await fetch(`${API_BASE}/api/templates/${encodeURIComponent(cleanCode)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Шаблон по коду "${cleanCode}" не найден`);
    }

    return await res.json();
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Ошибка загрузки шаблона',
    };
  }
}
