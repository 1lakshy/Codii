import React from "react";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <img
        src="/codii_logo_trans.png"
        alt="Codii Logo"
        style={styles.logo}
      />
      <h1 style={styles.title}>404 — Page Not Found</h1>
      <p style={styles.subtitle}>
        Looks like this route doesn’t exist on <span style={styles.brand}>Codii</span>.
      </p>
      <button style={styles.btn} onClick={() => navigate("/")}>
        ⬅ Back to Home
      </button>
      <p style={styles.footer}>Made with ❤️ by Codii</p>
    </div>
  );
};

const styles = {
  container: {
    height: "100vh",
    width: "100vw",
    backgroundColor: "#0a0a0a",
    color: "#e0e0e0",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    fontFamily: "'JetBrains Mono', monospace",
  },
  logo: {
    width: "140px",
    marginBottom: "1rem",
    filter: "drop-shadow(0 2px 10px rgba(255, 87, 68, 0.4))",
  },
  title: {
    fontSize: "2rem",
    marginBottom: "0.6rem",
    color: "#FF5744",
  },
  subtitle: {
    fontSize: "1rem",
    opacity: 0.85,
    marginBottom: "2rem",
  },
  brand: {
    color: "#FF5744",
    fontWeight: 600,
  },
  btn: {
    padding: "10px 24px",
    background: "linear-gradient(135deg, #FF5744 0%, #ff3820 100%)",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(255, 87, 68, 0.3)",
    transition: "all 0.3s ease",
  },
  footer: {
    position: "absolute",
    bottom: "20px",
    fontSize: "12px",
    opacity: 0.6,
  },
};

export default NotFound;
