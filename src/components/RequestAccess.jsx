import { useState, useEffect } from "react";
import { X } from "lucide-react";

const APP_OPTIONS = ["BatchFlow", "BatchFolio", "BatchBurn"];

export default function RequestAccessModal() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", apps: [], message: "" });
  const [status, setStatus] = useState("idle"); // idle | loading | success | error

  // Deep link support: open modal if hash is #request-access
  useEffect(() => {
    function checkHash() {
      if (window.location.hash === "#request-access") {
        setOpen(true);
      }
    }
    checkHash();
    window.addEventListener("hashchange", checkHash);
    return () => window.removeEventListener("hashchange", checkHash);
  }, []);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setForm((prev) => ({
        ...prev,
        apps: checked
          ? [...prev.apps, value]
          : prev.apps.filter((a) => a !== value),
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("loading");

    const messageWithApps = form.apps.length
      ? `Interested in: ${form.apps.join(", ")}\n\n${form.message}`
      : form.message;

    try {
      const res = await fetch("/api/request-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          message: messageWithApps,
        }),
      });

      if (res.ok) {
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  const inputClass =
    "w-full bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg px-4 py-3 text-[#f5f5f5] text-sm placeholder-[#555555] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent transition";

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-8 right-8 z-40 bg-[#3b82f6] hover:bg-[#60a5fa] text-white font-semibold text-sm px-6 py-3 rounded-full shadow-lg shadow-[#3b82f6]/20 hover:shadow-[#3b82f6]/40 transition-all"
      >
        Request Access
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70" />

          {/* Modal card */}
          <div
            className="relative w-full max-w-md bg-[#111111] border border-[#1f1f1f] rounded-xl p-8 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-[#888888] hover:text-[#f5f5f5] transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>

            <h2 className="text-2xl font-bold text-[#f5f5f5] mb-2">
              Request Access
            </h2>
            <p className="text-[#888888] text-sm mb-6">
              Batch Apps is currently invite-only. Fill out the form below and I will be in touch.
            </p>

            {status === "success" ? (
              <p className="text-[#f5f5f5] text-lg font-medium py-4">
                You are on the list. I will be in touch soon.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm text-[#888888] mb-2">Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Your name"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#888888] mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#888888] mb-3">
                    Which app(s) are you interested in?
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {APP_OPTIONS.map((app) => (
                      <label
                        key={app}
                        className="flex items-center gap-2 cursor-pointer group"
                      >
                        <input
                          type="checkbox"
                          value={app}
                          checked={form.apps.includes(app)}
                          onChange={handleChange}
                          className="w-4 h-4 rounded border-[#2a2a2a] bg-[#1f1f1f] accent-[#3b82f6] cursor-pointer"
                        />
                        <span className="text-sm text-[#888888] group-hover:text-[#f5f5f5] transition-colors">
                          {app}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-[#888888] mb-2">
                    Message <span className="text-[#555555]">(optional)</span>
                  </label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Anything you'd like to add?"
                    rows={4}
                    className={inputClass + " resize-none"}
                  />
                </div>

                {status === "error" && (
                  <p className="text-red-400 text-sm">
                    Something went wrong. Please try again.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full bg-[#3b82f6] hover:bg-[#60a5fa] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm px-8 py-3 rounded-lg transition-colors"
                >
                  {status === "loading" ? "Sending…" : "Request Access"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
