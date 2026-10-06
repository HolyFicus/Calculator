import React, { useState, useRef, useEffect } from 'react';
import { User, X, GraduationCap, Heart } from 'lucide-react';

export const AuthorBadge: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="fixed bottom-3.5 right-3.5 z-40 select-none">
      {/* Popover Card */}
      {isOpen && (
        <div className="absolute bottom-11 right-0 mb-1 w-64 rounded-2xl border border-neutral-800 bg-neutral-900/95 p-4 shadow-2xl backdrop-blur-md animate-in fade-in-50 slide-in-from-bottom-2 duration-200">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                <GraduationCap className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                  Автор проекта
                </span>
                <h4 className="text-sm font-bold text-white">Дмитрий Боев</h4>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-800 hover:text-white transition"
              title="Закрыть"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-3 space-y-1.5 border-t border-neutral-800/80 pt-2.5 text-xs">
            <div className="flex items-center gap-1.5 text-neutral-300">
              <span className="text-neutral-500">•</span>
              <span>Студент <strong>НовГУ</strong> им. Ярослава Мудрого</span>
            </div>
            <div className="flex items-center gap-1.5 text-neutral-400 text-[11px]">
              <span className="text-neutral-500">•</span>
              <span>Исторический факультет (<strong>ИстФак</strong>)</span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-[10px] text-neutral-500 border-t border-neutral-800/60 pt-2">
            <span>Калькулятор оценок</span>
            <span className="flex items-center gap-1 text-indigo-400/80">
              <span>Сделано для студентов</span>
              <Heart className="h-2.5 w-2.5 fill-indigo-400/80" />
            </span>
          </div>
        </div>
      )}

      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-lg backdrop-blur-md transition-all active:scale-95 ${
          isOpen
            ? 'border-indigo-500 bg-indigo-600 text-white shadow-indigo-600/30'
            : 'border-neutral-800 bg-neutral-900/90 text-neutral-400 hover:border-neutral-700 hover:bg-neutral-800 hover:text-neutral-200'
        }`}
        title="Информация об авторе"
      >
        <User className={`h-3.5 w-3.5 ${isOpen ? 'text-white' : 'text-indigo-400'}`} />
        <span>Автор</span>
      </button>
    </div>
  );
};
