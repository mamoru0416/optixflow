"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Sidebar } from "@/components/sidebar";
import { useApp } from "@/context/AppContext";
import {
  MoreHorizontal,
  Plus,
} from "lucide-react";
import { Project } from "@/lib/mock-data";

type ProjectStats = {
  total: number;
  completed: number;
  remaining: number;
  completionRate: number;
};

export default function ProjectsPage() {
  const router = useRouter();
  const {
    projects,
    tasks,
    addProject,
    updateProject,
    deleteProject,
    setSelectedProjectId,
  } = useApp();
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [projectDialogMode, setProjectDialogMode] = useState<
    "create" | "edit"
  >("create");
  const [projectForm, setProjectForm] = useState({
    id: "",
    name: "",
    color: "#6366f1",
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    color: "#6366f1",
  });

  const colorPresets = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#0ea5e9", "#a855f7"];

  const projectStats = useMemo(() => {
    const statsMap = new Map<string, ProjectStats>();
    projects.forEach((project) => {
      const projectTasks = tasks.filter(
        (task) => task.projectId === project.id,
      );
      let total = 0;
      let completed = 0;
      projectTasks.forEach((task) => {
        const hasSubtasks = task.subtasks && task.subtasks.length > 0;
        if (hasSubtasks) {
          total += task.subtasks?.length ?? 0;
          task.subtasks?.forEach((subtask) => {
            if (subtask.isCompleted) completed += 1;
          });
          return;
        }
        total += 1;
        if (task.isCompleted) completed += 1;
      });
      const remaining = Math.max(total - completed, 0);
      const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);
      statsMap.set(project.id, { total, completed, remaining, completionRate });
    });
    return statsMap;
  }, [projects, tasks]);

  const openEditProject = (project: Project) => {
    setProjectForm({ id: project.id, name: project.name, color: project.color });
    setProjectDialogMode("edit");
    setProjectDialogOpen(true);
  };

  const handleSaveProject = () => {
    if (!projectForm.name.trim()) return;
    if (projectDialogMode === "create") {
      const newProject: Project = {
        id: crypto.randomUUID(),
        name: projectForm.name.trim(),
        color: projectForm.color,
      };
      addProject(newProject);
    } else {
      updateProject(projectForm.id, {
        name: projectForm.name.trim(),
        color: projectForm.color,
      });
    }
    setProjectDialogOpen(false);
  };

  const openDeleteProject = (project: Project) => {
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!projectToDelete) return;
    const targetId = projectToDelete.id;
    deleteProject(targetId);
    setDeleteDialogOpen(false);
    setProjectToDelete(null);
  };

  const handleCreateProject = () => {
    if (!createForm.name.trim()) return;
    addProject({
      id: crypto.randomUUID(),
      name: createForm.name.trim(),
      color: createForm.color,
    });
    setCreateForm({ name: "", color: colorPresets[0] });
    setCreateDialogOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-zinc-100 font-sans text-zinc-900">
      <Sidebar />

      <main className="flex flex-1 flex-col gap-6 px-6 py-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Projects Overview
          </p>
          <h1 className="text-2xl font-semibold">Project Portfolio</h1>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const stats = projectStats.get(project.id) ?? {
              total: 0,
              completed: 0,
              remaining: 0,
              completionRate: 0,
            };
            return (
              <Card key={project.id} className="flex flex-col gap-4 p-5">
                <div className="flex items-center gap-3">
                  <span
                    className="h-8 w-1 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold">{project.name}</h2>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon-sm" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditProject(project)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-500 focus:text-red-500"
                        onClick={() => openDeleteProject(project)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>Progress</span>
                    <span>{stats.completionRate}%</span>
                  </div>
                  <Progress value={stats.completionRate} />
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-600">
                  <div>
                    <p className="font-semibold text-zinc-800">
                      {stats.total}
                    </p>
                    <p>Total Tasks</p>
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-800">
                      {stats.remaining}
                    </p>
                    <p>Remaining</p>
                  </div>
                </div>

                <Button
                  className="mt-auto"
                  onClick={() => {
                    setSelectedProjectId(project.id);
                    router.push("/");
                  }}
                >
                  Open Project
                </Button>
              </Card>
            );
          })}
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Card className="flex cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed bg-transparent p-6 text-center transition-colors hover:bg-muted/50">
                <Plus className="h-8 w-8 text-muted-foreground" />
                <p className="font-medium text-muted-foreground">
                  Create New Project
                </p>
              </Card>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <label className="text-sm text-zinc-600">
                  Project Name
                  <Input
                    value={createForm.name}
                    onChange={(event) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                    className="mt-1"
                  />
                </label>
                <label className="text-sm text-zinc-600">
                  Color
                  <div className="mt-2 flex flex-wrap gap-2">
                    {colorPresets.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`h-7 w-7 rounded-full border ${
                          createForm.color === color
                            ? "border-zinc-900"
                            : "border-transparent"
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() =>
                          setCreateForm((prev) => ({ ...prev, color }))
                        }
                      />
                    ))}
                  </div>
                </label>
              </div>
              <DialogFooter className="mt-4">
                <Button variant="ghost" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateProject}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </section>
      </main>

      <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {projectDialogMode === "create"
                ? "Create Project"
                : "Edit Project"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <label className="text-sm text-zinc-600">
              Name
              <Input
                value={projectForm.name}
                onChange={(event) =>
                  setProjectForm((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                className="mt-1"
              />
            </label>
            <label className="text-sm text-zinc-600">
              Color
              <div className="mt-2 flex flex-wrap gap-2">
                {colorPresets.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`h-7 w-7 rounded-full border ${
                      projectForm.color === color
                        ? "border-zinc-900"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() =>
                      setProjectForm((prev) => ({ ...prev, color }))
                    }
                  />
                ))}
              </div>
            </label>
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="ghost"
              onClick={() => setProjectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveProject}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-600">
            {projectToDelete
              ? `"${projectToDelete.name}" will be removed from the sidebar.`
              : "This project will be removed from the sidebar."}
          </p>
          <DialogFooter className="mt-4">
            <Button
              variant="ghost"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
