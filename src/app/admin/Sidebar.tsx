import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Pill,
  BarChart3,
  Settings,
  LogOut,
  Clock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Heart,
} from "lucide-react";

type Page =
  | "dashboard"
  | "manage-profiles"
  | "schedules"
  | "medications"
  | "reports"
  | "login-history"
  | "settings";

type ProfileTab = "elderly" | "nurse";

interface SidebarProps {
  currentPage: Page;
  profileTab: ProfileTab;
  onNavigate: (page: Page) => void;
  onProfileTabChange: (tab: ProfileTab) => void;
  signedInAt?: string;
  onLogout?: () => void;
}

function formatSignedInAt(value?: string) {
  if (!value) return "This session";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "This session";

  return parsed.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function Sidebar({
  currentPage,
  profileTab,
  onNavigate,
  onProfileTabChange,
  signedInAt,
  onLogout,
}: SidebarProps) {
  const [profilesOpen, setProfilesOpen] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={`flex flex-col h-full flex-shrink-0 border-r transition-all duration-200 ${
        collapsed ? "w-20" : "w-56"
      }`}
      style={{ backgroundColor: "#ffffff", borderColor: "rgba(0,0,0,0.08)" }}
    >
      {/* Logo */}
      <div
        className={`flex items-center border-b ${collapsed ? "justify-center px-3 py-5" : "gap-2.5 px-5 py-5"}`}
        style={{ borderColor: "rgba(0,0,0,0.07)" }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "#eff6ff" }}
        >
          <Heart size={18} style={{ color: "#2563eb" }} />
        </div>
        {!collapsed && (
          <div>
            <div className="text-sm leading-tight" style={{ color: "#1a2b42", fontWeight: 700 }}>
              ElderEase Admin
            </div>
            <div className="text-xs" style={{ color: "#6b7a99" }}>
              Elderly Care Management
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        <button
          onClick={() => setCollapsed((value) => !value)}
          className="w-full flex items-center justify-center rounded-xl text-sm transition-all mb-2 px-2 py-2.5"
          style={{ color: "#6b7a99", backgroundColor: "#f8fafc" }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        <NavItem
          icon={<LayoutDashboard size={17} />}
          label="Dashboard"
          active={currentPage === "dashboard"}
          onClick={() => onNavigate("dashboard")}
          collapsed={collapsed}
        />

        {/* Manage Profiles expandable */}
        <div>
          <button
            onClick={() => {
              if (collapsed) {
                setCollapsed(false);
                setProfilesOpen(true);
              } else {
                setProfilesOpen(!profilesOpen);
              }

              onNavigate("manage-profiles");
            }}
            className={`w-full flex items-center rounded-xl text-sm transition-all ${
              collapsed ? "justify-center px-2 py-2.5" : "justify-between gap-2.5 px-3 py-2.5"
            }`}
            style={{
              color: currentPage === "manage-profiles" ? "#ffffff" : "#6b7a99",
              backgroundColor: currentPage === "manage-profiles" ? "#2563eb" : "transparent",
              fontWeight: currentPage === "manage-profiles" ? 600 : 400,
            }}
            onMouseEnter={(e) => {
              if (currentPage !== "manage-profiles")
                e.currentTarget.style.backgroundColor = "#f0f5ff";
            }}
            onMouseLeave={(e) => {
              if (currentPage !== "manage-profiles")
                e.currentTarget.style.backgroundColor = "transparent";
            }}
            title="Manage Profiles"
          >
            <div className={`flex items-center ${collapsed ? "" : "gap-2.5"}`}>
              <Users size={17} />
              {!collapsed && <span>Manage Profiles</span>}
            </div>
            {!collapsed && (profilesOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />)}
          </button>

          {!collapsed && profilesOpen && currentPage === "manage-profiles" && (
            <div className="ml-3 mt-0.5 space-y-0.5 pl-4 border-l" style={{ borderColor: "rgba(37,99,235,0.2)" }}>
              <SubNavItem
                label="Elderly"
                active={profileTab === "elderly"}
                onClick={() => onProfileTabChange("elderly")}
              />
              <SubNavItem
                label="Nurse / Caregiver"
                active={profileTab === "nurse"}
                onClick={() => onProfileTabChange("nurse")}
              />
            </div>
          )}
        </div>

        <NavItem
          icon={<Calendar size={17} />}
          label="Schedules"
          active={currentPage === "schedules"}
          onClick={() => onNavigate("schedules")}
          collapsed={collapsed}
        />
        <NavItem
          icon={<Pill size={17} />}
          label="Medications"
          active={currentPage === "medications"}
          onClick={() => onNavigate("medications")}
          collapsed={collapsed}
        />
        <NavItem
          icon={<BarChart3 size={17} />}
          label="Reports"
          active={currentPage === "reports"}
          onClick={() => onNavigate("reports")}
          collapsed={collapsed}
        />
        <NavItem
          icon={<Clock size={17} />}
          label="Login History"
          active={currentPage === "login-history"}
          onClick={() => onNavigate("login-history")}
          collapsed={collapsed}
        />
       
      </nav>

      {/* Logout */}
      <div className="px-3 pb-4 border-t pt-3" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
        {!collapsed && (
          <div className="mb-2 rounded-xl px-3 py-2" style={{ backgroundColor: "#f8fafc" }}>
            <div className="text-xs" style={{ color: "#6b7a99" }}>
              Signed in
            </div>
            <div className="text-xs" style={{ color: "#1a2b42", fontWeight: 600 }}>
              {formatSignedInAt(signedInAt)}
            </div>
          </div>
        )}
        <button
          onClick={onLogout}
          className={`w-full flex items-center rounded-xl text-sm transition-all ${
            collapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-3 py-2.5"
          }`}
          style={{ color: "#6b7a99" }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f8fafc"; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
          title="Logout"
        >
          <LogOut size={17} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}

function NavItem({
  icon,
  label,
  active,
  onClick,
  collapsed,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  collapsed: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center rounded-xl text-sm transition-all ${
        collapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-3 py-2.5"
      }`}
      style={{
        color: active ? "#ffffff" : "#6b7a99",
        backgroundColor: active ? "#2563eb" : "transparent",
        fontWeight: active ? 600 : 400,
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.backgroundColor = "#f0f5ff";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.backgroundColor = "transparent";
      }}
      title={label}
    >
      {icon}
      {!collapsed && <span>{label}</span>}
    </button>
  );
}

function SubNavItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left text-xs px-2 py-1.5 rounded-lg transition-all"
      style={{
        color: active ? "#2563eb" : "#6b7a99",
        fontWeight: active ? 600 : 400,
        backgroundColor: active ? "#eff6ff" : "transparent",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.color = "#2563eb";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.color = "#6b7a99";
      }}
    >
      {label}
    </button>
  );
}
