import { ImagePlus, Save, X } from "lucide-react";
import { useState } from "react";
import type { ValidationErrors } from "../api/profiles";
import type { ElderlyProfile } from "./data";

interface EditProfilePanelProps {
  profile: ElderlyProfile;
  onClose: () => void;
  onSave: (updated: ElderlyProfile) => Promise<ValidationErrors | void> | ValidationErrors | void;
}

function validateProfile(profile: ElderlyProfile) {
  const errors: ValidationErrors = {};
  const name = profile.name;
  const age = Number(profile.age);

  if (!name.trim()) errors.name = "Full name is required.";
  else if (name.trim().length > 10) errors.name = "Full name must be 10 characters or fewer.";
  else if (name.startsWith(" ")) errors.name = "Full name cannot start with a space.";
  else if (name.includes("  ")) errors.name = "Full name cannot contain double spaces.";
  else if (!/[A-Za-z]/.test(name)) errors.name = "Full name must contain at least one letter.";

  if (!Number.isInteger(age)) errors.age = "Age must be a whole number.";
  else if (age < 50 || age > 120) errors.age = "Elderly age must be between 50 and 120.";

  if (!profile.gender) errors.gender = "Gender is required.";
  if (!profile.phone.trim()) errors.phone = "Phone is required.";
  else if (!/^09-\d{9}$/.test(profile.phone.trim())) {
    errors.phone = "Phone must use format 09-#########.";
  }

  if (!profile.address.trim()) errors.address = "Address is required.";
  else if (profile.address.trim().length > 500) errors.address = "Address must be 500 characters or fewer.";

  if (!profile.medicalCondition.trim()) errors.medicalCondition = "Medical conditions are required.";
  else if (profile.medicalCondition.trim().length > 500) {
    errors.medicalCondition = "Medical conditions must be 500 characters or fewer.";
  }

  if (!profile.allergies.trim()) errors.allergies = "Allergies are required.";
  else if (profile.allergies.trim().length > 300) errors.allergies = "Allergies must be 300 characters or fewer.";

  if (!profile.bloodType.trim()) errors.bloodType = "Blood type is required.";
  else if (!/^(A|B|AB|O)[+-]$/i.test(profile.bloodType.trim())) {
    errors.bloodType = "Blood type must be A+, A-, B+, B-, AB+, AB-, O+, or O-.";
  }

  if (!profile.emergencyContact.trim()) errors.emergencyContact = "Emergency contact name is required.";
  else if (profile.emergencyContact.trim().length > 100) {
    errors.emergencyContact = "Emergency contact name must be 100 characters or fewer.";
  } else if (!/[A-Za-z]/.test(profile.emergencyContact)) {
    errors.emergencyContact = "Emergency contact name must contain at least one letter.";
  }

  if (!profile.emergencyPhone.trim()) errors.emergencyPhone = "Emergency phone is required.";
  else if (!/^09-\d{9}$/.test(profile.emergencyPhone.trim())) {
    errors.emergencyPhone = "Emergency phone must use format 09-#########.";
  }

  if (!profile.emergencyAddress.trim()) errors.emergencyAddress = "Emergency address is required.";
  else if (profile.emergencyAddress.trim().length > 500) {
    errors.emergencyAddress = "Emergency address must be 500 characters or fewer.";
  }

  return errors;
}

