import React, { useState } from 'react';
import { Subject, GradeScaleItem, Assignment } from '../types';
import {
  calculateSubjectStats,
  distributePointsOverAssignments,
  RUSSIAN_5_SCALE,
  ECTS_SCALE,
  PASS_FAIL_SCALE,
} from '../utils/calculator';
import { requestAiAdvice } from '../services/api';
import {
  ArrowLeft,
  Sparkles,
  Target,
  Sliders,
  CheckCircle,
  Plus,
  Trash2,
  Settings2,
  Bot,
  RefreshCw,
  HelpCircle,
  AlertCircle,
  Lightbulb,
  Share2,
  X,
} from 'lucide-react';

interface SubjectDetailViewProps {
  subject: Subject;
  onUpdate: (updated: Subject) => void;
  onBack: () => void;
  onShareTemplate?: (subject: Subject) => void;
}

export const SubjectDetailView: React.FC<SubjectDetailViewProps> = ({
  subject,
  onUpdate,
  onBack,
  onShareTemplate,
}) => {
  const [activeTab, setActiveTab] = useState<'calculator' | 'assignments' | 'scale' | 'ai'>('calculator');

  // AI Advisor state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [userQuestion, setUserQuestion] = useState('');

  // What-If interactive simulator state for remaining assignments
  const [whatIfScores, setWhatIfScores] = useState<Record<string, number>>({});

  // New assignment form state
  const [newAssignName, setNewAssignName] = useState('');
  const [newAssignMax, setNewAssignMax] = useState('20');
  const [newAssignDate, setNewAssignDate] = useState('');
  const [newAssignCategory, setNewAssignCategory] = useState<Assignment['category']>('test');
  const [showAddAssign, setShowAddAssign] = useState(false);

  // Calculate current real stats
  const stats = calculateSubjectStats(subject);
  const { targetAnalysis } = stats;

  // Custom target score input state (avoids pre-filling with 0 on smartphone)
  const [customScoreInput, setCustomScoreInput] = useState<string>(() =>
    subject.customTargetScore !== undefined ? String(subject.customTargetScore) : ''
  );

  React.useEffect(() => {
    if (subject.customTargetScore !== undefined) {
      setCustomScoreInput(String(subject.customTargetScore));
    } else {
      setCustomScoreInput('');
    }
  }, [subject.customTargetScore, subject.id]);

  // Handle changing target grade
  const handleSelectTargetGrade = (gradeId: string) => {
    setCustomScoreInput('');
    const updated: Subject = {
      ...subject,
      targetGradeId: gradeId,
      customTargetScore: undefined,
      updatedAt: new Date().toISOString(),
    };
    onUpdate(updated);
  };

  const handleCustomTargetScoreChange = (score: number) => {
    const clamped = Math.max(0, Math.min(subject.maxTotalPoints, score));
    const matchingGrade = subject.gradingScale.find(
      (g) => clamped >= g.minPoints && clamped <= g.maxPoints
    );
    const updated: Subject = {
      ...subject,
      customTargetScore: clamped,
      targetGradeId: matchingGrade?.id,
      updatedAt: new Date().toISOString(),
    };
    onUpdate(updated);
  };

  // Dedicated function to clear/reset target grade
  const handleClearTargetGrade = () => {
    setCustomScoreInput('');
    const updated: Subject = {
      ...subject,
      targetGradeId: undefined,
      customTargetScore: undefined,
      updatedAt: new Date().toISOString(),
    };
    onUpdate(updated);
  };

  // Custom grade management for this individual subject
  const handleAddCustomGrade = () => {
    const newGrade: GradeScaleItem = {
      id: `g_${Date.now()}`,
      name: 'Новая оценка',
      minPoints: Math.round(subject.maxTotalPoints * 0.6),
      maxPoints: subject.maxTotalPoints,
      isPassing: true,
      color: '#818cf8',
    };
    const updatedScale = [...subject.gradingScale, newGrade].sort((a, b) => b.minPoints - a.minPoints);
    onUpdate({
      ...subject,
      gradingScale: updatedScale,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleRemoveGrade = (gradeId: string) => {
    if (subject.gradingScale.length <= 1) return;
    const updatedScale = subject.gradingScale.filter((g) => g.id !== gradeId);
    const nextTargetId = subject.targetGradeId === gradeId ? updatedScale[0]?.id : subject.targetGradeId;
    onUpdate({
      ...subject,
      gradingScale: updatedScale,
      targetGradeId: nextTargetId,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleUpdateGradeThreshold = (gradeId: string, minPoints: number) => {
    const updatedScale = subject.gradingScale.map((g) => {
      if (g.id === gradeId) {
        return { ...g, minPoints };
      }
      return g;
    }).sort((a, b) => b.minPoints - a.minPoints);

    onUpdate({
      ...subject,
      gradingScale: updatedScale,
      updatedAt: new Date().toISOString(),
    });
  };

  // Toggle assignment completed / score update
  const handleToggleAssignmentCompleted = (id: string) => {
    const updatedAssignments = subject.assignments.map((a) => {
      if (a.id === id) {
        const nextCompleted = !a.completed;
        return {
          ...a,
          completed: nextCompleted,
          earnedScore: nextCompleted && (a.earnedScore === null || a.earnedScore === undefined)
            ? a.maxScore
            : a.earnedScore,
        };
      }
      return a;
    });

    onUpdate({
      ...subject,
      assignments: updatedAssignments,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleUpdateAssignmentScore = (id: string, score: number | null) => {
    const updatedAssignments = subject.assignments.map((a) => {
      if (a.id === id) {
        return {
          ...a,
          earnedScore: score,
          completed: score !== null && score !== undefined,
        };
      }
      return a;
    });

    onUpdate({
      ...subject,
      assignments: updatedAssignments,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleDeleteAssignment = (id: string) => {
    const updated = {
      ...subject,
      assignments: subject.assignments.filter((a) => a.id !== id),
      updatedAt: new Date().toISOString(),
    };
    onUpdate(updated);
  };

  const handleAddAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssignName.trim()) return;

    const newA: Assignment = {
      id: `as_${Date.now()}`,
      name: newAssignName.trim(),
      maxScore: Number(newAssignMax) || 10,
      earnedScore: null,
      completed: false,
      category: newAssignCategory,
      dueDate: newAssignDate || undefined,
    };

    onUpdate({
      ...subject,
      assignments: [...subject.assignments, newA],
      updatedAt: new Date().toISOString(),
    });

    setNewAssignName('');
    setNewAssignMax('20');
    setNewAssignDate('');
    setShowAddAssign(false);
  };

  // Call Gemini AI Advisor
  const handleAskAdvisor = async (customQ?: string) => {
    setAiLoading(true);
    const questionToAsk = customQ !== undefined ? customQ : userQuestion;

    const res = await requestAiAdvice({
      subjectName: subject.name,
      maxTotalPoints: subject.maxTotalPoints,
      currentPoints: stats.currentScore,
      targetGradeName: targetAnalysis.targetGrade?.name || `${targetAnalysis.targetScore} б.`,
      targetPoints: targetAnalysis.targetScore,
      remainingPossiblePoints: stats.remainingPoints,
      gradingScale: subject.gradingScale,
      assignments: subject.assignments,
      userQuestion: questionToAsk,
    });

    setAiLoading(false);
    if (res.advice) {
      setAiAdvice(res.advice);
    }
  };

  // Remaining assignments
  const remainingAssignments = subject.assignments.filter((a) => !a.completed);

  // Auto-distribution of needed points
  const autoDistribution = distributePointsOverAssignments(
    subject.assignments,
    targetAnalysis.neededPoints
  );

  // What-If simulated total score calculation
  const simulatedRemainingEarned = remainingAssignments.reduce((sum, a) => {
    const val = whatIfScores[a.id] !== undefined ? whatIfScores[a.id] : 0;
    return sum + Number(val);
  }, 0);
  const whatIfTotal = stats.currentScore + simulatedRemainingEarned;
  const isWhatIfTargetMet = whatIfTotal >= targetAnalysis.targetScore;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      {/* Top Navigation & Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-medium text-neutral-400 hover:text-white transition w-fit"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Ко всем предметам</span>
          </button>

          {onShareTemplate && (
            <button
              onClick={() => onShareTemplate(subject)}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900/90 px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:border-indigo-500/50 hover:bg-neutral-800 hover:text-indigo-300 transition"
              title="Поделиться шаблоном этого предмета (код или файл)"
            >
              <Share2 className="h-3.5 w-3.5 text-indigo-400" />
              <span>Поделиться шаблоном</span>
            </button>
          )}
        </div>

        {/* Tab switchers */}
        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-neutral-800 bg-neutral-900/90 p-1">
          <button
            onClick={() => setActiveTab('calculator')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === 'calculator'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Target className="h-3.5 w-3.5" />
            <span>Целевая оценка</span>
          </button>

          <button
            onClick={() => setActiveTab('assignments')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === 'assignments'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <CheckCircle className="h-3.5 w-3.5" />
            <span>Задания ({subject.assignments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === 'ai'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>AI-Советник</span>
          </button>

          <button
            onClick={() => setActiveTab('scale')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === 'scale'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Settings2 className="h-3.5 w-3.5" />
            <span>Шкала баллов</span>
          </button>
        </div>
      </div>

      {/* Main Subject Overview Banner */}
      <div className="rounded-2xl border border-neutral-800/80 bg-neutral-900/80 p-5 sm:p-6 backdrop-blur-md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                {subject.name}
              </h2>
              {subject.code && (
                <span className="font-mono text-xs text-neutral-400">
                  {subject.code}
                </span>
              )}
            </div>
            {subject.teacher && (
              <p className="mt-1 text-xs text-neutral-400">{subject.teacher}</p>
            )}
            {subject.notes && (
              <p className="mt-2 text-xs text-neutral-400 bg-neutral-950/60 p-2 rounded-lg border border-neutral-800/60">
                💡 {subject.notes}
              </p>
            )}
          </div>

          {/* Quick Score Capsule */}
          <div className="flex items-baseline gap-3 rounded-xl border border-neutral-800 bg-neutral-950/70 px-4 py-3 sm:text-right">
            <div>
              <div className="text-[11px] font-medium text-neutral-400">Текущий балл</div>
              <div className="font-mono text-2xl font-bold text-white">
                {stats.currentScore} <span className="text-sm font-normal text-neutral-500">/ {subject.maxTotalPoints}</span>
              </div>
            </div>
            <div className="border-l border-neutral-800 pl-3">
              <div className="text-[11px] font-medium text-neutral-400">Текущая отметка</div>
              <div className="text-base font-bold text-indigo-400">
                {stats.projectedGrade?.name || '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="mt-5">
          <div className="flex justify-between text-xs text-neutral-400 mb-1.5 font-medium">
            <span>Прогресс по семестру ({stats.currentPercentage}%)</span>
            <span>Осталось разыграть: {stats.remainingPoints} б.</span>
          </div>
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-neutral-800">
            {/* Target threshold indicator */}
            {targetAnalysis.targetScore > 0 && targetAnalysis.targetScore <= subject.maxTotalPoints && (
              <div
                className="absolute top-0 bottom-0 z-10 w-0.5 bg-amber-400"
                style={{ left: `${(targetAnalysis.targetScore / subject.maxTotalPoints) * 100}%` }}
                title={`Целевой порог: ${targetAnalysis.targetScore} б.`}
              />
            )}
            <div
              className={`h-full transition-all duration-300 ${
                targetAnalysis.isAchieved ? 'bg-emerald-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${Math.min(100, (stats.currentScore / subject.maxTotalPoints) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* TAB 1: CALCULATOR & TARGET GRADE SOLVER */}
      {activeTab === 'calculator' && (
        <div className="space-y-6">
          {/* Target Grade Selector Card */}
          <div className="rounded-2xl border border-neutral-800/80 bg-neutral-900/60 p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Target className="h-4 w-4 text-indigo-400" />
                  <span>Калькулятор целевой оценки</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Выберите желаемую оценку или укажите точный балл, чтобы рассчитать минимальные требования
                </p>
              </div>

              {/* Custom Score Direct Input & Reset Button */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-neutral-400">Или задайте балл:</span>
                <input
                  type="number"
                  min="0"
                  max={subject.maxTotalPoints}
                  step="0.5"
                  placeholder={String(targetAnalysis.targetScore)}
                  value={customScoreInput}
                  onFocus={(e) => e.target.select()}
                  onClick={(e) => e.currentTarget.select()}
                  onChange={(e) => {
                    let raw = e.target.value;
                    if (/^0\d/.test(raw)) raw = raw.replace(/^0+/, '');
                    setCustomScoreInput(raw);
                    const num = parseFloat(raw);
                    if (!isNaN(num)) {
                      handleCustomTargetScoreChange(num);
                    } else if (raw === '') {
                      handleClearTargetGrade();
                    }
                  }}
                  className="w-20 rounded-lg border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-center font-mono text-sm font-bold text-amber-300 focus:border-indigo-500 focus:outline-none"
                />
                <span className="text-xs text-neutral-500">из {subject.maxTotalPoints}</span>

                {/* Separate small button to remove/clear the target grade */}
                {(subject.targetGradeId || subject.customTargetScore !== undefined) && (
                  <button
                    type="button"
                    onClick={handleClearTargetGrade}
                    className="flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900/90 px-2.5 py-1 text-xs text-neutral-400 hover:border-neutral-700 hover:text-white transition active:scale-95"
                    title="Сбросить выбранную целевую оценку"
                  >
                    <X className="h-3 w-3 text-neutral-400" />
                    <span>Сбросить цель</span>
                  </button>
                )}
              </div>
            </div>

            {/* Subject Custom Max and Grade Thresholds Bar */}
            <div className="mt-3 pt-3 border-t border-neutral-800/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-neutral-950/40 p-3 rounded-xl">
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-300 font-medium">Максимум за этот предмет:</span>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  step="0.5"
                  value={subject.maxTotalPoints}
                  onFocus={(e) => e.target.select()}
                  onClick={(e) => e.currentTarget.select()}
                  onChange={(e) => {
                    let raw = e.target.value;
                    if (/^0\d/.test(raw)) raw = raw.replace(/^0+/, '');
                    const val = parseFloat(raw) || 0;
                    onUpdate({
                      ...subject,
                      maxTotalPoints: val,
                      updatedAt: new Date().toISOString(),
                    });
                  }}
                  className="w-20 rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1 text-center font-mono text-xs font-bold text-amber-300 focus:border-indigo-500 focus:outline-none"
                />
                <span className="text-xs text-neutral-400">б.</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddCustomGrade}
                  className="flex items-center gap-1 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 transition"
                  title="Добавить индивидуальную оценку для этого предмета"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Добавить оценку</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('scale')}
                  className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white underline underline-offset-2 ml-1"
                >
                  <span>Шкала оценок</span>
                </button>
              </div>
            </div>

            {/* Grade Scale Selector Buttons (Double click NO LONGER deletes grade) */}
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {subject.gradingScale.map((grade) => {
                const isSelected = targetAnalysis.targetGrade?.id === grade.id;
                return (
                  <div
                    key={grade.id}
                    onClick={() => handleSelectTargetGrade(grade.id)}
                    className={`group relative flex flex-col items-center justify-center rounded-xl border p-3 cursor-pointer select-none transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/15 text-white ring-1 ring-indigo-500/40 shadow-lg shadow-indigo-950/40'
                        : 'border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:border-neutral-700 hover:bg-neutral-900 hover:text-neutral-200'
                    }`}
                  >
                    <span className="text-sm font-bold text-white text-center">{grade.name}</span>

                    {/* Inline threshold edit */}
                    <div
                      className="mt-1 flex items-center gap-1 text-[11px] text-neutral-400"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span>от</span>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max={subject.maxTotalPoints}
                        value={grade.minPoints}
                        onFocus={(e) => e.target.select()}
                        onClick={(e) => e.currentTarget.select()}
                        onChange={(e) => {
                          let raw = e.target.value;
                          if (/^0\d/.test(raw)) raw = raw.replace(/^0+/, '');
                          handleUpdateGradeThreshold(grade.id, parseFloat(raw) || 0);
                        }}
                        className="w-14 rounded border border-neutral-700 bg-neutral-900 px-1 py-0.5 text-center font-mono text-[11px] font-bold text-amber-300 focus:border-indigo-500 focus:outline-none"
                      />
                      <span>б.</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mathematical Verdict Box */}
          <div className="rounded-2xl border border-neutral-800/80 bg-neutral-900/90 p-5 sm:p-6 shadow-xl shadow-indigo-950/10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    Математический расчёт для цели:
                  </span>
                  <span className="font-bold text-white">
                    «{targetAnalysis.targetGrade?.name || `${targetAnalysis.targetScore} б.`}» (порог {targetAnalysis.targetScore} б.)
                  </span>
                </div>

                <div className="mt-3">
                  {targetAnalysis.isAchieved ? (
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                        <CheckCircle className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="text-lg font-bold text-emerald-400">
                          Целевая отметка уже гарантирована! 🎉
                        </div>
                        <div className="text-xs text-neutral-400">
                          У вас {stats.currentScore} б. при необходимом минимуме {targetAnalysis.targetScore} б. (запас: +{(stats.currentScore - targetAnalysis.targetScore).toFixed(1)} б.).
                        </div>
                      </div>
                    </div>
                  ) : targetAnalysis.isImpossible ? (
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400">
                        <AlertCircle className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="text-lg font-bold text-rose-400">
                          Математически недостижимо в этом семестре
                        </div>
                        <div className="text-xs text-neutral-400">
                          Осталось всего {targetAnalysis.remainingPoints} б. Даже при 100% выполнении всех оставшихся работ максимум составит {(stats.currentScore + targetAnalysis.remainingPoints).toFixed(1)} б.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-neutral-400 text-sm">Необходимо набрать минимум:</span>
                        <span className="font-mono text-3xl font-extrabold text-amber-300">
                          {targetAnalysis.neededPoints}
                        </span>
                        <span className="text-sm font-semibold text-neutral-400">
                          баллов из {targetAnalysis.remainingPoints} оставшихся
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-neutral-400">
                        Это требует выполнения предстоящих работ минимум на{' '}
                        <strong className="text-indigo-400 font-mono text-sm">
                          {targetAnalysis.neededPercentOfRemaining}%
                        </strong>
                        .
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Feasibility Indicator */}
              <div className="flex flex-col sm:items-end">
                <span className="text-xs text-neutral-400 mb-1">Сложность достижения:</span>
                <span className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-bold ${targetAnalysis.feasibilityColor}`}>
                  {targetAnalysis.feasibilityLabel}
                </span>
              </div>
            </div>

            {/* Quick action to ask AI about this calculation */}
            <div className="mt-5 pt-4 border-t border-neutral-800/60 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-neutral-400 flex items-center gap-1">
                <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
                <span>Хотите получить разбор от нейросети с планом подготовки?</span>
              </span>
              <button
                onClick={() => {
                  setActiveTab('ai');
                  handleAskAdvisor(`Как мне набрать недостающие ${targetAnalysis.neededPoints} баллов для оценки ${targetAnalysis.targetGrade?.name}?`);
                }}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-600/30 transition"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                <span>Спросить AI-консультанта</span>
              </button>
            </div>
          </div>

          {/* Recommended Proportional Distribution */}
          {!targetAnalysis.isAchieved && !targetAnalysis.isImpossible && remainingAssignments.length > 0 && (
            <div className="rounded-2xl border border-neutral-800/80 bg-neutral-900/60 p-5 sm:p-6">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="h-4 w-4 text-indigo-400" />
                <span>Рекомендуемое математическое распределение по заданиям</span>
              </h4>
              <p className="text-xs text-neutral-400 mt-1">
                Для равномерной нагрузки на оставшихся контрольных точках ориентируйтесь на следующие баллы:
              </p>

              <div className="mt-4 space-y-3">
                {autoDistribution.map((item) => {
                  const assignment = subject.assignments.find((a) => a.id === item.assignmentId);
                  if (!assignment) return null;
                  return (
                    <div
                      key={item.assignmentId}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-neutral-800 bg-neutral-950/70 p-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">
                          {assignment.name}
                        </div>
                        {assignment.dueDate && (
                          <div className="text-[11px] text-sky-400 mt-0.5">
                            Дедлайн: {new Date(assignment.dueDate).toLocaleDateString('ru-RU')}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="font-mono text-sm font-bold text-amber-300">
                            {item.recommendedScore}
                          </span>
                          <span className="font-mono text-xs text-neutral-500"> / {item.maxScore} б.</span>
                        </div>
                        <span className="rounded-md bg-neutral-800 px-2 py-0.5 font-mono text-[11px] text-neutral-300">
                          {item.percentage}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Interactive What-If Simulator */}
          {remainingAssignments.length > 0 && (
            <div className="rounded-2xl border border-neutral-800/80 bg-neutral-900/60 p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-indigo-400" />
                    <span>Интерактивный симулятор «Что если?»</span>
                  </h4>
                  <p className="text-xs text-neutral-400 mt-1">
                    Подвигайте ползунки предполагаемых баллов за предстоящие работы, чтобы проверить итог
                  </p>
                </div>

                {/* Simulated result capsule */}
                <div className={`rounded-xl border px-3.5 py-2 text-right ${
                  isWhatIfTargetMet
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                }`}>
                  <div className="text-[11px] text-neutral-400">Прогнозируемый итог:</div>
                  <div className="font-mono text-lg font-bold">
                    {Math.round(whatIfTotal * 10) / 10} б.{' '}
                    <span className="text-xs font-semibold">
                      {isWhatIfTargetMet ? '— Цель достигнута! 🎯' : `(не хватает ${(targetAnalysis.targetScore - whatIfTotal).toFixed(1)} б.)`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {remainingAssignments.map((a) => {
                  const currentVal = whatIfScores[a.id] !== undefined ? whatIfScores[a.id] : 0;
                  return (
                    <div key={a.id} className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-3.5">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-medium text-white">{a.name}</span>
                        <div className="font-mono">
                          <span className="font-bold text-indigo-400">{currentVal}</span>
                          <span className="text-neutral-500"> / {a.maxScore} б.</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={a.maxScore}
                        step="0.5"
                        value={currentVal}
                        onChange={(e) =>
                          setWhatIfScores((prev) => ({
                            ...prev,
                            [a.id]: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ASSIGNMENTS & CONTROL POINTS */}
      {activeTab === 'assignments' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Контрольные точки и задания</h3>
              <p className="text-xs text-neutral-400">
                Отмечайте сданные работы, вводите баллы и синхронизируйте дедлайны с календарем
              </p>
            </div>
            <button
              onClick={() => setShowAddAssign(!showAddAssign)}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Добавить задание</span>
            </button>
          </div>

          {/* New Assignment Collapsible Form */}
          {showAddAssign && (
            <form
              onSubmit={handleAddAssignment}
              className="rounded-2xl border border-indigo-500/30 bg-neutral-900/90 p-4 space-y-4"
            >
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Новая контрольная точка
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Название задания</label>
                  <input
                    type="text"
                    required
                    placeholder="Например: Коллоквиум №2"
                    value={newAssignName}
                    onChange={(e) => setNewAssignName(e.target.value)}
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Максимальный балл</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.5"
                    placeholder="20"
                    value={newAssignMax}
                    onFocus={(e) => e.target.select()}
                    onClick={(e) => e.currentTarget.select()}
                    onChange={(e) => {
                      let raw = e.target.value;
                      if (/^0\d/.test(raw)) raw = raw.replace(/^0+/, '');
                      setNewAssignMax(raw);
                    }}
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Дедлайн (дата сдачи)</label>
                  <input
                    type="date"
                    value={newAssignDate}
                    onChange={(e) => setNewAssignDate(e.target.value)}
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1">Тип задания</label>
                  <select
                    value={newAssignCategory}
                    onChange={(e) => setNewAssignCategory(e.target.value as Assignment['category'])}
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="test">Контрольная / Тест</option>
                    <option value="lab">Лабораторная</option>
                    <option value="homework">ДЗ / Типовой расчет</option>
                    <option value="seminar">Семинар</option>
                    <option value="exam">Экзамен / Зачет</option>
                    <option value="other">Другое</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddAssign(false)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-white"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                >
                  Сохранить
                </button>
              </div>
            </form>
          )}

          {/* Assignments Table */}
          <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/60">
            <div className="divide-y divide-neutral-800">
              {subject.assignments.length === 0 ? (
                <div className="p-8 text-center text-sm text-neutral-500">
                  Нет добавленных контрольных точек. Нажмите «Добавить задание», чтобы внести лабораторные, тесты или экзамен.
                </div>
              ) : (
                subject.assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 transition ${
                      assignment.completed ? 'bg-neutral-950/40' : 'hover:bg-neutral-800/30'
                    }`}
                  >
                    {/* Status checkbox & details */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => handleToggleAssignmentCompleted(assignment.id)}
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
                          assignment.completed
                            ? 'border-emerald-500 bg-emerald-500 text-neutral-950'
                            : 'border-neutral-700 bg-neutral-900 hover:border-neutral-500'
                        }`}
                        title={assignment.completed ? 'Отметить как не сданное' : 'Отметить как сданное'}
                      >
                        {assignment.completed && <CheckCircle className="h-4 w-4 stroke-[3]" />}
                      </button>

                      <div className="min-w-0">
                        <div
                          className={`text-sm font-semibold truncate ${
                            assignment.completed ? 'text-neutral-400 line-through' : 'text-white'
                          }`}
                        >
                          {assignment.name}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-neutral-400">
                          {assignment.category && (
                            <span className="capitalize">{assignment.category}</span>
                          )}
                          {assignment.dueDate && (
                            <>
                              <span>·</span>
                              <span className="text-neutral-400">
                                Срок: {new Date(assignment.dueDate).toLocaleDateString('ru-RU')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Score input & actions */}
                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max={assignment.maxScore}
                          placeholder="—"
                          value={assignment.earnedScore !== null && assignment.earnedScore !== undefined ? assignment.earnedScore : ''}
                          onFocus={(e) => e.target.select()}
                          onClick={(e) => e.currentTarget.select()}
                          onChange={(e) => {
                            let raw = e.target.value;
                            if (/^0\d/.test(raw)) raw = raw.replace(/^0+/, '');
                            const val = raw === '' ? null : parseFloat(raw);
                            handleUpdateAssignmentScore(assignment.id, val);
                          }}
                          className="w-16 rounded-lg border border-neutral-700 bg-neutral-950 px-2 py-1 text-center font-mono text-xs font-bold text-white focus:border-indigo-500 focus:outline-none"
                        />
                        <span className="font-mono text-xs text-neutral-400">
                          / {assignment.maxScore} б.
                        </span>
                      </div>

                      {/* Delete Assignment */}
                      <button
                        onClick={() => handleDeleteAssignment(assignment.id)}
                        className="rounded-lg p-1.5 text-neutral-500 hover:bg-rose-500/10 hover:text-rose-400 transition"
                        title="Удалить задание"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: AI ADVISOR */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-neutral-800/80 bg-neutral-900/60 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/20">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Нейросетевой академический консультант
                </h3>
                <p className="text-xs text-neutral-400">
                  Математический анализ вашего положения по предмету «{subject.name}» и персональные рекомендации
                </p>
              </div>
            </div>

            {/* Quick prompt presets */}
            <div className="mt-4">
              <div className="text-xs text-neutral-400 mb-2">Быстрые запросы:</div>
              <div className="flex flex-wrap gap-2">
                {[
                  'Сколько баллов нужно до зачета или конкретной оценки?',
                  'Как распределить усилия по оставшимся заданиям?',
                  'Что будет, если я сдам экзамен на 60%?',
                  'Каков минимальный сценарий без пересдач?',
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setUserQuestion(q);
                      handleAskAdvisor(q);
                    }}
                    disabled={aiLoading}
                    className="rounded-lg border border-neutral-800 bg-neutral-950/70 px-3 py-1.5 text-xs text-neutral-300 hover:border-indigo-500/50 hover:bg-neutral-800 hover:text-white transition disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Question input */}
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={userQuestion}
                onChange={(e) => setUserQuestion(e.target.value)}
                placeholder="Задайте свой вопрос нейросети (например: «Смогу ли я закрыть предмет на 4, если пропустил коллоквиум?»)"
                className="flex-1 rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-2 text-xs text-white placeholder-neutral-500 focus:border-indigo-500 focus:outline-none"
              />
              <button
                onClick={() => handleAskAdvisor()}
                disabled={aiLoading}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition disabled:opacity-50"
              >
                {aiLoading ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Анализирую...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                    <span>Спросить</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* AI Response Box */}
          {aiAdvice && (
            <div className="rounded-2xl border border-indigo-500/20 bg-neutral-900/90 p-5 sm:p-6 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800 text-xs">
                <span className="font-semibold text-indigo-400 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <span>Ответ AI-консультанта</span>
                </span>
                <span className="text-neutral-500">Gemini 3.8 Flash</span>
              </div>
              <div className="prose prose-invert prose-sm max-w-none mt-4 text-xs leading-relaxed text-neutral-200 whitespace-pre-wrap">
                {aiAdvice}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: GRADING SCALE SETTINGS */}
      {activeTab === 'scale' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-neutral-800/80 bg-neutral-900/60 p-5 sm:p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-white">
                Настройки шкалы и максимума баллов
              </h3>
              <p className="text-xs text-neutral-400">
                Задайте максимальное количество баллов за предмет и промежутки для каждой оценки в вашем вузе
              </p>
            </div>

            {/* Max total points setting */}
            <div className="flex items-center gap-3 pt-2">
              <label className="text-xs font-medium text-neutral-300">
                Максимальный балл за предмет:
              </label>
              <input
                type="number"
                min="10"
                max="1000"
                value={subject.maxTotalPoints}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 100;
                  onUpdate({
                    ...subject,
                    maxTotalPoints: val,
                    updatedAt: new Date().toISOString(),
                  });
                }}
                className="w-24 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 font-mono text-xs font-bold text-white focus:border-indigo-500 focus:outline-none"
              />
              <span className="text-xs text-neutral-500">(обычно 100, 60 или 50)</span>
            </div>

            {/* Scale Presets Switcher */}
            <div className="pt-3">
              <span className="text-xs text-neutral-400 block mb-2">
                Загрузить типовой шаблон шкалы:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onUpdate({
                      ...subject,
                      gradingScale: RUSSIAN_5_SCALE,
                      targetGradeId: 'g5',
                      updatedAt: new Date().toISOString(),
                    })
                  }
                  className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-300 hover:border-neutral-700 hover:text-white"
                >
                  🇷🇺 5-балльная шкала (85/70/50)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdate({
                      ...subject,
                      gradingScale: PASS_FAIL_SCALE,
                      targetGradeId: 'pass',
                      updatedAt: new Date().toISOString(),
                    })
                  }
                  className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-300 hover:border-neutral-700 hover:text-white"
                >
                  📝 Зачёт / Незачёт (60+)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdate({
                      ...subject,
                      maxTotalPoints: 10,
                      gradingScale: [
                        { id: `s10_${Date.now()}`, name: '10 (Превосходно)', minPoints: 9.5, maxPoints: 10, isPassing: true, color: '#10b981' },
                        { id: `s9_${Date.now()}`, name: '9 (Отлично)', minPoints: 8.5, maxPoints: 9.49, isPassing: true, color: '#10b981' },
                        { id: `s8_${Date.now()}`, name: '8 (Почти отлично)', minPoints: 7.5, maxPoints: 8.49, isPassing: true, color: '#3b82f6' },
                        { id: `s7_${Date.now()}`, name: '7 (Очень хорошо)', minPoints: 6.5, maxPoints: 7.49, isPassing: true, color: '#3b82f6' },
                        { id: `s6_${Date.now()}`, name: '6 (Хорошо)', minPoints: 5.5, maxPoints: 6.49, isPassing: true, color: '#06b6d4' },
                        { id: `s5_${Date.now()}`, name: '5 (Удовлетворительно)', minPoints: 4.5, maxPoints: 5.49, isPassing: true, color: '#f59e0b' },
                        { id: `s4_${Date.now()}`, name: '4 (Достаточно)', minPoints: 3.5, maxPoints: 4.49, isPassing: true, color: '#f97316' },
                        { id: `s3_${Date.now()}`, name: '3 (Неудовлетворительно)', minPoints: 0, maxPoints: 3.49, isPassing: false, color: '#ef4444' },
                      ],
                      targetGradeId: `s8_${Date.now()}`,
                      updatedAt: new Date().toISOString(),
                    })
                  }
                  className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-300 hover:border-neutral-700 hover:text-white"
                >
                  🎓 10-балльная ВШЭ
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdate({
                      ...subject,
                      gradingScale: ECTS_SCALE,
                      targetGradeId: 'ecta_a',
                      updatedAt: new Date().toISOString(),
                    })
                  }
                  className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-300 hover:border-neutral-700 hover:text-white"
                >
                  🇪🇺 ECTS (A, B, C, D, E, F)
                </button>
              </div>
            </div>

            {/* Edit Scale Intervals Table */}
            <div className="pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Пороги и список оценок
                </h4>
                <button
                  type="button"
                  onClick={handleAddCustomGrade}
                  className="flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Добавить оценку</span>
                </button>
              </div>

              <div className="space-y-2">
                {subject.gradingScale.map((grade, idx) => (
                  <div
                    key={grade.id}
                    className="flex flex-wrap sm:flex-nowrap items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-950/70 p-3"
                  >
                    <input
                      type="text"
                      value={grade.name}
                      placeholder="Название оценки"
                      onChange={(e) => {
                        const newScale = [...subject.gradingScale];
                        newScale[idx] = { ...grade, name: e.target.value };
                        onUpdate({ ...subject, gradingScale: newScale });
                      }}
                      className="w-full sm:w-44 rounded-lg border border-neutral-700 bg-neutral-900 px-2.5 py-1 text-xs font-semibold text-white focus:outline-none"
                    />

                    <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                      <span>Мин:</span>
                      <input
                        type="number"
                        step="0.5"
                        value={grade.minPoints}
                        onChange={(e) => {
                          const newScale = [...subject.gradingScale];
                          newScale[idx] = { ...grade, minPoints: parseFloat(e.target.value) || 0 };
                          onUpdate({ ...subject, gradingScale: newScale });
                        }}
                        className="w-16 rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1 font-mono text-xs font-bold text-amber-300 focus:outline-none text-center"
                      />
                      <span>б.</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                      <span>Макс:</span>
                      <input
                        type="number"
                        step="0.5"
                        value={grade.maxPoints}
                        onChange={(e) => {
                          const newScale = [...subject.gradingScale];
                          newScale[idx] = { ...grade, maxPoints: parseFloat(e.target.value) || 0 };
                          onUpdate({ ...subject, gradingScale: newScale });
                        }}
                        className="w-16 rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1 font-mono text-xs text-white focus:outline-none text-center"
                      />
                      <span>б.</span>
                    </div>

                    <label className="flex items-center gap-1.5 text-xs text-neutral-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={grade.isPassing}
                        onChange={(e) => {
                          const newScale = [...subject.gradingScale];
                          newScale[idx] = { ...grade, isPassing: e.target.checked };
                          onUpdate({ ...subject, gradingScale: newScale });
                        }}
                        className="accent-indigo-500 rounded"
                      />
                      <span>Проходной</span>
                    </label>

                    {subject.gradingScale.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveGrade(grade.id)}
                        className="ml-auto rounded-lg p-1.5 text-neutral-500 hover:bg-rose-500/10 hover:text-rose-400 transition"
                        title="Удалить оценку"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
