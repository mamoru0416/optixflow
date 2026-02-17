"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Sidebar } from "@/components/sidebar";
import { useApp } from "@/context/AppContext";
import { LayoutDashboard } from "lucide-react";

const dayKey = (date: Date) => date.toISOString().slice(0, 10);

export default function DashboardPage() {
  const { tasks, projects } = useApp();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalTasks = tasks.length;

  const {
    activityData,
    totalFocusMinutes,
    completedUnits,
    totalUnits,
  } = useMemo(() => {
    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - 6);
    const baseDays = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(today.getDate() - (6 - index));
      return {
        key: dayKey(date),
        label: date.toLocaleDateString("en-US", { weekday: "short" }),
        minutes: 0,
      };
    });
    const dayMap = new Map(baseDays.map((day) => [day.key, day]));
    let totalMinutes = 0;
    let totalUnits = 0;
    let completedUnits = 0;

    tasks.forEach((task) => {
      const hasSubtasks = task.subtasks && task.subtasks.length > 0;
      if (hasSubtasks) {
        const subtaskCount = task.subtasks?.length ?? 0;
        totalUnits += subtaskCount;
        task.subtasks?.forEach((subtask) => {
          if (subtask.isCompleted) completedUnits += 1;
          if (!subtask.isCompleted) return;
          if (!subtask.completedAt) return;
          const completed = new Date(subtask.completedAt);
          if (completed < start || completed > today) return;
          const key = dayKey(completed);
          const bucket = dayMap.get(key);
          if (bucket) {
            bucket.minutes += task.estimatedTime / subtaskCount;
          }
          totalMinutes += task.estimatedTime / subtaskCount;
        });
        return;
      }

      totalUnits += 1;
      if (!task.isCompleted) return;
      completedUnits += 1;
      if (!task.completedAt) return;
      const completed = new Date(task.completedAt);
      if (completed < start || completed > today) return;
      const key = dayKey(completed);
      const bucket = dayMap.get(key);
      if (bucket) bucket.minutes += task.estimatedTime;
      totalMinutes += task.estimatedTime;
    });

    return {
      activityData: baseDays,
      totalFocusMinutes: totalMinutes,
      completedUnits,
      totalUnits,
    };
  }, [tasks]);

  const velocityPerDay = totalFocusMinutes / 7;
  const completionRate =
    totalUnits === 0 ? 0 : Math.round((completedUnits / totalUnits) * 100);

  const projectAllocation = useMemo(() => {
    const totals = new Map<string, number>();
    tasks.forEach((task) => {
      const hasSubtasks = task.subtasks && task.subtasks.length > 0;
      if (hasSubtasks) {
        const subtaskCount = task.subtasks?.length ?? 0;
        task.subtasks?.forEach((subtask) => {
          if (!subtask.isCompleted || !subtask.completedAt) return;
          const completed = new Date(subtask.completedAt);
          if (
            completed < new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) ||
            completed > new Date()
          ) {
            return;
          }
          const key = task.projectId ?? "unassigned";
          totals.set(
            key,
            (totals.get(key) ?? 0) + task.estimatedTime / subtaskCount,
          );
        });
        return;
      }
      if (!task.isCompleted || !task.completedAt) return;
      const completed = new Date(task.completedAt);
      if (
        completed < new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) ||
        completed > new Date()
      ) {
        return;
      }
      const key = task.projectId ?? "unassigned";
      totals.set(key, (totals.get(key) ?? 0) + task.estimatedTime);
    });
    return Array.from(totals.entries()).map(([projectId, minutes]) => {
      const project =
        projectId === "unassigned"
          ? { name: "Unassigned", color: "#94a3b8" }
          : projects.find((item) => item.id === projectId);
      return {
        name: project?.name ?? "Unassigned",
        value: minutes,
        color: project?.color ?? "#94a3b8",
      };
    });
  }, [tasks, projects]);

  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-zinc-100 font-sans text-zinc-900">
      <Sidebar />

      <main className="flex flex-1 flex-col gap-6 px-6 py-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Dashboard
          </p>
          <h1 className="text-2xl font-semibold">Productivity Insights</h1>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <Card className="flex flex-col gap-2 p-4">
            <span className="text-xs uppercase text-zinc-500">
              Total Focus (7d)
            </span>
            <span className="text-3xl font-semibold">
              {(totalFocusMinutes / 60).toFixed(1)} hrs
            </span>
            <span className="text-xs text-zinc-500">completed time</span>
          </Card>
          <Card className="flex flex-col gap-2 p-4">
            <span className="text-xs uppercase text-zinc-500">Velocity</span>
            <span className="text-3xl font-semibold">
              {(velocityPerDay / 60).toFixed(1)} hrs
            </span>
            <span className="text-xs text-zinc-500">per day</span>
          </Card>
          <Card className="flex flex-col gap-2 p-4">
            <span className="text-xs uppercase text-zinc-500">Completion</span>
            <span className="text-3xl font-semibold">{completionRate}%</span>
            <span className="text-xs text-zinc-500">
              {completedUnits}/{totalUnits} items
            </span>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-[2fr,1fr]">
          <Card className="p-4">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-zinc-700">
                Velocity (Last 7 Days)
              </h2>
              <p className="text-xs text-zinc-500">
                Daily completed minutes
              </p>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={activityData}>
                  <XAxis dataKey="label" stroke="#71717a" fontSize={12} />
                  <YAxis stroke="#71717a" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: "#f4f4f5" }}
                    contentStyle={{
                      borderRadius: "0.75rem",
                      borderColor: "#e4e4e7",
                    }}
                  />
                  <Bar
                    dataKey="minutes"
                    fill="hsl(var(--primary))"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-zinc-700">
                Project Allocation
              </h2>
              <p className="text-xs text-zinc-500">
                Completed minutes by project
              </p>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <PieChart>
                  <Pie
                    data={projectAllocation}
                    dataKey="value"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                  >
                    {projectAllocation.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: "0.75rem",
                      borderColor: "#e4e4e7",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex flex-col gap-2 text-xs text-zinc-600">
              {projectAllocation.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span>{entry.name}</span>
                  <span className="ml-auto font-semibold">{entry.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
}
