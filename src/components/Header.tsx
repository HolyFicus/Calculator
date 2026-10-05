import React from 'react';
import { Calculator, Plus, Share2 } from 'lucide-react';

interface HeaderProps {
  onOpenTemplates: () => void;
  onAddSubject: () => void;
  onGoHome?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenTemplates,
  onAddSubject,
  onGoHome,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-800/80 bg-neutral-950/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand / Title - Click returns to start menu */}
        <div
          onClick={onGoHome}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onGoHome?.();
            }
          }}
          className="flex items-center gap-3 cursor-pointer group select-none transition-transform duration-300 ease-out active:scale-95"
          title="Вернуться в начальное меню"
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              onGoHome?.();
            }}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-lg shadow-indigo-500/20 transition-all duration-300 ease-out group-hover:scale-110 group-hover:shadow-indigo-500/40 group-hover:-rotate-3 group-active:scale-95 ring-1 ring-white/10 group-hover:ring-indigo-400/50"
          >
            <Calculator className="h-5 w-5 transition-transform duration-300 group-hover:scale-105" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white sm:text-lg transition-colors duration-200 group-hover:text-indigo-200">
                Калькулятор оценок
              </h1>
              <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/20 transition-colors group-hover:bg-indigo-500/20">
                AI + Шаблоны
              </span>
            </div>
            <p className="text-xs text-neutral-400 hidden sm:block transition-colors group-hover:text-neutral-300">
              Математический прогноз, целевые баллы и обмен учебными планами
            </p>
          </div>
        </div>

        {/* Minimalist Action Controls */}
        <div className="flex items-center gap-2">
          {/* Templates Hub Button */}
          <button
            onClick={onOpenTemplates}
            className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900/90 px-3.5 py-2 text-xs font-medium text-neutral-200 hover:border-indigo-500/50 hover:bg-neutral-800 hover:text-white transition shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            title="Шаблоны предметов: загрузка по коду и обмен с группой"
          >
            <Share2 className="h-3.5 w-3.5 text-indigo-400" />
            <span>Шаблоны</span>
          </button>

          {/* Add Subject Button */}
          <button
            onClick={onAddSubject}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-600/30 transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Добавить</span>
          </button>
        </div>
      </div>
    </header>
  );
};
