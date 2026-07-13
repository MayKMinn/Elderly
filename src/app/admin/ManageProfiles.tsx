import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Users,
  UserCheck,
  Activity,
  UserPlus,
  X,
  Phone,
  Mail,
  MapPin,
  Heart,
  AlertTriangle,
  User,
  ImagePlus,
  Save,
} from "lucide-react";
import { nurseData } from "./data";
import type { ElderlyProfile, NurseProfile } from "./data";
import { AddElderlyProfileForm } from "./AddElderlyProfileForm";
import { AddNurseProfileForm } from "./AddNurseProfileForm";
import { DeleteModal } from "./DeleteModal";
import {
  createElderlyProfile,
  createNurseProfile,
  deleteElderlyProfile,
  deleteNurseProfile,
  getProfiles,
  updateElderlyProfile,
  updateNurseElderlyAssignments,
  updateNurseProfile,
} from "../api/profiles";
import type { NewProfilePayload, Room, ValidationErrors } from "../api/profiles";
import type { NurseElderlyAssignment } from "../api/profiles";

type ProfileTab = "elderly" | "nurse";

interface ManageProfilesProps {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
}

type Modal =
  | { type: "view"; profile: ElderlyProfile }
  | { type: "edit"; profile: ElderlyProfile }
  | { type: "delete"; profile: ElderlyProfile }
  | { type: "viewNurse"; profile: NurseProfile }
  | { type: "editNurse"; profile: NurseProfile }
  | { type: "assignElders"; profile: NurseProfile }
  | { type: "deleteNurse"; profile: NurseProfile }
  | { type: "addForm"; formType: "elderly" | "nurse" }
  | null;

const PROFILE_NAME_MAX_LENGTH = 100;

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

function validateElderlyProfile(profile: ElderlyProfile): ValidationErrors {
  const errors: ValidationErrors = {};
  const name = profile.name;
  const age = Number(profile.age);

  if (!name.trim()) errors.name = "Full name is required.";
  else if (name.trim().length > PROFILE_NAME_MAX_LENGTH) {
    errors.name = `Full name must be ${PROFILE_NAME_MAX_LENGTH} characters or fewer.`;
  }
  else if (name.startsWith(" ")) errors.name = "Full name cannot start with a space.";
  else if (name.includes("  ")) errors.name = "Full name cannot contain double spaces.";
  else if (!/[A-Za-z]/.test(name)) errors.name = "Full name must contain at least one letter.";

  if (!Number.isInteger(age)) errors.age = "Age must be a whole number.";
  else if (age < 50 || age > 120) errors.age = "Elderly age must be between 50 and 120.";

  if (!profile.gender) errors.gender = "Gender is required.";
  if (!profile.phone.trim()) errors.phone = "Phone is required.";
  else if (!/^09-\d{9}$/.test(profile.phone.trim())) errors.phone = "Phone must use format 09-#########.";

  const birthdateError = validateElderlyBirthdate(profile.dob);
  if (birthdateError) errors.dob = birthdateError;

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
  const emergencyAddress = String(profile.emergencyAddress || "");
  if (!emergencyAddress.trim()) errors.emergencyAddress = "Emergency address is required.";
  else if (emergencyAddress.trim().length > 500) {
    errors.emergencyAddress = "Emergency address must be 500 characters or fewer.";
  }

  return errors;
}

function getBirthdateLimits() {
  const today = new Date();
  const minDate = new Date(today);
  const maxDate = new Date(today);
  minDate.setFullYear(today.getFullYear() - 120);
  maxDate.setFullYear(today.getFullYear() - 50);

  return {
    min: formatDateInput(minDate),
    max: formatDateInput(maxDate),
  };
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDateInputValue(value: string) {
  if (!value) return "";
  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

function parseRegistrationDate(value: string) {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed;
}

function countRegistrationsThisWeek<T>(profiles: T[], getDate: (profile: T) => string) {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(today.getDate() - today.getDay());

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  return profiles.filter((profile) => {
    const registeredAt = parseRegistrationDate(getDate(profile));
    return registeredAt ? registeredAt >= startOfWeek && registeredAt < endOfWeek : false;
  }).length;
}

function normalizeGenderValue(value: unknown) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "male") return "Male";
  if (normalized === "female") return "Female";
  if (normalized === "other") return "Other";
  return String(value ?? "");
}

function normalizeElderlyProfile(profile: Partial<ElderlyProfile>): ElderlyProfile {
  return {
    id: String(profile.id ?? ""),
    name: String(profile.name ?? ""),
    age: Number(profile.age) || 0,
    gender: normalizeGenderValue(profile.gender),
    phone: String(profile.phone ?? ""),
    medicalCondition: String(profile.medicalCondition ?? ""),
    emergencyContact: String(profile.emergencyContact ?? ""),
    emergencyAddress: String(profile.emergencyAddress ?? ""),
    roomId: String(profile.roomId ?? ""),
    floorNumber: String(profile.floorNumber ?? ""),
    roomNumber: String(profile.roomNumber ?? ""),
    roomLabel: String(profile.roomLabel ?? ""),
    status: profile.status === "Inactive" ? "Inactive" : "Active",
    avatar: String(profile.avatar ?? ""),
    dob: String(profile.dob ?? ""),
    address: String(profile.address ?? ""),
    bloodType: String(profile.bloodType ?? ""),
    allergies: String(profile.allergies ?? ""),
    doctorName: String(profile.doctorName ?? ""),
    relationship: String(profile.relationship ?? ""),
    emergencyPhone: String(profile.emergencyPhone ?? ""),
    admissionDate: String(profile.admissionDate ?? ""),
    notes: String(profile.notes ?? ""),
  };
}

function normalizeNurseProfile(profile: Partial<NurseProfile>): NurseProfile {
  const rawStatus = String(profile.nurseStatus ?? profile.status ?? "Active");
  const normalizedStatus = rawStatus.toLowerCase();
  const status = normalizedStatus === "on leave" || normalizedStatus === "suspended" ? "On Leave" : "Active";

  return {
    id: String(profile.id ?? profile.nurseId ?? ""),
    nurseId: profile.nurseId,
    name: String(profile.name ?? ""),
    age: Number(profile.age) || 0,
    gender: normalizeGenderValue(profile.gender),
    phone: String(profile.phone ?? ""),
    email: String(profile.email ?? ""),
    address: String(profile.address ?? ""),
    position: String(profile.position ?? ""),
    hireDate: String(profile.hireDate ?? ""),
    createdAt: String((profile as any).createdAt ?? (profile as any).created_at ?? ""),
    status,
    avatar: String(profile.avatar ?? ""),
    assignedElders: Number(profile.assignedElders) || 0,
    nurseStatus: String(profile.nurseStatus ?? status),
  };
}

function ProfileAvatar({
  src,
  name,
  className,
  iconSize = 16,
}: {
  src?: string;
  name: string;
  className?: string;
  iconSize?: number;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageSrc = String(src || "").trim();
  const showImage = imageSrc && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
  }, [imageSrc]);

  return (
    <div
      className={`flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-50 text-blue-600 ${className || ""}`}
      title={name}
    >
      {showImage ? (
        <img
          src={imageSrc}
          alt={name ? `${name} avatar` : "Profile avatar"}
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <User size={iconSize} />
      )}
    </div>
  );
}

function toAssignmentMap(assignments: NurseElderlyAssignment[]) {
  return assignments.reduce<Record<string, string[]>>((map, assignment) => {
    const nurseId = String(assignment.nurseId);
    const elderlyId = String(assignment.elderlyId);

    map[nurseId] = [...(map[nurseId] || []), elderlyId];
    return map;
  }, {});
}

function getAssignedElderly(
  nurse: NurseProfile,
  assignmentMap: Record<string, string[]>,
  elderlyList: ElderlyProfile[]
) {
  const nurseId = String(nurse.nurseId || nurse.id);
  const assignedIds = new Set(assignmentMap[nurseId] || []);

  return elderlyList.filter((profile) => profile.status === "Active" && assignedIds.has(String(profile.id)));
}

function getNurseSqlDisplayId(profile: NurseProfile) {
  const value = String(profile.nurseId ?? profile.id ?? "").trim();
  const formattedMatch = value.match(/^(?:NRS|NUR|N)-0*(\d+)$/i);

  return formattedMatch ? formattedMatch[1] : value;
}

