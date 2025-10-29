import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";

interface Review {
  id: number;
  pr_number: number;
  pr_title: string;
  status: string;
  analysis_result?: any;
  created_at: string;
  completed_at?: string;
}

export default function ReviewPage() {
  const { repoId } = useParams();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await api.get(`/reviews/repository/${repoId}`);
        setReviews(res.data);
      } catch (err: any) {
        console.error("Error fetching reviews:", err);
        setError("Failed to fetch reviews");
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, [repoId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#111827] text-white">
        Loading reviews...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#111827] text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111827] text-white px-6 py-10">
      {/* Back Button */}
      <button
        onClick={() => navigate("/repositories")}
        className="text-blue-400 hover:text-blue-500 text-sm mb-6"
      >
        ← Back to Repositories
      </button>

      <h1 className="text-3xl font-bold mb-6">Code Reviews</h1>

      {reviews.length === 0 ? (
        <p className="text-gray-400">No reviews yet for this repository.</p>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-[#1f2937] rounded-xl p-5 border border-[#374151]"
            >
              <h2 className="text-xl font-semibold">
                PR #{review.pr_number}: {review.pr_title}
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                Status:{" "}
                <span
                  className={
                    review.status === "completed"
                      ? "text-green-400"
                      : review.status === "failed"
                      ? "text-red-400"
                      : "text-yellow-400"
                  }
                >
                  {review.status}
                </span>
              </p>

              {review.analysis_result && (
                <div className="mt-4">
                  <h3 className="text-lg font-medium mb-2">Analysis Result</h3>
                  <pre className="bg-[#111827] text-gray-300 text-sm p-3 rounded-md overflow-auto max-h-96">
                    {JSON.stringify(review.analysis_result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
