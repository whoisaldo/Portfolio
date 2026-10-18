// src/front/FrontHome.jsx: aliyounes.dev.
//
// Who Ali is, where he has worked, what he has written, where to find him,
// and a door to the playground. Complete on its own: a reader, a recruiter
// included, can learn all of that and leave without ever loading the city.
//
// The theme is the playground's, turned down. Same carbon ground, same bone
// text, and volt for the things to press. What is left out is the volume: no
// audio, no neon, and one hazard strip, on the card that leads to the place
// where all of that lives. The motion is small: the photos and stickers in
// the margins drift a few pixels toward the cursor, the way t3.codes's
// floating marks do, and a photo straightens when it is pointed at. The
// words are src/data/home.js.
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, ChevronDown, FileText, Mail } from "lucide-react";
import { profile, links } from "../data/profile";
import { featuredProjects } from "../data/projects";
import { built, intro, photos, playgroundCard, timeline } from "../data/home";
import { PLAYGROUND } from "../data/site";
import portrait from "../assets/Photos/portrait-seattle-640.webp";
import neon from "../assets/front/playground-neon-1120.webp";
import { posts } from "./posts";
import { COLUMN, useTitle } from "./lib";
import { BrandIcon } from "./icons";
import { FollowOnX, FrontFooter, FrontHeader, PostList, SectionLabel } from "./parts";
import Lightbox from "./Lightbox";
import { Sticker } from "./Stickers";

const LATEST = 5;
const resume = `${import.meta.env.BASE_URL}resume.pdf`;

const projects = built
  .map((b) => ({ ...featuredProjects.find((p) => p.slug === b.slug), line: b.line }))
  .filter((p) => p.title);

/** The work history, one entry a company, laid out the way hadisalman.com
 *  lays out its journey: a dot on a line, the logo, the dates, the company,
 *  what it is, and each role there with its own dates. A filled dot is one
 *  still going, or about to start. */
