// src/components/Experience.jsx — Editorial redesign + AWS ADC card
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase, GraduationCap, ChevronDown, Server, Zap, Cpu, Users,
  CheckCircle2, Code, Database, BarChart3, Building2, Monitor,
  Wrench, Settings, Cloud, Shield,
} from "lucide-react";

import awsLogo from "../assets/PreviousExperience/awslogosvg.svg";
import philipsLogo from "../assets/PreviousExperience/PhilipsLogo.svg";
import neuLogo from "../assets/PreviousExperience/NEULOGO.png";
import topChoiceLogo from "../assets/PreviousExperience/Topchoicerealtylogo.jpeg";
import robertDefalcoLogo from "../assets/PreviousExperience/RobertDefalcoRealty.webp";

const experiences = [
  {
    type: "work",
    title: "Software Development Engineer Intern",
    subtitle: "Amazon Dedicated Cloud (ADC)",
    company: "Amazon Web Services",
    period: "Jun 2026 — Sep 2026",
    location: "Seattle, WA",
    logo: awsLogo,

    badge: "Incoming",
    badgeColor: "text-[#FF9900] border-[#FF9900]/50 bg-[#FF9900]/10",
    badgeDot: "bg-[#FF9900]",
    description:
      "Incoming SDE Intern on AWS Amazon Dedicated Cloud (ADC) — the isolated AWS partitions that power U.S. Intelligence Community, DoD, and other mission-critical government workloads. Owning a scoped service project across distributed systems, automation, and operational tooling.",
    metrics: [
      { value: "AWS",   label: "Cloud Platform" },
      { value: "ADC",   label: "Dedicated Cloud" },
      { value: "SDE",   label: "Intern" },
      { value: "2026",  label: "Summer" },
    ],
    highlights: [
      {
        icon: Cloud,
        title: "Distributed Systems at Scale",
        description:
          "Building on the infra that runs AWS' air-gapped, ITAR / IL5 / IL6-compliant partitions — where every deployment is high-stakes and low margin-of-error."
      },
      {
        icon: Shield,
        title: "Security-First Engineering",
        description:
          "Designing with Well-Architected + ADC hardening in mind: IAM, KMS, least-privilege by default, auditability from day one."
      },
      {
        icon: Server,
        title: "Service Ownership",
        description:
          "Full intern-scope project — design doc, code, deploy pipeline, on-call playbook — under a Senior/Principal SDE mentor."
      },
      {
        icon: Users,
        title: "Customer Obsession (Regulated)",
        description:
          "Delivering for customers who can't use commercial AWS. Every feature must earn its way through security review before it ships."
      },
    ],
    skills: [
      "AWS", "Distributed Systems", "Linux", "Python", "Java",
      "Go", "IaC (CDK/CloudFormation)", "Security Engineering",
    ],
    icon: Cloud,
  },
  {
    type: "work",
    title: "Software Engineering Co-op",
    subtitle: "System Integration & Automation",
    company: "Philips",
    period: "2025 — Present",
    location: "Cambridge, MA",
    logo: philipsLogo,

    description:
      "Building and scaling VM automation and automated deployment pipelines for Philips' PicIX enterprise imaging platform — from single-node setups to large-scale infrastructure.",
    metrics: [
      { value: "VM",     label: "Automation" },
      { value: "PicIX",  label: "Platform" },
      { value: "DevOps", label: "Pipelines" },
      { value: "24/7",   label: "Uptime" },
    ],
    highlights: [
      {
        icon: Cpu,
        title: "Virtual Machine Automation",
        description: "Designing and implementing large- and small-scale VM automation workflows — provisioning, configuration, and lifecycle management for PicIX infrastructure."
      },
      {
        icon: Zap,
        title: "Automated PicIX Setups",
        description: "Building end-to-end automated setups and deployment pipelines for PicIX, enabling consistent, repeatable deployments across environments."
      },
      {
        icon: Server,
        title: "DevOps & Infrastructure",
        description: "Leveraging C#, PowerShell, and .NET Framework to drive infrastructure-as-code, CI/CD, and operational automation for enterprise imaging systems."
      },
      {
        icon: Users,
        title: "Enterprise Impact",
        description: "Automation and tooling directly support healthcare providers globally, ensuring PicIX imaging systems deploy and run reliably at scale."
      },
    ],
    skills: ["C#", ".NET Framework", "PowerShell", "DevOps", "VM Automation", "PicIX", "Infrastructure as Code", "Healthcare IT"],
    icon: Briefcase,
  },
  {
    type: "work",
    title: "Frontend Developer Intern",
    company: "Top Choice Realty",
    period: "Apr 2024 — Aug 2024",
    location: "New York, NY",
    logo: topChoiceLogo,
    logoBg: "bg-bone/5 border-bone/15",
    description: "Built a full-stack client management application that transformed how 20+ real estate agents access and manage 800+ client records, with measurable business impact.",
    highlights: [
      { icon: Code,       title: "Full-Stack Web Application",   description: "Engineered and launched a client management web application using React, Python, and SQL, reducing average client lookup time by 85% (from 5+ minutes to 45 seconds)." },
      { icon: Users,      title: "User-Friendly Interface",       description: "Created intuitive interfaces with guided navigation and visual search, empowering non-technical agents to independently manage 800+ client records." },
      { icon: Database,   title: "Database Optimization",         description: "Optimized queries and implemented caching, accelerating data retrieval 3x and saving the team 15+ hours weekly in admin tasks." },
      { icon: BarChart3,  title: "Measurable Business Impact",    description: "Eliminated 90% of IT support requests and improved client response times by 60%." },
    ],
    metrics: [
      { value: "85%", label: "Faster Lookups" },
      { value: "3x",  label: "Query Speed" },
      { value: "90%", label: "Less IT Tickets" },
      { value: "15+", label: "Hours Saved/Week" },
    ],
    skills: ["React", "Python", "SQL", "Full-Stack", "UI/UX Design", "Database Optimization", "REST APIs"],
    icon: Building2,
  },
  {
    type: "work",
    title: "Computer Technician Intern",
    company: "Robert DeFalco Realty",
    period: "Jun 2023 — Sep 2023",
    location: "New York, NY",
    logo: robertDefalcoLogo,
    logoBg: "bg-bone/5 border-bone/15",
    description: "Hands-on IT support across multiple office locations — configuring systems and troubleshooting technical issues to maintain optimal performance.",
    metrics: [
      { value: "3+",   label: "Office Locations" },
      { value: "15+",  label: "Systems Configured" },
      { value: "25+",  label: "Issues Resolved" },
      { value: "95%+", label: "System Uptime" },
    ],
    highlights: [
      { icon: Monitor,  title: "Multi-Location Support",    description: "On-site support across 3+ offices; configured 15+ systems across Windows, macOS, and Linux." },
      { icon: Wrench,   title: "Troubleshooting",           description: "Resolved 25+ technical issues spanning OS platforms and hardware configurations." },
      { icon: Settings, title: "System Maintenance",        description: "Maintained 95%+ uptime across all sites through proactive maintenance and fast issue resolution." },
    ],
    skills: ["Windows", "macOS", "Linux", "Hardware Config", "Troubleshooting", "IT Support", "System Administration"],
    icon: Monitor,
  },
  {
    type: "education",
    title: "Computer Science & Engineering",
    company: "Northeastern University",
    period: "2023 — 2027",
    location: "Boston, MA",
    logo: neuLogo,

    description: "Bachelor's in CS with a focus on software development, systems programming, and algorithm design. Active in the co-op program for real-world engineering experience.",
    metrics: [
      { value: "B.S.",  label: "Degree" },
      { value: "2027",  label: "Expected" },
      { value: "Co-op", label: "Program" },
      { value: "3.5+",  label: "GPA" },
    ],
    coursework: ["Data Structures & Algorithms", "Object-Oriented Design", "Systems Programming", "Database Management", "Computer Networks"],
    icon: GraduationCap,
  },
];

