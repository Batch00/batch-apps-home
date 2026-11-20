// Canvas globe for the travel chapter: d3-geo orthographic projection on a 2D canvas.
// Loaded on demand by components/Globe.jsx, so d3-geo, topojson and the atlases stay in their
// own chunk. The route schedule and camera timings come in from route.js through Globe.jsx,
// so the wrap chunk and this chunk share no module.
//
// Drawing model
// - The camera (rotation and zoom) follows the chapter's scroll progress. It is decoration, so it
//   may scrub; a short lerp smooths wheel steps.
// - Route arcs are triggered: once progress reaches a stop's `at`, its arc draws on a timer and
//   always completes, so a paused page shows every arc it has reached in full.
// - Nothing runs while idle: a frame is drawn when progress changes, and the loop keeps going only
//   while the camera is settling or an arc, dot or label is still animating.
//
// Keeping frames cheap
// - The map (sphere, land, visited regions, stops) is drawn into an offscreen canvas and reused
//   while the camera holds still, so frames that only animate arcs are a single blit.
// - Land and visited regions are split into polygons with bounding caps; polygons outside the
//   visible part of the globe are skipped before d3 projects a single point.
// - Rings are thinned when a degree spans only a few pixels (the whole-globe view), and adaptive
//   resampling is off: the atlas points are already dense enough at every zoom used here.
// - The graticule fades out as the camera zooms in, and is skipped once invisible.

import { geoCentroid, geoDistance, geoGraticule10, geoInterpolate, geoOrthographic, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import world from "world-atlas/countries-110m.json";
import usStates from "us-atlas/states-10m.json";
import { COUNTRY_ID, COUNTRY_NAME_FALLBACK, STATE_FIPS } from "./codes";

const TAU = Math.PI * 2;
const MAX_DPR = 2;
const POP_MS = 450;
const ARC_SAMPLES = 64;
const HORIZON = Math.PI / 2 - 0.02;

const COLORS = {
  sphere: "#0c0e12",
  graticule: "rgba(255, 255, 255, 0.05)",
  land: "#24272d",
  visited: "rgba(59, 130, 246, 0.30)",
  visitedEdge: "rgba(96, 165, 250, 0.45)",
  rim: "rgba(255, 255, 255, 0.09)",
  glow: "rgba(59, 130, 246, 0.16)",
  stop: "rgba(245, 245, 245, 0.38)",
  arc: "#3b82f6",
  arcHalo: "rgba(59, 130, 246, 0.22)",
  dot: "#60a5fa",
  label: "#f5f5f5",
  labelHalo: "rgba(10, 10, 10, 0.9)",
};

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeOutBack = (t) => 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;

// Keep every k-th point of a ring (always closing it), for the coarse whole-globe view.
function thin(ring, k) {
  if (k <= 1 || ring.length < 16) return ring;
  const out = [];
  for (let i = 0; i < ring.length - 1; i += k) out.push(ring[i]);
  out.push(ring[ring.length - 1]);
  return out.length >= 4 ? out : ring;
}

// Split features into polygons, each with a bounding cap (center and angular radius) and three
// levels of detail: full, every 2nd point, every 3rd point.
function polygons(collection) {
  const list = [];
  for (const f of collection.features) {
    const g = f.geometry;
    if (!g) continue;
    const parts = g.type === "MultiPolygon" ? g.coordinates : g.type === "Polygon" ? [g.coordinates] : [];
    for (const rings of parts) {
      const full = { type: "Polygon", coordinates: rings };
      const center = geoCentroid(full);
      let radius = 0;
      for (const ring of rings) for (const point of ring) radius = Math.max(radius, geoDistance(center, point));
      list.push({
        center,
        radius,
        lod: [full, 2, 3].map((k) => (k === full ? full : { type: "Polygon", coordinates: rings.map((r) => thin(r, k)) })),
      });
    }
  }
  return list;
}

function subset(topology, object, keep) {
  return feature(topology, { type: "GeometryCollection", geometries: object.geometries.filter(keep) });
}

function buildLayers(travel) {
  const countryIds = new Set();
  const countryNames = new Set();
  for (const code of travel?.lifetime?.countries ?? []) {
    if (COUNTRY_ID.has(code)) countryIds.add(COUNTRY_ID.get(code));
    if (COUNTRY_NAME_FALLBACK.has(code)) countryNames.add(COUNTRY_NAME_FALLBACK.get(code));
  }
  const stateIds = new Set((travel?.lifetime?.us_states ?? []).map((code) => STATE_FIPS.get(code)).filter(Boolean));
  const countries = subset(world, world.objects.countries, (g) =>
    g.id ? countryIds.has(g.id) : countryNames.has(g.properties?.name),
  );
  const states = subset(usStates, usStates.objects.states, (g) => stateIds.has(g.id));

  return {
    land: polygons(feature(world, world.objects.land)),
    visited: [...polygons(countries), ...polygons(states)],
    graticule: geoGraticule10(),
    stops: (travel?.lifetime?.stops ?? [])
      .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lon))
      .map((s) => [s.lon, s.lat]),
  };
}

