import { prisma } from "@/lib/db";

// ============================================================
// Server-side analytics for the admin console.
// Every query is grouped to minimise round-trips: the dashboard
// runs on every request, so it must stay cheap and never throw.
// ============================================================

const DAY = 24 * 60 * 60 * 1000;

/**
 * Short-lived in-process cache. Admin analytics are read-only and tolerate
 * being a minute stale, but the primary lives in ap-southeast-2 - without
 * this every dashboard request pays ~20 sequential round trips.
 */
function withTtl<T>(key: string, ttlMs: number, compute: () => Promise<T>): Promise<T> {
  const store = globalThis as unknown as {
    __adminStatsCache?: Map<string, { at: number; value: Promise<T> }>;
  };
  store.__adminStatsCache ??= new Map();

  const hit = store.__adminStatsCache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value;

  const value = compute().catch((err) => {
    // never cache failures - let the next request retry
    store.__adminStatsCache!.delete(key);
    throw err;
  });
  store.__adminStatsCache.set(key, { at: Date.now(), value });
  return value;
}

export function dayKeys(days: number, from = new Date()): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(from.getTime() - i * DAY);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function since(days: number) {
  return new Date(Date.now() - days * DAY);
}

/** Bucket rows by day so a single query serves the whole chart. */
function bucketByDay<T extends { createdAt: Date }>(rows: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const r of rows) {
    const k = r.createdAt.toISOString().slice(0, 10);
    const list = map.get(k);
    if (list) list.push(r);
    else map.set(k, [r]);
  }
  return map;
}

export interface SeriesPoint {
  date: string;
  value: number;
}

export interface Kpi {
  label: string;
  value: number;
  previous: number;
  unit?: string;
  hint?: string;
}

/** Shape of the single round-trip count query used by the overview. */
interface TotalsRow {
  users: number;
  active_users: number;
  suspended: number;
  admins: number;
  premium: number;
  new_users_7d: number;
  new_users_prev_7d: number;
  courses: number;
  lessons: number;
  quizzes: number;
  challenges: number;
  projects: number;
  paths: number;
  posts: number;
  comments: number;
  reports: number;
  open_reports: number;
  certificates: number;
  subscriptions: number;
  code_runs: number;
  lesson_completions: number;
  quiz_attempts: number;
  challenge_attempts: number;
  project_submissions: number;
  code_executions: number;
  onboards: number;
}

async function lessonCountsByCourse(): Promise<Map<string, number>> {
  const modules = await prisma.courseModule.findMany({ select: { id: true, courseId: true } });
  if (modules.length === 0) return new Map();
  const grouped = await prisma.lesson.groupBy({
    by: ["moduleId"],
    _count: { _all: true },
    where: { moduleId: { in: modules.map((m) => m.id) } },
  });
  const perModule = new Map(grouped.map((g) => [g.moduleId, g._count._all]));
  const perCourse = new Map<string, number>();
  for (const m of modules) {
    perCourse.set(m.courseId, (perCourse.get(m.courseId) ?? 0) + (perModule.get(m.id) ?? 0));
  }
  return perCourse;
}

export interface Overview {
  totals: {
    users: number;
    activeUsers: number;
    suspended: number;
    admins: number;
    premium: number;
    newUsers7d: number;
    courses: number;
    lessons: number;
    quizzes: number;
    challenges: number;
    projects: number;
    paths: number;
    posts: number;
    comments: number;
    reports: number;
    openReports: number;
    certificates: number;
    subscriptions: number;
    codeRuns: number;
  };
  kpis: Kpi[];
  traffic: SeriesPoint[];
  registrations: SeriesPoint[];
  signupsToday: number;
  activeToday: number;
  active7d: number;
  active30d: number;
  dau: number[];
  engagement: {
    lessonCompletions: number;
    quizAttempts: number;
    challengeAttempts: number;
    projectSubmissions: number;
    codeExecutions: number;
  };
  funnel: { step: string; value: number; pct: number }[];
  topCourses: {
    slug: string;
    title: string;
    enrollments: number;
    completions: number;
    avgProgress: number;
  }[];
  topUsers: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl: string | null;
    xp: number;
    level: number;
    lessons: number;
    joined: Date;
  }[];
  recentEvents: { type: string; count: number }[];
  health: {
    dbOk: boolean;
    dbLatencyMs: number;
    uncheckedMigrations: boolean;
  };
}

