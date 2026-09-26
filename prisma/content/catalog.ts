// ============================================================
// Curriculum blueprint — the single source of truth for the catalog.
//
// Structure only: what each course covers, how it is categorised, how
// hard it is, and which courses and paths it feeds. Authoring files
// under prisma/content/courses/ hold the lesson prose and import their
// shape from here, so a course cannot drift out of sync with the
// catalog filters or the learning paths.
//
// Nothing here talks to the database. It is data the UI, the authoring
// files and the tests all read, which is what makes "43 courses" a
// verifiable claim rather than a number in a README.
//
// Difficulty spread is deliberately uneven. An all-Beginner catalog is
// useless to anyone who already knows the basics, and most of these
// languages have no meaningful beginner path shorter than fundamentals.
// ============================================================

export type CatalogCategory =
  | "Programming"
  | "Web Development"
  | "Database"
  | "Cybersecurity"
  | "DevOps"
  | "Cloud"
  | "Data & AI";

export type CatalogDifficulty = "Beginner" | "Intermediate" | "Advanced";

/**
 * How a course's practice work is delivered.
 *
 * - `executable`      runs in the browser sandbox. Only legal when the
 *                     course's technology is in EXECUTABLE_TECH below —
 *                     the sandbox runs Python (standard library only; the
 *                     worker disables `fetch` before user code runs, so
 *                     numpy/pandas cannot be installed), JavaScript and
 *                     TypeScript through QuickJS, and SQL through SQL.js.
 * - `output-predict`  no runtime needed: learners reason about what the
 *                     compiler or interpreter would do, and commit to the
 *                     exact output. Used for C, C++, Java, PHP, Go, Rust
 *                     and Kotlin, and for anything that needs a real
 *                     server, a real database engine or a real package
 *                     ecosystem (React, Next.js, Node, PostgreSQL, MongoDB,
 *                     cryptography, ML).
 * - `config`          the deliverable is a configuration artifact or a
 *                     scenario judgement: Dockerfiles, CI pipelines, nginx,
 *                     cloud IAM, network design, HTML/CSS.
 */
export type PracticeMode = "executable" | "output-predict" | "config";

/**
 * Technologies whose exercises genuinely execute in the browser sandbox.
 *
 * A course may only be labelled `executable` when its technology appears
 * here. The reasoning matters as much as the list: SQL.js is SQLite, not
 * PostgreSQL, so a Postgres course cannot be executable; and there is no
 * React runtime, no DOM, no Node API surface and no model API, so those
 * courses cannot be either.
 */
export const EXECUTABLE_TECH = new Set([
  "Python",
  "JavaScript",
  "TypeScript",
  "SQL",
  "HTML/CSS",
  "Algorithms",
  "Database Design",
]);

export interface BlueprintCourse {
  slug: string;
  title: string;
  category: CatalogCategory;
  technology: string;
  difficulty: CatalogDifficulty;
  practice: PracticeMode;
  icon: string;
  color: string;
  /** Display order on the catalog page. */
  order: number;
  /** Short pitch, shown on the card. */
  blurb: string;
  /** Module titles, in order. */
  modules: string[];
  xpReward: number;
  /** Seeded enrolment figure. Never overwritten on re-seed. */
  students: number;
  rating: number;
  /** True for the seven courses that shipped before the expansion. */
  existing?: boolean;
}

const c = (v: BlueprintCourse): BlueprintCourse => v;

/** The seven originals, listed so the catalog can prove full coverage. */
export const EXISTING_SLUGS = [
  "html-css-foundations",
  "python-fundamentals",
  "js-essentials",
  "sql-and-databases",
  "cybersecurity-basics",
  "devops-crash-course",
  "typescript-fundamentals",
] as const;

