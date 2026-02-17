"use client";

import * as React from "react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { Project, Subtask, Task } from "@/lib/mock-data";
import { createClient } from "@/lib/supabase";

type ToggleOptions = {
  cascade?: boolean;
};

type ToggleSubtaskOptions = {
  withToast?: boolean;
};

type AppContextValue = {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  user: User | null;
  selectedProjectId: string | null;
  setSelectedProjectId: React.Dispatch<React.SetStateAction<string | null>>;
  signOut: () => Promise<void>;
  addTask: (task: NewTask) => Promise<void>;
  addSubtask: (taskId: string, subtask: Omit<Subtask, "id">) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  addProject: (project: Project) => Promise<void>;
  updateProject: (projectId: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  toggleTaskCompletion: (taskId: string, options?: ToggleOptions) => Promise<void>;
  toggleSubtaskCompletion: (
    taskId: string,
    subtaskId: string,
    options?: ToggleSubtaskOptions,
  ) => Promise<void>;
};

const AppContext = React.createContext<AppContextValue | undefined>(undefined);

type NewTask = Omit<Task, "projectId"> & { projectId?: string | null };

const GUEST_KEY = "optix-flow-guest-data";
const supabase = createClient();

const mapSubtaskFromDb = (subtask: any): Subtask => ({
  id: subtask.id,
  title: subtask.title,
  isCompleted: Boolean(subtask.isCompleted ?? subtask.is_completed),
  estimatedTime: subtask.estimatedTime ?? subtask.estimated_time ?? 0,
  importanceLevel: subtask.importanceLevel ?? subtask.importance_level ?? 2,
  isUrgent: Boolean(subtask.isUrgent ?? subtask.is_urgent),
  completedAt: subtask.completed_at ?? subtask.completedAt ?? undefined,
});

const mapSubtaskToDb = (subtask: Subtask) => ({
  id: subtask.id,
  title: subtask.title,
  is_completed: subtask.isCompleted,
  estimated_time: subtask.estimatedTime,
  importance_level: subtask.importanceLevel,
  is_urgent: subtask.isUrgent,
  completed_at: subtask.completedAt ?? null,
});

const mapTaskFromDb = (row: any): Task => ({
  id: row.id,
  title: row.title,
  createdAt: row.created_at ?? row.createdAt ?? undefined,
  importanceLevel: row.importance,
  isUrgent: row.is_urgent,
  estimatedTime: row.estimated_time,
  isCompleted: row.is_completed,
  projectId: row.project_id,
  completedAt: row.completed_at ?? row.completedAt ?? undefined,
  subtasks: Array.isArray(row.subtasks)
    ? row.subtasks.map(mapSubtaskFromDb)
    : [],
});

const mapTaskToDb = (task: Task) => ({
  id: task.id,
  title: task.title,
  importance: task.importanceLevel,
  is_urgent: task.isUrgent,
  estimated_time: task.estimatedTime,
  is_completed: task.isCompleted,
  project_id: task.projectId ?? null,
  completed_at: task.completedAt ?? null,
});

const mapTaskUpdateToDb = (updates: Partial<Task>) => {
  const db: Record<string, unknown> = {};
  if (updates.title !== undefined) db.title = updates.title;
  if (updates.importanceLevel !== undefined)
    db.importance = updates.importanceLevel;
  if (updates.isUrgent !== undefined) db.is_urgent = updates.isUrgent;
  if (updates.estimatedTime !== undefined)
    db.estimated_time = updates.estimatedTime;
  if (updates.isCompleted !== undefined) db.is_completed = updates.isCompleted;
  if (updates.projectId !== undefined) db.project_id = updates.projectId ?? null;
  if (updates.completedAt !== undefined)
    db.completed_at = updates.completedAt ?? null;
  // subtasks are stored in a separate table; do not send to tasks table
  return db;
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [user, setUser] = React.useState<User | null>(null);
  const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(
    null,
  );
  const cascadedRef = React.useRef<Record<string, string[]>>({});

  const persistGuestData = React.useCallback(
    (nextTasks: Task[], nextProjects: Project[]) => {
      if (typeof window === "undefined") return;
      localStorage.setItem(
        GUEST_KEY,
        JSON.stringify({ tasks: nextTasks, projects: nextProjects }),
      );
    },
    [],
  );

  const loadGuestData = React.useCallback(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(GUEST_KEY);
    if (!raw) {
      setTasks([]);
      setProjects([]);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as { tasks?: Task[]; projects?: Project[] };
      setTasks(parsed.tasks ?? []);
      setProjects(parsed.projects ?? []);
    } catch (error) {
      console.error("Supabase Error:", error);
      setTasks([]);
      setProjects([]);
    }
  }, []);

  const fetchRemoteData = React.useCallback(async (userId: string) => {
    const [
      { data: projectRows, error: projectError },
      { data: taskRows, error: taskError },
    ] = await Promise.all([
      supabase.from("projects").select("*").eq("user_id", userId),
      supabase.from("tasks").select("*, subtasks(*)").eq("user_id", userId),
    ]);
    const shouldLog = (error: any) => {
      if (!error) return false;
      const name = (error as { name?: string }).name ?? "";
      const code = (error as { code?: string }).code ?? "";
      const message =
        (error as { message?: string }).message ?? String(error ?? "");
      if (name === "AbortError") return false;
      if (code === "PGRST000") return false;
      if (message.toLowerCase().includes("aborted")) return false;
      if (!message || message === "[object Object]") return false;
      return true;
    };
    if (shouldLog(projectError)) {
      console.error("Supabase Project Error:", projectError);
    }
    if (shouldLog(taskError)) {
      console.error("Supabase Task Error:", taskError);
    }
    if (projectRows) {
      setProjects(
        projectRows.map((row: any) => ({
          id: row.id,
          name: row.name,
          color: row.color,
        })),
      );
    }
    if (taskRows) {
      setTasks(taskRows.map(mapTaskFromDb));
    }
  }, []);

  const migrateGuestData = React.useCallback(async (userId: string) => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(GUEST_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { tasks?: Task[]; projects?: Project[] };
      const guestProjects = parsed.projects ?? [];
      const guestTasks = parsed.tasks ?? [];
      if (guestProjects.length > 0) {
        const { error } = await supabase
          .from("projects")
          .upsert(
            guestProjects.map((project) => ({
              id: project.id,
              name: project.name,
              color: project.color,
              user_id: userId,
            })),
            { onConflict: "id" },
          );
        if (error) console.error("Supabase Error:", error);
      }
      if (guestTasks.length > 0) {
        const { error: taskError } = await supabase
          .from("tasks")
          .upsert(
            guestTasks.map((task) => ({
              ...mapTaskToDb(task),
              user_id: userId,
            })),
            { onConflict: "id" },
          );
        if (taskError) console.error("Supabase Error:", taskError);
        const subtaskPayloads = guestTasks.flatMap((task) =>
          (task.subtasks ?? []).map((subtask) => ({
            id: subtask.id,
            title: subtask.title,
            is_completed: subtask.isCompleted,
            completed_at: subtask.completedAt ?? null,
            task_id: task.id,
          })),
        );
        if (subtaskPayloads.length > 0) {
          const { error: subtaskError } = await supabase
            .from("subtasks")
            .upsert(subtaskPayloads, { onConflict: "id" });
          if (subtaskError) {
            console.error(
              "Subtask Migration Error:",
              JSON.stringify(subtaskError, null, 2),
            );
          }
        }
      }
      localStorage.removeItem(GUEST_KEY);
    } catch (error) {
      console.error("Supabase Error:", error);
    }
  }, []);

  React.useEffect(() => {
    let mounted = true;
    const init = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) console.error("Supabase Error:", error);
      const nextUser = data.session?.user ?? null;
      if (!mounted) return;
      setUser(nextUser);
      if (nextUser) {
        await migrateGuestData(nextUser.id);
        await fetchRemoteData(nextUser.id);
      } else {
        loadGuestData();
      }
    };
    void init();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (nextUser) {
        await migrateGuestData(nextUser.id);
        await fetchRemoteData(nextUser.id);
      } else {
        loadGuestData();
      }
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchRemoteData, loadGuestData, migrateGuestData]);

  const addTask = React.useCallback(
    async (task: NewTask) => {
      const projectId =
        task.projectId === undefined ? selectedProjectId ?? null : task.projectId;
      const newTask: Task = {
        ...(task as Task),
        projectId,
        createdAt: (task as Task).createdAt,
        completedAt: (task as Task).completedAt,
      };
      if (!user) {
        setTasks((prev) => {
          const next = [newTask, ...prev];
          persistGuestData(next, projects);
          return next;
        });
        return;
      }
      const { data, error } = await supabase
        .from("tasks")
        .insert([
          {
            title: newTask.title,
            importance: newTask.importanceLevel,
            is_urgent: newTask.isUrgent,
            estimated_time: newTask.estimatedTime,
            is_completed: newTask.isCompleted,
            completed_at: newTask.completedAt ?? null,
            project_id: newTask.projectId ?? null,
            user_id: user.id,
          },
        ])
        .select()
        .single();
      if (error) console.error("Supabase Error:", error);
      if (data) {
        setTasks((prev) => [mapTaskFromDb(data), ...prev]);
      }
    },
    [selectedProjectId, user, persistGuestData, projects],
  );

  const updateTask = React.useCallback(
    async (taskId: string, updates: Partial<Task>) => {
      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? { ...task, ...updates } : task)),
      );
      if (!user) {
        setTasks((prev) => {
          persistGuestData(prev, projects);
          return prev;
        });
        return;
      }
      const dbUpdates = mapTaskUpdateToDb(updates);
      if (Object.keys(dbUpdates).length === 0) return;
      const { error } = await supabase
        .from("tasks")
        .update(dbUpdates)
        .eq("id", taskId);
      if (error) console.error("Supabase Error:", error);
    },
    [user, persistGuestData, projects],
  );

  const addSubtask = React.useCallback(
    async (taskId: string, subtask: Omit<Subtask, "id">) => {
      const tempId = crypto.randomUUID();
      const optimistic: Subtask = { id: tempId, ...subtask };
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? { ...task, subtasks: [...(task.subtasks ?? []), optimistic] }
            : task,
        ),
      );
      if (!user) {
        setTasks((prev) => {
          persistGuestData(prev, projects);
          return prev;
        });
        return;
      }
      const { data, error } = await supabase
        .from("subtasks")
        .insert([
          {
            task_id: taskId,
            title: subtask.title,
            is_completed: subtask.isCompleted ?? false,
            completed_at: subtask.completedAt ?? null,
            estimated_time: subtask.estimatedTime,
            importance_level: subtask.importanceLevel,
            is_urgent: subtask.isUrgent,
          },
        ])
        .select()
        .single();
      if (error) {
        console.error("Supabase Error:", error);
        setTasks((prev) =>
          prev.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  subtasks: (task.subtasks ?? []).filter(
                    (item) => item.id !== tempId,
                  ),
                }
              : task,
          ),
        );
        return;
      }
      if (data) {
        const mapped = mapSubtaskFromDb(data);
        const enriched: Subtask = {
          ...mapped,
          estimatedTime: subtask.estimatedTime,
          importanceLevel: subtask.importanceLevel,
          isUrgent: subtask.isUrgent,
          completedAt: subtask.completedAt,
        };
        setTasks((prev) =>
          prev.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  subtasks: (task.subtasks ?? []).map((item) =>
                    item.id === tempId ? enriched : item,
                  ),
                }
              : task,
          ),
        );
      }
    },
    [user, persistGuestData, projects],
  );

  const addProject = React.useCallback(
    async (project: Project) => {
      if (!user) {
        setProjects((prev) => {
          const next = [...prev, project];
          persistGuestData(tasks, next);
          return next;
        });
        return;
      }
      const { data, error } = await supabase
        .from("projects")
        .insert([
          { id: project.id, name: project.name, color: project.color, user_id: user.id },
        ])
        .select()
        .single();
      if (error) console.error("Supabase Error:", error);
      if (data) {
        setProjects((prev) => [...prev, data as Project]);
      }
    },
    [user, persistGuestData, tasks],
  );

  const updateProject = React.useCallback(
    async (projectId: string, updates: Partial<Project>) => {
      if (!user) {
        setProjects((prev) => {
          const next = prev.map((project) =>
            project.id === projectId ? { ...project, ...updates } : project,
          );
          persistGuestData(tasks, next);
          return next;
        });
        return;
      }
      const { data, error } = await supabase
        .from("projects")
        .update(updates)
        .eq("id", projectId)
        .select()
        .single();
      if (error) console.error("Supabase Error:", error);
      if (data) {
        setProjects((prev) =>
          prev.map((project) =>
            project.id === projectId ? { ...project, ...data } : project,
          ),
        );
      }
    },
    [user, persistGuestData, tasks],
  );

  const deleteProject = React.useCallback(
    async (projectId: string) => {
      if (!user) {
        setProjects((prev) => {
          const nextProjects = prev.filter((project) => project.id !== projectId);
          setTasks((prevTasks) => {
            const nextTasks = prevTasks.map((task) =>
              task.projectId === projectId ? { ...task, projectId: null } : task,
            );
            persistGuestData(nextTasks, nextProjects);
            return nextTasks;
          });
          return nextProjects;
        });
        setSelectedProjectId((prev) => (prev === projectId ? null : prev));
        return;
      }
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);
      if (error) console.error("Supabase Error:", error);
      setProjects((prev) => prev.filter((project) => project.id !== projectId));
      setTasks((prev) =>
        prev.map((task) =>
          task.projectId === projectId ? { ...task, projectId: null } : task,
        ),
      );
      setSelectedProjectId((prev) => (prev === projectId ? null : prev));
    },
    [user, persistGuestData],
  );

  const undoCompletion = React.useCallback(
    (id: string) => {
      const cascaded = cascadedRef.current[id];
      if (cascaded) {
        setTasks((prev) => {
          const next = prev.map((item) => {
            if (item.id !== id) return item;
            const nextSubtasks = item.subtasks
              ? item.subtasks.map((subtask) =>
                  cascaded.includes(subtask.id)
                    ? { ...subtask, isCompleted: false }
                    : subtask,
                )
              : item.subtasks;
            return {
              ...item,
              isCompleted: false,
              completedAt: undefined,
              subtasks: nextSubtasks,
            };
          });
          if (!user) persistGuestData(next, projects);
          return next;
        });
        delete cascadedRef.current[id];
        return;
      }

      setTasks((prev) => {
        const next = prev.map((item) => {
          if (item.id === id) {
            return { ...item, isCompleted: false, completedAt: undefined };
          }
          if (!item.subtasks) return item;
          return {
            ...item,
            subtasks: item.subtasks.map((subtask) =>
              subtask.id === id
                ? { ...subtask, isCompleted: false }
                : subtask,
            ),
          };
        });
        if (!user) persistGuestData(next, projects);
        return next;
      });
    },
    [user, persistGuestData, projects],
  );

  const toggleTaskCompletion = React.useCallback(
    async (taskId: string, options?: ToggleOptions) => {
      const task = tasks.find((item) => item.id === taskId);
      if (!task) return;
      const cascade = options?.cascade ?? false;

      if (task.isCompleted) {
        const nextTasks = tasks.map((item) =>
          item.id === taskId
            ? { ...item, isCompleted: false, completedAt: undefined }
            : item,
        );
        setTasks(nextTasks);
        if (user) {
          const { error } = await supabase
            .from("tasks")
            .update({ is_completed: false, completed_at: null })
            .eq("id", taskId);
          if (error) console.error("Supabase Error:", error);
        } else {
          persistGuestData(nextTasks, projects);
        }
        return;
      }

      if (cascade) {
        const affected =
          task.subtasks
            ?.filter((subtask) => !subtask.isCompleted)
            .map((subtask) => subtask.id) ?? [];
        cascadedRef.current[taskId] = affected;
        const nextSubtasks = task.subtasks
          ? task.subtasks.map((subtask) =>
              affected.includes(subtask.id)
                ? { ...subtask, isCompleted: true, completedAt: new Date().toISOString() }
                : subtask,
            )
          : task.subtasks;
        const completedAt = new Date().toISOString();
        const nextTasks = tasks.map((item) => {
          if (item.id !== taskId) return item;
          return {
            ...item,
            isCompleted: true,
            completedAt,
            subtasks: nextSubtasks,
          };
        });
        setTasks(nextTasks);
        if (user) {
          if (affected.length > 0) {
            const { error: subtaskError } = await supabase
              .from("subtasks")
              .update({ is_completed: true, completed_at: completedAt })
              .in("id", affected);
            if (subtaskError) console.error("Supabase Error:", subtaskError);
          }
          const { error } = await supabase
            .from("tasks")
            .update({
              is_completed: true,
              completed_at: completedAt,
            })
            .eq("id", taskId);
          if (error) console.error("Supabase Error:", error);
        } else {
          persistGuestData(nextTasks, projects);
        }
        toast("Project Completed", {
          action: {
            label: "Undo",
            onClick: () => undoCompletion(taskId),
          },
        });
        return;
      }

      const completedAt = new Date().toISOString();
      const nextTasks = tasks.map((item) =>
        item.id === taskId ? { ...item, isCompleted: true, completedAt } : item,
      );
      setTasks(nextTasks);
      if (user) {
        const { error } = await supabase
          .from("tasks")
          .update({
            is_completed: true,
            completed_at: completedAt,
          })
          .eq("id", taskId);
        if (error) console.error("Supabase Error:", error);
      } else {
        persistGuestData(nextTasks, projects);
      }
      toast("Task completed.", {
        action: {
          label: "Undo",
          onClick: () => undoCompletion(taskId),
        },
      });
    },
    [tasks, undoCompletion, user, persistGuestData, projects],
  );

  const toggleSubtaskCompletion = React.useCallback(
    async (taskId: string, subtaskId: string, options?: ToggleSubtaskOptions) => {
      const withToast = options?.withToast ?? true;
      if (!withToast) {
        const task = tasks.find((item) => item.id === taskId);
        if (!task || !task.subtasks) return;
        const completedAt = new Date().toISOString();
        const nextSubtasks = task.subtasks.map((child) =>
          child.id === subtaskId
            ? {
                ...child,
                isCompleted: !child.isCompleted,
                completedAt: child.isCompleted ? undefined : completedAt,
              }
            : child,
        );
        const nextTasks = tasks.map((item) => {
          if (item.id !== taskId || !item.subtasks) return item;
          return {
            ...item,
            subtasks: nextSubtasks,
          };
        });
        setTasks(nextTasks);
        const nextValue =
          nextSubtasks.find((item) => item.id === subtaskId)?.isCompleted ??
          false;
        if (user) {
          const { error } = await supabase
            .from("subtasks")
            .update({
              is_completed: nextValue,
              completed_at: nextValue ? completedAt : null,
            })
            .eq("id", subtaskId);
          if (error) console.error("Supabase Error:", error);
        } else {
          persistGuestData(nextTasks, projects);
        }
        return;
      }

      const parent = tasks.find((item) => item.id === taskId);
      const subtask = parent?.subtasks?.find((child) => child.id === subtaskId);
      if (!subtask) return;
      if (subtask.isCompleted) {
        const completedAt = null;
        const nextSubtasks = parent.subtasks.map((child) =>
          child.id === subtaskId
            ? { ...child, isCompleted: false, completedAt: undefined }
            : child,
        );
        const nextTasks = tasks.map((item) => {
          if (item.id !== taskId || !item.subtasks) return item;
          return {
            ...item,
            subtasks: nextSubtasks,
          };
        });
        setTasks(nextTasks);
        if (user) {
          const { error } = await supabase
            .from("subtasks")
            .update({ is_completed: false, completed_at: completedAt })
            .eq("id", subtaskId);
          if (error) console.error("Supabase Error:", error);
        } else {
          persistGuestData(nextTasks, projects);
        }
        return;
      }
      const completedAt = new Date().toISOString();
      const nextSubtasks = parent.subtasks.map((child) =>
        child.id === subtaskId
          ? { ...child, isCompleted: true, completedAt }
          : child,
      );
      const nextTasks = tasks.map((item) => {
        if (item.id !== taskId || !item.subtasks) return item;
        return {
          ...item,
          subtasks: nextSubtasks,
        };
      });
      setTasks(nextTasks);
      if (user) {
        const { error } = await supabase
          .from("subtasks")
          .update({ is_completed: true, completed_at: completedAt })
          .eq("id", subtaskId);
        if (error) console.error("Supabase Error:", error);
      } else {
        persistGuestData(nextTasks, projects);
      }
      toast("Task completed.", {
        action: {
          label: "Undo",
          onClick: () => undoCompletion(subtaskId),
        },
      });
    },
    [tasks, undoCompletion, user, persistGuestData, projects],
  );

  const signOut = React.useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Supabase Error:", error);
      return;
    }
    setUser(null);
    loadGuestData();
    setSelectedProjectId(null);
  }, [loadGuestData]);

  const value = React.useMemo(
    () => ({
      tasks,
      setTasks,
      projects,
      setProjects,
      user,
      selectedProjectId,
      setSelectedProjectId,
      signOut,
      addTask,
      addSubtask,
      updateTask,
      addProject,
      updateProject,
      deleteProject,
      toggleTaskCompletion,
      toggleSubtaskCompletion,
    }),
    [
      tasks,
      projects,
      user,
      selectedProjectId,
      signOut,
      addTask,
      addSubtask,
      addProject,
      updateProject,
      deleteProject,
      toggleTaskCompletion,
      toggleSubtaskCompletion,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = React.useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
}
