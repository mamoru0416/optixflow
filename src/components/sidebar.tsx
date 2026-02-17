"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useApp } from "@/context/AppContext";
import {
  FolderKanban,
  Grid3X3,
  Home as HomeIcon,
  LayoutDashboard,
  MoreHorizontal,
  Plus,
  Settings,
  UserCircle,
} from "lucide-react";
import { Project } from "@/lib/mock-data";

const COLOR_PRESETS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#0ea5e9", "#a855f7"];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    projects,
    selectedProjectId,
    setSelectedProjectId,
    addProject,
    updateProject,
    deleteProject,
    user,
    signOut,
  } = useApp();
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [projectDialogMode, setProjectDialogMode] = useState<"create" | "edit">(
    "create",
  );
  const [projectForm, setProjectForm] = useState({
    id: "",
    name: "",
    color: COLOR_PRESETS[0],
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const openCreateProject = () => {
    setProjectForm({ id: "", name: "", color: COLOR_PRESETS[0] });
    setProjectDialogMode("create");
    setProjectDialogOpen(true);
  };

  const openEditProject = (project: Project) => {
    setProjectForm({ id: project.id, name: project.name, color: project.color });
    setProjectDialogMode("edit");
    setProjectDialogOpen(true);
  };

  const handleSaveProject = () => {
    if (!projectForm.name.trim()) return;
    if (projectDialogMode === "create") {
      addProject({
        id: crypto.randomUUID(),
        name: projectForm.name.trim(),
        color: projectForm.color,
      });
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
    deleteProject(projectToDelete.id);
    setDeleteDialogOpen(false);
    setProjectToDelete(null);
  };

  const handleHome = () => {
    setSelectedProjectId(null);
    router.push("/");
  };

  const handleProjectSelect = (projectId: string) => {
    setSelectedProjectId(projectId);
    router.push("/");
  };

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <aside className="flex w-64 flex-col gap-6 border-r bg-white px-5 py-4">
      <div className="flex items-center gap-2 text-base">
        <Grid3X3 className="h-5 w-5 text-zinc-700" />
        <span className="font-bold text-zinc-900">Optix Flow</span>
      </div>
      <nav className="flex flex-col gap-2 text-sm text-zinc-600">
        <Button
          variant={pathname === "/" && !selectedProjectId ? "secondary" : "ghost"}
          className="justify-start gap-2"
          onClick={handleHome}
        >
          <HomeIcon className="h-4 w-4" /> Home
        </Button>
        <Button
          variant={pathname === "/dashboard" ? "secondary" : "ghost"}
          className="justify-start gap-2"
          asChild
        >
          <Link href="/dashboard">
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </Link>
        </Button>
        <Button
          variant={pathname === "/projects" ? "secondary" : "ghost"}
          className="justify-start gap-2"
          asChild
        >
          <Link href="/projects">
            <FolderKanban className="h-4 w-4" /> Projects
          </Link>
        </Button>
      </nav>
      <Separator />
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Projects
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {projects.map((project) => {
          const isSelected = selectedProjectId === project.id;
          return (
            <div
              key={project.id}
              className={`group flex items-center gap-2 rounded-lg px-2 py-1 text-sm ${
                isSelected
                  ? "bg-zinc-100 text-zinc-900"
                  : "text-zinc-700 hover:bg-zinc-100"
              }`}
              onClick={() => handleProjectSelect(project.id)}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: project.color }}
              />
              <span className="flex-1 truncate">{project.name}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="opacity-0 transition-opacity group-hover:opacity-100"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                  >
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
          );
        })}
        <Button
          variant="ghost"
          className="justify-start gap-2 text-sm text-zinc-600"
          onClick={openCreateProject}
        >
          <Plus className="h-4 w-4" />
          Add Project
        </Button>
      </div>
      <div className="mt-auto flex flex-col gap-2">
        <Button
          variant={pathname === "/settings" ? "secondary" : "ghost"}
          className="justify-start gap-2 text-sm text-zinc-600"
          asChild
        >
          <Link href="/settings">
            <Settings className="h-4 w-4" /> Settings
          </Link>
        </Button>
        <div className="rounded-lg border bg-zinc-50 p-3">
        <p className="text-xs font-semibold uppercase text-zinc-500">Account</p>
        <div className="mt-2">
          {user ? (
            <div className="flex items-center justify-between gap-2 text-sm text-zinc-700">
              <div className="flex items-center gap-2 truncate">
                <UserCircle className="h-4 w-4 text-zinc-600" />
                <span className="truncate">{user.email ?? "Signed in"}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          ) : (
            <Button asChild variant="ghost" className="w-full justify-start">
              <Link href="/login">Login / Sign Up</Link>
            </Button>
          )}
        </div>
        </div>
      </div>

      <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {projectDialogMode === "create" ? "Create Project" : "Edit Project"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <label className="text-sm text-zinc-600">
              Project Name
              <Input
                value={projectForm.name}
                onChange={(event) =>
                  setProjectForm((prev) => ({ ...prev, name: event.target.value }))
                }
                className="mt-1"
              />
            </label>
            <div className="text-sm text-zinc-600">
              Color
              <div className="mt-2 flex flex-wrap gap-2">
                {COLOR_PRESETS.map((color) => (
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
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setProjectDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProject}>
              {projectDialogMode === "create" ? "Create" : "Save"}
            </Button>
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
            <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
