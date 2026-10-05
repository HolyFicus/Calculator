import React from 'react';
import { Subject } from '../types';
import { calculateSubjectStats } from '../utils/calculator';
import { ChevronRight, Trash2, Target, Share2, CheckCircle2 } from 'lucide-react';

interface SubjectCardProps {
  subject: Subject;
  onSelect: (subject: Subject) => void;
  onDelete: (id: string, name: string) => void;
  onShareTemplate?: (subject: Subject) => void;
}

export const SubjectCard: React.FC<SubjectCardProps> = ({
  subject,
  onSelect,
  onDelete,
  onShareTemplate,
}) => {
  const stats = calculateSubjectStats(subject);
  const { targetAnalysis } = stats;

  return (
    <div
      onClick={() => onSelect(subject)}
      className="group relative cursor-pointer rounded-2xl border border-neutral-800/80 bg-neutral-900/60 p-4 sm:p-5 transition-all duration-200 hover:border-neutral-700 hover:bg-neutral-900/90 hover:shadow-xl hover:shadow-indigo-950/20"
    >
      {/* Top Header: Title, Code, Share and Delete button */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-bold text-white group-hover:text-indigo-300 sm:text-lg transition-colors">
              {subject.name}
            </h3>
            {subject.code && (
              <span className="font-mono text-[11px] text-neutral-400">
                {subject.code}
              </span>
            )}
          </div>
          {subject.teacher && (
            <p className="mt-0.5 truncate text-xs text-neutral-400">
              {subject.teacher}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Share Subject Template Button */}
          {onShareTemplate && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShareTemplate(subject);
              }}
              className="rounded-lg p-1.5 text-neutral-500 opacity-60 transition hover:bg-indigo-500/10 hover:text-indigo-300 hover:opacity-100 focus:opacity-100"
              title="Поделиться шаблоном предмета (код или файл)"
            >
              <Share2 className="h-4 w-4" />
            </button>
          )}

          {/* Delete Subject Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(subject.id, subject.name);
            }}
            className="rounded-lg p-1.5 text-neutral-500 opacity-60 transition hover:bg-rose-500/10 hover:text-rose-400 hover:opacity-100 focus:opacity-100"
            title="Удалить предмет"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Score Progress Bar */}
      <div className="mt-4">
        <div className="flex items-baseline justify-between text-xs">
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-xl font-bold tracking-tight text-white">
              {stats.currentScore}
            </span>
            <span className="font-mono text-xs text-neutral-500">
              / {subject.maxTotalPoints} б.
            </span>
          </div>
          <span className="font-mono font-medium text-neutral-400">
            {stats.currentPercentage}%
          </span>
        </div>

        {/* Multi-layered progress bar: Current score vs Target threshold */}
        <div className="relative mt-2 h-2.5 w-full overflow-hidden rounded-full bg-neutral-800">
          {/* Target marker line */}
          {targetAnalysis.targetScore > 0 && targetAnalysis.targetScore <= subject.maxTotalPoints && (
            <div
              className="absolute top-0 bottom-0 z-10 w-0.5 bg-amber-400/80"
              style={{ left: `${(targetAnalysis.targetScore / subject.maxTotalPoints) * 100}%` }}
              title={`Целевой порог: ${targetAnalysis.targetScore} б.`}
            />
          )}

          {/* Current progress fill */}
          <div
            className={`h-full transition-all duration-300 ${
              targetAnalysis.isAchieved
                ? 'bg-emerald-500'
                : targetAnalysis.isImpossible
                ? 'bg-rose-500'
                : 'bg-indigo-500'
            }`}
            style={{ width: `${Math.min(100, (stats.currentScore / subject.maxTotalPoints) * 100)}%` }}
          />
        </div>
      </div>

      {/* Target Grade Status & Math Calculation */}
      <div className="mt-4 rounded-xl border border-neutral-800/80 bg-neutral-950/60 p-3">
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-neutral-400">
            <Target className="h-3.5 w-3.5 text-indigo-400" />
            <span>Цель:</span>
            <span className="font-semibold text-neutral-200">
              {targetAnalysis.targetGrade?.name || `${targetAnalysis.targetScore} б.`}
            </span>
          </div>

          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${targetAnalysis.feasibilityColor}`}>
            {targetAnalysis.feasibilityLabel}
          </span>
        </div>

        {/* Calculation Details */}
        <div className="mt-2 text-xs text-neutral-300">
          {targetAnalysis.isAchieved ? (
            <p className="text-emerald-400">
              Цель достигнута! Запас: +{(stats.currentScore - targetAnalysis.targetScore).toFixed(1)} б.
            </p>
          ) : targetAnalysis.isImpossible ? (
            <p className="text-rose-400">
              При 100% оставшихся работ максимум составит {(stats.currentScore + stats.remainingPoints).toFixed(1)} б.
            </p>
          ) : (
            <p className="flex items-center justify-between">
              <span className="text-neutral-400">Нужно набрать:</span>
              <span className="font-mono font-semibold text-amber-300">
                {targetAnalysis.neededPoints} б. из {targetAnalysis.remainingPoints} ({targetAnalysis.neededPercentOfRemaining}%)
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Footer: Progress & Open CTA */}
      <div className="mt-3 flex items-center justify-between text-xs text-neutral-400 pt-2 border-t border-neutral-800/50">
        <span className="text-[11px] text-neutral-400 flex items-center gap-1.5">
          {stats.completedCount === stats.totalAssignmentsCount && stats.totalAssignmentsCount > 0 ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400">Все задания сданы</span>
            </>
          ) : (
            <span>
              Сдано: <strong className="text-white">{stats.completedCount}</strong> из {stats.totalAssignmentsCount}
            </span>
          )}
        </span>

        <div className="flex items-center gap-0.5 text-indigo-400 font-medium group-hover:translate-x-0.5 transition-transform text-[11px]">
          <span>Открыть</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </div>
  );
};
