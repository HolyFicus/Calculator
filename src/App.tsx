/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Subject } from './types';
import { calculateSubjectStats } from './utils/calculator';

import { Header } from './components/Header';
import { StatsOverview } from './components/StatsOverview';
import { SubjectCard } from './components/SubjectCard';
import { SubjectDetailView } from './components/SubjectDetailView';
import { AddSubjectModal } from './components/AddSubjectModal';
import { TemplatesModal } from './components/TemplatesModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';

import { Search, Plus, Filter, BookOpen, Share2, Sparkles } from 'lucide-react';
import { RUSSIAN_5_SCALE } from './utils/calculator';
import { PRESETS_CONFIG } from './utils/templateManager';

const STORAGE_KEY_SUBJECTS = 'smart_grade_calc_subjects_clean_v1';

function sanitizeSubjects(items: unknown[]): Subject[] {
  if (!Array.isArray(items)) return [];
  return items.map((item: any, idx) => ({
    id: item?.id || `subj_${idx}_${Date.now()}`,
    name: item?.name || 'Дисциплина',
    code: item?.code || undefined,
    teacher: item?.teacher || undefined,
    maxTotalPoints: Number(item?.maxTotalPoints) || 100,
    gradingScale: Array.isArray(item?.gradingScale) && item.gradingScale.length > 0 ? item.gradingScale : RUSSIAN_5_SCALE,
    assignments: Array.isArray(item?.assignments)
      ? item.assignments.map((a: any, aIdx: number) => ({
          id: a?.id || `as_${idx}_${aIdx}`,
          name: a?.name || 'Задание',
          maxScore: Number(a?.maxScore) || 10,
          earnedScore: a?.earnedScore !== null && a?.earnedScore !== undefined ? Number(a.earnedScore) : null,
          completed: Boolean(a?.completed),
          category: a?.category || 'test',
          dueDate: a?.dueDate || undefined,
        }))
      : [],
    targetGradeId: item?.targetGradeId || 'g5',
    customTargetScore: item?.customTargetScore !== undefined ? Number(item.customTargetScore) : undefined,
    notes: item?.notes || undefined,
    createdAt: item?.createdAt || new Date().toISOString(),
    updatedAt: item?.updatedAt || new Date().toISOString(),
  }));
}

