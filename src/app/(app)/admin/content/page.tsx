import Link from "next/link";
import {
  BookOpen,
  FolderKanban,
  GraduationCap,
  Layers,
  ListChecks,
  PackageCheck,
  Swords,
} from "lucide-react";
import { getContent } from "@/lib/admin-stats";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { AdminCourseMenu } from "@/components/admin/admin-actions";
import { CourseStatusBadge, Section, StatCard, Table, Td } from "@/components/admin/admin-ui";
import { BarChart } from "@/components/admin/charts";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const c = await getContent();
  const s = c.summary;

  const topByEnrollment = [...c.courses]
    .sort((a, b) => b.enrollments - a.enrollments)
    .slice(0, 8)
    .map((x) => ({ label: x.title.slice(0, 18), value: x.enrollments }));

  return (
    <div className="space-y-5 pb-10">
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Courses"
          value={s.courses}
          sub={`${s.publishedCourses} published`}
          icon={<BookOpen className="h-4 w-4" />}
          tone="primary"
        />
        <StatCard label="Modules" value={s.modules} sub={`${s.lessons} lessons`} icon={<Layers className="h-4 w-4" />} tone="sky" />
        <StatCard
          label="Assessments"
          value={s.quizzes}
          sub={`${s.questions} questions`}
          icon={<ListChecks className="h-4 w-4" />}
          tone="violet"
        />
        <StatCard
          label="Practice"
          value={s.challenges + s.projects}
          sub={`${s.challenges} challenges · ${s.projects} projects`}
          icon={<Swords className="h-4 w-4" />}
          tone="amber"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <Section
            title="Catalogue"
            subtitle="Every course with its structure and performance"
            bodyClassName="-mx-4 sm:-mx-5"
            className="p-0 sm:p-0 border-0 bg-transparent"
          >
            {c.courses.length === 0 ? (
              <EmptyState title="No courses yet" description="Seed the database to create the starter catalogue." />
            ) : (
              <Table
                minWidth={1000}
                head={["Course", "Status", "Modules", "Lessons", "Enrollments", "Avg progress", "Completions", "Updated", ""]}
              >
                {c.courses.map((row) => (
                  <tr key={row.id} className="hover:bg-surface2/40">
                    <Td>
                      <Link href={`/courses/${row.slug}`} className="font-medium hover:text-primary">
                        {row.title}
                      </Link>
                      <p className="text-xs text-muted font-mono">/{row.slug}</p>
                    </Td>
                    <Td><CourseStatusBadge status={row.status} /></Td>
                    <Td className="tabular-nums">{row.modules}</Td>
                    <Td className="tabular-nums">{row.lessons}</Td>
                    <Td className="tabular-nums">{row.enrollments}</Td>
                    <Td>
                      <div className="flex items-center gap-2 min-w-[110px]">
                        <div className="flex-1 h-1.5 rounded-full bg-surface2 overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(row.avgProgress, 1.5)}%` }} />
                        </div>
                        <span className="text-xs tabular-nums text-muted w-8 text-right">{row.avgProgress}%</span>
                      </div>
                    </Td>
                    <Td className="tabular-nums">{row.completions}</Td>
                    <Td className="text-muted whitespace-nowrap">{formatDate(row.updatedAt)}</Td>
                    <Td className="text-right">
                      <AdminCourseMenu courseId={row.id} title={row.title} status={row.status} />
                    </Td>
                  </tr>
                ))}
              </Table>
            )}
          </Section>
        </Card>

        <div className="space-y-4">
          <Section title="Enrollments by course" subtitle="Where learners are enrolled">
            {topByEnrollment.every((x) => x.value === 0) ? (
              <p className="text-sm text-muted">No enrollments recorded yet.</p>
            ) : (
              <BarChart data={topByEnrollment} height={160} color="#22c55e" />
            )}
          </Section>

          <Section title="Content mix">
            <ul className="space-y-3">
              <Mix icon={<BookOpen className="h-4 w-4" />} label="Courses" value={s.courses} href="/courses" />
              <Mix icon={<GraduationCap className="h-4 w-4" />} label="Learning paths" value={s.paths} href="/paths" />
              <Mix icon={<Swords className="h-4 w-4" />} label="Challenges" value={s.challenges} href="/challenges" />
              <Mix icon={<FolderKanban className="h-4 w-4" />} label="Projects" value={s.projects} href="/projects" />
              <Mix icon={<PackageCheck className="h-4 w-4" />} label="Lessons" value={s.lessons} />
            </ul>
          </Section>
        </div>
      </section>
    </div>
  );
}

function Mix({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: number; href?: string }) {
  const inner = (
    <li className="flex items-center gap-2.5">
      <span className="text-muted">{icon}</span>
      <span className="text-sm text-muted">{label}</span>
      <span className="ml-auto text-sm font-semibold tabular-nums">{value.toLocaleString()}</span>
    </li>
  );
  if (!href) return inner;
  return (
    <li>
      <Link href={href} className="block hover:opacity-80">
        {inner}
      </Link>
    </li>
  );
}
