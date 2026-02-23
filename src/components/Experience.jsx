// src/components/Experience.jsx - Enhanced with Philips & Top Choice Realty
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, GraduationCap, ChevronDown, Server, Zap, Cpu, Users, CheckCircle2, Code, Database, BarChart3, Building2, Monitor, Wrench, Settings } from "lucide-react";

// Import logos
import philipsLogo from "../assets/PreviousExperience/PhilipsLogo.svg";
import neuLogo from "../assets/PreviousExperience/NEULOGO.png";
import topChoiceLogo from "../assets/PreviousExperience/Topchoicerealtylogo.jpeg";
import robertDefalcoLogo from "../assets/PreviousExperience/RobertDefalcoRealty.webp";

const experiences = [
  {
    type: "work",
    title: "Software Engineering Co-op",
    subtitle: "System Integration and Automation",
    company: "Philips",
    period: "2025 - Present",
    location: "Cambridge, MA",
    logo: philipsLogo,
    description: "Building and scaling VM automation and automated deployment pipelines for Philips' PicIX enterprise imaging platform—from single-node setups to large-scale infrastructure.",
    metrics: [
      { value: "VM", label: "Automation" },
      { value: "PicIX", label: "Platform" },
      { value: "DevOps", label: "Pipelines" },
      { value: "24/7", label: "Uptime" },
    ],
    highlights: [
      {
        icon: Cpu,
        title: "Virtual Machine Automation",
        description: "Designing and implementing large- and small-scale VM automation workflows—provisioning, configuration, and lifecycle management for PicIX infrastructure."
      },
      {
        icon: Zap,
        title: "Automated PicIX Setups",
        description: "Building end-to-end automated setups and deployment pipelines for the PicIX platform, enabling consistent, repeatable deployments across environments."
      },
      {
        icon: Server,
        title: "DevOps & Infrastructure",
        description: "Leveraging C#, PowerShell, and .NET Framework to drive infrastructure-as-code practices, CI/CD, and operational automation for enterprise imaging systems."
      },
      {
        icon: Users,
        title: "Enterprise Impact",
        description: "Automation and tooling directly support healthcare providers globally, ensuring PicIX imaging systems deploy and run reliably at scale."
      }
    ],
    skills: ["C#", ".NET Framework", "PowerShell", "DevOps", "VM Automation", "PicIX", "Infrastructure as Code", "Healthcare IT"],
    icon: Briefcase,
  },
  {
    type: "work",
    title: "Frontend Developer Intern",
    company: "Top Choice Realty",
    period: "Apr 2024 - Aug 2024",
    location: "New York, NY",
    logo: topChoiceLogo,
    description: "Built a full-stack client management application that transformed how 20+ real estate agents access and manage over 800 client records, delivering measurable business impact.",
    highlights: [
      {
        icon: Code,
        title: "Full-Stack Web Application",
        description: "Engineered and launched a client management web application using React, Python, and SQL, reducing average client lookup time by 85% (from 5+ minutes to 45 seconds)."
      },
      {
        icon: Users,
        title: "User-Friendly Interface Design",
        description: "Created intuitive interfaces with guided navigation and visual search tools, empowering non-technical real estate agents to independently manage 800+ client records."
      },
      {
        icon: Database,
        title: "Database Optimization",
        description: "Optimized database queries and implemented caching mechanisms that accelerated data retrieval by 3x, saving the team 15+ hours weekly in administrative tasks."
      },
      {
        icon: BarChart3,
        title: "Measurable Business Impact",
        description: "Eliminated 90% of IT support requests and improved client response times by 60%, directly contributing to better customer service and agent productivity."
      }
    ],
    metrics: [
      { value: "85%", label: "Faster Lookups" },
      { value: "3x", label: "Query Speed" },
      { value: "90%", label: "Less IT Tickets" },
      { value: "15+", label: "Hours Saved/Week" },
    ],
    skills: ["React", "Python", "SQL", "Full-Stack Development", "UI/UX Design", "Database Optimization", "REST APIs"],
    icon: Building2,
  },
  {
    type: "work",
    title: "Computer Technician Intern",
    company: "Robert DeFalco Realty",
    period: "Jun 2023 - Sep 2023",
    location: "New York, NY",
    logo: robertDefalcoLogo,
    description: "Provided hands-on IT support across multiple office locations, configuring systems and troubleshooting technical issues to maintain optimal performance.",
    metrics: [
      { value: "3+", label: "Office Locations" },
      { value: "15+", label: "Systems Configured" },
      { value: "25+", label: "Issues Resolved" },
      { value: "95%+", label: "System Uptime" },
    ],
    highlights: [
      {
        icon: Monitor,
        title: "Multi-Location Technical Support",
        description: "Provided on-site technical support across 3+ office locations, setting up and configuring 15+ computer systems with Windows, macOS, and Linux operating systems."
      },
      {
        icon: Wrench,
        title: "Troubleshooting & Issue Resolution",
        description: "Troubleshot and resolved 25+ technical issues spanning different OS platforms and hardware configurations, optimizing performance across all systems."
      },
      {
        icon: Settings,
        title: "System Maintenance & Uptime",
        description: "Maintained 95%+ system uptime across all office sites through proactive maintenance and quick issue resolution, ensuring seamless hardware and software operation."
      }
    ],
    skills: ["Windows", "macOS", "Linux", "Hardware Configuration", "Troubleshooting", "IT Support", "System Administration"],
    icon: Monitor,
  },
  {
    type: "education",
    title: "Computer Science & Engineering",
    company: "Northeastern University",
    period: "2023 - 2027",
    location: "Boston, MA",
    logo: neuLogo,
    description: "Pursuing a Bachelor's degree with focus on software development, systems programming, and algorithm design. Active in co-op program gaining real-world experience.",
    metrics: [
      { value: "B.S.", label: "Degree" },
      { value: "2027", label: "Expected" },
      { value: "Co-op", label: "Program" },
      { value: "3.5+", label: "GPA Target" },
    ],
    coursework: ["Data Structures & Algorithms", "Object-Oriented Design", "Systems Programming", "Database Management", "Computer Networks"],
    icon: GraduationCap,
  },
];