export const CATALOG: BlueprintCourse[] = [
  c({
    slug: "html-css-foundations",
    title: "HTML & CSS Foundations",
    category: "Web Development",
    technology: "HTML/CSS",
    difficulty: "Beginner",
    practice: "config",
    icon: "Globe",
    color: "#e34f26",
    order: 1,
    blurb: "Structure and style for the modern web.",
    modules: [],
    xpReward: 120,
    students: 1240,
    rating: 4.7,
    existing: true,
  }),
  c({
    slug: "python-fundamentals",
    title: "Python Fundamentals",
    category: "Programming",
    technology: "Python",
    difficulty: "Beginner",
    practice: "executable",
    icon: "Terminal",
    color: "#3776ab",
    order: 2,
    blurb: "The language most fields agree you should learn first.",
    modules: [],
    xpReward: 120,
    students: 2100,
    rating: 4.8,
    existing: true,
  }),
  c({
    slug: "js-essentials",
    title: "JavaScript Essentials",
    category: "Web Development",
    technology: "JavaScript",
    difficulty: "Beginner",
    practice: "executable",
    icon: "Braces",
    color: "#f7df1e",
    order: 3,
    blurb: "The language the browser runs, from syntax to the DOM.",
    modules: [],
    xpReward: 120,
    students: 1880,
    rating: 4.7,
    existing: true,
  }),
  c({
    slug: "sql-and-databases",
    title: "SQL & Databases",
    category: "Database",
    technology: "SQL",
    difficulty: "Beginner",
    practice: "executable",
    icon: "Database",
    color: "#336791",
    order: 4,
    blurb: "Query relational data, from SELECT to joins.",
    modules: [],
    xpReward: 120,
    students: 1450,
    rating: 4.6,
    existing: true,
  }),
  c({
    slug: "cybersecurity-basics",
    title: "Cybersecurity Basics",
    category: "Cybersecurity",
    technology: "Security",
    difficulty: "Beginner",
    practice: "config",
    icon: "Shield",
    color: "#0f766e",
    order: 5,
    blurb: "Threats, controls and how to think about risk.",
    modules: [],
    xpReward: 120,
    students: 1320,
    rating: 4.6,
    existing: true,
  }),
  c({
    slug: "devops-crash-course",
    title: "DevOps Crash Course",
    category: "DevOps",
    technology: "CI/CD",
    difficulty: "Intermediate",
    practice: "config",
    icon: "GitBranch",
    color: "#0b7285",
    order: 6,
    blurb: "Ship, measure and roll back without drama.",
    modules: [],
    xpReward: 140,
    students: 980,
    rating: 4.5,
    existing: true,
  }),
  c({
    slug: "typescript-fundamentals",
    title: "TypeScript Fundamentals",
    category: "Programming",
    technology: "TypeScript",
    difficulty: "Beginner",
    practice: "executable",
    icon: "Braces",
    color: "#3178c6",
    order: 7,
    blurb: "A static type system on top of JavaScript.",
    modules: [],
    xpReward: 150,
    students: 900,
    rating: 4.7,
    existing: true,
  }),

  // ---------------------------------------------------------------
  // New — programming
  // ---------------------------------------------------------------
  c({
    slug: "c-programming-fundamentals",
    title: "C Programming Fundamentals",
    category: "Programming",
    technology: "C",
    difficulty: "Beginner",
    practice: "output-predict",
    icon: "Terminal",
    color: "#5c7c9a",
    order: 10,
    blurb: "Memory, pointers and the language most systems are built on.",
    modules: [
      "Getting Started with C",
      "Types, Operators and Control Flow",
      "Functions and Recursion",
      "Arrays, Strings and Pointers",
      "Structs and Memory",
      "Files and Standard Library",
    ],
    xpReward: 160,
    students: 840,
    rating: 4.5,
  }),
  c({
    slug: "cpp-programming-fundamentals",
    title: "C++ Programming Fundamentals",
    category: "Programming",
    technology: "C++",
    difficulty: "Intermediate",
    practice: "output-predict",
    icon: "Braces",
    color: "#00599c",
    order: 11,
    blurb: "C plus classes, RAII, templates and the standard library.",
    modules: [
      "From C to C++",
      "References, Const and Overloading",
      "Classes and RAII",
      "Inheritance and Polymorphism",
      "Templates and the Standard Library",
      "Move Semantics and Smart Pointers",
    ],
    xpReward: 200,
    students: 760,
    rating: 4.6,
  }),
  c({
    slug: "java-programming-fundamentals",
    title: "Java Programming Fundamentals",
    category: "Programming",
    technology: "Java",
    difficulty: "Intermediate",
    practice: "output-predict",
    icon: "Coffee",
    color: "#f89820",
    order: 12,
    blurb: "Types, objects, collections and the JVM execution model.",
    modules: [
      "Objects First",
      "Types, Generics and Records",
      "The Collections Framework",
      "Exceptions and Error Handling",
      "Streams and Functional Style",
      "Concurrency Essentials",
    ],
    xpReward: 200,
    students: 1380,
    rating: 4.7,
  }),
  c({
    slug: "php-fundamentals",
    title: "PHP Fundamentals",
    category: "Programming",
    technology: "PHP",
    difficulty: "Beginner",
    practice: "output-predict",
    icon: "Code",
    color: "#777bb4",
    order: 13,
    blurb: "The language behind a large share of the web, taught properly.",
    modules: [
      "PHP Basics",
      "Arrays and Strings",
      "Functions and Scope",
      "Forms, Requests and Sessions",
      "Files, Errors and Debugging",
      "Working with a Database",
    ],
    xpReward: 160,
    students: 620,
    rating: 4.3,
  }),
  c({
    slug: "go-programming-fundamentals",
    title: "Go Programming Fundamentals",
    category: "Programming",
    technology: "Go",
    difficulty: "Beginner",
    practice: "output-predict",
    icon: "Zap",
    color: "#00add8",
    order: 14,
    blurb: "Goroutines, channels and errors as ordinary values.",
    modules: [
      "Syntax and the Toolchain",
      "Structs, Methods and Interfaces",
      "Slices, Maps and Errors",
      "Goroutines and Channels",
      "Standard Library Tour",
      "Building a Small Service",
    ],
    xpReward: 180,
    students: 940,
    rating: 4.7,
  }),
  c({
    slug: "rust-fundamentals",
    title: "Rust Fundamentals",
    category: "Programming",
    technology: "Rust",
    difficulty: "Advanced",
    practice: "output-predict",
    icon: "Shield",
    color: "#b7410e",
    order: 15,
    blurb: "Ownership, borrowing and lifetimes, learned the way the borrow checker expects.",
    modules: [
      "Ownership and Moves",
      "Borrowing and References",
      "Types, Traits and Generics",
      "Error Handling with Result",
      "Lifetimes",
      "Concurrency and Send/Sync",
    ],
    xpReward: 280,
    students: 680,
    rating: 4.8,
  }),
  c({
    slug: "kotlin-fundamentals",
    title: "Kotlin Fundamentals",
    category: "Programming",
    technology: "Kotlin",
    difficulty: "Intermediate",
    practice: "output-predict",
    icon: "Smartphone",
    color: "#7f52ff",
    order: 16,
    blurb: "Null safety, data classes and coroutines on the JVM.",
    modules: [
      "Null Safety and Types",
      "Data and Sealed Classes",
      "Collections and Lambdas",
      "Extension and Scope Functions",
      "Coroutines and Flow",
      "Android-Facing Types",
    ],
    xpReward: 200,
    students: 540,
    rating: 4.6,
  }),
  c({
    slug: "data-structures-algorithms",
    title: "Data Structures & Algorithms",
    category: "Programming",
    technology: "Algorithms",
    difficulty: "Advanced",
    practice: "executable",
    icon: "Network",
    color: "#4c6ef5",
    order: 17,
    blurb: "Big-O, the core structures, and the patterns that solve most problems.",
    modules: [
      "Complexity Analysis",
      "Linear Structures",
      "Trees and Heaps",
      "Hashing",
      "Graphs",
      "Dynamic Programming",
      "Greedy Algorithms and Backtracking",
    ],
    xpReward: 300,
    students: 1120,
    rating: 4.8,
  }),

  // ---------------------------------------------------------------
  // New — web development
  // ---------------------------------------------------------------
  c({
    slug: "responsive-web-design",
    title: "Responsive Web Design",
    category: "Web Development",
    technology: "CSS",
    difficulty: "Beginner",
    practice: "config",
    icon: "Smartphone",
    color: "#20c997",
    order: 20,
    blurb: "Layouts that hold up from a 320px phone to a wide desktop.",
    modules: [
      "Why Responsive",
      "The Box Model and Units",
      "Flexbox",
      "CSS Grid",
      "Media and Container Queries",
      "Responsive Type and Images",
    ],
    xpReward: 150,
    students: 1060,
    rating: 4.7,
  }),
  c({
    slug: "react-fundamentals",
    title: "React.js Fundamentals",
    category: "Web Development",
    technology: "React",
    difficulty: "Intermediate",
    practice: "output-predict",
    icon: "Component",
    color: "#087ea4",
    order: 21,
    blurb: "Components, state and the rendering model behind React.",
    modules: [
      "Components and JSX",
      "Props and Composition",
      "State and Events",
      "Lists and Keys",
      "Effects and Data Fetching",
      "Custom Hooks",
      "Forms and Validation",
    ],
    xpReward: 220,
    students: 1520,
    rating: 4.7,
  }),
  c({
    slug: "nextjs-fundamentals",
    title: "Next.js Fundamentals",
    category: "Web Development",
    technology: "Next.js",
    difficulty: "Intermediate",
    practice: "output-predict",
    icon: "Layers",
    color: "#212529",
    order: 22,
    blurb: "Routing, server components and rendering strategies.",
    modules: [
      "Routing and Layouts",
      "Server and Client Components",
      "Data Fetching and Caching",
      "Mutations and Server Actions",
      "Styling and Assets",
      "Deploying and Observing",
    ],
    xpReward: 240,
    students: 890,
    rating: 4.6,
  }),
  c({
    slug: "nodejs-express",
    title: "Node.js & Express",
    category: "Web Development",
    technology: "Node.js",
    difficulty: "Intermediate",
    practice: "output-predict",
    icon: "Server",
    color: "#339933",
    order: 23,
    blurb: "Build a JSON API with routing, middleware and a database.",
    modules: [
      "The Node Runtime",
      "Modules and the Event Loop",
      "Your First Express Server",
      "Routing and Middleware",
      "Validation and Errors",
      "Connecting a Database",
    ],
    xpReward: 220,
    students: 1240,
    rating: 4.6,
  }),
  c({
    slug: "rest-api-development",
    title: "REST API Development",
    category: "Web Development",
    technology: "REST",
    difficulty: "Intermediate",
    practice: "config",
    icon: "Share2",
    color: "#0ca678",
    order: 24,
    blurb: "Resource design, status codes, versioning and pagination.",
    modules: [
      "The REST Constraints",
      "Designing Resources and URLs",
      "Status Codes and Headers",
      "Versioning and Compatibility",
      "Pagination, Filtering and Sorting",
      "Documentation and Contracts",
    ],
    xpReward: 210,
    students: 980,
    rating: 4.5,
  }),
  c({
    slug: "git-github",
    title: "Git & GitHub",
    category: "Web Development",
    technology: "Git",
    difficulty: "Beginner",
    practice: "config",
    icon: "GitBranch",
    color: "#f05032",
    order: 25,
    blurb: "Commits, branches, merges and a clean pull request.",
    modules: [
      "Version Control and Setup",
      "Commits and the Staging Model",
      "Branches and Merging",
      "Resolving Conflicts",
      "Remotes and GitHub",
      "Pull Requests and Review",
    ],
    xpReward: 150,
    students: 1680,
    rating: 4.8,
  }),
  c({
    slug: "full-stack-web-development",
    title: "Full Stack Web Development",
    category: "Web Development",
    technology: "Full Stack",
    difficulty: "Advanced",
    practice: "output-predict",
    icon: "Blocks",
    color: "#7048e8",
    order: 26,
    blurb: "Wire a frontend, an API, a database and auth into one deployable app.",
    modules: [
      "Architecture and Project Layout",
      "Frontend Foundations",
      "API Design and Integration",
      "Authentication and Sessions",
      "Persistence and Data Modelling",
      "Testing and Quality",
      "Shipping to Production",
    ],
    xpReward: 320,
    students: 720,
    rating: 4.7,
  }),

  // ---------------------------------------------------------------
  // New — database
  // ---------------------------------------------------------------
  c({
    slug: "advanced-sql",
    title: "Advanced SQL",
    category: "Database",
    technology: "SQL",
    difficulty: "Advanced",
    practice: "executable",
    icon: "Database",
    color: "#364f6b",
    order: 30,
    blurb: "Window functions, CTEs, recursive queries and query tuning.",
    modules: [
      "Query Review and Refactoring",
      "Common Table Expressions",
      "Window Functions",
      "Recursive Queries and Hierarchies",
      "Set Operations and Upserts",
      "Reading and Fixing Performance",
    ],
    xpReward: 280,
    students: 860,
    rating: 4.8,
  }),
  c({
    slug: "database-design",
    title: "Database Design & Normalization",
    category: "Database",
    technology: "Database Design",
    difficulty: "Intermediate",
    practice: "executable",
    icon: "Network",
    color: "#1c7ed6",
    order: 31,
    blurb: "Entity modelling, keys, normalisation, and when to stop normalising.",
    modules: [
      "Requirements and Entities",
      "Relationships and Keys",
      "Normalisation",
      "Constraints and Integrity",
      "Indexing for Reads",
      "Modelling Trade-offs",
    ],
    xpReward: 220,
    students: 640,
    rating: 4.6,
  }),
  c({
    slug: "postgresql-fundamentals",
    title: "PostgreSQL Fundamentals",
    category: "Database",
    technology: "PostgreSQL",
    difficulty: "Intermediate",
    practice: "output-predict",
    icon: "Database",
    color: "#336791",
    order: 32,
    blurb: "Types, transactions, indexing and JSONB in a database worth learning properly.",
    modules: [
      "How PostgreSQL Differs",
      "Data Types and JSONB",
      "Transactions and Isolation",
      "Constraints and Generated Columns",
      "Indexes and Query Plans",
      "Roles, Permissions and Backups",
    ],
    xpReward: 230,
    students: 780,
    rating: 4.7,
  }),
  c({
    slug: "mongodb-fundamentals",
    title: "MongoDB Fundamentals",
    category: "Database",
    technology: "MongoDB",
    difficulty: "Intermediate",
    practice: "output-predict",
    icon: "Leaf",
    color: "#13aa52",
    order: 33,
    blurb: "Documents, aggregation pipelines and modelling for a document store.",
    modules: [
      "Documents and Collections",
      "Querying and Updating",
      "Schema Design and Embedding",
      "Aggregation Pipelines",
      "Indexes and Performance",
      "Replication and Transactions",
    ],
    xpReward: 220,
    students: 700,
    rating: 4.5,
  }),

  // ---------------------------------------------------------------
  // New — cybersecurity
  // ---------------------------------------------------------------
  c({
    slug: "ethical-hacking-fundamentals",
    title: "Ethical Hacking Fundamentals",
    category: "Cybersecurity",
    technology: "Security",
    difficulty: "Intermediate",
    practice: "config",
    icon: "Shield",
    color: "#b91c1c",
    order: 40,
    blurb: "Legal scoping, reconnaissance, and the phases of a penetration test.",
    modules: [
      "Ethics, Law and Scope",
      "Reconnaissance and OSINT",
      "Scanning and Enumeration",
      "Exploitation in a Lab",
      "Reporting and Remediation",
      "Rules of Engagement",
    ],
    xpReward: 240,
    students: 820,
    rating: 4.6,
  }),
  c({
    slug: "network-security",
    title: "Network Security Fundamentals",
    category: "Cybersecurity",
    technology: "Networking",
    difficulty: "Intermediate",
    practice: "config",
    icon: "Network",
    color: "#0d6efd",
    order: 41,
    blurb: "TCP/IP, segmentation, firewalls and reading network traffic.",
    modules: [
      "The TCP/IP Stack",
      "Addressing, Routing and DNS",
      "Segmentation and Firewalls",
      "TLS and Secure Transport",
      "Proxies and Remote Access",
      "Monitoring and Logs",
    ],
    xpReward: 230,
    students: 760,
    rating: 4.5,
  }),
  c({
    slug: "web-application-security",
    title: "Web Application Security",
    category: "Cybersecurity",
    technology: "AppSec",
    difficulty: "Advanced",
    practice: "config",
    icon: "Globe",
    color: "#e8590c",
    order: 42,
    blurb: "Input handling, output encoding, session security and SSRF.",
    modules: [
      "The Request Lifecycle",
      "Injection and Parameterised Queries",
      "XSS and Output Encoding",
      "CSRF and Sessions",
      "SSRF and Deserialisation",
      "Secure Headers and CSP",
    ],
    xpReward: 280,
    students: 690,
    rating: 4.7,
  }),
  c({
    slug: "api-security",
    title: "API Security",
    category: "Cybersecurity",
    technology: "API",
    difficulty: "Advanced",
    practice: "output-predict",
    icon: "Key",
    color: "#7c3aed",
    order: 43,
    blurb: "Authentication, object-level authorisation and quotas without data leaks.",
    modules: [
      "API Surface and Threat Modelling",
      "Keys, Tokens and OAuth",
      "Object-Level Authorisation",
      "Rate Limiting and Quotas",
      "Validation and Error Handling",
      "Logging Without Leaking",
    ],
    xpReward: 270,
    students: 610,
    rating: 4.6,
  }),
  c({
    slug: "linux-cybersecurity",
    title: "Linux for Cybersecurity",
    category: "Cybersecurity",
    technology: "Linux",
    difficulty: "Intermediate",
    practice: "config",
    icon: "TerminalSquare",
    color: "#c9a227",
    order: 44,
    blurb: "Permissions, processes, logs and hardening a host.",
    modules: [
      "Filesystem and Permissions",
      "Users, Groups and sudo",
      "Processes and Services",
      "Logs and Auditing",
      "Networking Tools",
      "Hardening and Baselines",
    ],
    xpReward: 220,
    students: 740,
    rating: 4.5,
  }),
  c({
    slug: "cryptography-fundamentals",
    title: "Cryptography Fundamentals",
    category: "Cybersecurity",
    technology: "Cryptography",
    difficulty: "Advanced",
    practice: "output-predict",
    icon: "Lock",
    color: "#495057",
    order: 45,
    blurb: "Hashing, symmetric and asymmetric crypto, TLS and key management.",
    modules: [
      "Guarantees and Threat Models",
      "Hashing and Integrity",
      "Symmetric Encryption",
      "Public-Key Cryptography",
      "TLS and Key Exchange",
      "Key Management and Rotation",
    ],
    xpReward: 290,
    students: 520,
    rating: 4.8,
  }),
  c({
    slug: "owasp-top-10",
    title: "OWASP Top 10",
    category: "Cybersecurity",
    technology: "OWASP",
    difficulty: "Intermediate",
    practice: "config",
    icon: "ShieldAlert",
    color: "#dc2626",
    order: 46,
    blurb: "The most common web vulnerabilities, each with its defensive fix.",
    modules: [
      "How the List Is Built",
      "Broken Access Control",
      "Cryptographic Failures",
      "Injection",
      "Insecure Design",
      "Misconfiguration and Dependencies",
      "Logging and Testing",
    ],
    xpReward: 250,
    students: 900,
    rating: 4.7,
  }),

  // ---------------------------------------------------------------
  // New — DevOps and cloud
  // ---------------------------------------------------------------
  c({
    slug: "docker-fundamentals",
    title: "Docker Fundamentals",
    category: "DevOps",
    technology: "Docker",
    difficulty: "Beginner",
    practice: "config",
    icon: "Container",
    color: "#2496ed",
    order: 50,
    blurb: "Images, containers, volumes and a reproducible build.",
    modules: [
      "Why Containers",
      "Images and Layers",
      "Dockerfiles Done Right",
      "Volumes and Networks",
      "Compose for Local Work",
      "Image Size and Security",
    ],
    xpReward: 170,
    students: 1180,
    rating: 4.7,
  }),
  c({
    slug: "kubernetes-fundamentals",
    title: "Kubernetes Fundamentals",
    category: "Cloud",
    technology: "Kubernetes",
    difficulty: "Advanced",
    practice: "config",
    icon: "Hexagon",
    color: "#326ce5",
    order: 51,
    blurb: "Pods, deployments, services and self-healing workloads.",
    modules: [
      "The Declarative Model",
      "Pods and Containers",
      "Deployments and Replicas",
      "Services and Networking",
      "ConfigMaps and Secrets",
      "Health Checks and Scaling",
    ],
    xpReward: 300,
    students: 640,
    rating: 4.6,
  }),
  c({
    slug: "cicd-fundamentals",
    title: "CI/CD Fundamentals",
    category: "DevOps",
    technology: "CI/CD",
    difficulty: "Intermediate",
    practice: "config",
    icon: "GitBranch",
    color: "#0b7285",
    order: 52,
    blurb: "Pipelines, gates, artefact versioning and safe rollouts.",
    modules: [
      "Why Pipelines Exist",
      "Stages and Jobs",
      "Testing Gates",
      "Artefacts and Versioning",
      "Deployment Strategies",
      "Rollbacks and Monitoring",
    ],
    xpReward: 220,
    students: 950,
    rating: 4.6,
  }),
  c({
    slug: "aws-fundamentals",
    title: "AWS Fundamentals",
    category: "Cloud",
    technology: "AWS",
    difficulty: "Beginner",
    practice: "config",
    icon: "Cloud",
    color: "#ff9900",
    order: 53,
    blurb: "Regions, availability zones, IAM, and the core compute and storage services.",
    modules: [
      "Regions and Availability Zones",
      "The Shared Responsibility Model",
      "IAM: Identities and Policies",
      "Compute: EC2, Lambda and Containers",
      "Storage: S3 and EBS",
      "Networking and Cost Awareness",
    ],
    xpReward: 200,
    students: 1340,
    rating: 4.7,
  }),
  c({
    slug: "cloud-security",
    title: "Cloud Security Fundamentals",
    category: "Cloud",
    technology: "Cloud Security",
    difficulty: "Advanced",
    practice: "config",
    icon: "CloudCog",
    color: "#845ef7",
    order: 54,
    blurb: "Misconfiguration, secrets, network exposure and cloud logging.",
    modules: [
      "The Cloud Shared Responsibility Split",
      "Identity and Access in the Cloud",
      "Storage Misconfiguration",
      "Secrets Management",
      "Network Exposure and Segmentation",
      "Logging, Audit and Incident Response",
    ],
    xpReward: 280,
    students: 560,
    rating: 4.7,
  }),

  // ---------------------------------------------------------------
  // New — data and AI
  // ---------------------------------------------------------------
  c({
    slug: "data-analytics",
    title: "Data Analytics Fundamentals",
    category: "Data & AI",
    technology: "Analytics",
    difficulty: "Beginner",
    practice: "output-predict",
    icon: "BarChart3",
    color: "#0b7285",
    order: 60,
    blurb: "Ask a question of data and answer it honestly, including when the answer is awkward.",
    modules: [
      "What Analysis Is For",
      "Asking Useful Questions",
      "Descriptive Statistics",
      "Cleaning and Missing Data",
      "Visualisation and Misleading Charts",
      "From Findings to Decisions",
    ],
    xpReward: 180,
    students: 1020,
    rating: 4.6,
  }),
  c({
    slug: "python-data-science",
    title: "Python for Data Science",
    category: "Data & AI",
    technology: "Python",
    difficulty: "Intermediate",
    practice: "output-predict",
    icon: "LineChart",
    color: "#306998",
    order: 61,
    blurb: "NumPy, pandas and matplotlib: load, reshape and plot real data.",
    modules: [
      "The Scientific Stack",
      "NumPy Arrays",
      "pandas DataFrames",
      "Selecting and Filtering",
      "Grouping and Joining",
      "Cleaning and Wrangling",
      "Plotting Results",
    ],
    xpReward: 240,
    students: 890,
    rating: 4.7,
  }),
  c({
    slug: "machine-learning",
    title: "Machine Learning Fundamentals",
    category: "Data & AI",
    technology: "Machine Learning",
    difficulty: "Advanced",
    practice: "output-predict",
    icon: "Cpu",
    color: "#e8590c",
    order: 62,
    blurb: "Supervised learning, overfitting, evaluation and the leaks that fool your metrics.",
    modules: [
      "What Learning Means Here",
      "Supervised Learning Setup",
      "Linear and Logistic Models",
      "Trees and Ensembles",
      "Overfitting and Cross-Validation",
      "Evaluation Metrics",
      "Data Leakage",
    ],
    xpReward: 300,
    students: 720,
    rating: 4.8,
  }),
  c({
    slug: "generative-ai",
    title: "Generative AI Fundamentals",
    category: "Data & AI",
    technology: "Generative AI",
    difficulty: "Intermediate",
    practice: "output-predict",
    icon: "Sparkles",
    color: "#7048e8",
    order: 63,
    blurb: "Tokens, context windows, temperature and the failure modes of probabilistic output.",
    modules: [
      "What a Language Model Does",
      "Tokens and Context Windows",
      "Sampling and Temperature",
      "Hallucination and Grounding",
      "Structured Output",
      "Cost, Latency and Caching",
    ],
    xpReward: 240,
    students: 1380,
    rating: 4.7,
  }),
  c({
    slug: "prompt-engineering",
    title: "Prompt Engineering",
    category: "Data & AI",
    technology: "Prompting",
    difficulty: "Beginner",
    practice: "output-predict",
    icon: "MessageSquare",
    color: "#20c997",
    order: 64,
    blurb: "Structure a prompt so the model has what it needs, and evaluate the result.",
    modules: [
      "Why Prompts Are Specification",
      "Role, Task and Context",
      "Few-Shot Examples",
      "Output Formats and Schemas",
      "Decomposing Tasks",
      "Evaluating and Iterating",
    ],
    xpReward: 170,
    students: 1540,
    rating: 4.6,
  }),
];

