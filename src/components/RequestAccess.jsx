import { useState } from "react";
import { useFadeIn } from "../hooks/useFadeIn";

const APP_OPTIONS = ["BatchFlow", "BatchFolio", "BatchBurn"];

export default function RequestAccess() {
  const ref = useFadeIn();

  const [form, setForm] = useState({ name: "", email: "", apps: [], message: "" });
  const [status, setStatus] = useState("idle"); // idle | loading | success | error

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
    <section id="request-access" className="py-24 px-6 border-t border-[#1f1f1f]">
      <div className="max-w-6xl mx-auto">
        <div ref={ref} className="fade-in-section">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#3b82f6] mb-3">
            Request Access
          </p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#f5f5f5] mb-3">
            Get early access
          </h2>
          <p className="text-[#888888] text-base mb-12">
            Batch Apps is currently invite-only. Fill out the form below and I will be in touch.
          </p>

          {status === "success" ? (
            <div className="max-w-lg py-8">
              <p className="text-[#f5f5f5] text-lg font-medium">
                You are on the list. I will be in touch soon.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="max-w-lg space-y-5">
              {/* Name */}
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

              {/* Email */}
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

              {/* App checkboxes */}
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

              {/* Message */}
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

              {/* Error */}
              {status === "error" && (
                <p className="text-red-400 text-sm">
                  Something went wrong. Please try again.
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full sm:w-auto bg-[#3b82f6] hover:bg-[#60a5fa] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm px-8 py-3 rounded-lg transition-colors"
              >
                {status === "loading" ? "Sending…" : "Request Access"}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
