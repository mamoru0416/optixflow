"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = React.useState(true);
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    const loadUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        toast(error.message);
      }
      if (!mounted) return;
      setUser(data.user ?? null);
      setIsLoadingUser(false);
      if (!data.user) {
        router.push("/login");
      }
    };
    void loadUser();
    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  const handlePasswordUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast("Passwords do not match.");
      return;
    }
    setIsUpdating(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsUpdating(false);
    if (error) {
      toast(error.message);
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    toast("Password updated successfully.");
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsDeleting(true);
    const { data: tasksData, error: tasksError } = await supabase
      .from("tasks")
      .select("id")
      .eq("user_id", user.id);
    if (tasksError) {
      toast(tasksError.message);
      setIsDeleting(false);
      return;
    }
    const taskIds = tasksData?.map((task) => task.id) ?? [];
    if (taskIds.length > 0) {
      const { error: subtaskError } = await supabase
        .from("subtasks")
        .delete()
        .in("task_id", taskIds);
      if (subtaskError) {
        toast(subtaskError.message);
        setIsDeleting(false);
        return;
      }
    }
    const { error: tasksDeleteError } = await supabase
      .from("tasks")
      .delete()
      .eq("user_id", user.id);
    if (tasksDeleteError) {
      toast(tasksDeleteError.message);
      setIsDeleting(false);
      return;
    }
    const { error: projectsDeleteError } = await supabase
      .from("projects")
      .delete()
      .eq("user_id", user.id);
    if (projectsDeleteError) {
      toast(projectsDeleteError.message);
      setIsDeleting(false);
      return;
    }
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen bg-zinc-100 font-sans text-zinc-900">
      <Sidebar />
      <main className="flex flex-1 flex-col gap-6 px-6 py-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Settings
          </p>
          <h1 className="text-2xl font-semibold">Account Settings</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Password Update</CardTitle>
            <CardDescription>
              Update your password to keep your account secure.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handlePasswordUpdate}>
              <div className="space-y-2">
                <label className="text-sm font-medium">New Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Confirm New Password</label>
                <div className="relative">
                  <Input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowConfirm((prev) => !prev)}
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={isUpdating || isLoadingUser}
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Change Password"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Danger Zone</CardTitle>
            <CardDescription>
              Deleting your account is permanent and cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={() => setIsDeleteOpen(true)}
              disabled={isLoadingUser}
            >
              Delete Account
            </Button>
          </CardContent>
        </Card>
      </main>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete account?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete your account and all associated data.
          </p>
          <DialogFooter className="mt-4">
            <Button
              variant="ghost"
              onClick={() => setIsDeleteOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete Account"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
