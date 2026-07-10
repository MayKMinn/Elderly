import { spawn } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cobolSource = path.join(__dirname, "cobol", "calculate-report.cob");
const cobolBinary = path.join(__dirname, "cobol", process.platform === "win32" ? "calculate-report.exe" : "calculate-report");
const openCobolIdeRoot = "C:\\Program Files (x86)\\OpenCobolIDE\\GnuCOBOL";
const openCobolIdeCompiler = "C:\\Program Files (x86)\\OpenCobolIDE\\GnuCOBOL\\bin\\cobc.exe";

const fieldOrder = [
  "bpSystolicSum",
  "bpDiastolicSum",
  "bpCount",
  "glucoseSum",
  "glucoseCount",
  "medicationTotal",
  "medicationTaken",
  "medicationMissed",
  "medicationPending",
  "medicationDueSoon",
];

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

async function ensureCobolCalculator() {
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
    if (existsSync(cobolBinary)) {
      console.warn("COBOL report calculator compile failed, using existing binary:", error.message);
      return true;
    }
    console.warn("COBOL report calculator is unavailable:", error.message);
    return false;
  }
}

function bpCondition(avgSystolic, avgDiastolic) {
  if (avgSystolic === null || avgDiastolic === null) return "No blood pressure data";
  if (avgSystolic < 90 || avgDiastolic < 60) return "Low";
  if (avgSystolic >= 140 || avgDiastolic >= 90) return "High";
  return "Stable";
}

function glucoseCondition(avgGlucose) {
  if (avgGlucose === null) return "No blood glucose data";
  if (avgGlucose < 70) return "Low";
  if (avgGlucose > 180) return "High";
  return "Stable";
}

function fallbackCalculate(values) {
  const bpCount = Number(values.bpCount || 0);
  const glucoseCount = Number(values.glucoseCount || 0);
  const medicationTotal = Number(values.medicationTotal || 0);
  const medicationTaken = Number(values.medicationTaken || 0);
  const avgSystolic = bpCount > 0 ? Math.round(Number(values.bpSystolicSum || 0) / bpCount) : null;
  const avgDiastolic = bpCount > 0 ? Math.round(Number(values.bpDiastolicSum || 0) / bpCount) : null;
  const avgGlucose = glucoseCount > 0 ? Math.round(Number(values.glucoseSum || 0) / glucoseCount) : null;

  return {
    averageSystolic: avgSystolic,
    averageDiastolic: avgDiastolic,
    bloodPressureStatus: bpCondition(avgSystolic, avgDiastolic),
    averageGlucose: avgGlucose,
    bloodGlucoseStatus: glucoseCondition(avgGlucose),
    medicationTotal,
    medicationTaken,
    medicationMissed: Number(values.medicationMissed || 0),
    medicationPending: Number(values.medicationPending || 0),
    medicationDueSoon: Number(values.medicationDueSoon || 0),
    compliancePercent: medicationTotal > 0 ? Math.round((medicationTaken / medicationTotal) * 100) : null,
  };
}

export async function calculateReportWithCobol(values) {
  const input = fieldOrder.map((field) => String(values[field] ?? "0")).join("\n");

  if (!(await ensureCobolCalculator())) {
    return fallbackCalculate(values);
  }

  try {
    const output = await runProcess(cobolBinary, [], `${input}\n`);
    return JSON.parse(output.replace(/:(0+)(\d+)/g, ":$2"));
  } catch (error) {
    console.warn("COBOL report calculation failed, using JavaScript fallback:", error.message);
    return fallbackCalculate(values);
  }
}
