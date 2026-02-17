"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sidebar } from "@/components/sidebar";
import {
  CheckCircle2,
  Clock,
  Plus,
  X as XIcon,
} from "lucide-react";
import {
  ImportanceLevel,
  Project,
  Task,
} from "@/lib/mock-data";
import { useApp } from "@/context/AppContext";

type CellSpec = {
  level: ImportanceLevel;
  isUrgent: boolean;
};

const importanceRows = [
  { level: 3, label: "High Importance", tone: "bg-red-50/90" },
  { level: 2, label: "Mid Importance", tone: "bg-amber-50/90" },
  { level: 1, label: "Low Importance", tone: "bg-emerald-50/80" },
] as const;

const cellIdFor = (level: ImportanceLevel, isUrgent: boolean) =>
  `cell-${level}-${isUrgent ? "urgent" : "normal"}`;

const parseCellId = (id: string): CellSpec | null => {
  const match = id.match(/^cell-(\d)-(urgent|normal)$/);
  if (!match) return null;
  const level = Number(match[1]) as ImportanceLevel;
  return { level, isUrgent: match[2] === "urgent" };
};

const formatImportance = (level: ImportanceLevel) => {
  if (level === 3) return "High";
  if (level === 2) return "Mid";
  return "Low";
};

const scoreForLeaf = (task: LeafTask) =>
  task.importanceLevel * 10 + (task.isUrgent ? 1 : 0);

type LeafTask = {
  id: string;
  title: string;
  estimatedTime: number;
  isCompleted: boolean;
  importanceLevel: ImportanceLevel;
  isUrgent: boolean;
  parentId?: string;
  parentTitle?: string;
  projectId?: string | null;
  projectName?: string;
};

const getLeafTasks = (tasks: Task[], projects: Project[]): LeafTask[] => {
  return tasks.flatMap((task) => {
    const project = projects.find((item) => item.id === task.projectId);
    if (task.subtasks && task.subtasks.length > 0) {
      return task.subtasks.map((subtask) => ({
        id: subtask.id,
        title: subtask.title,
        estimatedTime: subtask.estimatedTime,
        isCompleted: subtask.isCompleted,
        importanceLevel: subtask.importanceLevel,
        isUrgent: subtask.isUrgent,
        parentId: task.id,
        parentTitle: task.title,
        projectId: task.projectId,
        projectName: project?.name,
      }));
    }
    return [
      {
        id: task.id,
        title: task.title,
        estimatedTime: task.estimatedTime,
        isCompleted: task.isCompleted,
        importanceLevel: task.importanceLevel,
        isUrgent: task.isUrgent,
        projectId: task.projectId,
        projectName: project?.name,
      },
    ];
  });
};

const getCellKeyForTask = (task: Task) =>
  cellIdFor(task.importanceLevel, task.isUrgent);

