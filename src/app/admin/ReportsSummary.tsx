import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  Check,
  Droplets,
  FileText,
  Pill,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { jsPDF } from "jspdf";
import { getProfiles } from "../api/profiles";
import { getElderlyReportSummary } from "../api/reports";
import type { ElderlyReportSummary } from "../api/reports";
import type { ElderlyProfile } from "./data";

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

function conditionStyle(status: string) {
  if (status === "Stable") return { bg: "#dcfce7", color: "#16a34a" };
  if (status === "High" || status === "Low") return { bg: "#fee2e2", color: "#dc2626" };
  return { bg: "#f1f5f9", color: "#64748b" };
}

function buildCsvRows(summary: ElderlyReportSummary) {
  const bpAverage = summary.bloodPressure.averageSystolic === null
    ? "N/A"
    : `${summary.bloodPressure.averageSystolic}/${summary.bloodPressure.averageDiastolic} mmHg`;
  const glucoseAverage = summary.bloodGlucose.average === null
    ? "N/A"
    : `${summary.bloodGlucose.average} mg/dL`;
  const compliance = summary.medication.compliancePercent === null
    ? "N/A"
    : `${summary.medication.compliancePercent}%`;

  return [
    String(summary.elderly.id),
    summary.elderly.name,
    summary.range.startDate,
    summary.range.endDate,
    summary.elderly.age || "-",
    summary.elderly.bloodType || "-",
    summary.elderly.medicalCondition || "-",
    bpAverage,
    String(summary.bloodPressure.readings),
    summary.bloodPressure.status,
    glucoseAverage,
    String(summary.bloodGlucose.readings),
    summary.bloodGlucose.status,
    String(summary.medication.total),
    String(summary.medication.taken),
    String(summary.medication.missed),
    compliance,
    summary.note || "-",
  ];
}