async function computeOverview(): Promise<Overview> {
  const days = 30;
  const from30 = since(days);
  const from7 = since(7);
  const prev7 = since(14);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // One round trip for every scalar the overview needs. The primary is ~500ms
  // away, so 28 separate counts would cost ~7s of pure queueing.
  //
  // Every count is cast to ::int: PostgreSQL returns count(*) as bigint, which
  // Prisma hands back as a BigInt, and mixing that with the Number arithmetic
  // below throws "Cannot mix BigInt and other types".
  const dbLatencyStart = Date.now();
  const totals = await prisma.$queryRaw<TotalsRow[]>`
    SELECT
      (SELECT count(*)::int FROM "User")                                        AS users,
      (SELECT count(*)::int FROM "User" WHERE status = 'active')               AS active_users,
      (SELECT count(*)::int FROM "User" WHERE status = 'suspended')             AS suspended,
      (SELECT count(*)::int FROM "User" WHERE role = 'ADMIN')                  AS admins,
      (SELECT count(*)::int FROM "User" WHERE "isPremium" = true)              AS premium,
      (SELECT count(*)::int FROM "User" WHERE "createdAt" >= ${from7})          AS new_users_7d,
      (SELECT count(*)::int FROM "User" WHERE "createdAt" >= ${prev7} AND "createdAt" < ${from7}) AS new_users_prev_7d,
      (SELECT count(*)::int FROM "Course")                                      AS courses,
      (SELECT count(*)::int FROM "Lesson")                                      AS lessons,
      (SELECT count(*)::int FROM "Quiz")                                        AS quizzes,
      (SELECT count(*)::int FROM "Challenge")                                   AS challenges,
      (SELECT count(*)::int FROM "Project")                                     AS projects,
      (SELECT count(*)::int FROM "LearningPath")                                AS paths,
      (SELECT count(*)::int FROM "CommunityPost")                               AS posts,
      (SELECT count(*)::int FROM "Comment")                                     AS comments,
      (SELECT count(*)::int FROM "CommunityReport")                             AS reports,
      (SELECT count(*)::int FROM "CommunityReport" WHERE status = 'OPEN')       AS open_reports,
      (SELECT count(*)::int FROM "Certificate")                                 AS certificates,
      (SELECT count(*)::int FROM "Subscription")                                AS subscriptions,
      (SELECT count(*)::int FROM "CodeExecutionLog")                            AS code_runs,
      (SELECT count(*)::int FROM "LessonProgress" WHERE "completedAt" >= ${from30})  AS lesson_completions,
      (SELECT count(*)::int FROM "QuizAttempt" WHERE "startedAt" >= ${from30})      AS quiz_attempts,
      (SELECT count(*)::int FROM "ChallengeAttempt" WHERE "createdAt" >= ${from30}) AS challenge_attempts,
      (SELECT count(*)::int FROM "ProjectSubmission" WHERE "submittedAt" >= ${from30}) AS project_submissions,
      (SELECT count(*)::int FROM "CodeExecutionLog" WHERE "createdAt" >= ${from30})  AS code_executions,
      (SELECT count(*)::int FROM "Onboarding")                                  AS onboards
  `;
  const dbLatencyMs = Date.now() - dbLatencyStart;
  const dbOk = !!totals[0];
  const t = totals[0];

  const [
    newUserRows,
    pageViewRows,
    eventRows7d,
    eventRowsPrev7d,
    lessonProgress,
    quizAttempts,
    challengeAttempts,
    projectSubmissions,
    courseProgress,
  ] = await Promise.all([
    prisma.user.findMany({ where: { createdAt: { gte: from30 } }, select: { createdAt: true } }),
    prisma.pageView.findMany({ where: { createdAt: { gte: from30 } }, select: { createdAt: true } }),
    prisma.analyticsEvent.findMany({
      where: { createdAt: { gte: from7 } },
      select: { type: true, createdAt: true, userId: true },
    }),
    prisma.analyticsEvent.findMany({
      where: { createdAt: { gte: prev7, lt: from7 } },
      select: { type: true, userId: true },
    }),
    prisma.lessonProgress.findMany({ where: { completedAt: { gte: from30 } }, select: { userId: true } }),
    prisma.quizAttempt.findMany({ where: { startedAt: { gte: from30 } }, select: { userId: true } }),
    prisma.challengeAttempt.findMany({ where: { createdAt: { gte: from30 } }, select: { userId: true } }),
    prisma.projectSubmission.findMany({ where: { submittedAt: { gte: from30 } }, select: { userId: true } }),
    prisma.courseProgress.findMany({
      where: { updatedAt: { gte: from30 } },
      select: { completed: true, completedLessons: true, totalLessons: true, courseId: true },
    }),
  ]);

  const users = t.users;
  const totalUsers = users;
  const newUsers7d = t.new_users_7d;
  const newUsersPrev7d = t.new_users_prev_7d;
  const openReports = t.open_reports;
  const quizAttemptsTotal = t.quiz_attempts;
  const challengeAttemptsTotal = t.challenge_attempts;
  const projectSubmissionsTotal = t.project_submissions;
  const onboards = t.onboards;

  const keys = dayKeys(days);
  const newUsersByDay = bucketByDay(newUserRows);
  const viewsByDay = bucketByDay(pageViewRows);

  const registrations: SeriesPoint[] = keys.map((k) => ({
    date: k,
    value: newUsersByDay.get(k)?.length ?? 0,
  }));
  const traffic: SeriesPoint[] = keys.map((k) => ({
    date: k,
    value: viewsByDay.get(k)?.length ?? 0,
  }));

  const evByDay = bucketByDay(eventRows7d);
  const dau = dayKeys(7).map((k) => {
    const set = new Set<string>();
    for (const e of evByDay.get(k) ?? []) if (e.userId) set.add(e.userId);
    return set.size;
  });

  const unique7 = new Set(eventRows7d.map((e) => e.userId).filter(Boolean) as string[]);
  const uniquePrev7 = new Set(eventRowsPrev7d.map((e) => e.userId).filter(Boolean) as string[]);
  const activeTodayCount = new Set(
    eventRows7d.filter((e) => e.createdAt >= today).map((e) => e.userId).filter(Boolean) as string[]
  ).size;
  const signupsToday = newUserRows.length;

  const kpis: Kpi[] = [
    { label: "Total users", value: users, previous: users - newUsers7d, hint: "all time" },
    { label: "New signups (7d)", value: newUsers7d, previous: newUsersPrev7d, hint: "vs previous 7d" },
    { label: "Active users (7d)", value: unique7.size, previous: uniquePrev7.size, hint: "unique actors" },
    { label: "Page views (30d)", value: traffic.reduce((a, b) => a + b.value, 0), previous: 0, hint: "tracked visits" },
    { label: "Premium members", value: t.premium, previous: 0, hint: "paying" },
    { label: "Open reports", value: openReports, previous: 0, hint: "needs moderation" },
  ];

  // Funnel: registered -> onboarded -> learning -> completed something -> certified
  const engagedUsers = new Set<string>();
  for (const list of [lessonProgress, quizAttempts, challengeAttempts, projectSubmissions]) {
    for (const r of list) engagedUsers.add(r.userId);
  }
  const lessonCompleters = new Set(lessonProgress.map((r) => r.userId)).size;
  const funnel = [
    { step: "Registered", value: users, pct: 100 },
    { step: "Onboarded", value: onboards, pct: Math.round((onboards / totalUsers) * 100) },
    { step: "Active in 30d", value: engagedUsers.size, pct: Math.round((engagedUsers.size / totalUsers) * 100) },
    { step: "Completed a lesson", value: lessonCompleters, pct: Math.round((lessonCompleters / totalUsers) * 100) },
    { step: "Certified", value: t.certificates, pct: Math.round((t.certificates / totalUsers) * 100) },
  ];

  const [courseAgg, topUsers, groupedEvents, active30Rows] = await Promise.all([
    prisma.course.findMany({
      select: {
        id: true,
        slug: true,
        title: true,
        _count: { select: { courseProgress: true } },
      },
      take: 100,
    }),
    prisma.user.findMany({
      orderBy: { xp: "desc" },
      take: 8,
      select: {
        id: true,
        displayName: true,
        username: true,
        avatarUrl: true,
        xp: true,
        level: true,
        createdAt: true,
        _count: { select: { lessonProgress: true } },
      },
    }),
    prisma.analyticsEvent.groupBy({ by: ["type"], _count: { _all: true }, orderBy: { _count: { type: "desc" } } }),
    prisma.analyticsEvent.findMany({ where: { createdAt: { gte: from30 } }, select: { userId: true } }),
  ]);

  const progByCourse = new Map<string, { sum: number; n: number; done: number }>();
  for (const p of courseProgress) {
    const cur = progByCourse.get(p.courseId) ?? { sum: 0, n: 0, done: 0 };
    const pctDone = p.totalLessons > 0 ? (p.completedLessons / p.totalLessons) * 100 : 0;
    cur.sum += pctDone;
    cur.n += 1;
    if (p.completed) cur.done += 1;
    progByCourse.set(p.courseId, cur);
  }
  const topCourses = courseAgg
    .map((c) => {
      const agg = progByCourse.get(c.id);
      return {
        slug: c.slug,
        title: c.title,
        enrollments: c._count.courseProgress,
        completions: agg?.done ?? 0,
        avgProgress: agg && agg.n ? Math.round(agg.sum / agg.n) : 0,
      };
    })
    .sort((a, b) => b.enrollments - a.enrollments)
    .slice(0, 8);

  return {
    totals: {
      users,
      activeUsers: t.active_users,
      suspended: t.suspended,
      admins: t.admins,
      premium: t.premium,
      newUsers7d,
      courses: t.courses,
      lessons: t.lessons,
      quizzes: t.quizzes,
      challenges: t.challenges,
      projects: t.projects,
      paths: t.paths,
      posts: t.posts,
      comments: t.comments,
      reports: t.reports,
      openReports,
      certificates: t.certificates,
      subscriptions: t.subscriptions,
      codeRuns: t.code_runs,
    },
    kpis,
    traffic,
    registrations,
    signupsToday,
    activeToday: activeTodayCount,
    active7d: unique7.size,
    active30d: new Set(active30Rows.map((e) => e.userId).filter(Boolean) as string[]).size,
    dau,
    engagement: {
      lessonCompletions: t.lesson_completions,
      quizAttempts: quizAttemptsTotal,
      challengeAttempts: challengeAttemptsTotal,
      projectSubmissions: projectSubmissionsTotal,
      codeExecutions: t.code_executions,
    },
    funnel,
    topCourses,
    topUsers: topUsers.map((u) => ({
      id: u.id,
      displayName: u.displayName,
      username: u.username,
      avatarUrl: u.avatarUrl,
      xp: u.xp,
      level: u.level,
      lessons: u._count.lessonProgress,
      joined: u.createdAt,
    })),
    recentEvents: groupedEvents.map((g) => ({ type: g.type, count: g._count._all })),
    health: { dbOk, dbLatencyMs, uncheckedMigrations: false },
  };
}

