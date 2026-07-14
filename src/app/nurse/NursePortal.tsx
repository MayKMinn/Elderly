import React, { useEffect, useState, useRef } from "react";
import {
  Activity, Pill, Stethoscope, Heart, Clock, Check, X, ChevronLeft,
  ChevronRight, Bell, AlertCircle, CheckCircle, Users, Calendar,
  LogOut, LayoutDashboard, Phone, AlertTriangle, Eye, EyeOff,
  LogIn, FileText
} from "lucide-react";
import { getMedicationAssignments, updateMedicationAssignmentStatus } from "../api/medications";
import type { MedicationAssignment } from "../api/medications";
import { getNurseElderlyAssignments, getProfiles } from "../api/profiles";
import type { ScheduleAssignment } from "../api/schedules";
import { updateScheduleStatus } from "../api/schedules";
import { fetchHealthLogs } from "../api/health";
import { MySchedules } from "./MySchedules";
import { AssignedResidentsSidebar, ResidentDetailsPanel, type Resident, type Status } from "./Residents";


// ── Auth types & store ─────────────────────────────────────────────────────

interface NurseAccount {
  id: string;
  fullName: string;
  username: string;
  email: string;
  licenseNo: string;
  password: string;
  joinedAt: string;
}

const SEED_NURSES: NurseAccount[] = [
  { id: "1", fullName: "Patricia Chen", username: "patricia", email: "patricia@elderease.com", licenseNo: "RN-4821", password: "nurse123", joinedAt: "2024-01-10" },
  { id: "2", fullName: "Thomas Wright", username: "thomas", email: "thomas@elderease.com",  licenseNo: "RN-3307", password: "nurse123", joinedAt: "2024-03-05" },
];

// ── Types ──────────────────────────────────────────────────────────────────

interface CheckEntry {
  residentId: number;
  type: "bp" | "medication" | "glucose";
  slot: "morning" | "evening";
  done: boolean;
  time: string | null;
  // BP
  systolic?: string; diastolic?: string;
  // Glucose
  glucoseValue?: string;
  // Medication
  medGiven?: boolean; notes?: string;
}

// ── Data ──────────────────────────────────────────────────────────────────

// nurse name injected at runtime
let NURSE_NAME = "Nurse";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TODAY = "Mon";

function makeChecks(residents: Resident[]): CheckEntry[] {
  const entries: CheckEntry[] = [];
  residents.forEach((r) => {
    (["bp", "medication", "glucose"] as const).forEach((type) => {
      (["morning", "evening"] as const).forEach((slot) => {
        entries.push({ residentId: r.id, type, slot, done: false, time: null });
      });
    });
  });
  return entries;
}

function normalizeDateKey(value: string | undefined | null) {
  return String(value || "").slice(0, 10);
}

function getCheckTypeForPurpose(purpose: string | undefined) {
  const normalized = String(purpose || "").toLowerCase();
  if (normalized.includes("blood pressure")) return "bp" as const;
  if (normalized.includes("glucose")) return "glucose" as const;
  if (normalized.includes("medication")) return "medication" as const;
  return null;
}

function getSlotForTime(timeValue: string | undefined) {
  const rawTime = String(timeValue || "").trim();
  const hourMatch = rawTime.match(/^(\d{1,2})/);
  if (!hourMatch) return "morning" as const;
  const hour = Number(hourMatch[1]);
  return Number.isFinite(hour) && hour >= 12 ? "evening" as const : "morning" as const;
}

function buildChecksFromSchedules(
  residents: Resident[],
  scheduleAssignments: ScheduleAssignment[],
  logs: any[]
): CheckEntry[] {
  const entries: CheckEntry[] = [];
  const todayKey = normalizeDateKey(new Date().toISOString());

  const todaySchedules = scheduleAssignments.filter((schedule) => normalizeDateKey(schedule.visitDate) === todayKey);

  residents.forEach((resident) => {
    const residentSchedules = todaySchedules.filter((schedule) => String(schedule.elderlyId) === String(resident.id));
    if (residentSchedules.length === 0) return;

    const residentLogs = logs.filter((log) => String(log.elderly_id ?? log.elderlyId ?? "") === String(resident.id));

    residentSchedules.forEach((schedule) => {
      const type = getCheckTypeForPurpose(schedule.purpose);
      if (!type) return;

      const slot = getSlotForTime(schedule.visitTime);
      const matchingLog = residentLogs.find((log) => {
        const logDate = normalizeDateKey(log.visitDate || log.visit_date || log.created_at);
        if (logDate !== todayKey) return false;
        const scheduleIdValue = String(log.schedule_id ?? log.scheduleId ?? "");
        if (scheduleIdValue && scheduleIdValue === String(schedule.id)) return true;
        const purposeValue = String(log.purpose || "").toLowerCase();
        return purposeValue.includes(String(schedule.purpose || "").toLowerCase());
      });

      const entry: CheckEntry = {
        residentId: resident.id,
        type,
        slot,
        done: Boolean(matchingLog),
        time: matchingLog ? String(matchingLog.visitTime || matchingLog.visit_time || "") : null,
      };

      if (matchingLog && type === "bp") {
        entry.systolic = matchingLog.systolic != null ? String(matchingLog.systolic) : undefined;
        entry.diastolic = matchingLog.diastolic != null ? String(matchingLog.diastolic) : undefined;
      }
      if (matchingLog && type === "glucose") {
        entry.glucoseValue = matchingLog.bloodSugar != null ? String(matchingLog.bloodSugar) : undefined;
      }
      if (matchingLog && type === "medication") {
        entry.medGiven = true;
        entry.notes = matchingLog.notes || "";
      }

      entries.push(entry);
    });
  });

  return entries;
}

// ── Constants ──────────────────────────────────────────────────────────────

const CHECK_META = {
  bp:         { label: "Blood Pressure",  shortLabel: "BP",         icon: Activity,   color: "text-red-600",    bg: "bg-red-50",    border: "border-red-200",    pill: "bg-red-100 text-red-700",    slotTimes: { morning: "07:00", evening: "19:00" } },
  medication: { label: "Medications",     shortLabel: "Meds",       icon: Pill,        color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200", pill: "bg-violet-100 text-violet-700", slotTimes: { morning: "08:00", evening: "20:00" } },
  glucose:    { label: "Blood Glucose",   shortLabel: "Glucose",    icon: Stethoscope, color: "text-amber-600",  bg: "bg-amber-50",  border: "border-amber-200",  pill: "bg-amber-100 text-amber-700",  slotTimes: { morning: "08:30", evening: "20:30" } },
} as const;

const statusColor: Record<Status, string> = {
  stable: "bg-emerald-100 text-emerald-700",
  attention: "bg-amber-100 text-amber-700",
  critical: "bg-red-100 text-red-700",
};
const statusDot: Record<Status, string> = {
  stable: "bg-emerald-400", attention: "bg-amber-400", critical: "bg-red-500"
};

// ── Small helpers ──────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function splitList(value: string | undefined) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function residentStatus(profile: { status?: string; medicalCondition?: string }): Status {
  if (profile.status === "Inactive") return "critical";

  const condition = String(profile.medicalCondition || "").toLowerCase();
  if (condition.includes("critical") || condition.includes("heart") || condition.includes("stroke")) {
    return "critical";
  }
  if (condition.includes("dementia") || condition.includes("alzheimer") || condition.includes("diabetes")) {
    return "attention";
  }

  return "stable";
}