const TaskCard = ({
  task,
  isOverlay = false,
  onToggle,
  onToggleSubtask,
  onUpdateTime,
  onUpdateSubtaskTime,
  enableSubtaskAdd = false,
  onAddSubtask,
  hiddenSubtaskIds,
  projects,
  onUpdateProject,
}: {
  task: Task;
  isOverlay?: boolean;
  onToggle?: (taskId: string) => void;
  onToggleSubtask?: (taskId: string, subtaskId: string) => void;
  onUpdateTime?: (taskId: string, minutes: number) => void;
  onUpdateSubtaskTime?: (
    taskId: string,
    subtaskId: string,
    minutes: number,
  ) => void;
  enableSubtaskAdd?: boolean;
  onAddSubtask?: (taskId: string, title: string, minutes: number) => void;
  hiddenSubtaskIds?: Set<string>;
  projects: Project[];
  onUpdateProject?: (taskId: string, projectId: string | null) => void;
}) => {
  const project = projects.find((item) => item.id === task.projectId);
  const totalSubtaskMinutes =
    task.subtasks?.reduce(
      (sum, subtask) => sum + subtask.estimatedTime,
      0,
    ) ?? task.estimatedTime;
  const hasSubtasks = Boolean(task.subtasks && task.subtasks.length > 0);
  const [showSubtaskInput, setShowSubtaskInput] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [subtaskTime, setSubtaskTime] = useState(15);
  const subtaskInputRef = useRef<HTMLInputElement | null>(null);
  const closeSubtaskInput = () => {
    setShowSubtaskInput(false);
    setSubtaskTitle("");
  };
  return (
    <Card
      className={`flex flex-col gap-2 rounded-lg border bg-white p-3 text-sm shadow-sm ${
        isOverlay ? "pointer-events-none w-64" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <Checkbox
            checked={task.isCompleted}
            disabled={isOverlay}
            onCheckedChange={() => onToggle?.(task.id)}
            onPointerDown={(event) => event.stopPropagation()}
          />
          <span
            className={`font-medium ${
              task.isCompleted ? "text-zinc-400 line-through" : "text-zinc-900"
            }`}
          >
            {task.title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {task.isUrgent && (
            <Badge className="bg-rose-500 text-white">Urgent</Badge>
          )}
          {enableSubtaskAdd && !isOverlay && (
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => setShowSubtaskInput((prev) => !prev)}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              className="flex items-center gap-2 rounded-md px-1 py-0.5 transition-colors hover:bg-muted/60"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: project?.color ?? "#94a3b8" }}
              />
              <span>{project?.name ?? "No Project"}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onClick={() => onUpdateProject?.(task.id, null)}
            >
              No Project
            </DropdownMenuItem>
            {projects.map((item) => (
              <DropdownMenuItem
                key={item.id}
                onClick={() => onUpdateProject?.(task.id, item.id)}
              >
                <span
                  className="mr-2 h-2 w-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                {item.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <span>•</span>
        <span>{formatImportance(task.importanceLevel)}</span>
      </div>
      <div className="flex items-center gap-1 text-xs text-zinc-500">
        <Clock className="h-3.5 w-3.5" />
        {hasSubtasks ? (
          <span>{totalSubtaskMinutes} min (sum)</span>
        ) : (
          <input
            type="number"
            min={5}
            value={task.estimatedTime}
            disabled={isOverlay}
            onChange={(event) =>
              onUpdateTime?.(task.id, Number(event.target.value))
            }
            onPointerDown={(event) => event.stopPropagation()}
            className="w-16 rounded border border-zinc-200 bg-white px-1 py-0.5 text-xs text-zinc-600"
          />
        )}
      </div>
      {task.subtasks && task.subtasks.length > 0 && (
        <div className="ml-6 flex flex-col gap-1 text-xs text-zinc-600">
          {task.subtasks
            .filter((subtask) => !hiddenSubtaskIds?.has(subtask.id))
            .map((subtask) => (
            <div key={subtask.id} className="flex items-center gap-2">
              <Checkbox
                checked={subtask.isCompleted}
                disabled={isOverlay}
                onCheckedChange={() => onToggleSubtask?.(task.id, subtask.id)}
                onPointerDown={(event) => event.stopPropagation()}
              />
              <span
                className={
                  subtask.isCompleted
                    ? "text-zinc-400 line-through"
                    : "text-zinc-700"
                }
              >
                {subtask.title}
              </span>
              <input
                type="number"
                min={5}
                value={subtask.estimatedTime}
                disabled={isOverlay}
                onChange={(event) =>
                  onUpdateSubtaskTime?.(
                    task.id,
                    subtask.id,
                    Number(event.target.value),
                  )
                }
                onPointerDown={(event) => event.stopPropagation()}
                className="ml-auto w-14 rounded border border-zinc-200 bg-white px-1 py-0.5 text-[11px] text-zinc-500"
              />
            </div>
            ))}
        </div>
      )}
      {enableSubtaskAdd && showSubtaskInput && !isOverlay && (
        <div className="flex items-center gap-1 rounded-md border border-dashed border-zinc-200 bg-zinc-50 p-2 text-xs">
          <Input
            ref={subtaskInputRef}
            placeholder="Subtask title"
            value={subtaskTitle}
            onChange={(event) => setSubtaskTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                closeSubtaskInput();
                return;
              }
              if (event.key === "Enter" && subtaskTitle.trim()) {
                onAddSubtask?.(
                  task.id,
                  subtaskTitle.trim(),
                  Math.max(5, subtaskTime),
                );
                setSubtaskTitle("");
                setSubtaskTime(15);
                requestAnimationFrame(() => subtaskInputRef.current?.focus());
              }
            }}
            onPointerDown={(event) => event.stopPropagation()}
            className="h-7 bg-white text-xs"
          />
          <Input
            type="number"
            min={5}
            value={subtaskTime}
            onChange={(event) => setSubtaskTime(Number(event.target.value))}
            onPointerDown={(event) => event.stopPropagation()}
            className="h-7 w-16 bg-white text-xs"
          />
          <Button
            size="sm"
            onClick={() => {
              if (!subtaskTitle.trim()) return;
              onAddSubtask?.(
                task.id,
                subtaskTitle.trim(),
                Math.max(5, subtaskTime),
              );
              setSubtaskTitle("");
              setSubtaskTime(15);
              requestAnimationFrame(() => subtaskInputRef.current?.focus());
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            Add
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            className="h-7 w-7"
            onClick={closeSubtaskInput}
            onPointerDown={(event) => event.stopPropagation()}
          >
            ×
          </Button>
        </div>
      )}
    </Card>
  );
};

const DraggableTask = ({
  task,
  onToggle,
  onToggleSubtask,
  onUpdateTime,
  onUpdateSubtaskTime,
  enableSubtaskAdd,
  onAddSubtask,
  hiddenSubtaskIds,
  projects,
  onUpdateProject,
}: {
  task: Task;
  onToggle: (taskId: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onUpdateTime: (taskId: string, minutes: number) => void;
  onUpdateSubtaskTime: (taskId: string, subtaskId: string, minutes: number) => void;
  enableSubtaskAdd?: boolean;
  onAddSubtask?: (taskId: string, title: string, minutes: number) => void;
  hiddenSubtaskIds?: Set<string>;
  projects: Project[];
  onUpdateProject?: (taskId: string, projectId: string | null) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? "opacity-50" : "opacity-100"}
      {...attributes}
      {...listeners}
    >
      <TaskCard
        task={task}
        onToggle={onToggle}
        onToggleSubtask={onToggleSubtask}
        onUpdateTime={onUpdateTime}
        onUpdateSubtaskTime={onUpdateSubtaskTime}
        enableSubtaskAdd={enableSubtaskAdd}
        onAddSubtask={onAddSubtask}
        hiddenSubtaskIds={hiddenSubtaskIds}
        projects={projects}
        onUpdateProject={onUpdateProject}
      />
    </div>
  );
};

const MicroTaskCard = ({
  task,
  onToggle,
  onUpdateTime,
  projects,
}: {
  task: LeafTask;
  onToggle: () => void;
  onUpdateTime: (minutes: number) => void;
  projects: Project[];
}) => {
  const project = projects.find((item) => item.id === task.projectId);
  const parentLabel = task.parentTitle ?? task.projectName ?? "Project";
  const [draftMinutes, setDraftMinutes] = useState(task.estimatedTime);
  useEffect(() => {
    setDraftMinutes(task.estimatedTime);
  }, [task.estimatedTime]);
  return (
    <Card className="flex w-full min-h-[40px] flex-row items-center gap-2 rounded-lg border bg-white p-2 text-xs shadow-sm">
      <Checkbox
        checked={task.isCompleted}
        onCheckedChange={onToggle}
        onPointerDown={(event) => event.stopPropagation()}
      />
      <span
        className={`flex-1 truncate text-left text-sm font-medium ${
          task.isCompleted ? "text-zinc-400 line-through" : "text-zinc-900"
        }`}
      >
        {task.title}
      </span>
      <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
        - {parentLabel} -{" "}
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: project?.color ?? "#94a3b8" }}
        />
        <span className="truncate">{task.projectName ?? "Project"}</span>
      </span>
      <Input
        type="number"
        min={5}
        value={draftMinutes}
        onChange={(event) => setDraftMinutes(Number(event.target.value))}
        onBlur={() => onUpdateTime(Math.max(5, draftMinutes))}
        onPointerDown={(event) => event.stopPropagation()}
        className="ml-auto h-7 w-16 border-0 bg-transparent text-right text-xs focus:bg-white focus-visible:ring-0 focus-visible:ring-offset-0"
      />
    </Card>
  );
};

const DraggableMicroTask = ({
  task,
  onToggle,
  onUpdateTime,
  projects,
}: {
  task: LeafTask;
  onToggle: () => void;
  onUpdateTime: (minutes: number) => void;
  projects: Project[];
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isDragging ? "opacity-50" : "opacity-100"}
      {...attributes}
      {...listeners}
    >
      <MicroTaskCard
        task={task}
        onToggle={onToggle}
        onUpdateTime={onUpdateTime}
        projects={projects}
      />
    </div>
  );
};

const DroppableCell = ({
  id,
  children,
  tone,
  className,
}: {
  id: string;
  children: React.ReactNode;
  tone: string;
  className?: string;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`flex h-full flex-1 flex-col gap-2 border border-dashed border-zinc-200 p-4 transition-colors ${
        isOver ? "border-zinc-900 bg-white" : tone
      } ${className ?? ""}`}
    >
      {children}
    </div>
  );
};

export default function Home() {
  const {
    tasks,
    setTasks,
    projects,
    selectedProjectId,
    setSelectedProjectId,
    addTask,
    addSubtask,
    updateTask,
    toggleTaskCompletion,
    toggleSubtaskCompletion,
  } = useApp();
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [availableMinutes, setAvailableMinutes] = useState(30);
  const [viewMode, setViewMode] = useState<"macro" | "micro">("macro");
  const [quickAddInputs, setQuickAddInputs] = useState<Record<string, string>>(
    {},
  );
  const [microOrder, setMicroOrder] = useState<Record<string, string[]>>({});

  const searchParams = useSearchParams();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );
  useEffect(() => {
    const projectId = searchParams.get("project");
    if (!projectId) return;
    const exists = projects.some((project) => project.id === projectId);
    setSelectedProjectId(exists ? projectId : null);
  }, [searchParams, projects]);

  const filteredTasks = useMemo(() => {
    if (!selectedProjectId) return tasks;
    return tasks.filter((task) => task.projectId === selectedProjectId);
  }, [tasks, selectedProjectId]);

  const incompleteTasks = useMemo(
    () => filteredTasks.filter((task) => !task.isCompleted),
    [filteredTasks],
  );

  const completedTasks = useMemo(
    () => filteredTasks.filter((task) => task.isCompleted),
    [filteredTasks],
  );

  const leafTasks = useMemo(
    () => getLeafTasks(filteredTasks, projects),
    [filteredTasks, projects],
  );
  const visibleLeafTasks = useMemo(
    () => leafTasks.filter((task) => !task.isCompleted),
    [leafTasks],
  );

  const orderedLeafTasks = useMemo(() => {
    const orderMapByCell: Record<string, string[]> = {};
    const baseMap = new Map(visibleLeafTasks.map((item, idx) => [item.id, idx]));
    const ordered = [...visibleLeafTasks].sort((a, b) => {
      const aOrder = microOrder[cellIdFor(a.importanceLevel, a.isUrgent)];
      const bOrder = microOrder[cellIdFor(b.importanceLevel, b.isUrgent)];
      const aIndex = aOrder?.indexOf(a.id);
      const bIndex = bOrder?.indexOf(b.id);
      if (
        aIndex !== undefined &&
        aIndex !== -1 &&
        bIndex !== undefined &&
        bIndex !== -1
      ) {
        return aIndex - bIndex;
      }
      if (aIndex !== undefined && aIndex !== -1) return -1;
      if (bIndex !== undefined && bIndex !== -1) return 1;
      return (baseMap.get(a.id) ?? 0) - (baseMap.get(b.id) ?? 0);
    });
    ordered.forEach((item) => {
      const cellId = cellIdFor(item.importanceLevel, item.isUrgent);
      orderMapByCell[cellId] = orderMapByCell[cellId] ?? [];
      orderMapByCell[cellId].push(item.id);
    });
    return { ordered, orderMapByCell };
  }, [visibleLeafTasks, microOrder]);

  const compactCandidates = useMemo(() => {
    const orderIndex = new Map(
      orderedLeafTasks.ordered.map((task, index) => [task.id, index]),
    );
    return visibleLeafTasks
      .filter(
        (task) => !task.isCompleted && task.estimatedTime <= availableMinutes,
      )
      .sort((a, b) => {
        const scoreDiff = scoreForLeaf(b) - scoreForLeaf(a);
        if (scoreDiff !== 0) return scoreDiff;
        return (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0);
      });
  }, [visibleLeafTasks, availableMinutes, orderedLeafTasks]);

  const handleQuickAdd = (cellId: string) => {
    const draft = quickAddInputs[cellId]?.trim();
    if (!draft) return;
    const target = parseCellId(cellId);
    if (!target) return;
    const projectId = selectedProjectId ?? null;
    const task: Task = {
      id: crypto.randomUUID(),
      title: draft,
      importanceLevel: target.level,
      isUrgent: target.isUrgent,
      estimatedTime: 30,
      isCompleted: false,
      projectId: projectId,
    };
    addTask(task);
    setQuickAddInputs((prev) => ({ ...prev, [cellId]: "" }));
  };

  const handleAddSubtask = (taskId: string, title: string, minutes: number) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;
    void addSubtask(taskId, {
      title,
      isCompleted: false,
      estimatedTime: Math.max(5, minutes),
      importanceLevel: task.importanceLevel,
      isUrgent: task.isUrgent,
    });
  };

  const handleToggleTask = (taskId: string) => {
    toggleTaskCompletion(taskId, { cascade: viewMode === "macro" });
  };

  const handleToggleSubtaskInline = (taskId: string, subtaskId: string) => {
    toggleSubtaskCompletion(taskId, subtaskId, { withToast: false });
  };

  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    toggleSubtaskCompletion(taskId, subtaskId);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTaskId(String(event.active.id));
  };

  const findContainer = (id: string) => {
    if (id.startsWith("cell-")) return id;
    const task = visibleLeafTasks.find((item) => item.id === id);
    if (!task) return null;
    return cellIdFor(task.importanceLevel, task.isUrgent);
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (viewMode === "macro") return;
    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);
    if (!activeContainer || !overContainer) return;
    if (activeContainer === overContainer) return;

    const activeTask = visibleLeafTasks.find((item) => item.id === activeId);
    if (!activeTask) return;
    const targetSpec = parseCellId(overContainer);
    if (!targetSpec) return;

    if (activeTask.parentId) {
      handleUpdateSubtaskPriority(
        activeTask.parentId,
        activeTask.id,
        targetSpec.level,
        targetSpec.isUrgent,
      );
    } else {
      handleUpdateTaskPriority(activeTask.id, targetSpec.level, targetSpec.isUrgent);
    }

    setMicroOrder((prev) => {
      const sourceIds =
        prev[activeContainer] ??
        visibleLeafTasks
          .filter(
            (task) =>
              cellIdFor(task.importanceLevel, task.isUrgent) === activeContainer,
          )
          .map((task) => task.id);
      const targetIds =
        prev[overContainer] ??
        visibleLeafTasks
          .filter(
            (task) =>
              cellIdFor(task.importanceLevel, task.isUrgent) === overContainer,
          )
          .map((task) => task.id);
      const fromIndex = sourceIds.indexOf(activeId);
      if (fromIndex === -1) return prev;
      const nextSource = sourceIds.filter((id) => id !== activeId);
      const nextTarget = [...targetIds];
      const overIndex = targetIds.indexOf(overId);
      const insertIndex = overIndex === -1 ? nextTarget.length : overIndex;
      nextTarget.splice(insertIndex, 0, activeId);
      return { ...prev, [activeContainer]: nextSource, [overContainer]: nextTarget };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTaskId(null);
    if (!over) return;
    if (active.id === over.id) return;
    const overId = String(over.id);
    if (viewMode === "macro") {
      setTasks((prev) => {
        const activeTask = prev.find((task) => task.id === active.id);
        if (!activeTask) return prev;

        const reorderWithinCell = (
          current: Task[],
          cellId: string,
          activeId: string,
          overTaskId: string,
        ) => {
          const cellTasks = current.filter(
            (task) => getCellKeyForTask(task) === cellId,
          );
          const fromIndex = cellTasks.findIndex((task) => task.id === activeId);
          const toIndex = cellTasks.findIndex((task) => task.id === overTaskId);
          if (fromIndex === -1 || toIndex === -1) return current;
          const reordered = arrayMove(cellTasks, fromIndex, toIndex);
          const queue = [...reordered];
          return current.map((task) =>
            getCellKeyForTask(task) === cellId ? queue.shift()! : task,
          );
        };

        if (overId.startsWith("cell-")) {
          const target = parseCellId(overId);
          if (!target) return prev;
          const activeCell = getCellKeyForTask(activeTask);
          const targetCell = cellIdFor(target.level, target.isUrgent);
          if (activeCell === targetCell) return prev;
          void updateTask(activeTask.id, {
            importanceLevel: target.level,
            isUrgent: target.isUrgent,
          });
          return prev.map((task) =>
            task.id === active.id
              ? {
                  ...task,
                  importanceLevel: target.level,
                  isUrgent: target.isUrgent,
                }
              : task,
          );
        }

        const overTask = prev.find((task) => task.id === overId);
        if (!overTask) return prev;

        const activeCell = getCellKeyForTask(activeTask);
        const overCell = getCellKeyForTask(overTask);
        if (activeCell === overCell) {
          return reorderWithinCell(prev, activeCell, String(active.id), overId);
        }

        const updated = prev.map((task) =>
          task.id === active.id
            ? {
                ...task,
                importanceLevel: overTask.importanceLevel,
                isUrgent: overTask.isUrgent,
              }
            : task,
        );
        void updateTask(activeTask.id, {
          importanceLevel: overTask.importanceLevel,
          isUrgent: overTask.isUrgent,
        });
        return reorderWithinCell(updated, overCell, String(active.id), overId);
      });
      return;
    }

    const activeLeaf = visibleLeafTasks.find((task) => task.id === active.id);
    if (!activeLeaf) return;
    const activeContainer = findContainer(String(active.id));
    const overContainer = findContainer(overId);
    if (!activeContainer || !overContainer) return;
    if (activeContainer !== overContainer) return;

    const orderedIds =
      microOrder[activeContainer] ??
      visibleLeafTasks
        .filter(
          (task) =>
            cellIdFor(task.importanceLevel, task.isUrgent) === activeContainer,
        )
        .map((task) => task.id);
    const fromIndex = orderedIds.indexOf(String(active.id));
    const toIndex = orderedIds.indexOf(overId);
    if (fromIndex === -1 || toIndex === -1) return;
    setMicroOrder((prev) => ({
      ...prev,
      [activeContainer]: arrayMove(orderedIds, fromIndex, toIndex),
    }));
  };

  const handleUpdateTaskTime = (taskId: string, minutes: number) => {
    if (Number.isNaN(minutes)) return;
    void updateTask(taskId, { estimatedTime: Math.max(5, minutes) });
  };

  const handleUpdateSubtaskTime = (
    taskId: string,
    subtaskId: string,
    minutes: number,
  ) => {
    if (Number.isNaN(minutes)) return;
    const task = tasks.find((item) => item.id === taskId);
    if (!task || !task.subtasks) return;
    const nextSubtasks = task.subtasks.map((subtask) =>
      subtask.id === subtaskId
        ? { ...subtask, estimatedTime: Math.max(5, minutes) }
        : subtask,
    );
    void updateTask(taskId, { subtasks: nextSubtasks });
  };

  const handleUpdateTaskProject = (taskId: string, projectId: string | null) => {
    void updateTask(taskId, { projectId });
  };


  const handleUpdateTaskPriority = (
    taskId: string,
    level: ImportanceLevel,
    urgent: boolean,
  ) => {
    void updateTask(taskId, { importanceLevel: level, isUrgent: urgent });
  };

  const handleUpdateSubtaskPriority = (
    taskId: string,
    subtaskId: string,
    level: ImportanceLevel,
    urgent: boolean,
  ) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || !task.subtasks) return;
    const nextSubtasks = task.subtasks.map((subtask) =>
      subtask.id === subtaskId
        ? { ...subtask, importanceLevel: level, isUrgent: urgent }
        : subtask,
    );
    void updateTask(taskId, { subtasks: nextSubtasks });
  };

  const activeMacroTask =
    viewMode === "macro" && activeTaskId
      ? tasks.find((task) => task.id === activeTaskId) ?? null
      : null;
  const activeMicroTask =
    viewMode === "micro" && activeTaskId
      ? leafTasks.find((task) => task.id === activeTaskId) ?? null
      : null;

  return (
    <div className="flex min-h-screen bg-zinc-100 font-sans text-zinc-900">
      <Sidebar />

      <main className="flex flex-1 flex-col gap-6 px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">Today&apos;s Focus</h1>
              <span className="text-xs uppercase tracking-wide text-zinc-500">
                6-Quadrant Matrix
              </span>
              {selectedProjectId && (
                <div className="flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-600">
                  {projects.find((project) => project.id === selectedProjectId)
                    ?.name ?? "Project"}
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => setSelectedProjectId(null)}
                  >
                    <XIcon className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border bg-white p-1">
            <Button
              size="sm"
              variant={viewMode === "macro" ? "secondary" : "ghost"}
              onClick={() => setViewMode("macro")}
            >
              Macro
            </Button>
            <Button
              size="sm"
              variant={viewMode === "micro" ? "secondary" : "ghost"}
              onClick={() => setViewMode("micro")}
            >
              Micro
            </Button>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <section className="flex flex-1 flex-col overflow-hidden rounded-2xl border bg-white shadow-sm">
            <div className="flex items-center border-b bg-zinc-50 px-4 py-2 text-sm font-semibold text-zinc-700">
              <div className="flex-1 border-r pr-3">🔥 Urgent</div>
              <div className="flex-1 pl-3">🗓 Normal</div>
            </div>
            <div className="flex flex-1 flex-col">
              {importanceRows.map((row, index) => {
                const urgentId = cellIdFor(row.level, true);
                const normalId = cellIdFor(row.level, false);
                const urgentMacroTasks = incompleteTasks.filter(
                  (task) =>
                    task.importanceLevel === row.level && task.isUrgent,
                );
                const normalMacroTasks = incompleteTasks.filter(
                  (task) =>
                    task.importanceLevel === row.level && !task.isUrgent,
                );
                const urgentMicroTasks = orderedLeafTasks.ordered.filter(
                  (task) =>
                    task.importanceLevel === row.level && task.isUrgent,
                );
                const normalMicroTasks = orderedLeafTasks.ordered.filter(
                  (task) =>
                    task.importanceLevel === row.level && !task.isUrgent,
                );
                const urgentItems =
                  viewMode === "macro" ? urgentMacroTasks : urgentMicroTasks;
                const normalItems =
                  viewMode === "macro" ? normalMacroTasks : normalMicroTasks;
                const urgentIds =
                  viewMode === "macro"
                    ? urgentMacroTasks.map((task) => task.id)
                    : orderedLeafTasks.orderMapByCell[urgentId] ??
                      urgentMicroTasks.map((task) => task.id);
                const normalIds =
                  viewMode === "macro"
                    ? normalMacroTasks.map((task) => task.id)
                    : orderedLeafTasks.orderMapByCell[normalId] ??
                      normalMicroTasks.map((task) => task.id);
                return (
                  <div
                    key={row.level}
                    className={`relative flex flex-1 ${
                      index < importanceRows.length - 1 ? "border-b" : ""
                    }`}
                  >
                    <div className="pointer-events-none absolute left-4 top-2 text-xs font-semibold text-zinc-500">
                      {row.label}
                    </div>
                    <DroppableCell
                      id={urgentId}
                      tone={row.tone}
                      className="border-r pt-8"
                    >
                      <div className="flex flex-1 flex-col gap-2">
                        <SortableContext
                          items={urgentIds}
                          strategy={verticalListSortingStrategy}
                        >
                          {viewMode === "macro"
                            ? urgentMacroTasks.map((task) => (
                                <DraggableTask
                                  key={task.id}
                                  task={task}
                                  onToggle={handleToggleTask}
                                  onToggleSubtask={handleToggleSubtaskInline}
                                  onUpdateTime={handleUpdateTaskTime}
                                  onUpdateSubtaskTime={handleUpdateSubtaskTime}
                                  enableSubtaskAdd
                                  onAddSubtask={handleAddSubtask}
                                  hiddenSubtaskIds={undefined}
                                projects={projects}
                                  onUpdateProject={handleUpdateTaskProject}
                                />
                              ))
                            : urgentMicroTasks.map((task) => (
                                <DraggableMicroTask
                                  key={task.id}
                                  task={task}
                                  onToggle={() =>
                                    task.parentId
                                      ? handleToggleSubtask(task.parentId, task.id)
                                      : handleToggleTask(task.id)
                                  }
                                  onUpdateTime={(minutes) =>
                                    task.parentId
                                      ? handleUpdateSubtaskTime(
                                          task.parentId,
                                          task.id,
                                          minutes,
                                        )
                                      : handleUpdateTaskTime(task.id, minutes)
                                  }
                                  projects={projects}
                                />
                              ))}
                        </SortableContext>
                        {urgentItems.length === 0 && (
                          <p className="text-xs text-zinc-400">Drop tasks here</p>
                        )}
                      </div>
                      {viewMode === "macro" && (
                        <Input
                          placeholder="Quick add..."
                          value={quickAddInputs[urgentId] ?? ""}
                          onChange={(event) =>
                            setQuickAddInputs((prev) => ({
                              ...prev,
                              [urgentId]: event.target.value,
                            }))
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") handleQuickAdd(urgentId);
                          }}
                          onPointerDown={(event) => event.stopPropagation()}
                          className="mt-auto h-8 border border-zinc-200/40 bg-transparent text-xs placeholder:text-zinc-400"
                        />
                      )}
                    </DroppableCell>
                    <DroppableCell id={normalId} tone={row.tone} className="pt-8">
                      <div className="flex flex-1 flex-col gap-2">
                        <SortableContext
                          items={normalIds}
                          strategy={verticalListSortingStrategy}
                        >
                          {viewMode === "macro"
                            ? normalMacroTasks.map((task) => (
                              <DraggableTask
                                  key={task.id}
                                  task={task}
                                onToggle={handleToggleTask}
                                  onToggleSubtask={handleToggleSubtaskInline}
                                  onUpdateTime={handleUpdateTaskTime}
                                  onUpdateSubtaskTime={handleUpdateSubtaskTime}
                                  enableSubtaskAdd
                                  onAddSubtask={handleAddSubtask}
                                  hiddenSubtaskIds={undefined}
                                projects={projects}
                                onUpdateProject={handleUpdateTaskProject}
                                />
                              ))
                            : normalMicroTasks.map((task) => (
                                <DraggableMicroTask
                                  key={task.id}
                                  task={task}
                                  onToggle={() =>
                                    task.parentId
                                      ? handleToggleSubtask(task.parentId, task.id)
                                      : handleToggleTask(task.id)
                                  }
                                  onUpdateTime={(minutes) =>
                                    task.parentId
                                      ? handleUpdateSubtaskTime(
                                          task.parentId,
                                          task.id,
                                          minutes,
                                        )
                                      : handleUpdateTaskTime(task.id, minutes)
                                  }
                                  projects={projects}
                                />
                              ))}
                        </SortableContext>
                        {normalItems.length === 0 && (
                          <p className="text-xs text-zinc-400">Drop tasks here</p>
                        )}
                      </div>
                      {viewMode === "macro" && (
                        <Input
                          placeholder="Quick add..."
                          value={quickAddInputs[normalId] ?? ""}
                          onChange={(event) =>
                            setQuickAddInputs((prev) => ({
                              ...prev,
                              [normalId]: event.target.value,
                            }))
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") handleQuickAdd(normalId);
                          }}
                          onPointerDown={(event) => event.stopPropagation()}
                          className="mt-auto h-8 border border-zinc-200/40 bg-transparent text-xs placeholder:text-zinc-400"
                        />
                      )}
                    </DroppableCell>
                  </div>
                );
              })}
            </div>
          </section>

          <DragOverlay>
            {activeMacroTask ? (
              <TaskCard task={activeMacroTask} isOverlay projects={projects} />
            ) : null}
            {activeMicroTask ? (
              <MicroTaskCard
                task={activeMicroTask}
                onToggle={() => {}}
                onUpdateTime={() => {}}
                projects={projects}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>

      <aside className="flex w-80 flex-col gap-6 border-l bg-white px-5 py-6">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase text-zinc-500">
            Available Time (min)
          </label>
          <Input
            type="number"
            min={5}
            value={availableMinutes}
            onChange={(event) => setAvailableMinutes(Number(event.target.value))}
          />
        </div>

        <div className="flex flex-1 flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-700">
              Smart Queue
            </h2>
            <span className="text-xs text-zinc-500">
              {compactCandidates.length} tasks
            </span>
          </div>
          <ScrollArea className="flex-1 rounded-lg border bg-zinc-50 p-3">
            <div className="flex flex-col gap-3">
              {compactCandidates.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start justify-between gap-3 rounded-lg bg-white p-2 text-xs shadow-sm"
                >
                  <div className="flex items-start gap-2">
                    <Checkbox
                      checked={task.isCompleted}
                      onCheckedChange={() =>
                        task.parentId
                          ? handleToggleSubtask(task.parentId, task.id)
                          : handleToggleTask(task.id)
                      }
                      onPointerDown={(event) => event.stopPropagation()}
                    />
                    <div>
                      <p
                        className={`font-medium ${
                          task.isCompleted
                            ? "text-zinc-400 line-through"
                            : "text-zinc-800"
                        }`}
                      >
                        {task.title}
                      </p>
                      <p className="text-zinc-500">
                        {task.parentTitle ? `${task.parentTitle} • ` : ""}
                        {formatImportance(task.importanceLevel)} •{" "}
                        {task.isUrgent ? "Urgent" : "Normal"}
                      </p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-zinc-500">
                    <Clock className="h-3 w-3" />
                    {task.estimatedTime}m
                  </span>
                </div>
              ))}
              {compactCandidates.length === 0 && (
                <p className="text-xs text-zinc-400">
                  No tasks fit your available time.
                </p>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-700">
              Completed Items
            </h2>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="flex flex-col gap-2 rounded-lg border bg-zinc-50 p-3 text-xs text-zinc-600">
            {completedTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-2">
                <Checkbox
                  checked={task.isCompleted}
                  onCheckedChange={() => handleToggleTask(task.id)}
                />
                <span className="text-zinc-400 line-through">{task.title}</span>
              </div>
            ))}
            {completedTasks.length === 0 && (
              <p className="text-xs text-zinc-400">No completed tasks yet.</p>
            )}
          </div>
        </div>
      </aside>

    </div>
  );
}
