import React, { useEffect, useState } from "react";
import {
  Activity, Pill, Stethoscope, Heart, Clock, Check, X, ChevronLeft,
  ChevronRight, Bell, AlertCircle, CheckCircle, Users, Calendar,
  LogOut, LayoutDashboard, Phone, AlertTriangle, Eye, EyeOff,
  LogIn, FileText
} from "lucide-react";
import { getMedicationAssignments, updateMedicationAssignmentStatus } from "../api/medications";
import type { MedicationAssignment } from "../api/medications";

// ── Auth types & store ─────────────────────────────────────────────────────

interface NurseAccount {
  id: string;
  fullName: string;
  email: string;
  licenseNo: string;
  password: string;
  joinedAt: string;
}

const SEED_NURSES: NurseAccount[] = [
  { id: "1", fullName: "Patricia Chen", email: "patricia@elderease.com", licenseNo: "RN-4821", password: "nurse123", joinedAt: "2024-01-10" },
  { id: "2", fullName: "Thomas Wright", email: "thomas@elderease.com",  licenseNo: "RN-3307", password: "nurse123", joinedAt: "2024-03-05" },
];

// ── Types ──────────────────────────────────────────────────────────────────

type Status = "stable" | "attention" | "critical";

interface Resident {
  id: number; name: string; age: number; room: string; photo: string;
  conditions: string[]; allergies: string[]; bloodType: string; status: Status;
  emergencyContact: { name: string; relation: string; phone: string };
}

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

