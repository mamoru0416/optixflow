export type ImportanceLevel = 1 | 2 | 3;

export type Subtask = {
  id: string;
  title: string;
  isCompleted: boolean;
  estimatedTime: number;
  importanceLevel: ImportanceLevel;
  isUrgent: boolean;
  completedAt?: string;
};

export type Task = {
  id: string;
  title: string;
  createdAt?: string;
  importanceLevel: ImportanceLevel;
  isUrgent: boolean;
  estimatedTime: number;
  isCompleted: boolean;
  projectId: string | null;
  subtasks?: Subtask[];
  completedAt?: string;
};

export type Project = {
  id: string;
  name: string;
  color: string;
};
