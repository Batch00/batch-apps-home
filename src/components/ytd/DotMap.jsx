import { useEffect, useRef, useState } from "react";

// The tile keeps a fixed shape before the grid arrives, so nothing below it jumps. The map is
// cropped to the part of the world around the visited places and fitted inside this shape.
const TILE_ASPECT = 2.6;
const PAD_COLS = 8;
const PAD_ROWS = 4;

// The grid window to draw: every highlighted dot plus some context, never narrower than the tile.
function cropFor(grid, highlighted) {
  let c0 = Infinity;
  let c1 = -Infinity;
  let r0 = Infinity;
  let r1 = -Infinity;
  grid.runs.forEach((runs, row) => {
    for (const [start, length, code] of runs) {
      if (!highlighted.has(code)) continue;
      c0 = Math.min(c0, start);
      c1 = Math.max(c1, start + length - 1);
      r0 = Math.min(r0, row);
      r1 = Math.max(r1, row);
    }
  });
  if (c0 === Infinity) return { c0: 0, c1: grid.cols - 1, r0: 0, r1: grid.rows - 1 };
  c0 = Math.max(0, c0 - PAD_COLS);
  c1 = Math.min(grid.cols - 1, c1 + PAD_COLS);
  r0 = Math.max(0, r0 - PAD_ROWS);
  r1 = Math.min(grid.rows - 1, r1 + PAD_ROWS);
  // Widen a tall crop so it fills the tile instead of floating in the middle of it.
  const minCols = Math.ceil((r1 - r0 + 1) * TILE_ASPECT);
  while (c1 - c0 + 1 < minCols && (c0 > 0 || c1 < grid.cols - 1)) {
    if (c0 > 0) c0--;
    if (c1 - c0 + 1 < minCols && c1 < grid.cols - 1) c1++;
  }
  return { c0, c1, r0, r1 };
}

const COLORS = {
  land: "#2f2f2f",
  lifetime: "rgba(59, 130, 246, 0.55)",
  fresh: "#60a5fa",
};

// A small dot map of every country and US state ever visited, with this year's firsts brighter.
// The grid data (src/lib/dotMap.js, a few kB) is fetched only once the tile is near the screen,
// so the home page never pays for it up front. Decorative: the tile's text carries the counts.
export default function DotMap({ lifetime, fresh, className = "" }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [grid, setGrid] = useState(null);

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
    const visited = new Set(lifetime);
    const firsts = new Set(fresh);

    const crop = cropFor(grid, new Set([...visited, ...firsts]));
    const cropCols = crop.c1 - crop.c0 + 1;
    const cropRows = crop.r1 - crop.r0 + 1;

    const draw = () => {
      const { width } = wrap.getBoundingClientRect();
      if (!width) return;
      const height = width / TILE_ASPECT;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cell = Math.min(width / cropCols, height / cropRows);
      const offsetX = (width - cropCols * cell) / 2;
      const offsetY = (height - cropRows * cell) / 2;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const radius = Math.max(0.7, cell * 0.38);
      for (const color of [COLORS.land, COLORS.lifetime, COLORS.fresh]) {
        ctx.fillStyle = color;
        ctx.beginPath();
        grid.runs.forEach((runs, row) => {
          if (row < crop.r0 || row > crop.r1) return;
          for (const [start, length, code] of runs) {
            const tone = firsts.has(code) ? COLORS.fresh : visited.has(code) ? COLORS.lifetime : COLORS.land;
            if (tone !== color) continue;
            for (let col = Math.max(start, crop.c0); col < Math.min(start + length, crop.c1 + 1); col++) {
              const x = offsetX + (col - crop.c0 + 0.5) * cell;
              const y = offsetY + (row - crop.r0 + 0.5) * cell;
              ctx.moveTo(x + radius, y);
              ctx.arc(x, y, radius, 0, Math.PI * 2);
            }
          }
        });
        ctx.fill();
      }
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [grid, lifetime, fresh]);

  return (
    <div ref={wrapRef} aria-hidden="true" className={className} style={{ aspectRatio: TILE_ASPECT }}>
      <canvas
        ref={canvasRef}
        className={`block w-full transition-opacity duration-700 motion-reduce:transition-none ${grid ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