const RESIDENTS: Resident[] = [
  {
    id: 1, name: "Margaret Holloway", age: 82, room: "A-104",
    photo: "https://images.unsplash.com/photo-1566616213894-2d4e1baee5d8?w=120&h=120&fit=crop&auto=format",
    conditions: ["Type 2 Diabetes", "Hypertension", "Mild Dementia"],
    allergies: ["Penicillin", "Sulfa drugs"], bloodType: "A+", status: "stable",
    emergencyContact: { name: "Robert Holloway", relation: "Son", phone: "+1 (555) 210-4832" },
  },
  {
    id: 2, name: "Eleanor Vasquez", age: 89, room: "A-102",
    photo: "https://images.unsplash.com/photo-1601233749202-95d04d5b3c00?w=120&h=120&fit=crop&auto=format",
    conditions: ["Congestive Heart Failure", "Arthritis"],
    allergies: ["Latex", "Ibuprofen"], bloodType: "B+", status: "critical",
    emergencyContact: { name: "Carmen Vasquez", relation: "Daughter", phone: "+1 (555) 671-0045" },
  },
  {
    id: 3, name: "Dorothy Kim", age: 78, room: "B-210",
    photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&auto=format",
    conditions: ["Alzheimer's Disease", "Hypothyroidism"],
    allergies: ["Codeine"], bloodType: "O+", status: "attention",
    emergencyContact: { name: "Steven Kim", relation: "Son", phone: "+1 (555) 802-3345" },
  },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TODAY = "Mon";

function makeChecks(): CheckEntry[] {
  const entries: CheckEntry[] = [];
  RESIDENTS.forEach((r) => {
    (["bp", "medication", "glucose"] as const).forEach((type) => {
      (["morning", "evening"] as const).forEach((slot) => {
        entries.push({ residentId: r.id, type, slot, done: false, time: null });
      });
    });
  });
  // Pre-fill a couple as done for realism
  const pre = (rid: number, type: "bp" | "medication" | "glucose", slot: "morning" | "evening") => {
    const e = entries.find((e) => e.residentId === rid && e.type === type && e.slot === slot);
    if (!e) return;
    e.done = true; e.time = "07:45";
    if (type === "bp") { e.systolic = "138"; e.diastolic = "85"; }
    if (type === "glucose") { e.glucoseValue = "124"; }
    if (type === "medication") { e.medGiven = true; e.notes = ""; }
  };
  pre(1, "bp", "morning");
  pre(1, "medication", "morning");
  pre(2, "bp", "morning");
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

function now() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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
            <p className="text-xs text-muted-foreground">Room {resident.room} · Age {resident.age}</p>
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
            <p className="text-xs text-muted-foreground">Room {resident.room}</p>
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

function SchedulePage({ checks, setChecks }: { checks: CheckEntry[]; setChecks: React.Dispatch<React.SetStateAction<CheckEntry[]>> }) {
  const [selectedResidentId, setSelectedResidentId] = useState(RESIDENTS[0].id);
  const [activeDay, setActiveDay] = useState(TODAY);
  const [activeSlot, setActiveSlot] = useState<"morning" | "evening">("morning");
  const [filling, setFilling] = useState<{ entry: CheckEntry; idx: number } | null>(null);

  const selectedResident = RESIDENTS.find((resident) => resident.id === selectedResidentId) ?? RESIDENTS[0];

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
          {RESIDENTS.map((resident) => {
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
            Age {selectedResident.age} · Room {selectedResident.room} · {selectedResident.bloodType}
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
          resident={RESIDENTS.find((resident) => resident.id === filling.entry.residentId)!}
          onSave={(updates) => saveEntry(filling.idx, updates)}
          onClose={() => setFilling(null)}
        />
      )}
    </div>
  );
}

function WeeklyReportPage({ checks }: { checks: CheckEntry[] }) {
  const totalPerDay = checks.length || 1;
  const todayDone = checks.filter((entry) => entry.done).length;

  const days = [
    { day: "Mon", date: "Jun 29", done: todayDone, total: totalPerDay },
    { day: "Tue", date: "Jun 30", done: Math.min(15, totalPerDay), total: totalPerDay },
    { day: "Wed", date: "Jul 1", done: Math.min(16, totalPerDay), total: totalPerDay },
    { day: "Thu", date: "Jul 2", done: Math.min(14, totalPerDay), total: totalPerDay },
    { day: "Fri", date: "Jul 3", done: Math.min(17, totalPerDay), total: totalPerDay },
    { day: "Sat", date: "Jul 4", done: Math.min(10, totalPerDay), total: totalPerDay },
    { day: "Sun", date: "Jul 5", done: Math.min(9, totalPerDay), total: totalPerDay },
  ];

  const weekDone = days.reduce((sum, day) => sum + day.done, 0);
  const weekTotal = days.reduce((sum, day) => sum + day.total, 0);
  const weekPercent = Math.round((weekDone / weekTotal) * 100);

  function submitReport() {
    alert("Weekly report submitted to admin.");
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-card border border-border rounded-2xl p-5">
        <p className="text-sm text-muted-foreground">Weekly Report to Admin</p>
        <h3 className="text-xl font-semibold text-foreground mt-1" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>
          Jun 29 – Jul 5, 2026
        </h3>
        <p className="text-sm text-muted-foreground mt-2">
          Prepared by <strong className="text-foreground">{NURSE_NAME}</strong> · Sent to Admin
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold text-foreground">{weekPercent}%</p>
          <p className="text-xs text-muted-foreground">Week Completion</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold text-foreground">{weekDone}/{weekTotal}</p>
          <p className="text-xs text-muted-foreground">Checks Done</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold text-foreground">{RESIDENTS.length}</p>
          <p className="text-xs text-muted-foreground">Residents</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-2xl font-bold text-foreground">{todayDone}/{totalPerDay}</p>
          <p className="text-xs text-muted-foreground">Today</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h4 className="font-semibold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>Daily Breakdown</h4>
          <p className="text-xs text-muted-foreground">Mon – Sun</p>
        </div>

        <div className="divide-y divide-border">
          {days.map((day) => {
            const percent = Math.round((day.done / day.total) * 100);

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
                  {day.done}/{day.total}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h4 className="font-semibold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>Resident Weekly Summary</h4>
        </div>

        <div className="divide-y divide-border">
          {RESIDENTS.map((resident) => {
            const residentChecks = checks.filter((entry) => entry.residentId === resident.id);
            const done = residentChecks.filter((entry) => entry.done).length;

            return (
              <div key={resident.id} className="px-5 py-4 flex items-center gap-4">
                <div className="w-11 h-11 rounded-full overflow-hidden bg-muted flex-shrink-0">
                  <img src={resident.photo} alt={resident.name} className="w-full h-full object-cover" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{resident.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Room {resident.room} · Est. {done * 7}/{residentChecks.length * 7} checks this week
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

      <button
        onClick={submitReport}
        className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
      >
        <FileText size={16} />
        Submit Weekly Report to Admin
      </button>
    </div>
  );
}

function ResidentsPage() {
  const [selected, setSelected] = useState<Resident | null>(null);

  if (selected) {
    return (
      <div className="flex flex-col gap-5">
        <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-fit">
          <ChevronLeft size={14} /> Back to residents
        </button>
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex gap-4 items-start">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-muted flex-shrink-0">
              <img src={selected.photo} alt={selected.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-xl font-semibold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{selected.name}</h3>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize ${statusColor[selected.status]}`}>{selected.status}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">Age {selected.age} · Room {selected.room} · {selected.bloodType}</p>
              <div className="flex flex-wrap gap-1.5">
                {selected.conditions.map((c) => (
                  <span key={c} className="text-xs bg-red-50 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-full">{c}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
        {selected.allergies.length > 0 && (
          <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <AlertCircle size={15} className="text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Known Allergies</p>
              <p className="text-sm text-amber-700">{selected.allergies.join(", ")}</p>
            </div>
          </div>
        )}
        <div className="bg-card border border-border rounded-xl p-5">
          <h4 className="font-semibold text-foreground mb-3" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>Emergency Contact</h4>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
              {initials(selected.emergencyContact.name)}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{selected.emergencyContact.name}</p>
              <p className="text-xs text-muted-foreground">{selected.emergencyContact.relation}</p>
            </div>
          </div>
          <a href={`tel:${selected.emergencyContact.phone}`} className="flex items-center gap-2 text-sm text-primary hover:underline mt-3">
            <Phone size={13} />{selected.emergencyContact.phone}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{RESIDENTS.length} residents assigned to you</p>
      <div className="space-y-3">
        {RESIDENTS.map((r) => (
          <button key={r.id} onClick={() => setSelected(r)}
            className="w-full bg-card border border-border rounded-2xl p-4 text-left hover:shadow-md hover:border-primary/20 transition-all group">
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-muted">
                  <img src={r.photo} alt={r.name} className="w-full h-full object-cover" />
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${statusDot[r.status]}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{r.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColor[r.status]}`}>{r.status}</span>
                </div>
                <p className="text-sm text-muted-foreground">Age {r.age} · Room {r.room} · {r.bloodType}</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {r.conditions.map((c) => <span key={c} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{c}</span>)}
                </div>
              </div>
              <ChevronRight size={15} className="text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
            </div>
            {r.allergies.length > 0 && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                <AlertCircle size={10} /> Allergies: {r.allergies.join(", ")}
              </div>
            )}
          </button>
        ))}
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
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPw, setLoginPw] = useState("");

  const inputCls = "w-full px-4 py-3 text-sm bg-input-background border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/40 transition-all placeholder:text-muted-foreground";

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const nurse = nurses.find((n) => n.email.toLowerCase() === loginEmail.toLowerCase() && n.password === loginPw);
    if (!nurse) { setError("Incorrect email or password."); return; }
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
                <label className="block text-sm font-semibold text-foreground mb-1.5">Email Address</label>
                <input type="email" className={inputCls} placeholder="you@elderease.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
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
              <p className="text-xs text-center text-muted-foreground pt-1">
                Demo: <span className="font-mono text-foreground">patricia@elderease.com</span> / <span className="font-mono text-foreground">nurse123</span>
              </p>
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
  nurseProfile?: {
    id?: number;
    name?: string;
    username?: string;
    email?: string | null;
    licenseNumber?: string | null;
    workArea?: string | null;
    position?: string | null;
    avatar?: string | null;
  } | null;
  onSignOut?: () => void;
}

export function NursePortal({ nurseName = "Nurse", nurseProfile, onSignOut }: NursePortalProps) {
  const [page, setPage] = useState<Page>("schedule");
  const [collapsed, setCollapsed] = useState(false);
  const [checks, setChecks] = useState<CheckEntry[]>(makeChecks);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [medicationAssignments, setMedicationAssignments] = useState<MedicationAssignment[]>([]);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);

  const displayName = nurseProfile?.name || nurseName || "Nurse";
  const displayUsername = nurseProfile?.username || "-";
  const displayEmail = nurseProfile?.email || "-";
  const displayLicenseNumber = nurseProfile?.licenseNumber || "-";
  const displayWorkArea = nurseProfile?.workArea || "-";
  const displayPosition = nurseProfile?.position || "Registered Nurse";
  const displayAvatar = String(nurseProfile?.avatar || "").trim();
  const currentDateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const totalChecks = checks.length;
  const doneChecks = checks.filter((c) => c.done).length;
  const morningPending = checks.filter((c) => c.slot === "morning" && !c.done).length;
  const eveningPending = checks.filter((c) => c.slot === "evening" && !c.done).length;
  const criticalCount = RESIDENTS.filter((r) => r.status === "critical").length;
  const medicationNotificationCount = medicationAssignments.filter((item) =>
    item.complianceStatus === "Pending" || item.complianceStatus === "Due Soon"
  ).length;

  useEffect(() => {
    let ignore = false;

    const loadMedicationAssignments = () => {
      getMedicationAssignments(nurseName)
        .then(({ medications }) => {
          if (!ignore) setMedicationAssignments(medications);
        })
        .catch((error) => {
          console.error("Failed to load medication notifications.", error);
        });
    };

    loadMedicationAssignments();
    const interval = window.setInterval(loadMedicationAssignments, 15000);

    return () => {
      ignore = true;
      window.clearInterval(interval);
    };
  }, [nurseName]);

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

  const nav: { id: Page; label: string; icon: React.ElementType }[] = [
    { id: "overview",     label: "Overview",      icon: LayoutDashboard },
    { id: "schedule",     label: "My Schedule",   icon: Calendar },
    { id: "residents",    label: "Residents",     icon: Users },
    { id: "weeklyReport", label: "Weekly Report", icon: FileText },
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
              setChecks(makeChecks());
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
              <Clock size={11} /> {currentDateLabel}
            </div>
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen((open) => !open)}
                className="relative p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"
                title="Medication notifications"
              >
                <Bell size={15} />
                {medicationNotificationCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                    {medicationNotificationCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border bg-white shadow-xl" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
                  <div className="border-b px-4 py-3" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
                    <div className="text-sm" style={{ color: "#1a2b42", fontWeight: 700 }}>Medication notifications</div>
                    <div className="text-xs" style={{ color: "#6b7a99" }}>Assignments from admin</div>
                  </div>
                  {notificationMessage && (
                    <div className="mx-3 mt-3 rounded-lg px-3 py-2 text-xs" style={{
                      backgroundColor: notificationMessage.startsWith("Failed") ? "#fee2e2" : "#dcfce7",
                      color: notificationMessage.startsWith("Failed") ? "#dc2626" : "#15803d",
                    }}>
                      {notificationMessage}
                    </div>
                  )}
                  <div className="max-h-80 overflow-y-auto p-2">
                    {medicationAssignments.length === 0 ? (
                      <div className="px-3 py-6 text-center text-xs" style={{ color: "#6b7a99" }}>
                        No medication assignments for {nurseName}.
                      </div>
                    ) : (
                      medicationAssignments.map((item) => (
                        <div key={item.id} className="rounded-lg border p-3 mb-2" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-xs" style={{ color: "#1a2b42", fontWeight: 700 }}>{item.medicationName}</div>
                              <div className="text-xs" style={{ color: "#6b7a99" }}>{item.elderlyName} · {item.dosage}</div>
                              <div className="text-xs" style={{ color: "#6b7a99" }}>{item.scheduledDate} at {item.scheduledTime}</div>
                            </div>
                            <span className="rounded-full px-2 py-0.5 text-[10px]" style={{
                              backgroundColor: item.complianceStatus === "Taken" ? "#dcfce7" : item.complianceStatus === "Missed" ? "#fee2e2" : "#fef3c7",
                              color: item.complianceStatus === "Taken" ? "#15803d" : item.complianceStatus === "Missed" ? "#dc2626" : "#d97706",
                              fontWeight: 700,
                            }}>
                              {item.complianceStatus}
                            </span>
                          </div>
                          <div className="mt-2 text-xs" style={{ color: "#1a2b42" }}>{item.instructions}</div>
                          {(item.complianceStatus === "Pending" || item.complianceStatus === "Due Soon") && (
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <button
                                onClick={() => reportMedicationStatus(item.id, "Taken")}
                                className="rounded-lg border px-2 py-1.5 text-xs font-semibold hover:bg-emerald-50"
                                style={{ borderColor: "#bbf7d0", color: "#15803d" }}
                              >
                                Given
                              </button>
                              <button
                                onClick={() => reportMedicationStatus(item.id, "Missed")}
                                className="rounded-lg border px-2 py-1.5 text-xs font-semibold hover:bg-red-50"
                                style={{ borderColor: "#fecaca", color: "#dc2626" }}
                              >
                                Missed
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
              <div className="relative">
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
                      <NurseProfileRow label="Work Area" value={displayWorkArea} />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        setChecks(makeChecks());
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
                  You have <strong className="text-foreground">{totalChecks - doneChecks} checks</strong> remaining across <strong className="text-foreground">{RESIDENTS.length} residents</strong> today.
                </p>
              </div>

              {/* KPI cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Residents", value: RESIDENTS.length, icon: Users, color: "bg-primary/10 text-primary" },
                  { label: "Done Today", value: `${doneChecks}/${totalChecks}`, icon: CheckCircle, color: "bg-emerald-100 text-emerald-600" },
                  { label: "Morning Left", value: morningPending, icon: Activity, color: "bg-amber-100 text-amber-600" },
                  { label: "Evening Left", value: eveningPending, icon: Pill, color: "bg-violet-100 text-violet-600" },
                ].map((k) => (
                  <div key={k.label} className="bg-card border border-border rounded-xl p-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${k.color}`}><k.icon size={15} /></div>
                    <p className="text-2xl font-bold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{k.value}</p>
                    <p className="text-xs text-muted-foreground">{k.label}</p>
                  </div>
                ))}
              </div>

              {/* Critical alert */}
              {RESIDENTS.filter((r) => r.status === "critical").map((r) => (
                <div key={r.id} className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                  <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-red-800">{r.name} · Room {r.room} — Critical Status</p>
                    <p className="text-xs text-red-600">{r.conditions.join(", ")}</p>
                  </div>
                </div>
              ))}

              {/* Today's check summary per resident */}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <h4 className="font-semibold text-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>Today's Check Summary</h4>
                </div>
                <div className="divide-y divide-border">
                  {RESIDENTS.map((r) => {
                    const rChecks = checks.filter((c) => c.residentId === r.id);
                    const rDone = rChecks.filter((c) => c.done).length;
                    return (
                      <div key={r.id} className="flex items-center gap-4 px-5 py-3.5">
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-muted flex-shrink-0">
                          <img src={r.photo} alt={r.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{r.name}</p>
                          <p className="text-xs text-muted-foreground">Room {r.room}</p>
                        </div>
                        {/* Per-check icons */}
                        <div className="flex gap-2">
                          {(["bp", "medication", "glucose"] as const).map((type) => {
                            const meta = CHECK_META[type];
                            const done = checks.filter((c) => c.residentId === r.id && c.type === type && c.done).length;
                            const total = 2;
                            return (
                              <div key={type} className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${done === total ? "bg-emerald-50 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                                <meta.icon size={11} />{done}/{total}
                              </div>
                            );
                          })}
                        </div>
                        <div className="text-xs font-semibold text-muted-foreground" style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}>{rDone}/{rChecks.length}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {page === "schedule"  && <SchedulePage checks={checks} setChecks={setChecks} />}
          {page === "residents" && <ResidentsPage />}
          {page === "weeklyReport" && <WeeklyReportPage checks={checks} />}
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
