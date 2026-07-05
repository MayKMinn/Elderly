import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  Pill,
  Clock,
  AlertTriangle,
  ShieldCheck,
  User,
  Dna,
  Droplets,
  ListOrdered,
  ArrowLeft,
} from "lucide-react";
import { createMedicationAssignment, getMedicationAssignments } from "../api/medications";
import type { MedicationAssignment } from "../api/medications";
import { searchElderlyProfiles } from "../api/profiles";
import { ViewProfileModal } from "./ViewProfileModal";
import type { ElderlyProfile } from "./data";

const statusStyles: Record<string, { bg: string; color: string }> = {
  "Due Soon": { bg: "#fef3c7", color: "#d97706" },
  Pending: { bg: "#fce7f3", color: "#db2777" },
  Taken: { bg: "#dcfce7", color: "#16a34a" },
  Missed: { bg: "#fee2e2", color: "#dc2626" },
};

function todayInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function Medications() {
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [history, setHistory] = useState<MedicationAssignment[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
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
  const [date, setDate] = useState(todayInputValue());
  const [compliance, setCompliance] = useState("Pending");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [viewProfile, setViewProfile] = useState(false);

  const loadHistory = () => {
    setHistoryLoading(true);
    setHistoryError("");

    getMedicationAssignments()
      .then(({ medications }) => {
        setHistory(medications);
      })
      .catch((error) => {
        setHistory([]);
        setHistoryError("Could not load assigned medication history.");
        console.error(error);
      })
      .finally(() => setHistoryLoading(false));
  };

  useEffect(() => {
    loadHistory();
  }, []);

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
    setErrors((prev) => {
      const next = { ...prev };
      delete next.elderlyId;
      return next;
    });
  };

  const resetForm = () => {
    setSelectedElder(null);
    setElderSearch("");
    setElderMatches([]);
    setNurseSearch("");
    setMedName("");
    setDosage("");
    setQty("");
    setSchedTime("08:00 AM");
    setDate(todayInputValue());
    setCompliance("Pending");
    setNotes("");
    setErrors({});
    setMessage("");
  };

  const validateAssignment = () => {
    const nextErrors: Record<string, string> = {};

    if (!selectedElder) nextErrors.elderlyId = "Select an elderly profile.";
    if (!nurseSearch.trim()) nextErrors.nurseName = "Assign caregiver or nurse is required.";
    if (!medName.trim()) nextErrors.medicationName = "Medicine name is required.";
    if (!dosage.trim()) nextErrors.dosage = "Dosage is required.";
    if (!qty.trim()) nextErrors.instructions = "Quantity or dosage instruction is required.";
    if (!date) nextErrors.scheduledDate = "Date is required.";
    else if (date < todayInputValue()) nextErrors.scheduledDate = "Date cannot be in the past.";

    return nextErrors;
  };

  const handleAssignMedication = async () => {
    const validationErrors = validateAssignment();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setMessage("");
      return;
    }

    if (!selectedElder) return;

    setSaving(true);
    setErrors({});
    setMessage("");

    try {
      await createMedicationAssignment({
        elderlyId: String(selectedElder.id),
        elderlyName: selectedElder.name,
        nurseName: nurseSearch.trim(),
        medicationName: medName.trim(),
        dosage: dosage.trim(),
        instructions: qty.trim(),
        scheduledTime: schedTime,
        scheduledDate: date,
        complianceStatus: compliance,
        notes: notes.trim(),
      });

      setMessage("Medication assigned and saved to MySQL.");
      loadHistory();
      setMedName("");
      setDosage("");
      setQty("");
      setSchedTime("08:00 AM");
      setDate(todayInputValue());
      setCompliance("Pending");
      setNotes("");
      setShowAssignForm(false);
    } catch (error) {
      setMessage("Failed to assign medication.");
      console.error(error);
    } finally {
      setSaving(false);
    }
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
          onClick={() => {
            setShowAssignForm(true);
            setMessage("");
          }}
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

      {showAssignForm ? (
        <div className="flex gap-4">
        {/* Main content */}
        <div className="flex-1 space-y-4">
          {/* Assign Medication Form */}
          <div className="bg-white rounded-xl border p-5" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm" style={{ color: "#1a2b42", fontWeight: 700 }}>Assign Medication</h3>
                <p className="text-xs mt-0.5" style={{ color: "#6b7a99" }}>Create a medication assignment and notify the nurse.</p>
              </div>
              <button
                onClick={() => {
                  setShowAssignForm(false);
                  resetForm();
                }}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs hover:bg-gray-50"
                style={{ borderColor: "rgba(0,0,0,0.12)", color: "#6b7a99" }}
              >
                <ArrowLeft size={13} />
                Back to history
              </button>
            </div>
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
                fieldError={errors.elderlyId}
              />
              <SearchField label="Assign Caregiver / Nurse" placeholder="Search nurse..." value={nurseSearch} onChange={setNurseSearch} icon={<User size={13} style={{ color: "#6b7a99" }} />} error={errors.nurseName} />
              <SearchField label="Medicine Name" placeholder="Search medication..." value={medName} onChange={setMedName} icon={<Pill size={13} style={{ color: "#6b7a99" }} />} error={errors.medicationName} />
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <MedField label="Dosage" placeholder="e.g., 500 mg" value={dosage} onChange={setDosage} error={errors.dosage} />
              <MedField label="Quantity / Dosage Instruction" placeholder="e.g., 1 tablet twice daily after meals" value={qty} onChange={setQty} error={errors.instructions} />
              <TimeStepper label="Schedule Time" value={schedTime} onChange={setSchedTime} />
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <DateField label="Date" value={date} onChange={setDate} error={errors.scheduledDate} />
              <div>
                <label className="text-xs block mb-1.5" style={{ color: "#6b7a99" }}>Compliance Status</label>
                <div className="relative flex items-center gap-2 px-3 py-2 border rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-100" style={{ borderColor: "rgba(37,99,235,0.28)" }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: statusStyles[compliance]?.bg, color: statusStyles[compliance]?.color }}>
                    <ShieldCheck size={13} />
                  </div>
                  <select value={compliance} onChange={(e) => setCompliance(e.target.value)} className="flex-1 appearance-none pr-7 text-xs outline-none bg-transparent font-medium" style={{ color: "#1a2b42" }}>
                    <option>Pending</option>
                    <option>Taken</option>
                    <option>Missed</option>
                    <option>Due Soon</option>
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#6b7a99" }} />
                </div>
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs block mb-1.5" style={{ color: "#6b7a99" }}>Additional Notes (Optional)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add any additional notes or instructions..." rows={3} className="w-full px-3 py-2 border rounded-lg text-xs outline-none resize-none" style={{ borderColor: "rgba(0,0,0,0.12)", color: "#1a2b42" }} />
            </div>
            {message && (
              <div className="mb-3 rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: message.startsWith("Failed") ? "#fee2e2" : "#dcfce7", color: message.startsWith("Failed") ? "#dc2626" : "#15803d" }}>
                {message}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={resetForm} className="px-5 py-2 rounded-lg border text-sm hover:bg-gray-50" style={{ borderColor: "rgba(0,0,0,0.12)", color: "#6b7a99" }}>Reset</button>
              <button onClick={handleAssignMedication} disabled={saving} className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm text-white" style={{ backgroundColor: "#2563eb", opacity: saving ? 0.7 : 1 }}>
                <Pill size={14} /> {saving ? "Saving..." : "Assign Medication"}
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
                <button onClick={() => setViewProfile(true)} className="w-full py-1.5 rounded-lg border text-xs" style={{ borderColor: "rgba(0,0,0,0.1)", color: "#2563eb" }}>
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
      ) : (
        <MedicationHistoryTable
          history={history}
          loading={historyLoading}
          error={historyError}
          onRefresh={loadHistory}
        />
      )}
      {selectedElder && viewProfile && (
        <ViewProfileModal
          profile={selectedElder}
          onClose={() => setViewProfile(false)}
          onEdit={() => setViewProfile(false)}
        />
      )}
    </div>
  );
}