// ------------------------------------------------------------------
// Derived views
// ------------------------------------------------------------------

export const NEW_COURSES = CATALOG.filter((x) => !x.existing);

export function byCategory(category?: CatalogCategory | null): BlueprintCourse[] {
  const all = category ? CATALOG.filter((x) => x.category === category) : CATALOG;
  return [...all].sort((a, b) => a.order - b.order);
}

export function byTechnology(technology?: string | null): BlueprintCourse[] {
  if (!technology) return [...CATALOG].sort((a, b) => a.order - b.order);
  const t = technology.toLowerCase();
  return CATALOG.filter(
    (x) => x.technology.toLowerCase() === t || x.technology.toLowerCase().includes(t)
  ).sort((a, b) => a.order - b.order);
}

export function byDifficulty(difficulty?: CatalogDifficulty | null): BlueprintCourse[] {
  const all = difficulty ? CATALOG.filter((x) => x.difficulty === difficulty) : CATALOG;
  return [...all].sort((a, b) => a.order - b.order);
}

/** The technology filter list, derived rather than hand-maintained. */
export function technologies(): string[] {
  return [...new Set(CATALOG.map((x) => x.technology))].sort();
}

export function categories(): CatalogCategory[] {
  return [...new Set(CATALOG.map((x) => x.category))];
}
