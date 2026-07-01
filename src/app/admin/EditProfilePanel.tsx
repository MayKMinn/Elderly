import { X, Save } from "lucide-react";
import { useState } from "react";
import type { ElderlyProfile } from "./data";

interface EditProfilePanelProps {
  profile: ElderlyProfile;
  onClose: () => void;
  onSave: (updated: ElderlyProfile) => void;
}

export function EditProfilePanel({ profile, onClose, onSave }: EditProfilePanelProps) {
  const [form, setForm] = useState({ ...profile });

  const update = (field: keyof ElderlyProfile, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div
      className="fixed inset-0 z-[80]"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="fixed left-1/2 top-1/2 flex max-h-[92vh] w-[min(720px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
          style={{ borderColor: "rgba(0,0,0,0.07)" }}
        >
          <div>
            <h2 style={{ color: "#1a2b42", fontWeight: 700 }}>Edit Elderly Profile</h2>
            <p className="text-xs mt-0.5" style={{ color: "#6b7a99" }}>
              Update the details for {profile.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100"
          >
            <X size={16} style={{ color: "#6b7a99" }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Personal Info */}
          <FormSection title="Personal Information">
            <FormRow>
              <Field label="Full Name" value={form.name} onChange={(v) => update("name", v)} />
              <Field label="Age" value={String(form.age)} onChange={(v) => update("age" as any, v)} />
            </FormRow>
            <FormRow>
              <FieldSelect
                label="Gender"
                value={form.gender}
                options={["Male", "Female", "Other"]}
                onChange={(v) => update("gender", v)}
              />
              <Field label="Date of Birth" value={form.dob} onChange={(v) => update("dob", v)} />
            </FormRow>
            <Field label="Phone" value={form.phone} onChange={(v) => update("phone", v)} />
            <Field label="Address" value={form.address} onChange={(v) => update("address", v)} />
          </FormSection>

          {/* Medical Info */}
          <FormSection title="Medical Information">
            <Field
              label="Medical Condition"
              value={form.medicalCondition}
              onChange={(v) => update("medicalCondition", v)}
            />
            <FormRow>
              <Field label="Blood Type" value={form.bloodType} onChange={(v) => update("bloodType", v)} />
              <Field label="Allergies" value={form.allergies} onChange={(v) => update("allergies", v)} />
            </FormRow>
            <Field label="Doctor Name" value={form.doctorName} onChange={(v) => update("doctorName", v)} />
          </FormSection>

          {/* Emergency Contact */}
          <FormSection title="Emergency Contact">
            <FormRow>
              <Field
                label="Contact Name"
                value={form.emergencyContact}
                onChange={(v) => update("emergencyContact", v)}
              />
              <Field
                label="Relationship"
                value={form.relationship}
                onChange={(v) => update("relationship", v)}
              />
            </FormRow>
            <Field
              label="Emergency Phone"
              value={form.emergencyPhone}
              onChange={(v) => update("emergencyPhone", v)}
            />
          </FormSection>

          {/* Status */}
          <FormSection title="Status Details">
            <FieldSelect
              label="Status"
              value={form.status}
              options={["Active", "Inactive"]}
              onChange={(v) => update("status" as any, v)}
            />
            <Field
              label="Admission Date"
              value={form.admissionDate}
              onChange={(v) => update("admissionDate", v)}
            />
          </FormSection>
        </div>

        <div
          className="flex gap-2 p-4 border-t flex-shrink-0"
          style={{ borderColor: "rgba(0,0,0,0.07)" }}
        >
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border text-sm transition-colors hover:bg-gray-50"
            style={{ borderColor: "rgba(0,0,0,0.12)", color: "#6b7a99" }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: "#2563eb" }}
          >
            <Save size={14} />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3
        className="text-xs mb-3 pb-1 border-b"
        style={{ color: "#1a2b42", fontWeight: 700, borderColor: "rgba(0,0,0,0.07)" }}
      >
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function FormRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs block mb-1" style={{ color: "#6b7a99" }}>
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-1.5 rounded-lg border text-xs outline-none transition-colors"
        style={{
          borderColor: "rgba(0,0,0,0.12)",
          backgroundColor: "#f8fafc",
          color: "#1a2b42",
        }}
        onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
        onBlur={(e) => (e.target.style.borderColor = "rgba(0,0,0,0.12)")}
      />
    </div>
  );
}

function FieldSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs block mb-1" style={{ color: "#6b7a99" }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-1.5 rounded-lg border text-xs outline-none"
        style={{
          borderColor: "rgba(0,0,0,0.12)",
          backgroundColor: "#f8fafc",
          color: "#1a2b42",
        }}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
