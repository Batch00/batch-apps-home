import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import AppsGrid from "./components/AppsGrid";
import RequestAccess from "./components/RequestAccess";
import About from "./components/About";
import Contact from "./components/Contact";
import Footer from "./components/Footer";
import BackToTop from "./components/BackToTop";
import { supabase } from "./lib/supabase";

const LIVE_APPS = [
  { name: "BatchFlow", url: "https://batchflow.batch-apps.com", icon: "💸" },
  { name: "BatchFolio", url: "https://batchfolio.batch-apps.com", icon: "📈" },
];

function SetupOverlay() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const hash = window.location.hash;
  const params = new URLSearchParams(hash.substring(1));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (sessionError) {
      setError(sessionError.message);
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
    }
  }

  if (success) {
    return (
      <div style={overlay}>
        <div style={card}>
          <h2 style={heading}>You're in.</h2>
          <p style={sub}>Password set successfully. Choose an app to get started:</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {LIVE_APPS.map((app) => (
              <a key={app.name} href={app.url} style={appCard}>
                <span style={{ fontSize: "1.4rem" }}>{app.icon}</span>
                <span style={{ fontWeight: 600, color: "#f5f5f5" }}>{app.name}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={overlay}>
      <div style={card}>
        <h2 style={heading}>Set up your password</h2>
        <p style={sub}>Choose a password to access Batch Apps.</p>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={input}
          />
          <input
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            style={input}
          />
          {error && <p style={{ color: "#ef4444", fontSize: "0.875rem", margin: 0 }}>{error}</p>}
          <button type="submit" disabled={loading} style={btn}>
            {loading ? "Setting password…" : "Set Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

const overlay = {
  position: "fixed", inset: 0, backgroundColor: "#0a0a0a",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontFamily: "Inter, sans-serif", padding: "24px", zIndex: 9999,
};
const card = {
  backgroundColor: "#111111", border: "1px solid #222222",
  borderRadius: "12px", padding: "40px 36px", width: "100%", maxWidth: "400px",
};
const heading = { color: "#f5f5f5", fontSize: "1.5rem", fontWeight: 700, margin: "0 0 8px" };
const sub = { color: "#888888", fontSize: "0.95rem", marginBottom: "24px" };
const input = {
  backgroundColor: "#0a0a0a", border: "1px solid #222222", borderRadius: "8px",
  color: "#f5f5f5", fontSize: "0.95rem", padding: "12px 14px",
  outline: "none", width: "100%", boxSizing: "border-box",
};
const btn = {
  backgroundColor: "#3b82f6", border: "none", borderRadius: "8px",
  color: "#fff", cursor: "pointer", fontSize: "0.95rem",
  fontWeight: 600, padding: "12px", marginTop: "4px",
};
const appCard = {
  backgroundColor: "#0a0a0a", border: "1px solid #222222", borderRadius: "8px",
  color: "#f5f5f5", display: "flex", alignItems: "center", gap: "12px",
  padding: "14px 18px", textDecoration: "none", fontFamily: "Inter, sans-serif",
};

export default function App() {
  const hash = window.location.hash;
  const isInvite = hash.includes("access_token") && hash.includes("type=invite");

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] font-sans">
      {isInvite && <SetupOverlay />}
      <Navbar />
      <main className="pt-16">
        <Hero />
        <AppsGrid />
        <RequestAccess />
        <About />
        <Contact />
      </main>
      <Footer />
      <BackToTop />
    </div>
  );
}
