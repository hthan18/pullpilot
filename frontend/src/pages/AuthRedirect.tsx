import { useEffect } from "react";

export default function AuthRedirect() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      // Store token immediately
      localStorage.setItem("token", token);
      //Redirect cleanly — reload the page so ProtectedRoute runs with token present
      window.location.href = "/dashboard";
    } else {
      window.location.href = "/";
    }
  }, []);

  return (
    <div
      style={{
        color: "white",
        textAlign: "center",
        marginTop: "100px",
        fontSize: "18px",
      }}
    >
      Redirecting...
    </div>
  );
}
