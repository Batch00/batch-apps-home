import { useEffect, useRef, useState } from "react";
import { useChapterProgress } from "../engine/progress";
import { isReducedMotion } from "../engine/scrollEngine";
import { ARC_MS, TURN_END, ZOOM_IN_END, ZOOM_OUT_START, routeSchedule } from "../globe/route";

// The travel globe. The renderer (d3-geo, topojson and both atlases) loads as its own chunk the
// first time a Globe mounts. The globe is decorative: the chapter's text carries the same facts,
// so if the chunk fails to load the canvas simply stays empty.
export function Globe({ travel, className = "" }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const globeRef = useRef(null);
  const latest = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let observer = null;

    import("../globe/renderer")
      .then(({ createGlobe }) => {
        if (cancelled || !canvasRef.current || !wrapRef.current) return;
        const timing = { schedule: routeSchedule(travel?.trips), ARC_MS, TURN_END, ZOOM_IN_END, ZOOM_OUT_START };
        const globe = createGlobe(canvasRef.current, travel, timing);
        globeRef.current = globe;
        if (latest.current) globe.setProgress(latest.current[0], latest.current[1], isReducedMotion());
        // Size once now, so the first frame is drawn without waiting for the observer.
        const box = wrapRef.current.getBoundingClientRect();
        if (box.width > 0 && box.height > 0) globe.resize(box.width, box.height);
        observer = new ResizeObserver(([entry]) => {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) globe.resize(width, height);
        });
        observer.observe(wrapRef.current);
        setReady(true);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      observer?.disconnect();
      globeRef.current?.destroy();
      globeRef.current = null;
    };
  }, [travel]);

  useChapterProgress((p, e) => {
    latest.current = [p, e];
    globeRef.current?.setProgress(p, e, isReducedMotion());
  });

  return (
    <div ref={wrapRef} aria-hidden="true" className={className}>
      <canvas
        ref={canvasRef}
        className={`wrap-fade block h-full w-full transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
