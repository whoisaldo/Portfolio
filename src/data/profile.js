// src/data/profile.js: identity facts that appear in more than one place.
//
// These used to be retyped in Hero.jsx, Terminal.jsx, App.jsx and the footer.
// The degree line had already drifted: five places said "CS & Political
// Science" and Experience.jsx said "Computer Science & Engineering".
// One definition, imported everywhere.

export const profile = {
  name: "Ali Younes",
  first: "Ali",
  last: "Younes",
  school: "Northeastern University",
  degree: "CS & Political Science",
  gradYear: "’27",
  educationLine: "CS & Political Science · Northeastern University · Class of ’27",
  base: "Boston, MA",
  // The character-sheet fields, for the dossier card in the About section.
  //
  // `age` is the one number on this site a human has to keep in sync. Ali gave
  // the birth date and asked for the number typed rather than computed from
  // it, which is the right call for a public repo: a full date of birth next
  // to a name, a school and an employer is the back half of an identity, and
  // this file is on GitHub. Next increment is September 2027.
  age: 21,
  languages: ["English", "Arabic"],
  // The joke, and the answer. A Ripperdoc in Night City is the one who opens
  // the thing up and puts something better in it, which is close enough to
  // the truth that it earns its place next to the real job title.
  occupation: { handle: "Ripperdoc", real: "software engineer" },
  // Three at once, in the résumé's order. `detail` is the one qualifier each
  // needs to be read correctly; the full entries are in experience.js.
  current: [
    { role: "SDE Co-op", short: "SDE Co-op, part-time", org: "Philips", detail: "back part-time since Aug 2026", location: "Cambridge, MA" },
    { role: "Lead Full Stack Engineer", short: "Lead Full Stack, part-time", org: "Pinnatec Auto", detail: "part-time, since Sep 2026", location: "Worcester, MA" },
    { role: "Backend Engineer", short: "Backend, grading server", org: "Pawtograder", detail: "grading server, since Aug 2026", location: "Boston, MA" },
  ],
  prev: {
    role: "SDE Intern",
    org: "AWS CloudFormation",
    period: "Jun to Sep 2026",
    location: "Seattle, WA",
  },
};

export const emails = [
  { key: "personal", value: "aldo@sideband.studio", primary: true },
  { key: "studio", value: "hello@sideband.studio" },
];

export const links = {
  github: "https://github.com/whoisaldo",
  linkedin: "https://www.linkedin.com/in/alialdoyounes/",
  email: "mailto:aldo@sideband.studio",
  studio: "https://sideband.studio",
  site: "https://aliyounes.dev/",
};

// Grouped rather than ranked. The previous version rendered ASCII proficiency
// bars (20/20 for TypeScript, 16/20 for C++), which is "React 90%" wearing a
// monospace hat, and self-declaring "expert" cuts against this repo's own rule
// that a reader should find the portfolio understated.
//
// The two AI groups follow the résumé: `AI` is what has been built with, and
// `Agents` is the agentic tooling in daily use. Every entry can be discussed
// in an interview, which is the bar for appearing here.
export const skills = [
  { group: "Languages", items: ["TypeScript", "JavaScript", "Python", "SQL", "Java", "C++", "C#", "Rust", "Swift", "PowerShell", "Bash", "Go"] },
  { group: "Frontend", items: ["React", "React Native (Expo)", "Next.js", "Tailwind CSS", "Framer Motion"] },
  { group: "Backend", items: ["Node.js", "Express", "FastAPI", "Postgres", "MongoDB", "Deno", "Supabase", "PHP", ".NET"] },
  { group: "Systems", items: ["Rust", "C++", "ESP32", "DXGI", "Metal", "VideoToolbox", "H.264"] },
  { group: "Cloud & infra", items: ["AWS (CloudFormation, DynamoDB, IAM)", "Linux", "Docker", "GitHub Actions", "CI/CD"] },
  { group: "AI", items: ["OpenAI SDK", "Claude SDK", "MCP", "Ollama", "AWS Bedrock"] },
  { group: "Agents", items: ["Kiro", "Codex", "Claude Code", "OpenCode", "Windsurf", "T3 Code", "Cursor Bugbot", "CodeRabbit"] },
  { group: "Tools", items: ["Git", "Vim", "VS Code", "Xcode"] },
];
