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

export async function requestAiAdvice(payload: AdvisorRequest): Promise<AdvisorResponse> {
  try {
    const res = await fetch('/api/advisor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error ${res.status}`);
    }

    return await res.json();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Ошибка связи с сервером AI';
    return {
      success: false,
      advice: `Не удалось связаться с нейросетью: ${message}. Вы можете использовать математический калькулятор целей ниже.`,
      error: message,
    };
  }
}

export async function saveToCloudSync(syncId: string, data: unknown): Promise<{ success: boolean; updatedAt?: string; error?: string }> {
  try {
    const res = await fetch('/api/sync/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ syncId, data }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Ошибка синхронизации');
    }

    return await res.json();
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Неизвестная ошибка сохранения в облако',
    };
  }
}

export async function loadFromCloudSync(syncId: string): Promise<{ success: boolean; data?: unknown; updatedAt?: string; error?: string }> {
  try {
    const res = await fetch(`/api/sync/load/${encodeURIComponent(syncId)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Данные не найдены');
    }

    return await res.json();
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Ошибка загрузки из облака',
    };
  }
}

export async function fetchNewSyncCode(): Promise<string> {
  try {
    const res = await fetch('/api/sync/new-code');
    if (res.ok) {
      const json = await res.json();
      return json.syncId;
    }
  } catch {
    // fallback
  }
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 6; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `STUDENT-${rand}`;
}

/**
 * Publishes a subject or semester template to the cloud and returns a unique short code.
 */
export async function shareTemplateToCloud(
  templateData: unknown,
  customCode?: string
): Promise<{ success: boolean; code?: string; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/templates/share', {
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
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Неизвестная ошибка публикации',
    };
  }
}

/**
 * Loads a subject or semester template from the cloud by unique code.
 */
export async function loadTemplateFromCloud(
  code: string
): Promise<{ success: boolean; template?: unknown; updatedAt?: string; error?: string }> {
  try {
    const res = await fetch(`/api/templates/${encodeURIComponent(code.trim())}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Шаблон по коду "${code}" не найден`);
    }

    return await res.json();
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Ошибка загрузки шаблона',
    };
  }
}

