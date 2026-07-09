import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  CalendarCheck,
  Download,
  Eye,
  FileText,
  Printer,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { getMedicationAssignments } from "../api/medications";
import type { MedicationAssignment } from "../api/medications";
import { getSchedules } from "../api/schedules";
import type { ScheduleAssignment } from "../api/schedules";

type ReportRow = {
  id: string;
  name: string;
  type: "Visit" | "Medication";
  caregiver: string;
  caregiverId?: string;
  elder: string;
  elderId?: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  compliance: number | null;
  status: "Completed" | "Under Review" | "Critical";
  notes: string;
  details: string[];
};

const statusStyles: Record<ReportRow["status"], { bg: string; color: string }> = {
  Completed: { bg: "#dcfce7", color: "#16a34a" },
  "Under Review": { bg: "#fef3c7", color: "#d97706" },
  Critical: { bg: "#fee2e2", color: "#dc2626" },
};

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function displayDate(value: string) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function medicationCompliance(status: string) {
  if (status === "Taken") return 100;
  if (status === "Missed") return 0;
  return null;
}

function reportStatusFromMedication(status: string): ReportRow["status"] {
  if (status === "Taken") return "Completed";
  if (status === "Missed") return "Critical";
  return "Under Review";
}

function reportStatusFromSchedule(status: string): ReportRow["status"] {
  if (status === "completed") return "Completed";
  if (status === "missed" || status === "cancelled") return "Critical";
  return "Under Review";
}

function buildReports(schedules: ScheduleAssignment[], medications: MedicationAssignment[]) {
  const medicationBySchedule = medications.reduce<Record<string, MedicationAssignment[]>>((map, item) => {
    if (!item.scheduleId) return map;
    const key = String(item.scheduleId);
    map[key] = [...(map[key] || []), item];
    return map;
  }, {});

  const scheduleRows: ReportRow[] = schedules.map((schedule) => {
    const scheduleMeds = medicationBySchedule[String(schedule.id)] || [];
    const complianceValues = scheduleMeds
      .map((item) => medicationCompliance(item.complianceStatus))
      .filter((value): value is number => value !== null);
    const compliance = complianceValues.length > 0
      ? Math.round(complianceValues.reduce((sum, value) => sum + value, 0) / complianceValues.length)
      : null;

    return {
      id: `schedule-${schedule.id}`,
      name: `${schedule.purpose} Visit`,
      type: "Visit",
      caregiver: schedule.nurseName,
      caregiverId: String(schedule.nurseId),
      elder: schedule.elderlyName,
      elderId: String(schedule.elderlyId),
      startDate: schedule.visitDate,
      startTime: schedule.visitTime,
      endDate: schedule.visitDate,
      endTime: schedule.visitTime,
      compliance,
      status: reportStatusFromSchedule(schedule.scheduleStatus),
      notes: `Schedule status: ${schedule.scheduleStatus}.`,
      details: [
        `Purpose: ${schedule.purpose}`,
        `Schedule ID: ${schedule.id}`,
        scheduleMeds.length > 0 ? `${scheduleMeds.length} medication assignment(s) linked.` : "No medication assignment linked.",
      ],
    };
  });

  const medicationRows: ReportRow[] = medications.map((medication) => {
    const compliance = medicationCompliance(medication.complianceStatus);

    return {
      id: `medication-${medication.id}`,
      name: "Medication Compliance",
      type: "Medication",
      caregiver: medication.nurseName,
      caregiverId: medication.nurseId,
      elder: medication.elderlyName,
      elderId: medication.elderlyId,
      startDate: medication.scheduledDate,
      startTime: medication.scheduledTime,
      endDate: medication.reportedAt ? medication.reportedAt.slice(0, 10) : medication.scheduledDate,
      endTime: medication.reportedAt ? medication.reportedAt.slice(11, 16) : medication.scheduledTime,
      compliance,
      status: reportStatusFromMedication(medication.complianceStatus),
      notes: medication.reportNotes || medication.notes || "No report notes recorded.",
      details: [
        `Medication: ${medication.medicationName}`,
        `Dosage: ${medication.dosage}`,
        `Instructions: ${medication.instructions}`,
        `Compliance status: ${medication.complianceStatus}`,
      ],
    };
  });

  return [...scheduleRows, ...medicationRows].sort((a, b) => (
    `${b.startDate} ${b.startTime}`.localeCompare(`${a.startDate} ${a.startTime}`)
  ));
}

