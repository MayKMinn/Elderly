import { useState } from "react";
import type { FormEvent } from "react";
import { AlertCircle, Eye, EyeOff, Heart, LogIn } from "lucide-react";
import { AdminPortal } from "./admin/AdminPortal";
import { NursePortal } from "./nurse/NursePortal";
import { signInAdmin, signInNurse, signOutAdmin } from "./api/auth";
import type { AdminProfile } from "./api/auth";

type Portal = "admin" | "nurse";

type Session =
  | {
      role: "admin";
      id?: number;
      name: string;
      username?: string;
      email?: string | null;
      avatar?: string;
      signedInAt?: string;
      loginHistoryId?: number;
    }
  | {
        role: "nurse";
        id?: number;
        name: string;
        username?: string;
        email?: string;
        licenseNumber?: string | null;
        position?: string | null;
        avatar?: string | null;
        status?: string;
      }
  | null;

const sessionStorageKey = "elderease.session";

function readSavedSession(): Session {
  try {
    const saved = localStorage.getItem(sessionStorageKey);
    if (!saved) return null;

    const parsed = JSON.parse(saved) as Session;

    if (parsed?.role === "admin" || parsed?.role === "nurse") {
      return parsed;
    }
  } catch {
    localStorage.removeItem(sessionStorageKey);
  }

  return null;
}

export default function App() {
  const [session, setSession] = useState<Session>(readSavedSession);

  function handleSignIn(nextSession: Exclude<Session, null>) {
    localStorage.setItem(sessionStorageKey, JSON.stringify(nextSession));
    setSession(nextSession);
  }

  async function handleSignOut() {
    if (session?.role === "admin") {
      try {
        await signOutAdmin(session.loginHistoryId, session.username);
      } catch (error) {
        console.error("Failed to record admin logout.", error);
      }
    }

    localStorage.removeItem(sessionStorageKey);
    setSession(null);
  }

  function handleAdminProfileChange(profile: AdminProfile) {
    setSession((current) => {
      if (!current || current.role !== "admin") return current;

      const nextSession = {
        ...current,
        id: profile.id,
        name: profile.name,
        username: profile.username,
        email: profile.email,
        avatar: profile.avatar || "",
      };

      localStorage.setItem(sessionStorageKey, JSON.stringify(nextSession));
      return nextSession;
    });
  }

  if (!session) {
    return <SignInScreen onSignIn={handleSignIn} />;
  }

  if (session.role === "admin") {
    return (
      <AdminPortal
        adminName={session.username || session.name}
        adminProfile={{
          id: session.id,
          name: session.name,
          username: session.username,
          email: session.email,
          avatar: session.avatar,
        }}
        signedInAt={session.signedInAt}
        onSignOut={handleSignOut}
        onAdminProfileChange={handleAdminProfileChange}
      />
    );
  }

  return (
    <NursePortal
      nurseName={session.name}
      nurseId={session.id ? String(session.id) : undefined}
      nurseProfile={session}
      onSignOut={handleSignOut}
    />
  );
}

function SignInScreen({
  onSignIn,
}: {
  onSignIn: (session: Exclude<Session, null>) => void;
}) {
  const [portal, setPortal] = useState<Portal>("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const inputCls =
    "w-full px-4 py-3 text-sm bg-input-background border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-muted-foreground";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (portal === "admin") {
        const admin = await signInAdmin(email, password);

        onSignIn({
          role: "admin",
          id: admin.id,
          name: admin.name,
          username: admin.username,
          email: admin.email,
          avatar: admin.avatar,
          signedInAt: new Date().toISOString(),
          loginHistoryId: admin.loginHistoryId,
        });

        return;
      }

      const nurse = await signInNurse(email, password);

      onSignIn({
          role: "nurse",
          id: nurse.id,
          name: nurse.name,
          username: nurse.username,
          email: nurse.email,
          licenseNumber: nurse.licenseNumber || "",
          position: nurse.position || "Nurse",
          avatar: nurse.avatar || "",
          status: nurse.status,
        });
    } catch (err) {
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message);
          setError(parsed.error || "Sign in failed.");
        } catch {
          setError("Sign in failed. Please check the backend server.");
        }
      } else {
        setError("Sign in failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  function switchPortal(nextPortal: Portal) {
    setPortal(nextPortal);
    setEmail("");
    setPassword("");
    setError("");
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30">
            <Heart size={28} className="text-primary-foreground" />
          </div>

          <h1
            className="text-3xl font-bold text-foreground"
            style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}
          >
            ElderEase
          </h1>

          <p className="text-muted-foreground mt-1 text-sm">
            Care Management System
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Demo admin: admin / admin123 or database users: admin1 / admin1
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
          <div className="grid grid-cols-2 border-b border-border bg-muted/40 p-1">
            {(["admin", "nurse"] as Portal[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => switchPortal(item)}
                className="rounded-xl py-3 text-sm font-semibold capitalize transition-all"
                style={{
                  backgroundColor: portal === item ? "#2563eb" : "transparent",
                  color: portal === item ? "#ffffff" : "#6b7a99",
                }}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 border-b border-border bg-primary/5 py-4 text-sm font-semibold text-primary">
            <LogIn size={15} />
            {portal === "admin" ? "Admin Sign In" : "Nurse Sign In"}
          </div>

          <div className="p-6">
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
                <AlertCircle size={14} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Username or Email
                </label>

                <input
                  type="text"
                  className={inputCls}
                  placeholder={
                    portal === "admin"
                      ? "admin username or email"
                      : "nurse username or email"
                  }
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  Password
                </label>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className={inputCls + " pr-11"}
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 mt-2 disabled:opacity-70"
              >
                <LogIn size={16} />
                {loading ? "Signing In..." : "Sign In"}
              </button>

            </form>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-5">
          Secure access for admins and nurses
        </p>
      </div>
    </div>
  );
}
