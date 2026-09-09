"use client";

import { useReducedMotion } from "framer-motion";

const SOLID_PATHS = [
  "M280 210 C420 180 520 260 640 250",
  "M640 250 C780 235 860 300 980 280",
  "M980 280 C1120 250 1220 210 1360 190",
  "M640 250 C610 340 520 390 380 470",
  "M980 280 C1000 360 940 420 760 470",
  "M760 470 C900 500 1080 470 1200 520",
  "M380 470 C420 560 480 620 520 720",
  "M760 470 C720 560 680 640 700 740",
  "M1200 520 C1180 610 1100 680 1040 760",
  "M1360 190 C1420 320 1380 430 1320 510",
] as const;

const DASHED_PATHS = [
  "M280 210 C360 320 420 360 380 470",
  "M980 280 C1040 360 1120 420 1200 520",
  "M520 720 C680 700 820 730 1040 760",
] as const;

/** Closed circuits so packets hop node → node and restart. */
const CIRCUITS = [
  {
    // Northwest triangle: 280 → 640 → 380 → 280
    d: "M280 210 C420 180 520 260 640 250 C610 340 520 390 380 470 C420 360 360 320 280 210",
    duration: "7.5s",
    tone: "gold" as const,
    copies: [
      { delay: "0s" },
      { delay: "-3.75s" },
    ],
  },
  {
    // Center diamond: 980 → 760 → 1200 → 980
    d: "M980 280 C1000 360 940 420 760 470 C900 500 1080 470 1200 520 C1120 420 1040 360 980 280",
    duration: "8s",
    tone: "sage" as const,
    copies: [
      { delay: "-0.6s" },
      { delay: "-4.6s" },
    ],
  },
  {
    // Map-wide loop visiting most hubs
    d: "M380 470 C420 560 480 620 520 720 C680 700 820 730 1040 760 C1100 680 1180 610 1200 520 C1080 470 900 500 760 470 C940 420 1000 360 980 280 C860 300 780 235 640 250 C610 340 520 390 380 470",
    duration: "16s",
    tone: "gold" as const,
    copies: [
      { delay: "0s" },
      { delay: "-5.3s" },
      { delay: "-10.6s" },
    ],
  },
  {
    // Eastern spur out and back: 980 → 1360 → 1320 → 1360 → 980
    d: "M980 280 C1120 250 1220 210 1360 190 C1420 320 1380 430 1320 510 C1380 430 1420 320 1360 190 C1220 210 1120 250 980 280",
    duration: "11s",
    tone: "sage" as const,
    copies: [{ delay: "-1.2s" }],
  },
  {
    // Southern spur: 760 → 700 → 760
    d: "M760 470 C720 560 680 640 700 740 C680 640 720 560 760 470",
    duration: "5.5s",
    tone: "gold" as const,
    copies: [{ delay: "-2s" }],
  },
] as const;

const NODES = [
  { x: 280, y: 210, r: 28, stroke: "#8FA28A", strokeWidth: 4, fill: "#8FA28A", inner: 12, delay: "0s", glyph: "leaf" },
  { x: 640, y: 250, r: 34, stroke: "#C8A96B", strokeWidth: 5, fill: "#C8A96B", inner: 14, delay: "0.35s", glyph: "tray" },
  { x: 980, y: 280, r: 28, stroke: "#8FA28A", strokeWidth: 4, fill: "#8FA28A", inner: 12, delay: "0.7s", glyph: "pair" },
  { x: 1360, y: 190, r: 26, stroke: "#C8A96B", strokeWidth: 4, fill: "#C8A96B", inner: 11, delay: "1.05s", glyph: "bar" },
  { x: 380, y: 470, r: 30, stroke: "#C8A96B", strokeWidth: 4, fill: "#C8A96B", inner: 13, delay: "0.2s", glyph: "tri" },
  { x: 760, y: 470, r: 36, stroke: "#8FA28A", strokeWidth: 5, fill: "#8FA28A", inner: 15, delay: "0.55s", glyph: "hub" },
  { x: 1200, y: 520, r: 30, stroke: "#C8A96B", strokeWidth: 4, fill: "#C8A96B", inner: 13, delay: "0.9s", glyph: "leaf" },
  { x: 520, y: 720, r: 27, stroke: "#8FA28A", strokeWidth: 4, fill: "#8FA28A", inner: 11, delay: "0.15s", glyph: "dot" },
  { x: 700, y: 740, r: 25, stroke: "#C8A96B", strokeWidth: 4, fill: "#C8A96B", inner: 10, delay: "0.5s", glyph: "rect" },
  { x: 1040, y: 760, r: 28, stroke: "#8FA28A", strokeWidth: 4, fill: "#8FA28A", inner: 12, delay: "0.85s", glyph: "box" },
  { x: 1320, y: 510, r: 24, stroke: "#8FA28A", strokeWidth: 4, fill: "#8FA28A", inner: 10, delay: "1.2s", glyph: "pair" },
] as const;

function NodeGlyph({ glyph }: { glyph: (typeof NODES)[number]["glyph"] }) {
  switch (glyph) {
    case "leaf":
      return <path d="M-7 4 Q0 -8 7 4 Z" fill="#F7F4ED" />;
    case "tray":
      return <rect x="-8" y="-4" width="16" height="10" rx="3" fill="#F7F4ED" />;
    case "pair":
      return (
        <>
          <circle cx="-4" cy="1" r="3.5" fill="#F7F4ED" />
          <circle cx="4" cy="1" r="3.5" fill="#F7F4ED" />
        </>
      );
    case "bar":
      return <path d="M-6 3h12v4h-12z" fill="#F7F4ED" />;
    case "tri":
      return <path d="M0 -7 L5 5 H-5 Z" fill="#F7F4ED" />;
    case "hub":
      return (
        <>
          <rect x="-9" y="-3" width="18" height="9" rx="4" fill="#F7F4ED" />
          <circle cx="0" cy="-6" r="3" fill="#C8A96B" />
        </>
      );
    case "dot":
      return <circle cx="0" cy="0" r="4" fill="#F7F4ED" />;
    case "rect":
      return <rect x="-6" y="-2" width="12" height="7" rx="2" fill="#F7F4ED" />;
    case "box":
      return <path d="M-6 -1h12v6h-12zM-3 -5h6v4h-6z" fill="#F7F4ED" />;
  }
}

