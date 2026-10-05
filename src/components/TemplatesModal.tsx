import React, { useState, useEffect } from 'react';
import { Subject, SubjectTemplate } from '../types';
import {
  createSubjectTemplate,
  createSemesterTemplate,
  validateAndParseTemplate,
  instantiateSubjectsFromTemplate,
  ACADEMIC_PRESET_TEMPLATES,
  AcademicPreset,
  PRESETS_CONFIG,
} from '../utils/templateManager';
import {
  shareTemplateToCloud,
  loadTemplateFromCloud,
} from '../services/api';
import {
  Share2,
  Copy,
  Check,
  Download,
  Upload,
  RefreshCw,
  X,
  Sparkles,
  AlertCircle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  onImportSubjects: (newSubjects: Subject[], mode: 'append' | 'replace') => void;
  initialTab?: 'import' | 'presets' | 'share';
  initialSubjectId?: string | null;
}

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  isOpen,
  onClose,
  subjects,
  onImportSubjects,
  initialTab = 'import',
  initialSubjectId,
}) => {
  // Check if curated presets catalog is enabled (hidden by default, toggleable for user)
  const [isPresetsEnabled, setIsPresetsEnabled] = useState<boolean>(() => PRESETS_CONFIG.isEnabled());
  const [activeTab, setActiveTab] = useState<'import' | 'presets' | 'share'>(() => {
    if (initialTab === 'presets' && !PRESETS_CONFIG.isEnabled()) {
      return 'import';
    }
    return initialTab;
  });

  // Template Code input for importing
  const [templateCodeInput, setTemplateCodeInput] = useState('');
  const [isLoadingCode, setIsLoadingCode] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; error?: boolean } | null>(null);

  // Template preview loaded via code
  const [previewTemplate, setPreviewTemplate] = useState<SubjectTemplate | null>(null);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');

  // Share tab state
  const [exportScope, setExportScope] = useState<'single' | 'all'>(
    initialSubjectId ? 'single' : 'all'
  );
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    initialSubjectId || subjects[0]?.id || ''
  );
  const [clearScores, setClearScores] = useState<boolean>(true);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [sharedCloudCode, setSharedCloudCode] = useState<string | null>(null);
  const [copiedSharedCode, setCopiedSharedCode] = useState(false);
  const [copiedShareMsg, setCopiedShareMsg] = useState(false);

  // Developer trigger click counter on shield in footer
  const [shieldClickCount, setShieldClickCount] = useState(0);

  // Filter & expanded items in Presets view (when enabled in the new format)
  const [presetCategoryFilter, setPresetCategoryFilter] = useState<'all' | 'university' | 'technical' | 'credits'>('all');
  const [expandedPresetId, setExpandedPresetId] = useState<string | null>(null);

  // Sync tab state whenever modal opens or initial values change
  useEffect(() => {
    if (isOpen) {
      const enabled = PRESETS_CONFIG.isEnabled();
      setIsPresetsEnabled(enabled);
      if (initialTab === 'presets' && !enabled) {
        setActiveTab('import');
      } else {
        setActiveTab(initialTab);
      }
      setStatusMsg(null);
      setPreviewTemplate(null);
      if (initialSubjectId) {
        setSelectedSubjectId(initialSubjectId);
        setExportScope('single');
      }
    }
  }, [isOpen, initialTab, initialSubjectId]);

  if (!isOpen) return null;

  const currentSubject = subjects.find((s) => s.id === selectedSubjectId) || subjects[0];

  // Discrete developer trigger: clicking shield 3 times toggles presets for user
  const handleShieldClick = () => {
    const nextCount = shieldClickCount + 1;
    if (nextCount >= 3) {
      const nextState = PRESETS_CONFIG.toggle();
      setIsPresetsEnabled(nextState);
      setShieldClickCount(0);
      setStatusMsg({
        text: nextState
          ? 'Каталог готовых программ разблокирован! Появилась вкладка «Каталог программ».'
          : 'Каталог программ скрыт.',
      });
      if (nextState) {
        setActiveTab('presets');
      } else if (activeTab === 'presets') {
        setActiveTab('import');
      }
    } else {
      setShieldClickCount(nextCount);
      setTimeout(() => setShieldClickCount(0), 2000);
    }
  };

  // Load template by code
  const handleLoadTemplateByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = templateCodeInput.trim().toUpperCase();
    if (!code) return;

    setIsLoadingCode(true);
    setStatusMsg(null);
    setPreviewTemplate(null);

    try {
      const res = await loadTemplateFromCloud(code);
      if (res.success && res.template) {
        const valid = validateAndParseTemplate(res.template);
        if (valid.valid && valid.template) {
          setPreviewTemplate(valid.template);
          setStatusMsg({ text: `Найден шаблон «${valid.template.title}». Подтвердите импорт:` });
          setIsLoadingCode(false);
          return;
        }
      }

      setStatusMsg({
        text: `Шаблон по коду "${code}" не найден. Проверьте правильность кода.`,
        error: true,
      });
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'Ошибка загрузки шаблона по коду', error: true });
    } finally {
      setIsLoadingCode(false);
    }
  };

  // Confirm template import
  const handleConfirmTemplateImport = () => {
    if (!previewTemplate) return;
    const newItems = instantiateSubjectsFromTemplate(previewTemplate);
    if (newItems.length === 0) {
      setStatusMsg({ text: 'В шаблоне не обнаружено предметов для добавления.', error: true });
      return;
    }
    onImportSubjects(newItems, importMode);
    setStatusMsg({
      text: `Успешно импортировано: ${newItems.length} ${newItems.length === 1 ? 'предмет' : 'предметов'}!`,
    });
    setPreviewTemplate(null);
    setTemplateCodeInput('');
    setTimeout(() => {
      onClose();
    }, 700);
  };

  // Handle Preset Selection (when presets are active)
  const handleApplyPreset = (preset: AcademicPreset, mode: 'append' | 'replace') => {
    const items = instantiateSubjectsFromTemplate(preset.template);
    onImportSubjects(items, mode);
    setStatusMsg({
      text: `Шаблон «${preset.title}» (${items.length} предм.) успешно загружен!`,
    });
    setTimeout(() => {
      onClose();
    }, 800);
  };

  // Build template for sharing
  const buildCurrentExportTemplate = (): SubjectTemplate | null => {
    if (exportScope === 'single') {
      if (!currentSubject) return null;
      return createSubjectTemplate(currentSubject, clearScores);
    } else {
      if (subjects.length === 0) return null;
      return createSemesterTemplate(subjects, 'Учебная программа', clearScores);
    }
  };

  // Share to cloud
  const handleShareToCloud = async () => {
    const tpl = buildCurrentExportTemplate();
    if (!tpl) return;

    setIsPublishing(true);
    setStatusMsg(null);

    const res = await shareTemplateToCloud(tpl);
    setIsPublishing(false);

    if (res.success && res.code) {
      setSharedCloudCode(res.code);
    } else {
      setStatusMsg({ text: res.error || 'Не удалось опубликовать шаблон', error: true });
    }
  };

  // Copy share message for Telegram / VK
  const handleCopyShareMessage = () => {
    if (!sharedCloudCode) return;
    const title = exportScope === 'single' ? currentSubject?.name : 'все дисциплины семестра';
    const text = `Привет! Вот готовый шаблон предмета «${title}» со шкалой баллов и контрольными точками. Введи код шаблона в калькуляторе баллов: ${sharedCloudCode}`;
    navigator.clipboard.writeText(text);
    setCopiedShareMsg(true);
    setTimeout(() => setCopiedShareMsg(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl border border-neutral-800 bg-neutral-900 p-5 sm:p-6 shadow-2xl my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-lg shadow-indigo-500/20">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Шаблоны предметов</h3>
              <p className="text-xs text-neutral-400">
                Загрузка учебных планов по коду и быстрый обмен с одногруппниками
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Minimalist Tab Navigation (2 tabs by default, 3rd if presets enabled) */}
        <div className="mt-4 flex rounded-xl bg-neutral-950 p-1 border border-neutral-800">
          <button
            type="button"
            onClick={() => {
              setActiveTab('import');
              setStatusMsg(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === 'import'
                ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Download className="h-3.5 w-3.5 text-indigo-400" />
            <span>Загрузить по коду</span>
          </button>

          {isPresetsEnabled && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('presets');
                setStatusMsg(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition ${
                activeTab === 'presets'
                  ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Каталог программ</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setActiveTab('share');
              setStatusMsg(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition ${
              activeTab === 'share'
                ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Upload className="h-3.5 w-3.5 text-emerald-400" />
            <span>Поделиться шаблоном</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Status / Alert Banner */}
          {statusMsg && (
            <div
              className={`rounded-xl p-3 text-xs font-medium flex items-center gap-2.5 ${
                statusMsg.error
                  ? 'border border-rose-500/30 bg-rose-500/10 text-rose-300'
                  : 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              }`}
            >
              {statusMsg.error ? (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              ) : (
                <Check className="h-4 w-4 shrink-0 text-emerald-400" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Template Preview Box (if template found) */}
          {previewTemplate && (
            <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2">
                <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  <span>Найденный шаблон: {previewTemplate.title}</span>
                </span>
                <span className="font-mono text-[11px] text-neutral-400">
                  {previewTemplate.isMulti ? 'Несколько предметов' : '1 предмет'}
                </span>
              </div>

              {previewTemplate.isMulti ? (
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {previewTemplate.subjects?.map((s, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/80 px-2.5 py-1.5 text-xs"
                    >
                      <span className="font-semibold text-white">{s.name}</span>
                      <span className="font-mono text-neutral-400 text-[11px]">
                        {s.maxTotalPoints} б. | {s.assignments?.length || 0} зад.
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-neutral-300 space-y-1">
                  <div className="font-semibold text-white">{previewTemplate.subject?.name}</div>
                  <div className="text-neutral-400">
                    Максимум: {previewTemplate.subject?.maxTotalPoints} б., заданий:{' '}
                    {previewTemplate.subject?.assignments?.length || 0}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-indigo-500/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-3 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer text-neutral-300">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="accent-indigo-500"
                    />
                    <span>Добавить к моим</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-neutral-400 hover:text-neutral-200">
                    <input
                      type="radio"
                      name="importMode"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="accent-indigo-500"
                    />
                    <span>Заменить текущие</span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewTemplate(null)}
                    className="rounded-lg px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmTemplateImport}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition shadow-sm"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Импортировать</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 1: IMPORT BY CODE ================= */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-white mb-1">
                    Введите код шаблона от одногруппника:
                  </h4>
                  <p className="text-[11px] text-neutral-400">
                    Например, <code className="text-indigo-400 font-mono">SUBJ-K7X9Q2</code> или <code className="text-indigo-400 font-mono">PLAN-M83P1</code>. Шаблон содержит шкалу баллов, контрольные точки и условия автомата.
                  </p>
                </div>

                <form onSubmit={handleLoadTemplateByCode} className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="SUBJ-XXXXXX или PLAN-XXXXXX"
                    value={templateCodeInput}
                    onChange={(e) => setTemplateCodeInput(e.target.value.toUpperCase())}
                    className="flex-1 rounded-xl border border-neutral-700 bg-neutral-900 px-3.5 py-2 font-mono text-xs text-white placeholder-neutral-500 focus:border-indigo-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isLoadingCode || !templateCodeInput.trim()}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition disabled:opacity-50 shadow-sm"
                  >
                    {isLoadingCode ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    <span>Загрузить</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ================= TAB 2: PRESET TEMPLATES (When activated for user) ================= */}
          {activeTab === 'presets' && isPresetsEnabled && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="text-xs text-neutral-400">
                  Типовые учебные программы с преднастроенными коэффициентами и шкалами:
                </p>
                {/* Category filters */}
                <div className="flex items-center gap-1 text-[11px]">
                  {[
                    { id: 'all', label: 'Все' },
                    { id: 'university', label: 'ВШЭ' },
                    { id: 'technical', label: 'Инженерия' },
                    { id: 'credits', label: 'Зачёты' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setPresetCategoryFilter(cat.id as any)}
                      className={`px-2 py-0.5 rounded-md transition ${
                        presetCategoryFilter === cat.id
                          ? 'bg-neutral-800 text-white font-medium'
                          : 'text-neutral-500 hover:text-neutral-300'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {ACADEMIC_PRESET_TEMPLATES.filter((p) => {
                  if (presetCategoryFilter === 'all') return true;
                  if (presetCategoryFilter === 'university') return p.id.includes('hse');
                  if (presetCategoryFilter === 'technical') return p.id.includes('tech');
                  if (presetCategoryFilter === 'credits') return p.id.includes('passfail');
                  return true;
                }).map((preset) => {
                  const isExpanded = expandedPresetId === preset.id;
                  return (
                    <div
                      key={preset.id}
                      className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-4 transition hover:border-neutral-700 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">{preset.title}</h4>
                            <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-400 border border-indigo-500/20">
                              {preset.badge}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-400 mt-1">{preset.description}</p>
                        </div>

                        <span className="font-mono text-xs text-neutral-500 shrink-0">
                          {preset.subjectsCount} предм.
                        </span>
                      </div>

                      {/* Expandable disciplines preview */}
                      <button
                        type="button"
                        onClick={() => setExpandedPresetId(isExpanded ? null : preset.id)}
                        className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300"
                      >
                        <span>{isExpanded ? 'Скрыть список предметов' : 'Показать предметы плана'}</span>
                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>

                      {isExpanded && (
                        <div className="rounded-lg bg-neutral-900/60 p-2.5 space-y-1.5 text-xs border border-neutral-800">
                          {preset.template.subjects?.map((subj, sIdx) => (
                            <div key={sIdx} className="flex items-center justify-between text-neutral-300">
                              <span>• {subj.name}</span>
                              <span className="font-mono text-[11px] text-neutral-500">
                                макс. {subj.maxTotalPoints} б., {subj.assignments?.length || 0} зад.
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-neutral-800/60">
                        <div className="text-[11px] text-neutral-500">
                          Шкала: <strong className="text-neutral-300">{preset.scaleType}</strong>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleApplyPreset(preset, 'append')}
                            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-800 transition"
                          >
                            Добавить к моим
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyPreset(preset, 'replace')}
                            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition shadow-sm"
                          >
                            Загрузить программу
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= TAB 3: SHARE WITH GROUP ================= */}
          {activeTab === 'share' && (
            <div className="space-y-4">
              {/* Scope Selection */}
              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 space-y-3">
                <span className="text-xs font-bold text-white block">Что отправить:</span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                      exportScope === 'single'
                        ? 'border-indigo-500 bg-indigo-500/10 text-white'
                        : 'border-neutral-800 bg-neutral-900/50 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="shareScope"
                      checked={exportScope === 'single'}
                      onChange={() => {
                        setExportScope('single');
                        setSharedCloudCode(null);
                      }}
                      className="mt-0.5 accent-indigo-500"
                    />
                    <div>
                      <div className="text-xs font-semibold text-white">Один предмет</div>
                      <div className="text-[11px] text-neutral-400 mt-0.5">
                        Шкала, задания и пороги конкретной дисциплины
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                      exportScope === 'all'
                        ? 'border-indigo-500 bg-indigo-500/10 text-white'
                        : 'border-neutral-800 bg-neutral-900/50 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="shareScope"
                      checked={exportScope === 'all'}
                      onChange={() => {
                        setExportScope('all');
                        setSharedCloudCode(null);
                      }}
                      className="mt-0.5 accent-indigo-500"
                    />
                    <div>
                      <div className="text-xs font-semibold text-white">
                        Весь семестр ({subjects.length} предм.)
                      </div>
                      <div className="text-[11px] text-neutral-400 mt-0.5">
                        Все предметы группы разом
                      </div>
                    </div>
                  </label>
                </div>

                {exportScope === 'single' && subjects.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold text-neutral-300 block mb-1">
                      Выберите дисциплину:
                    </label>
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => {
                        setSelectedSubjectId(e.target.value);
                        setSharedCloudCode(null);
                      }}
                      className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.code ? `(${s.code})` : ''} — {s.maxTotalPoints} б.
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <label className="flex items-center gap-2 pt-2 border-t border-neutral-800 text-xs text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={clearScores}
                    onChange={(e) => {
                      setClearScores(e.target.checked);
                      setSharedCloudCode(null);
                    }}
                    className="accent-indigo-500 rounded"
                  />
                  <span>Очистить мои оценки (одногруппники получат чистый учебный план)</span>
                </label>
              </div>

              {/* Generate Code Box */}
              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Share2 className="h-4 w-4 text-indigo-400" />
                    <span>Облачный код для одногруппников</span>
                  </span>
                </div>

                {sharedCloudCode ? (
                  <div className="rounded-xl border border-indigo-500/40 bg-indigo-950/20 p-3.5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <div className="text-[11px] text-neutral-400">Код шаблона для беседы:</div>
                        <div className="font-mono text-xl font-bold tracking-wider text-amber-300">
                          {sharedCloudCode}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(sharedCloudCode);
                            setCopiedSharedCode(true);
                            setTimeout(() => setCopiedSharedCode(false), 2000);
                          }}
                          className="flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800 transition"
                        >
                          {copiedSharedCode ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                          <span>{copiedSharedCode ? 'Скопировано' : 'Копировать код'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleCopyShareMessage}
                          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition shadow-sm"
                        >
                          {copiedShareMsg ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Share2 className="h-3.5 w-3.5" />
                          )}
                          <span>{copiedShareMsg ? 'Готово!' : 'Текст для беседы'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleShareToCloud}
                    disabled={isPublishing}
                    className="flex items-center justify-center gap-2 w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 transition shadow-md shadow-indigo-600/30 disabled:opacity-50"
                  >
                    {isPublishing ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                    )}
                    <span>Сгенерировать код шаблона</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between">
          <div
            onClick={handleShieldClick}
            className="flex items-center gap-1.5 text-[11px] text-neutral-500 cursor-pointer select-none hover:text-neutral-400 transition"
            title="Обмен шаблонами учебных дисциплин"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Обмен шаблонами учебных дисциплин</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white transition"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
