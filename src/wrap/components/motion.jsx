import { useRef } from "react";
import { easeOutCubic, useChapterProgress, windowed } from "../engine/progress";
import { formatNumber } from "../format";

// Motion primitives. All of them are driven by the enclosing Chapter's progress:
//   at, span  the progress window the motion plays across (0 to 1 of the pinned scroll)
//   on        "enter" to use the chapter's entry progress instead (for a chapter's first beat)
// Everything except CountUp is pure CSS math on --p / --e, so scrolling never re-renders React.

// Fade and rise in across [at, at + span]. With `out`, fade and rise away across
// [out - outSpan, out] of the pinned progress (also when the entrance used on="enter").
export function Reveal({
  as: Tag = "div",
  at = 0,
  span = 0.12,
  out,
  outSpan = 0.1,
  y = 40,
  on,
  className = "",
  style,
  children,
  ...rest
}) {
  return (
    <Tag
      className={`wrap-reveal ${className}`}
      data-on={on}
      style={{ "--at": at, "--span": span, "--out": out ?? 9, "--out-span": outSpan, "--y": y, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

// Interpolate opacity, y (px) and scale from the first value to the second across [at, at + span].
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

// A bar that grows from its base (or from the left with axis="x") across [at, at + span].
export function Grow({ as: Tag = "div", at = 0, span = 0.15, axis = "y", on, className = "", style, ...rest }) {
  return (
    <Tag
      className={`wrap-grow ${className}`}
      data-on={on}
      data-axis={axis}
      style={{ "--at": at, "--span": span, ...style }}
      {...rest}
    />
  );
}

// A number that counts up across [at, at + span]. Screen readers get the final value only.
export function CountUp({ value, decimals = 0, at = 0, span = 0.2, on, className = "" }) {
  const ref = useRef(null);
  const final = formatNumber(value, decimals);

  useChapterProgress((p, e) => {
    if (!ref.current) return;
    const t = easeOutCubic(windowed(on === "enter" ? e : p, at, span));
    ref.current.textContent = t >= 1 ? final : formatNumber(value * t, decimals, true);
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