export function EditProfilePanel({ profile, onClose, onSave }: EditProfilePanelProps) {
  const [form, setForm] = useState<ElderlyProfile>({ ...profile, age: Number(profile.age) || 0 });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [saving, setSaving] = useState(false);

  const update = (field: keyof ElderlyProfile, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value as never }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleSave = async () => {
    const validationErrors = validateProfile({ ...form, age: Number(form.age) || 0 });
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    try {
      const result = await onSave({ ...form, age: Number(form.age) || 0 });
      if (result && Object.keys(result).length > 0) {
        setErrors(result);
      } else {
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80]"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="fixed left-1/2 top-1/2 flex max-h-[92vh] w-[min(720px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
          <div>
            <h2 style={{ color: "#1a2b42", fontWeight: 700 }}>Edit Elderly Profile</h2>
            <p className="text-xs mt-0.5" style={{ color: "#6b7a99" }}>
              Update the details for {profile.name}
            </p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100">
            <X size={16} style={{ color: "#6b7a99" }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <FormSection title="Profile Photo">
            <EditPhotoField value={form.avatar} onChange={(v) => update("avatar", v)} />
          </FormSection>

          <FormSection title="Personal Information">
            <FormRow>
              <Field label="Full Name" value={form.name} error={errors.name} onChange={(v) => update("name", v)} />
              <Field label="Age" type="number" value={String(form.age)} error={errors.age} onChange={(v) => update("age", v)} />
            </FormRow>
            <FormRow>
              <FieldSelect label="Gender" value={form.gender} options={["Male", "Female", "Other"]} error={errors.gender} onChange={(v) => update("gender", v)} />
              <Field label="Date of Birth" value={form.dob} error={errors.dob} onChange={(v) => update("dob", v)} />
            </FormRow>
            <Field label="Phone" value={form.phone} error={errors.phone} onChange={(v) => update("phone", v)} />
            <Field label="Address" value={form.address} error={errors.address} onChange={(v) => update("address", v)} />
          </FormSection>

          <FormSection title="Medical Information">
            <Field label="Medical Condition" value={form.medicalCondition} error={errors.medicalCondition} onChange={(v) => update("medicalCondition", v)} />
            <FormRow>
              <Field label="Blood Type" value={form.bloodType} error={errors.bloodType} onChange={(v) => update("bloodType", v)} />
              <Field label="Allergies" value={form.allergies} error={errors.allergies} onChange={(v) => update("allergies", v)} />
            </FormRow>
            <Field label="Doctor Name" value={form.doctorName} error={errors.doctorName} onChange={(v) => update("doctorName", v)} />
          </FormSection>

          <FormSection title="Emergency Contact">
            <FormRow>
              <Field label="Contact Name" value={form.emergencyContact} error={errors.emergencyContact} onChange={(v) => update("emergencyContact", v)} />
              <Field label="Relationship" value={form.relationship} error={errors.relationship} onChange={(v) => update("relationship", v)} />
            </FormRow>
            <Field label="Emergency Phone" value={form.emergencyPhone} error={errors.emergencyPhone} onChange={(v) => update("emergencyPhone", v)} />
            <Field label="Emergency Address" value={form.emergencyAddress} error={errors.emergencyAddress} onChange={(v) => update("emergencyAddress", v)} />
          </FormSection>

          <FormSection title="Status Details">
            <FieldSelect label="Status" value={form.status} options={["Active", "Inactive"]} onChange={(v) => update("status", v)} />
            <Field label="Admission Date" value={form.admissionDate} error={errors.admissionDate} onChange={(v) => update("admissionDate", v)} />
          </FormSection>
        </div>

        <div className="flex gap-2 p-4 border-t flex-shrink-0" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border text-sm transition-colors hover:bg-gray-50" style={{ borderColor: "rgba(0,0,0,0.12)", color: "#6b7a99" }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm text-white transition-colors hover:opacity-90" style={{ backgroundColor: "#2563eb", opacity: saving ? 0.7 : 1 }}>
            <Save size={14} />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs mb-3 pb-1 border-b" style={{ color: "#1a2b42", fontWeight: 700, borderColor: "rgba(0,0,0,0.07)" }}>
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
  error,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-xs block mb-1" style={{ color: "#6b7a99" }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-1.5 rounded-lg border text-xs outline-none transition-colors"
        style={{
          borderColor: error ? "#ef4444" : "rgba(0,0,0,0.12)",
          backgroundColor: "#f8fafc",
          color: "#1a2b42",
        }}
        onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
        onBlur={(e) => (e.target.style.borderColor = error ? "#ef4444" : "rgba(0,0,0,0.12)")}
      />
      {error && <p className="mt-1 text-xs" style={{ color: "#ef4444" }}>{error}</p>}
    </div>
  );
}

function FieldSelect({
  label,
  value,
  options,
  onChange,
  error,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  error?: string;
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
          borderColor: error ? "#ef4444" : "rgba(0,0,0,0.12)",
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
      {error && <p className="mt-1 text-xs" style={{ color: "#ef4444" }}>{error}</p>}
    </div>
  );
}

function EditPhotoField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const preview = value?.trim() || "https://i.pravatar.cc/80?u=elderly-edit";
  const handleUpload = (file?: File) => {
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onChange(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <label className="text-xs block" style={{ color: "#6b7a99" }}>Profile Photo</label>
      <div className="relative">
        <img
          src={preview}
          alt=""
          className="h-24 w-24 rounded-full border-4 object-cover shadow-sm"
          style={{ borderColor: "#fff", boxShadow: "0 8px 24px rgba(15,23,42,0.12)" }}
          onError={(event) => {
            event.currentTarget.src = "https://i.pravatar.cc/80?u=elderly-edit";
          }}
        />
        <label className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 bg-white shadow-md transition-colors hover:bg-blue-50" style={{ borderColor: "#fff", color: "#2563eb" }}>
          <ImagePlus size={16} />
          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e.target.files?.[0])} />
        </label>
      </div>
      {value && (
        <button type="button" onClick={() => onChange("")} className="text-xs hover:underline" style={{ color: "#dc2626" }}>
          Remove photo
        </button>
      )}
    </div>
  );
}
