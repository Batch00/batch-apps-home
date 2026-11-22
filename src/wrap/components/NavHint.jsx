import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { MOVE_EVENT } from "../engine/useBeatNavigation";

// The opening's "Tap or scroll" hint ("Click or scroll" with a mouse). It fades for good after the
// reader's first move, whether that is a scroll, a tap, a click or a key.
export function NavHint() {
  const [visible, setVisible] = useState(true);
  const [touch] = useState(() => window.matchMedia?.("(pointer: coarse)").matches ?? false);

  useEffect(() => {
    if (!visible) return undefined;
    const hide = () => setVisible(false);
    const onScroll = () => {
      if (window.scrollY > 24) hide();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener(MOVE_EVENT, hide);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener(MOVE_EVENT, hide);
    };
  }, [visible]);

  return (
    <div
      aria-hidden="true"
      className={`wrap-fade pointer-events-none absolute inset-x-0 bottom-8 flex justify-center transition-opacity duration-700 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="wrap-bob flex flex-col items-center gap-2 text-eyebrow uppercase text-text-muted">
        {touch ? "Tap or scroll" : "Click or scroll"}
        <ChevronDown size={16} />
      </div>
    </div>
  );
}
