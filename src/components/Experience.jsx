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
    subtitle: "FOG Zero-Touch Deployment · VM Automation",
    company: "Philips",
    period: "2025 — Present",
    location: "Cambridge, MA",
    logo: philipsLogo,

    description:
      "Designed and shipped a zero-touch deployment platform for ~1,000 medical-device-grade Windows machines under FDA-regulated UEFI Secure Boot. Owned it end-to-end and presented the architecture to 50+ engineers. Also contributed to an internal VM deployment platform (guest post-provisioning + environment validation).",
    metrics: [
      { value: "~1,000", label: "Machines / Zero Touch" },
      { value: "50+",    label: "Engineers Presented" },
      { value: "FDA",    label: "Secure Boot Preserved" },
      { value: "Solo",   label: "Owned End-to-End" },
    ],
    caseStudy: {
      tagline: "Replaced ~1,000 per-machine technician touches with a true zero-touch refresh cycle — under FDA-regulated UEFI Secure Boot constraints.",
      problem:
        "Imaging new machines was manual end-to-end: a technician brought up each one, plugged in a USB stick, and ran scripts off a network file share. For roughly a thousand industrial PCs supporting an FDA-regulated medical-device platform, that meant a thousand technician-touches per refresh cycle. The compliance constraint is the catch — UEFI Secure Boot must stay enabled the entire time, which rules out every standard fleet-imaging shortcut at this scale. Many engineers had wanted this automated. Nobody had shipped it.",
      attempts: [
        {
          label: "Attempt 1",
          title: "Custom-signed boot chain — proof of concept",
          body: "Booted a Microsoft-signed loader, handed off to a custom-signed network bootloader, then into Windows PE. The model reached PE on a Secure Boot target — proof the architecture worked. Real debugging along the way: a webserver routing issue silently corrupting payload delivery, plus a path case-sensitivity bug that made the boot loader fetch a redirected login page instead of an EFI binary, invisibly 'booting garbage.' Abandoned for production because the custom signing key isn't in any firmware trust store by default — first boot would require a human keypress on each machine to enroll the key. At ~1,000 machines, that isn't zero-touch."
        },
        {
          label: "Attempt 2",
          title: "OEM-signed boot manager as PXE NBP — production",
          body: "Re-architected around Microsoft's own signed Windows Boot Manager as the network boot program. It's signed by a CA already trusted by every Secure Boot firmware shipped since 2012 — no enrollment, no custom signing, no Secure Boot disable, no per-machine console touch. Power on → proxyDHCP advertises the bootfile → TFTP delivers it → firmware validates the OEM signature → loads the boot configuration and image → Windows PE → orchestrator → vendor installer → fully provisioned OS."
        }
      ],
      deepDives: [
        {
          title: "The shim binary",
          icon: Shield,
          body: "Switching to the production chain broke a specific Windows PE protocol call that the locked vendor installer relied on to detect UEFI vs BIOS state. Solved with a small self-contained .NET single-file shim that replaces the affected utility inside the boot image: the broken call becomes a no-op return-0; every other invocation forwards to the renamed original. A small registry write before launch tells the installer what it expects to see. The vendor installer was never modified — the broken protocol was simply removed from its dependency graph."
        },
        {
          title: "Server stack & operational mindedness",
          icon: Server,
          body: "An Ubuntu PXE host running proxyDHCP and TFTP, configured to coexist cleanly with the corporate DHCP infrastructure without touching IP allocations. The boot image is hardlinked across multiple lookup paths so an edit anywhere is an edit everywhere. Byte-identical boot configuration data sits at every path firmware might query, so different hardware revisions behave identically. The earlier proof-of-concept chain stays archived under a documented revert runbook as the emergency fallback."
        }
      ],
      pullQuote: "\"Many engineers had wanted this automated. Nobody had shipped it.\"",
      outcome: [
        "Replaced ~1,000 per-machine technician touches with a true zero-touch workflow.",
        "Secure Boot enforced end-to-end across the refresh cycle; FDA compliance preserved.",
        "Architecture and live workflow presented to 50+ engineers and stakeholders.",
        "Earlier proof-of-concept chain preserved under a documented revert runbook as emergency fallback."
      ],
      contributor: "Separately contributed to an internal VM deployment platform — wrote the Windows guest post-provisioning automation layer (hostname assignment, service enablement, certificate imports, disk expansion, OpenSSH setup, license activation, deployment validation) and built a JSON-driven environment-validation pipeline that standardised how teams verify test environments at scale."
    },
    skills: [
      "PowerShell", "Python", ".NET", "C#", "Ubuntu",
      "PXE", "TFTP", "UEFI Secure Boot", "Windows PE",
      "Nutanix", "VMware", "Healthcare IT"
    ],
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
        {/* Section header — Service Record */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="mb-16 md:mb-20 border-b border-hud/15 pb-6"
        >
          <div className="flex items-baseline gap-6">
            <span className="font-display italic text-hud text-3xl lg:text-4xl leading-none">III.</span>
            <div>
              <p className="font-mono text-[10px] tracking-editorial text-hud/70 uppercase mb-2">// service_record</p>
              <h2 className="serif-display text-[12vw] md:text-[8rem] leading-[0.88] text-bone italic">
                <span className="text-bone">what</span>
                <span className="text-signal"> i’ve</span>
                <span className="text-bone italic"> built.</span>
              </h2>
            </div>
          </div>
        </motion.div>

        <div className="relative">
          {/* Timeline rail */}
          <div className="absolute left-6 md:left-10 top-0 bottom-0 w-px bg-gradient-to-b from-hud/40 via-bone/10 to-transparent" />

          <div className="space-y-10">
            {experiences.map((exp, index) => {
              const Icon = exp.icon;
              const isExpanded = expandedIndex === index;
              const isWork = exp.type === "work";
              const num = String(index + 1).padStart(2, "0");

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.7, delay: index * 0.1, ease: [0.2, 0.7, 0.2, 1] }}
                  className="relative pl-16 md:pl-24"
                >
                  {/* Numbered timeline marker — bracketed node */}
                  <div className="absolute left-0 md:left-4 top-1 z-10 flex items-center gap-2">
                    <div className="w-4 h-4 bg-ink border border-hud/70 flex items-center justify-center">
                      <div className={`w-1.5 h-1.5 ${isWork ? 'bg-signal' : 'bg-hud'}`} />
                    </div>
                    <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-hud/60 hidden md:block">[{num}]</span>
                  </div>

                  {/* Card — dossier shell with bracket frame */}
                  <div
                    className={`relative bracket-frame scan-beam-host border transition-all duration-300
                                ${isExpanded
                                  ? 'border-hud/40 bg-concrete'
                                  : 'border-bone/10 bg-ink hover:border-bone/25 hover:translate-x-1'}`}
                  >
                    <span aria-hidden className={`bracket-corner tl ${isExpanded ? '' : 'sm'}`} />
                    <span aria-hidden className={`bracket-corner tr ${isExpanded ? '' : 'sm'}`} />
                    <span aria-hidden className={`bracket-corner bl ${isExpanded ? '' : 'sm'}`} />
                    <span aria-hidden className={`bracket-corner br ${isExpanded ? '' : 'sm'}`} />
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
                              className="h-16 md:h-24 w-auto max-w-[140px] md:max-w-[200px] object-contain drop-shadow-[0_0_20px_rgba(168,85,247,0.18)] group-hover:drop-shadow-[0_0_30px_rgba(168,85,247,0.4)] transition-all duration-300"
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

                            <p className="font-serif italic text-bone/80 text-[16px] md:text-[17px] leading-relaxed max-w-3xl">
                              {exp.description}
                            </p>

                            {/* Case study (Philips FOG) — Service Record dossier */}
                            {exp.caseStudy && (
                              <div className="space-y-8 border-l border-hud/30 pl-5 md:pl-6">
                                {/* Tagline */}
                                <p className="font-display italic text-bone text-xl md:text-2xl leading-snug max-w-3xl chromatic-aberration">
                                  {exp.caseStudy.tagline}
                                </p>

                                {/* Problem */}
                                <div>
                                  <h4 className="font-mono text-[10px] tracking-editorial uppercase text-hud/70 mb-3">// before_state</h4>
                                  <p className="font-serif text-bone/80 text-[15px] md:text-[16px] leading-[1.65] max-w-3xl">
                                    {exp.caseStudy.problem}
                                  </p>
                                </div>

                                {/* Two-attempt arc */}
                                <div>
                                  <h4 className="font-mono text-[10px] tracking-editorial uppercase text-hud/70 mb-4">// two_attempt_arc</h4>
                                  <div className="grid md:grid-cols-2 gap-4">
                                    {exp.caseStudy.attempts.map((a, ai) => (
                                      <motion.div
                                        key={ai}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true, margin: "-40px" }}
                                        transition={{ duration: 0.7, delay: ai * 0.1, ease: [0.2,0.7,0.2,1] }}
                                        className="relative bracket-frame dossier-shell p-5"
                                      >
                                        <span aria-hidden className="bracket-corner tl sm" />
                                        <span aria-hidden className="bracket-corner tr sm" />
                                        <span aria-hidden className="bracket-corner bl sm" />
                                        <span aria-hidden className="bracket-corner br sm" />
                                        <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-hud mb-2">[ {a.label.replace(/^Attempt\s*/i, "attempt_").toLowerCase().replace(" ", "_")} ]</div>
                                        <h5 className="serif-display italic text-bone text-xl mb-3 leading-tight">{a.title}</h5>
                                        <p className="font-mono text-[12.5px] text-bone/75 leading-relaxed">{a.body}</p>
                                      </motion.div>
                                    ))}
                                  </div>
                                </div>

                                {/* Pull quote */}
                                {exp.caseStudy.pullQuote && (
                                  <figure className="my-6 border-y border-hud/20 py-6">
                                    <span className="block font-display italic text-hud/70 text-5xl leading-none mb-2 animate-quote-swell" aria-hidden>“</span>
                                    <blockquote className="font-display italic text-bone/95 text-2xl md:text-3xl leading-snug max-w-2xl chromatic-aberration">
                                      {exp.caseStudy.pullQuote}
                                    </blockquote>
                                  </figure>
                                )}

                                {/* Deep dives */}
                                <div>
                                  <h4 className="font-mono text-[10px] tracking-editorial uppercase text-hud/70 mb-4">// deep_dives</h4>
                                  <div className="space-y-3">
                                    {exp.caseStudy.deepDives.map((d, di) => {
                                      const DIcon = d.icon;
                                      return (
                                        <details
                                          key={di}
                                          className="group bracket-frame border border-bone/10 hover:border-hud/40 transition-colors"
                                        >
                                          <span aria-hidden className="bracket-corner tl sm" />
                                          <span aria-hidden className="bracket-corner tr sm" />
                                          <span aria-hidden className="bracket-corner bl sm" />
                                          <span aria-hidden className="bracket-corner br sm" />
                                          <summary className="cursor-pointer list-none p-4 md:p-5 flex items-start gap-3 select-none">
                                            <div className="p-1.5 border border-hud/40 shrink-0 mt-0.5">
                                              <DIcon className="w-3.5 h-3.5 text-hud" />
                                            </div>
                                            <div className="flex-1">
                                              <h5 className="font-mono text-sm font-bold text-bone">{d.title}</h5>
                                              <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-bone/45 group-open:hidden">[ expand + ]</span>
                                              <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-hud hidden group-open:inline">[ collapse − ]</span>
                                            </div>
                                          </summary>
                                          <div className="px-4 md:px-5 pb-5 pt-1">
                                            <p className="font-mono text-[12.5px] text-bone/80 leading-relaxed max-w-3xl">{d.body}</p>
                                          </div>
                                        </details>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Outcome */}
                                <div>
                                  <h4 className="font-mono text-[10px] tracking-editorial uppercase text-hud/70 mb-3">// outcome</h4>
                                  <ul className="space-y-2">
                                    {exp.caseStudy.outcome.map((o, oi) => (
                                      <li key={oi} className="flex items-start gap-3 font-mono text-[13px] text-bone/85 leading-relaxed">
                                        <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-hud" />
                                        <span>{o}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                {/* Contributor mention */}
                                {exp.caseStudy.contributor && (
                                  <div className="border-t border-hud/15 pt-6">
                                    <div className="font-mono text-[10px] tracking-editorial uppercase text-hud/60 mb-3">// also_at_philips</div>
                                    <p className="font-serif italic text-bone/75 text-[15px] leading-[1.65] max-w-3xl">
                                      {exp.caseStudy.contributor}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Metrics — mono table style */}
                            {exp.metrics && (
                              <div
                                className={`grid border border-bone/10 divide-x divide-bone/10 ${
                                  exp.metrics.length === 3
                                    ? "grid-cols-3"
                                    : "grid-cols-2 md:grid-cols-4"
                                }`}
                              >
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

                            {/* Highlights — suppressed when caseStudy is present */}
                            {exp.highlights && !exp.caseStudy && (
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
