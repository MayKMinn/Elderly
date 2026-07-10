import { useState } from "react";
import {
  Plus,
  Download,
  FileText,
  ShieldCheck,
  CalendarCheck,
  AlertTriangle,
  Eye,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  ArrowDown,
  TrendingUp,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts";
export { Reports } from "./ReportsSummary";

const reports = [
  { name: "Daily Visit Summary", caregiver: "Sarah Johnson", careAvatar: "https://i.pravatar.cc/32?img=49", elder: "Mary Wilson", elderAvatar: "https://i.pravatar.cc/32?img=47", start: "May 24, 2025\n09:00 AM", end: "May 24, 2025\n10:30 AM", compliance: 100, status: "Completed" },
  { name: "Medication Compliance", caregiver: "Patricia Smith", careAvatar: "https://i.pravatar.cc/32?img=45", elder: "Robert Brown", elderAvatar: "https://i.pravatar.cc/32?img=12", start: "May 23, 2025\n08:00 AM", end: "May 23, 2025\n08:15 AM", compliance: 83, status: "Completed" },
  { name: "Weekly Care Report", caregiver: "Linda Davis", careAvatar: "https://i.pravatar.cc/32?img=43", elder: "James Miller", elderAvatar: "https://i.pravatar.cc/32?img=13", start: "May 19, 2025\n12:00 PM", end: "May 25, 2025\n11:59 PM", compliance: 91, status: "Completed" },
  { name: "Vital Signs Summary", caregiver: "Michael Lee", careAvatar: "https://i.pravatar.cc/32?img=14", elder: "Sarah Johnson", elderAvatar: "https://i.pravatar.cc/32?img=49", start: "May 22, 2025\n07:00 AM", end: "May 22, 2025\n07:15 AM", compliance: NaN, status: "Completed" },
  { name: "Medication Adherence Report", caregiver: "John Taylor", careAvatar: "https://i.pravatar.cc/32?img=15", elder: "Emily Clark", elderAvatar: "https://i.pravatar.cc/32?img=46", start: "May 21, 2025\n06:00 PM", end: "May 21, 2025\n06:10 PM", compliance: 75, status: "Completed" },
  { name: "Monthly Overview", caregiver: "Elizabeth Johnson", careAvatar: "https://i.pravatar.cc/32?img=44", elder: "Multiple", elderAvatar: "https://i.pravatar.cc/32?img=52", start: "May 1, 2025\n12:00 AM", end: "May 31, 2025\n11:59 PM", compliance: 89, status: "Completed" },
  { name: "Incident Report", caregiver: "James White", careAvatar: "https://i.pravatar.cc/32?img=11", elder: "Robert Brown", elderAvatar: "https://i.pravatar.cc/32?img=12", start: "May 20, 2025\n03:00 PM", end: "May 20, 2025\n03:00 PM", compliance: NaN, status: "Under Review" },
  { name: "Missed Medication Alert", caregiver: "Patricia Smith", careAvatar: "https://i.pravatar.cc/32?img=45", elder: "Mary Wilson", elderAvatar: "https://i.pravatar.cc/32?img=47", start: "May 19, 2025\n09:45 AM", end: "May 19, 2025\n09:45 AM", compliance: 0, status: "Critical" },
];

const statusStyles: Record<string, { bg: string; color: string }> = {
  Completed: { bg: "#dcfce7", color: "#16a34a" },
  "Under Review": { bg: "#fef3c7", color: "#d97706" },
  Critical: { bg: "#fee2e2", color: "#dc2626" },
};

const trendData = [
  { date: "May 18", v: 85 }, { date: "May 19", v: 88 }, { date: "May 20", v: 82 },
  { date: "May 21", v: 90 }, { date: "May 22", v: 95 }, { date: "May 23", v: 92 }, { date: "May 24", v: 100 },
];

function LegacyReports() {
  const [selectedReport, setSelectedReport] = useState(reports[0]);

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: "#f0f4f8" }}>
      {/* Breadcrumb + Actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5 text-xs" style={{ color: "#6b7a99" }}>
          <span>Dashboard</span><span>/</span>
          <span>Reports</span><span>/</span>
          <span style={{ color: "#1a2b42", fontWeight: 500 }}>Generate Reports</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-white" style={{ backgroundColor: "#2563eb" }}>
            <Plus size={14} /> Generate New Report
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border" style={{ borderColor: "rgba(0,0,0,0.1)", color: "#6b7a99" }}>
            <FileText size={14} /> Export PDF
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border" style={{ borderColor: "rgba(0,0,0,0.1)", color: "#6b7a99" }}>
            <ArrowDown size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          { label: "Total Reports", value: 18, sub: "↑ 4 this week", icon: <FileText size={20} />, iconBg: "#eff6ff", iconColor: "#818cf8" },
          { label: "Medication Compliance", value: "92%", sub: "↑ 6% vs last week", icon: <ShieldCheck size={20} />, iconBg: "#ecfdf5", iconColor: "#22c55e" },
          { label: "Completed Visits", value: 128, sub: "↑ 12 this week", icon: <CalendarCheck size={20} />, iconBg: "#f3e8ff", iconColor: "#a855f7" },
          { label: "Critical Alerts", value: 7, sub: "↓ 2 vs last week", icon: <AlertTriangle size={20} />, iconBg: "#fff7ed", iconColor: "#f97316" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-4 border" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: s.iconBg, color: s.iconColor }}>
              {s.icon}
            </div>
            <div className="text-2xl mb-0.5" style={{ color: "#1a2b42", fontWeight: 700 }}>{s.value}</div>
            <div className="text-xs mb-0.5" style={{ color: "#1a2b42" }}>{s.label}</div>
            <div className="text-xs" style={{ color: s.label === "Critical Alerts" ? "#ef4444" : "#22c55e" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-3 mb-4 flex items-center gap-3 flex-wrap" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
        {[
          { label: "Date Range", val: "May 17, 2025 – May 24, 2025" },
          { label: "Caregiver / Nurse", val: "All Caregivers" },
          { label: "Elderly", val: "All Elderly" },
          { label: "Report Type", val: "All Types" },
          { label: "Status", val: "All Statuses" },
        ].map((f) => (
          <div key={f.label}>
            <div className="text-xs mb-0.5" style={{ color: "#6b7a99" }}>{f.label}</div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs" style={{ borderColor: "rgba(0,0,0,0.1)", color: "#1a2b42" }}>
              {f.val} <ChevronDown size={11} />
            </button>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button className="px-3 py-1.5 rounded-lg border text-xs hover:bg-gray-50" style={{ borderColor: "rgba(0,0,0,0.1)", color: "#6b7a99" }}>
            Clear Filters
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-white" style={{ backgroundColor: "#2563eb" }}>
            Apply Filters
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Reports Table */}
        <div className="flex-1 bg-white rounded-xl border overflow-hidden" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
            <h3 className="text-sm" style={{ color: "#1a2b42", fontWeight: 700 }}>Reports ({reports.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: "#f8fafc" }}>
                  {["Report Name", "Caregiver", "Elderly", "Effective Date", "End Date", "Med Compliance", "Status", "Actions"].map((c) => (
                    <th key={c} className="px-3 py-2.5 text-left text-xs" style={{ color: "#6b7a99", fontWeight: 600, whiteSpace: "nowrap" }}>
                      {c}{c === "Effective Date" && <span style={{ color: "#2563eb" }}> ↑</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reports.map((row, i) => (
                  <tr
                    key={i}
                    onClick={() => setSelectedReport(row)}
                    className="border-t cursor-pointer transition-colors"
                    style={{ borderColor: "rgba(0,0,0,0.05)", backgroundColor: selectedReport.name === row.name ? "#eff6ff" : "transparent" }}
                    onMouseEnter={(e) => { if (selectedReport.name !== row.name) e.currentTarget.style.backgroundColor = "#f8fafc"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = selectedReport.name === row.name ? "#eff6ff" : "transparent"; }}
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#eff6ff" }}>
                          <FileText size={11} style={{ color: row.status === "Critical" ? "#ef4444" : "#2563eb" }} />
                        </div>
                        <span className="text-xs" style={{ color: "#1a2b42", fontWeight: 500 }}>{row.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <img src={row.careAvatar} className="w-5 h-5 rounded-full" alt="" />
                        <span className="text-xs" style={{ color: "#1a2b42" }}>{row.caregiver}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <img src={row.elderAvatar} className="w-5 h-5 rounded-full" alt="" />
                        <span className="text-xs" style={{ color: "#1a2b42" }}>{row.elder}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: "#1a2b42", whiteSpace: "pre-line" }}>{row.start}</td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: "#1a2b42", whiteSpace: "pre-line" }}>{row.end}</td>
                    <td className="px-3 py-2.5">
                      {isNaN(row.compliance) ? (
                        <span className="text-xs" style={{ color: "#6b7a99" }}>N/A</span>
                      ) : (
                        <div>
                          <div className="text-xs mb-1" style={{ color: row.compliance >= 80 ? "#16a34a" : row.compliance >= 50 ? "#d97706" : "#dc2626" }}>
                            {row.compliance}%
                          </div>
                          <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${row.compliance}%`,
                                backgroundColor: row.compliance >= 80 ? "#22c55e" : row.compliance >= 50 ? "#f59e0b" : "#ef4444",
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: statusStyles[row.status]?.bg, color: statusStyles[row.status]?.color }}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: "#eff6ff" }}>
                          <Eye size={12} style={{ color: "#2563eb" }} />
                        </button>
                        <button className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: "#f8fafc" }}>
                          <Download size={12} style={{ color: "#6b7a99" }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t text-xs" style={{ borderColor: "rgba(0,0,0,0.06)", color: "#6b7a99" }}>
            <span>Showing 1 to 8 of 18 reports</span>
            <div className="flex items-center gap-1">
              {[<ChevronLeft size={13} />, 1, 2, 3, <ChevronRight size={13} />].map((item, i) => (
                <button key={i} className="w-7 h-7 rounded flex items-center justify-center text-xs" style={{ backgroundColor: item === 1 ? "#2563eb" : "transparent", color: item === 1 ? "#fff" : "#6b7a99" }}>
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Detail Panel */}
        <div className="w-72 flex-shrink-0 bg-white rounded-xl border overflow-hidden" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
            <div>
              <h3 className="text-xs" style={{ color: "#1a2b42", fontWeight: 700 }}>Daily Visit Summary</h3>
              <p className="text-xs mt-0.5" style={{ color: "#6b7a99" }}>May 24, 2025 · 09:00 AM – 10:30 AM</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "#dcfce7", color: "#16a34a" }}>Completed</span>
              <button onClick={() => {}}>
                <X size={14} style={{ color: "#6b7a99" }} />
              </button>
            </div>
          </div>

          <div className="p-4 overflow-y-auto max-h-[600px] space-y-4">
            {/* Caregiver + Elderly */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: "#f8fafc" }}>
                <div className="text-xs mb-1.5" style={{ color: "#6b7a99" }}>Caregiver</div>
                <div className="flex items-center gap-1.5">
                  <img src="https://i.pravatar.cc/32?img=49" className="w-7 h-7 rounded-full" alt="" />
                  <div>
                    <div className="text-xs" style={{ color: "#1a2b42", fontWeight: 600 }}>Sarah Johnson</div>
                    <div className="text-xs" style={{ color: "#6b7a99" }}>ID: ELD-0012</div>
                  </div>
                </div>
              </div>
              <div className="p-2 rounded-lg" style={{ backgroundColor: "#f8fafc" }}>
                <div className="text-xs mb-1.5" style={{ color: "#6b7a99" }}>Elderly</div>
                <div className="flex items-center gap-1.5">
                  <img src="https://i.pravatar.cc/32?img=47" className="w-7 h-7 rounded-full" alt="" />
                  <div>
                    <div className="text-xs" style={{ color: "#1a2b42", fontWeight: 600 }}>Mary Wilson</div>
                    <div className="text-xs" style={{ color: "#6b7a99" }}>ID: ELD-0001 · Age: 78</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Caregiver Notes */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <FileText size={13} style={{ color: "#6b7a99" }} />
                <span className="text-xs" style={{ color: "#1a2b42", fontWeight: 700 }}>Caregiver Notes</span>
              </div>
              <p className="text-xs" style={{ color: "#6b7a99" }}>
                Elderly was in good spirits. Assisted with morning routine and light exercises. Appetite was good and medication taken as prescribed.
              </p>
            </div>

            {/* Vitals */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp size={13} style={{ color: "#6b7a99" }} />
                <span className="text-xs" style={{ color: "#1a2b42", fontWeight: 700 }}>Vitals Summary</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: "Blood Pressure", val: "120/80", unit: "mmHg", color: "#1a2b42" },
                  { label: "Heart Rate", val: "72", unit: "bpm", color: "#1a2b42" },
                  { label: "Blood Sugar", val: "110", unit: "mg/dL", color: "#f97316" },
                  { label: "Temperature", val: "98.6", unit: "°F", color: "#1a2b42" },
                ].map((v) => (
                  <div key={v.label} className="p-2 rounded-lg text-center" style={{ backgroundColor: "#f8fafc" }}>
                    <div className="text-xs mb-0.5" style={{ color: v.color, fontWeight: 700 }}>{v.val}</div>
                    <div className="text-xs" style={{ color: "#6b7a99", fontSize: "9px" }}>{v.unit}</div>
                    <div className="text-xs mt-0.5" style={{ color: "#6b7a99", fontSize: "9px" }}>{v.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Medication Compliance */}
            <div>
              <span className="text-xs" style={{ color: "#1a2b42", fontWeight: 700 }}>Medication Compliance</span>
              <div className="flex items-center gap-4 mt-2">
                {/* Donut */}
                <div className="relative w-16 h-16 flex-shrink-0">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="15.9" fill="none"
                      stroke="#22c55e" strokeWidth="3"
                      strokeDasharray="100 0"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs" style={{ color: "#1a2b42", fontWeight: 700 }}>100%</span>
                  </div>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Taken On Time: 4</div>
                  <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />Taken Late: 0</div>
                  <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Missed: 0</div>
                  <div className="flex items-center gap-1.5" style={{ color: "#6b7a99" }}>Total Medications: 4</div>
                </div>
              </div>
            </div>

            {/* Compliance Trend */}
            <div>
              <span className="text-xs" style={{ color: "#1a2b42", fontWeight: 700 }}>Compliance Trend</span>
              <div className="h-20 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <XAxis dataKey="date" hide />
                    <YAxis domain={[0, 100]} hide />
                    <Line type="monotone" dataKey="v" stroke="#2563eb" strokeWidth={2} dot={{ fill: "#2563eb", r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Report Details */}
            <div className="border-t pt-3" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
              <span className="text-xs" style={{ color: "#1a2b42", fontWeight: 700 }}>Report Details</span>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <div>
                  <div className="text-xs" style={{ color: "#6b7a99" }}>Report ID</div>
                  <div className="text-xs" style={{ color: "#1a2b42", fontWeight: 500 }}>RPT-2025-0524-0001</div>
                </div>
                <div>
                  <div className="text-xs" style={{ color: "#6b7a99" }}>Generated On</div>
                  <div className="text-xs" style={{ color: "#1a2b42", fontWeight: 500 }}>May 24, 2025 10:45 AM</div>
                </div>
                <div>
                  <div className="text-xs" style={{ color: "#6b7a99" }}>Report Type</div>
                  <div className="text-xs" style={{ color: "#1a2b42", fontWeight: 500 }}>Daily Visit Summary</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
