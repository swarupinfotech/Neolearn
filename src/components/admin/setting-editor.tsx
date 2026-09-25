"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminDeleteSettingAction, adminSetSettingAction } from "@/actions/admin";

export function SettingEditor({ initial }: { initial: { key: string; value: string }[] }) {
  const [rows, setRows] = useState(initial);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [isPending, startTransition] = useTransition();

  const save = (key: string, value: string) =>
    startTransition(async () => {
      const res = await adminSetSettingAction({ key, value });
      if (res.ok) toast.success(`Saved ${key}`);
      else toast.error(res.error ?? "Failed to save");
    });

  const remove = (key: string) =>
    startTransition(async () => {
      const res = await adminDeleteSettingAction({ key });
      if (res.ok) {
        setRows((r) => r.filter((x) => x.key !== key));
        toast.success(`Deleted ${key}`);
      } else toast.error(res.error ?? "Failed to delete");
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder="setting key"
          aria-label="New setting key"
          className="h-9 px-2.5 rounded-lg border border-border bg-surface text-sm font-mono outline-none focus:border-primary"
        />
        <input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="value (JSON or plain text)"
          aria-label="New setting value"
          className="h-9 px-2.5 rounded-lg border border-border bg-surface text-sm font-mono outline-none focus:border-primary flex-1 min-w-[200px]"
        />
        <Button
          size="sm"
          disabled={isPending || !newKey.trim()}
          onClick={() =>
            startTransition(async () => {
              const res = await adminSetSettingAction({ key: newKey.trim(), value: newValue });
              if (res.ok) {
                setRows((r) => [
                  ...r.filter((x) => x.key !== newKey.trim()),
                  { key: newKey.trim(), value: newValue },
                ]);
                setNewKey("");
                setNewValue("");
                toast.success("Setting created");
              } else toast.error(res.error ?? "Failed");
            })
          }
        >
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">No settings stored yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <SettingRow
              key={r.key}
              setting={r}
              disabled={isPending}
              onSave={(v) => save(r.key, v)}
              onDelete={() => remove(r.key)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function SettingRow({
  setting,
  onSave,
  onDelete,
  disabled,
}: {
  setting: { key: string; value: string };
  onSave: (value: string) => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState(setting.value);
  const dirty = value !== setting.value;

  return (
    <li className="flex flex-wrap items-center gap-2 py-2.5">
      <span className="font-mono text-xs text-muted w-full sm:w-56 truncate" title={setting.key}>
        {setting.key}
      </span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label={`Value for ${setting.key}`}
        className="h-8 px-2.5 rounded-md border border-border bg-surface text-sm font-mono outline-none focus:border-primary flex-1 min-w-[160px]"
      />
      <Button size="sm" variant="outline" disabled={disabled || !dirty} onClick={() => onSave(value)}>
        <Save className="h-3.5 w-3.5" /> Save
      </Button>
      <Button size="sm" variant="ghost" disabled={disabled} onClick={onDelete} aria-label={`Delete ${setting.key}`}>
        <Trash2 className="h-3.5 w-3.5 text-rose-500" />
      </Button>
    </li>
  );
}
