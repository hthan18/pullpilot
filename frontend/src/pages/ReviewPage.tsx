import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { reviewAPI, authAPI } from "../services/api";

export default function ReviewPage() {
  const { repoId } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [prNumber, setPrNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    loadData();
  }, [repoId]);

  const loadData = async () => {
    try {
      const [userRes, reviewsRes] = await Promise.all([
        authAPI.getCurrentUser(),
        reviewAPI.getReviewsByRepo(Number(repoId)),
      ]);

      setUser(userRes.data);

      const rawReviews = reviewsRes.data;

      // ✅ Deduplicate by PR number and title — keep latest version only
      const uniqueMap: Record<string, any> = {};
      for (const review of rawReviews) {
        const key = `${review.pr_number}-${review.pr_title?.trim()}`;
        const existing = uniqueMap[key];
        if (
          !existing ||
          new Date(review.created_at).getTime() >
            new Date(existing.created_at).getTime()
        ) {
          uniqueMap[key] = review;
        }
      }

      const uniqueReviews = Object.values(uniqueMap);
      uniqueReviews.sort(
        (a: any, b: any) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setReviews(uniqueReviews);
    } catch (error) {
      console.error("Error loading data:", error);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!prNumber.trim()) {
      alert("Please enter a valid PR number.");
      return;
    }

    const existingReview = reviews.find(
      (r) => String(r.pr_number) === String(prNumber)
    );

    if (existingReview) {
      const confirmReanalyze = window.confirm(
        `A review for PR #${prNumber} already exists.\nDo you want to analyze it again?`
      );
      if (!confirmReanalyze) return;
    }

    try {
      setAnalyzing(true);
      await reviewAPI.createReview({
        repositoryId: Number(repoId),
        prNumber: Number(prNumber),
      });

      await loadData(); // Refresh reviews
      setPrNumber(""); // Reset input
    } catch (error) {
      console.error("Error analyzing PR:", error);
      alert("Failed to analyze PR. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 flex justify-between h-16 items-center">
          <Link
            to="/repositories"
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            ← Back to Repositories
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="hover:text-white text-sm">
              Dashboard
            </Link>
            <Link to="/repositories" className="hover:text-white text-sm">
              Repositories
            </Link>
            <div className="flex items-center gap-2">
              <img
                src={user?.avatar_url}
                alt={user?.username}
                className="w-8 h-8 rounded-full"
              />
              <span className="text-sm">{user?.username}</span>
              <button
                onClick={() => {
                  localStorage.removeItem("token");
                  navigate("/");
                }}
                className="text-gray-400 hover:text-gray-300 text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-2 text-white">Code Reviews</h1>
        <p className="text-gray-400 mb-6">
          Analyze pull requests with AI-powered code review
        </p>

        {/* Analyze Section */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Analyze New Pull Request</h2>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Enter PR number (e.g., 42)"
              value={prNumber}
              onChange={(e) => setPrNumber(e.target.value)}
              className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className={`px-5 py-2 rounded-lg text-white font-medium transition ${
                analyzing
                  ? "bg-blue-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-500"
              }`}
            >
              {analyzing ? "Analyzing..." : "Analyze PR"}
            </button>
          </div>
          <p className="text-gray-500 text-sm mt-2">
            Enter the pull request number from GitHub to analyze
          </p>
        </div>

        {/* Review History */}
        <h2 className="text-xl font-semibold mb-4">Review History</h2>
        {reviews.length === 0 ? (
          <p className="text-gray-500">No reviews found.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="bg-gray-800 border border-gray-700 rounded-lg p-4"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-white">
                      PR #{review.pr_number}: {review.pr_title}
                    </p>
                    <p className="text-gray-500 text-sm">
                      {new Date(review.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-semibold px-3 py-1 rounded-full ${
                      review.status === "completed"
                        ? "bg-green-600 text-white"
                        : review.status === "pending"
                        ? "bg-yellow-500 text-black"
                        : "bg-gray-500 text-white"
                    }`}
                  >
                    {review.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
