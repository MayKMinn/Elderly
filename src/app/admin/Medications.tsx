import { useState } from "react";
import {
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Pill,
  Clock,
  AlertTriangle,
  ShieldCheck,
  User,
  Dna,
  Droplets,
  ListOrdered,
  Lightbulb,
} from "lucide-react";

const ELDERS = [
  { id: "ELD-0012", name: "Mary Wilson", avatar: "https://i.pravatar.cc/32?img=47", age: 78, gender: "Female", blood: "O+" },
  { id: "ELD-0008", name: "Robert Brown", avatar: "https://i.pravatar.cc/32?img=12", age: 82, gender: "Male", blood: "B+" },
  { id: "ELD-0015", name: "Patricia Smith", avatar: "https://i.pravatar.cc/32?img=45", age: 75, gender: "Female", blood: "A-" },
  { id: "ELD-0003", name: "John Taylor", avatar: "https://i.pravatar.cc/32?img=15", age: 80, gender: "Male", blood: "AB+" },
  { id: "ELD-0010", name: "Elizabeth Johnson", avatar: "https://i.pravatar.cc/32?img=44", age: 71, gender: "Female", blood: "A+" },
];

const NURSES = [
  { id: "NUR-001", name: "Sarah Johnson", avatar: "https://i.pravatar.cc/32?img=49" },
  { id: "NUR-002", name: "James Miler", avatar: "https://i.pravatar.cc/32?img=52" },
  { id: "NUR-003", name: "Linda Davis", avatar: "https://i.pravatar.cc/32?img=43" },
  { id: "NUR-004", name: "Michael Lee", avatar: "https://i.pravatar.cc/32?img=14" },
  { id: "NUR-005", name: "Emily Clark", avatar: "https://i.pravatar.cc/32?img=46" },
];

const assignments = [
  { elder: "Mary Wilson", elderId: "ELD-0012", elderAvatar: "https://i.pravatar.cc/32?img=47", nurse: "Sarah Johnson", medication: "Lisinopril 10mg", type: "1 tablet", dosage: "1 tablet", time: "08:00 AM", date: "May 24, 2025", status: "Due Soon" },
  { elder: "Robert Brown", elderId: "ELD-0008", elderAvatar: "https://i.pravatar.cc/32?img=12", nurse: "James Miler", medication: "Metformin 500mg", type: "Tablet", dosage: "1 tablet", time: "09:00 AM", date: "May 24, 2025", status: "Pending" },
  { elder: "Patricia Smith", elderId: "ELD-0015", elderAvatar: "https://i.pravatar.cc/32?img=45", nurse: "Linda Davis", medication: "Atorvastatin 20mg", type: "Tablet", dosage: "1 tablet", time: "12:00 PM", date: "May 24, 2025", status: "Taken" },
  { elder: "John Taylor", elderId: "ELD-0003", elderAvatar: "https://i.pravatar.cc/32?img=15", nurse: "Michael Lee", medication: "Amlodipine 5mg", type: "Tablet", dosage: "1 tablet", time: "02:00 PM", date: "May 24, 2025", status: "Missed" },
  { elder: "Elizabeth Johnson", elderId: "ELD-0010", elderAvatar: "https://i.pravatar.cc/32?img=44", nurse: "Emily Clark", medication: "Levothyroxine 50mcg", type: "Tablet", dosage: "1 tablet", time: "07:00 PM", date: "May 24, 2025", status: "Taken" },
];

const medicationHistory = [
  { date: "Today, May 24, 2025", meds: [
    { name: "Lisinopril 10mg", dose: "1 tablet", time: "08:00 AM", status: "Due Soon" },
    { name: "Metformin 500mg", dose: "1 tablet", time: "09:00 AM", status: "Pending" },
    { name: "Atorvastatin 20mg", dose: "1 tablet", time: "12:00 PM", status: "Taken" },
  ]},
  { date: "May 23, 2025", meds: [
    { name: "Lisinopril 10mg", dose: "1 tablet", time: "08:00 AM", status: "Taken" },
    { name: "Metformin 500mg", dose: "1 tablet", time: "09:00 AM", status: "Missed" },
  ]},
];

