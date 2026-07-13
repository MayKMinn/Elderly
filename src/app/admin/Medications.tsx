import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  Dna,
  Droplets,
  ListOrdered,
  Pencil,
  Pill,
  Plus,
  Search,
  Trash2,
  User,
} from "lucide-react";
import {
  createElderlyMedication,
  deleteElderlyMedication,
  getElderlyMedications,
  updateElderlyMedication,
} from "../api/medications";
import type { ElderlyMedication, ElderlyMedicationPayload } from "../api/medications";
import { getProfiles } from "../api/profiles";
import { DeleteModal } from "./DeleteModal";
import { ViewProfileModal } from "./ViewProfileModal";
import type { ElderlyProfile } from "./data";

const emptyForm = {
  medicationName: "",
  dosage: "",
  instructions: "",
  notes: "",
  status: "Active" as "Active" | "Inactive",
};

type Page = "dashboard" | "manage-profiles" | "schedules" | "medications" | "reports" | "login-history" | "settings";

interface MedicationsProps {
  onNavigate: (page: Page) => void;
}

export function Medications({ onNavigate }: MedicationsProps) {
  const [elderlyProfiles, setElderlyProfiles] = useState<ElderlyProfile[]>([]);
  const [medications, setMedications] = useState<ElderlyMedication[]>([]);
  const [selectedElderlyId, setSelectedElderlyId] = useState("");
  const [formElderlyId, setFormElderlyId] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingMedication, setEditingMedication] = useState<ElderlyMedication | null>(null);
  const [pendingDeleteMedication, setPendingDeleteMedication] = useState<ElderlyMedication | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [viewProfile, setViewProfile] = useState(false);

  const selectedElderly = elderlyProfiles.find((elderly) => String(elderly.id) === formElderlyId) || null;
  const selectedListElderly = elderlyProfiles.find((elderly) => String(elderly.id) === selectedElderlyId) || null;
  const searchText = search.trim().toLowerCase();
  const filteredMedications = useMemo(() => {
    return medications.filter((medication) => {
      if (selectedElderlyId && String(medication.elderlyId) !== selectedElderlyId) return false;
      if (!searchText) return true;

      return [
        medication.elderlyName,
        medication.medicationName,
        medication.dosage,
        medication.instructions,
      ].some((value) => String(value || "").toLowerCase().includes(searchText));
    });
  }, [medications, searchText, selectedElderlyId]);

  const activeCount = medications.filter((medication) => medication.status === "Active").length;
  const selectedMedicationCount = selectedElderlyId
    ? medications.filter((medication) => String(medication.elderlyId) === selectedElderlyId && medication.status === "Active").length
    : activeCount;

  function loadData() {
    setLoading(true);
    setMessage("");

    Promise.all([getProfiles(), getElderlyMedications()])
      .then(([profileResponse, medicationResponse]) => {
        setElderlyProfiles(profileResponse.elderly);
        setMedications(medicationResponse.medications);
        setSelectedElderlyId((current) => (
          current && profileResponse.elderly.some((elderly) => String(elderly.id) === current)
            ? current
            : ""
        ));
        setFormElderlyId((current) => (
          current && profileResponse.elderly.some((elderly) => String(elderly.id) === current)
            ? current
            : ""
        ));
      })
      .catch((error) => {
        setElderlyProfiles([]);
        setMedications([]);
        setMessage("Failed to load elderly medications.");
        console.error(error);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, []);

  function resetForm() {
    setForm(emptyForm);
    setFormElderlyId("");
    setEditingMedication(null);
    setErrors({});
    setMessage("");
  }

  function openCreateForm() {
    resetForm();
    setShowForm(true);
  }

  function openEditForm(medication: ElderlyMedication) {
    setEditingMedication(medication);
    setFormElderlyId(String(medication.elderlyId));
    setForm({
      medicationName: medication.medicationName,
      dosage: medication.dosage,
      instructions: medication.instructions,
      notes: medication.notes || "",
      status: medication.status,
    });
    setErrors({});
    setMessage("");
    setShowForm(true);
  }

  function validateForm() {
    const nextErrors: Record<string, string> = {};

    if (!selectedElderly) nextErrors.elderlyId = "Select an elderly profile.";
    if (!form.medicationName.trim()) nextErrors.medicationName = "Medicine name is required.";
    if (!form.dosage.trim()) nextErrors.dosage = "Dosage is required.";
    if (!form.instructions.trim()) nextErrors.instructions = "Instructions are required.";

    return nextErrors;
  }

  async function handleSaveMedication() {
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setMessage("");
      return;
    }

    if (!selectedElderly) return;

    const payload: ElderlyMedicationPayload = {
      elderlyId: String(selectedElderly.id),
      elderlyName: selectedElderly.name,
      medicationName: form.medicationName.trim(),
      dosage: form.dosage.trim(),
      instructions: form.instructions.trim(),
      notes: form.notes.trim(),
      status: form.status,
    };

    setSaving(true);
    setErrors({});
    setMessage("");

    try {
      const saved = editingMedication
        ? await updateElderlyMedication(editingMedication.id, payload)
        : await createElderlyMedication(payload);

      setMedications((current) => editingMedication
        ? current.map((medication) => medication.id === saved.id ? saved : medication)
        : [saved, ...current]);
      setMessage(editingMedication ? "Medication updated successfully." : "Medication assigned to elderly successfully.");
      setShowForm(false);
      resetForm();
    } catch (error) {
      setMessage("Failed to save medication.");
      console.error(error);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteMedication() {
    if (!pendingDeleteMedication) return;

    try {
      await deleteElderlyMedication(pendingDeleteMedication.id);
      setMedications((current) => current.filter((medication) => medication.id !== pendingDeleteMedication.id));
      setMessage("Medication deleted successfully.");
    } catch (error) {
      setMessage("Failed to delete medication.");
      console.error(error);
    } finally {
      setPendingDeleteMedication(null);
    }
  }

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
          <span>Medications</span><span>/</span>
          <span style={{ color: "#1a2b42", fontWeight: 500 }}>Elderly Medications</span>
        </div>
        <button
          onClick={openCreateForm}
          className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm text-white"
          style={{ backgroundColor: "#2563eb" }}
        >
          <Plus size={14} /> Add Elderly Medication
        </button>
      </div>

      <div className="mb-5 grid grid-cols-4 gap-4">
        {[
          { label: "Active Medications", value: activeCount, sub: "Current elderly medication list", icon: <Pill size={20} />, iconBg: "#eff6ff", iconColor: "#818cf8" },
          { label: "Selected Elderly Meds", value: selectedMedicationCount, sub: selectedListElderly?.name || "All elderly", icon: <User size={20} />, iconBg: "#ecfdf5", iconColor: "#22c55e" },
          { label: "Inactive Medications", value: medications.filter((medication) => medication.status === "Inactive").length, sub: "Kept for medication history", icon: <Pill size={20} />, iconBg: "#f8fafc", iconColor: "#64748b" },
          { label: "Elderly Profiles", value: elderlyProfiles.length, sub: "Available for medication setup", icon: <User size={20} />, iconBg: "#fff7ed", iconColor: "#f97316" },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border bg-white p-4" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: item.iconBg, color: item.iconColor }}>
              {item.icon}
            </div>
            <div className="mb-0.5 text-2xl" style={{ color: "#1a2b42", fontWeight: 700 }}>{item.value}</div>
            <div className="mb-0.5 text-xs" style={{ color: "#1a2b42" }}>{item.label}</div>
            <div className="truncate text-xs" style={{ color: "#6b7a99" }}>{item.sub}</div>
          </div>
        ))}
      </div>

      {showForm ? (
        <div className="flex gap-4">
          <div className="flex-1 rounded-xl border bg-white p-5" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm" style={{ color: "#1a2b42", fontWeight: 700 }}>
                  {editingMedication ? "Edit Elderly Medication" : "Assign Medication to Elderly"}
                </h3>
                <p className="mt-0.5 text-xs" style={{ color: "#6b7a99" }}>
                  This medication list will appear when creating a schedule with purpose Medication.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs hover:bg-gray-50"
                style={{ borderColor: "rgba(0,0,0,0.12)", color: "#6b7a99" }}
              >
                <ArrowLeft size={13} />
                Back to list
              </button>
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-xs" style={{ color: "#6b7a99" }}>Select Elderly</label>
              <div className="relative">
                <select
                  value={formElderlyId}
                  onChange={(event) => {
                    setFormElderlyId(event.target.value);
                    setErrors((current) => {
                      const next = { ...current };
                      delete next.elderlyId;
                      return next;
                    });
                  }}
                  className="w-full appearance-none rounded-lg border bg-white px-3 py-2 pr-9 text-xs outline-none focus:ring-2 focus:ring-blue-100"
                  style={{ borderColor: errors.elderlyId ? "#ef4444" : "rgba(0,0,0,0.12)", color: "#1a2b42" }}
                >
                  {elderlyProfiles.length === 0 ? (
                    <option value="">No elderly profiles found</option>
                  ) : (
                    <>
                      <option value="">Select elderly</option>
                      {elderlyProfiles.map((elderly) => (
                        <option key={elderly.id} value={String(elderly.id)}>{elderly.name} ({elderly.id})</option>
                      ))}
                    </>
                  )}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#6b7a99" }} />
              </div>
              {errors.elderlyId && <p className="mt-1 text-xs" style={{ color: "#dc2626" }}>{errors.elderlyId}</p>}
            </div>

            <div className="mb-4 grid grid-cols-2 gap-4">
              <MedField label="Medicine Name" placeholder="e.g., Amlodipine" value={form.medicationName} onChange={(value) => setForm((current) => ({ ...current, medicationName: value }))} error={errors.medicationName} />
              <MedField label="Dosage" placeholder="e.g., 5 mg" value={form.dosage} onChange={(value) => setForm((current) => ({ ...current, dosage: value }))} error={errors.dosage} />
            </div>

            <div className="mb-4 grid grid-cols-2 gap-4">
              <MedField label="Instructions" placeholder="e.g., 1 tablet after breakfast" value={form.instructions} onChange={(value) => setForm((current) => ({ ...current, instructions: value }))} error={errors.instructions} />
              <div>
                <label className="mb-1.5 block text-xs" style={{ color: "#6b7a99" }}>Status</label>
                <div className="relative">
                  <select
                    value={form.status}
                    onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as "Active" | "Inactive" }))}
                    className="w-full appearance-none rounded-lg border bg-white px-3 py-2 pr-9 text-xs outline-none focus:ring-2 focus:ring-blue-100"
                    style={{ borderColor: "rgba(0,0,0,0.12)", color: "#1a2b42" }}
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#6b7a99" }} />
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-xs" style={{ color: "#6b7a99" }}>Notes</label>
              <textarea
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Medication condition changes, side effects, or doctor instructions..."
                rows={3}
                className="w-full resize-none rounded-lg border px-3 py-2 text-xs outline-none"
                style={{ borderColor: "rgba(0,0,0,0.12)", color: "#1a2b42" }}
              />
            </div>

            {message && (
              <div className="mb-3 rounded-lg px-3 py-2 text-xs" style={{ backgroundColor: message.startsWith("Failed") ? "#fee2e2" : "#dcfce7", color: message.startsWith("Failed") ? "#dc2626" : "#15803d" }}>
                {message}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={resetForm} className="rounded-lg border px-5 py-2 text-sm hover:bg-gray-50" style={{ borderColor: "rgba(0,0,0,0.12)", color: "#6b7a99" }}>Reset</button>
              <button onClick={handleSaveMedication} disabled={saving} className="flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm text-white" style={{ backgroundColor: "#2563eb", opacity: saving ? 0.7 : 1 }}>
                <Pill size={14} /> {saving ? "Saving..." : editingMedication ? "Update Medication" : "Save Medication"}
              </button>
            </div>
          </div>

          <SelectedElderlyPanel elderly={selectedElderly} onView={() => setViewProfile(true)} />
        </div>
      ) : (
        <MedicationList
          elderlyProfiles={elderlyProfiles}
          medications={filteredMedications}
          loading={loading}
          selectedElderlyId={selectedElderlyId}
          search={search}
          onSearch={setSearch}
          onSelectElderly={setSelectedElderlyId}
          onEdit={openEditForm}
          onDelete={setPendingDeleteMedication}
          onRefresh={loadData}
        />
      )}

      {selectedElderly && viewProfile && (
        <ViewProfileModal
          profile={selectedElderly}
          onClose={() => setViewProfile(false)}
          onEdit={() => setViewProfile(false)}
        />
      )}
      {pendingDeleteMedication && (
        <DeleteModal
          name={pendingDeleteMedication.medicationName}
          onConfirm={handleDeleteMedication}
          onCancel={() => setPendingDeleteMedication(null)}
        />
      )}
    </div>
  );
}