function downloadCsv(rows: ReportRow[]) {
  const header = ["Report Name", "Type", "Caregiver", "Elderly", "Start Date", "Start Time", "End Date", "End Time", "Compliance", "Status", "Notes"];
  const csvRows = rows.map((row) => [
    row.name,
    row.type,
    row.caregiver,
    row.elder,
    row.startDate,
    row.startTime,
    row.endDate,
    row.endTime,
    row.compliance === null ? "N/A" : `${row.compliance}%`,
    row.status,
    row.notes,
  ]);
  const csv = [header, ...csvRows]
    .map((cells) => cells.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `eldercare-reports-${toDateKey(new Date())}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function Reports() {
  const today = toDateKey(new Date());
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  const [reports, setReports] = useState<ReportRow[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [startDate, setStartDate] = useState(toDateKey(weekStart));
  const [endDate, setEndDate] = useState(today);
  const [caregiver, setCaregiver] = useState("all");
  const [elderly, setElderly] = useState("all");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");

  async function loadReports() {
    setLoading(true);
    setMessage("");

    try {
      const [scheduleResponse, medicationResponse] = await Promise.all([
        getSchedules(),
        getMedicationAssignments(),
      ]);
      const rows = buildReports(scheduleResponse.schedules, medicationResponse.medications);
      setReports(rows);
      setSelectedReportId((current) => current && rows.some((row) => row.id === current) ? current : rows[0]?.id || null);
    } catch (error) {
      console.error("Failed to load reports.", error);
      setMessage("Failed to load report data from MySQL.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  const caregivers = useMemo(() => Array.from(new Set(reports.map((row) => row.caregiver))).sort(), [reports]);
  const elders = useMemo(() => Array.from(new Set(reports.map((row) => row.elder))).sort(), [reports]);
  const filteredReports = useMemo(() => {
    return reports.filter((row) => {
      if (startDate && row.startDate < startDate) return false;
      if (endDate && row.startDate > endDate) return false;
      if (caregiver !== "all" && row.caregiver !== caregiver) return false;
      if (elderly !== "all" && row.elder !== elderly) return false;
      if (type !== "all" && row.type !== type) return false;
      if (status !== "all" && row.status !== status) return false;
      return true;
    });
  }, [caregiver, elderly, endDate, reports, startDate, status, type]);

  const selectedReport = filteredReports.find((row) => row.id === selectedReportId) || filteredReports[0] || null;
  const completedCount = reports.filter((row) => row.status === "Completed").length;
  const criticalCount = reports.filter((row) => row.status === "Critical").length;
  const complianceRows = reports.filter((row) => row.compliance !== null);
  const averageCompliance = complianceRows.length > 0
    ? Math.round(complianceRows.reduce((sum, row) => sum + (row.compliance || 0), 0) / complianceRows.length)
    : 0;
  const trendData = filteredReports
    .filter((row) => row.compliance !== null)
    .slice()
    .reverse()
    .slice(-8)
    .map((row) => ({ date: displayDate(row.startDate), v: row.compliance || 0 }));

  function clearFilters() {
    setStartDate("");
    setEndDate("");
    setCaregiver("all");
    setElderly("all");
    setType("all");
    setStatus("all");
  }

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: "#f0f4f8" }}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs" style={{ color: "#6b7a99" }}>
          <span>Dashboard</span><span>/</span>
          <span>Reports</span><span>/</span>
          <span style={{ color: "#1a2b42", fontWeight: 500 }}>Generate Reports</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadReports} className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm text-white" style={{ backgroundColor: "#2563eb" }}>
            <RefreshCw size={14} /> {loading ? "Loading..." : "Generate Report"}
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "rgba(0,0,0,0.1)", color: "#6b7a99" }}>
            <Printer size={14} /> Export PDF
          </button>
          <button onClick={() => downloadCsv(filteredReports)} className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "rgba(0,0,0,0.1)", color: "#6b7a99" }}>
            <ArrowDown size={14} /> Export CSV
          </button>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-4 gap-4">
        {[
          { label: "Total Reports", value: reports.length, sub: `${filteredReports.length} after filters`, icon: <FileText size={20} />, iconBg: "#eff6ff", iconColor: "#818cf8" },
          { label: "Medication Compliance", value: `${averageCompliance}%`, sub: `${complianceRows.length} measured rows`, icon: <ShieldCheck size={20} />, iconBg: "#ecfdf5", iconColor: "#22c55e" },
          { label: "Completed Reports", value: completedCount, sub: "Completed visits and medication reports", icon: <CalendarCheck size={20} />, iconBg: "#f3e8ff", iconColor: "#a855f7" },
          { label: "Critical Alerts", value: criticalCount, sub: "Missed visits or medication", icon: <AlertTriangle size={20} />, iconBg: "#fff7ed", iconColor: "#f97316" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border bg-white p-4" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: stat.iconBg, color: stat.iconColor }}>
              {stat.icon}
            </div>
            <div className="mb-0.5 text-2xl" style={{ color: "#1a2b42", fontWeight: 700 }}>{stat.value}</div>
            <div className="mb-0.5 text-xs" style={{ color: "#1a2b42" }}>{stat.label}</div>
            <div className="text-xs" style={{ color: stat.label === "Critical Alerts" ? "#ef4444" : "#22c55e" }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border bg-white p-3" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
        <FilterDate label="Start Date" value={startDate} onChange={setStartDate} />
        <FilterDate label="End Date" value={endDate} onChange={setEndDate} />
        <FilterSelect label="Caregiver / Nurse" value={caregiver} onChange={setCaregiver} options={["all", ...caregivers]} />
        <FilterSelect label="Elderly" value={elderly} onChange={setElderly} options={["all", ...elders]} />
        <FilterSelect label="Report Type" value={type} onChange={setType} options={["all", "Visit", "Medication"]} />
        <FilterSelect label="Status" value={status} onChange={setStatus} options={["all", "Completed", "Under Review", "Critical"]} />
        <button onClick={clearFilters} className="rounded-lg border px-3 py-2 text-xs hover:bg-gray-50" style={{ borderColor: "rgba(0,0,0,0.1)", color: "#6b7a99" }}>
          Clear Filters
        </button>
      </div>

      {message && <div className="mb-4 rounded-lg border bg-red-50 px-3 py-2 text-sm text-red-700">{message}</div>}

      <div className="flex gap-4">
        <div className="flex-1 overflow-hidden rounded-xl border bg-white" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
          <div className="border-b px-4 py-3" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
            <h3 className="text-sm" style={{ color: "#1a2b42", fontWeight: 700 }}>Reports ({filteredReports.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: "#f8fafc" }}>
                  {["Report Name", "Caregiver", "Elderly", "Effective Date", "End Date", "Med Compliance", "Status", "Actions"].map((column) => (
                    <th key={column} className="px-3 py-2.5 text-left text-xs" style={{ color: "#6b7a99", fontWeight: 600, whiteSpace: "nowrap" }}>
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-sm" style={{ color: "#6b7a99" }}>Loading report data...</td></tr>
                ) : filteredReports.length === 0 ? (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-sm" style={{ color: "#6b7a99" }}>No reports found for these filters.</td></tr>
                ) : filteredReports.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedReportId(row.id)}
                    className="cursor-pointer border-t transition-colors"
                    style={{ borderColor: "rgba(0,0,0,0.05)", backgroundColor: selectedReport?.id === row.id ? "#eff6ff" : "transparent" }}
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded" style={{ backgroundColor: "#eff6ff" }}>
                          <FileText size={11} style={{ color: row.status === "Critical" ? "#ef4444" : "#2563eb" }} />
                        </div>
                        <span className="text-xs" style={{ color: "#1a2b42", fontWeight: 500 }}>{row.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: "#1a2b42" }}>{row.caregiver}</td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: "#1a2b42" }}>{row.elder}</td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: "#1a2b42", whiteSpace: "pre-line" }}>{displayDate(row.startDate)}{"\n"}{row.startTime}</td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: "#1a2b42", whiteSpace: "pre-line" }}>{displayDate(row.endDate)}{"\n"}{row.endTime}</td>
                    <td className="px-3 py-2.5"><Compliance value={row.compliance} /></td>
                    <td className="px-3 py-2.5">
                      <span className="rounded-full px-2 py-0.5 text-xs" style={{ backgroundColor: statusStyles[row.status].bg, color: statusStyles[row.status].color }}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5" onClick={(event) => event.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setSelectedReportId(row.id)} className="flex h-6 w-6 items-center justify-center rounded" style={{ backgroundColor: "#eff6ff" }}>
                          <Eye size={12} style={{ color: "#2563eb" }} />
                        </button>
                        <button onClick={() => downloadCsv([row])} className="flex h-6 w-6 items-center justify-center rounded" style={{ backgroundColor: "#f8fafc" }}>
                          <Download size={12} style={{ color: "#6b7a99" }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t px-4 py-3 text-xs" style={{ borderColor: "rgba(0,0,0,0.06)", color: "#6b7a99" }}>
            <span>Showing {filteredReports.length} of {reports.length} reports</span>
          </div>
        </div>

        <ReportDetails report={selectedReport} trendData={trendData} />
      </div>
    </div>
  );
}

function ReportDetails({ report, trendData }: { report: ReportRow | null; trendData: { date: string; v: number }[] }) {
  return (
    <div className="w-72 flex-shrink-0 overflow-hidden rounded-xl border bg-white" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
      {report ? (
        <>
          <div className="flex items-start justify-between border-b px-4 py-3" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
            <div>
              <h3 className="text-xs" style={{ color: "#1a2b42", fontWeight: 700 }}>{report.name}</h3>
              <p className="mt-0.5 text-xs" style={{ color: "#6b7a99" }}>{displayDate(report.startDate)} at {report.startTime}</p>
            </div>
            <span className="rounded-full px-2 py-0.5 text-xs" style={{ backgroundColor: statusStyles[report.status].bg, color: statusStyles[report.status].color }}>
              {report.status}
            </span>
          </div>
          <div className="max-h-[600px] space-y-4 overflow-y-auto p-4">
            <div className="grid grid-cols-2 gap-3">
              <DetailCard label="Caregiver" value={report.caregiver} sub={report.caregiverId || "-"} />
              <DetailCard label="Elderly" value={report.elder} sub={report.elderId || "-"} />
            </div>
            <section>
              <div className="mb-1.5 flex items-center gap-1.5">
                <FileText size={13} style={{ color: "#6b7a99" }} />
                <span className="text-xs" style={{ color: "#1a2b42", fontWeight: 700 }}>Report Notes</span>
              </div>
              <p className="text-xs" style={{ color: "#6b7a99" }}>{report.notes}</p>
            </section>
            <section>
              <span className="text-xs" style={{ color: "#1a2b42", fontWeight: 700 }}>Medication Compliance</span>
              <div className="mt-2 flex items-center gap-4">
                <Donut value={report.compliance} />
                <div className="space-y-1 text-xs" style={{ color: "#1a2b42" }}>
                  <div>Compliance: {report.compliance === null ? "N/A" : `${report.compliance}%`}</div>
                  <div>Status: {report.status}</div>
                  <div>Type: {report.type}</div>
                </div>
              </div>
            </section>
            <section>
              <span className="text-xs" style={{ color: "#1a2b42", fontWeight: 700 }}>Details</span>
              <div className="mt-2 space-y-1">
                {report.details.map((detail) => (
                  <div key={detail} className="rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: "#f8fafc", color: "#6b7a99" }}>{detail}</div>
                ))}
              </div>
            </section>
            <section>
              <span className="text-xs" style={{ color: "#1a2b42", fontWeight: 700 }}>Compliance Trend</span>
              <div className="mt-2 h-20">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <XAxis dataKey="date" hide />
                    <YAxis domain={[0, 100]} hide />
                    <Line type="monotone" dataKey="v" stroke="#2563eb" strokeWidth={2} dot={{ fill: "#2563eb", r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>
        </>
      ) : (
        <div className="p-6 text-center text-sm" style={{ color: "#6b7a99" }}>Select a report to view details.</div>
      )}
    </div>
  );
}

function FilterDate({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <div className="mb-0.5 text-xs" style={{ color: "#6b7a99" }}>{label}</div>
      <input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="rounded-lg border px-3 py-2 text-xs outline-none" style={{ borderColor: "rgba(0,0,0,0.1)", color: "#1a2b42" }} />
    </label>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label>
      <div className="mb-0.5 text-xs" style={{ color: "#6b7a99" }}>{label}</div>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-lg border px-3 py-2 text-xs outline-none" style={{ borderColor: "rgba(0,0,0,0.1)", color: "#1a2b42" }}>
        {options.map((option) => (
          <option key={option} value={option}>{option === "all" ? "All" : option}</option>
        ))}
      </select>
    </label>
  );
}

function Compliance({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs" style={{ color: "#6b7a99" }}>N/A</span>;

  return (
    <div>
      <div className="mb-1 text-xs" style={{ color: value >= 80 ? "#16a34a" : value >= 50 ? "#d97706" : "#dc2626" }}>{value}%</div>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: value >= 80 ? "#22c55e" : value >= 50 ? "#f59e0b" : "#ef4444" }} />
      </div>
    </div>
  );
}

function DetailCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg p-2" style={{ backgroundColor: "#f8fafc" }}>
      <div className="mb-1.5 text-xs" style={{ color: "#6b7a99" }}>{label}</div>
      <div className="text-xs" style={{ color: "#1a2b42", fontWeight: 600 }}>{value}</div>
      <div className="text-xs" style={{ color: "#6b7a99" }}>ID: {sub}</div>
    </div>
  );
}

function Donut({ value }: { value: number | null }) {
  const displayValue = value ?? 0;

  return (
    <div className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center">
      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
        <circle cx="18" cy="18" r="15.9" fill="none" stroke={value === null ? "#94a3b8" : "#22c55e"} strokeWidth="3" strokeDasharray={`${displayValue} ${100 - displayValue}`} strokeLinecap="round" />
      </svg>
      <span className="absolute text-xs" style={{ color: "#1a2b42", fontWeight: 700 }}>{value === null ? "N/A" : `${value}%`}</span>
    </div>
  );
}
