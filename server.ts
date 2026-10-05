import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: '10mb' }));

// Cloud sync file persistence directory
const DATA_DIR = path.resolve(__dirname, 'data');
const SYNC_FILE = path.resolve(DATA_DIR, 'cloud_sync.json');

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create data directory:', err);
  }
}

// In-memory store backed by file
const syncStore = new Map<string, { data: unknown; updatedAt: string }>();

// Load existing sync data if present
if (fs.existsSync(SYNC_FILE)) {
  try {
    const raw = fs.readFileSync(SYNC_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    for (const [k, v] of Object.entries(parsed)) {
      syncStore.set(k, v as { data: unknown; updatedAt: string });
    }
    console.log(`Loaded ${syncStore.size} records from cloud_sync.json`);
  } catch (err) {
    console.error('Error reading cloud_sync.json:', err);
  }
}

function persistSyncStore() {
  try {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of syncStore.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(SYNC_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving to cloud_sync.json:', err);
  }
}

// Gemini AI Client initialization (gemini-api skill standard)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Endpoint: AI Advisor for grade analysis & forecasting
app.post('/api/advisor', async (req, res) => {
  try {
    const {
      subjectName,
      maxTotalPoints,
      currentPoints,
      targetGradeName,
      targetPoints,
      remainingPossiblePoints,
      gradingScale,
      assignments,
      userQuestion,
    } = req.body;

    const neededPoints = Math.max(0, (targetPoints || 0) - (currentPoints || 0));
    const isAchievable = neededPoints <= (remainingPossiblePoints || 0);

    const systemInstruction = `Ты — профессиональный академический наставник и математический консультант для студентов.
Твоя задача — точно и понятно рассчитывать раскладку баллов, давать математически выверенные советы и практические рекомендации для достижения целевой оценки или зачёта.
Отвечай всегда на русском языке. Будь дружелюбным, мотивирующим, предельно точным в математических расчётах и прагматичным.
Всегда приводи конкретные цифры: сколько баллов нужно набрать, какой процент от оставшихся заданий требуется выполнить, и как распределить усилия.`;

    const prompt = `Проанализируй академическую ситуацию студента и дай математический прогноз и совет:

Предмет: ${subjectName || 'Не указан'}
Максимальный балл за предмет: ${maxTotalPoints}
Текущие набранные баллы: ${currentPoints} (из ${(maxTotalPoints - remainingPossiblePoints).toFixed(1)} возможных на данный момент)
Осталось разыграть баллов: ${remainingPossiblePoints}

Целевая оценка: "${targetGradeName}" (порог: ${targetPoints} баллов)
Необходимо набрать минимум: ${neededPoints.toFixed(1)} баллов из оставшихся ${remainingPossiblePoints}
Математическая достижимость: ${isAchievable ? 'Достижимо' : 'Математически недостижимо при текущих максимумах'}

Шкала оценок в заведении студента:
${JSON.stringify(gradingScale, null, 2)}

Список контрольных точек и заданий:
${JSON.stringify(assignments, null, 2)}

${userQuestion ? `Вопрос студента: "${userQuestion}"` : 'Запрос студента: Сколько баллов нужно для достижения цели, как распределить усилия и какой оптимальный план сдачи?'}

Верни развёрнутый, структурированный и понятный ответ в формате Markdown со следующими разделами:
1. 🎯 **Математический итог**: четкий вердикт (сколько баллов нужно, какой это % от оставшихся).
2. 📋 **Пошаговый план по заданиям**: конкретная стратегия по предстоящим контрольным точкам (сколько баллов взять на каждом задании).
3. ⚠️ **Зона риска и запас прочности**: что будет, если на каком-то этапе потерять баллы, и как подстраховаться.
4. 💡 **Практический совет студенту**: мотивационный и продуктивный совет по подготовке.`;

    let advice = '';
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });
      advice = response.text || '';
    } catch (genErr) {
      console.warn('Gemini 3.8 Flash temporary issue, generating mathematical advisor report:', genErr);
      
      const percentReq = remainingPossiblePoints > 0 ? Math.round((neededPoints / remainingPossiblePoints) * 100) : 0;
      const statusTitle = neededPoints === 0
        ? 'Цель уже закрыта с запасом!'
        : isAchievable
        ? `Нужно набрать ${neededPoints.toFixed(1)} б. из ${remainingPossiblePoints} оставшихся (${percentReq}%)`
        : 'Математически недостижимо при текущих максимумах';

      advice = `### 🎯 Математический итог
**${statusTitle}**
- Предмет: **${subjectName || 'Дисциплина'}**
- Текущий накопленный балл: **${currentPoints}** из **${maxTotalPoints}**
- Целевая оценка: **«${targetGradeName}»** (порог: **${targetPoints}** б.)
${neededPoints > 0 ? `- Для достижения цели требуется взять минимум **${percentReq}%** от всех оставшихся баллов.` : '- У вас уже есть необходимый балл для этой отметки!'}

### 📋 Рекомендуемый план по заданиям
${assignments && assignments.filter((a: any) => !a.completed).length > 0
  ? assignments.filter((a: any) => !a.completed).map((a: any) => {
      const rec = Math.min(a.maxScore, Math.ceil(a.maxScore * (percentReq / 100) * 10) / 10);
      return `- **${a.name}** (макс. ${a.maxScore} б.): цель **${rec} б.** (${percentReq}%)`;
    }).join('\n')
  : '- Все задания в списке уже сданы.'}

### ⚠️ Зона риска и запас прочности
${percentReq > 80
  ? 'Критическая зона: требуется очень высокая точность выполнения (более 80%). Ошибка на экзамене может снизить итоговую отметку на один уровень.'
  : percentReq > 50
  ? 'Умеренная нагрузка: у вас есть право на небольшие недочеты, но важно стабильно сдать экзаменационную часть.'
  : 'Комфортная зона: запас баллов позволяет получить оценку даже при средних результатах на оставшихся заданиях.'}

### 💡 Практический совет студенту
${userQuestion ? `Относительно вашего вопроса «${userQuestion}»: ` : ''}Сфокусируйтесь в первую очередь на контрольных точках с наибольшим весом в баллах. Регулярная сдача лабораторных в срок позволит не потерять штрафные баллы.`;
    }

    res.json({
      success: true,
      advice,
      stats: {
        neededPoints,
        remainingPossiblePoints,
        isAchievable,
        requiredPercentageOfRemaining: remainingPossiblePoints > 0
          ? Math.min(100, Math.round((neededPoints / remainingPossiblePoints) * 100))
          : 0,
      },
    });
  } catch (err: unknown) {
    console.error('Gemini advisor error:', err);
    const message = err instanceof Error ? err.message : 'Unknown AI error';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

// Endpoint: Save cloud sync data
app.post('/api/sync/save', (req, res) => {
  try {
    const { syncId, data } = req.body;
    if (!syncId || typeof syncId !== 'string') {
      return res.status(400).json({ error: 'Sync ID is required' });
    }
    const cleanId = syncId.trim().toUpperCase();
    const payload = {
      data,
      updatedAt: new Date().toISOString(),
    };
    syncStore.set(cleanId, payload);
    persistSyncStore();

    res.json({
      success: true,
      syncId: cleanId,
      updatedAt: payload.updatedAt,
      message: 'Данные успешно синхронизированы в облаке',
    });
  } catch (err) {
    console.error('Sync save error:', err);
    res.status(500).json({ error: 'Internal server error during sync' });
  }
});

// Endpoint: Load cloud sync data
app.get('/api/sync/load/:syncId', (req, res) => {
  try {
    const cleanId = req.params.syncId.trim().toUpperCase();
    const entry = syncStore.get(cleanId);
    if (!entry) {
      return res.status(404).json({
        success: false,
        error: `Облачные данные для кода "${cleanId}" не найдены. Проверьте правильность кода.`,
      });
    }

    res.json({
      success: true,
      syncId: cleanId,
      data: entry.data,
      updatedAt: entry.updatedAt,
    });
  } catch (err) {
    console.error('Sync load error:', err);
    res.status(500).json({ error: 'Internal server error during sync load' });
  }
});

// Endpoint: Generate a random sync code
app.get('/api/sync/new-code', (_req, res) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  res.json({ syncId: `STUDENT-${code}` });
});

// Endpoint: Share a Subject Template or Semester Template via Unique Code
app.post('/api/templates/share', (req, res) => {
  try {
    const { templateData, customCode } = req.body;
    if (!templateData) {
      return res.status(400).json({ error: 'Template data is required' });
    }

    let code = customCode ? String(customCode).trim().toUpperCase() : '';
    if (!code) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let rand = '';
      for (let i = 0; i < 6; i++) {
        rand += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const prefix = templateData.isMulti ? 'PLAN' : 'SUBJ';
      code = `${prefix}-${rand}`;
    }

    const payload = {
      data: templateData,
      isTemplate: true,
      updatedAt: new Date().toISOString(),
    };

    syncStore.set(code, payload);
    persistSyncStore();

    res.json({
      success: true,
      code,
      message: 'Шаблон успешно опубликован в облаке',
    });
  } catch (err) {
    console.error('Template share error:', err);
    res.status(500).json({ error: 'Internal server error during template share' });
  }
});

// Endpoint: Load a Subject Template by Unique Code
app.get('/api/templates/:code', (req, res) => {
  try {
    const cleanCode = req.params.code.trim().toUpperCase();
    const entry = syncStore.get(cleanCode);
    if (!entry) {
      return res.status(404).json({
        success: false,
        error: `Шаблон по коду "${cleanCode}" не найден. Проверьте правильность кода.`,
      });
    }

    res.json({
      success: true,
      code: cleanCode,
      template: entry.data,
      updatedAt: entry.updatedAt,
    });
  } catch (err) {
    console.error('Template load error:', err);
    res.status(500).json({ error: 'Internal server error during template load' });
  }
});

// Setup Vite middleware in Dev, or serve static dist in Production
const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  const http = await import('http');
  const server = http.createServer(app);

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true' ? { server } : false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Serve transformed index.html for all non-API GET requests in dev
    app.use('*', async (req, res, next) => {
      if (req.method !== 'GET' || req.originalUrl.startsWith('/api')) {
        return next();
      }
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Smart Grade Calculator Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
