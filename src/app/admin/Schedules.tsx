import { useState } from "react";
import {
  Plus,
  Calendar,
  RefreshCw,
  Eye,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Users,
  AlertCircle,
  CheckCircle2,
  MoreVertical,
} from "lucide-react";

const NURSES = [
  { id: "NUR-001", name: "Sarah Johnson", avatar: "https://i.pravatar.cc/32?img=49" },
  { id: "NUR-002", name: "Mary Wilson", avatar: "https://i.pravatar.cc/32?img=47" },
  { id: "NUR-003", name: "John Taylor", avatar: "https://i.pravatar.cc/32?img=52" },
  { id: "NUR-004", name: "Linda Davis", avatar: "https://i.pravatar.cc/32?img=43" },
  { id: "NUR-005", name: "Emily Clark", avatar: "https://i.pravatar.cc/32?img=46" },
];

const ELDERS = [
  { id: "ELD-008", name: "Robert Brown", avatar: "https://i.pravatar.cc/32?img=12" },
  { id: "ELD-005", name: "Patricia Smith", avatar: "https://i.pravatar.cc/32?img=45" },
  { id: "ELD-006", name: "James Miller", avatar: "https://i.pravatar.cc/32?img=13" },
  { id: "ELD-007", name: "Michael Lee", avatar: "https://i.pravatar.cc/32?img=15" },
  { id: "ELD-001", name: "Elizabeth Johnson", avatar: "https://i.pravatar.cc/32?img=44" },
];

const PURPOSES = ["Vital Check", "Medication Check", "Routine Visit", "Emergency Follow-up", "Physiotherapy"];

const upcomingSchedules = [
  { caregiver: "Sarah Johnson", careId: "NUR-001", elderName: "Robert Brown", elderId: "ELD-008", date: "May 24, 2025", day: "Sat", time: "09:00 AM", purpose: "Vital Check", status: "Scheduled", recurring: "—" },
  { caregiver: "Mary Wilson", careId: "NUR-002", elderName: "Patricia Smith", elderId: "ELD-005", date: "May 24, 2025", day: "Sat", time: "11:00 AM", purpose: "Medication Check", status: "Scheduled", recurring: "Weekly" },
  { caregiver: "John Taylor", careId: "NUR-003", elderName: "James Miller", elderId: "ELD-006", date: "May 24, 2025", day: "Sat", time: "01:00 PM", purpose: "Vital Check", status: "Completed", recurring: "Weekly" },
  { caregiver: "Linda Davis", careId: "NUR-004", elderName: "Michael Lee", elderId: "ELD-007", date: "May 24, 2025", day: "Sat", time: "02:00 PM", purpose: "Emergency Follow-up", status: "Missed", recurring: "—" },
  { caregiver: "Emily Clark", careId: "NUR-005", elderName: "Elizabeth Johnson", elderId: "ELD-001", date: "May 24, 2025", day: "Sat", time: "10:00 AM", purpose: "Routine Visit", status: "Cancelled", recurring: "—" },
];

const calendarEvents: Record<string, { name: string; time: string; purpose: string; color: string }[]> = {
  Sun: [],
  Mon: [
    { name: "Robert Brown", time: "9:00 AM", purpose: "Vital Check", color: "#dbeafe" },
  ],
  Tue: [
    { name: "Patricia Smith", time: "8:00 AM", purpose: "Routine Visit", color: "#f3e8ff" },
    { name: "Mary Wilson", time: "10:00 AM", purpose: "Medication Check", color: "#d1fae5" },
    { name: "James Miller", time: "1:00 PM", purpose: "Vital Check", color: "#fef9c3" },
  ],
  Wed: [
    { name: "Linda Davis", time: "9:00 AM", purpose: "Vital Check", color: "#dbeafe" },
    { name: "Michael Lee", time: "11:00 AM", purpose: "Medication Check", color: "#d1fae5" },
  ],
  Thu: [
    { name: "Elizabeth Johnson", time: "10:00 AM", purpose: "Routine Visit", color: "#f3e8ff" },
  ],
  Fri: [
    { name: "John Taylor", time: "8:00 AM", purpose: "Emergency Follow-up", color: "#fee2e2" },
  ],
  Sat: [
    { name: "Sarah Johnson", time: "2:00 PM", purpose: "Medication Check", color: "#d1fae5" },
    { name: "Emily Clark", time: "10:00 AM", purpose: "Routine Visit", color: "#fef9c3" },
  ],
};

