import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/services/auth";
import { getProjectBySlug } from "@/services/projects";
import { Badge } from "@/components/ui/badge";
import { ProjectRunner } from "@/components/project/project-runner";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await prisma.project.findUnique({ where: { slug }, select: { title: true, description: true } });
  if (!p) return { title: "Project not found" };
  return { title: `${p.title} | NeoLearn`, description: p.description };
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser();
  const project = await getProjectBySlug(slug);
  if (!project || project.status !== "PUBLISHED") notFound();

  const requirements = (project.requirements as unknown as string[]) ?? [];
  const tests = (project.publicTests as unknown as { name: string; input?: unknown; setup?: string; expected: unknown }[]) ?? [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="card p-6">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge tone="blue">{project.language}</Badge>
          <Badge tone="green">+{project.xpReward} XP</Badge>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold">{project.title}</h1>
        <p className="text-muted mt-2">{project.description}</p>
      </header>

      <section className="card p-5">
        <h2 className="font-semibold mb-3">Requirements</h2>
        {requirements.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {requirements.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-primary">•</span>
                <span className="text-fg/90">{r}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">This project has no explicit requirements listed.</p>
        )}
      </section>

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