export default function App() {
  // Start with an empty list of subjects (no auto-generated demo subjects)
  const [subjects, setSubjects] = useState<Subject[]>(() => {
    try {
      // Clear legacy storage keys with demo subjects
      localStorage.removeItem('smart_grade_calc_subjects_v1');

      const saved = localStorage.getItem(STORAGE_KEY_SUBJECTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If previous data contained default demo keys, ignore them
          const isLegacyDemo = parsed.some(
            (p: any) => p?.id === 'subj_math_analysis' || p?.id === 'subj_programming'
          );
          if (!isLegacyDemo) {
            return sanitizeSubjects(parsed);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load subjects from localStorage:', e);
    }
    // Default: completely empty list
    return [];
  });

  // Active view: null means dashboard, non-null means subject detail
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'on_track' | 'at_risk' | 'completed'>('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [templatesModalTab, setTemplatesModalTab] = useState<'import' | 'presets' | 'share'>('import');
  const [templatesInitialSubjectId, setTemplatesInitialSubjectId] = useState<string | null>(null);
  const [templatesInitialCode, setTemplatesInitialCode] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleOpenTemplatesModal = (
    tab: 'import' | 'presets' | 'share' = 'import',
    subjectId?: string | null,
    code?: string | null
  ) => {
    setTemplatesModalTab(tab);
    setTemplatesInitialSubjectId(subjectId || null);
    setTemplatesInitialCode(code || null);
    setIsTemplatesModalOpen(true);
  };

  // Check URL on load for ?tpl=... (1-click direct link from a classmate)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const tpl = params.get('tpl');
      if (tpl) {
        handleOpenTemplatesModal('import', null, tpl);
        const cleanUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, '', cleanUrl);
      }
    } catch (e) {
      console.error('Failed to parse URL tpl parameter:', e);
    }
  }, []);

  const handleImportSubjects = (newItems: Subject[], mode: 'append' | 'replace') => {
    if (mode === 'replace') {
      setSubjects(newItems);
      if (newItems.length > 0) {
        setSelectedSubjectId(null);
      }
    } else {
      setSubjects((prev) => [...prev, ...newItems]);
    }
  };

  // Persist subjects to localStorage whenever changed
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SUBJECTS, JSON.stringify(subjects));
    } catch (e) {
      console.error('Failed to save subjects to localStorage:', e);
    }
  }, [subjects]);

  // Update a single subject
  const handleUpdateSubject = (updated: Subject) => {
    setSubjects((prev) =>
      prev.map((s) => (s.id === updated.id ? updated : s))
    );
  };

  // Add new subject
  const handleAddSubject = (newSubject: Subject) => {
    setSubjects((prev) => [newSubject, ...prev]);
    setSelectedSubjectId(newSubject.id);
  };

  // Delete subject
  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    setSubjects((prev) => prev.filter((s) => s.id !== deleteTarget.id));
    if (selectedSubjectId === deleteTarget.id) {
      setSelectedSubjectId(null);
    }
    setDeleteTarget(null);
  };

  // Filtered & searched subjects
  const filteredSubjects = useMemo(() => {
    return subjects.filter((subject) => {
      // Search text match
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        subject.name.toLowerCase().includes(query) ||
        (subject.code && subject.code.toLowerCase().includes(query)) ||
        (subject.teacher && subject.teacher.toLowerCase().includes(query));

      if (!matchesSearch) return false;

      // Filter status match
      const stats = calculateSubjectStats(subject);
      if (filterStatus === 'completed') {
        return stats.targetAnalysis.isAchieved;
      }
      if (filterStatus === 'at_risk') {
        return (
          stats.targetAnalysis.feasibility === 'challenging' ||
          stats.targetAnalysis.feasibility === 'impossible'
        );
      }
      if (filterStatus === 'on_track') {
        return (
          stats.targetAnalysis.feasibility === 'easy' ||
          stats.targetAnalysis.feasibility === 'moderate'
        );
      }

      return true;
    });
  }, [subjects, searchQuery, filterStatus]);

  // Selected subject object
  const activeSubject = useMemo(() => {
    if (!selectedSubjectId) return null;
    return subjects.find((s) => s.id === selectedSubjectId) || null;
  }, [subjects, selectedSubjectId]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Sleek Minimalist Header with Templates Button */}
      <Header
        onGoHome={() => setSelectedSubjectId(null)}
        onOpenTemplates={() => handleOpenTemplatesModal('import')}
        onAddSubject={() => setIsAddModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div
          key={selectedSubjectId || 'dashboard'}
          className="transition-all duration-300 ease-out animate-in fade-in-50 slide-in-from-bottom-2"
        >
          {activeSubject ? (
            // SUBJECT DETAIL VIEW & CALCULATOR
            <SubjectDetailView
              subject={activeSubject}
              onUpdate={handleUpdateSubject}
              onBack={() => setSelectedSubjectId(null)}
              onShareTemplate={(subj) => handleOpenTemplatesModal('share', subj.id)}
            />
          ) : subjects.length === 0 ? (
            // EMPTY WELCOME STATE (when user starts with no subjects)
            <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/30 p-10 sm:p-14 text-center max-w-xl mx-auto my-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 mx-auto mb-4 border border-indigo-500/20">
                <BookOpen className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-white">Список дисциплин пуст</h3>
              <p className="mt-2 text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-md mx-auto">
                Здесь пока нет ни одного предмета. Добавьте свою первую дисциплину или загрузите учебный план по коду от одногруппника.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition active:scale-95"
                >
                  <Plus className="h-4 w-4 stroke-[2.5]" />
                  <span>Добавить предмет</span>
                </button>
                <button
                  onClick={() => handleOpenTemplatesModal('import')}
                  className="inline-flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-xs sm:text-sm font-semibold text-neutral-200 hover:bg-neutral-800 hover:text-white transition active:scale-95"
                >
                  <Share2 className="h-4 w-4 text-indigo-400" />
                  <span>Загрузить по коду шаблона</span>
                </button>
              </div>
            </div>
          ) : (
            // DASHBOARD & SUBJECTS LIST
            <div className="space-y-6">
              {/* Academic Overall Status Cards */}
              <StatsOverview subjects={subjects} />

              {/* Controls Bar: Search & Status Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                {/* Search input */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                  <input
                    type="text"
                    placeholder="Поиск по названию предмета, коду или преподавателю..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-900/80 pl-10 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:border-indigo-500 focus:outline-none transition"
                  />
                </div>

                {/* Status filter buttons */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                  <Filter className="h-3.5 w-3.5 text-neutral-500 mr-1 hidden sm:block shrink-0" />
                  {[
                    { id: 'all', label: 'Все' },
                    { id: 'on_track', label: 'В процессе' },
                    { id: 'at_risk', label: 'Зона риска' },
                    { id: 'completed', label: 'Цель закрыта' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFilterStatus(f.id as typeof filterStatus)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                        filterStatus === f.id
                          ? 'bg-neutral-800 text-white border border-neutral-700'
                          : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                  {PRESETS_CONFIG.isEnabled() && (
                    <>
                      <div className="h-4 w-[1px] bg-neutral-800 mx-1 hidden sm:block" />
                      <button
                        onClick={() => handleOpenTemplatesModal('presets')}
                        className="flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900/90 px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:border-indigo-500/50 hover:bg-neutral-800 hover:text-indigo-300 whitespace-nowrap transition"
                        title="Каталог учебных программ"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                        <span>Каталог программ</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Subjects Grid */}
              {filteredSubjects.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/30 p-12 text-center">
                  <BookOpen className="mx-auto h-10 w-10 text-neutral-600 mb-3" />
                  <h3 className="text-base font-bold text-white">Предметы не найдены</h3>
                  <p className="mt-1 text-xs text-neutral-400 max-w-md mx-auto">
                    {searchQuery
                      ? 'Попробуйте изменить поисковый запрос или сбросить фильтры.'
                      : 'В списке пока нет подходящих дисциплин.'}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setFilterStatus('all');
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-800 transition"
                    >
                      <span>Сбросить поиск и фильтры</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredSubjects.map((subject) => (
                    <SubjectCard
                      key={subject.id}
                      subject={subject}
                      onSelect={(s) => setSelectedSubjectId(s.id)}
                      onDelete={(id, name) => setDeleteTarget({ id, name })}
                      onShareTemplate={(s) => handleOpenTemplatesModal('share', s.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* MODALS */}
      <AddSubjectModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddSubject}
        onOpenTemplateImport={() => handleOpenTemplatesModal('import')}
      />

      {/* Templates Hub Modal */}
      <TemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={() => {
          setIsTemplatesModalOpen(false);
          setTemplatesInitialCode(null);
        }}
        subjects={subjects}
        onImportSubjects={handleImportSubjects}
        initialTab={templatesModalTab}
        initialSubjectId={templatesInitialSubjectId}
        initialCode={templatesInitialCode}
      />

      <DeleteConfirmModal
        isOpen={deleteTarget !== null}
        subjectName={deleteTarget?.name || ''}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
