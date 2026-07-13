import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ImagePlus, X } from "lucide-react";
import { getProfiles } from "../api/profiles";
import type { NewProfilePayload, Room, ValidationErrors } from "../api/profiles";

export interface AddProfileFormBaseProps {
  type: "elderly" | "nurse";
  onBack: () => void;
  onSave: (profile: NewProfilePayload) => Promise<ValidationErrors | void> | ValidationErrors | void;
}

const emailPattern = /^[A-Za-z][A-Za-z0-9._%+-]*@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

const defaultNurseEmail = "";

const emptyProfile: NewProfilePayload = {
  type: "elderly",
  name: "",
  age: "",
  gender: "",
  phone: "",
  avatar: "",
  email: "",
  birthdate: "",
  address: "",
  medicalCondition: "",
  bloodType: "",
  allergies: "",
  emergencyName: "",
  emergencyPhone: "",
  emergencyAddress: "",
  roomId: "",
  elderlyStatus: "active",
  enrollDate: "",
  doctorName: "",
  admissionDate: "",
  username: "",
  password: "",
  confirmPassword: "",
  position: "",
  hireDate: "",
  nurseStatus: "Active",
  licenseNumber: "",
  shiftSchedule: "",
};

function getAgeFromBirthdate(value: string) {
  if (!value) return undefined;

  const birthdate = new Date(`${value}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (Number.isNaN(birthdate.getTime()) || birthdate > today) return undefined;

  let age = today.getFullYear() - birthdate.getFullYear();
  const hasHadBirthday =
    today.getMonth() > birthdate.getMonth() ||
    (today.getMonth() === birthdate.getMonth() && today.getDate() >= birthdate.getDate());

  if (!hasHadBirthday) age -= 1;

  return age;
}

function getBirthdateFromAge(value: string) {
  const age = Number(value);
  if (!Number.isInteger(age) || age < 50 || age > 120) return "";

  const birthdate = new Date();
  birthdate.setHours(0, 0, 0, 0);
  birthdate.setFullYear(birthdate.getFullYear() - age);

  return formatDateInput(birthdate);
}

function validateElderlyBirthdate(value: string) {
  if (!value) return undefined;

  const birthdate = new Date(`${value}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (Number.isNaN(birthdate.getTime())) return "Enter a valid birthdate.";
  if (birthdate > today) return "Birthdate cannot be in the future.";

  const age = getAgeFromBirthdate(value);
  if (age === undefined) return "Enter a valid birthdate.";
  if (age < 50 || age > 120) return "Birthdate must make age between 50 and 120.";

  return undefined;
}

function validateElderlyAgeBirthdateMatch(currentForm: NewProfilePayload) {
  if (currentForm.type !== "elderly" || !currentForm.age.trim() || !currentForm.birthdate) {
    return undefined;
  }

  const age = Number(currentForm.age);
  const birthdateAge = getAgeFromBirthdate(currentForm.birthdate);

  if (!Number.isInteger(age) || birthdateAge === undefined) return undefined;
  if (age !== birthdateAge) return `Age must match birthdate. Expected age is ${birthdateAge}.`;

  return undefined;
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function validateHireDate(value: string) {
  if (!value) return "Hire date is required.";

  const hireDate = new Date(`${value}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (Number.isNaN(hireDate.getTime())) return "Enter a valid hire date.";
  if (hireDate > today) return "Hire date cannot be in the future.";

  return undefined;
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

const sharedRequiredFields: Array<keyof NewProfilePayload> = [
  "name",
  "age",
  "gender",
  "phone",
  "address",
];

const elderlyRequiredFields: Array<keyof NewProfilePayload> = [
  ...sharedRequiredFields,
  "birthdate",
  "medicalCondition",
  "bloodType",
  "allergies",
  "emergencyName",
  "emergencyPhone",
  "emergencyAddress",
  "roomId",
];

const nurseRequiredFields: Array<keyof NewProfilePayload> = [
  ...sharedRequiredFields,
  "email",
  "licenseNumber",
  "position",
  "hireDate",
  "nurseStatus",
  "username",
  "password",
  "confirmPassword",
];

export function AddProfileFormBase({ type, onBack, onSave }: AddProfileFormBaseProps) {
  const isNurse = type === "nurse";
  const elderlyBirthdateLimits = getElderlyBirthdateLimits();
  const [form, setForm] = useState<NewProfilePayload>({
    ...emptyProfile,
    type,
    email: emptyProfile.email,
  });
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [saving, setSaving] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    if (type !== "elderly") return;

    let ignore = false;

    getProfiles()
      .then((profiles) => {
        if (!ignore) setRooms(profiles.rooms || []);
      })
      .catch(() => {
        if (!ignore) setRooms([]);
      });

    return () => {
      ignore = true;
    };
  }, [type]);

  const availableRoomOptions = useMemo(() => (
    rooms
      .filter((room) => !room.elderlyId || String(room.roomId) === form.roomId)
      .map((room) => ({
        label: `Floor ${room.floorNumber} - Room ${room.roomNumber}`,
        value: String(room.roomId),
      }))
  ), [form.roomId, rooms]);

  const validateField = (
    field: keyof NewProfilePayload,
    value: string,
    currentForm: NewProfilePayload
  ) => {
    const valueText = String(value ?? "");
    const trimmedValue = valueText.trim();

    if (field === "name") {
      if (!trimmedValue) return "Full name is required.";
      if (trimmedValue.length > 10) return "Full name must be 10 characters or fewer.";
      if (valueText.startsWith(" ")) return "Full name cannot start with a space.";
      if (valueText.includes("  ")) return "Full name cannot contain double spaces.";
      if (!/[A-Za-z]/.test(valueText)) return "Full name must contain at least one letter.";
    }

    if (field === "age") {
      const age = Number(valueText);
      if (!trimmedValue) return "Age is required.";
      if (!Number.isInteger(age)) return "Age must be a whole number.";
      if (currentForm.type === "nurse" && (age < 18 || age > 40)) {
        return "Caregiver age must be between 18 and 40.";
      }
      if (currentForm.type === "elderly" && (age < 50 || age > 120)) {
        return "Elderly age must be between 50 and 120.";
      }
      return validateElderlyAgeBirthdateMatch({ ...currentForm, age: value });
    }

    if (field === "gender" && !trimmedValue) return "Gender is required.";

    if (field === "phone") {
      if (!trimmedValue) return "Phone is required.";
      if (!/^09-\d{9}$/.test(trimmedValue)) return "Phone must use format 09-#########.";
    }

    if (field === "email") {
      if (currentForm.type === "nurse" && !trimmedValue) return "Email is required.";
      if (trimmedValue.length > 160) return "Email must be 160 characters or fewer.";
      if (trimmedValue && !emailPattern.test(trimmedValue)) {
        return "Email must include @ and a valid domain.";
      }
    }

    if (field === "address") {
      if (!trimmedValue) return "Address is required.";
      if (trimmedValue.length > 500) return "Address must be 500 characters or fewer.";
    }

    if (field === "birthdate" && currentForm.type === "elderly") {
      return validateElderlyBirthdate(value) || validateElderlyAgeBirthdateMatch({ ...currentForm, birthdate: value });
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
      if (!/[A-Za-z]/.test(valueText)) return "Emergency contact name must contain at least one letter.";
    }

    if (field === "emergencyPhone" && currentForm.type === "elderly") {
      if (!trimmedValue) return "Emergency phone is required.";
      if (!/^09-\d{9}$/.test(trimmedValue)) return "Emergency phone must use format 09-#########.";
    }

    if (field === "emergencyAddress" && currentForm.type === "elderly") {
      if (!trimmedValue) return "Emergency address is required.";
      if (trimmedValue.length > 500) return "Emergency address must be 500 characters or fewer.";
    }

    if (field === "roomId" && currentForm.type === "elderly" && !trimmedValue) {
      return "Room is required.";
    }

    if (currentForm.type === "nurse") {
      if (field === "position" && !trimmedValue) return "Position is required.";
      if (field === "hireDate") return validateHireDate(valueText);
      if (field === "nurseStatus" && !trimmedValue) return "Nurse status is required.";
    }

    if (field === "licenseNumber") {
      if (!trimmedValue) return "License number is required.";
      if (!/^\d+$/.test(trimmedValue)) return "License number can contain numbers only.";
      if (trimmedValue.length !== 7) return "License number must be 7 digits.";
    }

    if (field === "username") {
      if (!trimmedValue) return "Username is required.";
      if (!/^[A-Za-z0-9]+$/.test(trimmedValue)) return "Username can contain letters and numbers only.";
      if (!/[A-Za-z]/.test(trimmedValue)) return "Username must contain at least one letter.";
      if (trimmedValue.length < 4) return "Username must be at least 4 characters.";
    }

    if (field === "password") {
      if (!trimmedValue) return "Password is required.";
      if (trimmedValue.length < 8) return "Password must be at least 8 characters.";
    }

    if (field === "confirmPassword" && currentForm.password !== currentForm.confirmPassword) {
      return "Passwords must match.";
    }

    return undefined;
  };

  const validateForm = (currentForm: NewProfilePayload) => {
    const nextErrors: ValidationErrors = {};
    const fieldsToValidate = currentForm.type === "nurse" ? nurseRequiredFields : elderlyRequiredFields;

    fieldsToValidate.forEach((field) => {
      const error = validateField(field, currentForm[field], currentForm);
      if (error) nextErrors[field] = error;
    });

    const ageBirthdateError = validateElderlyAgeBirthdateMatch(currentForm);
    if (ageBirthdateError && !nextErrors.age) nextErrors.age = ageBirthdateError;

    return nextErrors;
  };

  useEffect(() => {
    const username = String(form.username || "").trim();

    if (!username) {
      setErrors((prev) => ({ ...prev, username: undefined }));
      setIsCheckingUsername(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        setIsCheckingUsername(true);
        const response = await fetch(`/api/nurses/check-username?username=${encodeURIComponent(username)}`);
        const data = await response.json();

        setErrors((prev) => ({
          ...prev,
          username: data.exists ? "Username already exists. Please choose another." : undefined,
        }));
      } catch (error) {
        console.error(error);
      } finally {
        setIsCheckingUsername(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [form.username]);

  const setField = (field: keyof NewProfilePayload, value: string) => {
    setForm((prevForm) => {
      const nextForm = { ...prevForm, [field]: value };

      if (nextForm.type === "elderly" && field === "age") {
        const defaultBirthdate = getBirthdateFromAge(value);
        nextForm.birthdate = defaultBirthdate || "";
      }

      if (nextForm.type === "elderly" && field === "birthdate") {
        const age = getAgeFromBirthdate(value);
        if (age !== undefined) nextForm.age = String(age);
      }

      setErrors((prevErrors) => {
        const nextErrors = { ...prevErrors };
        const fieldError = validateField(field, value, nextForm);

        if (fieldError) nextErrors[field] = fieldError;
        else delete nextErrors[field];

        if (field === "age" || field === "birthdate") {
          const ageError = validateField("age", nextForm.age, nextForm);
          const birthdateError = validateField("birthdate", nextForm.birthdate, nextForm);

          if (ageError) nextErrors.age = ageError;
          else delete nextErrors.age;

          if (birthdateError) nextErrors.birthdate = birthdateError;
          else delete nextErrors.birthdate;
        }

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
        <div className="bg-white rounded-2xl border p-6" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
          <h2 className="text-base mb-1" style={{ color: "#1a2b42", fontWeight: 700 }}>
            Add New {isNurse ? "Caregiver" : "Elderly"} Profile
          </h2>
          <p className="text-xs mb-6" style={{ color: "#6b7a99" }}>
            Fill in the details below to add a new {isNurse ? "caregiver" : "elderly"} profile.
          </p>

          <FormSection title="Basic Information">
            <div className="space-y-4">
              <PhotoField
                value={form.avatar}
                onChange={(value) => setField("avatar", value)}
              />
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
                  onChange={(value) => setField("age", value.replace(/\D/g, "").slice(0, 3))}
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
                  placeholder="09-123456789"
                  value={form.phone}
                  error={errors.phone}
                  onChange={(value) => setField("phone", value)}
                />
              </FormRow2>
              {isNurse ? (
                <>
                  <FormRow2>
                    <FormField
                      label="Email *"
                      placeholder="Enter email"
                      value={form.email}
                      error={errors.email}
                      onChange={(value) => setField("email", value)}
                    />
                    <FormField
                      label="Address *"
                      placeholder="Enter complete address"
                      value={form.address}
                      error={errors.address}
                      onChange={(value) => setField("address", value)}
                    />
                  </FormRow2>
                </>
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
                    label="License Number *"
                    placeholder="Enter license number"
                    value={form.licenseNumber}
                    error={errors.licenseNumber}
                    onChange={(value) => setField("licenseNumber", value.replace(/\D/g, "").slice(0, 7))}
                  />
                  <FormFieldSelect
                    label="Position *"
                    placeholder="Select position"
                    options={["Assistant Nurse", "Junior Nurse", "Senior Nurse", "Head Nurse"]}
                    value={form.position}
                    error={errors.position}
                    onChange={(value) => setField("position", value)}
                  />
                </FormRow2>
                <FormRow2>
                  <FormField
                    label="Hire Date *"
                    placeholder="YYYY-MM-DD"
                    type="date"
                    max={formatDateInput(new Date())}
                    value={form.hireDate}
                    error={errors.hireDate}
                    onChange={(value) => setField("hireDate", value)}
                  />
                  <FormFieldSelect
                    label="Nurse Status *"
                    placeholder="Select status"
                    options={["Active"]}
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
                  <FormFieldSelect
                    label="Blood Type *"
                    placeholder="Select blood type"
                    options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]}
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
                  <FormFieldSelect
                    label="Room *"
                    placeholder="Select room"
                    options={availableRoomOptions}
                    value={form.roomId}
                    error={errors.roomId}
                    onChange={(value) => setField("roomId", value)}
                  />
                </FormRow2>
              </>
            )}
          </FormSection>

          {!isNurse && (
            <FormSection title="Emergency Contact">
              <FormRow2>
                <FormField
                  label="Emergency Name *"
                  placeholder="Emergency contact"
                  value={form.emergencyName}
                  error={errors.emergencyName}
                  onChange={(value) => setField("emergencyName", value)}
                />
                <FormField
                  label="Emergency Phone *"
                  placeholder="09-123456789"
                  value={form.emergencyPhone}
                  error={errors.emergencyPhone}
                  onChange={(value) => setField("emergencyPhone", value)}
                />
              </FormRow2>
              <FormField
                label="Emergency Address *"
                placeholder="Enter emergency contact address"
                value={form.emergencyAddress}
                error={errors.emergencyAddress}
                onChange={(value) => setField("emergencyAddress", value)}
              />
            </FormSection>
          )}

          {isNurse && (
            <FormSection title="Account Access">
              <FormRow2>
                <FormField
                  label="Username *"
                  placeholder="Enter username"
                  value={form.username}
                  error={errors.username}
                  onChange={(value) => setField("username", value)}
                />
                <FormField
                  label="Password *"
                  placeholder="Enter password"
                  type="password"
                  value={form.password}
                  error={errors.password}
                  onChange={(value) => setField("password", value)}
                />
              </FormRow2>
              <FormField
                label="Confirm Password *"
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

function PhotoField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const preview = value.trim() || "https://i.pravatar.cc/80?u=elderly-new";
  const handleUpload = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onChange(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <label className="text-xs block" style={{ color: "#6b7a99" }}>
        Profile Photo
      </label>
      <div className="relative">
        <img
          src={preview}
          alt=""
          className="h-24 w-24 rounded-full border-4 object-cover shadow-sm"
          style={{ borderColor: "#fff", boxShadow: "0 8px 24px rgba(15,23,42,0.12)" }}
          onError={(event) => {
            event.currentTarget.src = "https://i.pravatar.cc/80?u=elderly-new";
          }}
        />
        <label
          htmlFor="profile-photo-input"
          className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 bg-white shadow-md transition-colors hover:bg-blue-50"
          style={{ borderColor: "#fff", color: "#2563eb" }}
        >
          <ImagePlus size={16} />
          <input
            id="profile-photo-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              handleUpload(event.target.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
        </label>
      </div>
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="text-xs hover:underline"
          style={{ color: "#dc2626" }}
        >
          Remove photo
        </button>
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
  options: Array<string | { label: string; value: string }>;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <div>
      <label className="text-xs block mb-1.5" style={{ color: "#6b7a99" }}>
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-lg border px-3 py-2 pr-9 text-xs outline-none transition-colors focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          style={{
            borderColor: error ? "#ef4444" : "rgba(0,0,0,0.12)",
            backgroundColor: "#f8fafc",
            color: value ? "#1a2b42" : "#6b7a99",
          }}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => {
            const valueText = typeof option === "string" ? option : option.value;
            const labelText = typeof option === "string" ? option : option.label;

            return (
            <option key={valueText} value={valueText}>
              {labelText}
            </option>
          );
          })}
        </select>
        <ChevronDown
          size={15}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
          style={{ color: error ? "#ef4444" : "#6b7a99" }}
        />
      </div>
      {error && (
        <p className="text-xs mt-1" style={{ color: "#dc2626" }}>
          {error}
        </p>
      )}
    </div>
  );
}