export interface TrafficReport {
  range: { days: number; label: string };
  views: SeriesPoint[];
  uniqueVisitors: SeriesPoint[];
  totals: { views: number; unique: number; bots: number; avgPerDay: number };
  topPages: { path: string; views: number; unique: number }[];
  sources: { source: string; views: number; unique: number }[];
  devices: { device: string; views: number; unique: number }[];
  browsers: { browser: string; views: number; unique: number }[];
  os: { os: string; views: number; unique: number }[];
  countries: { country: string; views: number; unique: number }[];
  referrers: { referrer: string; views: number }[];
  hourly: number[];
}

async function computeTraffic(days: number): Promise<TrafficReport> {
  const from = since(days);
  const rows = await prisma.pageView.findMany({
    where: { createdAt: { gte: from } },
    select: {
      path: true,
      createdAt: true,
      source: true,
      device: true,
      browser: true,
      os: true,
      country: true,
      referrer: true,
      ipHash: true,
      userId: true,
    },
  });

  const keys = dayKeys(days);
  const byDay = bucketByDay(rows);
  const views: SeriesPoint[] = keys.map((k) => ({ date: k, value: byDay.get(k)?.length ?? 0 }));
  const uniqueVisitors: SeriesPoint[] = keys.map((k) => {
    const dayRows = byDay.get(k) ?? [];
    const s = new Set<string>();
    for (const r of dayRows) s.add(r.ipHash ?? r.userId ?? `${r.createdAt.getTime()}-${Math.random()}`);
    return { date: k, value: s.size };
  });

  const group = (
    pick: (r: (typeof rows)[number]) => string | null
  ): { key: string; views: number; unique: number }[] => {
    const m = new Map<string, { views: number; ips: Set<string> }>();
    for (const r of rows) {
      const k = pick(r) ?? "unknown";
      const cur = m.get(k) ?? { views: 0, ips: new Set<string>() };
      cur.views += 1;
      if (r.ipHash) cur.ips.add(r.ipHash);
      m.set(k, cur);
    }
    return [...m.entries()]
      .map(([key, v]) => ({ key, views: v.views, unique: v.ips.size }))
      .sort((a, b) => b.views - a.views);
  };

  const pageMap = new Map<string, { views: number; ips: Set<string> }>();
  for (const r of rows) {
    const cur = pageMap.get(r.path) ?? { views: 0, ips: new Set<string>() };
    cur.views += 1;
    if (r.ipHash) cur.ips.add(r.ipHash);
    pageMap.set(r.path, cur);
  }

  const hourly = Array.from({ length: 24 }, () => 0);
  for (const r of rows) hourly[r.createdAt.getUTCHours()] += 1;

  const uniqueAll = new Set(rows.map((r) => r.ipHash).filter(Boolean) as string[]);

  return {
    range: { days, label: `Last ${days} days` },
    views,
    uniqueVisitors,
    totals: {
      views: rows.length,
      unique: uniqueAll.size,
      bots: rows.filter((r) => r.device === "bot").length,
      avgPerDay: Math.round(rows.length / days),
    },
    topPages: [...pageMap.entries()]
      .map(([path, v]) => ({ path, views: v.views, unique: v.ips.size }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 12),
    sources: group((r) => r.source).slice(0, 10).map((x) => ({ source: x.key, views: x.views, unique: x.unique })),
    devices: group((r) => r.device).map((x) => ({ device: x.key, views: x.views, unique: x.unique })),
    browsers: group((r) => r.browser).slice(0, 8).map((x) => ({ browser: x.key, views: x.views, unique: x.unique })),
    os: group((r) => r.os).slice(0, 8).map((x) => ({ os: x.key, views: x.views, unique: x.unique })),
    countries: group((r) => r.country).slice(0, 10).map((x) => ({ country: x.key, views: x.views, unique: x.unique })),
    referrers: group((r) => r.referrer)
      .filter((x) => x.key !== "unknown")
      .slice(0, 8)
      .map((x) => ({ referrer: x.key, views: x.views })),
    hourly,
  };
}

export interface UserRow {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  status: string;
  isPremium: boolean;
  xp: number;
  level: number;
  emailVerified: Date | null;
  createdAt: Date;
  lastSeenAt: Date | null;
  lessons: number;
  posts: number;
  /** Distinct days with recorded activity in the last 30 days. */
  activeDays: number;
}

export interface UserListResult {
  rows: UserRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  counts: { all: number; active: number; suspended: number; admins: number; premium: number; unverified: number };
}

async function computeUsers(opts: {
  q?: string;
  role?: string;
  status?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}): Promise<UserListResult> {
  const pageSize = Math.min(Math.max(opts.pageSize ?? 25, 5), 100);
  const page = Math.max(opts.page ?? 1, 1);
  const where: Record<string, unknown> = {};
  if (opts.role && opts.role !== "all") where.role = opts.role;
  if (opts.status && opts.status !== "all") where.status = opts.status;
  if (opts.q) {
    where.OR = [
      { email: { contains: opts.q, mode: "insensitive" } },
      { username: { contains: opts.q, mode: "insensitive" } },
      { displayName: { contains: opts.q, mode: "insensitive" } },
    ];
  }

  const orderBy: Record<string, unknown> = { createdAt: "desc" };
  if (opts.sort === "xp") orderBy.xp = "desc";
  if (opts.sort === "name") orderBy.displayName = "asc";
  if (opts.sort === "level") orderBy.level = "desc";

  const [total, rows, all, active, suspendedUsers, admins, premium, unverified] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        status: true,
        isPremium: true,
        xp: true,
        level: true,
        emailVerified: true,
        createdAt: true,
        lessonProgress: { select: { updatedAt: true }, take: 1, orderBy: { updatedAt: "desc" } },
        _count: { select: { communityPosts: true, pageViews: true } },
      },
    }),
    prisma.user.count(),
    prisma.user.count({ where: { status: "active" } }),
    prisma.user.count({ where: { status: "suspended" } }),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.user.count({ where: { isPremium: true } }),
    prisma.user.count({ where: { emailVerified: null } }),
  ]);

  // Sessions are stateless JWTs, so there is no session table to count. The
  // closest honest signal is how many distinct days each user was active on.
  const pageIds = rows.map((r) => r.id);
  const activitySince = since(30);
  const activeRows = pageIds.length
    ? await prisma.analyticsEvent.findMany({
        where: { userId: { in: pageIds }, createdAt: { gte: activitySince } },
        select: { userId: true, createdAt: true },
      })
    : [];
  const activeDays = new Map<string, Set<string>>();
  for (const e of activeRows) {
    if (!e.userId) continue;
    const set = activeDays.get(e.userId) ?? new Set<string>();
    set.add(e.createdAt.toISOString().slice(0, 10));
    activeDays.set(e.userId, set);
  }

  return {
    rows: rows.map((u) => ({
      id: u.id,
      email: u.email,
      username: u.username,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      role: u.role,
      status: u.status,
      isPremium: u.isPremium,
      xp: u.xp,
      level: u.level,
      emailVerified: u.emailVerified,
      createdAt: u.createdAt,
      lastSeenAt: u.lessonProgress[0]?.updatedAt ?? null,
      lessons: u._count.pageViews,
      posts: u._count.communityPosts,
      activeDays: activeDays.get(u.id)?.size ?? 0,
    })),
    total,
    page,
    pageSize,
    pageCount: Math.max(Math.ceil(total / pageSize), 1),
    counts: { all, active, suspended: suspendedUsers, admins, premium, unverified },
  };
}