function TravelingPacket({
  path,
  duration,
  delay,
  tone,
}: {
  path: string;
  duration: string;
  delay: string;
  tone: "gold" | "sage";
}) {
  const fill = tone === "gold" ? "#C8A96B" : "#8FA28A";
  return (
    <g>
      <animateMotion
        path={path}
        dur={duration}
        begin={delay}
        repeatCount="indefinite"
        rotate="0"
        calcMode="linear"
      />
      <circle r="14" fill={fill} opacity="0.2" />
      <circle r="5.5" fill={fill} />
      <circle r="2.4" fill="#FFFCF6" />
    </g>
  );
}

export function HeroNodeGraph() {
  const reduceMotion = useReducedMotion();

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 h-full w-full"
      role="img"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="hero-map-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F7F4ED" />
          <stop offset="55%" stopColor="#F0EBE0" />
          <stop offset="100%" stopColor="#E4EBDF" />
        </linearGradient>
        <radialGradient id="hero-map-gold-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#C8A96B" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#C8A96B" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="hero-map-sage-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#8FA28A" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#8FA28A" stopOpacity="0" />
        </radialGradient>
        <filter id="hero-map-soft" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>

      <rect width="1600" height="900" fill="url(#hero-map-bg)" />

      <g opacity="0.55">
        <rect x="120" y="110" width="280" height="190" rx="28" fill="#C7D3C0" />
        <rect
          x="460"
          y="80"
          width="340"
          height="160"
          rx="28"
          fill="#C7D3C0"
          opacity="0.7"
        />
        <rect x="880" y="130" width="300" height="210" rx="28" fill="#C7D3C0" />
        <rect
          x="1240"
          y="90"
          width="250"
          height="180"
          rx="28"
          fill="#C7D3C0"
          opacity="0.65"
        />
        <rect
          x="180"
          y="380"
          width="320"
          height="220"
          rx="28"
          fill="#C7D3C0"
          opacity="0.75"
        />
        <rect
          x="560"
          y="340"
          width="390"
          height="250"
          rx="28"
          fill="#C7D3C0"
          opacity="0.55"
        />
        <rect x="1020" y="400" width="360" height="230" rx="28" fill="#C7D3C0" />
        <rect
          x="260"
          y="660"
          width="420"
          height="160"
          rx="28"
          fill="#C7D3C0"
          opacity="0.6"
        />
        <rect
          x="780"
          y="680"
          width="500"
          height="140"
          rx="28"
          fill="#C7D3C0"
          opacity="0.7"
        />
      </g>

      <g
        stroke="#8FA28A"
        strokeOpacity="0.18"
        strokeWidth="2"
        fill="none"
      >
        <path d="M80 220 H1520" />
        <path d="M80 420 H1520" />
        <path d="M80 620 H1520" />
        <path d="M260 60 V840" />
        <path d="M620 60 V840" />
        <path d="M980 60 V840" />
        <path d="M1340 60 V840" />
      </g>

      <g
        fill="none"
        stroke="#8FA28A"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      >
        {SOLID_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>

      {!reduceMotion
        ? SOLID_PATHS.map((d, index) => (
            <path
              key={`flow-${d}`}
              d={d}
              fill="none"
              stroke={index % 2 === 0 ? "#C8A96B" : "#7A8F74"}
              strokeWidth="3"
              strokeLinecap="round"
              pathLength={100}
              className="hero-graph-comet"
              style={{ animationDelay: `${index * 0.35}s` }}
            />
          ))
        : null}

      <g
        fill="none"
        stroke="#C8A96B"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.55"
        strokeDasharray="8 10"
        className={reduceMotion ? undefined : "hero-graph-dashes"}
      >
        {DASHED_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>

      {NODES.map((node) => (
        <circle
          key={`glow-${node.x}-${node.y}`}
          cx={node.x}
          cy={node.y}
          r={node.r + 26}
          fill={
            node.stroke === "#C8A96B"
              ? "url(#hero-map-gold-glow)"
              : "url(#hero-map-sage-glow)"
          }
          filter="url(#hero-map-soft)"
        />
      ))}

      {NODES.map((node) => (
        <g
          key={`node-${node.x}-${node.y}`}
          transform={`translate(${node.x} ${node.y})`}
        >
          <g
            className={reduceMotion ? undefined : "hero-graph-node"}
            style={
              reduceMotion ? undefined : { animationDelay: node.delay }
            }
          >
            <circle
              r={node.r}
              fill="#FFFCF6"
              stroke={node.stroke}
              strokeWidth={node.strokeWidth}
            />
            <circle r={node.inner} fill={node.fill} />
            <NodeGlyph glyph={node.glyph} />
          </g>
        </g>
      ))}

      {!reduceMotion
        ? CIRCUITS.flatMap((circuit) =>
            circuit.copies.map((copy) => (
              <TravelingPacket
                key={`${circuit.d}-${copy.delay}`}
                path={circuit.d}
                duration={circuit.duration}
                delay={copy.delay}
                tone={circuit.tone}
              />
            )),
          )
        : null}
    </svg>
  );
}
