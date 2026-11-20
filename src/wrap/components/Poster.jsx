import { useState } from "react";

// TMDB serves posters at fixed widths; w342 is sharp at the sizes the wrap uses, even on 2x screens.
const TMDB_IMAGE = "https://image.tmdb.org/t/p/w342";

// A title's poster, lazy-loaded from TMDB. A missing poster_path, or an image that fails to
// load, shows a plain card with the title instead, at the same 2:3 size.
export function Poster({ title, path, year, className = "" }) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(path) && !failed;

  return (
    <div className={`relative aspect-[2/3] overflow-hidden rounded-md bg-surface ring-1 ring-inset ring-border ${className}`}>
      {showImage ? (
        <img
          src={`${TMDB_IMAGE}${path}`}
          alt={title}
          width={342}
          height={513}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full flex-col justify-end p-[8%]">
          <p className="line-clamp-4 text-[clamp(0.6rem,1.6vw,0.95rem)] font-semibold leading-tight text-text-primary">
            {title}
          </p>
          {year && <p className="mt-1 text-[clamp(0.55rem,1.2vw,0.75rem)] tabular-nums text-text-muted">{year}</p>}
        </div>
      )}
    </div>
  );
}
