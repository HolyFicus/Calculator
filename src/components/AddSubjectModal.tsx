import React, { useState } from 'react';
import { Subject, GradeScaleItem } from '../types';
import { RUSSIAN_5_SCALE, ECTS_SCALE, PASS_FAIL_SCALE } from '../utils/calculator';
import { X, BookPlus, Plus, Trash2, SlidersHorizontal, Check, Share2, Upload } from 'lucide-react';

interface AddSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (newSubject: Subject) => void;
  onOpenTemplateImport?: () => void;
}

export const AddSubjectModal: React.FC<AddSubjectModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  onOpenTemplateImport,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [teacher, setTeacher] = useState('');
  const [maxPoints, setMaxPoints] = useState<number>(100);
  const [notes, setNotes] = useState('');

  // Individual custom grading scale for this specific subject
  const [customScale, setCustomScale] = useState<GradeScaleItem[]>([
    { id: 'g5', name: '5 (Отлично)', minPoints: 85, maxPoints: 100, isPassing: true, color: '#10b981' },
    { id: 'g4', name: '4 (Хорошо)', minPoints: 70, maxPoints: 84.99, isPassing: true, color: '#3b82f6' },
    { id: 'g3', name: '3 (Удовл.)', minPoints: 50, maxPoints: 69.99, isPassing: true, color: '#f59e0b' },
    { id: 'g2', name: '2 (Неуд.)', minPoints: 0, maxPoints: 49.99, isPassing: false, color: '#ef4444' },
  ]);

  if (!isOpen) return null;

  // Apply template helper
  const handleApplyTemplate = (type: 'russian' | 'passfail' | 'ects' | 'scale10') => {
    if (type === 'russian') {
      setMaxPoints(100);
      setCustomScale([
        { id: `g5_${Date.now()}`, name: '5 (Отлично)', minPoints: 85, maxPoints: 100, isPassing: true, color: '#10b981' },
        { id: `g4_${Date.now()}`, name: '4 (Хорошо)', minPoints: 70, maxPoints: 84.99, isPassing: true, color: '#3b82f6' },
        { id: `g3_${Date.now()}`, name: '3 (Удовл.)', minPoints: 50, maxPoints: 69.99, isPassing: true, color: '#f59e0b' },
        { id: `g2_${Date.now()}`, name: '2 (Неуд.)', minPoints: 0, maxPoints: 49.99, isPassing: false, color: '#ef4444' },
      ]);
    } else if (type === 'passfail') {
      setMaxPoints(100);
      setCustomScale([
        { id: `pass_${Date.now()}`, name: 'Зачёт', minPoints: 60, maxPoints: 100, isPassing: true, color: '#10b981' },
        { id: `fail_${Date.now()}`, name: 'Незачёт', minPoints: 0, maxPoints: 59.99, isPassing: false, color: '#ef4444' },
      ]);
    } else if (type === 'ects') {
      setMaxPoints(100);
      setCustomScale(ECTS_SCALE.map((g) => ({ ...g, id: `${g.id}_${Date.now()}` })));
    } else if (type === 'scale10') {
      setMaxPoints(10);
      setCustomScale([
        { id: `s10_${Date.now()}`, name: '10 (Превосходно)', minPoints: 9.5, maxPoints: 10, isPassing: true, color: '#10b981' },
        { id: `s9_${Date.now()}`, name: '9 (Отлично)', minPoints: 8.5, maxPoints: 9.49, isPassing: true, color: '#10b981' },
        { id: `s8_${Date.now()}`, name: '8 (Почти отлично)', minPoints: 7.5, maxPoints: 8.49, isPassing: true, color: '#3b82f6' },
        { id: `s7_${Date.now()}`, name: '7 (Очень хорошо)', minPoints: 6.5, maxPoints: 7.49, isPassing: true, color: '#3b82f6' },
        { id: `s6_${Date.now()}`, name: '6 (Хорошо)', minPoints: 5.5, maxPoints: 6.49, isPassing: true, color: '#06b6d4' },
        { id: `s5_${Date.now()}`, name: '5 (Удовлетворительно)', minPoints: 4.5, maxPoints: 5.49, isPassing: true, color: '#f59e0b' },
        { id: `s4_${Date.now()}`, name: '4 (Достаточно)', minPoints: 3.5, maxPoints: 4.49, isPassing: true, color: '#f97316' },
        { id: `s3_${Date.now()}`, name: '3 (Неудовлетворительно)', minPoints: 0, maxPoints: 3.49, isPassing: false, color: '#ef4444' },
      ]);
    }
  };

  const handleUpdateGradeItem = (idx: number, field: keyof GradeScaleItem, value: any) => {
    setCustomScale((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const handleAddGradeRow = () => {
    const newGrade: GradeScaleItem = {
      id: `custom_g_${Date.now()}`,
      name: 'Новая оценка',
      minPoints: Math.round(maxPoints * 0.5),
      maxPoints: maxPoints,
      isPassing: true,
      color: '#818cf8',
    };
    setCustomScale((prev) => [newGrade, ...prev]);
  };

  const handleRemoveGradeRow = (idx: number) => {
    if (customScale.length <= 1) return;
    setCustomScale((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Ensure sorted descending by minPoints
    const sortedScale = [...customScale].sort((a, b) => b.minPoints - a.minPoints);
    const defaultTargetId = sortedScale[0]?.id;

    const newSubj: Subject = {
      id: `subj_${Date.now()}`,
      name: name.trim(),
      code: code.trim() || undefined,
      teacher: teacher.trim() || undefined,
      maxTotalPoints: Number(maxPoints) || 100,
      gradingScale: sortedScale,
      targetGradeId: defaultTargetId,
      assignments: [
        {
          id: `as_${Date.now()}_1`,
          name: 'Семинары / Практические задания',
          maxScore: Math.round(Number(maxPoints) * 0.3 * 10) / 10,
          earnedScore: null,
          completed: false,
          category: 'seminar',
        },
        {
          id: `as_${Date.now()}_2`,
          name: 'Рубежный контроль / Контрольная работа',
          maxScore: Math.round(Number(maxPoints) * 0.3 * 10) / 10,
          earnedScore: null,
          completed: false,
          category: 'test',
        },
        {
          id: `as_${Date.now()}_3`,
          name: 'Итоговый экзамен / Зачет',
          maxScore: Math.round(Number(maxPoints) * 0.4 * 10) / 10,
          earnedScore: null,
          completed: false,
          category: 'exam',
        },
      ],
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onAdd(newSubj);
    setName('');
    setCode('');
    setTeacher('');
    setNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl border border-neutral-800 bg-neutral-900 p-5 sm:p-6 shadow-2xl my-8 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400">
              <BookPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Новый предмет</h3>
              <p className="text-xs text-neutral-400">Индивидуальные настройки баллов и шкалы вуза</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Quick import from template banner */}
        {onOpenTemplateImport && (
          <div className="mt-3 rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-indigo-400" />
              <span className="text-xs text-neutral-300">Есть код или файл шаблона от одногруппника?</span>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenTemplateImport();
              }}
              className="rounded-lg bg-indigo-600/80 hover:bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white transition"
            >
              Импортировать
            </button>
          </div>
        )}

        {/* Modal Scrollable Form */}
        <form onSubmit={handleSubmit} className="mt-3 flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Subject Name */}
          <div>
            <label className="text-xs font-semibold text-neutral-300 block mb-1">
              Название предмета *
            </label>
            <input
              type="text"
              required
              placeholder="Например: Высшая математика, Физика, Философия"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Teacher and Code */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1">
                Код предмета (необязательно)
              </label>
              <input
                type="text"
                placeholder="ВМ-101"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1">
                Преподаватель
              </label>
              <input
                type="text"
                placeholder="ФИО преподавателя"
                value={teacher}
                onChange={(e) => setTeacher(e.target.value)}
                className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* INDIVIDUAL MAX POINTS */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-3.5 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <label className="text-xs font-bold text-white block">
                  Максимальный балл за предмет:
                </label>
                <p className="text-[11px] text-neutral-400">
                  Укажите сколько максимум баллов можно набрать по этой дисциплине
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="10000"
                  step="0.5"
                  required
                  value={maxPoints}
                  onFocus={(e) => e.target.select()}
                  onClick={(e) => e.currentTarget.select()}
                  onChange={(e) => {
                    let raw = e.target.value;
                    if (/^0\d/.test(raw)) raw = raw.replace(/^0+/, '');
                    setMaxPoints(parseFloat(raw) || 0);
                  }}
                  className="w-24 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 font-mono text-sm font-bold text-amber-300 text-center focus:border-indigo-500 focus:outline-none"
                />
                <span className="text-xs text-neutral-400">баллов</span>
              </div>
            </div>
          </div>

          {/* INDIVIDUAL GRADING SCALE */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Шкала оценок и баллов для этого предмета</span>
                </h4>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Укажите названия оценок и точные баллы, с которых они начинаются
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddGradeRow}
                className="flex items-center gap-1 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-[11px] font-semibold text-indigo-300 hover:bg-indigo-500/20 transition"
              >
                <Plus className="h-3 w-3" />
                <span>Оценка</span>
              </button>
            </div>

            {/* Quick Template Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-neutral-500 mr-1">Быстрый шаблон:</span>
              <button
                type="button"
                onClick={() => handleApplyTemplate('russian')}
                className="rounded-md border border-neutral-800 bg-neutral-900 px-2 py-0.5 text-[10px] text-neutral-300 hover:border-neutral-700 hover:text-white"
              >
                5-балльная (85/70/50)
              </button>
              <button
                type="button"
                onClick={() => handleApplyTemplate('passfail')}
                className="rounded-md border border-neutral-800 bg-neutral-900 px-2 py-0.5 text-[10px] text-neutral-300 hover:border-neutral-700 hover:text-white"
              >
                Зачёт (60+)
              </button>
              <button
                type="button"
                onClick={() => handleApplyTemplate('scale10')}
                className="rounded-md border border-neutral-800 bg-neutral-900 px-2 py-0.5 text-[10px] text-neutral-300 hover:border-neutral-700 hover:text-white"
              >
                10-балльная ВШЭ
              </button>
              <button
                type="button"
                onClick={() => handleApplyTemplate('ects')}
                className="rounded-md border border-neutral-800 bg-neutral-900 px-2 py-0.5 text-[10px] text-neutral-300 hover:border-neutral-700 hover:text-white"
              >
                ECTS (A-F)
              </button>
            </div>

            {/* Custom Grade Items List */}
            <div className="space-y-2 pt-2">
              {customScale.map((grade, idx) => (
                <div
                  key={grade.id || idx}
                  className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/90 p-2 text-xs"
                >
                  <input
                    type="text"
                    required
                    placeholder="Название (напр. 5 или Зачет)"
                    value={grade.name}
                    onChange={(e) => handleUpdateGradeItem(idx, 'name', e.target.value)}
                    className="flex-1 min-w-[120px] rounded-lg border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs font-semibold text-white focus:outline-none"
                  />

                  <div className="flex items-center gap-1 text-neutral-400">
                    <span className="text-[11px]">от</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max={maxPoints}
                      required
                      value={grade.minPoints}
                      onFocus={(e) => e.target.select()}
                      onClick={(e) => e.currentTarget.select()}
                      onChange={(e) => {
                        let raw = e.target.value;
                        if (/^0\d/.test(raw)) raw = raw.replace(/^0+/, '');
                        handleUpdateGradeItem(idx, 'minPoints', parseFloat(raw) || 0);
                      }}
                      className="w-16 rounded-lg border border-neutral-700 bg-neutral-950 px-2 py-1 font-mono text-xs font-bold text-amber-300 text-center focus:outline-none"
                    />
                    <span className="text-[11px]">б.</span>
                  </div>

                  <label className="flex items-center gap-1 text-[11px] text-neutral-400 cursor-pointer ml-1">
                    <input
                      type="checkbox"
                      checked={grade.isPassing}
                      onChange={(e) => handleUpdateGradeItem(idx, 'isPassing', e.target.checked)}
                      className="accent-indigo-500 rounded"
                    />
                    <span className="hidden sm:inline">Сдан</span>
                  </label>

                  {customScale.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveGradeRow(idx)}
                      className="rounded p-1 text-neutral-500 hover:bg-rose-500/10 hover:text-rose-400 transition"
                      title="Удалить оценку"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-neutral-300 block mb-1">
              Примечание или условие автомата
            </label>
            <input
              type="text"
              placeholder="Например: Автомат при 85+ баллах без долгов по лабораториям"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition"
            >
              Сохранить предмет
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
