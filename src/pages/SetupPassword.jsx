import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const LIVE_APPS = [
  { name: "BatchFlow", url: "https://batchflow.batch-apps.com", icon: "💸" },
  { name: "BatchFolio", url: "https://batchfolio.batch-apps.com", icon: "📈" },
];

export default function SetupPassword() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");

    if (accessToken && type === "invite") {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (error) {
            setError("Invalid or expired invite link.");
          } else {
            setReady(true);
          }
        });
    } else {
      setError("Invalid or expired invite link. Please contact carsonb1723@gmail.com");
    }
  }, []);

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
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
  }

  if (error && !ready) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <p style={{ color: "#888888", fontSize: "0.95rem", margin: 0 }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <p style={{ color: "#888888", fontSize: "0.95rem", margin: 0 }}>Verifying link…</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <h2 style={styles.heading}>You're in.</h2>
          <p style={{ color: "#888888", marginBottom: "28px", fontSize: "0.95rem" }}>
            Password set successfully. Choose an app to get started:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {LIVE_APPS.map((app) => (
              <a key={app.name} href={app.url} style={styles.appCard}>
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
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.heading}>Set your password</h2>
        <p style={{ color: "#888888", marginBottom: "24px", fontSize: "0.95rem" }}>
          Choose a password to activate your Batch Apps account.
        </p>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={styles.input}
          />
          <input
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            style={styles.input}
          />
          {error && <p style={{ color: "#ef4444", fontSize: "0.875rem", margin: 0 }}>{error}</p>}
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? "Setting password…" : "Set Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#0a0a0a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "Inter, sans-serif",
    padding: "24px",
  },
  card: {
    backgroundColor: "#111111",
    border: "1px solid #222222",
    borderRadius: "12px",
    padding: "40px 36px",
    width: "100%",
    maxWidth: "400px",
  },
  heading: {
    color: "#f5f5f5",
    fontSize: "1.5rem",
    fontWeight: 700,
    marginBottom: "8px",
    marginTop: 0,
  },
  input: {
    backgroundColor: "#0a0a0a",
    border: "1px solid #222222",
    borderRadius: "8px",
    color: "#f5f5f5",
    fontSize: "0.95rem",
    padding: "12px 14px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  button: {
    backgroundColor: "#3b82f6",
    border: "none",
    borderRadius: "8px",
    color: "#fff",
    cursor: "pointer",
    fontSize: "0.95rem",
    fontWeight: 600,
    padding: "12px",
    marginTop: "4px",
  },
  appCard: {
    backgroundColor: "#0a0a0a",
    border: "1px solid #222222",
    borderRadius: "8px",
    color: "#f5f5f5",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "14px 18px",
    textDecoration: "none",
    fontFamily: "Inter, sans-serif",
  },
};
