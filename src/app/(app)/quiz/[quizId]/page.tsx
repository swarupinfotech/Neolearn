import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/services/auth";
import { QuizRunner } from "@/components/quiz/quiz-runner";

export const metadata: Metadata = { title: "Quiz | NeoLearn" };

export default async function QuizPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params;
  const user = await requireUser();

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: { orderBy: { order: "asc" } },
      course: { select: { slug: true, title: true } },
    },
  });
  if (!quiz) notFound();

  // Never expose answers/keys to the client — grading is server-side.
  const questions = quiz.questions.map((q) => ({
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    code: q.code,
    options: q.options as unknown,
    order: q.order,
    points: q.points,
  }));

  void user;

  return (
    <div className="max-w-3xl mx-auto">
      <QuizRunner quiz={{
        id: quiz.id,
        title: quiz.title,
        type: quiz.type,
        timerMinutes: quiz.timerMinutes,
        passingScore: quiz.passingScore,
        course: quiz.course,
      }} questions={questions} />
    </div>
  );
}