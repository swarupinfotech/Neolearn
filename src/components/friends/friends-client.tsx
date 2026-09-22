"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/form";
import {
  acceptFriendAction,
  removeFriendAction,
  searchUsersAction,
  sendFriendAction,
} from "@/actions/friends";
import { UserPlus, Check, X, Search } from "lucide-react";

export interface FriendUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  xp: number;
  level: number;
}

export function FriendsClient({
  currentUserId,
  initialRequests,
  initialFriends,
}: {
  currentUserId: string;
  initialRequests: FriendUser[];
  initialFriends: FriendUser[];
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [friends, setFriends] = useState(initialFriends);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FriendUser[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [isPending, startTransition] = useTransition();

  function accept(id: string) {
    startTransition(() => {
      acceptFriendAction(id).then((res) => {
        if (res.ok) {
          setRequests((prev) => prev.filter((u) => u.id !== id));
          const added = initialFriends.find((f) => f.id !== id);
          void added;
          toast.success("Friend added!");
        } else {
          toast.error(res.error ?? "Could not accept.");
        }
      });
    });
  }

  function remove(id: string, name: string) {
    startTransition(() => {
      removeFriendAction(id).then((res) => {
        if (res.ok) {
          setFriends((prev) => prev.filter((u) => u.id !== id));
          toast.success(`Removed ${name}`);
        }
      });
    });
  }

  function search() {
    if (!query.trim()) return;
    setSearching(true);
    searchUsersAction(query).then((res) => {
      setSearching(false);
      if (res.ok) setResults(res.users ?? []);
    });
  }

  function send(id: string) {
    startTransition(() => {
      sendFriendAction(id).then((res) => {
        if (res.ok) {
          toast.success("Request sent!");
        } else {
          toast.error(res.error ?? "Could not send request.");
        }
      });
    });
  }

  return (
    <div className="space-y-8">
      <Card className="p-5">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" /> Find learners
        </h2>
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), search())}
            placeholder="Search by username or display name…"
            aria-label="Search learners"
          />
          <Button variant="secondary" onClick={search} disabled={searching}>
            {searching ? "Searching…" : "Search"}
          </Button>
        </div>
        {results ? (
          results.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {results.map((u) => {
                const isFriend = friends.some((f) => f.id === u.id);
                const isRequest = requests.some((r) => r.id === u.id);
                return (
                  <li key={u.id} className="flex items-center gap-3">
                    <Avatar name={u.displayName} src={u.avatarUrl} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{u.displayName}</p>
                      <p className="text-xs text-muted">@{u.username} · {u.xp.toLocaleString()} XP</p>
                    </div>
                    {isFriend ? (
                      <Badge tone="green">Friends</Badge>
                    ) : isRequest ? (
                      <Button size="sm" variant="secondary" disabled>Requested</Button>
                    ) : (
                      <Button size="sm" onClick={() => send(u.id)} disabled={isPending}>
                        <UserPlus className="h-3.5 w-3.5" /> Add
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted">No learners matched.</p>
          )
        ) : null}
      </Card>

      {requests.length > 0 ? (
        <section>
          <h2 className="font-semibold mb-3">
            Incoming requests <Badge tone="rose">{requests.length}</Badge>
          </h2>
          <ul className="space-y-2">
            {requests.map((r) => (
              <li key={r.id}>
                <Card className="p-4 flex items-center gap-3">
                  <Avatar name={r.displayName} src={r.avatarUrl} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{r.displayName}</p>
                    <p className="text-xs text-muted">@{r.username}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => accept(r.id)} disabled={isPending}>
                    <Check className="h-3.5 w-3.5" /> Accept
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(r.id, r.displayName)} disabled={isPending}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {friends.length > 0 ? (
        <section>
          <h2 className="font-semibold mb-3">Friends ({friends.length})</h2>
          <ul className="space-y-2">
            {friends.map((u) => (
              <li key={u.id}>
                <a href={`/profile/${u.username}`} className="card p-4 flex items-center gap-3 card-hover block">
                  <Avatar name={u.displayName} src={u.avatarUrl} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{u.displayName}</p>
                    <p className="text-xs text-muted">@{u.username}</p>
                  </div>
                  <Badge tone="neutral">LV {u.level}</Badge>
                  <span className="text-sm font-semibold">{u.xp.toLocaleString()} XP</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}