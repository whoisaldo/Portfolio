// The recruiter portfolio. Presentation stays here; shared source data is read-only.
import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Bot,
  Braces,
  Cloud,
  Cpu,
  Database,
  FileText,
  Github,
  Linkedin,
  Mail,
  MapPin,
  PanelsTopLeft,
  Wrench,
  Workflow,
} from "lucide-react";
import { profile, emails, links, skills } from "../data/profile";
import { experiences } from "../data/experience";
import { featuredProjects, otherProjects } from "../data/projects";
import { hasWorkPage } from "../data/work";
import ProjectImage from "../components/projects/ProjectImage";
import portrait from "../assets/Photos/portrait-seattle-640.webp";
import { PlainBar, PlainFooter, PlainSection, Chip } from "./recruiters-shared";
import {
  usePlainDocument,
  pdf,
  projectLabels,
  statusLabel,
} from "./recruiters-lib";

const work = experiences.filter((e) => e.type === "work");
const education = experiences.filter((e) => e.type === "education");
const primary = emails.find((e) => e.primary) ?? emails[0];
const selectedSlugs = [
  "eternal-monitor",
  "exerly-fitness",
  "sideband",
  "eternal-rich-presence",
];
const selectedProjects = selectedSlugs
  .map((slug) => featuredProjects.find((p) => p.slug === slug))
  .filter(Boolean);
const moreProjects = featuredProjects.filter(
  (p) => !selectedSlugs.includes(p.slug),
);
const liveCount = featuredProjects.filter((p) => p.status === "live").length;
const skillIcons = {
  Languages: Braces,
  Frontend: PanelsTopLeft,
  Backend: Database,
  Systems: Cpu,
  "Cloud & infra": Cloud,
  AI: Bot,
  Agents: Workflow,
  Tools: Wrench,
};
const emailLabels = {
  school: "University",
  personal: "Personal",
  studio: "Studio",
};

