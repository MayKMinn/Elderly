import { useState } from "react";
import { X, Upload } from "lucide-react";

interface AddProfileFormProps {
  type: "elderly" | "nurse";
  onBack: () => void;
  onSave: () => void;
}

export function AddProfileForm({ type, onBack, onSave }: AddProfileFormProps) {
  const isNurse = type === "nurse";

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        {/* Breadcrumb */}
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

          {/* Basic Information */}
          <FormSection title="Basic Information">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-4">
                <FormRow2>
                  <FormField label="Full Name *" placeholder="Enter full name" />
                  <FormField label="Age *" placeholder="e.g. 30" />
                </FormRow2>
                <FormRow2>
                  <FormFieldSelect
                    label="Gender *"
                    placeholder="Select gender"
                    options={["Male", "Female", "Other"]}
                  />
                  {!isNurse && (
                    <FormField label="Phone" placeholder="(555) 000-0000" />
                  )}
                  {isNurse && (
                    <FormField label="Phone" placeholder="(555) 000-0000" />
                  )}
                </FormRow2>
                <FormField label="Email" placeholder="name@example.com" />
                <FormField label="Address *" placeholder="Enter complete address" />
              </div>

              {/* Photo upload */}
              <div>
                <label className="text-xs block mb-1.5" style={{ color: "#6b7a99" }}>
                  Profile Photo
                </label>
                <div
                  className="w-full aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
                  style={{ borderColor: "rgba(0,0,0,0.12)" }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                    style={{ backgroundColor: "#eff6ff" }}
                  >
                    <Upload size={16} style={{ color: "#2563eb" }} />
                  </div>
                  <span className="text-xs" style={{ color: "#6b7a99" }}>
                    Upload Photo
                  </span>
                  <span className="text-xs mt-0.5" style={{ color: "#94b8c9" }}>
                    JPG, PNG, Max 5MB
                  </span>
                </div>
                <button
                  className="w-full mt-2 py-1.5 text-xs rounded-lg border transition-colors hover:bg-gray-50"
                  style={{ borderColor: "rgba(0,0,0,0.12)", color: "#6b7a99" }}
                >
                  Choose File
                </button>
              </div>
            </div>
          </FormSection>

          {/* Professional/Medical Info */}
          <FormSection title={isNurse ? "Professional Information" : "Medical Information"}>
            {isNurse ? (
              <>
                <FormRow2>
                  <FormField label="License Number" placeholder="Enter license number" />
                  <FormFieldSelect
                    label="Position *"
                    placeholder="Select position"
                    options={["Registered Nurse", "LPN", "Charge Nurse", "Senior Nurse", "Nurse Practitioner"]}
                  />
                </FormRow2>
                <FormRow2>
                  <FormFieldSelect
                    label="Work Area *"
                    placeholder="Select work area"
                    options={["General Ward", "Memory Care Unit", "Cardiac Care", "Rehabilitation", "Palliative Care"]}
                  />
                  <FormField label="Hire Date *" placeholder="MM/DD/YYYY" />
                </FormRow2>
                <FormRow2>
                  <FormFieldSelect
                    label="Nurse Status *"
                    placeholder="Select status"
                    options={["Active", "On Leave", "Inactive"]}
                  />
                </FormRow2>
              </>
            ) : (
              <>
                <FormRow2>
                  <FormField label="Medical Condition" placeholder="e.g. Hypertension" />
                  <FormField label="Blood Type" placeholder="e.g. A+" />
                </FormRow2>
                <FormRow2>
                  <FormField label="Allergies" placeholder="List any allergies" />
                  <FormField label="Doctor Name" placeholder="Primary doctor" />
                </FormRow2>
                <FormField label="Admission Date" placeholder="MM/DD/YYYY" />
              </>
            )}
          </FormSection>

          {/* Account Access */}
          <FormSection title="Account Access">
            <FormRow2>
              <FormField label="Username" placeholder="Enter username" />
              <FormField label="Password" placeholder="Enter password" type="password" />
            </FormRow2>
            <FormField label="Confirm Password" placeholder="Confirm password" type="password" />
            <div className="flex items-center gap-2 mt-1">
              <input type="checkbox" id="notify" className="rounded" />
              <label htmlFor="notify" className="text-xs" style={{ color: "#6b7a99" }}>
                Send login credentials to caregiver via email
              </label>
            </div>
          </FormSection>

          {/* Actions */}
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
              onClick={onSave}
              className="flex-1 py-2 rounded-lg text-sm text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: "#2563eb" }}
            >
              Save Profile
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
  return <div className="grid grid-cols-2 gap-4">{children}</div>;
}

function FormField({
  label,
  placeholder,
  type = "text",
}: {
  label: string;
  placeholder: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-xs block mb-1.5" style={{ color: "#6b7a99" }}>
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border text-xs outline-none transition-colors"
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

function FormFieldSelect({
  label,
  placeholder,
  options,
}: {
  label: string;
  placeholder: string;
  options: string[];
}) {
  return (
    <div>
      <label className="text-xs block mb-1.5" style={{ color: "#6b7a99" }}>
        {label}
      </label>
      <select
        className="w-full px-3 py-2 rounded-lg border text-xs outline-none"
        style={{
          borderColor: "rgba(0,0,0,0.12)",
          backgroundColor: "#f8fafc",
          color: "#6b7a99",
        }}
        defaultValue=""
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
