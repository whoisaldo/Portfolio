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
  now: {
    role: "SDE Intern",
    org: "AWS CloudFormation",
    detail: "Infrastructure as Code",
    location: "Seattle, WA",
  },
  prev: {
    role: "SWE Co-op",
    org: "Philips",
    period: "Jan to Jun 2026",
    location: "Cambridge, MA",
  },
};

export const emails = [
  { key: "school", value: "younes.al@northeastern.edu", primary: true },
  { key: "personal", value: "whois.younes@gmail.com" },
  { key: "studio", value: "Aliyounes@eternalreverse.com" },
];

export const links = {
  github: "https://github.com/whoisaldo",
  linkedin: "https://www.linkedin.com/in/alialdoyounes/",
  email: "mailto:younes.al@northeastern.edu",
  studio: "https://eternalreverse.com",
  site: "https://aliyounes.dev/",
};

// Grouped rather than ranked. The previous version rendered ASCII proficiency
// bars (20/20 for TypeScript, 16/20 for C++), which is "React 90%" wearing a
// monospace hat, and self-declaring "expert" cuts against this repo's own rule
// that a reader should find the portfolio understated.
export const skills = [
  { group: "Languages", items: ["TypeScript", "JavaScript", "C++", "Python", "Java", "C#", "Rust", "Swift", "Go"] },
  { group: "Frontend", items: ["React", "Next.js", "Tailwind CSS", "Framer Motion"] },
  { group: "Backend", items: ["Node.js", "Express", "MongoDB", ".NET", "PowerShell"] },
  { group: "Systems", items: ["Rust", "C++", "DXGI", "Metal", "VideoToolbox", "H.264"] },
  { group: "Cloud & infra", items: ["AWS", "Linux", "IaC (CDK/CloudFormation)", "CI/CD", "Docker"] },
  { group: "Tools", items: ["Git", "Vim", "VS Code", "Xcode"] },
];
