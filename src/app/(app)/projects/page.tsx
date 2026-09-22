import type { Metadata } from "next";
import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { requireUser } from "@/services/auth";
import { listProjects } from "@/services/projects";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";

export const metadata: Metadata = { title: "Projects | NeoLearn" };

export default async function ProjectsPage() {
  const user = await requireUser();
  const projects = await listProjects();

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-2 mb-2">
          <FolderKanban className="h-6 w-6 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">Projects</h1>
        </div>
        <p className="text-muted max-w-2xl">
          Build real, runnable projects with passing test suites. Server-graded against the full test set.
        </p>
      </header>

      {projects.length === 0 ? (
        <EmptyState title="No projects yet" description="Guided projects are being prepared." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p, i) => (
            <Link key={p.id} href={`/projects/${p.slug}`}>
              <Card className="card-hover h-full">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold group-hover:text-primary transition-colors">{i + 1}. {p.title}</h3>
                  <Badge tone="blue">{p.language}</Badge>
                </div>
                <p className="text-sm text-muted mt-2 line-clamp-2">{p.description}</p>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                  <span className="text-xs text-primary font-semibold">+{p.xpReward} XP</span>
                  <span className="text-xs text-muted">
                    {(Array.isArray(p.publicTests) ? (p.publicTests as unknown[]).length : 0)} test cases
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}