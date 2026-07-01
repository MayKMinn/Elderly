import { useState } from "react";
import type { FormEvent } from "react";
import { AlertCircle, Eye, EyeOff, Heart, LogIn } from "lucide-react";
import { AdminPortal } from "./admin/AdminPortal";
import { NursePortal } from "./nurse/NursePortal";

type Portal = "admin" | "nurse";

type Session =
  | { role: "admin"; name: string }
  | { role: "nurse"; name: string }
  | null;

const demoNurses = [
  { name: "Patricia Chen", email: "patricia@eldercare.com", password: "nurse123" },
  { name: "Thomas Wright", email: "thomas@eldercare.com", password: "nurse123" },
];

export default function App() {
  const [session, setSession] = useState<Session>(null);

  if (!session) {
    return <SignInScreen onSignIn={setSession} />;
  }

  if (session.role === "admin") {
    return <AdminPortal onSignOut={() => setSession(null)} />;
  }

  return <NursePortal nurseName={session.name} onSignOut={() => setSession(null)} />;
}

function SignInScreen({ onSignIn }: { onSignIn: (session: Exclude<Session, null>) => void }) {
  const [portal, setPortal] = useState<Portal>("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const inputCls =
    "w-full px-4 py-3 text-sm bg-input-background border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-muted-foreground";

  const demoText =
    portal === "admin"
      ? { email: "admin@eldercare.com", password: "admin123" }
      : { email: "patricia@eldercare.com", password: "nurse123" };

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (portal === "admin") {
      if (email.toLowerCase() === "admin@eldercare.com" && password === "admin123") {
        onSignIn({ role: "admin", name: "Admin User" });
        return;
      }

      setError("Incorrect admin email or password.");
      return;
    }

    const nurse = demoNurses.find(
      (item) => item.email.toLowerCase() === email.toLowerCase() && item.password === password
    );

    if (!nurse) {
      setError("Incorrect nurse email or password.");
      return;
    }

    onSignIn({ role: "nurse", name: nurse.name });
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
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>ElderCare</h1>
          <p className="text-muted-foreground mt-1 text-sm">Care Management System</p>
        </div>

        <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
          <div className="grid grid-cols-2 border-b border-border bg-muted/40 p-1">
            {(["admin", "nurse"] as Portal[]).map((item) => (
              <button
                key={item}
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
                <AlertCircle size={14} className="flex-shrink-0" />{error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Email Address</label>
                <input
                  type="email"
                  className={inputCls}
                  placeholder={portal === "admin" ? "admin@eldercare.com" : "you@eldercare.com"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Password</label>
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
              <button type="submit" className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 mt-2">
                <LogIn size={16} /> Sign In
              </button>
              <p className="text-xs text-center text-muted-foreground pt-1">
                Demo: <span className="font-mono text-foreground">{demoText.email}</span> / <span className="font-mono text-foreground">{demoText.password}</span>
              </p>
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
