/**
 * The cemetery, drawn by hand.
 *
 * Every stone is one inline SVG in the page. No sprite sheet, no icon package, no
 * image requests — the whole graveyard is a few kilobytes of paths, it recolours
 * itself in dark mode because every fill is a CSS variable, and it stays crisp at
 * any size. Illustration this simple is cheaper as markup than as assets.
 *
 * Everything is drawn in its own viewBox and stretched by the caller, so the shared
 * vocabulary below (shadow stack, grass ellipse, tufts) is in stone coordinates,
 * not screen pixels.
 */

import type { Emblem, Shape } from "../../app/Domain/graveyard.js";

/* ------------------------------------------------------------------- weather */

export function Sky() {
  return (
    <div class="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <Cloud top="6%" dur="90s" />
      <Cloud top="16%" dur="120s" delay="-40s" scale={0.7} />
      <Cloud top="3%" dur="70s" delay="-25s" scale={0.5} />
      <Bird top="10%" dur="38s" delay="-10s" />
      <Bird top="20%" dur="55s" delay="-30s" />
    </div>
  );
}

function Cloud({ top, dur, delay, scale }: { top: string; dur: string; delay?: string; scale?: number }) {
  const style = [`top:${top}`, `--dur:${dur}`, delay && `animation-delay:${delay}`, scale && `transform:scale(${scale})`]
    .filter(Boolean)
    .join(";");

  return (
    <div class="cloud" style={style} aria-hidden="true">
      <svg width="110" height="44" viewBox="0 0 110 44">
        <path
          d="M14 34 q-10 0 -10 -9 q0 -9 10 -9 q2 -12 16 -12 q12 0 15 9 q4 -4 10 -4 q11 0 12 10 q9 1 9 8 q0 7 -10 7 Z"
          fill="var(--cloud)"
          stroke="var(--cloud-edge)"
          stroke-width="2"
        />
      </svg>
    </div>
  );
}