function MedicationList({
  elderlyProfiles,
  medications,
  loading,
  selectedElderlyId,
  search,
  onSearch,
  onSelectElderly,
  onEdit,
  onDelete,
  onRefresh,
}: {
  elderlyProfiles: ElderlyProfile[];
  medications: ElderlyMedication[];
  loading: boolean;
  selectedElderlyId: string;
  search: string;
  onSearch: (value: string) => void;
  onSelectElderly: (value: string) => void;
  onEdit: (medication: ElderlyMedication) => void;
  onDelete: (medication: ElderlyMedication) => void;
  onRefresh: () => void;
}) {
  const elderlyProfileMap = useMemo(() => {
    return elderlyProfiles.reduce<Record<string, ElderlyProfile>>((map, elderly) => {
      map[String(elderly.id)] = elderly;
      return map;
    }, {});
  }, [elderlyProfiles]);

  return (
    <div className="rounded-xl border bg-white" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
        <div>
          <h3 className="text-sm" style={{ color: "#1a2b42", fontWeight: 700 }}>Elderly Medication List</h3>
          <p className="mt-0.5 text-xs" style={{ color: "#6b7a99" }}>These medicines appear in Medication schedules for the selected elderly.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#6b7a99" }} />
            <input
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Search medications..."
              className="w-52 rounded-lg border py-1.5 pl-8 pr-3 text-xs outline-none"
              style={{ borderColor: "rgba(0,0,0,0.1)", color: "#1a2b42" }}
            />
          </div>
          <div className="relative">
            <select
              value={selectedElderlyId}
              onChange={(event) => onSelectElderly(event.target.value)}
              className="w-52 appearance-none rounded-lg border bg-white px-3 py-1.5 pr-8 text-xs outline-none"
              style={{ borderColor: "rgba(0,0,0,0.1)", color: "#1a2b42" }}
            >
              <option value="">All elderly</option>
              {elderlyProfiles.map((elderly) => (
                <option key={elderly.id} value={String(elderly.id)}>{elderly.name}</option>
              ))}
            </select>
            <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#6b7a99" }} />
          </div>
          <button onClick={onRefresh} className="rounded-lg border px-3 py-1.5 text-xs hover:bg-gray-50" style={{ borderColor: "rgba(0,0,0,0.12)", color: "#2563eb" }}>
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="px-5 py-10 text-center text-sm" style={{ color: "#6b7a99" }}>Loading medications...</div>
      ) : medications.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}>
            <Pill size={20} />
          </div>
          <div className="text-sm" style={{ color: "#1a2b42", fontWeight: 700 }}>No elderly medications found</div>
          <div className="mt-1 text-xs" style={{ color: "#6b7a99" }}>Click Add Elderly Medication to create one.</div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-xs">
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", color: "#6b7a99" }}>
                <th className="px-5 py-3 font-medium">Medicine</th>
                <th className="px-5 py-3 font-medium">Elderly</th>
                <th className="px-5 py-3 font-medium">Dosage</th>
                <th className="px-5 py-3 font-medium">Instructions</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Updated</th>
                <th className="px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {medications.map((medication) => {
                const elderlyProfile = elderlyProfileMap[String(medication.elderlyId)];

                return (
                  <tr key={medication.id} className="border-t" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
                    <td className="px-5 py-3">
                      <div style={{ color: "#1a2b42", fontWeight: 700 }}>{medication.medicationName}</div>
                      <div className="mt-0.5 max-w-xs truncate" style={{ color: "#6b7a99" }}>{medication.notes || "-"}</div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {elderlyProfile?.avatar ? (
                          <img src={elderlyProfile.avatar} className="h-8 w-8 rounded-full object-cover" alt="" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}>
                            <User size={14} />
                          </div>
                        )}
                        <div>
                          <div style={{ color: "#1a2b42", fontWeight: 700 }}>{medication.elderlyName}</div>
                          <div className="text-xs" style={{ color: "#6b7a99" }}>{medication.elderlyId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3" style={{ color: "#1a2b42" }}>{medication.dosage}</td>
                    <td className="px-5 py-3" style={{ color: "#1a2b42" }}>{medication.instructions}</td>
                    <td className="px-5 py-3">
                      <span
                        className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={{
                          backgroundColor: medication.status === "Active" ? "#dcfce7" : "#fee2e2",
                          color: medication.status === "Active" ? "#16a34a" : "#dc2626",
                        }}
                      >
                        {medication.status}
                      </span>
                    </td>
                    <td className="px-5 py-3" style={{ color: "#6b7a99" }}>{medication.updatedAt || medication.createdAt}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <ActionIcon color="#22c55e" label="Edit medication" onClick={() => onEdit(medication)}>
                          <Pencil size={13} />
                        </ActionIcon>
                        <ActionIcon color="#ef4444" label="Delete medication" onClick={() => onDelete(medication)}>
                          <Trash2 size={13} />
                        </ActionIcon>
                      </div>
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

function SelectedElderlyPanel({ elderly, onView }: { elderly: ElderlyProfile | null; onView: () => void }) {
  return (
    <div className="w-64 flex-shrink-0">
      <div className="rounded-xl border bg-white p-4" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
        <h3 className="mb-3 text-xs" style={{ color: "#1a2b42", fontWeight: 700 }}>Selected Elderly</h3>
        {elderly ? (
          <>
            <div className="mb-3 flex items-center gap-2">
              {elderly.avatar ? (
                <img src={elderly.avatar} className="h-10 w-10 rounded-full object-cover" alt="" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}>
                  <User size={16} />
                </div>
              )}
              <div>
                <div className="text-sm" style={{ color: "#1a2b42", fontWeight: 600 }}>{elderly.name}</div>
                <div className="text-xs" style={{ color: "#6b7a99" }}>ID: {elderly.id}</div>
              </div>
            </div>
            <div className="mb-3 grid grid-cols-3 gap-2 text-center">
              <InfoTile icon={<Dna size={12} />} label="Age" value={String(elderly.age || "-")} />
              <InfoTile icon={<User size={12} />} label="Gender" value={elderly.gender || "-"} />
              <InfoTile icon={<Droplets size={12} />} label="Blood" value={elderly.bloodType || "-"} />
            </div>
            <button onClick={onView} className="w-full rounded-lg border py-1.5 text-xs" style={{ borderColor: "rgba(0,0,0,0.1)", color: "#2563eb" }}>
              <ListOrdered size={12} className="mr-1 inline" />
              View Full Profile
            </button>
          </>
        ) : (
          <div className="rounded-lg border border-dashed p-4 text-center" style={{ borderColor: "rgba(0,0,0,0.12)" }}>
            <User size={18} className="mx-auto mb-2" style={{ color: "#9ca3af" }} />
            <div className="text-xs" style={{ color: "#6b7a99" }}>Select an elderly profile.</div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-2">
      <div className="mx-auto mb-1 flex justify-center" style={{ color: "#6b7a99" }}>{icon}</div>
      <div className="text-xs" style={{ color: "#6b7a99" }}>{label}</div>
      <div className="text-xs" style={{ color: "#1a2b42", fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function ActionIcon({
  children,
  color,
  label,
  onClick,
}: {
  children: React.ReactNode;
  color: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-gray-50"
      style={{ color }}
    >
      {children}
    </button>
  );
}

function MedField({ label, placeholder, value, onChange, error }: { label: string; placeholder: string; value: string; onChange: (value: string) => void; error?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs" style={{ color: "#6b7a99" }}>{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border bg-white px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-100"
        style={{ borderColor: error ? "#ef4444" : "rgba(0,0,0,0.12)", color: "#1a2b42" }}
      />
      {error && <p className="mt-1 text-xs" style={{ color: "#dc2626" }}>{error}</p>}
    </div>
  );
}
