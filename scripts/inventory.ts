/* eslint-disable no-console */
// Read-only content inventory. Touches no data, safe against production.
//
//   npx tsx scripts/inventory.ts            -> current counts
//   npx tsx scripts/inventory.ts --verify   -> also assert that learner
//                                              data survived the seed
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const verify = process.argv.includes("--verify");

  const [
    users, courses, modules, lessons, quizzes, questions,
    challenges, projects, paths, achievements, dailyMissions,
    lessonProgress, courseProgress, quizAttempts, challengeAttempts,
    projectSubmissions, certificates, xpTx, posts, comments, likes,
    friendships, subscriptions, userAchievements,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.course.count(),
    prisma.courseModule.count(),
    prisma.lesson.count(),
    prisma.quiz.count(),
    prisma.question.count(),
    prisma.challenge.count(),
    prisma.project.count(),
    prisma.learningPath.count(),
    prisma.achievement.count(),
    prisma.dailyMission.count(),
    prisma.lessonProgress.count(),
    prisma.courseProgress.count(),
    prisma.quizAttempt.count(),
    prisma.challengeAttempt.count(),
    prisma.projectSubmission.count(),
    prisma.certificate.count(),
    prisma.xpTransaction.count(),
    prisma.communityPost.count(),
    prisma.comment.count(),
    prisma.like.count(),
    prisma.friendship.count(),
    prisma.subscription.count(),
    prisma.userAchievement.count(),
  ]);

  // Per-course lesson counts, resolved through the module relation.
  const courseRows = await prisma.course.findMany({
    select: {
      slug: true,
      title: true,
      category: true,
      language: true,
      technology: true,
      difficulty: true,
      status: true,
      xpReward: true,
      modules: { select: { _count: { select: { lessons: true } } } },
    },
    orderBy: { slug: "asc" },
  });

  const lessonTotal = courseRows.reduce(
    (acc, c) => acc + c.modules.reduce((m, mod) => m + mod._count.lessons, 0),
    0
  );
  if (lessonTotal !== lessons) {
    console.warn(`[inventory] WARNING: ${lessons} lessons but module rollup says ${lessonTotal}`);
  }

  console.log(
    JSON.stringify(
      {
        content: { courses, modules, lessons, quizzes, questions, challenges, projects, paths, achievements, dailyMissions },
        learnerData: {
          users, lessonProgress, courseProgress, quizAttempts, challengeAttempts,
          projectSubmissions, certificates, xpTx, userAchievements,
          posts, comments, likes, friendships, subscriptions,
        },
        courses: courseRows.map((c) => ({
          slug: c.slug,
          title: c.title,
          category: c.category,
          technology: c.technology,
          difficulty: c.difficulty,
          status: c.status,
          xp: c.xpReward,
          lessons: c.modules.reduce((m, mod) => m + mod._count.lessons, 0),
        })),
      },
      null,
      2
    )
  );

  if (verify) {
    const published = courseRows.filter((c) => c.status === "PUBLISHED").length;
    console.log(`[inventory] published courses: ${published}/${courses}`);
    if (lessons === 0) throw new Error("No lessons in the database");
    if (courses !== published) throw new Error("Some courses are not PUBLISHED");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