function Bird({ top, dur, delay }: { top: string; dur: string; delay?: string }) {
  return (
    <div class="bird" style={`top:${top};--dur:${dur}${delay ? `;animation-delay:${delay}` : ""}`} aria-hidden="true">
      <svg width="34" height="18" viewBox="0 0 34 18">
        <path d="M2 10 q7 -8 15 -2 q8 -6 15 2" fill="none" stroke="var(--gray)" stroke-width="2.5" stroke-linecap="round" />
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------- ground */

/** The three offset copies that give every stone its chunky drop shadow. */
function ShadowStack({ children }: { children: unknown }) {
  return (
    <>
      <g transform="translate(10,14)" opacity="0.4">{children}</g>
      <g transform="translate(6,8)" opacity="0.28">{children}</g>
      <g transform="translate(3,4)" opacity="0.18">{children}</g>
    </>
  );
}

function Tufts({ xs, y }: { xs: number[]; y: number }) {
  return (
    <g stroke="var(--grass-d)" stroke-width="2.2" stroke-linecap="round" fill="none">
      {xs.map((x) => (
        <g>
          <path d={`M${x} ${y} q-2 -6 -4 -8`} />
          <path d={`M${x} ${y} q0 -7 1 -9`} />
          <path d={`M${x} ${y} q2 -5 5 -7`} />
        </g>
      ))}
    </g>
  );
}

/* ------------------------------------------------------------------ emblems */

/**
 * The carving near the base of a headstone. Drawn around x≈50 in stone
 * coordinates so it can simply be translated down to whatever the base is.
 */
function EmblemMark({ kind }: { kind: Emblem }) {
  switch (kind) {
    case "cross":
      return (
        <g fill="var(--bone)" stroke="var(--emblem)" stroke-width="2" stroke-linejoin="round">
          <rect x="46" y="4" width="8" height="24" rx="2" />
          <rect x="39" y="11" width="22" height="8" rx="2" />
        </g>
      );

    case "crescent":
      return (
        <path
          d="M58 6 a12 12 0 1 0 0 20 a9 9 0 1 1 0 -20 Z"
          fill="var(--bone)"
          stroke="var(--emblem)"
          stroke-width="2"
          stroke-linejoin="round"
        />
      );

    case "flower":
      return (
        <g>
          <path d="M50 26 V16" stroke="#8a6f52" stroke-width="3" stroke-linecap="round" />
          <circle cx="50" cy="12" r="7" fill="var(--grass-c)" stroke="var(--emblem)" stroke-width="2.5" />
          <circle cx="43" cy="16" r="4.5" fill="var(--grass-c)" stroke="var(--emblem)" stroke-width="2.5" />
          <circle cx="57" cy="16" r="4.5" fill="var(--grass-c)" stroke="var(--emblem)" stroke-width="2.5" />
        </g>
      );

    case "candles":
      return (
        <g>
          <rect x="41" y="12" width="7" height="14" rx="2" fill="var(--bone)" stroke="var(--emblem)" stroke-width="2" />
          <ellipse cx="44.5" cy="8.5" rx="2.4" ry="3.6" fill="var(--yellow)" stroke="var(--emblem)" stroke-width="1.4" />
          <rect x="52" y="15" width="7" height="11" rx="2" fill="var(--bone)" stroke="var(--emblem)" stroke-width="2" />
          <ellipse cx="55.5" cy="11.5" rx="2.4" ry="3.6" fill="var(--yellow)" stroke="var(--emblem)" stroke-width="1.4" />
        </g>
      );

    case "dove":
      return (
        <g stroke="var(--emblem)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">
          {/* body, head and swept tail in one path */}
          <path d="M37 24 q3 -10 13 -11 q4 -5 9 -2 q2 1 1 3 l-3 2 q3 8 -4 12 l-7 2 -12 5 3 -8 Z" fill="var(--bone)" />
          {/* the raised wing is the whole silhouette — without it this is a duck */}
          <path d="M46 17 q8 -8 14 -4 q-4 8 -12 9 Z" fill="var(--stone-d)" />
          <circle cx="57" cy="14.5" r="1.1" fill="var(--emblem)" stroke="none" />
        </g>
      );

    case "tree":
      return (
        <g>
          <path d="M50 28 q1 -10 0 -16" fill="none" stroke="#8a6f52" stroke-width="3" stroke-linecap="round" />
          <g fill="none" stroke="var(--grass-d)" stroke-width="2.6" stroke-linecap="round">
            <path d="M50 12 q-9 -4 -12 2" />
            <path d="M50 12 q-6 -9 -12 -8" />
            <path d="M50 12 q2 -10 8 -10" />
            <path d="M50 12 q9 -5 13 1" />
          </g>
        </g>
      );

    default:
      return <></>;
  }
}

/* --------------------------------------------------------------- headstones */

/** Silhouette, plus where the inscription and the emblem sit inside it. */
const STONES: Record<Shape, { box: string; body: string; extra?: unknown; emblemY: number; groundY: number }> = {
  classic: {
    box: "0 0 110 130",
    body: "M22 110 V52 q0 -30 28 -30 q28 0 28 30 V110 Z",
    emblemY: 82,
    groundY: 110,
  },
  gothic: {
    box: "0 0 110 130",
    body: "M26 110 L30 28 q0 -6 6 -6 h28 q6 0 6 6 L74 110 Z",
    extra: <path d="M36 22 L50 6 L64 22" fill="var(--stone-d)" stroke="var(--outline)" stroke-width="2.5" stroke-linejoin="round" />,
    emblemY: 82,
    groundY: 110,
  },
  cross: {
    box: "0 0 110 140",
    body: "M22 120 V62 q0 -30 28 -30 q28 0 28 30 V120 Z",
    extra: (
      <>
        <rect x="45" y="4" width="10" height="66" rx="2" fill="var(--stone-c)" stroke="var(--outline)" stroke-width="2.5" />
        <rect x="38" y="12" width="24" height="10" rx="2" fill="var(--stone-c)" stroke="var(--outline)" stroke-width="2.5" />
      </>
    ),
    emblemY: 92,
    groundY: 120,
  },
};

/** Aspect ratio of each silhouette, so the caller can reserve the right box. */
export const STONE_ASPECT: Record<Shape, string> = {
  classic: "110/130",
  gothic: "110/130",
  cross: "110/140",
};

/**
 * Where the inscription starts, as a percentage down the box.
 *
 * Per shape because the stones do not begin at the same height — a cross carries
 * 30% of dead space above its shoulders, and text pinned to one number for all
 * three ends up floating over the crossbar.
 */
export const STONE_TEXT_TOP: Record<Shape, string> = {
  classic: "38%",
  gothic: "26%",
  cross: "50%",
};

export function Stone({ shape = "classic", emblem = "plain" }: { shape?: Shape; emblem?: Emblem }) {
  const s = STONES[shape] ?? STONES.classic;
  const g = s.groundY;

  return (
    <svg viewBox={s.box} class="absolute inset-0 h-full w-full" aria-hidden="true">
      <ShadowStack>
        <path d={s.body} fill="var(--outline)" />
        {shape === "gothic" && <path d="M36 22 L50 6 L64 22" fill="var(--outline)" />}
        {shape === "cross" && (
          <>
            <rect x="45" y="4" width="10" height="66" rx="2" fill="var(--outline)" />
            <rect x="38" y="12" width="24" height="10" rx="2" fill="var(--outline)" />
          </>
        )}
      </ShadowStack>

      <ellipse cx="50" cy={g + 2} rx="44" ry="8" fill="var(--grass-c)" stroke="var(--outline)" stroke-width="3" />

      {s.extra}
      <path d={s.body} fill="var(--stone-c)" stroke="var(--outline)" stroke-width="3.5" stroke-linejoin="round" />
      {/* The highlight down the left edge — the one line that stops it reading flat. */}
      <path
        d={shape === "gothic" ? "M34 106 L36 30 q0 -4 4 -4" : `M28 ${g - 4} V${g - 56} q0 -24 22 -24`}
        fill="none"
        stroke="var(--bone)"
        stroke-width="2"
        stroke-linecap="round"
        opacity="0.4"
      />

      <g transform={`translate(0,${s.emblemY})`}>
        <EmblemMark kind={emblem} />
      </g>

      <Tufts xs={[14, 38, 66, 90]} y={g} />
    </svg>
  );
}

/* --------------------------------------------------------------- mausoleum */

export function MausoleumShell() {
  const roof = "M22 48 L80 14 L138 48 Z";

  return (
    <svg viewBox="0 0 170 130" class="absolute inset-0 h-full w-full" aria-hidden="true">
      <ShadowStack>
        <rect x="30" y="46" width="100" height="66" rx="4" fill="var(--outline)" />
        <path d={roof} fill="var(--outline)" />
      </ShadowStack>

      <ellipse cx="80" cy="112" rx="70" ry="8" fill="var(--grass-c)" stroke="var(--outline)" stroke-width="3" />

      <rect x="30" y="46" width="100" height="66" rx="4" fill="var(--stone-c)" stroke="var(--outline)" stroke-width="3.5" />
      <path d={roof} fill="var(--stone-d)" stroke="var(--outline)" stroke-width="3.5" stroke-linejoin="round" />
      <path d="M32 108 V50" fill="none" stroke="var(--bone)" stroke-width="1.8" stroke-linecap="round" opacity="0.35" />

      <circle cx="80" cy="36" r="6" fill="var(--bone)" stroke="var(--outline)" stroke-width="2.5" />
      <rect x="38" y="52" width="10" height="60" rx="3" fill="var(--bone)" stroke="var(--outline)" stroke-width="2.5" />
      <rect x="112" y="52" width="10" height="60" rx="3" fill="var(--bone)" stroke="var(--outline)" stroke-width="2.5" />

      <path d="M62 112 V74 q0 -16 18 -16 q18 0 18 16 V112 Z" fill="var(--door)" stroke="var(--outline)" stroke-width="3" />
      <g stroke="var(--stone-d)" stroke-width="2.5">
        <line x1="70" y1="64" x2="70" y2="110" />
        <line x1="80" y1="60" x2="80" y2="110" />
        <line x1="90" y1="64" x2="90" y2="110" />
      </g>

      <Tufts xs={[18, 144]} y={110} />
    </svg>
  );
}

/* ----------------------------------------------------------------- pyramid */

export function PyramidShell() {
  const body = "M12 72 L60 8 L108 72 Z";

  return (
    <svg viewBox="0 0 130 90" class="absolute inset-0 h-full w-full" aria-hidden="true">
      <path d={body} fill="var(--outline)" opacity="0.4" transform="translate(10,14)" />
      <path d={body} fill="var(--outline)" opacity="0.28" transform="translate(6,8)" />
      <path d={body} fill="var(--outline)" opacity="0.18" transform="translate(3,4)" />

      <ellipse cx="60" cy="74" rx="54" ry="6" fill="var(--sand-d)" opacity="0.6" stroke="var(--outline)" stroke-width="2.5" />
      <path d={body} fill="var(--sand-c)" stroke="var(--outline)" stroke-width="3.5" stroke-linejoin="round" />
      <path d="M20 68 L60 12" fill="none" stroke="var(--bone)" stroke-width="1.8" stroke-linecap="round" opacity="0.3" />

      {/* The masonry courses. Nothing structural — it just stops the triangle
          reading as a triangle. */}
      <g stroke="var(--sand-d)" stroke-width="2" stroke-linecap="round">
        <line x1="43" y1="31" x2="77" y2="31" />
        <line x1="33" y1="45" x2="87" y2="45" />
        <line x1="24" y1="59" x2="96" y2="59" />
        <line x1="52" y1="24" x2="52" y2="31" />
        <line x1="66" y1="31" x2="66" y2="45" />
        <line x1="44" y1="45" x2="44" y2="59" />
        <line x1="78" y1="45" x2="78" y2="59" />
        <line x1="60" y1="59" x2="60" y2="72" />
        <line x1="34" y1="59" x2="34" y2="72" />
        <line x1="88" y1="59" x2="88" y2="72" />
      </g>

      <path d="M52 19 L60 8 L68 19 Z" fill="var(--yellow)" stroke="var(--outline)" stroke-width="3" stroke-linejoin="round" />
      <path d="M52 72 V62 q0 -8 8 -8 q8 0 8 8 V72 Z" fill="var(--door)" stroke="var(--outline)" stroke-width="2.5" />
    </svg>
  );
}

/* ------------------------------------------------------------- decorations */

export function Bones({ class: cls = "w-9" }: { class?: string }) {
  return (
    <svg viewBox="0 0 54 26" class={cls} aria-hidden="true">
      <g fill="var(--outline)">
        <circle cx="10" cy="9" r="7.6" />
        <circle cx="10" cy="17" r="7.6" />
        <circle cx="44" cy="9" r="7.6" />
        <circle cx="44" cy="17" r="7.6" />
        <rect x="9" y="7.5" width="36" height="11" rx="5.5" />
      </g>
      <g fill="var(--bone)">
        <circle cx="10" cy="9" r="5.4" />
        <circle cx="10" cy="17" r="5.4" />
        <circle cx="44" cy="9" r="5.4" />
        <circle cx="44" cy="17" r="5.4" />
        <rect x="10" y="9.6" width="34" height="6.8" rx="3.4" />
      </g>
    </svg>
  );
}

export function Skull({ class: cls = "w-8" }: { class?: string }) {
  return (
    <svg viewBox="0 0 40 34" class={cls} aria-hidden="true">
      <path
        d="M6 16 q0 -12 14 -12 q14 0 14 12 q0 7 -5 9 v5 h-18 v-5 q-5 -2 -5 -9 Z"
        fill="var(--bone)"
        stroke="var(--outline)"
        stroke-width="2.5"
        stroke-linejoin="round"
      />
      <circle cx="14" cy="16" r="3.5" fill="var(--outline)" />
      <circle cx="26" cy="16" r="3.5" fill="var(--outline)" />
      <path d="M20 20 l-2 4 h4 Z" fill="var(--outline)" />
      <g stroke="var(--outline)" stroke-width="2">
        <line x1="16" y1="26" x2="16" y2="30" />
        <line x1="20" y1="26" x2="20" y2="30" />
        <line x1="24" y1="26" x2="24" y2="30" />
      </g>
    </svg>
  );
}

export function Ghost({ class: cls = "w-9 floaty" }: { class?: string }) {
  return (
    <svg viewBox="0 0 34 40" class={cls} aria-hidden="true">
      <path
        d="M4 36 V18 q0 -14 13 -14 q13 0 13 14 v18 l-5 -4 -4 4 -4 -4 -4 4 -4 -4 Z"
        fill="var(--bone)"
        stroke="var(--outline)"
        stroke-width="2.5"
        stroke-linejoin="round"
        opacity="0.95"
      />
      <circle cx="12" cy="18" r="2.5" fill="var(--outline)" />
      <circle cx="22" cy="18" r="2.5" fill="var(--outline)" />
      <ellipse cx="17" cy="25" rx="3" ry="4" fill="var(--outline)" />
    </svg>
  );
}

export function Shrub({ class: cls = "w-14" }: { class?: string }) {
  return (
    <svg viewBox="0 0 28 40" class={cls} aria-hidden="true">
      <path d="M13 38 q1 -14 0 -24" fill="none" stroke="#8a6f52" stroke-width="3" stroke-linecap="round" />
      <g fill="none" stroke="var(--grass-d)" stroke-width="2.6" stroke-linecap="round">
        <path d="M13 14 q-9 -4 -12 2" />
        <path d="M13 14 q-6 -9 -12 -8" />
        <path d="M13 14 q2 -10 8 -10" />
        <path d="M13 14 q9 -5 13 1" />
      </g>
    </svg>
  );
}

/* --------------------------------------------------------------- swatches */

/** The emblem on its own, for the picker in the burial form. */
export function EmblemSwatch({ kind }: { kind: Emblem }) {
  if (kind === "plain") {
    return (
      <svg viewBox="34 0 32 32" class="h-8 w-8" aria-hidden="true">
        <line x1="40" y1="16" x2="60" y2="16" stroke="var(--gray)" stroke-width="2.5" stroke-linecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="34 0 32 32" class="h-8 w-8" aria-hidden="true">
      <EmblemMark kind={kind} />
    </svg>
  );
}

/** The silhouette on its own, likewise. */
export function ShapeSwatch({ shape }: { shape: Shape }) {
  const s = STONES[shape] ?? STONES.classic;

  return (
    <svg viewBox={s.box} class="h-12 w-auto" aria-hidden="true">
      {s.extra}
      <path d={s.body} fill="var(--stone-c)" stroke="var(--outline)" stroke-width="3.5" stroke-linejoin="round" />
    </svg>
  );
}
