export interface GradeScaleItem {
  id: string;
  name: string;
  minPoints: number;
  maxPoints: number;
  isPassing: boolean;
  color: string; // hex or tailwind badge style
  gpaValue?: number;
}

export interface Assignment {
  id: string;
  name: string;
  maxScore: number;
  earnedScore: number | null;
  completed: boolean;
  category?: 'exam' | 'lab' | 'homework' | 'test' | 'seminar' | 'other';
  dueDate?: string;
}

export interface Subject {
  id: string;
  name: string;
  code?: string;
  teacher?: string;
  maxTotalPoints: number;
  gradingScale: GradeScaleItem[];
  assignments: Assignment[];
  targetGradeId?: string;
  customTargetScore?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type FeasibilityStatus = 'achieved' | 'easy' | 'moderate' | 'challenging' | 'impossible';

export interface TargetAnalysis {
  targetGrade: GradeScaleItem | null;
  targetScore: number;
  currentScore: number;
  maxPointsSoFar: number;
  remainingPoints: number;
  neededPoints: number;
  neededPercentOfRemaining: number;
  feasibility: FeasibilityStatus;
  feasibilityLabel: string;
  feasibilityColor: string;
  isAchieved: boolean;
  isImpossible: boolean;
  currentGrade: GradeScaleItem | null;
  completionPercent: number;
}

export interface SubjectStats {
  currentScore: number;
  maxPossibleTotal: number;
  maxPointsSoFar: number;
  remainingPoints: number;
  currentPercentage: number;
  projectedGrade: GradeScaleItem | null;
  completedCount: number;
  totalAssignmentsCount: number;
  targetAnalysis: TargetAnalysis;
}

export interface CloudSyncPayload {
  version: number;
  updatedAt: string;
  subjects: Subject[];
  userProfile?: {
    name?: string;
    university?: string;
    group?: string;
  };
}

export interface SubjectTemplate {
  format: 'smart_grade_template_v1';
  exportedAt: string;
  templateCode?: string;
  title: string;
  description?: string;
  university?: string;
  isMulti: boolean;
  subject?: Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>;
  subjects?: Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>[];
}

export interface TemplateShareResponse {
  success: boolean;
  code: string;
  message?: string;
  error?: string;
}

