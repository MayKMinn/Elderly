export type ElderlyProfile = {
  id: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  medicalCondition: string;
  emergencyContact: string;
  emergencyAddress: string;
  status: "Active" | "Inactive";
  avatar: string;
  dob: string;
  address: string;
  bloodType: string;
  allergies: string;
  doctorName: string;
  relationship: string;
  emergencyPhone: string;
  admissionDate: string;
  notes: string;
};

export type NurseProfile = {
  id: string;
  nurseId?: string | number;
  name: string;
  age: number;
  gender: string;
  phone: string;
  email: string;
  address: string;
  position: string;
  hireDate: string;
  status: "Active" | "On Leave";
  avatar: string;
  assignedElders: number;
  workArea: string;
  nurseStatus: string;
};

export const elderlyData: ElderlyProfile[] = [];
export const nurseData: NurseProfile[] = [];
