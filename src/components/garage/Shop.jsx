// src/components/garage/Shop.jsx: "Also in the shop", in both layouts.
//
// The 328xi, the bench and the two competitions (src/data/life.js), all
// eight photographs with their captions, dates and the MassLive link, never
// edited here.
//
// Shop is the grid the section has always had under the bay, for the
// photographs layout. ShopCard is the same content for the workshop's last
// station, where the photographs themselves hang on the wall in 3D: a
// tablist of the three boards and the chosen board's captions, so every
// item and the link stay reachable from the keyboard and readable to a
// screen reader, and on a phone the camera can frame the chosen board.
import React from "react";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { teardown } from "../../data/life";
import Panel from "../ui/Panel";
import Picture from "../Picture";
import Tabs from "./Tabs";
import { ANCHOR } from "./focus";
import { GARAGE_PHOTOS_ENABLED } from "./features";

const reveal = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-70px" },
};

function ShopLink({ link }) {
  return (
    <a
      href={link.href}
      target="_blank"
      rel="noreferrer"
      className="mt-3 inline-flex items-center gap-2 mono-micro text-dim transition-colors hover:text-volt"
    >
      <span className="ink-underline">{link.label}</span>
      <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
    </a>
  );
}

export default function Shop({ reduced = false, still = false, headingLevel = 3 }) {
  if (!GARAGE_PHOTOS_ENABLED) return <ShopText headingLevel={headingLevel} />;
  const H = `h${headingLevel}`;
  const G = `h${headingLevel + 1}`;
  // A layout replacement must paint its final content before B5 restores its anchor.
  const item = reduced || still ? { initial: false, animate: { opacity: 1, y: 0 } } : reveal;
  return (
    <div className="mt-20 md:mt-24">
      <motion.header {...item} transition={{ duration: 0.6 }} className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 pb-5 border-b border-ink-line">
        <H {...{ [ANCHOR]: "shop" }} tabIndex={-1} className="font-display uppercase text-display-2 text-primary">{teardown.title}</H>
        <p className="prose-dark text-[0.9375rem]">{teardown.lede}</p>
      </motion.header>

      <div className="mt-10 space-y-14">
        {teardown.groups.map((group) => {
          const photos = teardown.photos.filter((p) => p.group === group.id);
          if (!photos.length) return null;
          return (
            <section key={group.id} aria-label={group.label}>
              <header className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 pb-4 border-b border-ink-line">
                <G className="font-display uppercase text-display-3 text-primary">{group.label}</G>
                <p className="text-[0.9375rem] text-dim">{group.note}</p>
              </header>
              <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {photos.map((p, i) => (
                  <motion.li key={p.slug} {...item} transition={{ duration: 0.5, delay: Math.min(i, 2) * 0.05 }} className="group">
                    <Panel
                      corner="br"
                      edge="bg-ink-line group-hover:bg-volt transition-colors duration-300"
                      innerClassName="relative aspect-[4/3] overflow-hidden"
                    >
                      <div aria-hidden="true" className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${p.image.lqip}")` }} />
                      <Picture
                        sources={p.image}
                        alt={p.alt}
                        loading="lazy"
                        sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
                        className={`relative w-full h-full object-cover saturate-[0.9] transition-[filter,transform] duration-500 ease-out
                                    group-hover:saturate-100 group-hover:scale-[1.02] ${p.focus ?? "object-center"}`}
                      />
                      {p.date && (
                        <span className="absolute top-0 right-0 m-3 mono-micro text-dim bg-ink/80 px-2 py-1 chamfer chamfer-sm">{p.date}</span>
                      )}
                    </Panel>
                    <figcaption className="mt-4">
                      <h5 className="font-display uppercase font-semibold text-primary text-[1.0625rem] tracking-tight">{p.title}</h5>
                      {p.body && <p className="mt-2 prose-dark text-[0.9375rem] leading-[1.6]">{p.body}</p>}
                      {p.link && <ShopLink link={p.link} />}
                    </figcaption>
                  </motion.li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/** The wall's three boards as a tablist and the chosen board's captions. */
export function ShopCard({ group, onGroup, idBase, compact = false }) {
  if (!GARAGE_PHOTOS_ENABLED) return <ShopText compact={compact} />;
  const current = teardown.groups.find((g) => g.id === group) ?? teardown.groups[0];
  const photos = teardown.photos.filter((p) => p.group === current.id);
  const items = teardown.groups.map((g) => ({ id: g.id, label: g.label, key: `shop:${g.id}` }));
  return (
    <div className="gw-card">
      <p className="mono-label text-volt">{teardown.title}</p>
      <Tabs
        items={items}
        value={current.id}
        onChange={onGroup}
        label="Boards on the shop wall"
        idBase={`${idBase}-shop`}
        controls={`${idBase}-shop-panel`}
        className="mt-3 flex flex-wrap gap-1 -mx-1"
        tabClassName="gw-tab"
      />
      <div
        role="tabpanel"
        id={`${idBase}-shop-panel`}
        aria-labelledby={`${idBase}-shop-tab-${current.id}`}
        className={`mt-3 ${compact ? "gw-card-scroll" : ""}`}
      >
        <p className="text-[0.875rem] text-dim">{current.note}</p>
        <ul className="mt-3 space-y-4">
          {photos.map((p) => (
            <li key={p.slug}>
              <p className="flex items-baseline justify-between gap-3">
                <span className="font-display uppercase font-semibold text-primary text-[1rem] tracking-tight">{p.title}</span>
                {p.date && <span className="mono-micro text-dim shrink-0">{p.date}</span>}
              </p>
              {p.body && <p className="mt-1 prose-dark text-[0.875rem] leading-[1.55]">{p.body}</p>}
              {p.link && <ShopLink link={p.link} />}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** The same shop facts remain readable without photographs or board tabs. */
export function ShopText({ compact = false, headingLevel = 3 }) {
  const H = `h${headingLevel}`;
  const G = `h${headingLevel + 1}`;
  return (
    <div className={compact ? "gw-card" : "mt-16"}>
      <H {...{ [ANCHOR]: "shop" }} tabIndex={-1} className={`font-display uppercase text-primary ${compact ? "text-display-3" : "text-display-2"}`}>
        {teardown.title}
      </H>
      <p className="mt-3 prose-dark text-[0.9375rem]">{teardown.lede}</p>
      <div className={compact ? "mt-5 space-y-6" : "mt-8 grid gap-8 lg:grid-cols-3"}>
        {teardown.groups.map((group) => (
          <section key={group.id} aria-label={group.label}>
            <G className="font-display uppercase text-primary text-[1.125rem]">{group.label}</G>
            <p className="mt-2 text-[0.875rem] text-dim">{group.note}</p>
            <ul className="mt-4 space-y-5">
              {teardown.photos.filter((p) => p.group === group.id).map((p) => (
                <li key={p.slug}>
                  <p className="font-display uppercase text-primary text-[1rem]">{p.title}</p>
                  {p.date && <p className="mono-micro text-dim mt-1">{p.date}</p>}
                  {p.body && <p className="mt-2 prose-dark text-[0.9375rem]">{p.body}</p>}
                  {p.link && <ShopLink link={p.link} />}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
