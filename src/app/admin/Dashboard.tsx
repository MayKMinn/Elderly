import { useEffect, useState } from "react";
import { Users, UserCheck, Activity, UserPlus, CalendarCheck, Pill, FileText, ArrowRight } from "lucide-react";
import { getProfiles } from "../api/profiles";
import type { ElderlyProfile, NurseProfile } from "./data";

type Page = "dashboard" | "manage-profiles" | "schedules" | "medications" | "reports" | "login-history" | "settings";
type ProfileTab = "elderly" | "nurse";

interface DashboardProps {
  onNavigate: (page: Page) => void;
  onProfileTabChange: (tab: ProfileTab) => void;
}

function parseDashboardDate(value: string) {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed;
}

function countThisWeek<T>(items: T[], getDate: (item: T) => string) {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(today.getDate() - today.getDay());

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  return items.filter((item) => {
    const date = parseDashboardDate(getDate(item));
    return date ? date >= startOfWeek && date < endOfWeek : false;
  }).length;
}

export function Dashboard({ onNavigate, onProfileTabChange }: DashboardProps) {
  const [elderlyList, setElderlyList] = useState<ElderlyProfile[]>([]);
  const [nurseList, setNurseList] = useState<NurseProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    getProfiles()
      .then((profiles) => {
        if (ignore) return;
        setElderlyList(profiles.elderly);
        setNurseList(profiles.nurses);
        setError(null);
      })
      .catch((err) => {
        if (ignore) return;
        setElderlyList([]);
        setNurseList([]);
        setError("Could not load dashboard data.");
        console.error(err);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const activeElderly = elderlyList.filter((profile) => profile.status === "Active").length;
  const activeNurses = nurseList.filter((profile) => profile.status === "Active").length;
  const newRegistrations =
    countThisWeek(elderlyList, (profile) => profile.admissionDate) +
    countThisWeek(nurseList, (profile) => profile.hireDate);
  const openProfiles = (tab: ProfileTab) => {
    onProfileTabChange(tab);
    onNavigate("manage-profiles");
  };

  const stats = [
    {
      label: "Total Elderly",
      value: elderlyList.length,
      change: "All elderly profiles",
      icon: <Users size={20} />,
      iconBg: "#fff7ed",
      iconColor: "#f97316",
      onClick: () => openProfiles("elderly"),
    },
    {
      label: "Total Nurses / Caregivers",
      value: nurseList.length,
      change: "All nurse profiles",
      icon: <UserCheck size={20} />,
      iconBg: "#f0fdf4",
      iconColor: "#22c55e",
      onClick: () => openProfiles("nurse"),
    },
    {
      label: "Active Elderly",
      value: activeElderly,
      change: "Active elderly profiles",
      icon: <Activity size={20} />,
      iconBg: "#eff6ff",
      iconColor: "#3b82f6",
      onClick: () => openProfiles("elderly"),
    },
    {
      label: "Active Nurses",
      value: activeNurses,
      change: "Active nurse profiles",
      icon: <Activity size={20} />,
      iconBg: "#fdf4ff",
      iconColor: "#a855f7",
      onClick: () => openProfiles("nurse"),
    },
    {
      label: "New Registrations",
      value: newRegistrations,
      change: "This week",
      icon: <UserPlus size={20} />,
      iconBg: "#ecfeff",
      iconColor: "#06b6d4",
      onClick: () => openProfiles("elderly"),
    },
  ];

  const quickActions = [
    {
      title: "Manage Profiles",
      desc: "Add, edit, and manage elderly and caregiver profiles.",
      icon: <Users size={22} />,
      iconBg: "#eff6ff",
      iconColor: "#3b82f6",
      page: "manage-profiles" as Page,
    },
    {
      title: "Set Up Schedules",
      desc: "Create and manage visit schedules and routines.",
      icon: <CalendarCheck size={22} />,
      iconBg: "#f0fdf4",
      iconColor: "#22c55e",
      page: "schedules" as Page,
    },
    {
      title: "Assign Medications",
      desc: "Assign and track medications to elderly individuals.",
      icon: <Pill size={22} />,
      iconBg: "#fff7ed",
      iconColor: "#f97316",
      page: "medications" as Page,
    },
    {
      title: "Generate Reports",
      desc: "View and export care reports and analytics.",
      icon: <FileText size={22} />,
      iconBg: "#fdf4ff",
      iconColor: "#a855f7",
      page: "reports" as Page,
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Stats Row */}
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {stats.map((s) => (
          <button
            type="button"
            key={s.label}
            onClick={s.onClick}
            className="bg-white rounded-xl p-4 border text-left transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-200"
            style={{ borderColor: "rgba(0,0,0,0.06)" }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
              style={{ backgroundColor: s.iconBg, color: s.iconColor }}
            >
              {s.icon}
            </div>
            <div className="text-2xl mb-0.5" style={{ color: "#1a2b42", fontWeight: 700 }}>
              {loading ? "..." : s.value}
            </div>
            <div className="text-xs mb-1" style={{ color: "#1a2b42", fontWeight: 500 }}>
              {s.label}
            </div>
            <div className="text-xs" style={{ color: "#22c55e" }}>
              {s.change}
            </div>
          </button>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-4">
        <h2 className="text-base mb-4" style={{ color: "#1a2b42", fontWeight: 700 }}>
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((qa) => (
            <button
              key={qa.title}
              onClick={() => onNavigate(qa.page)}
              className="bg-white rounded-xl p-5 border text-left group transition-all hover:shadow-md"
              style={{ borderColor: "rgba(0,0,0,0.06)" }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-3"
                style={{ backgroundColor: qa.iconBg, color: qa.iconColor }}
              >
                {qa.icon}
              </div>
              <div className="text-sm mb-1" style={{ color: "#1a2b42", fontWeight: 600 }}>
                {qa.title}
              </div>
              <p className="text-xs mb-3" style={{ color: "#6b7a99" }}>
                {qa.desc}
              </p>
              <div
                className="flex items-center gap-1 text-xs transition-colors"
                style={{ color: "#2563eb" }}
              >
                <span>Go to {qa.title}</span>
                <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