export function ManageProfiles({ activeTab, onTabChange }: ManageProfilesProps) {
  const useApi = import.meta.env.VITE_USE_API !== "false";
  const [modal, setModal] = useState<Modal>(null);
  const [elderlyList, setElderlyList] = useState<ElderlyProfile[]>([]);
  const [nurseList, setNurseList] = useState<NurseProfile[]>(useApi ? [] : nurseData);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [loading, setLoading] = useState(useApi);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [assignmentMap, setAssignmentMap] = useState<Record<string, string[]>>({});
  const [elderlyStatusFilter, setElderlyStatusFilter] = useState<"all" | "Active" | "Inactive">("all");
  const [elderlyGenderFilter, setElderlyGenderFilter] = useState<"all" | "male" | "female" | "other">("all");
  const [elderlyMinAge, setElderlyMinAge] = useState("");
  const [elderlyMaxAge, setElderlyMaxAge] = useState("");
  const [nurseStatusFilter, setNurseStatusFilter] = useState<"all" | "Active" | "On Leave">("all");
  const [nurseGenderFilter, setNurseGenderFilter] = useState<"all" | "male" | "female" | "other">("all");

  const perPage = 8;

  useEffect(() => {
    if (!useApi) return;

    let ignore = false;

    getProfiles()
      .then((profiles) => {
        if (ignore) return;
        setElderlyList(profiles.elderly.map(normalizeElderlyProfile));
        setNurseList(profiles.nurses.map(normalizeNurseProfile));
        setRooms(profiles.rooms || []);
        setAssignmentMap(toAssignmentMap(profiles.nurseElderlyAssignments || []));
        setError(null);
      })
      .catch((err) => {
        if (ignore) return;
        setElderlyList([]);
        setRooms([]);
        setError("Could not connect to MySQL API. No elderly profiles loaded.");
        console.error(err);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [useApi]);

  useEffect(() => {
    if (!successMessage) return;

    const timer = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => {
    setPage(1);
    setSelectedRow(null);

    if (modal?.type === "addForm" && modal.formType !== activeTab) {
      setModal(null);
    }
  }, [activeTab]);

  const handleProfileTabChange = (tab: ProfileTab) => {
    onTabChange(tab);
    setPage(1);
    setSelectedRow(null);
    setModal(null);
  };

  const resetElderlyTable = () => {
    setPage(1);
    setSelectedRow(null);
  };

  const resetNurseTable = () => {
    setPage(1);
    setSelectedRow(null);
  };

  const clearElderlyFilters = () => {
    setElderlyStatusFilter("all");
    setElderlyGenderFilter("all");
    setElderlyMinAge("");
    setElderlyMaxAge("");
    resetElderlyTable();
  };

  const searchText = search.toLowerCase();
  const safeText = (value: unknown) => String(value ?? "").toLowerCase();
  const minAgeFilter = elderlyMinAge === "" ? null : Number(elderlyMinAge);
  const maxAgeFilter = elderlyMaxAge === "" ? null : Number(elderlyMaxAge);
  const hasElderlyFilters =
    elderlyStatusFilter !== "all" ||
    elderlyGenderFilter !== "all" ||
    elderlyMinAge !== "" ||
    elderlyMaxAge !== "";

  const filteredElderly = elderlyList.filter((e) => {
    const matchesSearch =
      safeText(e.name).includes(searchText) ||
      safeText(e.medicalCondition).includes(searchText) ||
      safeText(e.phone).includes(searchText);
    const matchesStatus = elderlyStatusFilter === "all" || e.status === elderlyStatusFilter;
    const matchesGender = elderlyGenderFilter === "all" || safeText(e.gender) === elderlyGenderFilter;
    const matchesMinAge = minAgeFilter === null || Number(e.age) >= minAgeFilter;
    const matchesMaxAge = maxAgeFilter === null || Number(e.age) <= maxAgeFilter;

    return matchesSearch && matchesStatus && matchesGender && matchesMinAge && matchesMaxAge;
  });

  const filteredNurse = nurseList.filter((n) => {
    const matchesSearch =
      safeText(n.name).includes(searchText) ||
      safeText(n.position).includes(searchText) ||
      safeText(n.phone).includes(searchText) ||
      safeText(n.email).includes(searchText);

    const matchesStatus = nurseStatusFilter === "all" || n.status === nurseStatusFilter;
    const matchesGender = nurseGenderFilter === "all" || safeText(n.gender) === nurseGenderFilter;

    return matchesSearch && matchesStatus && matchesGender;
  });

  const elderlyPages = Math.ceil(filteredElderly.length / perPage);
  const pagedElderly = filteredElderly.slice((page - 1) * perPage, page * perPage);

  const nursePages = Math.ceil(filteredNurse.length / perPage);
  const pagedNurse = filteredNurse.slice((page - 1) * perPage, page * perPage);

  const handleSaveEdit = async (updated: ElderlyProfile): Promise<ValidationErrors | void> => {
    const validationErrors = validateElderlyProfile(updated);
    if (Object.keys(validationErrors).length > 0) return validationErrors;
    const removeInactiveAssignments = (elderlyId: string) => {
      const affectedNurseIds = new Set(
        Object.entries(assignmentMap)
          .filter(([, elderlyIds]) => elderlyIds.map(String).includes(elderlyId))
          .map(([nurseId]) => nurseId)
      );

      setAssignmentMap((prev) => Object.fromEntries(
        Object.entries(prev).map(([nurseId, elderlyIds]) => [
          nurseId,
          elderlyIds.filter((id) => String(id) !== elderlyId),
        ])
      ));
      setNurseList((prev) => prev.map((nurse) => {
        const nurseId = String(nurse.nurseId || nurse.id);
        if (!affectedNurseIds.has(nurseId)) return nurse;

        return {
          ...nurse,
          assignedElders: Math.max(0, (assignmentMap[nurseId] || []).filter((id) => String(id) !== elderlyId).length),
        };
      }));
    };

    if (!useApi) {
      setElderlyList((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      if (updated.status !== "Active") {
        removeInactiveAssignments(String(updated.id));
      }
      setModal(null);
      setSuccessMessage("Elderly profile updated successfully.");
      return;
    }

    try {
      const saved = normalizeElderlyProfile(await updateElderlyProfile(updated));
      setElderlyList((prev) => prev.map((e) => (e.id === saved.id ? saved : e)));
      if (saved.status !== "Active") {
        removeInactiveAssignments(String(saved.id));
      }
      setModal(null);
      setError(null);
      setSuccessMessage("Elderly profile updated successfully.");
    } catch (err) {
      const apiValidationErrors = parseApiValidationErrors(err);
      if (apiValidationErrors) {
        return {
          ...apiValidationErrors,
          dob: apiValidationErrors.birthdate || apiValidationErrors.dob,
          emergencyContact: apiValidationErrors.emergencyName || apiValidationErrors.emergencyContact,
        };
      }
      setError("Failed to save changes to MySQL.");
      console.error(err);
    }
  };

  const handleDeleteConfirm = async () => {
    if (modal?.type === "delete") {
      if (!useApi) {
        setElderlyList((prev) => prev.filter((e) => e.id !== modal.profile.id));
        setSelectedRow(null);
        setModal(null);
        return;
      }

      try {
        await deleteElderlyProfile(modal.profile.id);
        setElderlyList((prev) => prev.filter((e) => e.id !== modal.profile.id));
        setSelectedRow(null);
        setError(null);
      } catch (err) {
        setError("Failed to delete profile from MySQL.");
        console.error(err);
      }
    }
    setModal(null);
  };

  const handleSaveNurseEdit = async (updated: NurseProfile): Promise<ValidationErrors | void> => {
    const validationErrors = validateNurseEditProfile(updated);
    if (Object.keys(validationErrors).length > 0) {
      return validationErrors;
    }

    if (!useApi) {
      setNurseList((prev) => prev.map((n) => (String(n.id) === String(updated.id) ? updated : n)));
      setModal(null);
      return;
    }

    try {
      const saved = normalizeNurseProfile(await updateNurseProfile(updated));
      const nextProfile = {
        ...saved,
        avatar: updated.avatar.trim() ? saved.avatar : "",
      };
      setNurseList((prev) => prev.map((n) => (String(n.id) === String(nextProfile.id) ? nextProfile : n)));
      setModal(null);
      setError(null);
      setSuccessMessage("Caregiver profile updated successfully.");
    } catch (err) {
      const apiValidationErrors = parseApiValidationErrors(err);
      if (apiValidationErrors) {
        return apiValidationErrors;
      }

      setError("Failed to save nurse changes to MySQL.");
      console.error(err);
    }
  };

  const handleDeleteNurseConfirm = async () => {
    if (modal?.type !== "deleteNurse") return;

    if (!useApi) {
      setNurseList((prev) => prev.filter((n) => n.id !== modal.profile.id));
      setSelectedRow(null);
      setModal(null);
      return;
    }

    try {
      await deleteNurseProfile(modal.profile.id);
      setNurseList((prev) => prev.filter((n) => n.id !== modal.profile.id));
      setSelectedRow(null);
      setModal(null);
      setError(null);
    } catch (err) {
      setError("Failed to delete nurse profile from MySQL.");
      console.error(err);
    }
  };

  const validateNewProfile = (profile: NewProfilePayload): ValidationErrors => {
    const errors: ValidationErrors = {};
    const name = profile.name;
    const age = Number(profile.age);

    if (!name.trim()) errors.name = "Full name is required.";
    else if (name.trim().length > PROFILE_NAME_MAX_LENGTH) {
      errors.name = `Full name must be ${PROFILE_NAME_MAX_LENGTH} characters or fewer.`;
    }
    else if (name.startsWith(" ")) errors.name = "Full name cannot start with a space.";
    else if (name.includes("  ")) errors.name = "Full name cannot contain double spaces.";
    else if (!/[A-Za-z]/.test(name)) errors.name = "Full name must contain at least one letter.";

    if (!profile.age.trim()) errors.age = "Age is required.";
    else if (!Number.isInteger(age)) errors.age = "Age must be a whole number.";
    else if (profile.type === "nurse" && (age < 18 || age > 40)) {
      errors.age = "Caregiver age must be between 18 and 40.";
    } else if (profile.type === "elderly" && (age < 50 || age > 120)) {
      errors.age = "Elderly age must be between 50 and 120.";
    }

    if (!profile.gender) errors.gender = "Gender is required.";
    if (!profile.phone.trim()) errors.phone = "Phone is required.";
    else if (!/^09-\d{9}$/.test(profile.phone.trim())) {
      errors.phone = "Phone must use format 09-#########.";
    }
    if (profile.type === "nurse") {
      if (!profile.email.trim()) errors.email = "Email is required.";
      else if (!/^[A-Za-z][A-Za-z0-9._%+-]*@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(profile.email.trim())) {
        errors.email = "Email must include @ and a valid domain.";
      }
    } else if (
      profile.email.trim() &&
      !/^[A-Za-z][A-Za-z0-9._%+-]*@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(profile.email.trim())
    ) {
      errors.email = "Email must include @ and a valid domain.";
    }

    if (profile.address.trim()) {
      if (profile.address.trim().length > 500) errors.address = "Address must be 500 characters or fewer.";
    } else if (profile.type === "elderly" || profile.type === "nurse") {
      errors.address = "Address is required.";
    }

    if (profile.type === "elderly") {
      const birthdateError = validateElderlyBirthdate(profile.birthdate);
      if (birthdateError) errors.birthdate = birthdateError;
      if (!profile.medicalCondition.trim()) errors.medicalCondition = "Medical conditions are required.";
      else if (profile.medicalCondition.trim().length > 500) {
        errors.medicalCondition = "Medical conditions must be 500 characters or fewer.";
      }
      if (!profile.allergies.trim()) errors.allergies = "Allergies are required.";
      else if (profile.allergies.trim().length > 300) errors.allergies = "Allergies must be 300 characters or fewer.";
      if (!profile.bloodType.trim()) errors.bloodType = "Blood type is required.";
      else if (profile.bloodType.trim().length > 10) errors.bloodType = "Blood type must be 10 characters or fewer.";
      else if (!/^(A|B|AB|O)[+-]$/i.test(profile.bloodType.trim())) {
        errors.bloodType = "Blood type must be A+, A-, B+, B-, AB+, AB-, O+, or O-.";
      }
      if (!profile.emergencyName.trim()) errors.emergencyName = "Emergency contact name is required.";
      else if (profile.emergencyName.trim().length > 100) {
        errors.emergencyName = "Emergency contact name must be 100 characters or fewer.";
      } else if (!/[A-Za-z]/.test(profile.emergencyName)) {
        errors.emergencyName = "Emergency contact name must contain at least one letter.";
      }
      if (!profile.emergencyPhone.trim()) errors.emergencyPhone = "Emergency phone is required.";
      else if (!/^09-\d{9}$/.test(profile.emergencyPhone.trim())) {
        errors.emergencyPhone = "Emergency phone must use format 09-#########.";
      }
      if (!profile.emergencyAddress.trim()) errors.emergencyAddress = "Emergency address is required.";
      else if (profile.emergencyAddress.trim().length > 500) {
        errors.emergencyAddress = "Emergency address must be 500 characters or fewer.";
      }
    } else {
      if (!profile.position) errors.position = "Position is required.";
      if (!profile.hireDate.trim()) errors.hireDate = "Hire date is required.";
      if (!profile.nurseStatus) errors.nurseStatus = "Nurse status is required.";
    }

    if (profile.type === "nurse") {
      if (!profile.username.trim()) errors.username = "Username is required.";
      else if (!/^[A-Za-z0-9]+$/.test(profile.username.trim())) errors.username = "Username can contain letters and numbers only.";
      else if (!/[A-Za-z]/.test(profile.username.trim())) errors.username = "Username must contain at least one letter.";
      else if (profile.username.trim().length < 4) errors.username = "Username must be at least 4 characters.";
      if (!profile.password.trim()) errors.password = "Password is required.";
      else if (profile.password.trim().length < 8) errors.password = "Password must be at least 8 characters.";
      if (profile.password !== profile.confirmPassword) errors.confirmPassword = "Passwords must match.";
    }

    return errors;
  };

  const parseApiValidationErrors = (err: unknown): ValidationErrors | null => {
    if (!(err instanceof Error)) return null;

    try {
      const parsed = JSON.parse(err.message);
      return parsed?.errors || null;
    } catch {
      return null;
    }
  };

  const handleSaveAssignments = async (profile: NurseProfile, elderlyIds: string[]) => {
    if (profile.status === "On Leave") {
      setError("Cannot assign elderly to a nurse who is On Leave.");
      setModal(null);
      return;
    }
    const nurseId = String(profile.nurseId || profile.id);
    const uniqueElderlyIds = Array.from(new Set(elderlyIds.map(String)));

    if (!useApi) {
      setAssignmentMap((prev) => ({ ...prev, [nurseId]: uniqueElderlyIds }));
      setNurseList((prev) => prev.map((n) => (
        String(n.nurseId || n.id) === nurseId ? { ...n, assignedElders: uniqueElderlyIds.length } : n
      )));
      setModal({ type: "viewNurse", profile: { ...profile, assignedElders: uniqueElderlyIds.length } });
      setSuccessMessage("Assigned elderly updated successfully.");
      return;
    }

    try {
      const response = await updateNurseElderlyAssignments(nurseId, uniqueElderlyIds);
      const savedIds = response.assignments.map((assignment) => String(assignment.elderlyId));

      setAssignmentMap((prev) => ({ ...prev, [nurseId]: savedIds }));
      setNurseList((prev) => prev.map((n) => (
        String(n.nurseId || n.id) === nurseId ? { ...n, assignedElders: savedIds.length } : n
      )));
      setModal({ type: "viewNurse", profile: { ...profile, assignedElders: savedIds.length } });
      setError(null);
      setSuccessMessage("Assigned elderly updated successfully.");
    } catch (err) {
      let message = "Failed to save assigned elderly.";

      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message);
          message = parsed.error || message;
        } catch {
          message = err.message || message;
        }
      }

      setError(message);
      console.error(err);
    }
  };

  const handleAddProfile = async (profile: NewProfilePayload): Promise<ValidationErrors | void> => {
    if (!useApi) {
      const validationErrors = validateNewProfile(profile);
      if (Object.keys(validationErrors).length > 0) return validationErrors;

      if (profile.type === "elderly") {
        const created: ElderlyProfile = {
          id: `ELD-${String(elderlyList.length + 1).padStart(4, "0")}`,
          name: profile.name.trim(),
          age: Number(profile.age),
          gender: profile.gender,
          phone: profile.phone,
          medicalCondition: profile.medicalCondition,
          emergencyContact: profile.emergencyName,
          emergencyAddress: profile.emergencyAddress,
          roomId: profile.roomId,
          floorNumber: "",
          roomNumber: "",
          roomLabel: "",
          status: "Active",
          avatar: profile.avatar || `https://i.pravatar.cc/40?u=${encodeURIComponent(profile.name.trim())}`,
          dob: profile.birthdate,
          address: profile.address,
          bloodType: profile.bloodType,
          allergies: profile.allergies,
          doctorName: "",
          relationship: "",
          emergencyPhone: profile.emergencyPhone,
          admissionDate: new Date().toLocaleDateString(),
          notes: "",
        };
        setElderlyList((prev) => [created, ...prev]);
        setSuccessMessage("Elderly profile added successfully.");
      } else {
        const created: NurseProfile = {
          id: String(nurseList.length + 1),
          name: profile.name.trim(),
          age: Number(profile.age),
          gender: profile.gender,
          phone: profile.phone,
          email: profile.email,
          address: profile.address,
          position: profile.position,
          hireDate: profile.hireDate,
          status: profile.nurseStatus === "On Leave" ? "On Leave" : "Active",
          avatar: profile.avatar || "https://i.pravatar.cc/40?img=49",
          assignedElders: 0,
          nurseStatus: profile.nurseStatus,
        };
        setNurseList((prev) => [created, ...prev]);
        setSuccessMessage("Caregiver profile added successfully.");
      }

      setModal(null);
      return;
    }

    try {
      if (profile.type === "elderly") {
        const created = normalizeElderlyProfile(await createElderlyProfile(profile));
        setElderlyList((prev) => [created, ...prev]);
        setSuccessMessage("Elderly profile added successfully.");
      } else {
        const created = normalizeNurseProfile(await createNurseProfile(profile));
        setNurseList((prev) => [created, ...prev]);
        setSuccessMessage("Caregiver profile added successfully.");
      }

      setError(null);
      setModal(null);
    } catch (err) {
      const validationErrors = parseApiValidationErrors(err);
      if (validationErrors) return validationErrors;

      setError("Failed to create profile.");
      console.error(err);
    }
  };

  // Show add profile form
  if (modal?.type === "addForm") {
    const sharedProps = {
      onBack: () => setModal(null),
      onSave: handleAddProfile,
    };

    return modal.formType === "elderly"
      ? <AddElderlyProfileForm {...sharedProps} />
      : <AddNurseProfileForm {...sharedProps} />;
  }

  const newElderlyRegistrations = useApi
    ? countRegistrationsThisWeek(elderlyList, (profile) => profile.admissionDate)
    : 0;
  const newNurseRegistrations = useApi
    ? countRegistrationsThisWeek(nurseList, (profile) => profile.hireDate)
    : 0;

  const isThisMonth = (value?: string) => {
    if (!value) return false;
    const date = new Date(String(value).replace(" ", "T"));
    if (Number.isNaN(date.getTime())) return false;

    const now = new Date();
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  };

  const getNurseMonthDate = (n: NurseProfile) => n.createdAt || n.hireDate;
  const nurseRegistrationsThisMonth = nurseList.filter((n) => isThisMonth(getNurseMonthDate(n))).length;
  const activeNursesThisMonth = nurseList.filter((n) => n.status === "Active" && isThisMonth(getNurseMonthDate(n))).length;

  const elderlyStats = [
    { label: "Total Elders", value: elderlyList.length, sub: "+8 this month", icon: <Users size={18} />, iconBg: "#eff6ff", iconColor: "#3b82f6" },
    { label: "Total Caregivers", value: nurseList.length, sub: `+${nurseRegistrationsThisMonth} this month`, icon: <UserCheck size={18} />, iconBg: "#f0fdf4", iconColor: "#22c55e" },
    { label: "Active Cases", value: elderlyList.filter((e) => e.status === "Active").length, sub: "+3 this week", icon: <Activity size={18} />, iconBg: "#fff7ed", iconColor: "#f97316" },
    { label: "New Registrations", value: newElderlyRegistrations, sub: "This week", icon: <UserPlus size={18} />, iconBg: "#fdf4ff", iconColor: "#a855f7" },
  ];

  const nurseStats = [
    { label: "Total Nurses", value: nurseList.length, sub: `+${nurseRegistrationsThisMonth} this month`, icon: <Users size={18} />, iconBg: "#eff6ff", iconColor: "#3b82f6" },
    { label: "Total Elders", value: elderlyList.length, sub: "+8 this month", icon: <UserCheck size={18} />, iconBg: "#f0fdf4", iconColor: "#22c55e" },
    { label: "Active Nurses", value: nurseList.filter((n) => n.status === "Active").length, sub: `+${activeNursesThisMonth} this month`, icon: <Activity size={18} />, iconBg: "#fff7ed", iconColor: "#f97316" },
    { label: "New Registrations", value: newNurseRegistrations, sub: "This week", icon: <UserPlus size={18} />, iconBg: "#fdf4ff", iconColor: "#a855f7" },
  ];

  const stats = activeTab === "elderly" ? elderlyStats : nurseStats;

  const selectedElderlyProfile = selectedRow
    ? elderlyList.find((e) => e.id === selectedRow)
    : null;

  const selectedNurseProfile = selectedRow
    ? nurseList.find((n) => n.id === selectedRow)
    : null;

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="flex-1 overflow-y-auto p-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs mb-4" style={{ color: "#6b7a99" }}>
          <span>Dashboard</span>
          <span>/</span>
          <span style={{ color: "#1a2b42", fontWeight: 500 }}>Manage Profiles</span>
        </div>

        {(loading || error) && (
          <div
            className="mb-4 rounded-lg border px-3 py-2 text-xs"
            style={{
              backgroundColor: error ? "#fef2f2" : "#eff6ff",
              borderColor: error ? "#fecaca" : "#bfdbfe",
              color: error ? "#b91c1c" : "#1d4ed8",
            }}
          >
            {loading ? "Loading profiles from MySQL..." : error}
          </div>
        )}

        {successMessage && (
          <div
            className="mb-4 flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs"
            style={{
              backgroundColor: "#f0fdf4",
              borderColor: "#bbf7d0",
              color: "#15803d",
            }}
          >
            <span>{successMessage}</span>
            <button
              onClick={() => setSuccessMessage(null)}
              className="rounded px-2 py-0.5 hover:bg-green-100"
              style={{ color: "#166534" }}
            >
              Close
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {stats.map((s) => (
            <div key={s.label} className="bg-white rounded-xl p-3 border" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: s.iconBg, color: s.iconColor }}>
                  {s.icon}
                </div>
              </div>
              <div className="text-xl" style={{ color: "#1a2b42", fontWeight: 700 }}>{s.value}</div>
              <div className="text-xs" style={{ color: "#1a2b42" }}>{s.label}</div>
              <div className="text-xs mt-0.5" style={{ color: "#22c55e" }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-4">
          {(["elderly", "nurse"] as ProfileTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => handleProfileTabChange(tab)}
              className="px-4 py-1.5 rounded-lg text-xs transition-colors"
              style={{
                backgroundColor: activeTab === tab ? "#2563eb" : "transparent",
                color: activeTab === tab ? "#fff" : "#6b7a99",
                fontWeight: activeTab === tab ? 600 : 400,
              }}
            >
              {tab === "elderly" ? "Elderly Profiles" : "Caregiver / Nurse Profiles"}
            </button>
          ))}
        </div>

        <div className={`flex gap-4 ${selectedRow ? "items-start" : ""}`}>
          {/* Main table area */}
          <div className="flex-1 bg-white rounded-xl border overflow-hidden" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
            {/* Table Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
              <div className="relative min-w-[220px] flex-1 max-w-xs">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#6b7a99" }} />
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder={`Search by name, phone, ${activeTab === "elderly" ? "conditions..." : "position, email..."}`}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border outline-none"
                  style={{ borderColor: "rgba(0,0,0,0.1)", backgroundColor: "#f8fafc", color: "#1a2b42" }}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {activeTab === "elderly" && (
                  <>
                    <FilterSelect
                      label="Status"
                      value={elderlyStatusFilter}
                      onChange={(value) => {
                        setElderlyStatusFilter(value as "all" | "Active" | "Inactive");
                        resetElderlyTable();
                      }}
                      options={[
                        { value: "all", label: "All Status" },
                        { value: "Active", label: "Active" },
                        { value: "Inactive", label: "Inactive" },
                      ]}
                    />
                    <FilterSelect
                      label="Gender"
                      value={elderlyGenderFilter}
                      onChange={(value) => {
                        setElderlyGenderFilter(value as "all" | "male" | "female" | "other");
                        resetElderlyTable();
                      }}
                      options={[
                        { value: "all", label: "All Gender" },
                        { value: "male", label: "Male" },
                        { value: "female", label: "Female" },
                        { value: "other", label: "Other" },
                      ]}
                    />
                    <AgeFilterInput
                      label="Min Age"
                      value={elderlyMinAge}
                      onChange={(value) => {
                        setElderlyMinAge(value);
                        resetElderlyTable();
                      }}
                    />
                    <AgeFilterInput
                      label="Max Age"
                      value={elderlyMaxAge}
                      onChange={(value) => {
                        setElderlyMaxAge(value);
                        resetElderlyTable();
                      }}
                    />
                    {hasElderlyFilters && (
                      <button
                        onClick={clearElderlyFilters}
                        className="flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs transition-colors hover:bg-gray-50"
                        style={{ borderColor: "rgba(0,0,0,0.1)", color: "#6b7a99" }}
                      >
                        <X size={12} /> Clear
                      </button>
                    )}
                  </>
                )}
                {activeTab === "nurse" && (
                  <>
                    {/* Nurse Status Filter Toolbar */}
                    <FilterSelect
                      label="Status"
                      value={nurseStatusFilter}
                      onChange={(value) => {
                        setNurseStatusFilter(value as "all" | "Active" | "On Leave");
                        resetNurseTable();
                      }}
                      options={[
                        { value: "all", label: "All Status" },
                        { value: "Active", label: "Active" },
                        { value: "On Leave", label: "On Leave" },
                      ]}
                    />

                    <FilterSelect
                      label="Gender"
                      value={nurseGenderFilter}
                      onChange={(value) => {
                        setNurseGenderFilter(value as "all" | "male" | "female" | "other");
                        resetNurseTable();
                      }}
                      options={[
                        { value: "all", label: "All Gender" },
                        { value: "male", label: "Male" },
                        { value: "female", label: "Female" },
                        { value: "other", label: "Other" },
                      ]}
                    />
                  </>
                )}

                <button
                  onClick={() => setModal({ type: "addForm", formType: activeTab })}
                  className="flex h-8 items-center gap-1.5 px-3 rounded-lg text-xs text-white"
                  style={{ backgroundColor: "#2563eb" }}
                >
                  <Plus size={12} /> Add New Profile
                </button>
              </div>
            </div>

            {/* Table */}
            {activeTab === "elderly" ? (
              <ElderlyTable
                data={pagedElderly}
                selectedRow={selectedRow}
                onSelectRow={(id) => setSelectedRow(selectedRow === id ? null : id)}
                onView={(p) => setModal({ type: "view", profile: p })}
                onEdit={(p) => setModal({ type: "edit", profile: p })}
                onDelete={(p) => setModal({ type: "delete", profile: p })}
              />
            ) : (
              <NurseTable
                data={pagedNurse}
                selectedRow={selectedRow}
                onSelectRow={(id) => setSelectedRow(selectedRow === id ? null : id)}
                onView={(p) => setModal({ type: "viewNurse", profile: p })}
                onEdit={(p) => setModal({ type: "editNurse", profile: p })}
                onDelete={(p) => setModal({ type: "deleteNurse", profile: p })}
              />
            )}

            {/* Pagination */}
            <div
              className="flex items-center justify-between px-4 py-3 border-t text-xs"
              style={{ borderColor: "rgba(0,0,0,0.06)", color: "#6b7a99" }}
            >
              <span>
                Showing {(page - 1) * perPage + 1}–
                {Math.min(page * perPage, activeTab === "elderly" ? filteredElderly.length : filteredNurse.length)} of{" "}
                {activeTab === "elderly" ? filteredElderly.length : filteredNurse.length} entries
              </span>
              <div className="flex items-center gap-1">
                <PageBtn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft size={13} />
                </PageBtn>
                {Array.from({ length: Math.min(activeTab === "elderly" ? elderlyPages : nursePages, 5) }, (_, i) => (
                  <PageBtn key={i + 1} active={page === i + 1} onClick={() => setPage(i + 1)}>
                    {i + 1}
                  </PageBtn>
                ))}
                <PageBtn
                  onClick={() => setPage((p) => Math.min(activeTab === "elderly" ? elderlyPages : nursePages, p + 1))}
                  disabled={page === (activeTab === "elderly" ? elderlyPages : nursePages)}
                >
                  <ChevronRight size={13} />
                </PageBtn>
              </div>
            </div>
          </div>

          {/* Side panel */}
          {selectedRow && activeTab === "elderly" && selectedElderlyProfile && (
            <SideProfile profile={selectedElderlyProfile} onClose={() => setSelectedRow(null)} onEdit={() => setModal({ type: "edit", profile: selectedElderlyProfile })} />
          )}
          {selectedRow && activeTab === "nurse" && selectedNurseProfile && (
            <NurseSideProfile profile={selectedNurseProfile} onClose={() => setSelectedRow(null)} />
          )}
        </div>
      </div>

      {/* Modals */}
      {modal?.type === "view" && (
        <ViewModal
          profile={modal.profile}
          onClose={() => setModal(null)}
          onEdit={() => setModal({ type: "edit", profile: modal.profile })}
        />
      )}
      {modal?.type === "edit" && (
        <EditPanel
          profile={modal.profile}
          rooms={rooms}
          onClose={() => setModal(null)}
          onSave={handleSaveEdit}
        />
      )}
      {modal?.type === "delete" && (
        <DeleteModal
          name={modal.profile.name}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.type === "viewNurse" && (
        <NurseViewModal
          profile={modal.profile}
          assignedElderly={getAssignedElderly(modal.profile, assignmentMap, elderlyList)}
          onAssign={() => setModal({ type: "assignElders", profile: modal.profile })}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === "editNurse" && (
        <NurseEditPanel
          profile={modal.profile}
          onClose={() => setModal(null)}
          onSave={handleSaveNurseEdit}
        />
      )}
      {modal?.type === "deleteNurse" && (
        <DeleteModal
          name={modal.profile.name}
          onConfirm={handleDeleteNurseConfirm}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.type === "assignElders" && (
        <AssignEldersModal
          nurse={modal.profile}
          elderlyList={elderlyList}
          assignmentMap={assignmentMap}
          selectedIds={assignmentMap[String(modal.profile.nurseId || modal.profile.id)] || []}
          onCancel={() => setModal({ type: "viewNurse", profile: modal.profile })}
          onSave={(elderlyIds) => handleSaveAssignments(modal.profile, elderlyIds)}
          nurseStatus={modal.profile.status}
        />
      )}
    </div>
  );
}

// ────────────────── Elderly Table ──────────────────

function ElderlyTable({
  data,
  selectedRow,
  onSelectRow,
  onView,
  onEdit,
  onDelete,
}: {
  data: ElderlyProfile[];
  selectedRow: string | null;
  onSelectRow: (id: string) => void;
  onView: (p: ElderlyProfile) => void;
  onEdit: (p: ElderlyProfile) => void;
  onDelete: (p: ElderlyProfile) => void;
}) {
  const cols = ["ID", "Name", "Age", "Gender", "Floor", "Room", "Medical Condition", "Status", "Actions"];
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr style={{ backgroundColor: "#f8fafc" }}>
            {cols.map((c) => (
              <th key={c} className="px-3 py-2.5 text-left text-xs" style={{ color: "#6b7a99", fontWeight: 600, whiteSpace: "nowrap" }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 && (
            <tr>
              <td colSpan={cols.length} className="px-3 py-10 text-center text-xs" style={{ color: "#6b7a99" }}>
                No elderly profiles found.
              </td>
            </tr>
          )}
          {data.map((row) => (
            <tr
              key={row.id}
              onClick={() => onSelectRow(row.id)}
              className="border-t cursor-pointer transition-colors"
              style={{
                borderColor: "rgba(0,0,0,0.05)",
                backgroundColor: selectedRow === row.id ? "#eff6ff" : "transparent",
              }}
              onMouseEnter={(e) => { if (selectedRow !== row.id) e.currentTarget.style.backgroundColor = "#f8fafc"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = selectedRow === row.id ? "#eff6ff" : "transparent"; }}
            >
              <td className="px-3 py-2.5 text-xs" style={{ color: "#6b7a99" }}>{row.id}</td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <ProfileAvatar src={row.avatar} name={row.name} className="w-7 h-7" iconSize={13} />
                  <span className="text-xs" style={{ color: "#1a2b42", fontWeight: 500 }}>{row.name}</span>
                </div>
              </td>
              <td className="px-3 py-2.5 text-xs" style={{ color: "#1a2b42" }}>{row.age}</td>
              <td className="px-3 py-2.5 text-xs" style={{ color: "#1a2b42" }}>{row.gender}</td>
              <td className="px-3 py-2.5 text-xs" style={{ color: "#1a2b42" }}>{row.floorNumber}</td>
              <td className="px-3 py-2.5 text-xs" style={{ color: "#1a2b42" }}>{row.roomNumber}</td>
              <td className="px-3 py-2.5 text-xs" style={{ color: "#1a2b42" }}>{row.medicalCondition}</td>
              <td className="px-3 py-2.5">
                <span
                  className="px-2 py-0.5 rounded-full text-xs"
                  style={{
                    backgroundColor: row.status === "Active" ? "#dcfce7" : "#fee2e2",
                    color: row.status === "Active" ? "#16a34a" : "#dc2626",
                  }}
                >
                  {row.status}
                </span>
              </td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <ActionBtn color="#3b82f6" onClick={() => onView(row)}><Eye size={13} /></ActionBtn>
                  <ActionBtn color="#22c55e" onClick={() => onEdit(row)}><Pencil size={13} /></ActionBtn>
                  <ActionBtn color="#ef4444" onClick={() => onDelete(row)}><Trash2 size={13} /></ActionBtn>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ────────────────── Nurse Table ──────────────────

function NurseTable({
  data,
  selectedRow,
  onSelectRow,
  onView,
  onEdit,
  onDelete,
}: {
  data: NurseProfile[];
  selectedRow: string | null;
  onSelectRow: (id: string) => void;
  onView: (p: NurseProfile) => void;
  onEdit: (p: NurseProfile) => void;
  onDelete: (p: NurseProfile) => void;
}) {
  const cols = ["ID", "Name", "Age", "Gender", "Phone", "Email", "Position", "Hire Date", "Status", "Actions"];
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr style={{ backgroundColor: "#f8fafc" }}>
            {cols.map((c) => (
              <th key={c} className="px-3 py-2.5 text-left text-xs" style={{ color: "#6b7a99", fontWeight: 600, whiteSpace: "nowrap" }}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 && (
            <tr>
              <td colSpan={cols.length} className="px-3 py-10 text-center text-xs" style={{ color: "#6b7a99" }}>
                No caregiver or nurse profiles found.
              </td>
            </tr>
          )}
          {data.map((row) => (
            <tr
              key={row.id}
              onClick={() => onSelectRow(row.id)}
              className="border-t cursor-pointer transition-colors"
              style={{
                borderColor: "rgba(0,0,0,0.05)",
                backgroundColor: selectedRow === row.id ? "#eff6ff" : "transparent",
              }}
              onMouseEnter={(e) => { if (selectedRow !== row.id) e.currentTarget.style.backgroundColor = "#f8fafc"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = selectedRow === row.id ? "#eff6ff" : "transparent"; }}
            >
              <td className="px-3 py-2.5 text-xs" style={{ color: "#6b7a99" }}>{getNurseSqlDisplayId(row)}</td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <ProfileAvatar src={row.avatar} name={row.name} className="w-7 h-7" iconSize={13} />
                  <span className="text-xs" style={{ color: "#1a2b42", fontWeight: 500 }}>{row.name}</span>
                </div>
              </td>
              <td className="px-3 py-2.5 text-xs" style={{ color: "#1a2b42" }}>{row.age}</td>
              <td className="px-3 py-2.5 text-xs" style={{ color: "#1a2b42" }}>{row.gender}</td>
              <td className="px-3 py-2.5 text-xs" style={{ color: "#1a2b42", whiteSpace: "nowrap" }}>{row.phone}</td>
              <td className="px-3 py-2.5 text-xs" style={{ color: "#1a2b42" }}>{row.email}</td>
              <td className="px-3 py-2.5 text-xs" style={{ color: "#1a2b42" }}>{row.position}</td>
              <td className="px-3 py-2.5 text-xs" style={{ color: "#1a2b42", whiteSpace: "nowrap" }}>{row.hireDate}</td>
              <td className="px-3 py-2.5">
                <span
                  className="px-2 py-0.5 rounded-full text-xs"
                  style={{
                    backgroundColor: row.status === "Active" ? "#dcfce7" : "#fef3c7",
                    color: row.status === "Active" ? "#16a34a" : "#d97706",
                  }}
                >
                  {row.status}
                </span>
              </td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <ActionBtn color="#3b82f6" onClick={() => onView(row)}><Eye size={13} /></ActionBtn>
                  <ActionBtn color="#22c55e" onClick={() => onEdit(row)}><Pencil size={13} /></ActionBtn>
                  <ActionBtn color="#ef4444" onClick={() => onDelete(row)}><Trash2 size={13} /></ActionBtn>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ────────────────── Side Profile Panels ──────────────────

function SideProfile({
  profile,
  onClose,
  onEdit,
}: {
  profile: ElderlyProfile;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <div
      className="w-64 bg-white rounded-xl border flex-shrink-0 overflow-hidden"
      style={{ borderColor: "rgba(0,0,0,0.07)" }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
        <span className="text-xs" style={{ color: "#1a2b42", fontWeight: 700 }}>Profile Details</span>
        <button onClick={onClose} className="hover:bg-gray-100 rounded-full p-0.5">
          <X size={14} style={{ color: "#6b7a99" }} />
        </button>
      </div>

      <div className="p-4 overflow-y-auto max-h-[600px]">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-4">
          <ProfileAvatar src={profile.avatar} name={profile.name} className="w-14 h-14 mb-2" iconSize={22} />
          <div className="text-sm text-center" style={{ color: "#1a2b42", fontWeight: 700 }}>{profile.name}</div>
          <div className="text-xs" style={{ color: "#6b7a99" }}>{profile.id}</div>
          <span
            className="text-xs px-2 py-0.5 rounded-full mt-1"
            style={{ backgroundColor: "#dcfce7", color: "#16a34a" }}
          >
            {profile.status}
          </span>
        </div>

        <SideSection title="Personal Information">
          <SideRow label="Full Name" value={profile.name} />
          <SideRow label="Date of Birth" value={profile.dob} />
          <SideRow label="Gender" value={profile.gender} />
          <SideRow label="Floor" value={profile.floorNumber || "-"} />
          <SideRow label="Room" value={profile.roomNumber || "-"} />
        </SideSection>

        <SideSection title="Medical Information">
          <SideRow label="Condition" value={profile.medicalCondition} />
          <SideRow label="Blood Type" value={profile.bloodType} />
          <SideRow label="Allergies" value={profile.allergies} />
        </SideSection>

        <SideSection title="Emergency Contact">
          <SideRow label="Relationship" value={profile.relationship} />
          <SideRow label="Phone" value={profile.emergencyPhone} />
          <SideRow label="Address" value={profile.emergencyAddress} />
        </SideSection>

        <button
          onClick={onEdit}
          className="w-full py-2 rounded-lg text-xs text-white mt-2 hover:opacity-90 transition-opacity"
          style={{ backgroundColor: "#2563eb" }}
        >
          Edit Profile
        </button>
      </div>
    </div>
  );
}

function NurseSideProfile({
  profile,
  onClose,
}: {
  profile: NurseProfile;
  onClose: () => void;
}) {
  return (
    <div
      className="w-64 bg-white rounded-xl border flex-shrink-0 overflow-hidden"
      style={{ borderColor: "rgba(0,0,0,0.07)" }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
        <span className="text-xs" style={{ color: "#1a2b42", fontWeight: 700 }}>Nurse Details</span>
        <button onClick={onClose} className="hover:bg-gray-100 rounded-full p-0.5">
          <X size={14} style={{ color: "#6b7a99" }} />
        </button>
      </div>

      <div className="p-4 overflow-y-auto max-h-[600px]">
        <div className="flex flex-col items-center mb-4">
          <ProfileAvatar src={profile.avatar} name={profile.name} className="w-14 h-14 mb-2" iconSize={22} />
          <div className="text-sm text-center" style={{ color: "#1a2b42", fontWeight: 700 }}>{profile.name}</div>
          <div className="text-xs" style={{ color: "#6b7a99" }}>{getNurseSqlDisplayId(profile)}</div>
          <span
            className="text-xs px-2 py-0.5 rounded-full mt-1"
            style={{
              backgroundColor: profile.status === "Active" ? "#dcfce7" : "#fef3c7",
              color: profile.status === "Active" ? "#16a34a" : "#d97706",
            }}
          >
            {profile.status}
          </span>
        </div>

        <SideSection title="Contact Information">
          <SideRow label="Phone" value={profile.phone} />
          <SideRow label="Email" value={profile.email} />
          <SideRow label="Address" value={profile.address} />
        </SideSection>

        <SideSection title="Professional Information">
          <SideRow label="Position" value={profile.position} />
          <SideRow label="Hire Date" value={profile.hireDate} />
          <SideRow label="Assigned Elders" value={String(profile.assignedElders)} />
        </SideSection>
      </div>
    </div>
  );
}

function SideSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-3">
      <div className="text-xs pb-1 mb-2 border-b" style={{ color: "#2563eb", fontWeight: 700, borderColor: "rgba(0,0,0,0.07)" }}>
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function SideRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-xs flex-shrink-0" style={{ color: "#6b7a99" }}>{label}</span>
      <span className="text-xs text-right" style={{ color: "#1a2b42", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

// ────────────────── Modals ──────────────────

function ViewModal({
  profile,
  onClose,
  onEdit,
}: {
  profile: ElderlyProfile;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
          <div>
            <h2 style={{ color: "#1a2b42", fontWeight: 700 }}>View Elderly Profile</h2>
            <p className="text-xs mt-0.5" style={{ color: "#6b7a99" }}>{profile.id}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100">
            <X size={16} style={{ color: "#6b7a99" }} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[65vh]">
          <div className="flex items-center gap-3 mb-5">
            <ProfileAvatar src={profile.avatar} name={profile.name} className="w-14 h-14 border-2" iconSize={22} />
            <div>
              <div style={{ color: "#1a2b42", fontWeight: 700 }}>{profile.name}</div>
              <div className="text-xs" style={{ color: "#6b7a99" }}>{profile.age} yrs · {profile.gender}</div>
              <span className="inline-block text-xs px-2 py-0.5 rounded-full mt-1" style={{ backgroundColor: "#dcfce7", color: "#16a34a" }}>{profile.status}</span>
            </div>
          </div>

          <ModalSection title="Personal Information">
            <ModalRow label="Full Name" value={profile.name} />
            <ModalRow label="Date of Birth" value={profile.dob} />
            <ModalRow label="Gender" value={profile.gender} />
            <ModalRow label="Address" value={profile.address} />
            <ModalRow label="Floor" value={profile.floorNumber || "-"} />
            <ModalRow label="Room" value={profile.roomNumber || "-"} />
          </ModalSection>

          <ModalSection title="Medical Information">
            <ModalRow label="Medical Condition" value={profile.medicalCondition} />
            <ModalRow label="Blood Type" value={profile.bloodType} />
            <ModalRow label="Allergies" value={profile.allergies} highlight />
          </ModalSection>

          <ModalSection title="Emergency Contact">
            <ModalRow label="Relationship" value={profile.relationship} />
            <ModalRow label="Phone" value={profile.emergencyPhone} />
            <ModalRow label="Address" value={profile.emergencyAddress} />
          </ModalSection>

          <ModalSection title="Status Details">
            <ModalRow label="Admission Date" value={profile.admissionDate} />
            <ModalRow label="Status" value={profile.status} />
          </ModalSection>
        </div>

        <div className="flex gap-2 p-4 border-t" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border text-sm hover:bg-gray-50" style={{ borderColor: "rgba(0,0,0,0.12)", color: "#6b7a99" }}>
            Close
          </button>
          <button onClick={onEdit} className="flex-1 py-2 rounded-lg text-sm text-white hover:opacity-90" style={{ backgroundColor: "#2563eb" }}>
            Edit Profile
          </button>
        </div>
      </div>
    </div>
  );
}

function NurseViewModal({
  profile,
  assignedElderly,
  onAssign,
  onClose,
}: {
  profile: NurseProfile;
  assignedElderly: ElderlyProfile[];
  onAssign: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
          <div>
            <h2 style={{ color: "#1a2b42", fontWeight: 700 }}>View Nurse Profile</h2>
            <p className="text-xs mt-0.5" style={{ color: "#6b7a99" }}>{getNurseSqlDisplayId(profile)}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100">
            <X size={16} style={{ color: "#6b7a99" }} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto max-h-[65vh]">
          <div className="flex items-center gap-3 mb-5">
            <ProfileAvatar src={profile.avatar} name={profile.name} className="w-14 h-14 border-2" iconSize={22} />
            <div>
              <div style={{ color: "#1a2b42", fontWeight: 700 }}>{profile.name}</div>
              <div className="text-xs" style={{ color: "#6b7a99" }}>{profile.age} yrs · {profile.gender}</div>
              <span className="inline-block text-xs px-2 py-0.5 rounded-full mt-1" style={{ backgroundColor: profile.status === "Active" ? "#dcfce7" : "#fef3c7", color: profile.status === "Active" ? "#16a34a" : "#d97706" }}>{profile.status}</span>
            </div>
          </div>

          <ModalSection title="Contact Information">
            <ModalRow label="Phone" value={profile.phone} />
            <ModalRow label="Email" value={profile.email} />
            <ModalRow label="Address" value={profile.address} />
          </ModalSection>
          <ModalSection title="Professional Information">
            <ModalRow label="Position" value={profile.position} />
            <ModalRow label="Hire Date" value={profile.hireDate} />
            <ModalRow label="Assigned Elders" value={String(assignedElderly.length)} />
          </ModalSection>

          <ModalSection title="Assigned Elderly">
            {assignedElderly.length > 0 ? (
              <div className="space-y-2">
                {assignedElderly.map((elderly) => (
                  <div key={elderly.id} className="flex items-center gap-2 rounded-lg border px-2 py-2" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
                    <ProfileAvatar src={elderly.avatar} name={elderly.name} className="h-8 w-8" iconSize={14} />
                    <div className="min-w-0">
                      <div className="truncate text-xs" style={{ color: "#1a2b42", fontWeight: 700 }}>{elderly.name}</div>
                      <div className="truncate text-xs" style={{ color: "#6b7a99" }}>Floor {elderly.floorNumber} - Room {elderly.roomNumber} · {elderly.medicalCondition}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs" style={{ color: "#6b7a99" }}>
                No elderly assigned yet.
              </p>
            )}
          </ModalSection>
        </div>
        <div className="flex gap-2 p-4 border-t" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border text-sm hover:bg-gray-50" style={{ borderColor: "rgba(0,0,0,0.12)", color: "#6b7a99" }}>
            Close
          </button>
          <button onClick={onAssign} className="flex-1 py-2 rounded-lg text-sm text-white hover:opacity-90" style={{ backgroundColor: "#2563eb" }}>
            Assign Elderly
          </button>
        </div>
      </div>
    </div>
  );
}

function AssignEldersModal({
  nurse,
  elderlyList,
  assignmentMap,
  selectedIds,
  onCancel,
  onSave,
  nurseStatus,
}: {
  nurse: NurseProfile;
  elderlyList: ElderlyProfile[];
  assignmentMap: Record<string, string[]>;
  selectedIds: string[];
  onCancel: () => void;
  onSave: (elderlyIds: string[]) => Promise<void> | void;
  nurseStatus: "Active" | "On Leave";
}) {
  const currentNurseId = String(nurse.nurseId || nurse.id);
  const assignedToOtherNurseIds = new Set(
    Object.entries(assignmentMap).flatMap(([nurseId, elderlyIds]) => (
      nurseId === currentNurseId ? [] : elderlyIds.map(String)
    ))
  );
  const activeElderlyIds = new Set(
    elderlyList.filter((elderly) => elderly.status === "Active").map((elderly) => String(elderly.id))
  );
  const [selected, setSelected] = useState<Set<string>>(() => (
    new Set(selectedIds.map(String).filter((id) => activeElderlyIds.has(id)))
  ));
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const filteredElderly = elderlyList.filter((elderly) => {
    if (elderly.status !== "Active") return false;
    if (assignedToOtherNurseIds.has(String(elderly.id))) return false;

    const text = `${elderly.name} ${elderly.id} ${elderly.medicalCondition}`.toLowerCase();
    return text.includes(query.trim().toLowerCase());
  });

  const toggleElderly = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(Array.from(selected));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="flex max-h-[86vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b p-5" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
          <div>
            <h2 style={{ color: "#1a2b42", fontWeight: 700 }}>Assign Elderly</h2>
            <p className="text-xs mt-0.5" style={{ color: "#6b7a99" }}>{nurse.name}</p>
          </div>
          <button onClick={onCancel} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100">
            <X size={16} style={{ color: "#6b7a99" }} />
          </button>
        </div>

        <div className="border-b p-4" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#6b7a99" }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search elderly by name, ID, or condition"
              className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none"
              style={{ borderColor: "rgba(0,0,0,0.12)", color: "#1a2b42" }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {filteredElderly.length === 0 ? (
            <div className="py-10 text-center text-xs" style={{ color: "#6b7a99" }}>
              No elderly profiles found.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredElderly.map((elderly) => {
                const checked = selected.has(String(elderly.id));

                return (
                  <label
                    key={elderly.id}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 hover:bg-slate-50"
                    style={{ borderColor: checked ? "#93c5fd" : "rgba(0,0,0,0.07)", backgroundColor: checked ? "#eff6ff" : "#fff" }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleElderly(String(elderly.id))}
                      className="h-4 w-4"
                    />
                    <ProfileAvatar src={elderly.avatar} name={elderly.name} className="h-9 w-9" iconSize={15} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm" style={{ color: "#1a2b42", fontWeight: 700 }}>{elderly.name}</div>
                      <div className="truncate text-xs" style={{ color: "#6b7a99" }}>F{elderly.floorNumber}-R{elderly.roomNumber} · {elderly.medicalCondition}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t p-4" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
          <span className="text-xs" style={{ color: "#6b7a99" }}>
            {nurseStatus === "On Leave" ? "Nurse is on leave. Cannot assign elderly." : `${selected.size} elderly selected`}
          </span>
          <div className="flex gap-2">
            <button onClick={onCancel} className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50" style={{ borderColor: "rgba(0,0,0,0.12)", color: "#6b7a99" }}>
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || nurseStatus === "On Leave"}
              className="rounded-lg px-4 py-2 text-sm text-white disabled:opacity-70"
              style={{ backgroundColor: "#2563eb" }}
            >
              {saving ? "Saving..." : "Save Assignments"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditPanel({
  profile,
  rooms,
  onClose,
  onSave,
}: {
  profile: ElderlyProfile;
  rooms: Room[];
  onClose: () => void;
  onSave: (p: ElderlyProfile) => Promise<ValidationErrors | void> | ValidationErrors | void;
}) {
  const [form, setForm] = useState({ ...profile, dob: toDateInputValue(profile.dob) });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [saving, setSaving] = useState(false);
  const birthdateLimits = getBirthdateLimits();
  const roomOptions = rooms
    .filter((room) => !room.elderlyId || String(room.elderlyId) === String(profile.id))
    .map((room) => ({
      value: String(room.roomId),
      label: `Floor ${room.floorNumber} - Room ${room.roomNumber}`,
    }));

  const update = (field: keyof ElderlyProfile, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const validationErrors = await onSave({ ...form, age: Number(form.age) || 0 });
      if (validationErrors && Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
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
            <p className="text-xs mt-0.5" style={{ color: "#6b7a99" }}>Update {profile.name}'s details</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100">
            <X size={16} style={{ color: "#6b7a99" }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <EditSection title="Personal Information">
            <EditPhotoField value={form.avatar} onChange={(v) => update("avatar", v)} />
            <EditRow2>
              <EditField label="Full Name" value={form.name} error={errors.name} onChange={(v) => update("name", v)} />
              <EditField label="Age" type="number" value={String(form.age)} error={errors.age} onChange={(v) => update("age" as any, v)} />
            </EditRow2>
            <EditRow2>
              <EditSelect label="Gender" value={form.gender} options={["Male", "Female", "Other"]} error={errors.gender} onChange={(v) => update("gender", v)} />
              <EditField
                label="Birthdate"
                type="date"
                value={form.dob}
                min={birthdateLimits.min}
                max={birthdateLimits.max}
                blockTyping
                error={errors.dob}
                onChange={(v) => update("dob", v)}
              />
            </EditRow2>
            <EditField label="Phone" value={form.phone} placeholder="09-123456789" error={errors.phone} onChange={(v) => update("phone", v)} />
            <EditField label="Address" value={form.address} error={errors.address} onChange={(v) => update("address", v)} />
          </EditSection>

          <EditSection title="Medical Information">
            <EditField label="Medical Condition" value={form.medicalCondition} error={errors.medicalCondition} onChange={(v) => update("medicalCondition", v)} />
            <EditRow2>
              <EditSelect
                label="Blood Type"
                value={form.bloodType}
                options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]}
                error={errors.bloodType}
                onChange={(v) => update("bloodType", v)}
              />
              <EditField label="Allergies" value={form.allergies} error={errors.allergies} onChange={(v) => update("allergies", v)} />
            </EditRow2>
          </EditSection>

          <EditSection title="Room Assignment">
            <EditSelect
              label="Floor / Room"
              value={String(form.roomId || "")}
              options={roomOptions}
              error={errors.roomId}
              onChange={(v) => update("roomId", v)}
            />
          </EditSection>

          <EditSection title="Emergency Contact">
            <EditRow2>
              <EditField label="Emergency Name" value={form.emergencyContact} error={errors.emergencyContact} onChange={(v) => update("emergencyContact", v)} />
              <EditField label="Emergency Phone" value={form.emergencyPhone} placeholder="09-123456789" error={errors.emergencyPhone} onChange={(v) => update("emergencyPhone", v)} />
            </EditRow2>
            <EditField label="Emergency Address" value={form.emergencyAddress} error={errors.emergencyAddress} onChange={(v) => update("emergencyAddress", v)} />
          </EditSection>

          <EditSection title="Status">
            <EditSelect label="Status" value={form.status} options={["Active", "Inactive"]} onChange={(v) => update("status" as any, v)} />
          </EditSection>
        </div>

        <div className="flex gap-2 p-4 border-t flex-shrink-0" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border text-sm hover:bg-gray-50" style={{ borderColor: "rgba(0,0,0,0.12)", color: "#6b7a99" }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm text-white hover:opacity-90"
            style={{ backgroundColor: "#2563eb", opacity: saving ? 0.7 : 1 }}
          >
            <Save size={14} /> {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function validateNurseEditProfile(profile: NurseProfile): ValidationErrors {
  const errors: ValidationErrors = {};
  const age = Number(profile.age);
  const phone = String(profile.phone || "").trim();
  const email = String(profile.email || "").trim();

  if (!String(profile.name || "").trim()) {
    errors.name = "Full name is required.";
  } else if (!/^[A-Za-z ]+$/.test(String(profile.name || "").trim())) {
    errors.name = "Full name must contain letters only.";
  }

  if (!Number.isInteger(age) || age < 18 || age > 40) {
    errors.age = "Caregiver age must be between 18 and 40.";
  }

  if (!String(profile.gender || "").trim()) {
    errors.gender = "Gender is required.";
  }

  if (!phone) {
    errors.phone = "Phone is required.";
  } else if (!/^09-\d{9}$/.test(phone)) {
    errors.phone = "Phone must use format 09-#########.";
  }

  if (!email) {
    errors.email = "Email is required.";
  } else if (!/^[A-Za-z][A-Za-z0-9._%+-]*@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
    errors.email = "Email must include @ and a valid domain.";
  }

  if (!String(profile.address || "").trim()) {
    errors.address = "Address is required.";
  }

  if (!String(profile.position || "").trim()) {
    errors.position = "Position is required.";
  }

  const hireDate = String(profile.hireDate || "").trim();
  if (!hireDate) {
    errors.hireDate = "Hire date is required.";
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(hireDate)) {
    errors.hireDate = "Date must use format YYYY-MM-DD.";
  } else {
    const [year, month, day] = hireDate.split("-").map(Number);
    const parsedDate = new Date(`${hireDate}T00:00:00`);
    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.getFullYear() !== year ||
      parsedDate.getMonth() + 1 !== month ||
      parsedDate.getDate() !== day
    ) {
      errors.hireDate = "Date must use format YYYY-MM-DD.";
    }
  }

  if (!String(profile.status || "").trim()) {
    errors.status = "Status is required.";
  }

  return errors;
}

function NurseEditPanel({
  profile,
  onClose,
  onSave,
}: {
  profile: NurseProfile;
  onClose: () => void;
  onSave: (p: NurseProfile) => void;
}) {
  const [form, setForm] = useState({ ...profile });
  const [errors, setErrors] = useState<ValidationErrors>({});

  const update = (field: keyof NurseProfile, value: string) => {
    const nextForm = { ...form, [field]: value };
    setForm(nextForm);

    const validationErrors = validateNurseEditProfile(nextForm);
    setErrors((prev) => ({
      ...prev,
      [field]: validationErrors[field as keyof ValidationErrors],
    }));
  };

  const hasErrors = Object.values(errors).some(Boolean);

  const handleSave = async () => {
    const nextForm = {
      ...form,
      age: Number(form.age) || 0,
      assignedElders: Number(form.assignedElders) || 0,
      nurseStatus: form.status,
    };

    const validationErrors = validateNurseEditProfile(nextForm);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const saveErrors = await onSave(nextForm);
    if (saveErrors && Object.keys(saveErrors).length > 0) {
      setErrors(saveErrors);
      return;
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
            <h2 style={{ color: "#1a2b42", fontWeight: 700 }}>Edit Nurse Profile</h2>
            <p className="text-xs mt-0.5" style={{ color: "#6b7a99" }}>Update {profile.name}'s details</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100">
            <X size={16} style={{ color: "#6b7a99" }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <EditSection title="Personal Information">
            <EditPhotoField value={form.avatar} onChange={(v) => update("avatar", v)} />
            <EditRow2>
              <EditField label="Full Name" value={form.name} error={errors.name} onChange={(v) => update("name", v)} />
              <EditField label="Age" value={String(form.age)} error={errors.age} onChange={(v) => update("age" as any, v)} />
            </EditRow2>
            <EditRow2>
              <EditSelect label="Gender" value={form.gender} options={["Male", "Female", "Other"]} error={errors.gender} onChange={(v) => update("gender", v)} />
              <EditSelect label="Status" value={form.status} options={["Active", "On Leave"]} error={errors.status} onChange={(v) => update("status" as any, v)} />
            </EditRow2>
          </EditSection>

          <EditSection title="Contact Information">
            <EditField label="Phone" value={form.phone} placeholder="09-123456789" error={errors.phone} onChange={(v) => update("phone", v)} />
            <EditField label="Email" value={form.email} error={errors.email} onChange={(v) => update("email", v)} />
            <EditField label="Address" value={form.address} error={errors.address} onChange={(v) => update("address", v)} />
          </EditSection>

          <EditSection title="Professional Information">
            <EditRow2>
              <EditSelect label="Position" value={form.position} options={["Assistant Nurse", "Junior Nurse", "Senior Nurse", "Head Nurse"]} error={errors.position} onChange={(v) => update("position", v)} />
              <EditField label="Hire Date" value={form.hireDate} error={errors.hireDate} onChange={(v) => update("hireDate", v)} />
            </EditRow2>
          </EditSection>
        </div>

        <div
          className="relative z-[9999] flex gap-2 p-4 border-t flex-shrink-0"
          style={{ borderColor: "rgba(0,0,0,0.07)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="relative z-[9999] flex-1 py-2 rounded-lg border text-sm hover:bg-gray-50"
            style={{ borderColor: "rgba(0,0,0,0.12)", color: "#6b7a99" }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="relative z-[9999] flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm text-white hover:opacity-90"
            style={{ backgroundColor: "#2563eb" }}
          >
            <Save size={14} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ────────────────── Shared helpers ──────────────────

function ModalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="text-xs pb-1 mb-2 border-b" style={{ color: "#2563eb", fontWeight: 700, borderColor: "rgba(0,0,0,0.07)" }}>
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}

function ModalRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between py-1.5 border-b" style={{ borderColor: "rgba(0,0,0,0.05)" }}>
      <span className="text-xs" style={{ color: "#6b7a99" }}>{label}</span>
      <span className="text-xs ml-4 text-right" style={{ color: highlight ? "#ef4444" : "#1a2b42", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex h-8 items-center gap-1.5 rounded-lg border bg-white px-2.5 text-xs" style={{ borderColor: "rgba(0,0,0,0.1)", color: "#6b7a99" }}>
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="bg-transparent text-xs outline-none"
        style={{ color: "#1a2b42" }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function AgeFilterInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex h-8 items-center gap-1.5 rounded-lg border bg-white px-2.5 text-xs" style={{ borderColor: "rgba(0,0,0,0.1)", color: "#6b7a99" }}>
      <span>{label}</span>
      <input
        type="number"
        min={50}
        max={120}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-14 bg-transparent text-xs outline-none"
        style={{ color: "#1a2b42" }}
      />
    </label>
  );
}

function ActionBtn({
  children,
  color,
  onClick,
}: {
  children: React.ReactNode;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-6 h-6 rounded flex items-center justify-center transition-opacity hover:opacity-70"
      style={{ backgroundColor: color + "1a", color }}
    >
      {children}
    </button>
  );
}

function PageBtn({
  children,
  active,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-7 h-7 rounded flex items-center justify-center text-xs transition-colors"
      style={{
        backgroundColor: active ? "#2563eb" : "transparent",
        color: active ? "#fff" : disabled ? "#cbd5e1" : "#6b7a99",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

function EditSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs mb-3 pb-1 border-b" style={{ color: "#1a2b42", fontWeight: 700, borderColor: "rgba(0,0,0,0.07)" }}>{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function EditRow2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function EditField({
  label,
  value,
  onChange,
  error,
  type = "text",
  min,
  max,
  placeholder,
  blockTyping = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  min?: string;
  max?: string;
  placeholder?: string;
  blockTyping?: boolean;
}) {
  return (
    <div>
      <label className="text-xs block mb-1" style={{ color: "#6b7a99" }}>{label}</label>
      <input
        type={type}
        value={value}
        min={min}
        max={max}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-1.5 rounded-lg border text-xs outline-none"
        style={{ borderColor: error ? "#ef4444" : "rgba(0,0,0,0.12)", backgroundColor: "#f8fafc", color: "#1a2b42" }}
        onKeyDown={(e) => {
          if (blockTyping && e.key !== "Tab") e.preventDefault();
        }}
        onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
        onBlur={(e) => (e.target.style.borderColor = error ? "#ef4444" : "rgba(0,0,0,0.12)")}
      />
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
  const preview = value.trim();
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
      <label className="text-xs block" style={{ color: "#6b7a99" }}>Profile Photo</label>
      <div className="relative">
        {preview ? (
          <img
            src={preview}
            alt=""
            className="h-24 w-24 rounded-full border-4 object-cover shadow-sm"
            style={{ borderColor: "#fff", boxShadow: "0 8px 24px rgba(15,23,42,0.12)" }}
            onError={() => onChange("")}
          />
        ) : (
          <div
            className="flex h-24 w-24 items-center justify-center rounded-full border-4 bg-blue-50 text-blue-600 shadow-sm"
            style={{ borderColor: "#fff", boxShadow: "0 8px 24px rgba(15,23,42,0.12)" }}
          >
            <User size={32} />
          </div>
        )}
        <label
          className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 bg-white shadow-md transition-colors hover:bg-blue-50"
          style={{ borderColor: "#fff", color: "#2563eb" }}
        >
          <ImagePlus size={16} />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleUpload(e.target.files?.[0])}
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

function EditSelect({
  label,
  value,
  options,
  onChange,
  error,
}: {
  label: string;
  value: string;
  options: Array<string | { label: string; value: string }>;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <div>
      <label className="text-xs block mb-1" style={{ color: "#6b7a99" }}>{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border px-3 py-2 pr-9 text-xs outline-none transition-colors focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          style={{ borderColor: error ? "#ef4444" : "rgba(0,0,0,0.12)", backgroundColor: "#f8fafc", color: "#1a2b42" }}
        >
          {options.map((option) => {
            const optionValue = typeof option === "string" ? option : option.value;
            const optionLabel = typeof option === "string" ? option : option.label;

            return <option key={optionValue} value={optionValue}>{optionLabel}</option>;
          })}
        </select>
        <ChevronDown
          size={15}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
          style={{ color: error ? "#ef4444" : "#6b7a99" }}
        />
      </div>
      {error && <p className="mt-1 text-xs" style={{ color: "#ef4444" }}>{error}</p>}
    </div>
  );
}
