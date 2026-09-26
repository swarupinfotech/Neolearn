import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, Target, Wrench } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/services/auth";
import { getProjectBySlug } from "@/services/projects";
import { Badge } from "@/components/ui/badge";
import { ProjectRunner } from "@/components/project/project-runner";

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];
}

type TaskItem = { title: string; detail: string };

function asTasks(v: unknown): TaskItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((t) => {
      if (t && typeof t === "object") {
        const o = t as Record<string, unknown>;
        return { title: String(o.title ?? ""), detail: String(o.detail ?? "") };
      }
      return { title: String(t ?? ""), detail: "" };
    })
    .filter((t) => t.title.length > 0);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await prisma.project.findUnique({
    where: { slug },
    select: { title: true, description: true, status: true },
  });
  if (!p || p.status !== "PUBLISHED") return { title: "Project not found" };
  return { title: `${p.title} | NeoLearn`, description: p.description.slice(0, 158) };
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser();
  const project = await getProjectBySlug(slug);
  if (!project || project.status !== "PUBLISHED") notFound();

  const requirements = asStringArray(project.requirements);
  const objectives = asStringArray(project.objectives);
  const technologies = asStringArray(project.technologies);
  const criteria = asStringArray(project.criteria);
  const tasks = asTasks(project.tasks);
  const tests =
    (project.publicTests as unknown as { name: string; input?: unknown; setup?: string; expected: unknown }[]) ?? [];

  const best = await prisma.projectSubmission.findFirst({
    where: { userId: user.id, projectId: project.id, passed: true },
    select: { id: true },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="card p-6">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge tone="blue">{project.language}</Badge>
          {project.difficulty ? <Badge tone="amber">{project.difficulty}</Badge> : null}
          <Badge tone="green">+{project.xpReward} XP</Badge>
          {best ? <Badge tone="green">Completed</Badge> : null}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold">{project.title}</h1>
        <p className="text-muted mt-2">{project.description}</p>
        {technologies.length > 0 ? (
          <ul className="flex flex-wrap items-center gap-2 mt-4" aria-label="Technologies used">
            <li className="text-xs text-muted flex items-center gap-1">
              <Wrench className="h-3.5 w-3.5" /> Uses
            </li>
            {technologies.map((t) => (
              <li key={t}>
                <Badge tone="neutral">{t}</Badge>
              </li>
            ))}
          </ul>
        ) : null}
      </header>

      {objectives.length > 0 ? (
        <section className="card p-5" aria-labelledby="project-objectives">
          <h2 id="project-objectives" className="font-semibold mb-3 flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" /> What you will build
          </h2>
          <ul className="grid sm:grid-cols-2 gap-2">
            {objectives.map((o) => (
              <li key={o} className="flex items-start gap-2 text-sm text-muted">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {tasks.length > 0 ? (
        <section className="card p-5" aria-labelledby="project-tasks">
          <h2 id="project-tasks" className="font-semibold mb-3">
            Suggested build steps
          </h2>
          <ol className="space-y-3">
            {tasks.map((t, i) => (
              <li key={i} className="flex gap-3">
                <span className="h-6 w-6 shrink-0 rounded-full border border-border text-xs flex items-center justify-center text-muted">
                  {i + 1}
                </span>
                <span>
                  <span className="block text-sm font-medium">{t.title}</span>
                  {t.detail ? <span className="block text-sm text-muted mt-0.5">{t.detail}</span> : null}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {requirements.length > 0 ? (
        <section className="card p-5" aria-labelledby="project-requirements">
          <h2 id="project-requirements" className="font-semibold mb-3">
            Requirements
          </h2>
          <ul className="space-y-2 text-sm">
            {requirements.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-primary">•</span>
                <span className="text-fg/90">{r}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {criteria.length > 0 ? (
        <section className="card p-5" aria-labelledby="project-criteria">
          <h2 id="project-criteria" className="font-semibold mb-3">
            How this is graded
          </h2>
          <ul className="space-y-2 text-sm text-muted">
            {criteria.map((c, i) => (
              <li key={i} className="flex gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ProjectRunner
        language={project.language}
        starterCode={project.starterCode}
        tests={tests}
        projectId={project.id}
        slug={project.slug}
        xpReward={project.xpReward}
      />
    </div>
  );
}