function Timeline({ items }) {
  return (
    <ol className="mt-6">
      {items.map((item, i) => (
        <li key={item.org} className="relative grid grid-cols-[2.5rem_1fr] gap-x-4 pb-9 pl-7 last:pb-0 sm:grid-cols-[3rem_1fr] sm:gap-x-5">
          {i < items.length - 1 && <span className="absolute -bottom-1 left-[5px] top-5 w-px bg-bone/15" aria-hidden="true" />}
          <span
            className={`absolute left-0 top-1.5 size-[11px] rounded-full border-2 ${item.current ? "border-volt bg-volt" : "border-bone/40 bg-ink"}`}
            aria-hidden="true"
          />
          {/* On the dark tile every logo shares; all were checked against it. */}
          <div className="chamfer chamfer-sm flex size-10 items-center justify-center bg-ink-raised p-1.5 sm:size-12 sm:p-2">
            <img src={item.logo} alt="" loading="lazy" decoding="async" className="size-full object-contain" />
          </div>
          <div className="min-w-0">
            <p className="text-sm tabular-nums text-dim">{item.when}</p>
            <h3 className="mt-0.5 font-display text-lg font-semibold leading-snug text-bone text-balance">{item.org}</h3>
            {item.role && <p className="text-muted">{item.role}</p>}
            {item.note && <p className="mt-1 text-pretty text-sm text-dim">{item.note}</p>}
            {item.roles && (
              <ul className="mt-3 space-y-3">
                {item.roles.map((role) => (
                  <li key={role.title} className="relative pl-4">
                    <span className="absolute left-0 top-2.5 size-1 rounded-full bg-volt" aria-hidden="true" />
                    <p className="font-medium text-bone">
                      {role.title}
                      {role.incoming && <span className="ml-2 text-sm font-semibold text-volt">Incoming</span>}
                    </p>
                    <p className="text-sm tabular-nums text-dim">{role.when}</p>
                    {role.note && <p className="mt-0.5 text-pretty text-sm text-dim">{role.note}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

// Every photo on the page, in the order they appear, for the full-size view
// to step through.
const gallery = Object.values(photos);
const OpenPhoto = createContext(() => {});

// The tilted ones straighten, lift and grow a little under the pointer. The
// Boston band is the width of the page and stays where it is.
const lift =
  "transition-transform duration-200 ease-out hover:z-10 hover:-translate-y-1.5 hover:rotate-0 hover:scale-105 focus-visible:rotate-0 motion-reduce:transition-none";

/** One photo, no caption. Size and tilt are set where it is placed. Pointed
 *  at, it straightens and lifts; pressed, it opens full size. */
function Photo({ photo, wide = false, className = "" }) {
  const open = useContext(OpenPhoto);
  return (
    <span className={`relative block ${wide ? "w-full" : lift} ${className}`}>
      <button type="button" onClick={() => open(photo)} className="block w-full cursor-zoom-in">
        <img
          src={photo.src}
          alt={photo.alt}
          width={wide ? 1120 : 480}
          height={wide ? 630 : 640}
          loading="lazy"
          decoding="async"
          className={`chamfer chamfer-sm block w-full bg-ink-raised object-cover ${wide ? "aspect-video" : "aspect-[3/4]"}`}
        />
      </button>
    </span>
  );
}

/** A thing in the margin that drifts toward the cursor. --px and --py run
 *  -1 to 1 across the window (set on <main> below); `depth` is how many
 *  pixels that is at the edge, so nearer things move further. `translate`
 *  rather than `transform`, so it adds to a photo's own tilt and lift
 *  instead of replacing them. */
function Float({ depth, className = "", style, children }) {
  return (
    <div
      className={`absolute hidden hover:z-10 motion-safe:transition-[translate] motion-safe:duration-700 motion-safe:ease-out xl:block ${className}`}
      style={{ ...style, translate: `calc(var(--px, 0) * ${depth}px) calc(var(--py, 0) * ${depth}px)` }}
    >
      {children}
    </div>
  );
}

// Where each section's photos and stickers go. From xl up the page has room
// either side of the column, so they hang in the margins beside the section,
// tilted a little either way, and drift with the cursor (`depth`: stickers
// more than photos, and not two the same). Below xl the photos sit in the
// column as a tilted row, except the ones marked `inline: false`, which a
// phone has no room for; the stickers are margin-only.
//
// A photo's `place` is Tailwind. A sticker's `at` is [side, x, y, tilt]:
// the left or right margin, pixels out from the column, pixels down from the
// section's top, degrees. Set by hand to look thrown on rather than laid
// out, and checked at 1280 and 1440 wide so none lands on a photo or off
// the screen. The S4 and S6 badges sit by their engine bays.
const SCATTER = {
  intro: [
    { photo: photos.aws, tilt: "rotate-2", place: "left-full top-28 ml-14 w-44", depth: 10 },
    { photo: photos.amazon, tilt: "-rotate-3", place: "right-full top-64 mr-14 w-40", depth: 12 },
    { sticker: "claude", at: ["l", 186, 6, -14], depth: 24 },
    { sticker: "kiro", at: ["r", 196, 38, 11], depth: 18 },
    { sticker: "openai", at: ["r", 26, 392, 8], depth: 22 },
    { sticker: "aws", at: ["l", 14, 486, -9], depth: 16 },
  ],
  writing: [
    { photo: photos.seattle, tilt: "-rotate-2", place: "right-full top-0 mr-14 w-44", depth: 12 },
    { photo: photos.needle, tilt: "rotate-3", place: "left-full top-36 ml-16 w-36", depth: 10 },
    { sticker: "philips", at: ["r", 168, 4, 13], depth: 20 },
    { sticker: "jett", at: ["l", 150, 282, -21], depth: 26 },
    { sticker: "eddies", at: ["r", 32, 404, -11], depth: 17 },
  ],
  experience: [
    { photo: photos.s4Engine, tilt: "-rotate-2", place: "right-full top-12 mr-14 w-40", depth: 10, inline: false },
    { sticker: "s4", at: ["l", 112, 282, -8], depth: 15 },
    { photo: photos.s6Engine, tilt: "rotate-2", place: "left-full top-12 ml-14 w-40", depth: 12, inline: false },
    { sticker: "s6", at: ["r", 84, 284, 7], depth: 19 },
    { sticker: "jackal", at: ["r", 188, 372, 14], depth: 23 },
    { sticker: "ie", at: ["l", 38, 392, -6], depth: 18 },
    { sticker: "daggers", at: ["l", 168, 528, 17], depth: 25 },
    { sticker: "pinnatec", at: ["r", 34, 566, -12], depth: 16 },
    { sticker: "porsche", at: ["l", 62, 812, -10], depth: 21 },
  ],
  built: [
    { photo: photos.wrestling, tilt: "-rotate-2", place: "right-full top-6 mr-14 w-44", depth: 10 },
    { photo: photos.robot, tilt: "rotate-2", place: "left-full top-2 ml-14 w-40", depth: 12, inline: false },
    { sticker: "nvidia", at: ["r", 186, 252, -9], depth: 22 },
    { sticker: "amd", at: ["l", 26, 300, 6], depth: 18 },
  ],
  // The two cars, both outside the Boston Public Library, beside the way
  // into the garage they are parked in.
  playground: [
    { photo: photos.s4, tilt: "rotate-2", place: "right-full top-6 mr-14 w-44", depth: 10 },
    { photo: photos.s6, tilt: "-rotate-2", place: "left-full top-24 ml-14 w-44", depth: 12 },
    { sticker: "gourd", at: ["l", 156, 300, -8], depth: 24 },
    { sticker: "audi", at: ["r", 96, 360, -5], depth: 17 },
  ],
};

/** A sticker's spot, from its `at`. */
function spot([side, x, y]) {
  return { top: y, [side === "l" ? "right" : "left"]: `calc(100% + ${x}px)` };
}

function Scatter({ items, className = "" }) {
  const inline = items.filter((item) => item.photo && item.inline !== false);
  return (
    <>
      {inline.length > 0 && (
        <div className={`flex items-end justify-center gap-5 xl:hidden ${className}`}>
          {inline.map((item) => (
            <Photo key={item.photo.src} photo={item.photo} className={`w-36 sm:w-44 ${item.tilt}`} />
          ))}
        </div>
      )}
      {items.map((item) =>
        item.photo ? (
          <Float key={item.photo.src} depth={item.depth} className={item.place}>
            <Photo photo={item.photo} className={item.tilt} />
          </Float>
        ) : (
          <Float key={item.sticker} depth={item.depth} style={spot(item.at)}>
            <span className="block" style={{ rotate: `${item.at[3]}deg` }} data-sticker={item.sticker}>
              <Sticker name={item.sticker} />
            </span>
          </Float>
        ),
      )}
    </>
  );
}

const textLink =
  "inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors duration-150 hover:text-volt";

export default function FrontHome() {
  useTitle(`${profile.name} · Software Engineer`);
  const [shown, setShown] = useState(null);
  const openPhoto = (photo) => setShown(gallery.indexOf(photo));

  // The cursor's place in the window, -1 to 1 on each axis, as --px and
  // --py on <main>, for the margin's Floats. Once a frame at most, and only
  // for a mouse or trackpad and a reader who has not asked for less motion.
  const stage = useRef(null);
  useEffect(() => {
    const el = stage.current;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let x = 0;
    let y = 0;
    const apply = () => {
      frame = 0;
      el.style.setProperty("--px", x.toFixed(3));
      el.style.setProperty("--py", y.toFixed(3));
    };
    const move = (e) => {
      x = (e.clientX / window.innerWidth) * 2 - 1;
      y = (e.clientY / window.innerHeight) * 2 - 1;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <OpenPhoto.Provider value={openPhoto}>
      <FrontHeader />

      <main ref={stage} className={`${COLUMN} pb-24`}>
        <section aria-labelledby="intro" className="relative pt-16 sm:pt-24">
          <div className="flex items-center gap-5">
            <img
              src={portrait}
              alt={profile.name}
              width="96"
              height="96"
              className="chamfer size-20 shrink-0 object-cover sm:size-24"
            />
            <div>
              <h1 id="intro" className="font-display text-4xl font-semibold leading-none text-bone text-balance sm:text-5xl">
                {profile.name}
              </h1>
              <p className="mt-2.5 text-dim">Software engineer · {profile.base}</p>
            </div>
          </div>

          <p className="prose-lede mt-10 text-pretty">{intro.lede}</p>
          <p className="prose-dark mt-4 text-pretty">{intro.line}</p>

          {/* X on a line of its own on a phone, so the four text links wrap
              as a group instead of one of them riding beside the button. */}
          <div className="mt-8 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-6">
            <FollowOnX />
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              <a href={links.github} target="_blank" rel="noreferrer" className={textLink}>
                <BrandIcon name="github" /> GitHub
              </a>
              <a href={links.linkedin} target="_blank" rel="noreferrer" className={textLink}>
                <BrandIcon name="linkedin" /> LinkedIn
              </a>
              <a href={resume} target="_blank" rel="noreferrer" className={textLink}>
                <FileText className="size-4" aria-hidden="true" /> Résumé
              </a>
              <a href={links.email} className={textLink}>
                <Mail className="size-4" aria-hidden="true" /> Email
              </a>
            </div>
          </div>

          <Scatter items={SCATTER.intro} className="mt-12" />
        </section>

        {/* Second, straight under the intro: writing is half of what this
            page is for, and down between Experience and the projects it was
            the easiest thing on it to miss. */}
        <section aria-labelledby="writing" className="relative mt-16 xl:mt-20">
          <SectionLabel
            id="writing"
            action={
              <Link to="/blog" className={textLink}>
                All posts <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            }
          >
            Writing
          </SectionLabel>
          <div className="mt-5">
            <PostList posts={posts.slice(0, LATEST)} />
          </div>
          <Scatter items={SCATTER.writing} className="mt-12" />
        </section>

        <section aria-labelledby="experience" className="relative mt-16 xl:mt-20">
          <Scatter items={SCATTER.experience} />
          <SectionLabel id="experience">Experience</SectionLabel>
          <Timeline items={timeline} />
        </section>

        <Photo photo={photos.boston} wide className="mt-16" />

        <section aria-labelledby="built" className="relative mt-16">
          <SectionLabel id="built">Things I’ve built</SectionLabel>
          {/* Closed, a row is a name and one sentence. Open, it adds the
              project's own two lines, its stack and its links, and no more.
              <details> because it is the disclosure the browser already
              makes keyboard- and reader-friendly. */}
          <ul className="mt-2">
            {projects.map((project) => (
              <li key={project.slug} className="border-b border-ink-line last:border-b-0">
                <details className="group">
                  <summary className="group/row flex cursor-pointer list-none items-center justify-between gap-4 py-4 [&::-webkit-details-marker]:hidden">
                    <div className="min-w-0">
                      <h3 className="font-display text-lg font-semibold text-bone transition-colors duration-150 group-hover/row:text-volt">
                        {project.title}
                      </h3>
                      <p className="mt-0.5 text-pretty text-dim">{project.line}</p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-dim group-open:text-bone">
                      <span className="group-open:hidden">More</span>
                      <span className="hidden group-open:inline">Less</span>
                      <ChevronDown className="size-4 group-open:rotate-180" aria-hidden="true" />
                    </span>
                  </summary>
                  <div className="pb-5 sm:pr-16">
                    <p className="text-pretty text-muted">{project.description}</p>
                    <p className="mt-2 text-sm text-dim">{project.tech.slice(0, 5).join(" · ")}</p>
                    <div className="mt-3 flex gap-6">
                      {project.live && (
                        <a href={project.live} target="_blank" rel="noreferrer" className={textLink}>
                          Site <ArrowUpRight className="size-3.5" aria-hidden="true" />
                        </a>
                      )}
                      {project.github && (
                        <a href={project.github} target="_blank" rel="noreferrer" className={textLink}>
                          <BrandIcon name="github" className="size-3.5" /> Source
                        </a>
                      )}
                    </div>
                  </div>
                </details>
              </li>
            ))}
          </ul>

          <Scatter items={SCATTER.built} className="mt-12" />
        </section>

        <section aria-labelledby="playground" className="relative mt-16 xl:mt-20">
          <Scatter items={SCATTER.playground} className="mb-12" />
          {/* door: true puts the playground's door up whatever the sound
              preference says, so this is always the way in through the
              entrance (src/components/EntryGate.jsx). */}
          <Link
            to={PLAYGROUND}
            state={{ door: true }}
            className="chamfer group block overflow-hidden bg-ink-raised"
          >
            {/* The one hazard strip on this page, on the way into the place
                that has the rest of them. */}
            <div className="hazard h-1.5" aria-hidden="true" />
            <img
              src={neon}
              alt=""
              width="1120"
              height="560"
              loading="lazy"
              decoding="async"
              className="aspect-[2/1] w-full object-cover opacity-75 transition-opacity duration-200 group-hover:opacity-100"
            />
            <div className="p-5 sm:p-7">
              <p className="text-sm font-medium text-volt">{playgroundCard.label}</p>
              <h2 id="playground" className="mt-2 font-display text-2xl font-semibold leading-tight text-bone text-balance">
                {playgroundCard.title}
              </h2>
              <p className="mt-2 text-dim">{playgroundCard.body}</p>
              <span className="mt-6 inline-flex items-center gap-2 font-semibold text-volt">
                {playgroundCard.cta}
                <ArrowRight className="size-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </div>
          </Link>
        </section>
      </main>

      <FrontFooter />
      <Lightbox photos={gallery} index={shown} onChange={setShown} onClose={() => setShown(null)} />
    </OpenPhoto.Provider>
  );
}
