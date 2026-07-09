import { useEffect, useState } from "react";
import { AlertCircle, Clock, RefreshCw, UserCheck } from "lucide-react";
import { getAdminLoginHistory } from "../api/auth";
import type { AdminLoginHistoryItem } from "../api/auth";

function formatSignedInAt(value: string) {
  if (!value) return "-";

  const parsed = new Date(value.replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString();
}

export function LoginHistory() {
  const [history, setHistory] = useState<AdminLoginHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function loadHistory() {
    setLoading(true);
    getAdminLoginHistory()
      .then((response) => {
        setHistory(response.history);
        setError(null);
      })
      .catch((err) => {
        setHistory([]);
        setError("Could not load admin login history.");
        console.error(err);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base" style={{ color: "#1a2b42", fontWeight: 700 }}>
            Login History
          </h2>
          <p className="text-xs" style={{ color: "#6b7a99" }}>
            Which admin signed in and signed out.
          </p>
        </div>
        <button
          onClick={loadHistory}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors hover:bg-gray-50 disabled:opacity-60"
          style={{ borderColor: "rgba(0,0,0,0.12)", color: "#1a2b42" }}
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
        <table className="w-full min-w-[560px] text-left">
          <thead style={{ backgroundColor: "#f8fafc" }}>
            <tr>
              <th className="px-4 py-3 text-xs" style={{ color: "#6b7a99", fontWeight: 600 }}>Admin</th>
              <th className="px-4 py-3 text-xs" style={{ color: "#6b7a99", fontWeight: 600 }}>Username</th>
              <th className="px-4 py-3 text-xs" style={{ color: "#6b7a99", fontWeight: 600 }}>Signed In</th>
              <th className="px-4 py-3 text-xs" style={{ color: "#6b7a99", fontWeight: 600 }}>Signed Out</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-8 text-center text-sm" colSpan={4} style={{ color: "#6b7a99" }}>
                  Loading login history...
                </td>
              </tr>
            ) : history.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-sm" colSpan={4} style={{ color: "#6b7a99" }}>
                  No login history found.
                </td>
              </tr>
            ) : (
              history.map((item) => (
                <tr key={item.id} className="border-t" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}>
                        <UserCheck size={15} />
                      </div>
                      <div className="text-sm" style={{ color: "#1a2b42", fontWeight: 600 }}>
                        {item.name}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: "#1a2b42" }}>{item.username}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-sm" style={{ color: "#1a2b42" }}>
                      <Clock size={14} style={{ color: "#6b7a99" }} />
                      {formatSignedInAt(item.signedInAt)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-sm" style={{ color: "#1a2b42" }}>
                      <Clock size={14} style={{ color: "#6b7a99" }} />
                      {item.signedOutAt ? formatSignedInAt(item.signedOutAt) : "Still signed in"}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
