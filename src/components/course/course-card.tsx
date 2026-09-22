import Link from "next/link";
import { Clock, Users, Star, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";

export interface CourseCardData {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  language: string;
  difficulty: string;
  rating: number;
  students: number;
  duration: number;
  icon: string;
  color: string;
  progressPct?: number;
}

const toneByCategory: Record<string, "green" | "blue" | "amber" | "rose" | "violet" | "neutral"> = {
  Programming: "green",
  "Web Development": "blue",
  Database: "violet",
  Cybersecurity: "rose",
  DevOps: "amber",
};

export function CourseCard({ course }: { course: CourseCardData }) {
  return (
    <Link
      href={`/courses/${course.slug}`}
      className="card card-hover p-5 flex flex-col group border-l-4"
      style={{ borderLeftColor: course.color }}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-white font-bold text-sm shrink-0"
          style={{ backgroundColor: course.color }}
          aria-hidden
        >
          {course.language.slice(0, 2).toUpperCase()}
        </span>
        <Badge tone={toneByCategory[course.category] ?? "neutral"}>{course.difficulty}</Badge>
      </div>

      <h3 className="font-semibold mt-3 group-hover:text-primary transition-colors">{course.title}</h3>
      <p className="text-sm text-muted mt-1 line-clamp-2 flex-1">{course.description}</p>

      <div className="flex items-center gap-3 mt-3 text-xs text-muted">
        <span className="flex items-center gap-1">
          <Star className="h-3.5 w-3.5 text-amber-500" /> {course.rating.toFixed(1)}
        </span>
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" /> {course.students.toLocaleString()}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" /> {course.duration}m
        </span>
        <span className="flex items-center gap-1">
          <BookOpen className="h-3.5 w-3.5" /> {course.category}
        </span>
      </div>

      {typeof course.progressPct === "number" ? (
        <ProgressBar value={course.progressPct} className="mt-4" label="Progress" />
      ) : null}
    </Link>
  );
}