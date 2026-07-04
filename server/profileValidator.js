import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cobolSource = path.join(__dirname, "cobol", "validate-profile.cob");
const cobolBinary = path.join(__dirname, "cobol", "validate-profile");

const fieldOrder = [
  "type",
  "name",
  "age",
  "gender",
  "phone",
  "email",
  "address",
  "medicalCondition",
  "bloodType",
  "allergies",
  "admissionDate",
  "username",
  "password",
  "confirmPassword",
  "position",
  "workArea",
  "hireDate",
  "nurseStatus",
  "birthdate",
  "emergencyName",
  "emergencyPhone",
  "elderlyStatus",
  "enrollDate",
];

let compileAttempted = false;

function validateElderlyBirthdate(value) {
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

function runProcess(command, args, input = "") {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }
      reject(new Error(stderr || `${command} exited with code ${code}`));
    });

    child.stdin.end(input);
  });
}

async function ensureCobolValidator() {
  if (existsSync(cobolBinary)) return true;
  if (compileAttempted) return false;

  compileAttempted = true;

  try {
    await runProcess("cobc", ["-x", "-free", "-o", cobolBinary, cobolSource]);
    return existsSync(cobolBinary);
  } catch (error) {
    console.warn("COBOL validator is unavailable:", error.message);
    return false;
  }
}

function fallbackValidate(profile) {
  const errors = {};
  const name = String(profile.name || "");
  const age = Number(profile.age);

  if (!name.trim()) errors.name = "Full name is required.";
  else if (name.trim().length > 10) errors.name = "Full name must be 10 characters or fewer.";
  else if (name.startsWith(" ")) errors.name = "Full name cannot start with a space.";
  else if (!/[A-Za-z]/.test(name)) errors.name = "Full name must contain at least one letter.";

  if (profile.age === "" || profile.age === undefined) errors.age = "Age is required.";
  else if (!Number.isInteger(age)) errors.age = "Age must be a number.";
  else if (profile.type === "nurse" && (age < 18 || age > 80)) {
    errors.age = "Caregiver age must be between 18 and 80.";
  } else if (profile.type !== "nurse" && (age < 50 || age > 120)) {
    errors.age = "Elderly age must be between 50 and 120.";
  }

  if (!String(profile.gender || "").trim()) errors.gender = "Gender is required.";
  const phone = String(profile.phone || "").trim();
  if (!phone) {
    errors.phone = "Phone is required.";
  } else if (!/^09-\d{10}$/.test(phone)) {
    errors.phone = "Phone must use format 09-##########.";
  }

  const email = String(profile.email || "").trim();
  if (email && email.length > 160) {
    errors.email = "Email must be 160 characters or fewer.";
  } else if (email && !/^[A-Za-z][A-Za-z0-9]*@[A-Za-z]+\.[A-Za-z]{2,}$/.test(email)) {
    errors.email = "Email must be like name@gmail.com with one @ and one dot.";
  }

  if (profile.type === "elderly") {
    if (!String(profile.address || "").trim()) errors.address = "Address is required.";
    if (String(profile.address || "").trim().length > 500) {
      errors.address = "Address must be 500 characters or fewer.";
    }
    const birthdateError = validateElderlyBirthdate(profile.birthdate);
    if (birthdateError) errors.birthdate = birthdateError;
    if (!String(profile.medicalCondition || "").trim()) {
      errors.medicalCondition = "Medical conditions are required.";
    } else if (String(profile.medicalCondition || "").trim().length > 500) {
      errors.medicalCondition = "Medical conditions must be 500 characters or fewer.";
    }
    if (!String(profile.allergies || "").trim()) {
      errors.allergies = "Allergies are required.";
    } else if (String(profile.allergies || "").trim().length > 300) {
      errors.allergies = "Allergies must be 300 characters or fewer.";
    }
    if (!String(profile.bloodType || "").trim()) {
      errors.bloodType = "Blood type is required.";
    } else if (String(profile.bloodType || "").trim().length > 10) {
      errors.bloodType = "Blood type must be 10 characters or fewer.";
    } else if (!/^(A|B|AB|O)[+-]$/i.test(String(profile.bloodType || "").trim())) {
      errors.bloodType = "Blood type must be A+, A-, B+, B-, AB+, AB-, O+, or O-.";
    }
    if (!String(profile.emergencyName || "").trim()) {
      errors.emergencyName = "Emergency contact name is required.";
    } else if (String(profile.emergencyName || "").trim().length > 100) {
      errors.emergencyName = "Emergency contact name must be 100 characters or fewer.";
    } else if (!/[A-Za-z]/.test(String(profile.emergencyName || ""))) {
      errors.emergencyName = "Emergency contact name must contain at least one letter.";
    }
    const emergencyPhone = String(profile.emergencyPhone || "").trim();
    if (!emergencyPhone) {
      errors.emergencyPhone = "Emergency phone is required.";
    } else if (!/^09-\d{10}$/.test(emergencyPhone)) {
      errors.emergencyPhone = "Emergency phone must use format 09-##########.";
    }
  } else {
    if (!String(profile.position || "").trim()) errors.position = "Position is required.";
    if (!String(profile.workArea || "").trim()) errors.workArea = "Work area is required.";
    if (!String(profile.hireDate || "").trim()) errors.hireDate = "Hire date is required.";
    if (!String(profile.nurseStatus || "").trim()) errors.nurseStatus = "Nurse status is required.";
  }

  if (profile.username && String(profile.username).trim().length < 4) {
    errors.username = "Username must be at least 4 characters.";
  }
  if (profile.password && String(profile.password).trim().length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }
  if (profile.password !== profile.confirmPassword) {
    errors.confirmPassword = "Passwords must match.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export async function validateProfileWithCobol(profile) {
  const input = fieldOrder.map((field) => String(profile[field] ?? "")).join("\n");

  if (!(await ensureCobolValidator())) {
    return fallbackValidate(profile);
  }

  try {
    const output = await runProcess(cobolBinary, [], `${input}\n`);
    return JSON.parse(output);
  } catch (error) {
    console.warn("COBOL validation failed, using JavaScript fallback:", error.message);
    return fallbackValidate(profile);
  }
}