export default function Experience() {
  const [expandedIndex, setExpandedIndex] = useState(0); // AWS open by default

  return (
    <section id="experience" className="relative py-28 md:py-36 px-6 bg-ink overflow-hidden grain">
      {/* Diagonal hairline */}
      <div className="diag-rule top-20 left-[-60%]" />

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Editorial header */}
        <div className="mb-16 md:mb-20">
          <div className="mono-label text-signal/80 mb-4">§ 02 — Experience</div>
          <h2 className="serif-display text-[14vw] md:text-[9rem] leading-[0.88] text-bone italic">
            <span className="text-bone">what</span>
            <span className="text-signal"> i’ve</span>
            <span className="text-bone italic"> built.</span>
          </h2>
          <div className="wipe-divider mt-10" />
        </div>

        <div className="relative">
          {/* Timeline rail */}
          <div className="absolute left-6 md:left-10 top-0 bottom-0 w-px bg-bone/10" />

          <div className="space-y-10">
            {experiences.map((exp, index) => {
              const Icon = exp.icon;
              const isExpanded = expandedIndex === index;
              const isWork = exp.type === "work";
              const num = String(index + 1).padStart(2, "0");

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: index * 0.08 }}
                  className="relative pl-16 md:pl-24"
                >
                  {/* Numbered timeline marker */}
                  <div className="absolute left-0 md:left-4 top-1 z-10 flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-ink border border-signal flex items-center justify-center">
                      <div className={`w-1.5 h-1.5 rounded-full ${isWork ? 'bg-signal' : 'bg-bone'}`} />
                    </div>
                    <span className="mono-label text-bone/40 hidden md:block">{num}</span>
                  </div>

                  {/* Card */}
                  <div
                    className={`relative border transition-all duration-300
                                ${isExpanded
                                  ? 'border-signal/40 bg-smoke'
                                  : 'border-bone/10 bg-ink hover:border-bone/25 hover:translate-x-1'}`}
                  >
                    {/* Left accent on expand */}
                    {isExpanded && (
                      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-signal" />
                    )}

                    <button
                      onClick={() => setExpandedIndex(isExpanded ? -1 : index)}
                      className="w-full p-6 md:p-7 text-left"
                    >
                      <div className="flex items-start justify-between gap-5">
                        <div className="flex-1 min-w-0">
                          {/* meta row */}
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <span className="mono-label text-bone/35">{num} /</span>
                            {/* Type badge */}
                            <span
                              className={`inline-flex items-center gap-1.5 mono-label px-2.5 py-1 border font-bold
                                         ${isWork
                                           ? 'text-signal border-signal/50 bg-signal/8'
                                           : 'text-bone/80 border-bone/30 bg-bone/5'}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isWork ? 'bg-signal' : 'bg-bone/60'}`} />
                              {isWork ? 'Work' : 'Education'}
                            </span>
                            {/* Custom badge (Incoming, etc.) */}
                            {exp.badge && (
                              <span className={`inline-flex items-center gap-1.5 mono-label px-2.5 py-1 border font-bold ${exp.badgeColor || 'text-ember border-ember/50 bg-ember/10'}`}>
                                <span className="relative flex h-1.5 w-1.5">
                                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${exp.badgeDot || 'bg-ember'}`} />
                                  <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${exp.badgeDot || 'bg-ember'}`} />
                                </span>
                                {exp.badge}
                              </span>
                            )}
                            <span className="mono-label text-bone/40 ml-auto hidden sm:block">
                              {exp.period} · {exp.location}
                            </span>
                          </div>

                          {/* Company + title */}
                          <div className="mb-1">
                            <h3 className="serif-display italic text-3xl md:text-5xl text-bone leading-[0.95]">
                              {exp.company}
                            </h3>
                          </div>
                          <p className="font-mono text-[13px] md:text-sm text-bone/70">
                            <span className="text-signal">›</span> {exp.title}
                            {exp.subtitle && (
                              <span className="text-bone/45"> · {exp.subtitle}</span>
                            )}
                          </p>

                          {/* Mobile meta */}
                          <p className="mono-label text-bone/40 mt-2 sm:hidden">
                            {exp.period} · {exp.location}
                          </p>
                        </div>

                        {/* Logo + chevron */}
                        <div className="flex items-center gap-4 shrink-0">
                          {exp.logo && (
                            <img
                              src={exp.logo}
                              alt={exp.company}
                              className="h-16 md:h-24 w-auto max-w-[140px] md:max-w-[200px] object-contain drop-shadow-[0_0_20px_rgba(255,59,48,0.15)] group-hover:drop-shadow-[0_0_30px_rgba(255,59,48,0.35)] transition-all duration-300"
                            />
                          )}
                          <div
                            className={`p-2 border border-bone/20 transition-transform duration-300
                                        ${isExpanded ? 'rotate-180 border-signal/50 text-signal' : 'text-bone/60'}`}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Expanded content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 md:px-7 pb-7 space-y-6">
                            <div className="h-px bg-gradient-to-r from-signal/40 via-signal/10 to-transparent" />

                            <p className="text-bone/75 text-[15px] leading-relaxed max-w-3xl">
                              {exp.description}
                            </p>

                            {/* Metrics — mono table style */}
                            {exp.metrics && (
                              <div className="grid grid-cols-2 md:grid-cols-4 border border-bone/10 divide-x divide-bone/10">
                                {exp.metrics.map((metric, i) => (
                                  <div key={i} className="p-4 text-center">
                                    <div className="serif-display italic text-2xl md:text-3xl text-signal">
                                      {metric.value}
                                    </div>
                                    <div className="mono-label text-bone/50 mt-1">{metric.label}</div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Highlights */}
                            {exp.highlights && (
                              <div className="space-y-3">
                                <h4 className="mono-label text-bone/60 flex items-center gap-2">
                                  <Zap className="w-3.5 h-3.5 text-signal" />
                                  Key Responsibilities &amp; Impact
                                </h4>
                                <div className="grid md:grid-cols-2 gap-3">
                                  {exp.highlights.map((h, i) => {
                                    const HIcon = h.icon;
                                    return (
                                      <div key={i} className="p-4 border border-bone/10 hover:border-signal/30 transition-colors">
                                        <div className="flex items-start gap-3">
                                          <div className="p-1.5 border border-signal/40 shrink-0">
                                            <HIcon className="w-3.5 h-3.5 text-signal" />
                                          </div>
                                          <div>
                                            <h5 className="font-mono text-sm font-bold text-bone mb-1">
                                              {h.title}
                                            </h5>
                                            <p className="text-bone/65 text-[13px] leading-relaxed">
                                              {h.description}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Skills */}
                            {exp.skills && (
                              <div>
                                <h4 className="mono-label text-bone/60 mb-3 flex items-center gap-2">
                                  <Cpu className="w-3.5 h-3.5 text-signal" />
                                  Stack
                                </h4>
                                <div className="flex flex-wrap gap-1.5">
                                  {exp.skills.map((skill) => (
                                    <span key={skill}
                                      className="mono-label px-2.5 py-1 border border-bone/15 text-bone/80 hover:border-signal/40 hover:text-signal transition-colors">
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Coursework */}
                            {exp.coursework && (
                              <div>
                                <h4 className="mono-label text-bone/60 mb-3 flex items-center gap-2">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-signal" />
                                  Relevant Coursework
                                </h4>
                                <div className="flex flex-wrap gap-1.5">
                                  {exp.coursework.map((c) => (
                                    <span key={c} className="mono-label px-2.5 py-1 border border-bone/15 text-bone/80">
                                      {c}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
