import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  ChevronLeft,
  Pill,
  Clock,
  AlertTriangle,
  ShieldCheck,
  User,
  Dna,
  Droplets,
  ListOrdered,
} from "lucide-react";
import { searchElderlyProfiles } from "../api/profiles";
import type { ElderlyProfile } from "./data";

const statusStyles: Record<string, { bg: string; color: string }> = {
  "Due Soon": { bg: "#fef3c7", color: "#d97706" },
  Pending: { bg: "#fce7f3", color: "#db2777" },
  Taken: { bg: "#dcfce7", color: "#16a34a" },
  Missed: { bg: "#fee2e2", color: "#dc2626" },
};

export function Medications() {
  const [selectedElder, setSelectedElder] = useState<ElderlyProfile | null>(null);
  const [elderSearch, setElderSearch] = useState("");
  const [elderMatches, setElderMatches] = useState<ElderlyProfile[]>([]);
  const [isSearchingElders, setIsSearchingElders] = useState(false);
  const [elderSearchError, setElderSearchError] = useState("");
  const [nurseSearch, setNurseSearch] = useState("");
  const [medName, setMedName] = useState("");
  const [dosage, setDosage] = useState("");
  const [qty, setQty] = useState("");
  const [schedTime, setSchedTime] = useState("08:00 AM");
  const [date, setDate] = useState("May 24, 2025");
  const [checkDate, setCheckDate] = useState("May 24, 2025");
  const [compliance, setCompliance] = useState("Pending");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const query = elderSearch.trim();

    if (!query) {
      setElderMatches([]);
      setElderSearchError("");
      setIsSearchingElders(false);
      return;
    }

    if (selectedElder?.name === query) {
      setElderMatches([]);
      setElderSearchError("");
      setIsSearchingElders(false);
      return;
    }

    let ignore = false;
    setIsSearchingElders(true);
    setElderSearchError("");

    const timeoutId = window.setTimeout(() => {
      searchElderlyProfiles(query)
        .then(({ elderly }) => {
          if (ignore) return;
          setElderMatches(elderly);
        })
        .catch(() => {
          if (ignore) return;
          setElderMatches([]);
          setElderSearchError("Could not load elderly names.");
        })
        .finally(() => {
          if (!ignore) setIsSearchingElders(false);
        });
    }, 180);

    return () => {
      ignore = true;
      window.clearTimeout(timeoutId);
    };
  }, [elderSearch, selectedElder]);

  const handleElderSelect = (elder: ElderlyProfile) => {
    setSelectedElder(elder);
    setElderSearch(elder.name);
    setElderMatches([]);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: "#f0f4f8" }}>
      {/* Breadcrumb */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5 text-xs" style={{ color: "#6b7a99" }}>
          <span>Dashboard</span><span>/</span>
          <span>Medications</span><span>/</span>
          <span style={{ color: "#1a2b42", fontWeight: 500 }}>Assign Medications</span>
        </div>
        <button
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-white"
          style={{ backgroundColor: "#2563eb" }}
        >
          <Plus size={14} /> Assign New Medication
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-5">
        {[
          { label: "Active Medications", value: 96, sub: "↑ 8 from last week", icon: <Pill size={20} />, iconBg: "#eff6ff", iconColor: "#818cf8" },
          { label: "Due Today", value: 23, sub: "↑ 3 from yesterday", icon: <Clock size={20} />, iconBg: "#fff7ed", iconColor: "#f97316" },
          { label: "Missed Doses", value: 5, sub: "↓ 2 from yesterday", icon: <AlertTriangle size={20} />, iconBg: "#fee2e2", iconColor: "#ef4444" },
          { label: "Compliance Rate", value: "91%", sub: "↑ 4% from last week", icon: <ShieldCheck size={20} />, iconBg: "#dcfce7", iconColor: "#22c55e" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-4 border" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: s.iconBg, color: s.iconColor }}>
              {s.icon}
            </div>
            <div className="text-2xl mb-0.5" style={{ color: "#1a2b42", fontWeight: 700 }}>{s.value}</div>
            <div className="text-xs mb-0.5" style={{ color: "#1a2b42" }}>{s.label}</div>
            <div className="text-xs" style={{ color: s.label === "Missed Doses" ? "#ef4444" : "#22c55e" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        {/* Main content */}
        <div className="flex-1 space-y-4">
          {/* Assign Medication Form */}
          <div className="bg-white rounded-xl border p-5" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
            <h3 className="text-sm mb-4" style={{ color: "#1a2b42", fontWeight: 700 }}>Assign Medication</h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <ElderlySearchField
                label="Select Elderly"
                placeholder="Search elderly..."
                value={elderSearch}
                onChange={(v) => {
                  setElderSearch(v);
                  setSelectedElder(null);
                }}
                matches={elderMatches}
                isLoading={isSearchingElders}
                error={elderSearchError}
                onSelect={handleElderSelect}
                icon={<User size={13} style={{ color: "#6b7a99" }} />}
              />
              <SearchField label="Assign Caregiver / Nurse" placeholder="Search nurse..." value={nurseSearch} onChange={setNurseSearch} icon={<User size={13} style={{ color: "#6b7a99" }} />} />
              <SearchField label="Medicine Name" placeholder="Search medication..." value={medName} onChange={setMedName} icon={<Pill size={13} style={{ color: "#6b7a99" }} />} />
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <MedField label="Dosage" placeholder="e.g., 500 mg" value={dosage} onChange={setDosage} />
              <MedField label="Quantity / Dosage Instruction" placeholder="e.g., 1 tablet twice daily after meals" value={qty} onChange={setQty} />
              <div>
                <label className="text-xs block mb-1.5" style={{ color: "#6b7a99" }}>Schedule Time</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2 border rounded-lg" style={{ borderColor: "rgba(0,0,0,0.12)" }}>
                    <Clock size={13} style={{ color: "#6b7a99" }} />
                    <input value={schedTime} onChange={(e) => setSchedTime(e.target.value)} className="flex-1 text-xs outline-none" style={{ color: "#1a2b42" }} />
                  </div>
                  <button className="px-2 py-2 rounded-lg border text-xs" style={{ borderColor: "rgba(0,0,0,0.12)", color: "#2563eb" }}>
                    + Add Time
                  </button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <DateField label="Date" value={date} onChange={setDate} />
              <DateField label="Check Date" value={checkDate} onChange={setCheckDate} />
              <div>
                <label className="text-xs block mb-1.5" style={{ color: "#6b7a99" }}>Compliance Status</label>
                <div className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-100" style={{ borderColor: "rgba(37,99,235,0.28)" }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: statusStyles[compliance]?.bg, color: statusStyles[compliance]?.color }}>
                    <ShieldCheck size={13} />
                  </div>
                  <select value={compliance} onChange={(e) => setCompliance(e.target.value)} className="flex-1 text-xs outline-none bg-transparent font-medium" style={{ color: "#1a2b42" }}>
                    <option>Pending</option>
                    <option>Taken</option>
                    <option>Missed</option>
                    <option>Due Soon</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs block mb-1.5" style={{ color: "#6b7a99" }}>Additional Notes (Optional)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add any additional notes or instructions..." rows={3} className="w-full px-3 py-2 border rounded-lg text-xs outline-none resize-none" style={{ borderColor: "rgba(0,0,0,0.12)", color: "#1a2b42" }} />
            </div>
            <div className="flex justify-end gap-2">
              <button className="px-5 py-2 rounded-lg border text-sm hover:bg-gray-50" style={{ borderColor: "rgba(0,0,0,0.12)", color: "#6b7a99" }}>Reset</button>
              <button className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm text-white" style={{ backgroundColor: "#2563eb" }}>
                <Pill size={14} /> Assign Medication
              </button>
            </div>
          </div>

        </div>

        {/* Right panel */}
        <div className="w-64 flex-shrink-0 space-y-4">
          {/* Selected Elderly */}
          <div className="bg-white rounded-xl border p-4" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
            <h3 className="text-xs mb-3" style={{ color: "#1a2b42", fontWeight: 700 }}>Selected Elderly</h3>
            {selectedElder ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  {selectedElder.avatar ? (
                    <img src={selectedElder.avatar} className="w-10 h-10 rounded-full" alt="" />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}>
                      <User size={16} />
                    </div>
                  )}
                  <div>
                    <div className="text-sm" style={{ color: "#1a2b42", fontWeight: 600 }}>{selectedElder.name}</div>
                    <div className="text-xs" style={{ color: "#6b7a99" }}>ID: {selectedElder.id}</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <Dna size={12} className="mx-auto mb-1" style={{ color: "#6b7a99" }} />
                    <div className="text-xs" style={{ color: "#6b7a99" }}>Age</div>
                    <div className="text-xs" style={{ color: "#1a2b42", fontWeight: 600 }}>{selectedElder.age || "-"}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <User size={12} className="mx-auto mb-1" style={{ color: "#6b7a99" }} />
                    <div className="text-xs" style={{ color: "#6b7a99" }}>Gender</div>
                    <div className="text-xs" style={{ color: "#1a2b42", fontWeight: 600 }}>{selectedElder.gender || "-"}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <Droplets size={12} className="mx-auto mb-1" style={{ color: "#ef4444" }} />
                    <div className="text-xs" style={{ color: "#6b7a99" }}>Blood</div>
                    <div className="text-xs" style={{ color: "#1a2b42", fontWeight: 600 }}>{selectedElder.bloodType || "-"}</div>
                  </div>
                </div>
                <button className="w-full py-1.5 rounded-lg border text-xs" style={{ borderColor: "rgba(0,0,0,0.1)", color: "#2563eb" }}>
                  <ListOrdered size={12} className="inline mr-1" />
                  View Full Profile
                </button>
              </>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-center" style={{ borderColor: "rgba(0,0,0,0.12)" }}>
                <User size={18} className="mx-auto mb-2" style={{ color: "#9ca3af" }} />
                <div className="text-xs" style={{ color: "#6b7a99" }}>Type an elderly name and select a match.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ElderlySearchField({
  label,
  placeholder,
  value,
  onChange,
  icon,
  matches,
  isLoading,
  error,
  onSelect,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  icon: React.ReactNode;
  matches: ElderlyProfile[];
  isLoading: boolean;
  error: string;
  onSelect: (elder: ElderlyProfile) => void;
}) {
  const showPanel = value.trim().length > 0 && (isLoading || error || matches.length > 0);

  return (
    <div className="relative">
      <label className="text-xs block mb-1.5" style={{ color: "#6b7a99" }}>{label}</label>
      <div className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-100" style={{ borderColor: "rgba(0,0,0,0.12)" }}>
        {icon}
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="flex-1 text-xs outline-none" style={{ color: "#1a2b42" }} />
      </div>
      {showPanel && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border bg-white shadow-lg" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
          {isLoading && <div className="px-3 py-2 text-xs" style={{ color: "#6b7a99" }}>Searching...</div>}
          {error && <div className="px-3 py-2 text-xs" style={{ color: "#dc2626" }}>{error}</div>}
          {!isLoading && !error && matches.map((elder) => (
            <button key={elder.id} type="button" onClick={() => onSelect(elder)} className="w-full px-3 py-2 text-left hover:bg-blue-50">
              <div className="text-xs" style={{ color: "#1a2b42", fontWeight: 600 }}>{elder.name}</div>
              <div className="text-xs" style={{ color: "#6b7a99" }}>{elder.id}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SearchField({ label, placeholder, value, onChange, icon }: { label: string; placeholder: string; value: string; onChange: (v: string) => void; icon: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs block mb-1.5" style={{ color: "#6b7a99" }}>{label}</label>
      <div className="flex items-center gap-2 px-3 py-2 border rounded-lg" style={{ borderColor: "rgba(0,0,0,0.12)" }}>
        {icon}
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="flex-1 text-xs outline-none" style={{ color: "#1a2b42" }} />
      </div>
    </div>
  );
}

function MedField({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs block mb-1.5" style={{ color: "#6b7a99" }}>{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2 border rounded-lg text-xs outline-none" style={{ borderColor: "rgba(0,0,0,0.12)", color: "#1a2b42" }} />
    </div>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs block mb-1.5" style={{ color: "#6b7a99" }}>{label}</label>
      <div className="flex items-center gap-2 px-3 py-2 border rounded-lg" style={{ borderColor: "rgba(0,0,0,0.12)" }}>
        <ChevronLeft size={13} style={{ color: "#6b7a99" }} />
        <input value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 text-xs outline-none" style={{ color: "#1a2b42" }} />
      </div>
    </div>
  );
}
