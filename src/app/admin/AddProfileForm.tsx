import { useState } from "react";
import { X } from "lucide-react";
import type { NewProfilePayload, ValidationErrors } from "../api/profiles";

interface AddProfileFormProps {
  type: "elderly" | "nurse";
  onBack: () => void;
  onSave: (profile: NewProfilePayload) => Promise<ValidationErrors | void> | ValidationErrors | void;
}

const emptyProfile: NewProfilePayload = {
  type: "elderly",
  name: "",
  age: "",
  gender: "",
  phone: "",
  email: "",
  birthdate: "",
  address: "",
  medicalCondition: "",
  bloodType: "",
  allergies: "",
  emergencyName: "",
  emergencyPhone: "",
  elderlyStatus: "active",
  enrollDate: "",
  doctorName: "",
  admissionDate: "",
  username: "",
  password: "",
  confirmPassword: "",
  position: "",
  workArea: "",
  hireDate: "",
  nurseStatus: "",
};

function validateElderlyBirthdate(value: string) {
  if (!value) return undefined;

  const birthdate = new Date(`${value}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (Number.isNaN(birthdate.getTime())) return "Enter a valid birthdate.";
  if (birthdate > today) return "Birthdate cannot be in the future.";

  let age = today.getFullYear() - birthdate.getFullYear();
  const hasHadBirthday =
    today.getMonth() > birthdate.getMonth() ||
    (today.getMonth() === birthdate.getMonth() && today.getDate() >= birthdate.getDate());

  if (!hasHadBirthday) age -= 1;

  if (age < 50 || age > 120) return "Birthdate must make age between 50 and 120.";

  return undefined;
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getElderlyBirthdateLimits() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const min = new Date(today);
  min.setFullYear(today.getFullYear() - 120);

  const max = new Date(today);
  max.setFullYear(today.getFullYear() - 50);

  return {
    min: formatDateInput(min),
    max: formatDateInput(max),
  };
}

export function AddProfileForm({ type, onBack, onSave }: AddProfileFormProps) {
  const isNurse = type === "nurse";
  const elderlyBirthdateLimits = getElderlyBirthdateLimits();
  const [form, setForm] = useState<NewProfilePayload>({ ...emptyProfile, type });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [saving, setSaving] = useState(false);

  const validateField = (
    field: keyof NewProfilePayload,
    value: string,
    currentForm: NewProfilePayload
  ) => {
    const trimmedValue = value.trim();

    if (field === "name") {
      if (!trimmedValue) return "Full name is required.";
      if (trimmedValue.length > 10) return "Full name must be 10 characters or fewer.";
      if (value.startsWith(" ")) return "Full name cannot start with a space.";
      if (value.includes("  ")) return "Full name cannot contain double spaces.";
      if (!/[A-Za-z]/.test(value)) return "Full name must contain at least one letter.";
    }

    if (field === "age") {
      const age = Number(value);
      if (!trimmedValue) return "Age is required.";
      if (!Number.isInteger(age)) return "Age must be a whole number.";
      if (currentForm.type === "nurse" && (age < 18 || age > 80)) {
        return "Caregiver age must be between 18 and 80.";
      }
      if (currentForm.type === "elderly" && (age < 50 || age > 120)) {
        return "Elderly age must be between 50 and 120.";
      }
    }

    if (field === "gender" && !trimmedValue) return "Gender is required.";

    if (field === "phone") {
      if (!trimmedValue) return "Phone is required.";
      if (!/^09-\d{10}$/.test(trimmedValue)) return "Phone must use format 09-##########.";
    }

    if (field === "email" && trimmedValue) {
      if (trimmedValue.length > 160) return "Email must be 160 characters or fewer.";
      if (!/^[A-Za-z][A-Za-z0-9]*@[A-Za-z]+\.[A-Za-z]{2,}$/.test(trimmedValue)) {
        return "Email must be like name@gmail.com with one @ and one dot.";
      }
    }

    if (field === "address" && currentForm.type === "elderly") {
      if (!trimmedValue) return "Address is required.";
      if (trimmedValue.length > 500) return "Address must be 500 characters or fewer.";
    }

    if (field === "birthdate" && currentForm.type === "elderly") {
      return validateElderlyBirthdate(value);
    }

    if (field === "medicalCondition" && currentForm.type === "elderly") {
      if (!trimmedValue) return "Medical conditions are required.";
      if (trimmedValue.length > 500) return "Medical conditions must be 500 characters or fewer.";
    }

    if (field === "allergies" && currentForm.type === "elderly") {
      if (!trimmedValue) return "Allergies are required.";
      if (trimmedValue.length > 300) return "Allergies must be 300 characters or fewer.";
    }

    if (field === "bloodType" && currentForm.type === "elderly") {
      if (!trimmedValue) return "Blood type is required.";
      if (!/^(A|B|AB|O)[+-]$/i.test(trimmedValue)) {
        return "Blood type must be A+, A-, B+, B-, AB+, AB-, O+, or O-.";
      }
    }

    if (field === "emergencyName" && currentForm.type === "elderly") {
      if (!trimmedValue) return "Emergency contact name is required.";
      if (trimmedValue.length > 100) return "Emergency contact name must be 100 characters or fewer.";
      if (!/[A-Za-z]/.test(value)) return "Emergency contact name must contain at least one letter.";
    }

    if (field === "emergencyPhone" && currentForm.type === "elderly") {
      if (!trimmedValue) return "Emergency phone is required.";
      if (!/^09-\d{10}$/.test(trimmedValue)) return "Emergency phone must use format 09-##########.";
    }

    if (currentForm.type === "nurse") {
      if (field === "position" && !trimmedValue) return "Position is required.";
      if (field === "workArea" && !trimmedValue) return "Work area is required.";
      if (field === "hireDate" && !trimmedValue) return "Hire date is required.";
      if (field === "nurseStatus" && !trimmedValue) return "Nurse status is required.";
    }

    if (field === "username" && trimmedValue && trimmedValue.length < 4) {
      return "Username must be at least 4 characters.";
    }

    if (field === "password" && trimmedValue && trimmedValue.length < 8) {
      return "Password must be at least 8 characters.";
    }

    if (field === "confirmPassword" && currentForm.password !== currentForm.confirmPassword) {
      return "Passwords must match.";
    }

    return undefined;
  };

  const validateForm = (currentForm: NewProfilePayload) => {
    const nextErrors: ValidationErrors = {};

    (Object.keys(currentForm) as Array<keyof NewProfilePayload>).forEach((field) => {
      if (field === "type") return;
      const error = validateField(field, currentForm[field], currentForm);
      if (error) nextErrors[field] = error;
    });

    return nextErrors;
  };

  const setField = (field: keyof NewProfilePayload, value: string) => {
    setForm((prevForm) => {
      const nextForm = { ...prevForm, [field]: value };

      setErrors((prevErrors) => {
        const nextErrors = { ...prevErrors };
        const fieldError = validateField(field, value, nextForm);

        if (fieldError) nextErrors[field] = fieldError;
        else delete nextErrors[field];

        if (field === "password" || field === "confirmPassword") {
          const confirmError = validateField("confirmPassword", nextForm.confirmPassword, nextForm);
          if (confirmError) nextErrors.confirmPassword = confirmError;
          else delete nextErrors.confirmPassword;
        }

        return nextErrors;
      });

      return nextForm;
    });
  };

  const handleSubmit = async () => {
    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    setErrors({});

    try {
      const validationErrors = await onSave(form);
      if (validationErrors && Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-1.5 text-xs mb-4" style={{ color: "#6b7a99" }}>
          <button onClick={onBack} className="hover:text-blue-600 transition-colors">
            Manage Profiles
          </button>
          <span>/</span>
          <span>{isNurse ? "Caregiver Profiles" : "Elderly Profiles"}</span>
          <span>/</span>
          <span style={{ color: "#1a2b42", fontWeight: 500 }}>
            Add New {isNurse ? "Caregiver" : "Elderly"} Profile
          </span>
        </div>

        <div className="bg-white rounded-2xl border p-6" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
          <h2 className="text-base mb-1" style={{ color: "#1a2b42", fontWeight: 700 }}>
            Add New {isNurse ? "Caregiver" : "Elderly"} Profile
          </h2>
          <p className="text-xs mb-6" style={{ color: "#6b7a99" }}>
            Fill in the details below to add a new {isNurse ? "caregiver" : "elderly"} profile.
          </p>

          <FormSection title="Basic Information">
            <div className="space-y-4">
              <FormRow2>
                <FormField
                  label="Full Name *"
                  placeholder="Enter full name"
                  value={form.name}
                  error={errors.name}
                  onChange={(value) => setField("name", value)}
                />
                <FormField
                  label="Age *"
                  placeholder={isNurse ? "e.g. 30" : "e.g. 75"}
                  value={form.age}
                  error={errors.age}
                  onChange={(value) => setField("age", value)}
                />
              </FormRow2>
              <FormRow2>
                <FormFieldSelect
                  label="Gender *"
                  placeholder="Select gender"
                  options={["Male", "Female", "Other"]}
                  value={form.gender}
                  error={errors.gender}
                  onChange={(value) => setField("gender", value)}
                />
                <FormField
                  label="Phone *"
                  placeholder="09-1234567890"
                  value={form.phone}
                  error={errors.phone}
                  onChange={(value) => setField("phone", value)}
                />
              </FormRow2>
              {isNurse ? (
                <FormField
                  label="Email"
                  placeholder="name@gmail.com"
                  value={form.email}
                  error={errors.email}
                  onChange={(value) => setField("email", value)}
                />
              ) : (
                <FormRow2>
                  <FormField
                    label="Birthdate"
                    placeholder="YYYY-MM-DD"
                    type="date"
                    min={elderlyBirthdateLimits.min}
                    max={elderlyBirthdateLimits.max}
                    value={form.birthdate}
                    error={errors.birthdate}
                    blockTyping
                    onChange={(value) => setField("birthdate", value)}
                  />
                  <FormField
                    label="Address *"
                    placeholder="Enter complete address"
                    value={form.address}
                    error={errors.address}
                    onChange={(value) => setField("address", value)}
                  />
                </FormRow2>
              )}
            </div>
          </FormSection>

          <FormSection title={isNurse ? "Professional Information" : "Medical Information"}>
            {isNurse ? (
              <>
                <FormRow2>
                  <FormField
                    label="License Number"
                    placeholder="Enter license number"
                    value={form.username}
                    error={errors.username}
                    onChange={(value) => setField("username", value)}
                  />
                  <FormFieldSelect
                    label="Position *"
                    placeholder="Select position"
                    options={["Registered Nurse", "LPN", "Charge Nurse", "Senior Nurse", "Nurse Practitioner"]}
                    value={form.position}
                    error={errors.position}
                    onChange={(value) => setField("position", value)}
                  />
                </FormRow2>
                <FormRow2>
                  <FormFieldSelect
                    label="Work Area *"
                    placeholder="Select work area"
                    options={["General Ward", "Memory Care Unit", "Cardiac Care", "Rehabilitation", "Palliative Care"]}
                    value={form.workArea}
                    error={errors.workArea}
                    onChange={(value) => setField("workArea", value)}
                  />
                  <FormField
                    label="Hire Date *"
                    placeholder="MM/DD/YYYY"
                    value={form.hireDate}
                    error={errors.hireDate}
                    onChange={(value) => setField("hireDate", value)}
                  />
                </FormRow2>
                <FormRow2>
                  <FormFieldSelect
                    label="Nurse Status *"
                    placeholder="Select status"
                    options={["Active", "On Leave", "Inactive"]}
                    value={form.nurseStatus}
                    error={errors.nurseStatus}
                    onChange={(value) => setField("nurseStatus", value)}
                  />
                </FormRow2>
              </>
            ) : (
              <>
                <FormRow2>
                  <FormField
                    label="Medical Conditions *"
                    placeholder="e.g. Hypertension"
                    value={form.medicalCondition}
                    error={errors.medicalCondition}
                    onChange={(value) => setField("medicalCondition", value)}
                  />
                  <FormField
                    label="Blood Type *"
                    placeholder="e.g. A+"
                    value={form.bloodType}
                    error={errors.bloodType}
                    onChange={(value) => setField("bloodType", value)}
                  />
                </FormRow2>
                <FormRow2>
                  <FormField
                    label="Allergies *"
                    placeholder="List any allergies"
                    value={form.allergies}
                    error={errors.allergies}
                    onChange={(value) => setField("allergies", value)}
                  />
                  <FormField
                    label="Emergency Name *"
                    placeholder="Emergency contact"
                    value={form.emergencyName}
                    error={errors.emergencyName}
                    onChange={(value) => setField("emergencyName", value)}
                  />
                </FormRow2>
                <FormField
                  label="Emergency Phone *"
                  placeholder="09-1234567890"
                  value={form.emergencyPhone}
                  error={errors.emergencyPhone}
                  onChange={(value) => setField("emergencyPhone", value)}
                />
              </>
            )}
          </FormSection>

          {isNurse && (
            <FormSection title="Account Access">
              <FormRow2>
                <FormField
                  label="Username"
                  placeholder="Enter username"
                  value={form.username}
                  error={errors.username}
                  onChange={(value) => setField("username", value)}
                />
                <FormField
                  label="Password"
                  placeholder="Enter password"
                  type="password"
                  value={form.password}
                  error={errors.password}
                  onChange={(value) => setField("password", value)}
                />
              </FormRow2>
              <FormField
                label="Confirm Password"
                placeholder="Confirm password"
                type="password"
                value={form.confirmPassword}
                error={errors.confirmPassword}
                onChange={(value) => setField("confirmPassword", value)}
              />
            </FormSection>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onBack}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border text-sm transition-colors hover:bg-gray-50"
              style={{ borderColor: "rgba(0,0,0,0.12)", color: "#6b7a99" }}
            >
              <X size={14} />
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 py-2 rounded-lg text-sm text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: "#2563eb", opacity: saving ? 0.7 : 1 }}
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3
        className="text-sm mb-4 pb-2 border-b"
        style={{ color: "#1a2b42", fontWeight: 600, borderColor: "rgba(0,0,0,0.07)" }}
      >
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function FormRow2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>;
}

function FormField({
  label,
  placeholder,
  value,
  onChange,
  error,
  type = "text",
  maxLength,
  min,
  max,
  blockTyping = false,
  disabled = false,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  maxLength?: number;
  min?: string;
  max?: string;
  blockTyping?: boolean;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="text-xs block mb-1.5" style={{ color: "#6b7a99" }}>
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        maxLength={maxLength}
        min={min}
        max={max}
        disabled={disabled}
        onKeyDown={(event) => {
          if (blockTyping) event.preventDefault();
        }}
        onPaste={(event) => {
          if (blockTyping) event.preventDefault();
        }}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-3 py-2 rounded-lg border text-xs outline-none transition-colors"
        style={{
          borderColor: error ? "#ef4444" : "rgba(0,0,0,0.12)",
          backgroundColor: disabled ? "#eef2f7" : "#f8fafc",
          color: "#1a2b42",
        }}
        onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
        onBlur={(e) => (e.target.style.borderColor = error ? "#ef4444" : "rgba(0,0,0,0.12)")}
      />
      {error && (
        <p className="text-xs mt-1" style={{ color: "#dc2626" }}>
          {error}
        </p>
      )}
    </div>
  );
}

function FormFieldSelect({
  label,
  placeholder,
  options,
  value,
  onChange,
  error,
}: {
  label: string;
  placeholder: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <div>
      <label className="text-xs block mb-1.5" style={{ color: "#6b7a99" }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full px-3 py-2 rounded-lg border text-xs outline-none"
        style={{
          borderColor: error ? "#ef4444" : "rgba(0,0,0,0.12)",
          backgroundColor: "#f8fafc",
          color: "#6b7a99",
        }}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-xs mt-1" style={{ color: "#dc2626" }}>
          {error}
        </p>
      )}
    </div>
  );
}
