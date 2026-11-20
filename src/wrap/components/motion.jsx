import { useEffect, useRef } from "react";
import { GAP_MS, PLAY_MS, easeOutCubic, useChapterProgress, useTrigger } from "../engine/progress";
import { isReducedMotion } from "../engine/scrollEngine";
import { formatNumber } from "../format";

// Motion primitives, all driven by the enclosing Chapter's progress.
//   at     progress that triggers the motion (0 to 1 of the pinned scroll)
//   out    pinned progress that sends it away again (Reveal only)
//   on     "enter" to trigger from the chapter's entry progress instead (a chapter's first beat)
//   delay  extra milliseconds before it plays, for staggering items inside one beat
//
// Reveal, Grow and CountUp are triggered: scroll position decides when they play, then they
// run to completion on a timer. They never stop halfway, so a paused page always shows true
// values. Scrub is the only scroll-scrubbed primitive; keep it to decorative motion.

// Fades and rises in when triggered; with `out`, leaves upward. An entering Reveal waits for
// any leaving one to finish first, so two beats never show at once.
export function Reveal({ as: Tag = "div", at = 0, out, on, delay = 0, y = 32, className = "", style, children, ...rest }) {
  const ref = useRef(null);
  useTrigger(ref, { at, out, on });

  return (
    <Tag
      ref={ref}
      className={`wrap-reveal ${className}`}
      style={{ "--delay": `${delay}ms`, "--y": y, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

// Interpolates opacity, y (px) and scale from the first value to the second across
// [at, at + span], following the scroll exactly. Decorative motion only: never data.
export function Scrub({
  as: Tag = "div",
  at = 0,
  span = 0.3,
  opacity = [1, 1],
  y = [0, 0],
  scale = [1, 1],
  origin = "50% 50%",
  on,
  className = "",
  style,
  children,
  ...rest
}) {
  return (
    <Tag
      className={`wrap-scrub ${className}`}
      data-on={on}
      style={{
        "--at": at,
        "--span": span,
        "--a0": opacity[0],
        "--a1": opacity[1],
        "--y0": y[0],
        "--y1": y[1],
        "--s0": scale[0],
        "--s1": scale[1],
        "--origin": origin,
        ...style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

// A bar that grows from its base (or from the left with axis="x") once triggered.
export function Grow({ as: Tag = "div", at = 0, on, delay = 0, axis = "y", className = "", style, ...rest }) {
  const ref = useRef(null);
  useTrigger(ref, { at, on });

  return <Tag ref={ref} className={`wrap-grow ${className}`} data-axis={axis} style={{ "--delay": `${delay}ms`, ...style }} {...rest} />;
}

// Counts from zero to `value` once triggered, then holds the final value for good.
// Screen readers only ever get the final value.
export function CountUp({ value, decimals = 0, at = 0, on, delay = 0, className = "" }) {
  const ref = useRef(null);
  const run = useRef({ played: false, frame: 0, timer: 0 });
  const final = formatNumber(value, decimals);

  useEffect(() => {
    const current = run.current;
    return () => {
      cancelAnimationFrame(current.frame);
      clearTimeout(current.timer);
    };
  }, []);

  useChapterProgress((p, e) => {
    const el = ref.current;
    const state = run.current;
    if (!el || state.played || (on === "enter" ? e : p) < at) return;
    state.played = true;
    if (isReducedMotion()) {
      el.textContent = final;
      return;
    }

    const wait = GAP_MS + delay;
    const start = performance.now() + wait;
    el.textContent = formatNumber(0, decimals, true);
    const tick = (now) => {
      const t = Math.min(1, Math.max(0, (now - start) / PLAY_MS));
      el.textContent = t >= 1 ? final : formatNumber(value * easeOutCubic(t), decimals, true);
      if (t < 1) state.frame = requestAnimationFrame(tick);
    };
    state.frame = requestAnimationFrame(tick);
    // Guarantee the true number lands even if animation frames are throttled.
    state.timer = setTimeout(() => {
      cancelAnimationFrame(state.frame);
      el.textContent = final;
    }, wait + PLAY_MS + 50);
  });

  return (
    <span className={className}>
      <span className="sr-only">{final}</span>
      <span ref={ref} aria-hidden="true" className="tabular-nums">
        {final}
      </span>
    </span>
  );
}
