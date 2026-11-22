import { useEffect, useMemo, useRef, useState } from "react";
import { TILE_ASPECT, allDots, cropFor, mapKeys } from "./dotGrid";

const COLORS = {
  land: "#2f2f2f",
  lifetime: "rgba(59, 130, 246, 0.6)",
  fresh: "#60a5fa",
};

// A small dot map of every country and US state ever visited, with this year's firsts brighter.
// Which dots light is decided in dotGrid.js (tested against the atlases). The grid data
// (src/lib/dotMap.js, a few kB) is fetched only once the tile is near the screen, so the home
// page never pays for it up front. Decorative: the tile's text carries the counts.
// The map is cropped to the area around the visited places and fitted inside its box. Pass
// `aspect` to fix the box's shape (so nothing jumps before the grid arrives), or null to let the
// box take whatever size its container gives it.
export default function DotMap({ data, aspect = TILE_ASPECT, className = "" }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [grid, setGrid] = useState(null);
  const keys = useMemo(() => mapKeys(data), [data]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    let cancelled = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        import("../../lib/dotMap.js")
          .then(({ DOT_MAP }) => {
            if (!cancelled) setGrid(DOT_MAP);
          })
          .catch(() => {});
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!grid || !canvas || !wrap) return undefined;
    const dots = allDots(grid, keys);

    const draw = () => {
      const { width, height } = wrap.getBoundingClientRect();
      if (!width || !height) return;
      const crop = cropFor(grid, keys, width / height);
      const cropCols = crop.c1 - crop.c0 + 1;
      const cropRows = crop.r1 - crop.r0 + 1;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cell = Math.min(width / cropCols, height / cropRows);
      const offsetX = (width - cropCols * cell) / 2;
      const offsetY = (height - cropRows * cell) / 2;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const radius = Math.max(0.7, cell * 0.38);
      const inCrop = ({ row, col }) => row > crop.r0 - 1 && row < crop.r1 + 1 && col > crop.c0 - 1 && col < crop.c1 + 1;
      // Land first, then lifetime, then this year's firsts on top; pins come last within each.
      for (const tone of ["land", "lifetime", "fresh"]) {
        ctx.fillStyle = COLORS[tone];
        ctx.beginPath();
        for (const dot of dots) {
          if (dot.tone !== tone || !inCrop(dot)) continue;
          const x = offsetX + (dot.col - crop.c0 + 0.5) * cell;
          const y = offsetY + (dot.row - crop.r0 + 0.5) * cell;
          ctx.moveTo(x + radius, y);
          ctx.arc(x, y, radius, 0, Math.PI * 2);
        }
        ctx.fill();
      }
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [grid, keys]);

  return (
    <div ref={wrapRef} aria-hidden="true" className={`relative ${className}`} style={aspect ? { aspectRatio: aspect } : undefined}>
      {/* Absolutely placed, so the canvas's own pixel size never feeds back into the layout. */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 h-full w-full transition-opacity duration-700 motion-reduce:transition-none ${grid ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