function profileToResident(profile: {
  id: string | number;
  name: string;
  age?: number;
  gender?: string;
  dob?: string;
  birthdate?: string;
  avatar?: string;
  medicalCondition?: string;
  allergies?: string;
  bloodType?: string;
  status?: string;
  emergencyContact?: string;
  relationship?: string;
  emergencyPhone?: string;
}): Resident {
  return {
    id: Number(profile.id),
    name: profile.name,
    age: Number(profile.age) || 0,
    gender: profile.gender || "Not recorded",
    birthdate: profile.dob || profile.birthdate || "Not recorded",
    room: `ELD-${String(profile.id).padStart(4, "0")}`,
    photo: profile.avatar || `https://i.pravatar.cc/120?u=elderly-${profile.id}`,
    conditions: splitList(profile.medicalCondition),
    allergies: splitList(profile.allergies),
    bloodType: profile.bloodType || "N/A",
    status: residentStatus(profile),
    emergencyContact: {
      name: profile.emergencyContact || "Emergency contact",
      relation: profile.relationship || "Contact",
      phone: profile.emergencyPhone || "",
    },
  };
}

function now() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatLongDate(d: Date) {
  try {
    const day = d.toLocaleDateString(undefined, { weekday: 'short' });
    const month = d.toLocaleDateString(undefined, { month: 'long' });
    const date = d.getDate();
    const year = d.getFullYear();
    return `${day}, ${month} ${date}, ${year}`;
  } catch {
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const months = [
      'January','February','March','April','May','June','July','August','September','October','November','December'
    ];
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }
}

// ── Fill Form Modal ────────────────────────────────────────────────────────