export interface ContentReport {
  summary: {
    courses: number;
    lessons: number;
    modules: number;
    quizzes: number;
    questions: number;
    challenges: number;
    projects: number;
    paths: number;
    publishedCourses: number;
  };
  courses: {
    id: string;
    slug: string;
    title: string;
    status: string;
    lessons: number;
    modules: number;
    enrollments: number;
    avgProgress: number;
    completions: number;
    updatedAt: Date;
  }[];
  engagement: { label: string; value: number }[];
}

async function computeContent(): Promise<ContentReport> {
  const [
    courses,
    lessons,
    modules,
    quizzes,
    questions,
    challenges,
    projects,
    paths,
    publishedCourses,
    courseRows,
    progress,
    quizAttempts,
    challengeAttempts,
    projectSubmissions,
    codeRuns,
  ] = await Promise.all([
    prisma.course.count(),
    prisma.lesson.count(),
    prisma.courseModule.count(),
    prisma.quiz.count(),
    prisma.question.count(),
    prisma.challenge.count(),
    prisma.project.count(),
    prisma.learningPath.count(),
    prisma.course.count({ where: { status: "PUBLISHED" } }),
    prisma.course.findMany({
      select: {
        id: true,
        slug: true,
        title: true,
        status: true,
        updatedAt: true,
        _count: { select: { modules: true, courseProgress: true } },
      },
      orderBy: { title: "asc" },
      take: 100,
    }),
    prisma.courseProgress.findMany({ select: { courseId: true, completedLessons: true, totalLessons: true, completed: true } }),
    prisma.quizAttempt.count(),
    prisma.challengeAttempt.count(),
    prisma.projectSubmission.count(),
    prisma.codeExecutionLog.count(),
  ]);

  const agg = new Map<string, { sum: number; n: number; done: number }>();
  for (const p of progress) {
    const cur = agg.get(p.courseId) ?? { sum: 0, n: 0, done: 0 };
    const pctDone = p.totalLessons > 0 ? (p.completedLessons / p.totalLessons) * 100 : 0;
    cur.sum += pctDone;
    cur.n += 1;
    if (p.completed) cur.done += 1;
    agg.set(p.courseId, cur);
  }

  const contentLessons = await lessonCountsByCourse();

  return {
    summary: { courses, lessons, modules, quizzes, questions, challenges, projects, paths, publishedCourses },
    courses: courseRows.map((c) => {
      const a = agg.get(c.id);
      return {
        id: c.id,
        slug: c.slug,
        title: c.title,
        status: c.status,
        lessons: contentLessons.get(c.id) ?? 0,
        modules: c._count.modules,
        enrollments: c._count.courseProgress,
        avgProgress: a && a.n ? Math.round(a.sum / a.n) : 0,
        completions: a?.done ?? 0,
        updatedAt: c.updatedAt,
      };
    }),
    engagement: [
      { label: "Quiz attempts", value: quizAttempts },
      { label: "Challenge attempts", value: challengeAttempts },
      { label: "Project submissions", value: projectSubmissions },
      { label: "Code runs", value: codeRuns },
    ],
  };
}