function MedicationHistoryTable({
  history,
  loading,
  error,
  onRefresh,
}: {
  history: MedicationAssignment[];
  loading: boolean;
  error: string;
  onRefresh: () => void;
}) {
  return (
    <div className="rounded-xl border bg-white" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
      <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
        <div>
          <h3 className="text-sm" style={{ color: "#1a2b42", fontWeight: 700 }}>Assigned Medication History</h3>
          <p className="mt-0.5 text-xs" style={{ color: "#6b7a99" }}>Medication assignments saved in MySQL.</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-lg border px-3 py-1.5 text-xs hover:bg-gray-50"
          style={{ borderColor: "rgba(0,0,0,0.12)", color: "#2563eb" }}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="px-5 py-10 text-center text-sm" style={{ color: "#6b7a99" }}>Loading assigned medications...</div>
      ) : error ? (
        <div className="px-5 py-10 text-center">
          <div className="text-sm" style={{ color: "#dc2626" }}>{error}</div>
          <button
            type="button"
            onClick={onRefresh}
            className="mt-3 rounded-lg px-4 py-2 text-xs text-white"
            style={{ backgroundColor: "#2563eb" }}
          >
            Try Again
          </button>
        </div>
      ) : history.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}>
            <Pill size={20} />
          </div>
          <div className="text-sm" style={{ color: "#1a2b42", fontWeight: 700 }}>No medication assignments yet</div>
          <div className="mt-1 text-xs" style={{ color: "#6b7a99" }}>Click Assign New Medication to create the first record.</div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-xs">
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", color: "#6b7a99" }}>
                <th className="px-5 py-3 font-medium">Medicine</th>
                <th className="px-5 py-3 font-medium">Elderly</th>
                <th className="px-5 py-3 font-medium">Nurse</th>
                <th className="px-5 py-3 font-medium">Schedule</th>
                <th className="px-5 py-3 font-medium">Dosage</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Reported</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => {
                const statusStyle = statusStyles[item.complianceStatus] ?? statusStyles.Pending;
                return (
                  <tr key={item.id} className="border-t" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
                    <td className="px-5 py-3">
                      <div style={{ color: "#1a2b42", fontWeight: 700 }}>{item.medicationName}</div>
                      <div className="mt-0.5" style={{ color: "#6b7a99" }}>{item.instructions || "-"}</div>
                    </td>
                    <td className="px-5 py-3" style={{ color: "#1a2b42" }}>{item.elderlyName}</td>
                    <td className="px-5 py-3" style={{ color: "#1a2b42" }}>{item.nurseName}</td>
                    <td className="px-5 py-3" style={{ color: "#1a2b42" }}>
                      <div>{item.scheduledDate}</div>
                      <div className="mt-0.5" style={{ color: "#6b7a99" }}>{item.scheduledTime}</div>
                    </td>
                    <td className="px-5 py-3" style={{ color: "#1a2b42" }}>{item.dosage}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}>
                        {item.complianceStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3" style={{ color: item.reportedAt ? "#1a2b42" : "#6b7a99" }}>
                      {item.reportedAt ? new Date(item.reportedAt).toLocaleString() : "Not reported"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
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
  fieldError,
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
  fieldError?: string;
  onSelect: (elder: ElderlyProfile) => void;
}) {
  const showPanel = value.trim().length > 0 && (isLoading || error || matches.length > 0);

  return (
    <div className="relative">
      <label className="text-xs block mb-1.5" style={{ color: "#6b7a99" }}>{label}</label>
      <div className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-100" style={{ borderColor: fieldError ? "#ef4444" : "rgba(0,0,0,0.12)" }}>
        {icon}
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="flex-1 text-xs outline-none" style={{ color: "#1a2b42" }} />
      </div>
      {fieldError && <p className="mt-1 text-xs" style={{ color: "#dc2626" }}>{fieldError}</p>}
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

function SearchField({ label, placeholder, value, onChange, icon, error }: { label: string; placeholder: string; value: string; onChange: (v: string) => void; icon: React.ReactNode; error?: string }) {
  return (
    <div>
      <label className="text-xs block mb-1.5" style={{ color: "#6b7a99" }}>{label}</label>
      <div className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-100" style={{ borderColor: error ? "#ef4444" : "rgba(0,0,0,0.12)" }}>
        {icon}
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="flex-1 text-xs outline-none" style={{ color: "#1a2b42" }} />
      </div>
      {error && <p className="mt-1 text-xs" style={{ color: "#dc2626" }}>{error}</p>}
    </div>
  );
}

function MedField({ label, placeholder, value, onChange, error }: { label: string; placeholder: string; value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <div>
      <label className="text-xs block mb-1.5" style={{ color: "#6b7a99" }}>{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2 border rounded-lg bg-white text-xs outline-none focus:ring-2 focus:ring-blue-100" style={{ borderColor: error ? "#ef4444" : "rgba(0,0,0,0.12)", color: "#1a2b42" }} />
      {error && <p className="mt-1 text-xs" style={{ color: "#dc2626" }}>{error}</p>}
    </div>
  );
}

function parseTime(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!match) {
    return { hour: 8, minute: 0, period: "AM" as "AM" | "PM" };
  }

  const hour = Math.min(12, Math.max(1, Number(match[1]) || 8));
  const minute = Math.min(59, Math.max(0, Number(match[2]) || 0));
  const period = match[3].toUpperCase() === "PM" ? "PM" : "AM";

  return { hour, minute, period: period as "AM" | "PM" };
}

function formatTime(hour: number, minute: number, period: "AM" | "PM") {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`;
}

function TimeStepper({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const time = parseTime(value);

  const update = (next: Partial<typeof time>) => {
    onChange(formatTime(next.hour ?? time.hour, next.minute ?? time.minute, next.period ?? time.period));
  };

  const stepHour = (direction: 1 | -1) => {
    const nextHour = time.hour + direction;
    update({ hour: nextHour > 12 ? 1 : nextHour < 1 ? 12 : nextHour });
  };

  const stepMinute = (direction: 1 | -1) => {
    const nextMinute = time.minute + direction * 5;
    update({ minute: nextMinute > 55 ? 0 : nextMinute < 0 ? 55 : nextMinute });
  };

  return (
    <div>
      <label className="text-xs block mb-1.5" style={{ color: "#6b7a99" }}>{label}</label>
      <div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2" style={{ borderColor: "rgba(0,0,0,0.12)" }}>
        <Clock size={14} style={{ color: "#6b7a99" }} />
        <TimeUnit value={String(time.hour).padStart(2, "0")} onUp={() => stepHour(1)} onDown={() => stepHour(-1)} />
        <span className="text-sm" style={{ color: "#6b7a99", fontWeight: 700 }}>:</span>
        <TimeUnit value={String(time.minute).padStart(2, "0")} onUp={() => stepMinute(1)} onDown={() => stepMinute(-1)} />
        <select
          value={time.period}
          onChange={(event) => update({ period: event.target.value as "AM" | "PM" })}
          className="ml-auto rounded-md border px-2 py-1.5 text-xs font-semibold outline-none"
          style={{ borderColor: "rgba(37,99,235,0.22)", color: "#1a2b42", backgroundColor: "#f8fafc" }}
        >
          <option>AM</option>
          <option>PM</option>
        </select>
      </div>
    </div>
  );
}

function TimeUnit({ value, onUp, onDown }: { value: string; onUp: () => void; onDown: () => void }) {
  return (
    <div className="flex items-center overflow-hidden rounded-md border" style={{ borderColor: "rgba(0,0,0,0.1)" }}>
      <div className="w-9 text-center text-xs" style={{ color: "#1a2b42", fontWeight: 700 }}>{value}</div>
      <div className="flex flex-col border-l" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
        <button type="button" onClick={onUp} className="flex h-4 w-5 items-center justify-center hover:bg-blue-50">
          <ChevronUp size={12} style={{ color: "#2563eb" }} />
        </button>
        <button type="button" onClick={onDown} className="flex h-4 w-5 items-center justify-center border-t hover:bg-blue-50" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
          <ChevronDown size={12} style={{ color: "#2563eb" }} />
        </button>
      </div>
    </div>
  );
}

function DateField({ label, value, onChange, error }: { label: string; value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <div>
      <label className="text-xs block mb-1.5" style={{ color: "#6b7a99" }}>{label}</label>
      <div className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-white focus-within:ring-2 focus-within:ring-blue-100" style={{ borderColor: error ? "#ef4444" : "rgba(0,0,0,0.12)" }}>
        <CalendarDays size={13} style={{ color: "#6b7a99" }} />
        <input
          type="date"
          min={todayInputValue()}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 text-xs outline-none"
          style={{ color: "#1a2b42" }}
        />
      </div>
      {error && <p className="mt-1 text-xs" style={{ color: "#dc2626" }}>{error}</p>}
    </div>
  );
}
