import { Search, ChevronDown } from "lucide-react";

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export function TopBar({ title, subtitle }: TopBarProps) {
  return (
    <div
      className="flex items-center justify-between px-6 py-3 border-b bg-white flex-shrink-0"
      style={{ borderColor: "rgba(0,0,0,0.07)" }}
    >
      <div>
        <h1 className="text-lg" style={{ color: "#1a2b42", fontWeight: 700 }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs" style={{ color: "#6b7a99" }}>
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl border"
          style={{
            backgroundColor: "#f5f7fa",
            borderColor: "rgba(0,0,0,0.08)",
            minWidth: "260px",
          }}
        >
          <Search size={14} style={{ color: "#9ca3af" }} />
          <input
            type="text"
            placeholder="Search elderly, nurse, schedules, medications..."
            className="bg-transparent outline-none text-xs w-full"
            style={{ color: "#1a2b42" }}
          />
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-2 cursor-pointer pl-1">
          <img
            src="https://i.pravatar.cc/36?img=33"
            alt="Admin User"
            className="w-9 h-9 rounded-full object-cover border-2"
            style={{ borderColor: "#dbeafe" }}
          />
          <div className="hidden sm:block">
            <div className="text-xs" style={{ color: "#1a2b42", fontWeight: 600 }}>
              Admin User
            </div>
            <div className="text-xs" style={{ color: "#6b7a99" }}>
              Administrator
            </div>
          </div>
          <ChevronDown size={12} style={{ color: "#9ca3af" }} />
        </div>
      </div>
    </div>
  );
}
