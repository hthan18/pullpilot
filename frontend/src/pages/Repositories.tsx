import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

interface Repository {
  id: number;
  github_repo_id: string;
  name: string;
  full_name: string;
  owner: string;
  description: string;
  private: boolean;
  url: string;
  created_at: string;
}

function Repositories() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRepos = async () => {
      try {
        const res = await api.get("/repositories");
        setRepos(res.data);
      } catch (err: any) {
        console.error("Error fetching repositories:", err);
        setError("Failed to fetch repositories");
      } finally {
        setLoading(false);
      }
    };
    fetchRepos();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-[#111827] text-white">
        Loading repositories...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-[#111827] text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111827] text-white px-6 py-10">
      <h1 className="text-3xl font-bold mb-6 text-center">Connected Repositories</h1>

      {repos.length === 0 ? (
        <p className="text-center text-gray-400">No repositories connected yet.</p>
      ) : (
        <div className="grid gap-4 max-w-3xl mx-auto">
          {repos.map((repo) => (
            <div
              key={repo.id}
              className="bg-[#1f2937] rounded-xl p-5 shadow-md hover:shadow-lg transition duration-200"
            >
              <h2 className="text-xl font-semibold">{repo.full_name}</h2>
              <p className="text-gray-400 text-sm mt-1">
                {repo.description || "No description provided"}
              </p>

              <div className="flex justify-between items-center mt-4">
                <a
                  href={repo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline text-sm"
                >
                  View on GitHub ↗
                </a>

                <button
                  onClick={() => navigate(`/repositories/${repo.id}/reviews`)} // FIXED ROUTE
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  View Reviews
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Repositories;