export default function Experience() {
  const [expandedIndex, setExpandedIndex] = useState(0); // Philips expanded by default

  return (
    <section id="experience" className="relative py-28 px-6 bg-[#0a0a0f]">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-red-500 via-red-600 to-rose-500 bg-clip-text text-transparent">
            Experience
          </h2>
        </motion.div>

        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-8 md:left-12 top-0 bottom-0 w-0.5 bg-gradient-to-b from-red-500 via-rose-500 to-red-500/20" />

          <div className="space-y-8">
            {experiences.map((exp, index) => {
              const Icon = exp.icon;
              const isExpanded = expandedIndex === index;
              const isWork = exp.type === "work";

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="relative pl-20 md:pl-28"
                >
                  {/* Timeline dot */}
                  <div className="absolute left-4 md:left-8 top-0 z-10">
                    <div 
                      className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center border-4 border-[#0a0a0f]
                                 ${isWork ? 'bg-gradient-to-br from-red-500 to-rose-500' : 'bg-gradient-to-br from-rose-500 to-rose-600'}
                                 shadow-lg`}
                      style={{ boxShadow: `0 0 20px ${isWork ? 'rgba(239,68,68,0.4)' : 'rgba(244,63,94,0.4)'}` }}
                    >
                      <Icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                    </div>
                  </div>

                  {/* Content card */}
                  <div 
                    className={`rounded-2xl overflow-hidden transition-all duration-300 
                               ${isExpanded ? 'ring-1 ring-red-500/30' : ''}`}
                    style={{ backgroundColor: '#12121a' }}
                  >
                    {/* Card Header - Clickable */}
                    <button
                      onClick={() => setExpandedIndex(isExpanded ? -1 : index)}
                      className="w-full p-5 md:p-6 text-left hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Company name and badge */}
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-lg font-black tracking-wide text-white">
                              {exp.company.toUpperCase()}
                            </span>
                            <span 
                              className={`px-2.5 py-0.5 text-xs font-semibold rounded-full
                                         ${isWork 
                                           ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                                           : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}
                            >
                              {isWork ? 'Work' : 'Education'}
                            </span>
                          </div>

                          {/* Title */}
                          <h3 className="text-xl font-bold text-white mb-1">
                            {exp.title}
                            {exp.subtitle && (
                              <span className="text-neutral-400 font-normal text-base ml-2">
                                ({exp.subtitle})
                              </span>
                            )}
                          </h3>

                          {/* Meta */}
                          <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-500">
                            <span>{exp.period}</span>
                            <span>•</span>
                            <span>{exp.location}</span>
                          </div>
                        </div>

                        {/* Logo on right side */}
                        <div className="flex items-center gap-3">
                          {exp.logo && (
                            <div className="h-20 md:h-24 w-28 md:w-36 flex items-center justify-center">
                              <img 
                                src={exp.logo} 
                                alt={exp.company}
                                className="h-full w-full object-contain drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                                style={{ filter: 'drop-shadow(0 0 20px rgba(168, 85, 247, 0.4)) drop-shadow(0 0 40px rgba(217, 70, 239, 0.2))' }}
                              />
                            </div>
                          )}
                          {/* Expand button */}
                          <div className={`p-2 rounded-full bg-white/5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                            <ChevronDown className="w-5 h-5 text-neutral-400" />
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Expanded Content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 md:px-6 pb-6 space-y-5">
                            {/* Divider */}
                            <div className="h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />

                            {/* Description */}
                            <p className="text-neutral-400 leading-relaxed">
                              {exp.description}
                            </p>

                            {/* Metrics Grid (for Top Choice Realty) */}
                            {exp.metrics && (
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {exp.metrics.map((metric, i) => (
                                  <div 
                                    key={i}
                                    className="p-3 rounded-xl bg-gradient-to-br from-red-500/10 to-rose-500/10 border border-red-500/20 text-center"
                                  >
                                    <div className="text-2xl font-black text-red-400">{metric.value}</div>
                                    <div className="text-xs text-neutral-500">{metric.label}</div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Work Highlights */}
                            {exp.highlights && (
                              <div className="space-y-4">
                                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                  <Zap className="w-4 h-4 text-red-500" />
                                  Key Responsibilities & Impact
                                </h4>
                                <div className="grid gap-3">
                                  {exp.highlights.map((highlight, i) => {
                                    const HighlightIcon = highlight.icon;
                                    return (
                                      <div 
                                        key={i}
                                        className="p-4 rounded-xl bg-red-500/5 border border-red-500/10"
                                      >
                                        <div className="flex items-start gap-3">
                                          <div className="p-2 rounded-lg bg-red-500/10 shrink-0">
                                            <HighlightIcon className="w-4 h-4 text-red-400" />
                                          </div>
                                          <div>
                                            <h5 className="font-semibold text-white text-sm mb-1">
                                              {highlight.title}
                                            </h5>
                                            <p className="text-neutral-400 text-sm leading-relaxed">
                                              {highlight.description}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Skills/Technologies */}
                            {exp.skills && (
                              <div>
                                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                  <Cpu className="w-4 h-4 text-red-500" />
                                  Technologies & Skills
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {exp.skills.map((skill) => (
                                    <span
                                      key={skill}
                                      className="px-3 py-1.5 text-xs font-medium rounded-lg
                                                 bg-red-500/15 text-red-400 border border-red-500/20"
                                    >
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Coursework for Education */}
                            {exp.coursework && (
                              <div>
                                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-rose-500" />
                                  Relevant Coursework
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {exp.coursework.map((course) => (
                                    <span
                                      key={course}
                                      className="px-3 py-1.5 text-xs font-medium rounded-lg
                                                 bg-rose-500/15 text-rose-400 border border-rose-500/20"
                                    >
                                      {course}
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
