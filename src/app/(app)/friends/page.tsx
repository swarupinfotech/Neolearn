import type { Metadata } from "next";
import { Users } from "lucide-react";
import { requireUser } from "@/services/auth";
import { listFriends, listPendingRequests } from "@/services/friends";
import { FriendsClient } from "@/components/friends/friends-client";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Friends | NeoLearn" };

export default async function FriendsPage() {
  const user = await requireUser();
  const [friends, requests] = await Promise.all([
    listFriends(user.id),
    listPendingRequests(user.id),
  ]);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header>
        <div className="flex items-center gap-2 mb-2">
          <Users className="h-6 w-6 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">Friends</h1>
        </div>
        <p className="text-muted">Stay connected with fellow learners and share your progress.</p>
      </header>

      <FriendsClient currentUserId={user.id} initialRequests={requests} initialFriends={friends.users} />

      {friends.users.length === 0 ? (
        <p className="text-sm text-muted -mt-4">No friends yet — search for learners to connect with.</p>
      ) : null}
    </div>
  );
}