const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dates = ["18", "19", "20", "21", "22", "23", "24"];

const statusColors: Record<string, { bg: string; color: string }> = {
  Scheduled: { bg: "#dbeafe", color: "#2563eb" },
  Completed: { bg: "#dcfce7", color: "#16a34a" },
  Missed: { bg: "#fee2e2", color: "#dc2626" },
  Cancelled: { bg: "#f3f4f6", color: "#6b7280" },
};

export function Schedules() {
  const [nurse, setNurse] = useState("Sarah Johnson");
  const [elder, setElder] = useState("Robert Brown");
  const [purpose, setPurpose] = useState("Vital Check");
  const [visitDate, setVisitDate] = useState("May 24, 2025");
  const [visitTime, setVisitTime] = useState("09:00 AM");
  const [notes, setNotes] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [schedStatus, setSchedStatus] = useState("Scheduled");
  const [view, setView] = useState<"Week" | "Day">("Week");

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: "#f0f4f8" }}>
      {/* Breadcrumb */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5 text-xs" style={{ color: "#6b7a99" }}>
          <span>Dashboard</span><span>/</span>
          <span>Schedules</span><span>/</span>
          <span style={{ color: "#1a2b42", fontWeight: 500 }}>Set Up Schedules</span>
        </div>
        <button
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-white"
          style={{ backgroundColor: "#2563eb" }}
        >
          <Plus size={14} /> Create Schedule
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          { label: "Today's Visits", value: 24, sub: "↑ 5 from yesterday", icon: <CalendarDays size={20} />, iconBg: "#eff6ff", iconColor: "#818cf8" },
          { label: "Upcoming Visits", value: 46, sub: "↑ 8 this week", icon: <Calendar size={20} />, iconBg: "#ecfdf5", iconColor: "#22c55e" },
          { label: "Missed Visits", value: 3, sub: "↓ 2 this week", icon: <AlertCircle size={20} />, iconBg: "#fff7ed", iconColor: "#f97316" },
          { label: "Active Nurses", value: 32, sub: "↑ 2 this week", icon: <Users size={20} />, iconBg: "#eff6ff", iconColor: "#2563eb" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-4 border" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: s.iconBg, color: s.iconColor }}>
              {s.icon}
            </div>
            <div className="text-2xl mb-0.5" style={{ color: "#1a2b42", fontWeight: 700 }}>{s.value}</div>
            <div className="text-xs mb-0.5" style={{ color: "#1a2b42" }}>{s.label}</div>
            <div className="text-xs" style={{ color: s.label === "Missed Visits" ? "#ef4444" : "#22c55e" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-5">
        {/* Create Schedule Form */}
        <div className="w-56 flex-shrink-0 bg-white rounded-xl border p-4" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
          <h3 className="text-sm mb-4" style={{ color: "#1a2b42", fontWeight: 700 }}>Create Schedule</h3>

          <div className="space-y-3">
            <FormGroup label="Select Caregiver / Nurse">
              <AvatarSelect
                value={nurse}
                options={NURSES}
                onChange={setNurse}
              />
            </FormGroup>

            <FormGroup label="Select Elderly">
              <AvatarSelect
                value={elder}
                options={ELDERS}
                onChange={setElder}
              />
            </FormGroup>

            <div className="grid grid-cols-2 gap-2">
              <FormGroup label="Visit Date">
                <div className="flex items-center gap-1.5 px-2 py-1.5 border rounded-lg" style={{ borderColor: "rgba(0,0,0,0.12)" }}>
                  <Calendar size={12} style={{ color: "#6b7a99" }} />
                  <input
                    type="text"
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="text-xs outline-none bg-transparent w-full"
                    style={{ color: "#1a2b42" }}
                  />
                </div>
              </FormGroup>
              <FormGroup label="Visit Time">
                <select
                  value={visitTime}
                  onChange={(e) => setVisitTime(e.target.value)}
                  className="w-full px-2 py-1.5 border rounded-lg text-xs outline-none"
                  style={{ borderColor: "rgba(0,0,0,0.12)", color: "#1a2b42" }}
                >
                  {["08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </FormGroup>
            </div>

            <FormGroup label="Purpose">
              <div className="flex items-center gap-1.5 px-2 py-1.5 border rounded-lg" style={{ borderColor: "rgba(0,0,0,0.12)" }}>
                <span className="text-xs" style={{ color: "#22c55e" }}>♥</span>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="flex-1 text-xs outline-none bg-transparent"
                  style={{ color: "#1a2b42" }}
                >
                  {PURPOSES.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
            </FormGroup>

            <FormGroup label="Notes">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add visit notes or special instructions..."
                rows={3}
                className="w-full px-2 py-1.5 border rounded-lg text-xs outline-none resize-none"
                style={{ borderColor: "rgba(0,0,0,0.12)", color: "#1a2b42" }}
              />
              <div className="text-right text-xs" style={{ color: "#6b7a99" }}>{notes.length}/500</div>
            </FormGroup>

            <FormGroup label="Recurring Schedule">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRecurring(!recurring)}
                  className="relative w-9 h-5 rounded-full transition-colors"
                  style={{ backgroundColor: recurring ? "#2563eb" : "#d1d5db" }}
                >
                  <span
                    className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
                    style={{ left: recurring ? "18px" : "2px" }}
                  />
                </button>
                <span className="text-xs" style={{ color: "#6b7a99" }}>Set this visit to repeat</span>
              </div>
            </FormGroup>

            <FormGroup label="Schedule Status">
              <div
                className="flex items-center justify-between px-2 py-1.5 border rounded-lg"
                style={{ borderColor: "rgba(37,99,235,0.3)", backgroundColor: "#eff6ff" }}
              >
                <span className="text-xs" style={{ color: "#2563eb", fontWeight: 500 }}>Scheduled</span>
                <ChevronRight size={12} style={{ color: "#2563eb" }} />
              </div>
            </FormGroup>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              className="flex-1 py-2 rounded-lg border text-xs transition-colors hover:bg-gray-50"
              style={{ borderColor: "rgba(0,0,0,0.12)", color: "#6b7a99" }}
            >
              Reset
            </button>
            <button
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs text-white"
              style={{ backgroundColor: "#2563eb" }}
            >
              <Calendar size={12} /> Save Schedule
            </button>
          </div>
        </div>

        {/* Right: Calendar + Table */}
        <div className="flex-1 space-y-4">
          {/* Weekly Calendar */}
          <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
              <h3 className="text-sm" style={{ color: "#1a2b42", fontWeight: 700 }}>Weekly Schedule Overview</h3>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <button className="w-6 h-6 rounded flex items-center justify-center hover:bg-gray-100">
                    <ChevronLeft size={13} style={{ color: "#6b7a99" }} />
                  </button>
                  <button
                    className="px-2 py-0.5 rounded text-xs border"
                    style={{ borderColor: "rgba(0,0,0,0.1)", color: "#6b7a99" }}
                  >
                    Today
                  </button>
                  <button className="w-6 h-6 rounded flex items-center justify-center hover:bg-gray-100">
                    <ChevronRight size={13} style={{ color: "#6b7a99" }} />
                  </button>
                </div>
                <span className="text-xs" style={{ color: "#1a2b42", fontWeight: 500 }}>
                  May 18 – May 24, 2025
                </span>
                <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: "rgba(0,0,0,0.1)" }}>
                  {(["Week", "Day"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setView(v)}
                      className="px-3 py-1 text-xs transition-colors"
                      style={{
                        backgroundColor: view === v ? "#2563eb" : "transparent",
                        color: view === v ? "#fff" : "#6b7a99",
                      }}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="overflow-x-auto">
              <div className="grid" style={{ gridTemplateColumns: "48px repeat(7, 1fr)", minWidth: "600px" }}>
                {/* Header row */}
                <div className="border-b border-r py-2" style={{ borderColor: "rgba(0,0,0,0.06)" }} />
                {days.map((d, i) => (
                  <div
                    key={d}
                    className="border-b border-r py-2 text-center"
                    style={{ borderColor: "rgba(0,0,0,0.06)" }}
                  >
                    <div className="text-xs" style={{ color: "#6b7a99" }}>{d}</div>
                    <div
                      className="text-sm mx-auto w-7 h-7 flex items-center justify-center rounded-full mt-0.5"
                      style={{
                        backgroundColor: dates[i] === "21" ? "#2563eb" : "transparent",
                        color: dates[i] === "21" ? "#fff" : "#1a2b42",
                        fontWeight: 600,
                      }}
                    >
                      {dates[i]}
                    </div>
                  </div>
                ))}

                {/* Time slots */}
                {["8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM"].map((time) => (
                  <>
                    <div
                      key={time + "-label"}
                      className="border-b border-r px-1 py-2 text-right"
                      style={{ borderColor: "rgba(0,0,0,0.05)" }}
                    >
                      <span className="text-xs" style={{ color: "#9ca3af" }}>{time}</span>
                    </div>
                    {days.map((d) => {
                      const match = calendarEvents[d]?.find((e) => e.time.startsWith(time.replace(" AM", "").replace(" PM", "")));
                      return (
                        <div
                          key={d + time}
                          className="border-b border-r p-1 min-h-[36px]"
                          style={{ borderColor: "rgba(0,0,0,0.05)" }}
                        >
                          {match && (
                            <div
                              className="rounded-md px-1.5 py-1 text-xs cursor-pointer hover:opacity-80 transition-opacity"
                              style={{ backgroundColor: match.color }}
                            >
                              <div className="truncate" style={{ color: "#1a2b42", fontWeight: 600, fontSize: "10px" }}>
                                {match.name}
                              </div>
                              <div style={{ color: "#6b7a99", fontSize: "10px" }}>{match.time}</div>
                              <div style={{ color: "#6b7a99", fontSize: "10px" }}>{match.purpose}</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                ))}
              </div>
            </div>
          </div>

          {/* Upcoming Schedules Table */}
          <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
              <h3 className="text-sm" style={{ color: "#1a2b42", fontWeight: 700 }}>Upcoming Schedules</h3>
              <button className="text-xs" style={{ color: "#2563eb" }}>View all</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc" }}>
                    {["Caregiver", "Elderly", "Date", "Time", "Purpose", "Status", "Recurring", "Action"].map((c) => (
                      <th key={c} className="px-3 py-2.5 text-left text-xs" style={{ color: "#6b7a99", fontWeight: 600 }}>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {upcomingSchedules.map((row, i) => (
                    <tr key={i} className="border-t" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <img src={NURSES.find((n) => n.name === row.caregiver)?.avatar} className="w-6 h-6 rounded-full" alt="" />
                          <div>
                            <div className="text-xs" style={{ color: "#1a2b42", fontWeight: 500 }}>{row.caregiver}</div>
                            <div className="text-xs" style={{ color: "#6b7a99" }}>{row.careId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <img src={ELDERS.find((e) => e.name === row.elderName)?.avatar} className="w-6 h-6 rounded-full" alt="" />
                          <div>
                            <div className="text-xs" style={{ color: "#1a2b42", fontWeight: 500 }}>{row.elderName}</div>
                            <div className="text-xs" style={{ color: "#6b7a99" }}>{row.elderId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-xs" style={{ color: "#1a2b42" }}>{row.date}</div>
                        <div className="text-xs" style={{ color: "#6b7a99" }}>{row.day}</div>
                      </td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: "#1a2b42" }}>{row.time}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1 text-xs">
                          <span style={{ color: "#22c55e" }}>♥</span>
                          <span style={{ color: "#1a2b42" }}>{row.purpose}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: statusColors[row.status]?.bg,
                            color: statusColors[row.status]?.color,
                          }}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: "#6b7a99" }}>{row.recurring}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          <button className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: "#eff6ff" }}>
                            <Eye size={12} style={{ color: "#2563eb" }} />
                          </button>
                          <button className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: "#f8fafc" }}>
                            <MoreVertical size={12} style={{ color: "#6b7a99" }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 border-t text-xs" style={{ borderColor: "rgba(0,0,0,0.06)", color: "#6b7a99" }}>
              <CheckCircle2 size={12} className="inline mr-1.5" style={{ color: "#22c55e" }} />
              All data is secure and HIPAA compliant
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs block mb-1" style={{ color: "#6b7a99" }}>{label}</label>
      {children}
    </div>
  );
}

function AvatarSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { id: string; name: string; avatar: string }[];
  onChange: (v: string) => void;
}) {
  const selected = options.find((o) => o.name === value) || options[0];
  return (
    <div className="relative">
      <div
        className="flex items-center gap-2 px-2 py-1.5 border rounded-lg cursor-pointer"
        style={{ borderColor: "rgba(0,0,0,0.12)" }}
      >
        <img src={selected.avatar} className="w-5 h-5 rounded-full" alt="" />
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 text-xs outline-none bg-transparent"
          style={{ color: "#1a2b42" }}
        >
          {options.map((o) => (
            <option key={o.id} value={o.name}>{o.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
