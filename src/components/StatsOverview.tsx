import React from 'react';
import { Subject } from '../types';
import { calculateSubjectStats } from '../utils/calculator';
import { CheckCircle2, AlertTriangle, TrendingUp, BookOpen } from 'lucide-react';

interface StatsOverviewProps {
  subjects: Subject[];
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ subjects }) => {
  const total = subjects.length;

  let totalEarned = 0;
  let totalMax = 0;
  let achievedCount = 0;
  let atRiskCount = 0;

  subjects.forEach((s) => {
    const stats = calculateSubjectStats(s);
    totalEarned += stats.currentScore;
    totalMax += stats.maxPossibleTotal;
    if (stats.targetAnalysis.isAchieved) {
      achievedCount++;
    }
    if (stats.targetAnalysis.feasibility === 'challenging' || stats.targetAnalysis.feasibility === 'impossible') {
      atRiskCount++;
    }
  });

  const avgPercent = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {/* Total Subjects */}
      <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/50 p-3.5 sm:p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-neutral-400">Предметов</span>
          <BookOpen className="h-4 w-4 text-neutral-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="font-mono text-2xl font-bold tracking-tight text-white">{total}</span>
          <span className="text-xs text-neutral-500">дисциплин</span>
        </div>
      </div>

      {/* Average Completion / Progress */}
      <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/50 p-3.5 sm:p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-neutral-400">Средний балл</span>
          <TrendingUp className="h-4 w-4 text-indigo-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-mono text-2xl font-bold tracking-tight text-indigo-400">{avgPercent}%</span>
          <span className="font-mono text-xs text-neutral-400">
            {Math.round(totalEarned)} / {totalMax}
          </span>
        </div>
      </div>

      {/* Target Goals Achieved */}
      <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/50 p-3.5 sm:p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-neutral-400">Цели закрыты</span>
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="font-mono text-2xl font-bold tracking-tight text-emerald-400">{achievedCount}</span>
          <span className="text-xs text-neutral-500">из {total}</span>
        </div>
      </div>

      {/* Subjects at Risk */}
      <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/50 p-3.5 sm:p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-neutral-400">Зона риска</span>
          <AlertTriangle className={`h-4 w-4 ${atRiskCount > 0 ? 'text-amber-400' : 'text-neutral-500'}`} />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className={`font-mono text-2xl font-bold tracking-tight ${atRiskCount > 0 ? 'text-amber-400' : 'text-neutral-300'}`}>
            {atRiskCount}
          </span>
          <span className="text-xs text-neutral-500">{atRiskCount > 0 ? 'требуют внимания' : 'все под контролем'}</span>
        </div>
      </div>
    </div>
  );
};
