// src/components/garage/PartCard.jsx: one part, named.
//
// The same card in the photographs and in the 3D workshop, for either car:
// the group and the part's place in its car's list, the name, the brand, the
// price where Ali priced it (behind SHOW_PRICES), the photographs it is
// pinned in, what it is, and a close crop.
//
// The crop is always the real photograph zoomed to the part's pin, about 30
// percent of the picture's width, which is what the S4's card always did. A
// part no photograph shows (a tune, a module, a head unit nobody has
// photographed yet) gets no crop and says why in its archive-only note.
// Nothing stands in for a picture that does not exist. A crop that is context rather than
// evidence (the S6's ECU tune, shown on the engine it runs) carries its pin's
// caption on the image.
//
// In the workshop on a phone the card starts collapsed, to the group, the
// name and one row of Previous, Details and Next, so it never covers what it
// is about; "Details" opens the rest in a panel that scrolls inside itself.
// The heading takes focus (tabIndex -1) when a part is chosen from the list,
// so a screen reader reads what was chosen and Tab carries on from the card.
import React from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Panel from "../ui/Panel";
import { CONTROL } from "./focus";
import { cropFor, findCar, groupOf, priceLabel } from "./cars";
import { GARAGE_PHOTOS_ENABLED } from "./features";

const pad = (n) => String(n).padStart(2, "0");
// A pin label after a comma: first letter down, the rest as written.
const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);

const CROP_FRACTION = 0.3;

/** background-position that centres `p` (0 to 100) when the image is `k`
 *  times the box on that axis. Percent positioning aligns the p% point of
 *  the image with the p% point of the box, so it has to be solved for. */
function centred(p, k) {
  if (k <= 1) return 50;
  return Math.min(100, Math.max(0, (((k * p) / 100 - 0.5) / (k - 1)) * 100));
}

export function Crop({ mod, viewId, className = "" }) {
  if (!GARAGE_PHOTOS_ENABLED) return null;
  const found = cropFor(mod, viewId);
  if (!found) return null;
  const { pin, view } = found;
  const { width, height, src } = view.image;
  const kx = 1 / CROP_FRACTION;
  const ky = kx * (height / width);
  const style = {
    backgroundImage: `url("${src}")`,
    backgroundSize: `${kx * 100}% auto`,
    backgroundPosition: `${centred(pin.x, kx).toFixed(2)}% ${centred(pin.y, ky).toFixed(2)}%`,
  };
  return (
    <div className={`tick-frame relative w-full ${className}`}>
      <Panel corner="br" edge="bg-ink-line" fill="bg-ink-deep" innerClassName="relative aspect-square overflow-hidden">
        <div
          role="img"
          aria-label={`Close crop of the ${view.label.toLowerCase()} photograph: ${lower(pin.label)}.${pin.caption ? ` ${pin.caption}.` : ""}`}
          className="absolute inset-0 bg-no-repeat"
          style={style}
        />
        <span className="absolute left-0 bottom-0 m-2 mono-micro text-dim bg-ink/80 px-2 py-1 max-w-[calc(100%-1rem)]">
          {pin.caption ?? pin.label}
        </span>
      </Panel>
      <span className="tick tr" aria-hidden="true" />
      <span className="tick bl" aria-hidden="true" />
    </div>
  );
}

export default function PartCard({
  mod,
  viewId,
  onStep,
  onClose,
  onPin,
  titleRef,
  titleId,
  compact = false,
  open = true,
  onToggleOpen,
  detailsId,
  stance,
  showPrices,
  className = "",
  headingLevel = 3,
}) {
  const Heading = `h${headingLevel}`;
  const car = findCar(mod.carId);
  const group = groupOf(mod);
  const price = priceLabel(mod, { show: showPrices });
  const pinned = mod.pins.length > 0;
  const showBody = !compact || open;

  return (
    <div className={`gw-card ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="mono-label text-volt flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
          <span>{car.label}</span>
          <span className="text-primary">{group?.label}</span>
          <span className="text-dim tabular-nums">{pad(mod.index + 1)} / {pad(car.mods.length)}</span>
        </p>
        {onClose && (
          <button type="button" onClick={onClose} className="gw-icon -mr-2 -mt-2" aria-label={`Close ${mod.name}`} {...{ [CONTROL]: "card-close" }}>
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>
      <Heading
        ref={titleRef}
        id={titleId}
        tabIndex={-1}
        className="gw-card-title mt-2 font-display uppercase text-display-3 text-primary focus-visible:outline-none"
      >
        {mod.name}
      </Heading>

      <div id={detailsId} hidden={!showBody} className={compact ? "gw-card-scroll" : ""}>
        <dl className="mt-3 grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-4 gap-y-2 items-start">
          {mod.brand && (
            <>
              <dt className="mono-micro text-dim pt-0.5">Brand</dt>
              <dd className="text-[0.9375rem] text-muted">{mod.brand}</dd>
            </>
          )}
          {price && (
            <>
              <dt className="mono-micro text-dim pt-0.5">Paid</dt>
              <dd className="text-[0.9375rem] text-muted tabular-nums">{price}</dd>
            </>
          )}
          {GARAGE_PHOTOS_ENABLED && <><dt className="mono-micro text-dim pt-0.5">Pinned</dt>
          <dd className="text-[0.9375rem] text-muted">
            {pinned
              ? mod.pins.map((p, i) => {
                  const v = car.views.find((x) => x.id === p.view);
                  const text = `${v?.label}, ${lower(p.label)}`;
                  return (
                    <span key={p.view}>
                      {i > 0 && <span className="text-dim"> · </span>}
                      {onPin ? (
                        <button
                          type="button"
                          onClick={() => onPin(p.view)}
                          className={`ink-underline text-left transition-colors hover:text-volt ${p.view === viewId ? "text-primary" : ""}`}
                        >
                          {text}
                        </button>
                      ) : (
                        text
                      )}
                    </span>
                  );
                })
              : "Not in a photograph"}
          </dd></>}
        </dl>

        <p className="mt-3 prose-dark text-[0.9375rem] leading-[1.6]">{mod.note}</p>
        {GARAGE_PHOTOS_ENABLED && mod.photoNote && <p className="mt-2 prose-dark text-[0.9375rem] leading-[1.6]">{mod.photoNote}</p>}
        {mod.demoNote && stance && <p className="mt-2 text-[0.8125rem] leading-[1.5] text-dim">{mod.demoNote}</p>}

        {GARAGE_PHOTOS_ENABLED && <Crop mod={mod} viewId={viewId} className="mt-4 max-w-[13rem]" />}
      </div>

      {onStep && (
        <div className="gw-card-steps mt-4 flex items-center justify-between gap-4">
          <button type="button" onClick={() => onStep(-1)} className="gw-step" {...{ [CONTROL]: "card-prev" }}>
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            Previous
          </button>
          {compact && onToggleOpen && (
            <button
              type="button"
              onClick={onToggleOpen}
              aria-expanded={open}
              aria-controls={detailsId}
              className="gw-step"
              {...{ [CONTROL]: "card-details" }}
            >
              {open ? "Less" : "Details"}
            </button>
          )}
          <button type="button" onClick={() => onStep(1)} className="gw-step" {...{ [CONTROL]: "card-next" }}>
            Next
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