function downloadCsv(summaryInput: ElderlyReportSummary | ElderlyReportSummary[] | null) {
  const summaries = Array.isArray(summaryInput) ? summaryInput : summaryInput ? [summaryInput] : [];
  if (summaries.length === 0) return;

  const rows = [
    [
      "Elderly ID",
      "Elderly Name",
      "Start Date",
      "End Date",
      "Age",
      "Blood Type",
      "Medical Condition",
      "Blood Pressure Average",
      "Blood Pressure Readings",
      "Blood Pressure Status",
      "Blood Glucose Average",
      "Blood Glucose Readings",
      "Blood Glucose Status",
      "Medication Total",
      "Medication Taken",
      "Medication Missed",
      "Compliance",
      "Report Note",
    ],
    ...summaries.map(buildCsvRows),
  ];
  const csv = rows
    .map((cells) => cells.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const first = summaries[0];
  link.download = summaries.length === 1
    ? `elderly-report-${first.elderly.id}-${first.range.startDate}-${first.range.endDate}.csv`
    : `elderly-reports-${first.range.startDate}-${first.range.endDate}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function buildProfessionalPdfDoc(summaryInput: ElderlyReportSummary | ElderlyReportSummary[]) {
  const summaries = Array.isArray(summaryInput) ? summaryInput : [summaryInput];
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 42;
  let y = 44;

  const ensureSpace = (height: number) => {
    if (y + height <= pageHeight - 52) return;
    doc.addPage();
    y = 44;
  };

  const sectionTitle = (title: string) => {
    ensureSpace(36);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(27, 43, 66);
    doc.text(title, margin, y);
    y += 10;
    doc.setDrawColor(219, 228, 240);
    doc.line(margin, y, pageWidth - margin, y);
    y += 18;
  };

  const metricCard = (x: number, title: string, value: string, sub: string, status?: string) => {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(219, 228, 240);
    doc.roundedRect(x, y, 122, 76, 6, 6, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(96, 112, 138);
    doc.text(title, x + 12, y + 18);
    doc.setFont("helvetica", "bold");
    const valueMaxWidth = 98;
    const defaultValueFontSize = 18;
    doc.setFontSize(defaultValueFontSize);
    const measuredValueWidth = doc.getTextWidth(value);
    const fittedValueFontSize = measuredValueWidth > valueMaxWidth
      ? Math.max(10, (defaultValueFontSize * valueMaxWidth) / measuredValueWidth)
      : defaultValueFontSize;
    doc.setFontSize(fittedValueFontSize);
    doc.setTextColor(27, 43, 66);
    doc.text(value, x + 12, y + 42);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(96, 112, 138);
    doc.text(sub, x + 12, y + 61);
    if (status) {
      const stable = status === "Stable";
      const noData = status.toLowerCase().startsWith("no blood");
      const statusLabel = noData ? "No data" : status.slice(0, 8);
      doc.setFillColor(noData ? 241 : stable ? 220 : 254, noData ? 245 : stable ? 252 : 226, noData ? 249 : stable ? 231 : 226);
      doc.roundedRect(x + 76, y + 52, 36, 14, 7, 7, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(noData ? 100 : stable ? 22 : 220, noData ? 116 : stable ? 163 : 38, noData ? 139 : stable ? 74 : 38);
      doc.text(statusLabel, x + 94, y + 62, { align: "center" });
    }
  };

  const table = (headers: string[], rows: string[][], widths: number[]) => {
    ensureSpace(34);
    doc.setFillColor(238, 244, 255);
    doc.rect(margin, y, widths.reduce((sum, width) => sum + width, 0), 22, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    let x = margin;
    headers.forEach((header, index) => {
      doc.text(header.toUpperCase(), x + 6, y + 14);
      x += widths[index];
    });
    y += 22;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(27, 43, 66);
    rows.forEach((row) => {
      const wrapped = row.map((cell, index) => doc.splitTextToSize(cell || "-", widths[index] - 10));
      const rowHeight = Math.max(24, ...wrapped.map((lines) => lines.length * 10 + 10));
      ensureSpace(rowHeight + 2);
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, widths.reduce((sum, width) => sum + width, 0), rowHeight);
      x = margin;
      wrapped.forEach((lines, index) => {
        doc.text(lines, x + 6, y + 14);
        x += widths[index];
      });
      y += rowHeight;
    });
    y += 18;
  };

  summaries.forEach((summary, summaryIndex) => {
  if (summaryIndex > 0) {
    doc.addPage();
  }
  y = 44;

  const bpAverage =
    summary.bloodPressure.averageSystolic === null
      ? "N/A"
      : `${summary.bloodPressure.averageSystolic}/${summary.bloodPressure.averageDiastolic} mmHg`;
  const glucoseAverage =
    summary.bloodGlucose.average === null ? "N/A" : `${summary.bloodGlucose.average} mg/dL`;
  const compliance =
    summary.medication.compliancePercent === null ? "N/A" : `${summary.medication.compliancePercent}%`;

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageWidth, 92, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(219, 234, 254);
  doc.text("ELDEREASE CARE MANAGEMENT", margin, 34);
  doc.setFontSize(25);
  doc.setTextColor(255, 255, 255);
  doc.text("Elderly Health Report", margin, 66);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 200, 38);
  doc.text(`${displayDate(summary.range.startDate)} to ${displayDate(summary.range.endDate)}`, pageWidth - 200, 56);
  y = 124;

  sectionTitle("Patient Details");
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(219, 228, 240);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 74, 6, 6, "FD");
  [
    ["Name", summary.elderly.name],
    ["Profile ID", String(summary.elderly.id)],
    ["Age", String(summary.elderly.age || "-")],
    ["Blood Type", summary.elderly.bloodType || "-"],
    ["Condition", summary.elderly.medicalCondition || "-"],
  ].forEach(([label, value], index) => {
    const x = margin + 16 + index * 100;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(96, 112, 138);
    doc.text(label.toUpperCase(), x, y + 24);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(27, 43, 66);
    doc.text(doc.splitTextToSize(value, 88), x, y + 43);
  });
  y += 104;

  sectionTitle("Clinical Summary");
  const gap = 12;
  const cardWidth = 122;
  metricCard(margin, "Blood Pressure Avg", bpAverage, `${summary.bloodPressure.readings} readings`, summary.bloodPressure.status);
  metricCard(margin + cardWidth + gap, "Blood Glucose Avg", glucoseAverage, `${summary.bloodGlucose.readings} readings`, summary.bloodGlucose.status);
  metricCard(margin + (cardWidth + gap) * 2, "Medication Missed", String(summary.medication.missed), `${summary.medication.total} scheduled`);
  metricCard(margin + (cardWidth + gap) * 3, "Compliance", compliance, `${summary.medication.taken} taken`);
  y += 102;

  sectionTitle("Professional Note");
  const noteLines = doc.splitTextToSize(summary.note || "-", pageWidth - margin * 2 - 28);
  const noteHeight = Math.max(54, noteLines.length * 12 + 28);
  ensureSpace(noteHeight);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(219, 228, 240);
  doc.roundedRect(margin, y, pageWidth - margin * 2, noteHeight, 6, 6, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(27, 43, 66);
  doc.text(noteLines, margin + 14, y + 22);
  y += noteHeight + 24;

  const bloodPressureVitals = summary.vitals.filter(
    (vital) => vital.systolic != null && vital.diastolic != null,
  );
  const bloodGlucoseVitals = summary.vitals.filter(
    (vital) => vital.glucoseValue != null,
  );

  sectionTitle("Blood Pressure Readings");
  table(
    ["Date", "Time", "Blood Pressure"],
    bloodPressureVitals.length
      ? bloodPressureVitals.map((vital) => [
          displayDate(vital.recordedDate),
          vital.recordedTime || "-",
          `${vital.systolic}/${vital.diastolic} mmHg`,
        ])
      : [["No blood pressure readings recorded for this date range.", "", ""]],
    [190, 120, 202],
  );

  sectionTitle("Blood Glucose Readings");
  table(
    ["Date", "Time", "Blood Glucose"],
    bloodGlucoseVitals.length
      ? bloodGlucoseVitals.map((vital) => [
          displayDate(vital.recordedDate),
          vital.recordedTime || "-",
          `${vital.glucoseValue} mg/dL`,
        ])
      : [["No blood glucose readings recorded for this date range.", "", ""]],
    [190, 120, 202],
  );

  sectionTitle("Medication Review");
  const reportMedications = summary.medications.filter(
    (item) => String(item.complianceStatus || "").trim().toLowerCase() !== "pending",
  );
  table(
    ["Date", "Time", "Medication", "Dosage", "Status"],
    reportMedications.length
      ? reportMedications.map((item) => [
          displayDate(item.scheduledDate),
          item.scheduledTime || "-",
          item.medicationName || "-",
          item.dosage || "-",
          item.complianceStatus || "-",
        ])
      : [["No medication records found for this date range.", "", "", "", ""]],
    [84, 64, 152, 108, 124],
  );
  });

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(96, 112, 138);
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - margin - 48, pageHeight - 28);
    doc.text("Generated from ElderEase report records", margin, pageHeight - 28);
  }

  return doc;
}

function downloadProfessionalPdf(summaryInput: ElderlyReportSummary | ElderlyReportSummary[] | null) {
  const summaries = Array.isArray(summaryInput) ? summaryInput : summaryInput ? [summaryInput] : [];
  if (summaries.length === 0) return;

  const first = summaries[0];
  const filename = summaries.length === 1
    ? `elderly-report-${first.elderly.id}-${first.range.startDate}-${first.range.endDate}.pdf`
    : `elderly-reports-${first.range.startDate}-${first.range.endDate}.pdf`;
  buildProfessionalPdfDoc(summaries).save(filename);
}

function downloadProfessionalPdfs(summaries: ElderlyReportSummary[]) {
  summaries.forEach((summary) => {
    buildProfessionalPdfDoc(summary).save(`elderly-report-${summary.elderly.id}-${summary.range.startDate}-${summary.range.endDate}.pdf`);
  });
}

type Page = "dashboard" | "manage-profiles" | "schedules" | "medications" | "reports" | "login-history" | "settings";

interface ReportsProps {
  onNavigate: (page: Page) => void;
}

export function Reports({ onNavigate }: ReportsProps) {
  const today = toDateKey(new Date());
  const start = new Date();
  start.setDate(start.getDate() - 7);

  const [elderlyProfiles, setElderlyProfiles] = useState<ElderlyProfile[]>([]);
  const [selectedElderlyIds, setSelectedElderlyIds] = useState<string[]>([]);
  const [pendingElderlyIds, setPendingElderlyIds] = useState<string[]>([]);
  const [elderlySearch, setElderlySearch] = useState("");
  const [startDate, setStartDate] = useState(toDateKey(start));
  const [endDate, setEndDate] = useState(today);
  const [summaries, setSummaries] = useState<ElderlyReportSummary[]>([]);
  const [selectedSummaryId, setSelectedSummaryId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState("");

  useEffect(() => {
    let ignore = false;

    getProfiles()
      .then((response) => {
        if (ignore) return;
        const activeElderly = response.elderly.filter((profile) => profile.status === "Active");
        setElderlyProfiles(activeElderly);
        setPendingElderlyIds((current) => current.length > 0 ? current : activeElderly[0]?.id ? [String(activeElderly[0].id)] : []);
        setSelectedElderlyIds((current) => current.length > 0 ? current : activeElderly[0]?.id ? [String(activeElderly[0].id)] : []);
      })
      .catch((error) => {
        console.error("Failed to load elderly profiles.", error);
        setMessage("Failed to load elderly profiles.");
      });

    return () => {
      ignore = true;
    };
  }, []);

  const togglePendingElderly = (elderlyId: string) => {
    setPendingElderlyIds((current) => current.includes(elderlyId)
      ? current.filter((id) => id !== elderlyId)
      : [...current, elderlyId]);
    setPdfPreviewUrl("");
  };

  const clearPendingElderly = () => {
    setPendingElderlyIds([]);
    setPdfPreviewUrl("");
  };

  const selectFilteredElderly = () => {
    setPendingElderlyIds((current) => Array.from(new Set([
      ...current,
      ...filteredElderlyProfiles.map((profile) => String(profile.id)),
    ])));
    setPdfPreviewUrl("");
  };

  const confirmElderlySelection = () => {
    const ids = Array.from(new Set(pendingElderlyIds));
    setSelectedElderlyIds(ids);
    generateReport(ids, true);
  };

  async function generateReport(nextElderlyIds = selectedElderlyIds, showPdfPreview = false) {
    const ids = Array.from(new Set(nextElderlyIds.map(String).filter(Boolean)));

    if (ids.length === 0) {
      setMessage("Select at least one elderly profile first.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const reports = await Promise.all(ids.map((id) => getElderlyReportSummary(id, startDate, endDate)));
      setSummaries(reports);
      setSelectedSummaryId((current) => reports.some((report) => String(report.elderly.id) === current)
        ? current
        : String(reports[0]?.elderly.id || ""));
      if (showPdfPreview) {
        setPdfPreviewUrl(buildProfessionalPdfDoc(reports).output("datauristring"));
      }
      setPendingElderlyIds([]);
      setSelectedElderlyIds([]);
    } catch (error) {
      console.error("Failed to generate elderly report.", error);
      setMessage("Failed to generate report.");
      setPdfPreviewUrl("");
    } finally {
      setLoading(false);
    }
  }

  const summary = summaries.find((report) => String(report.elderly.id) === selectedSummaryId) || summaries[0] || null;
  const selectedElderly = elderlyProfiles.find((profile) => String(profile.id) === String(selectedSummaryId || selectedElderlyIds[0]));
  const filteredElderlyProfiles = useMemo(() => {
    const query = elderlySearch.trim().toLowerCase();
    if (!query) return elderlyProfiles;
    return elderlyProfiles.filter((profile) => (
      String(profile.name || "").toLowerCase().includes(query) ||
      String(profile.id || "").toLowerCase().includes(query) ||
      String(profile.medicalCondition || "").toLowerCase().includes(query)
    ));
  }, [elderlyProfiles, elderlySearch]);
  const pendingElderlyProfiles = useMemo(() => pendingElderlyIds
    .map((id) => elderlyProfiles.find((profile) => String(profile.id) === id))
    .filter((profile): profile is ElderlyProfile => Boolean(profile)), [elderlyProfiles, pendingElderlyIds]);
  const medicationRows = useMemo(() => summaries.flatMap((report) => (
    report.medications
      .filter((item) => String(item.complianceStatus || "").trim().toLowerCase() !== "pending")
      .map((item) => ({ report, item }))
  )), [summaries]);
  const bpTrend = useMemo(() => {
    return (summary?.vitals || [])
      .filter((vital) => vital.systolic !== null && vital.systolic !== undefined)
      .map((vital) => ({ date: displayDate(vital.recordedDate), systolic: Number(vital.systolic), diastolic: Number(vital.diastolic || 0) }));
  }, [summary]);
  const glucoseTrend = useMemo(() => {
    return (summary?.vitals || [])
      .filter((vital) => vital.glucoseValue !== null && vital.glucoseValue !== undefined)
      .map((vital) => ({ date: displayDate(vital.recordedDate), glucose: Number(vital.glucoseValue) }));
  }, [summary]);

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: "#f0f4f8" }}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs" style={{ color: "#6b7a99" }}>
          <button
            type="button"
            onClick={() => onNavigate("dashboard")}
            className="rounded px-1 py-0.5 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-200"
            style={{ color: "#6b7a99" }}
          >
            Dashboard
          </button><span>/</span>
          <span>Reports</span><span>/</span>
          <span style={{ color: "#1a2b42", fontWeight: 500 }}>Elderly Health Summary</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => downloadProfessionalPdfs(summaries)} disabled={summaries.length === 0} className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50" style={{ borderColor: "rgba(0,0,0,0.1)", color: "#6b7a99" }}>
            <ArrowDown size={14} /> Download PDFs ({summaries.length})
          </button>
          <button onClick={() => downloadCsv(summaries)} disabled={summaries.length === 0} className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50" style={{ borderColor: "rgba(0,0,0,0.1)", color: "#6b7a99" }}>
            <ArrowDown size={14} /> Export CSV
          </button>
        </div>
      </div>

      <div className="mb-4 rounded-xl border bg-white p-4" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_0.65fr]">
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm" style={{ color: "#1a2b42", fontWeight: 700 }}>Report Elders</div>
                <div className="text-xs" style={{ color: "#6b7a99" }}>{pendingElderlyIds.length} selected</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectFilteredElderly}
                  className="rounded-lg border px-3 py-1.5 text-xs"
                  style={{ borderColor: "rgba(0,0,0,0.1)", color: "#2563eb" }}
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={clearPendingElderly}
                  className="rounded-lg border px-3 py-1.5 text-xs"
                  style={{ borderColor: "rgba(0,0,0,0.1)", color: "#6b7a99" }}
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="rounded-lg border bg-white" style={{ borderColor: "rgba(0,0,0,0.12)" }}>
              <div className="border-b p-3" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#6b7a99" }} />
                  <input
                    value={elderlySearch}
                    onChange={(event) => setElderlySearch(event.target.value)}
                    placeholder="Search by name, ID, or condition"
                    className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none"
                    style={{ borderColor: "rgba(0,0,0,0.1)", color: "#1a2b42", backgroundColor: "#f8fafc" }}
                  />
                </div>
                {pendingElderlyProfiles.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {pendingElderlyProfiles.map((profile) => (
                      <span
                        key={profile.id}
                        className="inline-flex max-w-[220px] items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"
                        style={{ borderColor: "#bfdbfe", backgroundColor: "#eff6ff", color: "#1d4ed8" }}
                      >
                        <span className="truncate">{profile.name}</span>
                        <button
                          type="button"
                          onClick={() => togglePendingElderly(String(profile.id))}
                          className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full hover:bg-blue-100"
                          style={{ color: "#2563eb" }}
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="max-h-56 overflow-y-auto p-2">
                {filteredElderlyProfiles.length === 0 ? (
                  <div className="px-2 py-6 text-center text-sm" style={{ color: "#6b7a99" }}>No elderly found.</div>
                ) : (
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {filteredElderlyProfiles.map((profile) => {
                      const id = String(profile.id);
                      const selected = pendingElderlyIds.includes(id);
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => togglePendingElderly(id)}
                          className="flex min-h-14 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors hover:bg-blue-50"
                          style={{
                            backgroundColor: selected ? "#eff6ff" : "#fff",
                            borderColor: selected ? "#93c5fd" : "rgba(0,0,0,0.08)",
                          }}
                        >
                          <span
                            className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border"
                            style={{
                              backgroundColor: selected ? "#2563eb" : "#fff",
                              borderColor: selected ? "#2563eb" : "rgba(0,0,0,0.22)",
                              color: "#fff",
                            }}
                          >
                            {selected && <Check size={13} />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm" style={{ color: "#1a2b42", fontWeight: 700 }}>{profile.name}</span>
                            <span className="block truncate text-xs" style={{ color: "#6b7a99" }}>{profile.id} | {profile.medicalCondition || "No condition"}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col self-center gap-3 rounded-lg border p-3" style={{ borderColor: "rgba(0,0,0,0.08)", backgroundColor: "#f8fafc" }}>
            <div className="space-y-3">
              <DateField label="Start Date" value={startDate} onChange={setStartDate} />
              <DateField label="End Date" value={endDate} onChange={setEndDate} />
            </div>
            <div className="space-y-2">
              <button
                onClick={confirmElderlySelection}
                disabled={pendingElderlyIds.length === 0 || loading}
                className="w-full rounded-lg px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
                style={{ backgroundColor: "#2563eb" }}
              >
                {loading ? "Generating..." : "Confirm & Generate"}
              </button>
              <div className="rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: "#fff", color: "#6b7a99" }}>
                {selectedElderlyIds.length} confirmed report{selectedElderlyIds.length === 1 ? "" : "s"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {message && <div className="mb-4 rounded-lg border bg-red-50 px-3 py-2 text-sm text-red-700">{message}</div>}

      <div className="mb-5 grid grid-cols-4 gap-4">
        <SummaryCard icon={<Activity size={20} />} label="Blood Pressure Avg" value={summary?.bloodPressure.averageSystolic === null || !summary ? "N/A" : `${summary.bloodPressure.averageSystolic}/${summary.bloodPressure.averageDiastolic}`} sub={`${summary?.bloodPressure.readings || 0} readings`} status={summary?.bloodPressure.status} />
        <SummaryCard icon={<Droplets size={20} />} label="Blood Glucose Avg" value={summary?.bloodGlucose.average === null || !summary ? "N/A" : `${summary.bloodGlucose.average} mg/dL`} sub={`${summary?.bloodGlucose.readings || 0} readings`} status={summary?.bloodGlucose.status} />
        <SummaryCard icon={<Pill size={20} />} label="Medication This Period" value={String(summary?.medication.total || 0)} sub={`${summary?.medication.missed || 0} missed`} status={(summary?.medication.missed || 0) > 0 ? "High" : "Stable"} />
        <SummaryCard icon={<ShieldCheck size={20} />} label="Medication Compliance" value={summary?.medication.compliancePercent === null || !summary ? "N/A" : `${summary.medication.compliancePercent}%`} sub={`${summary?.medication.taken || 0} taken`} status={(summary?.medication.missed || 0) > 0 ? "High" : "Stable"} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="rounded-xl border bg-white p-5" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
            <div className="mb-3 flex items-center gap-2">
              <FileText size={16} style={{ color: "#2563eb" }} />
              <h3 className="text-sm" style={{ color: "#1a2b42", fontWeight: 700 }}>Generated Report Note</h3>
            </div>
            {summaries.length === 0 ? (
              <p className="text-sm leading-6" style={{ color: "#1a2b42" }}>Choose one or more elderly profiles and date range to generate the report note.</p>
            ) : (
              <div className="space-y-3">
                {summaries.map((report) => (
                  <button
                    key={report.elderly.id}
                    type="button"
                    onClick={() => {
                      setSelectedSummaryId(String(report.elderly.id));
                      setPdfPreviewUrl("");
                    }}
                    className="w-full rounded-lg border p-3 text-left"
                    style={{
                      borderColor: String(report.elderly.id) === String(summary?.elderly.id) ? "#2563eb" : "rgba(0,0,0,0.08)",
                      backgroundColor: String(report.elderly.id) === String(summary?.elderly.id) ? "#eff6ff" : "#fff",
                    }}
                  >
                    <div className="mb-1 text-sm" style={{ color: "#1a2b42", fontWeight: 700 }}>{report.elderly.name} ({report.elderly.id})</div>
                    <p className="text-sm leading-6" style={{ color: "#1a2b42" }}>{report.note || "-"}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border bg-white p-5" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
            <h3 className="mb-3 text-sm" style={{ color: "#1a2b42", fontWeight: 700 }}>Medication Detail</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc" }}>
                    {["Elderly", "Date", "Medicine", "Dosage", "Status"].map((column) => (
                      <th key={column} className="px-3 py-2 text-left text-xs" style={{ color: "#6b7a99" }}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {medicationRows.length === 0 ? (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-sm" style={{ color: "#6b7a99" }}>No completed, missed, or due-soon medication rows for this date range.</td></tr>
                  ) : medicationRows.map(({ report, item }) => (
                    <tr key={`${report.elderly.id}-${item.id}`} className="border-t" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
                      <td className="px-3 py-2 text-xs" style={{ color: "#1a2b42", fontWeight: 600 }}>{report.elderly.name}</td>
                      <td className="px-3 py-2 text-xs" style={{ color: "#1a2b42" }}>{displayDate(item.scheduledDate)} {item.scheduledTime}</td>
                      <td className="px-3 py-2 text-xs" style={{ color: "#1a2b42", fontWeight: 600 }}>{item.medicationName}</td>
                      <td className="px-3 py-2 text-xs" style={{ color: "#1a2b42" }}>{item.dosage}</td>
                      <td className="px-3 py-2 text-xs" style={{ color: item.complianceStatus === "Missed" ? "#dc2626" : "#16a34a" }}>{item.complianceStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <ProfileCard elderly={summary?.elderly || selectedElderly || null} startDate={startDate} endDate={endDate} />
          <TrendCard title="Blood Pressure Trend" data={bpTrend} lines={[{ key: "systolic", color: "#2563eb" }, { key: "diastolic", color: "#22c55e" }]} />
          <TrendCard title="Blood Glucose Trend" data={glucoseTrend} lines={[{ key: "glucose", color: "#f97316" }]} />
        </div>
      </div>

      {pdfPreviewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-5">
          <div className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
              <div>
                <div className="text-sm" style={{ color: "#1a2b42", fontWeight: 700 }}>PDF Preview</div>
                <div className="text-xs" style={{ color: "#6b7a99" }}>
                  Review all {summaries.length} generated report{summaries.length === 1 ? "" : "s"} before downloading.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => downloadProfessionalPdf(summaries)} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-white" style={{ backgroundColor: "#2563eb" }}>
                  <ArrowDown size={14} /> Download Combined PDF
                </button>
                <button onClick={() => setPdfPreviewUrl("")} className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "rgba(0,0,0,0.12)", color: "#6b7a99" }}>
                  Close
                </button>
              </div>
            </div>
            <iframe title="PDF report preview" src={pdfPreviewUrl} className="h-full w-full bg-slate-100" />
          </div>
        </div>
      )}
    </div>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <div className="mb-1 text-xs" style={{ color: "#6b7a99" }}>{label}</div>
      <input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border px-3 py-2 text-sm outline-none" style={{ borderColor: "rgba(0,0,0,0.12)", color: "#1a2b42" }} />
    </label>
  );
}

function SummaryCard({ icon, label, value, sub, status }: { icon: React.ReactNode; label: string; value: string; sub: string; status?: string }) {
  const style = conditionStyle(status || "");
  return (
    <div className="rounded-xl border bg-white p-4" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}>{icon}</div>
      <div className="mb-1 text-2xl" style={{ color: "#1a2b42", fontWeight: 700 }}>{value}</div>
      <div className="text-xs" style={{ color: "#1a2b42" }}>{label}</div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-xs" style={{ color: "#6b7a99" }}>{sub}</span>
        {status && <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ backgroundColor: style.bg, color: style.color, fontWeight: 700 }}>{status}</span>}
      </div>
    </div>
  );
}

function ProfileCard({ elderly, startDate, endDate }: { elderly: ElderlyProfile | null; startDate: string; endDate: string }) {
  return (
    <div className="rounded-xl border bg-white p-5" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
      <h3 className="mb-3 text-sm" style={{ color: "#1a2b42", fontWeight: 700 }}>Report Subject</h3>
      {elderly ? (
        <div className="space-y-2 text-sm" style={{ color: "#1a2b42" }}>
          <div style={{ fontWeight: 700 }}>{elderly.name}</div>
          <div className="text-xs" style={{ color: "#6b7a99" }}>ID: {elderly.id} | Age: {elderly.age} | Blood: {elderly.bloodType}</div>
          <div className="text-xs" style={{ color: "#6b7a99" }}>{elderly.medicalCondition}</div>
          <div className="rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: "#f8fafc", color: "#6b7a99" }}>
            Report period: {displayDate(startDate)} to {displayDate(endDate)}
          </div>
        </div>
      ) : (
        <div className="text-sm" style={{ color: "#6b7a99" }}>No elderly profile selected.</div>
      )}
    </div>
  );
}

function TrendCard({ title, data, lines }: { title: string; data: Record<string, string | number>[]; lines: { key: string; color: string }[] }) {
  return (
    <div className="rounded-xl border bg-white p-5" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
      <h3 className="mb-3 text-sm" style={{ color: "#1a2b42", fontWeight: 700 }}>{title}</h3>
      <div className="h-44">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm" style={{ color: "#6b7a99" }}>No readings in range.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis dataKey="date" hide />
              <YAxis />
              {lines.map((line) => (
                <Line key={line.key} type="monotone" dataKey={line.key} stroke={line.color} strokeWidth={2} dot={{ fill: line.color, r: 3 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
