"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import {
  changePasswordAction,
  resendVerificationAction,
  updateProfileAction,
} from "@/actions/settings";

export interface SettingsInitial {
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  email: string;
  emailVerified: boolean;
  skills: string[];
  premium: boolean;
}

export function SettingsClient({ initial }: { initial: SettingsInitial }) {
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [bio, setBio] = useState(initial.bio);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl ?? "");
  const [skills, setSkills] = useState(initial.skills.join(", "));
  const [isPending, startTransition] = useTransition();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  function saveProfile() {
    startTransition(() => {
      updateProfileAction({
        displayName,
        bio,
        avatarUrl: avatarUrl.trim() ? avatarUrl.trim() : null,
        skills: skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 20),
      }).then((res) => {
        if (res.ok) toast.success("Profile updated");
        else toast.error(res.error ?? "Could not update profile.");
      });
    });
  }

  function savePassword() {
    if (!currentPassword || !newPassword) {
      toast.error("Fill in both password fields.");
      return;
    }
    startTransition(() => {
      changePasswordAction({ currentPassword, newPassword }).then((res) => {
        if (res.ok) {
          toast.success("Password changed");
          setCurrentPassword("");
          setNewPassword("");
        } else {
          toast.error(res.error ?? "Could not change password.");
        }
      });
    });
  }

  function resend() {
    startTransition(() => {
      resendVerificationAction().then((res) => {
        if (res.ok) toast.success("Verification email sent");
        else toast.error(res.error ?? "Could not send verification email.");
      });
    });
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="font-semibold mb-4">Profile</h2>
        <div className="mb-4">
          <Label htmlFor="username">Username</Label>
          <Input id="username" value={initial.username} disabled />
          <p className="text-xs text-muted mt-1">Username is your public handle and can&apos;t be changed.</p>
        </div>
        <div className="mb-4">
          <Label htmlFor="displayName">Display name</Label>
          <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div className="mb-4">
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell the community about yourself…" />
        </div>
        <div className="mb-4">
          <Label htmlFor="skills">Skills (comma separated)</Label>
          <Input id="skills" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Python, JavaScript, SQL" />
        </div>
        <div className="mb-4">
          <Label htmlFor="avatarUrl">Avatar URL</Label>
          <Input id="avatarUrl" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…" />
        </div>
        <Button onClick={saveProfile} disabled={isPending}>Save profile</Button>
      </Card>

      {!initial.emailVerified ? (
        <Card className="p-6">
          <h2 className="font-semibold mb-1">Email verification</h2>
          <p className="text-sm text-muted mb-4">
            Verify <span className="text-fg">{initial.email}</span> to unlock full account features.
          </p>
          <Button variant="secondary" onClick={resend} disabled={isPending}>Send verification email</Button>
        </Card>
      ) : null}

      <Card className="p-6">
        <h2 className="font-semibold mb-4">Change password</h2>
        <div className="mb-4">
          <Label htmlFor="current">Current password</Label>
          <Input id="current" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
        </div>
        <div className="mb-4">
          <Label htmlFor="newPassword">New password</Label>
          <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <p className="text-xs text-muted mt-1">At least 8 characters with a letter and a number.</p>
        </div>
        <Button variant="secondary" onClick={savePassword} disabled={isPending}>Change password</Button>
      </Card>
    </div>
  );
}