const statusStyles: Record<string, { bg: string; color: string }> = {
  "Due Soon": { bg: "#fef3c7", color: "#d97706" },
  Pending: { bg: "#fce7f3", color: "#db2777" },
  Taken: { bg: "#dcfce7", color: "#16a34a" },
  Missed: { bg: "#fee2e2", color: "#dc2626" },
};

export function Medications() {
  const [selectedElder, setSelectedElder] = useState(ELDERS[0]);
  const [elderSearch, setElderSearch] = useState("Mary Wilson");
  const [nurseSearch, setNurseSearch] = useState("");
  const [medName, setMedName] = useState("");
  const [dosage, setDosage] = useState("");
  const [qty, setQty] = useState("");
  const [schedTime, setSchedTime] = useState("08:00 AM");
  const [date, setDate] = useState("May 24, 2025");
  const [checkDate, setCheckDate] = useState("May 24, 2025");
  const [compliance, setCompliance] = useState("");
  const [notes, setNotes] = useState("");

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
              <SearchField
                label="Select Elderly"
                placeholder="Search elderly..."
                value={elderSearch}
                onChange={(v) => {
                  setElderSearch(v);
                  const found = ELDERS.find((e) => e.name.toLowerCase().includes(v.toLowerCase()));
                  if (found) setSelectedElder(found);
                }}
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
                <div className="flex items-center gap-2 px-3 py-2 border rounded-lg" style={{ borderColor: "rgba(0,0,0,0.12)" }}>
                  <ShieldCheck size={13} style={{ color: "#6b7a99" }} />
                  <select value={compliance} onChange={(e) => setCompliance(e.target.value)} className="flex-1 text-xs outline-none bg-transparent" style={{ color: compliance ? "#1a2b42" : "#9ca3af" }}>
                    <option value="">Select status</option>
                    <option>Taken</option><option>Missed</option><option>Pending</option><option>Due Soon</option>
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

          {/* Assignments Table */}
          <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
              <h3 className="text-sm" style={{ color: "#1a2b42", fontWeight: 700 }}>Current Medication Assignments</h3>
              <div className="flex items-center gap-2">
                <select className="px-2 py-1.5 border rounded-lg text-xs outline-none" style={{ borderColor: "rgba(0,0,0,0.1)", color: "#6b7a99" }}>
                  <option>All Status</option><option>Taken</option><option>Missed</option><option>Pending</option><option>Due Soon</option>
                </select>
                <button className="flex items-center gap-1 px-2.5 py-1.5 border rounded-lg text-xs" style={{ borderColor: "rgba(0,0,0,0.1)", color: "#6b7a99" }}>
                  <Filter size={12} /> Filter
                </button>
                <button className="flex items-center gap-1 px-2.5 py-1.5 border rounded-lg text-xs" style={{ borderColor: "rgba(0,0,0,0.1)", color: "#6b7a99" }}>
                  <Download size={12} /> Export
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc" }}>
                    {["Elderly", "Nurse", "Medication", "Dosage", "Scheduled Time", "Date", "Status", "Actions"].map((c) => (
                      <th key={c} className="px-3 py-2.5 text-left text-xs" style={{ color: "#6b7a99", fontWeight: 600 }}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((row, i) => (
                    <tr key={i} className="border-t" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <img src={row.elderAvatar} className="w-6 h-6 rounded-full" alt="" />
                          <div>
                            <div className="text-xs" style={{ color: "#1a2b42", fontWeight: 500 }}>{row.elder}</div>
                            <div className="text-xs" style={{ color: "#6b7a99" }}>{row.elderId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: "#1a2b42" }}>{row.nurse}</td>
                      <td className="px-3 py-2.5">
                        <div className="text-xs" style={{ color: "#1a2b42", fontWeight: 500 }}>{row.medication}</div>
                        <div className="text-xs" style={{ color: "#6b7a99" }}>{row.type}</div>
                      </td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: "#1a2b42" }}>{row.dosage}</td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: "#1a2b42" }}>{row.time}</td>
                      <td className="px-3 py-2.5 text-xs" style={{ color: "#1a2b42" }}>{row.date}</td>
                      <td className="px-3 py-2.5">
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: statusStyles[row.status]?.bg, color: statusStyles[row.status]?.color }}>
                          {row.status}
                        </span>
                      </td>
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
            <div className="flex items-center justify-between px-4 py-3 border-t text-xs" style={{ borderColor: "rgba(0,0,0,0.06)", color: "#6b7a99" }}>
              <span>Showing 1 to 5 of 23 entries</span>
              <div className="flex items-center gap-1">
                {[<ChevronLeft size={13} />, 1, 2, 3, "...", 5, <ChevronRight size={13} />].map((item, i) => (
                  <button key={i} className="w-7 h-7 rounded flex items-center justify-center text-xs" style={{ backgroundColor: item === 1 ? "#2563eb" : "transparent", color: item === 1 ? "#fff" : "#6b7a99" }}>
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="w-64 flex-shrink-0 space-y-4">
          {/* Selected Elderly */}
          <div className="bg-white rounded-xl border p-4" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
            <h3 className="text-xs mb-3" style={{ color: "#1a2b42", fontWeight: 700 }}>Selected Elderly</h3>
            <div className="flex items-center gap-2 mb-3">
              <img src={selectedElder.avatar} className="w-10 h-10 rounded-full" alt="" />
              <div>
                <div className="text-sm" style={{ color: "#1a2b42", fontWeight: 600 }}>{selectedElder.name}</div>
                <div className="text-xs" style={{ color: "#6b7a99" }}>ID: {selectedElder.id}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center mb-3">
              <div className="bg-gray-50 rounded-lg p-2">
                <Dna size={12} className="mx-auto mb-1" style={{ color: "#6b7a99" }} />
                <div className="text-xs" style={{ color: "#6b7a99" }}>Age</div>
                <div className="text-xs" style={{ color: "#1a2b42", fontWeight: 600 }}>{selectedElder.age}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <User size={12} className="mx-auto mb-1" style={{ color: "#6b7a99" }} />
                <div className="text-xs" style={{ color: "#6b7a99" }}>Gender</div>
                <div className="text-xs" style={{ color: "#1a2b42", fontWeight: 600 }}>{selectedElder.gender}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <Droplets size={12} className="mx-auto mb-1" style={{ color: "#ef4444" }} />
                <div className="text-xs" style={{ color: "#6b7a99" }}>Blood</div>
                <div className="text-xs" style={{ color: "#1a2b42", fontWeight: 600 }}>{selectedElder.blood}</div>
              </div>
            </div>
            <button className="w-full py-1.5 rounded-lg border text-xs" style={{ borderColor: "rgba(0,0,0,0.1)", color: "#2563eb" }}>
              <ListOrdered size={12} className="inline mr-1" />
              View Full Profile
            </button>
          </div>

          {/* Medication History */}
          <div className="bg-white rounded-xl border p-4" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
            <h3 className="text-xs mb-3" style={{ color: "#1a2b42", fontWeight: 700 }}>Medication History</h3>
            <div className="space-y-3">
              {medicationHistory.map((day) => (
                <div key={day.date}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#2563eb" }} />
                    <span className="text-xs" style={{ color: "#6b7a99" }}>{day.date}</span>
                  </div>
                  <div className="space-y-1.5 ml-3.5">
                    {day.meds.map((med, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div>
                          <div className="text-xs" style={{ color: "#1a2b42", fontWeight: 500 }}>{med.name}</div>
                          <div className="text-xs" style={{ color: "#6b7a99" }}>{med.dose} · {med.time}</div>
                        </div>
                        <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: statusStyles[med.status]?.bg, color: statusStyles[med.status]?.color }}>
                          {med.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full py-1.5 rounded-lg border text-xs mt-3" style={{ borderColor: "rgba(0,0,0,0.1)", color: "#2563eb" }}>
              View Full History
            </button>
          </div>

          {/* Medication Tips */}
          <div className="bg-white rounded-xl border p-4" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: "#eff6ff" }}>
                <Lightbulb size={13} style={{ color: "#2563eb" }} />
              </div>
              <span className="text-xs" style={{ color: "#1a2b42", fontWeight: 700 }}>Medication Tips</span>
            </div>
            <p className="text-xs" style={{ color: "#6b7a99" }}>
              Ensure medications are taken with the right dosage at the right time for better health outcomes.
            </p>
          </div>
        </div>
      </div>
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
