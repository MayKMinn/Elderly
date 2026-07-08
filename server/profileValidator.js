import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cobolSource = path.join(__dirname, "cobol", "nurseValidate.cob");
const cobolBinary = path.join(__dirname, "cobol", process.platform === "win32" ? "nurseValidate.exe" : "nurseValidate");
const openCobolIdeRoot = "C:\\Program Files (x86)\\OpenCobolIDE\\GnuCOBOL";
const openCobolIdeCompiler = "C:\\Program Files (x86)\\OpenCobolIDE\\GnuCOBOL\\bin\\cobc.exe";

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
  "avatar",
];

let compileAttempted = false;

function getAgeFromBirthdate(value) {
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

function validateElderlyBirthdate(value) {
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

function validateElderlyAgeBirthdateMatch(profile, age) {
  if (profile.type !== "elderly" || !String(profile.birthdate || "").trim()) return undefined;

  const birthdateAge = getAgeFromBirthdate(profile.birthdate);
  if (!Number.isInteger(age) || birthdateAge === undefined) return undefined;
  if (age !== birthdateAge) return `Age must match birthdate. Expected age is ${birthdateAge}.`;

  return undefined;
}

function getCobolEnv(command) {
  if (command !== openCobolIdeCompiler && !existsSync(openCobolIdeCompiler)) return process.env;

  return {
    ...process.env,
    COB_CONFIG_DIR: path.join(openCobolIdeRoot, "config"),
    PATH: `${path.join(openCobolIdeRoot, "bin")};${process.env.PATH || ""}`,
  };
}

function validateHireDate(value) {
  if (!String(value || "").trim()) return "Hire date is required.";

  const hireDate = new Date(`${value}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (Number.isNaN(hireDate.getTime())) return "Enter a valid hire date.";
  if (hireDate > today) return "Hire date cannot be in the future.";

  return undefined;
}

function runProcess(command, args, input = "") {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"], env: getCobolEnv(command) });
    let stdout = "";
    let stderr = "";
    let settled = false;

    const fail = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", fail);

    child.stdin.on("error", (error) => {
      if (error.code === "EPIPE") return;
      fail(error);
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;

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
    const compiler = process.env.COBOL_COMPILER || (existsSync(openCobolIdeCompiler) ? openCobolIdeCompiler : "cobc");
    await runProcess(compiler, ["-x", "-free", "-o", cobolBinary, cobolSource]);
    return existsSync(cobolBinary);
  } catch (error) {
    console.warn("COBOL validator is unavailable:", error.message);
    return false;
  }
}

function fallbackValidate(profile) {
  const errors = {};
  const name = String(profile.name || "");
  const emailPattern = /^[A-Za-z][A-Za-z0-9._%+-]*@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  const age = Number(profile.age);

  if (!name.trim()) errors.name = "Full name is required.";
  else if (profile.type === "elderly" && name.startsWith(" ")) errors.name = "Full name cannot start with a space.";
  else if (!/[A-Za-z]/.test(name)) errors.name = "Full name must contain at least one letter.";

  if (profile.age === "" || profile.age === undefined) errors.age = "Age is required.";
  else if (!Number.isInteger(age)) errors.age = "Age must be a number.";
  else if (profile.type === "nurse" && (age < 18 || age > 80)) {
    errors.age = "Caregiver age must be between 18 and 80.";
  } else if (profile.type !== "nurse" && (age < 50 || age > 120)) {
    errors.age = "Elderly age must be between 50 and 120.";
  } else {
    const ageBirthdateError = validateElderlyAgeBirthdateMatch(profile, age);
    if (ageBirthdateError) errors.age = ageBirthdateError;
  }

  if (!String(profile.gender || "").trim()) errors.gender = "Gender is required.";
  const phone = String(profile.phone || "").trim();
  if (!phone) {
    errors.phone = "Phone is required.";
  } else if (!/^09-\d{9}$/.test(phone)) {
    errors.phone = "Phone must use format 09-#########.";
  }

  const email = String(profile.email || "").trim();
  if (profile.type === "nurse") {
    if (!email) errors.email = "Email is required.";
    else if (email.length > 160) errors.email = "Email must be 160 characters or fewer.";
    else if (!emailPattern.test(email)) errors.email = "Email must include @ and a valid domain.";
  } else if (email && email.length > 160) {
    errors.email = "Email must be 160 characters or fewer.";
  } else if (email && !emailPattern.test(email)) {
    errors.email = "Email must include @ and a valid domain.";
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
    } else if (!/^09-\d{9}$/.test(emergencyPhone)) {
      errors.emergencyPhone = "Emergency phone must use format 09-#########.";
    }
    if (!String(profile.emergencyAddress || "").trim()) {
      errors.emergencyAddress = "Emergency address is required.";
    } else if (String(profile.emergencyAddress || "").trim().length > 500) {
      errors.emergencyAddress = "Emergency address must be 500 characters or fewer.";
    }
  } else {
    if (!String(profile.position || "").trim()) errors.position = "Position is required.";
    if (!String(profile.workArea || "").trim()) errors.workArea = "Work area is required.";
    const hireDateError = validateHireDate(profile.hireDate);
    if (hireDateError) errors.hireDate = hireDateError;
    if (!String(profile.nurseStatus || "").trim()) errors.nurseStatus = "Nurse status is required.";
    const address = String(profile.address || "").trim();
    if (!address) errors.address = "Address is required.";
    else if (address.length > 500) errors.address = "Address must be 500 characters or fewer.";
    const licenseNumber = String(profile.licenseNumber || "").trim();
    if (!licenseNumber) errors.licenseNumber = "License number is required.";
    else if (!/^\d+$/.test(licenseNumber)) errors.licenseNumber = "License number must contain numbers only.";
    const username = String(profile.username || "").trim();
    if (!username) errors.username = "Username is required.";
    else if (!/^[A-Za-z]+$/.test(username)) errors.username = "Username must contain letters only.";
    else if (username.length < 4) errors.username = "Username must be at least 4 characters.";
    const password = String(profile.password || "").trim();
    if (!password) errors.password = "Password is required.";
    else if (password.length < 8) errors.password = "Password must be at least 8 characters.";
    if (password && profile.confirmPassword && password !== String(profile.confirmPassword)) {
      errors.confirmPassword = "Passwords must match.";
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

function applyEmergencyAddressValidation(profile, validation) {
  if (profile.type !== "elderly") return validation;

  const errors = { ...(validation.errors || {}) };
  const emergencyAddress = String(profile.emergencyAddress || "").trim();

  if (!emergencyAddress) {
    errors.emergencyAddress = "Emergency address is required.";
  } else if (emergencyAddress.length > 500) {
    errors.emergencyAddress = "Emergency address must be 500 characters or fewer.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export async function validateProfileWithCobol(profile) {
  if (profile.type === "nurse") {
    return fallbackValidate(profile);
  }

  const input = fieldOrder.map((field) => String(profile[field] ?? "")).join("\n");

  if (!(await ensureCobolValidator())) {
    return applyEmergencyAddressValidation(profile, fallbackValidate(profile));
  }

  try {
    const output = await runProcess(cobolBinary, [], `${input}\n`);
    return applyEmergencyAddressValidation(profile, JSON.parse(output));
  } catch (error) {
    console.warn("COBOL validation failed, using JavaScript fallback:", error.message);
    return applyEmergencyAddressValidation(profile, fallbackValidate(profile));
  }
}
