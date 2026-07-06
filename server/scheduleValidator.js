import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cobolSource = path.join(__dirname, "cobol", "validate-schedule.cob");
const cobolBinary = path.join(__dirname, "cobol", process.platform === "win32" ? "validate-schedule.exe" : "validate-schedule");
const openCobolIdeRoot = "C:\\Program Files (x86)\\OpenCobolIDE\\GnuCOBOL";
const openCobolIdeCompiler = "C:\\Program Files (x86)\\OpenCobolIDE\\GnuCOBOL\\bin\\cobc.exe";

const fieldOrder = ["nurseId", "elderlyId", "visitDate", "visitTime", "purpose", "scheduleStatus", "allowPastDateTime"];
const allowedPurposes = ["Vitals Check", "Medication Check", "Emergency Follow-up", "Routine Visit"];
const allowedStatuses = ["scheduled", "completed", "missed", "cancelled"];

let compileAttempted = false;

function getCobolEnv(command) {
  if (command !== openCobolIdeCompiler && !existsSync(openCobolIdeCompiler)) return process.env;

  return {
    ...process.env,
    COB_CONFIG_DIR: path.join(openCobolIdeRoot, "config"),
    PATH: `${path.join(openCobolIdeRoot, "bin")};${process.env.PATH || ""}`,
  };
}

function runProcess(command, args, input = "") {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"], env: getCobolEnv(command) });
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
    const compiler = process.env.COBOL_COMPILER || (existsSync(openCobolIdeCompiler) ? openCobolIdeCompiler : "cobc");
    await runProcess(compiler, ["-x", "-free", "-o", cobolBinary, cobolSource]);
    return existsSync(cobolBinary);
  } catch (error) {
    console.warn("COBOL schedule validator is unavailable:", error.message);
    return false;
  }
}

function isIntegerId(value) {
  return /^\d+$/.test(String(value || "").trim());
}

function isValidDate(value) {
  const text = String(value || "").trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return false;

  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function isValidTime(value) {
  const text = String(value || "").trim();
  const match = /^(\d{2}):(\d{2})$/.exec(text);
  if (!match) return false;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function isPastScheduleDateTime(visitDate, visitTime) {
  if (!isValidDate(visitDate) || !isValidTime(visitTime)) return false;

  const dateTime = new Date(`${visitDate}T${visitTime}`);
  if (Number.isNaN(dateTime.getTime())) return false;

  return dateTime.getTime() < Date.now();
}

function fallbackValidate(schedule) {
  const errors = {};
  const status = String(schedule.scheduleStatus || "scheduled").trim().toLowerCase();

  if (!isIntegerId(schedule.nurseId)) errors.nurseId = "Select a valid nurse.";
  if (!isIntegerId(schedule.elderlyId)) errors.elderlyId = "Select a valid elderly profile.";
  if (!isValidDate(schedule.visitDate)) errors.visitDate = "Enter visit date as YYYY-MM-DD.";
  if (!isValidTime(schedule.visitTime)) errors.visitTime = "Enter visit time as HH:mm.";
  if (
    String(schedule.allowPastDateTime || "").trim().toUpperCase() !== "Y" &&
    !errors.visitDate &&
    !errors.visitTime &&
    isPastScheduleDateTime(schedule.visitDate, schedule.visitTime)
  ) {
    errors.visitDate = "Visit date and time cannot be in the past.";
  }
  if (!allowedPurposes.includes(String(schedule.purpose || "").trim())) {
    errors.purpose = "Select a valid purpose.";
  }
  if (!allowedStatuses.includes(status)) {
    errors.scheduleStatus = "Select a valid schedule status.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export async function validateScheduleWithCobol(schedule) {
  const input = fieldOrder.map((field) => String(schedule[field] ?? "")).join("\n");

  if (!(await ensureCobolValidator())) {
    return fallbackValidate(schedule);
  }

  try {
    const output = await runProcess(cobolBinary, [], `${input}\n`);
    return JSON.parse(output);
  } catch (error) {
    console.warn("COBOL schedule validation failed, using JavaScript fallback:", error.message);
    return fallbackValidate(schedule);
  }
}
