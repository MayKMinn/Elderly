import { Users, UserCheck, CalendarCheck, Pill, FileText, ArrowRight } from "lucide-react";

type Page = "dashboard" | "manage-profiles" | "schedules" | "medications" | "reports" | "settings";

interface DashboardProps {
  onNavigate: (page: Page) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const stats = [
    {
      label: "Total Elderly",
      value: 128,
      change: "+8 this month",
      icon: <Users size={20} />,
      iconBg: "#fff7ed",
      iconColor: "#f97316",
    },
    {
      label: "Total Nurses / Caregivers",
      value: 32,
      change: "+2 this month",
      icon: <UserCheck size={20} />,
      iconBg: "#f0fdf4",
      iconColor: "#22c55e",
    },
    {
      label: "Today's Visits",
      value: 24,
      change: "+3 from yesterday",
      icon: <CalendarCheck size={20} />,
      iconBg: "#eff6ff",
      iconColor: "#3b82f6",
    },
    {
      label: "Pending Medications",
      value: 11,
      change: "+2 from yesterday",
      icon: <Pill size={20} />,
      iconBg: "#fdf4ff",
      iconColor: "#a855f7",
    },
    {
      label: "Reports Generated",
      value: 18,
      change: "+5 this week",
      icon: <FileText size={20} />,
      iconBg: "#ecfeff",
      iconColor: "#06b6d4",
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-xl p-4 border"
            style={{ borderColor: "rgba(0,0,0,0.06)" }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
              style={{ backgroundColor: s.iconBg, color: s.iconColor }}
            >
              {s.icon}
            </div>
            <div className="text-2xl mb-0.5" style={{ color: "#1a2b42", fontWeight: 700 }}>
              {s.value}
            </div>
            <div className="text-xs mb-1" style={{ color: "#1a2b42", fontWeight: 500 }}>
              {s.label}
            </div>
            <div className="text-xs" style={{ color: "#22c55e" }}>
              {s.change}
            </div>
          </div>
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
