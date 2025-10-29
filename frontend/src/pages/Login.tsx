import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../services/api";

export default function Login() {
  const navigate = useNavigate();

  useEffect(() => {
    // If redirected back from GitHub with a ?code= param
    const code = new URLSearchParams(window.location.search).get("code");
    if (code) {
      handleGitHubLogin(code);
    }
  }, []);

  const handleGitHubLogin = async (code: string) => {
    try {
      const res = await authAPI.loginWithGitHub(code);
      localStorage.setItem("token", res.data.token);
      navigate("/dashboard");
    } catch (err) {
      console.error("GitHub login failed:", err);
      alert("GitHub login failed. Please try again.");
    }
  };

  const redirectToGitHub = async () => {
    try {
      const res = await authAPI.getGitHubAuthUrl();
      const url = res.data.url;
      window.location.href = url; // redirect to GitHub OAuth page
    } catch (err) {
      console.error("Error getting GitHub URL:", err);
      alert("Unable to start GitHub login. Please try again later.");
    }
  };

  return (
    <div
      style={{
        background: "#111827",
        color: "white",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <h1 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "24px" }}>
        Welcome to PullPilot
      </h1>
      <p style={{ color: "#9ca3af", marginBottom: "24px" }}>
        Sign in to connect your GitHub and start AI-powered code reviews
      </p>
      <button
        onClick={redirectToGitHub}
        style={{
          background: "#2563eb",
          border: "none",
          borderRadius: "8px",
          color: "white",
          padding: "12px 24px",
          fontSize: "16px",
          fontWeight: "500",
          cursor: "pointer",
        }}
      >
        Continue with GitHub
      </button>
    </div>
  );
}
