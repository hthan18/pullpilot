import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { reviewAPI } from "../services/api";

export default function ReviewPage() {
  const { repoId } = useParams();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await reviewAPI.getByRepository(repoId!);
        setReviews(res.data);
      } catch (err) {
        console.error("Error fetching reviews:", err);
        setError("Failed to load reviews");
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [repoId]);

  return (
    <div style={{ background: "#111827", minHeight: "100vh" }}>
      {/* Navbar */}
      <nav style={{ background: "#1f2937", borderBottom: "1px solid #374151" }}>
        <div
          style={{
            maxWidth: "1280px",
            margin: "0 auto",
            padding: "0 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            height: "64px",
          }}
        >
          <Link
            to="/dashboard"
            style={{
              fontSize: "20px",
              fontWeight: "bold",
              color: "white",
              textDecoration: "none",
            }}
          >
            PullPilot
          </Link>
          <Link
            to="/repositories"
            style={{
              color: "#d1d5db",
              textDecoration: "none",
              fontSize: "14px",
              background: "#374151",
              padding: "8px 12px",
              borderRadius: "6px",
            }}
          >
            Back to Repositories
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "32px 24px" }}>
        <h1
          style={{
            fontSize: "28px",
            fontWeight: "bold",
            color: "white",
            marginBottom: "8px",
          }}
        >
          Code Reviews
        </h1>
        <p style={{ color: "#9ca3af", marginBottom: "24px" }}>
          Analyze pull requests with AI-powered code review.
        </p>

        {loading && (
          <div style={{ color: "#9ca3af", textAlign: "center", marginTop: "40px" }}>
            Loading reviews...
          </div>
        )}

        {error && (
          <div style={{ color: "#ef4444", textAlign: "center", marginTop: "40px" }}>
            {error}
          </div>
        )}

        {!loading && !error && reviews.length === 0 && (
          <div style={{ color: "#9ca3af", textAlign: "center", marginTop: "40px" }}>
            No reviews yet for this repository.
          </div>
        )}

        {!loading &&
          !error &&
          reviews.map((review) => (
            <div
              key={review.id}
              style={{
                background: "#1f2937",
                borderRadius: "8px",
                padding: "24px",
                border: "1px solid #374151",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <h3
                    style={{
                      color: "white",
                      fontWeight: "600",
                      fontSize: "18px",
                      marginBottom: "4px",
                    }}
                  >
                    PR #{review.pr_number}: {review.pr_title}
                  </h3>
                  <p style={{ color: "#9ca3af", fontSize: "14px", margin: 0 }}>
                    Status:{" "}
                    <span
                      style={{
                        color:
                          review.status === "completed"
                            ? "#10b981"
                            : review.status === "failed"
                            ? "#ef4444"
                            : "#fbbf24",
                      }}
                    >
                      {review.status}
                    </span>
                  </p>
                  <p
                    style={{
                      color: "#9ca3af",
                      fontSize: "13px",
                      marginTop: "4px",
                    }}
                  >
                    Created at:{" "}
                    {new Date(review.created_at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>

                {review.status === "completed" && (
                  <button
                    onClick={() =>
                      alert(JSON.stringify(review.analysis_result, null, 2))
                    }
                    style={{
                      background: "#2563eb",
                      color: "white",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    View Analysis
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