function FillForm({ entry, resident, onSave, onClose }: {
  entry: CheckEntry; resident: Resident;
  onSave: (updated: Partial<CheckEntry>) => void;
  onClose: () => void;
}) {
  const meta = CHECK_META[entry.type];
  const [systolic, setSystolic] = useState(entry.systolic ?? "");
  const [diastolic, setDiastolic] = useState(entry.diastolic ?? "");
  const [glucoseValue, setGlucoseValue] = useState(entry.glucoseValue ?? "");
  const [medGiven, setMedGiven] = useState(entry.medGiven ?? false);
  const [notes, setNotes] = useState(entry.notes ?? "");

  function handleSave() {
    const base: Partial<CheckEntry> = { done: true, time: now(), notes };
    if (entry.type === "bp") Object.assign(base, { systolic, diastolic });
    if (entry.type === "glucose") Object.assign(base, { glucoseValue });
    if (entry.type === "medication") Object.assign(base, { medGiven });
    onSave(base);
  }

  const inputCls = "w-full px-3 py-2.5 text-sm bg-muted/60 border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/30 transition-all";

  // BP range check
  const bpWarn = entry.type === "bp" && systolic && (Number(systolic) > 140 || Number(systolic) < 90);
  const glucoseWarn = entry.type === "glucose" && glucoseValue && (Number(glucoseValue) > 126 || Number(glucoseValue) < 70);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-card w-full md:max-w-md rounded-t-3xl md:rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className={`${meta.bg} border-b ${meta.border} px-5 py-4 flex items-center gap-3`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${meta.bg} border ${meta.border}`}>
            <meta.icon size={20} className={meta.color} />
          </div>
          <div className="flex-1">
            <p className={`font-semibold text-sm ${meta.color}`}>{meta.label}</p>
            <p className="text-xs text-muted-foreground">{entry.slot === "morning" ? "Morning" : "Evening"} · {meta.slotTimes[entry.slot]}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg"><X size={18} /></button>
        </div>

        {/* Resident strip */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-muted/30">
          <div className="w-9 h-9 rounded-full overflow-hidden bg-muted flex-shrink-0">
            <img src={resident.photo} alt={resident.name} className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{resident.name}</p>
            <p className="text-xs text-muted-foreground">Age {resident.age}</p>
          </div>
          {resident.allergies.length > 0 && (
            <div className="ml-auto flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
              <AlertCircle size={10} /> {resident.allergies[0]}
            </div>
          )}
        </div>

        {/* Form body */}
        <div className="px-5 py-5 space-y-4">

          {entry.type === "bp" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Systolic (mmHg)</label>
                  <input type="number" className={inputCls} placeholder="e.g. 120" value={systolic} onChange={(e) => setSystolic(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Diastolic (mmHg)</label>
                  <input type="number" className={inputCls} placeholder="e.g. 80" value={diastolic} onChange={(e) => setDiastolic(e.target.value)} />
                </div>
              </div>
              {bpWarn && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertTriangle size={12} /> Systolic out of normal range — notify doctor if persistent.
                </div>
              )}
              {systolic && diastolic && (
                <div className={`rounded-xl border px-4 py-3 text-center ${bpWarn ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}>
                  <p className={`text-2xl font-bold ${bpWarn ? "text-red-700" : "text-emerald-700"}`} style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{systolic}/{diastolic}</p>
                  <p className={`text-xs mt-0.5 ${bpWarn ? "text-red-500" : "text-emerald-500"}`}>{bpWarn ? "Elevated" : "Normal range"}</p>
                </div>
              )}
            </>
          )}

          {entry.type === "glucose" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Blood Glucose (mg/dL)</label>
                <input type="number" className={inputCls} placeholder="e.g. 100" value={glucoseValue} onChange={(e) => setGlucoseValue(e.target.value)} />
              </div>
              {glucoseWarn && (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <AlertTriangle size={12} /> {Number(glucoseValue) > 126 ? "High glucose level — check insulin status." : "Low glucose level — provide snack immediately."}
                </div>
              )}
              {glucoseValue && (
                <div className={`rounded-xl border px-4 py-3 text-center ${glucoseWarn ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}>
                  <p className={`text-2xl font-bold ${glucoseWarn ? "text-amber-700" : "text-emerald-700"}`} style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{glucoseValue} <span className="text-sm font-normal">mg/dL</span></p>
                  <p className={`text-xs mt-0.5 ${glucoseWarn ? "text-amber-500" : "text-emerald-500"}`}>{glucoseWarn ? (Number(glucoseValue) > 126 ? "Above normal" : "Below normal") : "Normal range"}</p>
                </div>
              )}
            </>
          )}

          {entry.type === "medication" && (
            <>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Medication Status</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setMedGiven(true)}
                    className={`py-3 rounded-xl border text-sm font-semibold transition-all ${medGiven ? "bg-emerald-50 border-emerald-400 text-emerald-700" : "border-border text-muted-foreground hover:border-emerald-300"}`}
                  >
                    <Check size={15} className="mx-auto mb-1" /> Given
                  </button>
                  <button
                    onClick={() => setMedGiven(false)}
                    className={`py-3 rounded-xl border text-sm font-semibold transition-all ${!medGiven ? "bg-red-50 border-red-400 text-red-700" : "border-border text-muted-foreground hover:border-red-300"}`}
                  >
                    <X size={15} className="mx-auto mb-1" /> Refused / Missed
                  </button>
                </div>
              </div>
              {!medGiven && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertTriangle size={12} /> Log reason and notify supervisor.
                </div>
              )}
            </>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Notes <span className="font-normal">(optional)</span></label>
            <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Any observations…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm border border-border rounded-xl hover:bg-muted transition-colors font-medium">Cancel</button>
          <button
            onClick={handleSave}
            className="flex-2 flex-1 py-2.5 text-sm bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity font-semibold"
          >
            <Check size={14} className="inline mr-1.5" />Save Record
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Check Card ─────────────────────────────────────────────────────────────

function CheckCard({ entry, resident, onFill }: {
  entry: CheckEntry; resident: Resident;
  onFill: () => void;
}) {
  const meta = CHECK_META[entry.type];
  const slotLabel = entry.slot === "morning" ? "Morning" : "Evening";
  const scheduled = meta.slotTimes[entry.slot];

  return (
    <div className={`bg-card border rounded-2xl overflow-hidden transition-all ${entry.done ? "opacity-70" : "hover:shadow-md hover:border-primary/20"} border-border`}>
      {/* Top color band */}
      <div className={`h-1 ${entry.type === "bp" ? "bg-red-400" : entry.type === "medication" ? "bg-violet-400" : "bg-amber-400"}`} />

      <div className="p-4">
        {/* Resident */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative flex-shrink-0">
            <div className="w-11 h-11 rounded-full overflow-hidden bg-muted">
              <img src={resident.photo} alt={resident.name} className="w-full h-full object-cover" />
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${statusDot[resident.status]}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{resident.name}</p>
            <p className="text-xs text-muted-foreground"></p>
          </div>
          {resident.status === "critical" && (
            <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
          )}
        </div>

        {/* Check type row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${meta.bg}`}>
              <meta.icon size={14} className={meta.color} />
            </div>
            <span className={`text-xs font-semibold ${meta.color}`}>{meta.shortLabel}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            <Clock size={10} />
            {slotLabel} · {scheduled}
          </div>
        </div>

        {/* Result preview if done */}
        {entry.done && (
          <div className={`rounded-xl px-3 py-2 mb-3 ${meta.bg} border ${meta.border}`}>
            {entry.type === "bp" && (
              <p className={`text-sm font-bold ${meta.color}`} style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
                {entry.systolic}/{entry.diastolic} <span className="font-normal text-xs">mmHg</span>
              </p>
            )}
            {entry.type === "glucose" && (
              <p className={`text-sm font-bold ${meta.color}`} style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
                {entry.glucoseValue} <span className="font-normal text-xs">mg/dL</span>
              </p>
            )}
            {entry.type === "medication" && (
              <p className={`text-sm font-semibold ${entry.medGiven ? "text-emerald-600" : "text-red-600"}`}>
                {entry.medGiven ? "✓ Medication given" : "✗ Missed / Refused"}
              </p>
            )}
            {entry.notes && <p className="text-xs text-muted-foreground mt-0.5 truncate">{entry.notes}</p>}
            <p className="text-xs text-muted-foreground mt-0.5">Logged at {entry.time}</p>
          </div>
        )}

        {/* Action button */}
        <button
          onClick={onFill}
          className={`w-full py-2 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            entry.done
              ? "bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100"
              : `${meta.bg} border ${meta.border} ${meta.color} hover:opacity-80`
          }`}
        >
          {entry.done ? <><CheckCircle size={14} /> Edit Record</> : <><meta.icon size={14} /> Fill {meta.shortLabel}</>}
        </button>
      </div>
    </div>
  );
}

// ── Pages ──────────────────────────────────────────────────────────────────

function SchedulePage({ residents, checks, setChecks, isLoading, error }: {
  residents: Resident[];
  checks: CheckEntry[];
  setChecks: React.Dispatch<React.SetStateAction<CheckEntry[]>>;
  isLoading: boolean;
  error: string;
}) {
  const [selectedResidentId, setSelectedResidentId] = useState<number | null>(residents[0]?.id ?? null);
  const [activeDay, setActiveDay] = useState(TODAY);
  const [activeSlot, setActiveSlot] = useState<"morning" | "evening">("morning");
  const [filling, setFilling] = useState<{ entry: CheckEntry; idx: number } | null>(null);

  useEffect(() => {
    if (residents.length === 0) {
      setSelectedResidentId(null);
      return;
    }

    setSelectedResidentId((current) => (
      current && residents.some((resident) => resident.id === current) ? current : residents[0].id
    ));
  }, [residents]);

  const selectedResident = residents.find((resident) => resident.id === selectedResidentId) ?? residents[0];

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-2xl px-5 py-10 text-center text-sm text-muted-foreground">
        Loading assigned residents...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-5 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!selectedResident) {
    return (
      <div className="bg-card border border-border rounded-2xl px-5 py-10 text-center text-sm text-muted-foreground">
        No elderly residents are assigned to you yet.
      </div>
    );
  }

  const selectedSlotChecks = checks
    .map((entry, idx) => ({ entry, idx }))
    .filter(({ entry }) => entry.residentId === selectedResidentId && entry.slot === activeSlot);

  const doneSlot = selectedSlotChecks.filter(({ entry }) => entry.done).length;
  const remaining = Math.max(selectedSlotChecks.length - doneSlot, 0);

  function saveEntry(idx: number, updates: Partial<CheckEntry>) {
    setChecks((prev) => prev.map((entry, i) => (i === idx ? { ...entry, ...updates } : entry)));
    setFilling(null);
  }

  function doneForResident(residentId: number) {
    return checks.filter((entry) => entry.residentId === residentId && entry.slot === activeSlot && entry.done).length;
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Select resident */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
          Select Resident
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {residents.map((resident) => {
            const active = selectedResidentId === resident.id;
            const residentDone = doneForResident(resident.id);

            return (
              <button
                key={resident.id}
                onClick={() => setSelectedResidentId(resident.id)}
                className={`flex items-center gap-3 p-3 rounded-xl border bg-card text-left transition-all ${
                  active
                    ? "border-primary shadow-sm ring-1 ring-primary/10"
                    : "border-border hover:border-primary/40 hover:bg-primary/5"
                }`}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-muted">
                    <img src={resident.photo} alt={resident.name} className="w-full h-full object-cover" />
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${statusDot[resident.status]}`} />
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
                    {resident.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Room {resident.room} · {residentDone}/3 done
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Day selector */}
      <div className="grid grid-cols-7 gap-1 bg-muted p-1 rounded-xl">
        {DAYS.map((day) => (
          <button
            key={day}
            onClick={() => setActiveDay(day)}
            className={`py-2 rounded-lg text-sm font-medium transition-all ${
              activeDay === day
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-card"
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Slot toggle */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl w-fit mx-auto">
        {(["morning", "evening"] as const).map((slot) => (
          <button
            key={slot}
            onClick={() => setActiveSlot(slot)}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${
              activeSlot === slot
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {slot === "morning" ? "🌅 Morning" : "🌙 Evening"}
          </button>
        ))}
      </div>

      {/* Progress summary */}
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
        <div className="relative w-12 h-12 flex-shrink-0">
          <svg viewBox="0 0 48 48" className="w-full h-full -rotate-90">
            <circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" strokeWidth="5" className="text-muted" />
            <circle
              cx="24"
              cy="24"
              r="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="5"
              strokeDasharray={`${selectedSlotChecks.length ? (doneSlot / selectedSlotChecks.length) * 113.1 : 0} 113.1`}
              className="text-primary transition-all"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">
            {doneSlot}/{selectedSlotChecks.length}
          </span>
        </div>

        <div>
          <p className="font-semibold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            {selectedResident.name}
          </p>
          <p className="text-sm text-muted-foreground">
            {activeDay} · {activeSlot === "morning" ? "Morning" : "Evening"} ·{" "}
            {remaining === 0 ? "All checks completed ✓" : `${remaining} remaining`}
          </p>
        </div>
      </div>

      {/* Resident profile card */}
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-muted">
            <img src={selectedResident.photo} alt={selectedResident.name} className="w-full h-full object-cover" />
          </div>
          <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-card ${statusDot[selectedResident.status]}`} />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-semibold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              {selectedResident.name}
            </h3>
            <span className={`text-xs px-2 py-1 rounded-full font-semibold capitalize ${statusColor[selectedResident.status]}`}>
              {selectedResident.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Age {selectedResident.age} · {selectedResident.bloodType}
          </p>
        </div>
      </div>

      {/* Selected resident checks */}
      <div className="flex flex-col gap-3">
        {selectedSlotChecks.map(({ entry, idx }) => (
          <CheckCard
            key={`${entry.residentId}-${entry.type}-${entry.slot}`}
            entry={entry}
            resident={selectedResident}
            onFill={() => setFilling({ entry, idx })}
          />
        ))}
      </div>

      {/* Fill modal */}
      {filling && (
        <FillForm
          entry={filling.entry}
          resident={residents.find((resident) => resident.id === filling.entry.residentId)!}
          onSave={(updates) => saveEntry(filling.idx, updates)}
          onClose={() => setFilling(null)}
        />
      )}
    </div>
  );
}

function WeeklyReportPage({ residents, checks, weeklyLogs, loading }: { residents: Resident[]; checks: CheckEntry[]; weeklyLogs: any[]; loading: boolean }) {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const rawSelectedDate = new Date(selectedDate);
  const selectedDateObj = Number.isNaN(rawSelectedDate.getTime()) ? new Date() : rawSelectedDate;

  const logsThisWeek = Array.isArray(weeklyLogs) ? weeklyLogs : [];
  const normalizedDates = logsThisWeek
    .map((log) => String(log.visitDate || log.visit_date || "").slice(0, 10))
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));

  const fallbackWeekStart = new Date(selectedDateObj);
  fallbackWeekStart.setDate(fallbackWeekStart.getDate() - fallbackWeekStart.getDay());
  fallbackWeekStart.setHours(0, 0, 0, 0);
  const fallbackWeekEnd = new Date(fallbackWeekStart);
  fallbackWeekEnd.setDate(fallbackWeekStart.getDate() + 6);
  fallbackWeekEnd.setHours(23, 59, 59, 999);

  const weekStart = normalizedDates.length > 0
    ? (() => {
        const start = new Date(normalizedDates[0]);
        start.setHours(0, 0, 0, 0);
        return start;
      })()
    : fallbackWeekStart;
  const weekEnd = normalizedDates.length > 0
    ? (() => {
        const end = new Date(normalizedDates[normalizedDates.length - 1]);
        end.setHours(23, 59, 59, 999);
        return end;
      })()
    : fallbackWeekEnd;

  const weekLabel = `${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} – ${weekEnd.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
  const weekDateLabel = `${weekStart.toLocaleDateString(undefined, { weekday: "short" })} – ${weekEnd.toLocaleDateString(undefined, { weekday: "short" })}`;

  const filteredLogs = logsThisWeek.filter((log) => {
    const dateValue = String(log.visitDate || log.visit_date || "").slice(0, 10);
    const date = new Date(dateValue);
    return !Number.isNaN(date.getTime()) && date >= weekStart && date <= weekEnd;
  });

  const recordCount = filteredLogs.length;
  const uniqueResidentIds = Array.from(new Set(filteredLogs.map((log) => String(log.elderly_id ?? log.elderlyId ?? "")))).filter(Boolean);
  const residentWithRecordCount = uniqueResidentIds.length;
  const days = Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const key = date.toISOString().slice(0, 10);
    const count = filteredLogs.filter((log) => String(log.visitDate || log.visit_date || "").slice(0, 10) === key).length;
    return {
      day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][index],
      date: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      count,
    };
  });

  const daysWithRecords = days.filter((day) => day.count > 0).length;
  const averagePerResident = residentWithRecordCount === 0 ? 0 : Math.round((recordCount / residentWithRecordCount) * 10) / 10;
  const maxDailyCount = Math.max(...days.map((day) => day.count), 1);

  const logsByResident = residents.reduce<Record<string, any[]>>((groups, resident) => {
    const key = String(resident.id);
    groups[key] = filteredLogs.filter((log) => String(log.elderly_id ?? log.elderlyId ?? "") === key);
    return groups;
  }, {});

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Weekly Record to Admin</p>
            <h3 className="text-xl font-semibold text-foreground mt-1" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
              {weekLabel}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">Showing records from {weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} through {weekEnd.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}.</p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="weekly-record-date" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Search week by date</label>
            <input
              id="weekly-record-date"
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold text-foreground">{recordCount}</p>
          <p className="text-xs text-muted-foreground">Records this week</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold text-foreground">{residentWithRecordCount}</p>
          <p className="text-xs text-muted-foreground">Residents recorded</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold text-foreground">{residents.length}</p>
          <p className="text-xs text-muted-foreground">Residents</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold text-foreground">{daysWithRecords}</p>
          <p className="text-xs text-muted-foreground">Days with entries</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>Weekly Record Summary</h4>
            <p className="text-xs text-muted-foreground">{weekLabel}</p>
          </div>
          <p className="text-xs text-muted-foreground">{weekDateLabel}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-5">
          <div className="bg-muted/50 border border-border rounded-2xl p-4">
            <p className="text-2xl font-bold text-foreground">{recordCount}</p>
            <p className="text-xs text-muted-foreground">Records this week</p>
          </div>
          <div className="bg-muted/50 border border-border rounded-2xl p-4">
            <p className="text-2xl font-bold text-foreground">{residentWithRecordCount}</p>
            <p className="text-xs text-muted-foreground">Residents recorded</p>
          </div>
          <div className="bg-muted/50 border border-border rounded-2xl p-4">
            <p className="text-2xl font-bold text-foreground">{daysWithRecords}</p>
            <p className="text-xs text-muted-foreground">Days with entries</p>
          </div>
          <div className="bg-muted/50 border border-border rounded-2xl p-4">
            <p className="text-2xl font-bold text-foreground">{averagePerResident}</p>
            <p className="text-xs text-muted-foreground">Avg records per resident</p>
          </div>
        </div>

        <div className="divide-y divide-border">
          {days.map((day) => {
            const percent = Math.round((day.count / maxDailyCount) * 100);

            return (
              <div key={day.day} className="px-5 py-4 flex items-center gap-4">
                <div className="w-12">
                  <p className="text-sm font-semibold text-foreground">{day.day}</p>
                  <p className="text-xs text-muted-foreground">{day.date}</p>
                </div>

                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${percent}%` }} />
                </div>

                <p className="text-sm font-semibold text-muted-foreground w-14 text-right">
                  {day.count}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h4 className="font-semibold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>Weekly Records by Resident</h4>
        </div>

        <div className="divide-y divide-border">
          {residents.map((resident) => {
            const residentLogs = logsByResident[String(resident.id)] || [];
            const latestLog = residentLogs.sort((a, b) => String(b.visit_time || b.recorded_time || "").localeCompare(String(a.visit_time || a.recorded_time || "")))[0];

            return (
              <div key={resident.id} className="px-5 py-4 flex items-center gap-4">
                <div className="w-11 h-11 rounded-full overflow-hidden bg-muted flex-shrink-0">
                  <img src={resident.photo} alt={resident.name} className="w-full h-full object-cover" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{resident.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {residentLogs.length} record{residentLogs.length === 1 ? "" : "s"} · Latest: {latestLog ? `${String(latestLog.visitDate || latestLog.visit_date || "")} ${String(latestLog.visitTime || latestLog.visit_time || "")}` : "No records this week"}
                  </p>
                </div>

                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${statusColor[resident.status]}`}>
                  {resident.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

// ── Auth Screen ────────────────────────────────────────────────────────────

function AuthScreen({ onAuth }: { onAuth: (name: string) => void }) {
  const [nurses] = useState<NurseAccount[]>(SEED_NURSES);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");

  // Login form
  const [login, setLogin] = useState("");
  const [loginPw, setLoginPw] = useState("");

  const inputCls = "w-full px-4 py-3 text-sm bg-input-background border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-muted-foreground";

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const loginValue = login.trim().toLowerCase();
    const nurse = nurses.find((n) => (
      (n.email.toLowerCase() === loginValue || n.username.toLowerCase() === loginValue) &&
      n.password === loginPw
    ));
    if (!nurse) { setError("Incorrect username/email or password."); return; }
    NURSE_NAME = nurse.fullName;
    onAuth(nurse.fullName);
  }

  return (
    <div className="nurse-theme min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30">
            <Heart size={28} className="text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>ElderEase</h1>
          <p className="text-muted-foreground mt-1 text-sm">Nurse Management Portal</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
          <div className="flex items-center justify-center gap-2 border-b border-border bg-primary/5 py-4 text-sm font-semibold text-primary">
            <LogIn size={15} />
            Sign In
          </div>

          <div className="p-6">
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
                <AlertCircle size={14} className="flex-shrink-0" />{error}
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Username or Email</label>
                <input type="text" className={inputCls} placeholder="username or email" value={login} onChange={(e) => setLogin(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Password</label>
                <div className="relative">
                  <input type={showPw ? "text" : "password"} className={inputCls + " pr-11"} placeholder="Enter password" value={loginPw} onChange={(e) => setLoginPw(e.target.value)} required />
                  <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 mt-2">
                <LogIn size={16} /> Sign In
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-5">
          ElderEase Nurse Portal · Secure access only
        </p>
      </div>
    </div>
  );
}

// ── App ────────────────────────────────────────────────────────────────────

type Page = "overview" | "schedule" | "residents" | "weeklyReport";

interface NursePortalProps {
  nurseName?: string;
  nurseId?: string;
  nurseProfile?: {
    id?: number;
    name?: string;
    username?: string;
    email?: string | null;
    licenseNumber?: string | null;
    position?: string | null;
    avatar?: string | null;
  } | null;
  onSignOut?: () => void;
}

export function NursePortal({ nurseName = "Nurse", nurseId, nurseProfile, onSignOut }: NursePortalProps) {
  const [page, setPage] = useState<Page>("overview");
  const [collapsed, setCollapsed] = useState(false);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [residentsLoading, setResidentsLoading] = useState(false);
  const [residentsError, setResidentsError] = useState("");
  const [checks, setChecks] = useState<CheckEntry[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [medicationAssignments, setMedicationAssignments] = useState<MedicationAssignment[]>([]);
  const [scheduleAssignments, setScheduleAssignments] = useState<ScheduleAssignment[]>([]);
  const [healthLogs, setHealthLogs] = useState<any[]>([]);
  const [weeklyLogs, setWeeklyLogs] = useState<any[]>([]);
  const [weeklyLogsLoading, setWeeklyLogsLoading] = useState(false);
  const [selectedResidentId, setSelectedResidentId] = useState<number | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [hiddenScheduleNotificationIds, setHiddenScheduleNotificationIds] = useState<number[]>([]);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const currentNurseId = nurseId || (nurseProfile?.id ? String(nurseProfile.id) : undefined);

  const displayName = nurseProfile?.name || nurseName || "Nurse";
  const displayUsername = nurseProfile?.username || "-";
  const displayEmail = nurseProfile?.email || "-";
  const displayLicenseNumber = nurseProfile?.licenseNumber || "-";
  const displayPosition = nurseProfile?.position || "Nurse";
  const displayAvatar = String(nurseProfile?.avatar || "").trim();
  const todayKey = new Date().toISOString().slice(0, 10);
  const todaySchedules = scheduleAssignments.filter((item) => normalizeDateKey(item.visitDate) === todayKey);
  const todayCompleted = todaySchedules.filter((item) => String(item.scheduleStatus).toLowerCase() === "completed").length;
  const todayMissed = todaySchedules.filter((item) => String(item.scheduleStatus).toLowerCase() === "missed").length;
  const activeSchedules = todaySchedules.filter((item) => String(item.scheduleStatus).toLowerCase() === "scheduled").length;
  const totalChecks = checks.length;
  const doneChecks = checks.filter((c) => c.done).length;
  const morningPending = checks.filter((c) => c.slot === "morning" && !c.done).length;
  const eveningPending = checks.filter((c) => c.slot === "evening" && !c.done).length;
  const criticalCount = residents.filter((r) => r.status === "critical").length;
  const visibleScheduleNotifications = scheduleAssignments.filter((item) =>
    item.scheduleStatus === "scheduled" && (!item.visitDate || item.visitDate >= todayKey) && !hiddenScheduleNotificationIds.includes(item.id)
  );
  const scheduleNotificationCount = visibleScheduleNotifications.length;
  const notificationCount = scheduleNotificationCount;

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (notificationRef.current && !notificationRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
    };

    window.addEventListener("mousedown", handleOutsideClick);
    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadResidents = async () => {
      if (!currentNurseId) {
        setResidents([]);
        setChecks([]);
        return;
      }

      setResidentsLoading(true);
      setResidentsError("");

      try {
        // Prefer the aggregated profiles endpoint which returns elderly + nurse assignments
        let assignedResidents: Resident[] = [];
        try {
          const profilesResp = await getProfiles();
          if (!ignore && (profilesResp as any)) {
            const elderlyList: any[] = Array.isArray((profilesResp as any).elderly) ? (profilesResp as any).elderly : [];
            const assignments: any[] = Array.isArray((profilesResp as any).nurseElderlyAssignments) ? (profilesResp as any).nurseElderlyAssignments : [];
            const nurseIdNum = String(currentNurseId);
            const matches = assignments.filter((a: any) => String(a.nurseId) === nurseIdNum).map((a: any) => String(a.elderlyId));

            const matchedProfiles = elderlyList.filter((p: any) => matches.includes(String(p.id ?? p.elderly_id ?? p.elderlyId))).map((p: any) => profileToResident(p));
            if (matchedProfiles.length > 0) {
              assignedResidents = matchedProfiles;
            }
          }
        } catch (errProfiles) {
          console.warn("profiles endpoint failed, falling back to nurse-specific endpoint", errProfiles);
        }

        // If no assignments found yet, try the nurse-specific endpoint
        if (assignedResidents.length === 0) {
          const response = await getNurseElderlyAssignments(currentNurseId);
          if (!ignore && Array.isArray(response.assignments) && response.assignments.length > 0) {
            const elderlyIds = response.assignments.map((a: any) => String(a.elderlyId));
            try {
              const profilesResp2 = await getProfiles();
              const elderlyList2: any[] = Array.isArray((profilesResp2 as any).elderly) ? (profilesResp2 as any).elderly : [];
              const matchedProfiles2 = elderlyList2.filter((p: any) => elderlyIds.includes(String(p.id ?? p.elderly_id ?? p.elderlyId))).map((p: any) => profileToResident(p));
              if (matchedProfiles2.length > 0) assignedResidents = matchedProfiles2;
            } catch (joinErr) {
              console.warn("Failed to join assignments to profiles", joinErr);
            }

            if (assignedResidents.length === 0) {
              assignedResidents = response.assignments.map((a: any) => ({
                id: Number(a.elderlyId),
                name: `Elderly ${a.elderlyId}`,
                age: 0,
                gender: "Not recorded",
                birthdate: "Not recorded",
                room: `ELD-${String(a.elderlyId).padStart(4, "0")}`,
                photo: `https://i.pravatar.cc/120?u=elderly-${a.elderlyId}`,
                conditions: [],
                allergies: [],
                bloodType: "N/A",
                status: "stable" as Status,
                emergencyContact: { name: "Emergency contact", relation: "", phone: "" },
              }));
            }
          }
        }

        // If direct endpoint returned nothing, try a broader profiles fetch as a fallback
        if (assignedResidents.length === 0) {
          try {
            const profilesResp = await fetch(`/api/profiles`).then((r) => r.ok ? r.json() : Promise.reject(r));
            if (!ignore && Array.isArray((profilesResp as any).nurseElderlyAssignments)) {
              const nurseIdNum = Number(currentNurseId);
              const matches = (profilesResp as any).nurseElderlyAssignments
                .filter((a: any) => Number(a.nurseId) === nurseIdNum)
                .map((a: any) => a.elderlyId);

              const elderlyList = Array.isArray((profilesResp as any).elderly) ? (profilesResp as any).elderly : [];
              const matchedProfiles = elderlyList.filter((e: any) => matches.includes(Number(e.elderly_id))).map((p: any) => profileToResident(p));
              if (matchedProfiles.length > 0) {
                setResidents(matchedProfiles);
                setChecks(makeChecks(matchedProfiles));
                return;
              }
            }
          } catch (pfError) {
            // ignore fallback error and continue to set empty list below
            console.warn("profiles fallback failed", pfError);
          }
        }

        setResidents(assignedResidents);
        setChecks(makeChecks(assignedResidents));
      } catch (error) {
        if (!ignore) {
          setResidents([]);
          setChecks([]);
          setResidentsError("Could not load your assigned elderly residents.");
          console.error("Failed to load assigned residents.", error);
        }
      } finally {
        if (!ignore) setResidentsLoading(false);
      }
    };

    loadResidents();

    return () => {
      ignore = true;
    };
  }, [currentNurseId]);

  useEffect(() => {
    let ignore = false;

    const loadNotifications = async () => {
      if (!currentNurseId) {
        setMedicationAssignments([]);
        setScheduleAssignments([]);
        setHealthLogs([]);
        return;
      }

      try {
        const [medicationResponse, scheduleResponse, healthResponse] = await Promise.all([
          getMedicationAssignments(nurseName),
          fetch(`/api/schedules?nurseId=${encodeURIComponent(currentNurseId)}`)
            .then(async (response) => {
              if (!response.ok) {
                throw new Error(await response.text());
              }
              return response.json();
            }),
          fetchHealthLogs({ nurseId: currentNurseId, limit: 500 }),
        ]);

        if (!ignore) {
          setMedicationAssignments(medicationResponse.medications);
          setScheduleAssignments(scheduleResponse.schedules || []);
          setHealthLogs(Array.isArray(healthResponse.logs) ? healthResponse.logs : []);
        }
      } catch (error) {
        console.error("Failed to load nurse notifications.", error);
      }
    };

    loadNotifications();
    const interval = window.setInterval(loadNotifications, 15000);

    return () => {
      ignore = true;
      window.clearInterval(interval);
    };
  }, [currentNurseId, nurseName]);

  useEffect(() => {
    if (!currentNurseId) {
      setChecks([]);
      return;
    }

    const nextChecks = buildChecksFromSchedules(residents, scheduleAssignments, healthLogs);
    setChecks(nextChecks);
  }, [currentNurseId, residents, scheduleAssignments, healthLogs]);

  useEffect(() => {
    let ignore = false;

    const loadWeeklyLogs = async () => {
      if (!currentNurseId || page !== "weeklyReport") {
        setWeeklyLogs([]);
        return;
      }

      setWeeklyLogsLoading(true);
      try {
        const response = await fetchHealthLogs({ nurseId: currentNurseId, limit: 500 });
        if (ignore) return;

        const today = new Date();
        const sunday = new Date(today);
        sunday.setDate(today.getDate() - today.getDay());
        sunday.setHours(0, 0, 0, 0);
        const saturday = new Date(sunday);
        saturday.setDate(sunday.getDate() + 6);
        saturday.setHours(23, 59, 59, 999);

        const logs = Array.isArray(response.logs) ? response.logs : [];

        if (!ignore) {
          setWeeklyLogs(logs);
        }
      } catch (error) {
        if (!ignore) {
          setWeeklyLogs([]);
        }
        console.error("Failed to load weekly records.", error);
      } finally {
        if (!ignore) {
          setWeeklyLogsLoading(false);
        }
      }
    };

    loadWeeklyLogs();
  }, [currentNurseId, page]);

  async function reportMedicationStatus(id: number, complianceStatus: "Taken" | "Missed") {
    setNotificationMessage("");

    try {
      const updated = await updateMedicationAssignmentStatus(id, complianceStatus);
      setMedicationAssignments((prev) => prev.map((item) => (item.id === id ? updated : item)));
      setNotificationMessage(`Medication marked as ${complianceStatus}.`);
    } catch (error) {
      setNotificationMessage("Failed to update medication status.");
      console.error(error);
    }
  }

  async function markScheduleMissed(id: number) {
    setNotificationMessage("");

    try {
      const updated = await updateScheduleStatus(id, "missed");
      setScheduleAssignments((prev) => prev.map((item) => (item.id === id ? updated : item)));
      setNotificationMessage("Schedule marked as missed.");
    } catch (error) {
      setNotificationMessage("Failed to mark schedule as missed.");
      console.error(error);
    }
  }

  const nav: { id: Page; label: string; icon: React.ElementType }[] = [
    { id: "overview",     label: "Overview",      icon: LayoutDashboard },
    { id: "schedule",     label: "My Schedule",   icon: Calendar },
    { id: "residents",    label: "Elderly",       icon: Users },
    { id: "weeklyReport", label: "Weekly Record", icon: FileText },
  ];

  return (
    <div className="nurse-theme flex h-screen bg-background" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>

      {/* Sidebar */}
      <aside
        className={`flex flex-col h-full flex-shrink-0 border-r transition-all duration-200 ${
          collapsed ? "w-20" : "w-56"
        }`}
        style={{ backgroundColor: "#ffffff", borderColor: "rgba(0,0,0,0.08)" }}
      >
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
              <p className="text-sm leading-tight" style={{ color: "#1a2b42", fontWeight: 700 }}>ElderEase Nurse</p>
              <p className="text-xs" style={{ color: "#6b7a99" }}>Care Management Portal</p>
            </div>
          )}
        </div>

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

          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setPage(id)}
              className={`w-full flex items-center rounded-xl text-sm transition-all ${
                collapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-3 py-2.5"
              }`}
              style={{
                color: page === id ? "#ffffff" : "#6b7a99",
                backgroundColor: page === id ? "#2563eb" : "transparent",
                fontWeight: page === id ? 600 : 400,
              }}
              onMouseEnter={(e) => {
                if (page !== id) e.currentTarget.style.backgroundColor = "#f0f5ff";
              }}
              onMouseLeave={(e) => {
                if (page !== id) e.currentTarget.style.backgroundColor = "transparent";
              }}
              title={label}
            >
              <Icon size={17} className="flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 pb-4 border-t pt-3 space-y-2" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
          <button
            onClick={() => {
              setChecks(makeChecks(residents));
              setPage("schedule");
              onSignOut?.();
            }}
            className={`w-full flex items-center rounded-xl text-sm transition-all ${
              collapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-3 py-2.5"
            }`}
            style={{ color: "#6b7a99" }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f8fafc"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
            title="Log out"
          >
            <LogOut size={17} />
            {!collapsed && <span>Log out</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm border-b border-border px-6 py-3.5 flex items-center justify-between">
          <h2 className="font-semibold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
            {nav.find((n) => n.id === page)?.label}
          </h2>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
              <Clock size={11} /> {formatLongDate(new Date())}
            </div>
            <div ref={notificationRef} className="relative">
              <button
                onClick={() => setNotificationsOpen((open) => !open)}
                className="relative p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
                title="Notifications"
              >
                <Bell size={15} />
                {notificationCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                    {notificationCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-88 overflow-hidden rounded-xl border bg-white shadow-xl" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
                  <div className="border-b px-4 py-3" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
                    <div className="text-sm" style={{ color: "#1a2b42", fontWeight: 700 }}>Notifications</div>
                    <div className="text-xs" style={{ color: "#6b7a99" }}>Medication and schedule updates from admin</div>
                  </div>
                  {notificationMessage && (
                    <div className="mx-3 mt-3 rounded-lg px-3 py-2 text-xs" style={{
                      backgroundColor: notificationMessage.startsWith("Failed") ? "#fee2e2" : "#dcfce7",
                      color: notificationMessage.startsWith("Failed") ? "#dc2626" : "#15803d",
                    }}>
                      {notificationMessage}
                    </div>
                  )}
                  <div className="max-h-96 overflow-y-auto p-2">
                    {visibleScheduleNotifications.length === 0 ? (
                      <div className="px-3 py-6 text-center text-xs" style={{ color: "#6b7a99" }}>
                        No schedule notifications for {nurseName}.
                      </div>
                    ) : (
                      <div className="mb-3">
                        <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#6b7a99" }}>Schedules</div>
                        {visibleScheduleNotifications.map((item) => (
                          <div key={item.id} className="w-full rounded-lg border p-3 mb-2 text-left" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-xs" style={{ color: "#1a2b42", fontWeight: 700 }}>{item.purpose}</div>
                                <div className="text-xs" style={{ color: "#6b7a99" }}>{item.elderlyName}</div>
                                <div className="text-xs" style={{ color: "#6b7a99" }}>{item.visitDate} at {item.visitTime}</div>
                              </div>
                              <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ backgroundColor: "#dbeafe", color: "#1d4ed8", fontWeight: 700 }}>
                                Open
                              </span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setHiddenScheduleNotificationIds((prev) => [...prev, item.id]);
                                  setNotificationsOpen(false);
                                  setPage("schedule");
                                  setSelectedScheduleId(item.id);
                                }}
                                className="rounded-lg border px-2 py-1.5 text-[11px] font-semibold hover:bg-slate-50"
                                style={{ borderColor: "rgba(0,0,0,0.08)", color: "#1d4ed8" }}
                              >
                                Open
                              </button>
                              <button
                                type="button"
                                onClick={() => markScheduleMissed(item.id)}
                                className="rounded-lg border px-2 py-1.5 text-[11px] font-semibold hover:bg-red-50"
                                style={{ borderColor: "#fecaca", color: "#dc2626" }}
                              >
                                Missed
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
              <div ref={profileRef} className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen((open) => !open)}
                  className="flex items-center gap-2 rounded-2xl pl-1 pr-2 py-1 hover:bg-white"
                  title="Nurse profile"
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden text-white font-bold text-xs flex-shrink-0 border-2"
                    style={{ backgroundColor: "#2563eb", borderColor: "#dbeafe" }}
                  >
                    {displayAvatar ? (
                      <img src={displayAvatar} alt={displayName} className="h-full w-full object-cover" />
                    ) : (
                      initials(displayName)
                    )}
                  </div>

                  <div className="hidden sm:block text-left">
                    <div className="text-xs" style={{ color: "#1a2b42", fontWeight: 600 }}>{displayName}</div>
                    <div className="text-xs" style={{ color: "#6b7a99" }}>{displayPosition}</div>
                  </div>
                </button>

                {profileOpen && (
                  <div
                    className="absolute right-0 top-full z-50 mt-3 w-80 overflow-hidden rounded-2xl border bg-white shadow-2xl"
                    style={{ borderColor: "rgba(0,0,0,0.08)" }}
                  >
                    <div className="flex items-center gap-3 p-5">
                      <div
                        className="h-16 w-16 rounded-full flex items-center justify-center overflow-hidden text-white text-lg font-bold border-2"
                        style={{ backgroundColor: "#2563eb", borderColor: "#dbeafe" }}
                      >
                        {displayAvatar ? (
                          <img src={displayAvatar} alt={displayName} className="h-full w-full object-cover" />
                        ) : (
                          initials(displayName)
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="text-sm" style={{ color: "#1a2b42", fontWeight: 700 }}>{displayName}</div>
                        <div className="text-xs" style={{ color: "#6b7a99" }}>{displayPosition}</div>
                      </div>
                    </div>

                    <div className="border-t px-5 py-4" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
                      <div className="mb-2 text-sm" style={{ color: "#1a2b42", fontWeight: 700 }}>
                        Nurse profile details
                      </div>

                      <NurseProfileRow label="Username" value={displayUsername} />
                      <NurseProfileRow label="Name" value={displayName} />
                      <NurseProfileRow label="Email" value={displayEmail} />
                      <NurseProfileRow label="License Number" value={displayLicenseNumber} />
                      <NurseProfileRow label="Position" value={displayPosition} />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        setChecks(makeChecks(residents));
                        setPage("schedule");
                        onSignOut?.();
                      }}
                      className="flex w-full items-center gap-2 border-t px-5 py-4 text-sm font-semibold hover:bg-red-50"
                      style={{ borderColor: "rgba(0,0,0,0.07)", color: "#dc2626" }}
                    >
                      <LogOut size={16} />
                      Log out
                    </button>
                  </div>
                )}
              </div>
          </div>
        </div>

        <div className="p-5 max-w-5xl mx-auto">
          {page === "overview" && (
            <div className="flex flex-col gap-5">
              {/* Greeting */}
              <div className="bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border border-border rounded-2xl p-5">
                <p className="text-sm text-muted-foreground">Good morning,</p>
                <h3 className="text-2xl font-semibold text-foreground mt-0.5" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{nurseName}</h3>
                <p className="text-sm text-muted-foreground mt-1.5">
                  You have <strong className="text-foreground">{activeSchedules} active schedules</strong> and <strong className="text-foreground">{todayCompleted} completed</strong> today for <strong className="text-foreground">{residents.length} residents</strong>.
                </p>
              </div>

              {/* KPI cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Residents", value: residents.length, icon: Users, color: "bg-primary/10 text-primary" },
                  { label: "Active Today", value: activeSchedules, icon: Calendar, color: "bg-emerald-100 text-emerald-600" },
                  { label: "Completed Today", value: todayCompleted, icon: CheckCircle, color: "bg-emerald-100 text-emerald-600" },
                  { label: "Missed Today", value: todayMissed, icon: AlertCircle, color: "bg-red-100 text-red-600" },
                ].map((k) => (
                  <div key={k.label} className="bg-card border border-border rounded-xl p-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${k.color}`}><k.icon size={15} /></div>
                    <p className="text-2xl font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{k.value}</p>
                    <p className="text-xs text-muted-foreground">{k.label}</p>
                  </div>
                ))}
              </div>

              {/* Critical alert */}
              {residents.filter((r) => r.status === "critical").map((r) => (
                <div key={r.id} className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                  <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-800">{r.name} — Critical Status</p>
                    <p className="text-xs text-red-600">{r.conditions.join(", ")}</p>
                  </div>
                </div>
              ))}

              {/* Today's schedule summary per resident */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <h4 className="font-semibold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>Today's Schedule Summary</h4>
                </div>
                <div className="divide-y divide-border">
                  {residents.map((resident) => {
                    const residentSchedules = todaySchedules.filter((schedule) => String(schedule.elderlyId) === String(resident.id));
                    const residentCompleted = residentSchedules.filter((schedule) => String(schedule.scheduleStatus).toLowerCase() === "completed").length;
                    const residentMissed = residentSchedules.filter((schedule) => String(schedule.scheduleStatus).toLowerCase() === "missed").length;
                    const residentActive = residentSchedules.filter((schedule) => String(schedule.scheduleStatus).toLowerCase() === "scheduled").length;

                    return (
                      <div key={resident.id} className="flex items-center gap-4 px-5 py-3.5">
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-muted flex-shrink-0">
                          <img src={resident.photo} alt={resident.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{resident.name}</p>
                          <p className="text-xs text-muted-foreground">{residentActive} active · {residentCompleted} completed · {residentMissed} missed</p>
                        </div>
                        <div className="flex gap-2">
                          <div className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">{residentCompleted}</div>
                          <div className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">{residentActive}</div>
                          <div className="rounded-lg bg-red-50 px-2 py-1 text-xs font-medium text-red-700">{residentMissed}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {page === "schedule" && <MySchedules nurseName={nurseName} nurseId={currentNurseId} selectedScheduleId={selectedScheduleId} />}
          {page === "residents" && (
            <div className="flex flex-col gap-4 lg:flex-row">
              <AssignedResidentsSidebar
                residents={residents}
                scheduleAssignments={scheduleAssignments}
                selectedId={selectedResidentId}
                onSelect={setSelectedResidentId}
              />
              <div className="flex-1">
                <ResidentDetailsPanel
                  resident={residents.find((resident) => resident.id === selectedResidentId) ?? null}
                  scheduleAssignments={scheduleAssignments}
                />
              </div>
            </div>
          )}
          {page === "weeklyReport" && (
            <WeeklyReportPage
              residents={residents}
              checks={checks}
              weeklyLogs={weeklyLogs}
              loading={weeklyLogsLoading}
            />
          )}
        </div>
      </main>
    </div>
  );
}


function NurseProfileRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <span style={{ color: "#6b7a99" }}>{label}</span>
      <span className="text-right" style={{ color: "#1a2b42", fontWeight: 600 }}>{value || "-"}</span>
    </div>
  );
}
