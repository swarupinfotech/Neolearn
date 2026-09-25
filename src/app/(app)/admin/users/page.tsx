import { getUsers } from "@/lib/admin-stats";
import { requireAdmin } from "@/services/auth";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/states";
import { AdminUserMenu } from "@/components/admin/admin-actions";
import { RoleBadge, Section, StatCard, StatusBadge, Table, Td } from "@/components/admin/admin-ui";
import { AdminFilterBar, Pagination } from "@/components/admin/admin-controls";
import { formatDate } from "@/lib/utils";
import { Crown, MailCheck, ShieldAlert, UserCheck, Users } from "lucide-react";

export const dynamic = "force-dynamic";

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "xp", label: "Most XP" },
  { value: "lessons", label: "Most lessons" },
  { value: "active", label: "Recently active" },
  { value: "name", label: "Name A–Z" },
] as const;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const q = (one("q") ?? "").slice(0, 80);
  const status = one("status") ?? "all";
  const role = one("role") ?? "all";
  const sort = one("sort") ?? "newest";
  const page = Math.max(1, Number(one("page") ?? 1) || 1);

  const result = await getUsers({
    q,
    status: ["all", "active", "suspended"].includes(status) ? status : "all",
    role: ["all", "ADMIN", "MODERATOR", "USER"].includes(role) ? role : "all",
    sort: SORTS.some((s) => s.value === sort) ? sort : "newest",
    page,
    pageSize: 20,
  });

  const me = await requireAdmin();

  return (
    <div className="space-y-5 pb-10">
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="All users" value={result.counts.all.toLocaleString()} icon={<Users className="h-4 w-4" />} tone="primary" />
        <StatCard label="Active" value={result.counts.active.toLocaleString()} icon={<UserCheck className="h-4 w-4" />} tone="sky" />
        <StatCard label="Suspended" value={result.counts.suspended.toLocaleString()} icon={<ShieldAlert className="h-4 w-4" />} tone="rose" />
        <StatCard label="Admins" value={result.counts.admins.toLocaleString()} icon={<Crown className="h-4 w-4" />} tone="violet" />
        <StatCard label="Unverified email" value={result.counts.unverified.toLocaleString()} icon={<MailCheck className="h-4 w-4" />} tone="amber" />
      </section>

      <AdminFilterBar
        basePath="/admin/users"
        searchPlaceholder="Search name, username or email…"
        search={q}
        selects={[
          {
            name: "status",
            value: status,
            options: [
              { value: "all", label: "Any status" },
              { value: "active", label: "Active" },
              { value: "suspended", label: "Suspended" },
            ],
          },
          {
            name: "role",
            value: role,
            options: [
              { value: "all", label: "Any role" },
              { value: "ADMIN", label: "Admin" },
              { value: "MODERATOR", label: "Moderator" },
              { value: "USER", label: "User" },
            ],
          },
          { name: "sort", value: sort, options: SORTS.map((s) => ({ value: s.value, label: s.label })) },
        ]}
      />

      <Section
        title={`${result.total.toLocaleString()} user${result.total === 1 ? "" : "s"}`}
        subtitle={`Page ${result.page} of ${Math.max(result.pageCount, 1)}`}
        bodyClassName="-mx-4 sm:-mx-5"
      >
        {result.rows.length === 0 ? (
          <EmptyState
            title="No users match these filters"
            description="Try a different search term or clear the filters."
          />
        ) : (
          <Table
            minWidth={1080}
            head={["User", "Email", "Role", "Status", "XP", "Level", "Lessons", "Posts", "Active days", "Last seen", "Joined", ""]}
          >
            {result.rows.map((u) => (
              <tr key={u.id} className="hover:bg-surface2/40">
                <Td>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={u.displayName} src={u.avatarUrl} size={30} />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{u.displayName}</p>
                      <p className="text-xs text-muted truncate">@{u.username}</p>
                    </div>
                    {u.isPremium ? <Badge tone="amber">PRO</Badge> : null}
                  </div>
                </Td>
                <Td className="text-muted">
                  <span className="flex items-center gap-1.5">
                    {u.email}
                    {u.emailVerified ? (
                      <MailCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" aria-label="Verified" />
                    ) : (
                      <Badge tone="amber">unverified</Badge>
                    )}
                  </span>
                </Td>
                <Td><RoleBadge role={u.role} /></Td>
                <Td><StatusBadge status={u.status} /></Td>
                <Td className="tabular-nums">{u.xp.toLocaleString()}</Td>
                <Td className="tabular-nums">Lv {u.level}</Td>
                <Td className="tabular-nums">{u.lessons}</Td>
                <Td className="tabular-nums">{u.posts}</Td>
                <Td className="tabular-nums">{u.activeDays}</Td>
                <Td className="text-muted whitespace-nowrap">
                  {u.lastSeenAt ? formatDate(u.lastSeenAt) : "—"}
                </Td>
                <Td className="text-muted whitespace-nowrap">{formatDate(u.createdAt)}</Td>
                <Td className="text-right">
                  <AdminUserMenu
                    userId={u.id}
                    displayName={u.displayName}
                    role={u.role}
                    status={u.status}
                    isPremium={u.isPremium}
                    emailVerified={!!u.emailVerified}
                    isSelf={u.id === me.id}
                  />
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Pagination
        basePath="/admin/users"
        page={result.page}
        pageCount={result.pageCount}
        params={{ q, status, role, sort }}
      />
    </div>
  );
}
