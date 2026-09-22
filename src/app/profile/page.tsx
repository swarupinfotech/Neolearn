import { redirect } from "next/navigation";
import { requireUser } from "@/services/auth";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser();
  redirect(`/profile/${user.username}`);
}