// ============================================================
// Public, cached entry points used by the admin pages.
// ============================================================

const OVERVIEW_TTL = 60_000;
const TRAFFIC_TTL = 60_000;
const USERS_TTL = 30_000;
const CONTENT_TTL = 120_000;

export function getOverview(): Promise<Overview> {
  return withTtl("overview", OVERVIEW_TTL, computeOverview);
}

export function getTraffic(days: number): Promise<TrafficReport> {
  const safe = [7, 30, 90, 365].includes(days) ? days : 30;
  return withTtl(`traffic:${safe}`, TRAFFIC_TTL, () => computeTraffic(safe));
}

export function getUsers(opts: {
  q?: string;
  role?: string;
  status?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}): Promise<UserListResult> {
  const key = `users:${opts.q ?? ""}:${opts.role ?? "all"}:${opts.status ?? "all"}:${opts.sort ?? "newest"}:${opts.page ?? 1}:${opts.pageSize ?? 25}`;
  return withTtl(key, USERS_TTL, () => computeUsers(opts));
}

export function getContent(): Promise<ContentReport> {
  return withTtl("content", CONTENT_TTL, computeContent);
}

/** Called after any admin mutation so the next read is never stale. */
export function invalidateAdminStats() {
  const store = globalThis as unknown as { __adminStatsCache?: Map<string, unknown> };
  store.__adminStatsCache?.clear();
}