function ExperienceItem({ entry }) {
  // Only a role with a case study has a page that says more than this does.
  const hasCaseStudy = entry.caseStudy && hasWorkPage(entry.slug);
  return (
    <li className="rp-role">
      <div className={`rp-company-logo rp-company-logo-${entry.slug}`}>
        <img src={entry.logo} alt="" width="64" height="64" loading="lazy" />
      </div>
      <header className="rp-role-head">
        <div className="rp-role-heading">
          <h3>{entry.company}</h3>
          {entry.badge && (
            <span className="rp-status">
              <span aria-hidden="true" />
              {entry.badge}
            </span>
          )}
        </div>
        <p className="rp-role-title">{entry.title}</p>
        <p className="rp-role-meta">
          {entry.period}
          <span aria-hidden="true"> · </span>
          {entry.location}
        </p>
        {entry.subtitle && <p className="rp-role-subtitle">{entry.subtitle}</p>}
      </header>
      <div className="rp-role-main">
        <p className="rp-role-description">{entry.description}</p>
        {entry.highlights && (
          <ul className="rp-role-highlights">
            {entry.highlights.map((highlight) => (
              <li key={highlight.title}>
                <strong>{highlight.title}.</strong> {highlight.description}
              </li>
            ))}
          </ul>
        )}
        {(hasCaseStudy || entry.github) && (
          <div className="rp-role-links">
            {hasCaseStudy && (
              <Link
                to={`/recruiters/work/${entry.slug}`}
                className="rp-text-link"
              >
                Read case study
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            )}
            {entry.github && (
              <a
                href={entry.github}
                target="_blank"
                rel="noreferrer"
                className="rp-text-link"
              >
                <Github size={15} aria-hidden="true" />
                Source
                <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            )}
          </div>
        )}
      </div>
      <aside className="rp-role-aside">
        {/* Labels print as written. Lowercasing them turned DescribeType, IT
            and CI into describetype, it and ci. */}
        {entry.metrics && (
          <dl className="rp-stats">
            {entry.metrics.map((m) => (
              <div key={m.label}>
                <dt>{m.label}</dt>
                <dd>{m.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {entry.skills && (
          <ul className="rp-chips" aria-label={`${entry.company} technologies`}>
            {entry.skills.map((s) => (
              <Chip key={s}>{s}</Chip>
            ))}
          </ul>
        )}
      </aside>
    </li>
  );
}

function ProjectMeta({ project }) {
  return (
    <div className="rp-project-meta">
      <span className="rp-eyebrow">
        {projectLabels[project.slug] ?? "Independent project"}
      </span>
      <span
        className={`rp-status${project.status === "live" ? "" : " rp-status-building"}`}
      >
        <span aria-hidden="true" />
        {statusLabel(project.status)}
      </span>
    </div>
  );
}

/** The second tier: every fact a card carries, at a quarter of the height. */
function ProjectRow({ project }) {
  const image = project.images[1] ?? project.images[0];
  return (
    <li className="rp-mini">
      <Link
        to={`/recruiters/work/${project.slug}`}
        className="rp-mini-cover"
        tabIndex={-1}
        aria-hidden="true"
      >
        <img
          src={image.thumb ?? image.src}
          alt=""
          width="320"
          height="220"
          loading="lazy"
          decoding="async"
        />
      </Link>
      <div className="rp-mini-content">
        <ProjectMeta project={project} />
        <h4>
          <Link to={`/recruiters/work/${project.slug}`}>{project.title}</Link>
        </h4>
        <p>{project.description}</p>
        <div className="rp-mini-links">
          <Link
            className="rp-text-link"
            to={`/recruiters/work/${project.slug}`}
          >
            View project
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
          {project.github && (
            <a
              href={project.github}
              target="_blank"
              rel="noreferrer"
              aria-label={`${project.title} source on GitHub`}
            >
              <Github size={16} aria-hidden="true" />
            </a>
          )}
          {project.live && (
            <a href={project.live} target="_blank" rel="noreferrer">
              Live site
              <ArrowUpRight size={13} aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    </li>
  );
}

function ProjectCard({ project }) {
  return (
    <li className={`rp-project rp-project-${project.slug}`}>
      <Link
        to={`/recruiters/work/${project.slug}`}
        className="rp-project-cover"
        tabIndex={-1}
        aria-hidden="true"
      >
        <div className="rp-browser-bar" aria-hidden="true">
          <span className="rp-browser-dots">
            <i />
            <i />
            <i />
          </span>
          <span>
            {project.live
              ? new URL(project.live).hostname.replace(/^www\./, "")
              : project.title}
          </span>
          <ArrowUpRight size={13} />
        </div>
        <ProjectImage
          image={project.images[1] ?? project.images[0]}
          alt=""
          loading="lazy"
          sizes="(min-width: 1200px) 500px, (min-width: 720px) 44vw, 90vw"
          className="rp-project-image"
        />
      </Link>
      <div className="rp-project-content">
        <ProjectMeta project={project} />
        <h3>
          <Link to={`/recruiters/work/${project.slug}`}>{project.title}</Link>
        </h3>
        <p>{project.description}</p>
        <ul className="rp-chips" aria-label={`${project.title} technologies`}>
          {project.tech.map((t) => (
            <Chip key={t}>{t}</Chip>
          ))}
        </ul>
        <div className="rp-project-links">
          <Link
            className="rp-text-link"
            to={`/recruiters/work/${project.slug}`}
          >
            View project
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
          <div>
            {project.github && (
              <a
                href={project.github}
                target="_blank"
                rel="noreferrer"
                aria-label={`${project.title} source on GitHub`}
              >
                <Github size={17} aria-hidden="true" />
              </a>
            )}
            {project.live && (
              <a href={project.live} target="_blank" rel="noreferrer">
                Live site
                <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

export default function Recruiters() {
  const theme = usePlainDocument(
    `${profile.name} · Software engineer · Résumé and portfolio`,
  );
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    const go = () =>
      document
        .getElementById(hash.slice(1))
        ?.scrollIntoView({ block: "start" });
    const frame = requestAnimationFrame(go);
    const timer = setTimeout(go, 150);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [hash]);

  return (
    <div className="rp min-h-screen" data-rp-theme={theme}>
      <PlainBar home />
      <main id="main-content" className="rp-wrap" tabIndex={-1}>
        <section className="rp-hero" aria-labelledby="intro-heading">
          <div className="rp-hero-head">
            <p className="rp-eyebrow rp-hero-eyebrow">
              <span aria-hidden="true" />
              Software engineer · {profile.base}
            </p>
            <h1 id="intro-heading">
              {profile.name}
              <span>.</span>
            </h1>
            <p className="rp-hero-tagline">Systems, iOS & the web.</p>
          </div>
          <div className="rp-hero-body">
            <p className="rp-hero-intro">
              {profile.degree} at {profile.school}, class of{" "}
              {profile.gradYear.replace("’", "'")}. I build cloud
              infrastructure, native apps, and the tools that connect them.
            </p>
            <p className="rp-hero-current">
              Currently at{" "}
              {profile.current.map((role, i) => (
                <React.Fragment key={role.org}>
                  {i > 0 &&
                    (i === profile.current.length - 1 ? ", and " : ", ")}
                  <strong>{role.org}</strong>
                </React.Fragment>
              ))}
              . Previously {profile.prev.role} at{" "}
              <strong>{profile.prev.org}</strong>.
            </p>
            <div className="rp-hero-actions">
              <a
                href={pdf}
                download="Ali_Younes_Resume.pdf"
                className="rp-button"
              >
                <ArrowDownToLine size={17} aria-hidden="true" />
                Download résumé
              </a>
              <a
                href={`mailto:${primary.value}`}
                className="rp-button rp-button-secondary"
              >
                <Mail size={17} aria-hidden="true" />
                Get in touch
              </a>
            </div>
            <div className="rp-hero-socials">
              <a href={links.github} target="_blank" rel="noreferrer">
                <Github size={16} aria-hidden="true" />
                GitHub
                <ArrowUpRight size={13} aria-hidden="true" />
              </a>
              <a href={links.linkedin} target="_blank" rel="noreferrer">
                <Linkedin size={16} aria-hidden="true" />
                LinkedIn
                <ArrowUpRight size={13} aria-hidden="true" />
              </a>
              <a href={links.studio} target="_blank" rel="noreferrer">
                Co-founder, Sideband
                <ArrowUpRight size={13} aria-hidden="true" />
              </a>
            </div>
          </div>
          <figure className="rp-portrait">
            <img
              src={portrait}
              alt="Ali Younes in Seattle"
              width="640"
              height="800"
              fetchPriority="high"
            />
            <figcaption>
              <MapPin size={14} aria-hidden="true" />A summer in Seattle
              <span>2026</span>
            </figcaption>
          </figure>
        </section>

        <div className="rp-at-a-glance" aria-label="Recent organizations">
          <p className="rp-eyebrow">Where I've been building</p>
          <div className="rp-organizations">
            {work.slice(0, 4).map((entry) => (
              <a
                href="#experience"
                key={entry.slug}
                className="rp-organization"
              >
                <span
                  className={`rp-company-logo rp-company-logo-${entry.slug}`}
                >
                  <img src={entry.logo} alt="" width="52" height="36" />
                </span>
                <span>
                  <strong>{entry.company}</strong>
                  <span>{entry.badge ? "Current" : entry.period}</span>
                </span>
              </a>
            ))}
          </div>
        </div>

        <PlainSection id="experience" title="Experience" number="01">
          <ol className="rp-timeline">
            {work.map((e) => (
              <ExperienceItem key={e.slug} entry={e} />
            ))}
          </ol>
        </PlainSection>

        <PlainSection
          id="projects"
          title="Projects"
          number="02"
          aside={`${featuredProjects.length} projects, ${liveCount} live`}
        >
          <ol className="rp-project-grid">
            {selectedProjects.map((p) => (
              <ProjectCard key={p.slug} project={p} />
            ))}
          </ol>
          <h3 className="rp-subheading">
            More projects <span>{moreProjects.length}</span>
          </h3>
          <ol className="rp-mini-grid">
            {moreProjects.map((p) => (
              <ProjectRow key={p.slug} project={p} />
            ))}
          </ol>
          <h3 className="rp-subheading">
            Smaller builds & coursework <span>{otherProjects.length}</span>
          </h3>
          <ul className="rp-repositories">
            {otherProjects.map((p) => (
              <li key={p.title}>
                <a href={p.github} target="_blank" rel="noreferrer">
                  <span>
                    <strong>{p.title}</strong>
                    <span>{p.description}</span>
                  </span>
                  <ArrowUpRight size={17} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </PlainSection>

        <PlainSection
          id="skills"
          title="Skills"
          number="03"
          aside="Grouped, not ranked"
        >
          <dl className="rp-skills-grid">
            {skills.map((group) => {
              const Icon = skillIcons[group.group];
              return (
                <div key={group.group} className="rp-skill-group">
                  <dt>
                    {Icon && <Icon size={19} aria-hidden="true" />}
                    {group.group}
                  </dt>
                  <dd>{group.items.join(" · ")}</dd>
                </div>
              );
            })}
          </dl>
        </PlainSection>

        <PlainSection id="education" title="Education" number="04">
          {education.map((entry) => (
            <article key={entry.slug} className="rp-education">
              <div className="rp-education-logo">
                <img
                  src={entry.logo}
                  alt=""
                  width="72"
                  height="72"
                  loading="lazy"
                />
              </div>
              <div className="rp-education-content">
                <div className="rp-education-heading">
                  <h3>{entry.company}</h3>
                  <span>{entry.period}</span>
                </div>
                <p className="rp-degree">B.S. {entry.title}</p>
                <p className="rp-muted">{entry.description}</p>
                {entry.coursework && (
                  <div className="rp-coursework">
                    <span>Relevant coursework</span>
                    <ul className="rp-chips">
                      {entry.coursework.map((course) => (
                        <Chip key={course}>{course}</Chip>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </article>
          ))}
        </PlainSection>

        <PlainSection id="resume" title="Résumé" number="05">
          <div className="rp-resume">
            <div className="rp-resume-card">
              <span className="rp-resume-icon">
                <FileText size={27} strokeWidth={1.4} aria-hidden="true" />
              </span>
              <h3>{profile.name} · Résumé</h3>
              <p>Experience, education, and technical skills. One page, PDF.</p>
              <div className="rp-resume-actions">
                <a
                  href={pdf}
                  download="Ali_Younes_Resume.pdf"
                  className="rp-button"
                >
                  <ArrowDownToLine size={16} aria-hidden="true" />
                  Download PDF
                </a>
                <a
                  href={pdf}
                  target="_blank"
                  rel="noreferrer"
                  className="rp-text-link"
                >
                  Open in a new tab
                  <ArrowUpRight size={14} aria-hidden="true" />
                </a>
              </div>
            </div>
            {/* A picture of the PDF, made of the PDF: the frame takes no
                pointer events, and the link laid over it opens the file. */}
            <div className="rp-resume-preview">
              <iframe
                src={`${pdf}#toolbar=0&navpanes=0&view=FitH`}
                title={`${profile.name}, one-page résumé`}
                loading="lazy"
                tabIndex={-1}
                aria-hidden="true"
              />
              <a
                href={pdf}
                target="_blank"
                rel="noreferrer"
                aria-label="Open the résumé in a new tab"
              />
            </div>
          </div>
        </PlainSection>

        <section
          id="contact"
          className="rp-contact rp-section"
          aria-labelledby="contact-heading"
        >
          <div className="rp-contact-main">
            <p className="rp-eyebrow">06 / Get in touch</p>
            <h2 id="contact-heading">Let's talk.</h2>
            <p>
              For engineering opportunities, collaborations, or a conversation
              about the work.
            </p>
            <a href={`mailto:${primary.value}`} className="rp-contact-email">
              {primary.value}
              <ArrowUpRight size={23} aria-hidden="true" />
            </a>
          </div>
          <div className="rp-contact-other">
            <p className="rp-eyebrow">Also find me here</p>
            <dl>
              {emails
                .filter((e) => !e.primary)
                .map((e) => (
                  <div key={e.key}>
                    <dt>{emailLabels[e.key] ?? e.key}</dt>
                    <dd>
                      <a href={`mailto:${e.value}`}>
                        {e.value}
                        <ArrowUpRight size={14} aria-hidden="true" />
                      </a>
                    </dd>
                  </div>
                ))}
            </dl>
            <div className="rp-contact-socials">
              <a href={links.github} target="_blank" rel="noreferrer">
                <Github size={16} aria-hidden="true" />
                GitHub
              </a>
              <a href={links.linkedin} target="_blank" rel="noreferrer">
                <Linkedin size={16} aria-hidden="true" />
                LinkedIn
              </a>
            </div>
          </div>
        </section>
      </main>
      <PlainFooter />
    </div>
  );
}