function buildRoute(schedule) {
  return schedule.map((stop) => {
    const to = [stop.lon, stop.lat];
    const from = stop.from ? [stop.from.lon, stop.from.lat] : null;
    let samples = null;
    if (from) {
      const interpolate = geoInterpolate(from, to);
      samples = Array.from({ length: ARC_SAMPLES + 1 }, (_, i) => interpolate(i / ARC_SAMPLES));
    }
    return { city: stop.city, at: stop.at, to, samples, startAt: null };
  });
}

// Center of the route's bounding box, and its widest angular reach from that center.
function routeFocus(route) {
  if (!route.length) return null;
  const lons = route.map((s) => s.to[0]);
  const lats = route.map((s) => s.to[1]);
  const center = [(Math.min(...lons) + Math.max(...lons)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2];
  const reach = Math.max(0.02, ...route.map((s) => geoDistance(center, s.to)));
  return { lon: center[0], lat: center[1], reach };
}

// timing: { schedule, ARC_MS, TURN_END, ZOOM_IN_END, ZOOM_OUT_START } from route.js.
export function createGlobe(canvas, travel, timing) {
  const { ARC_MS, TURN_END, ZOOM_IN_END, ZOOM_OUT_START } = timing;
  const ctx = canvas.getContext("2d");
  const mapCanvas = document.createElement("canvas");
  const mapCtx = mapCanvas.getContext("2d");
  const layers = buildLayers(travel);
  const route = buildRoute(timing.schedule);
  const focus = routeFocus(route);
  const projection = geoOrthographic().precision(0);
  const mapPath = geoPath(projection, mapCtx);
  const routePath = geoPath(projection, ctx);

  // The globe starts turned west of the route (or of Europe), then turns toward it.
  const home = { lon: (focus?.lon ?? 10) - 70, lat: 22 };

  const size = { w: 0, h: 0, dpr: 1, radius: 0, focusZoom: 1 };
  let progress = { p: 0, e: 0 };
  let reduced = false;
  let camera = null;
  let mapKey = "";
  let frame = 0;
  let last = 0;
  let landedShown = -1;

  function targetCamera() {
    if (reduced && focus) return { lon: focus.lon, lat: focus.lat, zoom: size.focusZoom };
    const { p, e } = progress;
    const turnLon = home.lon - 28 * (1 - e) + 28 * clamp01(p / TURN_END);
    if (!focus) return { lon: turnLon, lat: home.lat, zoom: 1 };

    const zoomIn = easeInOut(clamp01((p - TURN_END) / (ZOOM_IN_END - TURN_END)));
    const zoomOut = easeInOut(clamp01((p - ZOOM_OUT_START) / (1 - ZOOM_OUT_START)));
    const logZoom = Math.log(size.focusZoom);
    return {
      lon: lerp(turnLon, focus.lon, zoomIn),
      lat: lerp(lerp(home.lat, focus.lat, zoomIn), 30, zoomOut),
      zoom: Math.exp(lerp(lerp(0, logZoom, zoomIn), 0, zoomOut)),
    };
  }

  // Trigger arcs from progress. Several reached at once (a jump or a reload mid-chapter) start
  // one after another, so the route still draws in order.
  function updateRoute(now) {
    let previousStart = -Infinity;
    for (const stop of route) {
      const reached = reduced || progress.p >= stop.at;
      if (!reached) stop.startAt = null;
      else if (stop.startAt === null) stop.startAt = reduced ? -Infinity : Math.max(now, previousStart + ARC_MS * 0.5);
      if (stop.startAt !== null) previousStart = stop.startAt;
    }
  }

  function landAt(stop) {
    return stop.samples ? stop.startAt + ARC_MS : stop.startAt;
  }

  function isAnimating(now) {
    return route.some((stop) => stop.startAt !== null && now < landAt(stop) + POP_MS);
  }

  function visible(lonLat) {
    return geoDistance(lonLat, [camera.lon, camera.lat]) < HORIZON;
  }

  // Adds every polygon that can reach the visible part of the globe to the current path.
  function tracePolygons(list, view) {
    for (const polygon of list) {
      if (geoDistance(polygon.center, view.center) < view.cap + polygon.radius) mapPath(polygon.lod[view.lod]);
    }
  }

  function drawMap() {
    const { w, h, dpr } = size;
    const r = projection.scale();
    const cx = w / 2;
    const cy = h / 2;
    const halfDiagonal = Math.hypot(cx, cy);
    const pixelsPerDegree = (r * Math.PI) / 180;
    const view = {
      center: [camera.lon, camera.lat],
      // Angular radius of what the canvas can show: the whole hemisphere, or less once zoomed.
      cap: (halfDiagonal >= r ? Math.PI / 2 : Math.asin(halfDiagonal / r)) + 0.02,
      lod: pixelsPerDegree < 4 ? 2 : pixelsPerDegree < 8 ? 1 : 0,
    };

    mapCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    mapCtx.clearRect(0, 0, w, h);

    if (r < halfDiagonal * 1.2) {
      const glow = mapCtx.createRadialGradient(cx, cy, r * 0.94, cx, cy, r * 1.14);
      glow.addColorStop(0, COLORS.glow);
      glow.addColorStop(1, "rgba(59, 130, 246, 0)");
      mapCtx.fillStyle = glow;
      mapCtx.beginPath();
      mapCtx.arc(cx, cy, r * 1.14, 0, TAU);
      mapCtx.fill();
    }

    mapCtx.beginPath();
    mapCtx.arc(cx, cy, r, 0, TAU);
    mapCtx.fillStyle = COLORS.sphere;
    mapCtx.fill();

    const graticuleAlpha = 1 - clamp01((camera.zoom - 1) / 1.5);
    if (graticuleAlpha > 0) {
      mapCtx.globalAlpha = graticuleAlpha;
      mapCtx.beginPath();
      mapPath(layers.graticule);
      mapCtx.lineWidth = 0.6;
      mapCtx.strokeStyle = COLORS.graticule;
      mapCtx.stroke();
      mapCtx.globalAlpha = 1;
    }

    mapCtx.beginPath();
    tracePolygons(layers.land, view);
    mapCtx.fillStyle = COLORS.land;
    mapCtx.fill();

    mapCtx.beginPath();
    tracePolygons(layers.visited, view);
    mapCtx.fillStyle = COLORS.visited;
    mapCtx.fill();
    mapCtx.lineWidth = 0.6;
    mapCtx.strokeStyle = COLORS.visitedEdge;
    mapCtx.stroke();

    mapCtx.beginPath();
    mapCtx.arc(cx, cy, r, 0, TAU);
    mapCtx.lineWidth = 1;
    mapCtx.strokeStyle = COLORS.rim;
    mapCtx.stroke();

    mapCtx.fillStyle = COLORS.stop;
    mapCtx.beginPath();
    for (const stop of layers.stops) {
      if (!visible(stop)) continue;
      const [x, y] = projection(stop);
      mapCtx.moveTo(x + 1.6, y);
      mapCtx.arc(x, y, 1.6, 0, TAU);
    }
    mapCtx.fill();

    // Fade the map toward the canvas edges once zoomed in, so the crop never shows a hard edge.
    const fade = clamp01((camera.zoom - 1) / 1.5);
    if (fade > 0) {
      mapCtx.save();
      mapCtx.globalCompositeOperation = "destination-in";
      mapCtx.translate(cx, cy);
      mapCtx.scale(cx, cy);
      const mask = mapCtx.createRadialGradient(0, 0, 0.55, 0, 0, 1);
      mask.addColorStop(0, "rgba(0, 0, 0, 1)");
      mask.addColorStop(1, `rgba(0, 0, 0, ${1 - fade})`);
      mapCtx.fillStyle = mask;
      mapCtx.fillRect(-1, -1, 2, 2);
      mapCtx.restore();
    }
  }

  function drawRoute(now) {
    const { w } = size;
    let landed = 0;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (const stop of route) {
      if (stop.startAt === null || !stop.samples) continue;
      const t = easeInOut(clamp01((now - stop.startAt) / ARC_MS));
      if (t <= 0) continue;
      const end = t * ARC_SAMPLES;
      const whole = Math.floor(end);
      const coordinates = stop.samples.slice(0, whole + 1);
      if (whole < ARC_SAMPLES) {
        const a = stop.samples[whole];
        const b = stop.samples[whole + 1];
        const f = end - whole;
        coordinates.push([lerp(a[0], b[0], f), lerp(a[1], b[1], f)]);
      }
      ctx.beginPath();
      routePath({ type: "LineString", coordinates });
      ctx.lineWidth = 5;
      ctx.strokeStyle = COLORS.arcHalo;
      ctx.stroke();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = COLORS.arc;
      ctx.stroke();

      if (t < 1) {
        const tip = coordinates[coordinates.length - 1];
        if (visible(tip)) {
          const [x, y] = projection(tip);
          ctx.beginPath();
          ctx.arc(x, y, 2.4, 0, TAU);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
        }
      }
    }

    const fontSize = w < 520 ? 11 : 13;
    ctx.font = `600 ${fontSize}px Inter, sans-serif`;
    ctx.textBaseline = "middle";
    // Labels only read once the camera is close enough to separate the cities: fade them with
    // the zoom (0 at the whole globe, 1 at the route view).
    const zoomShare = size.focusZoom > 1.2 ? Math.log(camera.zoom) / Math.log(size.focusZoom) : 1;
    const labelAlpha = clamp01((zoomShare - 0.6) / 0.3);

    for (const stop of route) {
      if (stop.startAt === null) continue;
      const pop = clamp01((now - landAt(stop)) / POP_MS);
      if (pop <= 0) continue;
      if (pop >= 1) landed++;
      if (!visible(stop.to)) continue;
      const [x, y] = projection(stop.to);
      const s = easeOutBack(pop);

      const glow = ctx.createRadialGradient(x, y, 0, x, y, 14 * s);
      glow.addColorStop(0, "rgba(96, 165, 250, 0.55)");
      glow.addColorStop(1, "rgba(96, 165, 250, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, 14 * s, 0, TAU);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, 3.6 * s, 0, TAU);
      ctx.fillStyle = COLORS.dot;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, 1.5 * s, 0, TAU);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      if (labelAlpha <= 0) continue;
      const width = ctx.measureText(stop.city).width;
      const lx = x + 10 + width > w - 6 ? x - 10 - width : x + 10;
      ctx.globalAlpha = pop * labelAlpha;
      ctx.lineWidth = 3;
      ctx.strokeStyle = COLORS.labelHalo;
      ctx.strokeText(stop.city, lx, y);
      ctx.fillStyle = COLORS.label;
      ctx.fillText(stop.city, lx, y);
      ctx.globalAlpha = 1;
    }

    // How many stops have fully landed, for tests and debugging.
    if (landed !== landedShown) {
      landedShown = landed;
      canvas.dataset.landed = `${landed}/${route.length}`;
    }
  }

  function draw(now) {
    if (!size.w || !camera) return;
    const { w, h, dpr } = size;
    projection
      .rotate([-camera.lon, -camera.lat])
      .scale(size.radius * camera.zoom)
      .translate([w / 2, h / 2]);

    // Redraw the map only when the camera or the canvas changed; arc-only frames reuse it.
    const key = `${canvas.width}x${canvas.height}:${camera.lon.toFixed(3)},${camera.lat.toFixed(3)},${camera.zoom.toFixed(4)}`;
    if (key !== mapKey) {
      drawMap();
      mapKey = key;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(mapCanvas, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawRoute(now);
  }

  function tick(now) {
    frame = 0;
    const dt = Math.min(64, last ? now - last : 16);
    last = now;
    const target = targetCamera();
    let settling = false;
    if (!camera || reduced) {
      camera = target;
    } else {
      const k = 1 - Math.exp(-dt / 110);
      const next = {
        lon: lerp(camera.lon, target.lon, k),
        lat: lerp(camera.lat, target.lat, k),
        zoom: Math.exp(lerp(Math.log(camera.zoom), Math.log(target.zoom), k)),
      };
      settling =
        Math.abs(next.lon - target.lon) > 0.01 ||
        Math.abs(next.lat - target.lat) > 0.01 ||
        Math.abs(Math.log(next.zoom / target.zoom)) > 0.001;
      camera = settling ? next : target;
    }
    draw(now);
    if (settling || isAnimating(now)) frame = requestAnimationFrame(tick);
    else last = 0;
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(tick);
  }

  return {
    resize(w, h) {
      size.dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      size.w = w;
      size.h = h;
      size.radius = Math.min(w, h) * 0.46;
      // Zoom that fits the route inside about 60% of the shorter side.
      size.focusZoom = focus
        ? Math.min(7, Math.max(1, (Math.min(w, h) * 0.31) / Math.sin(focus.reach) / size.radius))
        : 1;
      canvas.width = mapCanvas.width = Math.round(w * size.dpr);
      canvas.height = mapCanvas.height = Math.round(h * size.dpr);
      mapKey = "";
      camera = targetCamera();
      updateRoute(performance.now());
      draw(performance.now());
      schedule();
    },
    setProgress(p, e, isReduced) {
      progress = { p, e };
      reduced = isReduced;
      updateRoute(performance.now());
      schedule();
    },
    destroy() {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    },
  };
}
