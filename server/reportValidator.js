import { spawn } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cobolSource = path.join(__dirname, "cobol", "validate-report.cob");
const cobolBinary = path.join(__dirname, "cobol", process.platform === "win32" ? "validate-report.exe" : "validate-report");
const openCobolIdeRoot = "C:\\Program Files (x86)\\OpenCobolIDE\\GnuCOBOL";
const openCobolIdeCompiler = "C:\\Program Files (x86)\\OpenCobolIDE\\GnuCOBOL\\bin\\cobc.exe";

const fieldOrder = ["elderlyId", "startDate", "endDate"];
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
  if (existsSync(cobolBinary)) {
    try {
      if (statSync(cobolBinary).mtimeMs >= statSync(cobolSource).mtimeMs) return true;
    } catch {
      return true;
    }
  }
  if (compileAttempted) return false;

  compileAttempted = true;

  try {
    const compiler = process.env.COBOL_COMPILER || (existsSync(openCobolIdeCompiler) ? openCobolIdeCompiler : "cobc");
    await runProcess(compiler, ["-x", "-free", "-o", cobolBinary, cobolSource]);
    return existsSync(cobolBinary);
  } catch (error) {
    console.warn("COBOL report validator is unavailable:", error.message);
    return false;
  }
}

function isValidDate(value) {
  const text = String(value || "").trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function fallbackValidate(report) {
  const errors = {};
  const elderlyId = String(report.elderlyId || "").trim();
  const startDate = String(report.startDate || "").trim();
  const endDate = String(report.endDate || "").trim();

  if (!/^\d+$/.test(elderlyId)) errors.elderlyId = "Select a valid elderly profile.";
  if (!isValidDate(startDate)) errors.startDate = "Enter start date as YYYY-MM-DD.";
  if (!isValidDate(endDate)) errors.endDate = "Enter end date as YYYY-MM-DD.";
  if (!errors.startDate && !errors.endDate && startDate > endDate) {
    errors.endDate = "End date must be on or after start date.";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export async function validateReportWithCobol(report) {
  const input = fieldOrder.map((field) => String(report[field] ?? "")).join("\n");

  if (!(await ensureCobolValidator())) {
    return fallbackValidate(report);
  }

  try {
    const output = await runProcess(cobolBinary, [], `${input}\n`);
    return JSON.parse(output);
  } catch (error) {
    console.warn("COBOL report validation failed, using JavaScript fallback:", error.message);
    return fallbackValidate(report);
  }
}
