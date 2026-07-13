import express from "express";
import { checkDatabase, pool, transaction } from "./db.js";
import { validateProfileWithCobol } from "./profileValidator.js";
import { calculateReportWithCobol } from "./reportCalculator.js";
import { validateReportWithCobol } from "./reportValidator.js";
import { validateScheduleWithCobol } from "./scheduleValidator.js";

const app = express();
const port = Number(process.env.SERVER_PORT || 3001);
const elderlyTable = process.env.ELDERLY_TABLE || "elderly";

app.use(express.json({ limit: "5mb" }));

function getForcedNow() {
  const forced = String(process.env.FORCE_SYSTEM_DATE || "").trim();
  if (!forced) return new Date();
  // Use current time but replace the date portion with the forced date
  const now = new Date();
  const timePart = now.toTimeString().split(' ')[0]; // HH:MM:SS
  const dt = new Date(`${forced}T${timePart}`);
  if (Number.isNaN(dt.getTime())) return new Date();
  return dt;
}

function formatDateTimeForSql(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

function formatDateForSql(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatTimeForSql(d) {
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mi}`;
}

async function ensureElderlyAvatarColumn() {
  try {
    await pool.query(`ALTER TABLE ${elderlyTable} ADD COLUMN avatar MEDIUMTEXT NULL`);
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") throw error;
  }

  await pool.query(`ALTER TABLE ${elderlyTable} MODIFY COLUMN avatar MEDIUMTEXT NULL`);

  try {
    await pool.query(`ALTER TABLE ${elderlyTable} ADD COLUMN emergency_address VARCHAR(500) NULL`);
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") throw error;
  }

  try {
    await pool.query(`ALTER TABLE ${elderlyTable} ADD COLUMN room_id INT NULL`);
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") throw error;
  }

  try {
    await pool.query(`ALTER TABLE ${elderlyTable} ADD UNIQUE KEY unique_elderly_room (room_id)`);
  } catch (error) {
    if (error.code !== "ER_DUP_KEYNAME") throw error;
  }
}

async function ensureRoomsTable() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS rooms (
      room_id INT AUTO_INCREMENT PRIMARY KEY,
      floor_number INT NOT NULL,
      room_number INT NOT NULL,
      room_label VARCHAR(20) GENERATED ALWAYS AS (CONCAT('F', floor_number, '-R', LPAD(room_number, 2, '0'))) STORED,
      UNIQUE KEY unique_floor_room (floor_number, room_number),
      CONSTRAINT chk_floor_number CHECK (floor_number BETWEEN 1 AND 4),
      CONSTRAINT chk_room_number CHECK (room_number BETWEEN 1 AND 15)
    )`
  );

  await pool.query(
    `INSERT IGNORE INTO rooms (floor_number, room_number)
     SELECT floors.floor_number, rooms.room_number
     FROM (
       SELECT 1 AS floor_number UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
     ) floors
     CROSS JOIN (
       SELECT 1 AS room_number UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
       UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10
       UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15
     ) rooms`
  );
}

async function ensureMedicationLogsTable() {
  const [tables] = await pool.query(
    `SELECT table_name AS tableName
     FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_name IN ('medication_assignments', 'medication_logs')`
  );
  const tableNames = new Set(tables.map((row) => row.tableName));

  if (tableNames.has("medication_assignments") && !tableNames.has("medication_logs")) {
    await pool.query("RENAME TABLE medication_assignments TO medication_logs");
  }

  await pool.query(
    `CREATE TABLE IF NOT EXISTS medication_logs (
      log_id INT AUTO_INCREMENT PRIMARY KEY,
      schedule_id INT NULL,
      medication_id INT NULL,
      nurse_id VARCHAR(40) NULL,
      elderly_id VARCHAR(40) NOT NULL,
      medication_name VARCHAR(160) NOT NULL,
      dosage VARCHAR(80) NOT NULL,
      instructions VARCHAR(500) NOT NULL,
      scheduled_time VARCHAR(20) NOT NULL,
      scheduled_date DATE NOT NULL,
      compliance_status ENUM('Pending', 'Taken', 'Missed', 'Due Soon') NOT NULL DEFAULT 'Pending',
      report_notes TEXT,
      reported_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_medication_logs_elderly_id (elderly_id),
      INDEX idx_medication_logs_medication_id (medication_id),
      INDEX idx_medication_logs_nurse_id (nurse_id),
      INDEX idx_medication_logs_schedule_id (schedule_id),
      INDEX idx_medication_logs_scheduled_date (scheduled_date)
    )`
  );

  try {
    await pool.query("ALTER TABLE medication_logs ADD COLUMN schedule_id INT NULL");
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") throw error;
  }

  try {
    await pool.query("ALTER TABLE medication_logs CHANGE COLUMN assignment_id log_id INT AUTO_INCREMENT");
  } catch (error) {
    if (error.code !== "ER_BAD_FIELD_ERROR" && error.code !== "ER_DUP_FIELDNAME") throw error;
  }

  try {
    await pool.query("ALTER TABLE medication_logs ADD COLUMN nurse_id VARCHAR(40) NULL");
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") throw error;
  }

  try {
    await pool.query("ALTER TABLE medication_logs ADD COLUMN medication_id INT NULL");
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") throw error;
  }

  try {
    await pool.query("ALTER TABLE medication_logs ADD INDEX idx_medication_logs_medication_id (medication_id)");
  } catch (error) {
    if (error.code !== "ER_DUP_KEYNAME") throw error;
  }

  try {
    await pool.query("ALTER TABLE medication_logs ADD COLUMN report_notes TEXT NULL");
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") throw error;
  }

  try {
    await pool.query("ALTER TABLE medication_logs ADD COLUMN reported_at TIMESTAMP NULL");
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") throw error;
  }
}

async function ensureElderlyMedicationsTable() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS elderly_medications (
      medication_id INT AUTO_INCREMENT PRIMARY KEY,
      elderly_id VARCHAR(40) NOT NULL,
      elderly_name VARCHAR(120) NOT NULL,
      medication_name VARCHAR(160) NOT NULL,
      dosage VARCHAR(80) NOT NULL,
      instructions VARCHAR(500) NOT NULL,
      notes TEXT,
      medication_status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_elderly_medications_elderly_id (elderly_id),
      INDEX idx_elderly_medications_status (medication_status)
    )`
  );
}

async function ensureBloodPressureAndGlucoseTables() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS elderly_blood_pressure (
      pressure_id INT AUTO_INCREMENT PRIMARY KEY,
      schedule_id INT NULL,
      nurse_id VARCHAR(40) NULL,
      elderly_id VARCHAR(40) NOT NULL,
      recorded_date DATE NOT NULL,
      recorded_time TIME NOT NULL,
      systolic INT NULL,
      diastolic INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_elderly_blood_pressure_elderly_id (elderly_id),
      INDEX idx_elderly_blood_pressure_recorded_date (recorded_date),
      INDEX idx_elderly_blood_pressure_schedule_id (schedule_id)
    )`
  );

  try {
    await pool.query("ALTER TABLE elderly_blood_pressure MODIFY COLUMN recorded_time TIME NOT NULL");
  } catch (error) {
    // ignore if modification not applicable
  }

  await pool.query(
    `CREATE TABLE IF NOT EXISTS elderly_blood_glucose (
      glucose_id INT AUTO_INCREMENT PRIMARY KEY,
      schedule_id INT NULL,
      nurse_id VARCHAR(40) NULL,
      elderly_id VARCHAR(40) NOT NULL,
      recorded_date DATE NOT NULL,
      recorded_time TIME NOT NULL,
      glucose_value INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_elderly_blood_glucose_elderly_id (elderly_id),
      INDEX idx_elderly_blood_glucose_recorded_date (recorded_date),
      INDEX idx_elderly_blood_glucose_schedule_id (schedule_id)
    )`
  );

  try {
    await pool.query("ALTER TABLE elderly_blood_glucose MODIFY COLUMN recorded_time TIME NOT NULL");
  } catch (error) {
    // ignore if modification not applicable
  }

  try {
    await pool.query("ALTER TABLE elderly_blood_pressure ADD COLUMN schedule_id INT NULL");
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") throw error;
  }

  try {
    await pool.query("ALTER TABLE elderly_blood_pressure ADD COLUMN nurse_id VARCHAR(40) NULL");
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") throw error;
  }

  try {
    await pool.query("ALTER TABLE elderly_blood_glucose ADD COLUMN schedule_id INT NULL");
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") throw error;
  }

  try {
    await pool.query("ALTER TABLE elderly_blood_glucose ADD COLUMN nurse_id VARCHAR(40) NULL");
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") throw error;
  }
}

async function ensureAdminProfileColumns() {
  try {
    await pool.query("ALTER TABLE admin ADD COLUMN avatar MEDIUMTEXT NULL");
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") throw error;
  }

  await pool.query("ALTER TABLE admin MODIFY COLUMN avatar MEDIUMTEXT NULL");
}

async function ensureNurseColumns() {
  try {
    await pool.query("ALTER TABLE nurse ADD COLUMN avatar MEDIUMTEXT NULL");
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") throw error;
  }

  try {
    await pool.query("ALTER TABLE nurse ADD COLUMN address VARCHAR(500) NULL");
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") throw error;
  }

  try {
    await pool.query("ALTER TABLE nurse ADD COLUMN license_number VARCHAR(80) NULL");
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") throw error;
  }

  try {
    await pool.query("ALTER TABLE nurse ADD COLUMN username VARCHAR(80) NULL");
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") throw error;
  }

  try {
    await pool.query("ALTER TABLE nurse ADD COLUMN password VARCHAR(120) NULL");
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") throw error;
  }

  try {
    await pool.query("ALTER TABLE nurse ADD COLUMN hire_date DATE NULL");
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") throw error;
  }

  try {
    await pool.query("ALTER TABLE nurse ADD COLUMN nurse_status VARCHAR(40) NULL");
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") throw error;
  }


  await pool.query(`
    UPDATE nurse
    SET position = CASE position
      WHEN 'Registered Nurse' THEN 'Junior Nurse'
      WHEN 'Charge Nurse' THEN 'Senior Nurse'
      WHEN 'LPN' THEN 'Assistant Nurse'
      WHEN 'Geriatric Nurse' THEN 'Assistant Nurse'
      WHEN 'Rehabilitation Nurse' THEN 'Assistant Nurse'
      WHEN 'Nurse' THEN 'Junior Nurse'
      WHEN 'Caregiver' THEN 'Assistant Nurse'
      WHEN 'Care Assistant' THEN 'Assistant Nurse'
      ELSE position
    END
  `);
}

async function ensureScheduleColumns() {
  await pool.query(
    "ALTER TABLE `schedule` MODIFY COLUMN purpose ENUM('Blood Pressure', 'Blood Glucose', 'Medication', 'Routine Visit', 'Vitals Check', 'Medication Check', 'Emergency Follow-up') NOT NULL"
  );

  try {
    await pool.query("ALTER TABLE `schedule` ADD COLUMN recurring_group_id VARCHAR(40) NULL");
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") throw error;
  }

  try {
    await pool.query("ALTER TABLE `schedule` ADD COLUMN recurring_sequence INT NULL");
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") throw error;
  }

  try {
    await pool.query("ALTER TABLE `schedule` ADD INDEX idx_schedule_recurring_group_id (recurring_group_id)");
  } catch (error) {
    if (error.code !== "ER_DUP_KEYNAME") throw error;
  }
}

async function ensureNurseElderlyAssignmentsTable() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS nurse_elderly_assignments (
      assignment_id INT AUTO_INCREMENT PRIMARY KEY,
      nurse_id INT NOT NULL,
      elderly_id INT NOT NULL,
      assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
      UNIQUE KEY unique_nurse_elderly_assignment (nurse_id, elderly_id),
      INDEX idx_assignment_nurse_id (nurse_id),
      INDEX idx_assignment_elderly_id (elderly_id)
    )`
  );

  try {
    await pool.query("ALTER TABLE nurse_elderly_assignments ADD COLUMN assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP");
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") throw error;
  }

  try {
    await pool.query("ALTER TABLE nurse_elderly_assignments ADD COLUMN status ENUM('active', 'inactive') NOT NULL DEFAULT 'active'");
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") throw error;
  }

  await pool.query(
    `DELETE older
     FROM nurse_elderly_assignments older
     INNER JOIN nurse_elderly_assignments newer
       ON older.nurse_id = newer.nurse_id
      AND older.elderly_id = newer.elderly_id
      AND older.assignment_id > newer.assignment_id`
  );

  try {
    await pool.query(
      "ALTER TABLE nurse_elderly_assignments ADD UNIQUE KEY unique_nurse_elderly_assignment (nurse_id, elderly_id)"
    );
  } catch (error) {
    if (error.code !== "ER_DUP_KEYNAME") throw error;
  }

  try {
    await pool.query("ALTER TABLE nurse_elderly_assignments ADD INDEX idx_assignment_nurse_id (nurse_id)");
  } catch (error) {
    if (error.code !== "ER_DUP_KEYNAME") throw error;
  }

  try {
    await pool.query("ALTER TABLE nurse_elderly_assignments ADD INDEX idx_assignment_elderly_id (elderly_id)");
  } catch (error) {
    if (error.code !== "ER_DUP_KEYNAME") throw error;
  }
}

async function ensureNurseCreatedAtColumn() {
  try {
    await pool.query("ALTER TABLE nurse ADD COLUMN created_at DATETIME NULL");
  } catch (error) {
    if (!/Duplicate column name/i.test(error.message)) {
      throw error;
    }
  }
}

async function ensureHealthLogScheduleColumn() {
  try {
    await pool.query("ALTER TABLE health_log ADD COLUMN schedule_id INT NULL");
  } catch (error) {
    if (error.code !== "ER_DUP_KEYNAME" && error.code !== "ER_DUP_FIELDNAME") throw error;
  }
}

const elderlyColumns = `
  ${elderlyTable}.elderly_id AS id,
  ${elderlyTable}.name,
  ${elderlyTable}.age,
  ${elderlyTable}.gender,
  ${elderlyTable}.phone,
  ${elderlyTable}.medical_conditions AS medicalCondition,
  ${elderlyTable}.emergency_name AS emergencyContact,
  COALESCE(${elderlyTable}.emergency_address, '') AS emergencyAddress,
  ${elderlyTable}.room_id AS roomId,
  rooms.floor_number AS floorNumber,
  rooms.room_number AS roomNumber,
  COALESCE(rooms.room_label, '') AS roomLabel,
  CASE elderly_status
    WHEN 'active' THEN 'Active'
    ELSE 'Inactive'
  END AS status,
  COALESCE(${elderlyTable}.avatar, '') AS avatar,
  DATE_FORMAT(${elderlyTable}.birthdate, '%Y-%m-%d') AS dob,
  ${elderlyTable}.address,
  ${elderlyTable}.blood_type AS bloodType,
  ${elderlyTable}.allergies,
  '' AS doctorName,
  '' AS relationship,
  ${elderlyTable}.emergency_phone AS emergencyPhone,
  DATE_FORMAT(${elderlyTable}.enroll_date, '%Y-%m-%d %H:%i:%s') AS admissionDate,
  '' AS notes
`;

const nurseColumns = `
  nurse_id AS id,
nurse_id AS nurseId,
name,
age,
  gender,
  phone,
  email,
  license_number AS licenseNumber,
  position,
  shift_schedule AS shiftSchedule,
  username,
  address,
  DATE_FORMAT(hire_date, '%Y-%m-%d') AS hireDate,
  CASE nurse_status
    WHEN 'active' THEN 'Active'
    WHEN 'suspended' THEN 'On Leave'
    WHEN 'resigned' THEN 'Resigned'
    ELSE 'Active'
  END AS status,
  COALESCE(avatar, '') AS avatar,
  (
    SELECT COUNT(*)
    FROM nurse_elderly_assignments nea
    INNER JOIN ${elderlyTable} assigned_elderly
      ON assigned_elderly.elderly_id = nea.elderly_id
    WHERE nea.nurse_id = nurse.nurse_id
      AND nea.status = 'active'
      AND COALESCE(assigned_elderly.elderly_status, 'active') = 'active'
  ) AS assignedElders,
  CASE nurse_status
    WHEN 'active' THEN 'Active'
    WHEN 'suspended' THEN 'On Leave'
    WHEN 'resigned' THEN 'Resigned'
    ELSE 'Active'
  END AS nurseStatus
`;

const roomColumns = `
  rooms.room_id AS roomId,
  rooms.floor_number AS floorNumber,
  rooms.room_number AS roomNumber,
  rooms.room_label AS roomLabel,
  occupied.elderly_id AS elderlyId,
  occupied.name AS elderlyName
`;

const elderlyFromClause = `${elderlyTable} LEFT JOIN rooms ON rooms.room_id = ${elderlyTable}.room_id`;
const allowedNursePositions = new Set(["Assistant Nurse", "Junior Nurse", "Senior Nurse", "Head Nurse"]);

function getNurseDbId(id) {
  const value = String(id || "").trim();

  return Number(value);
}

function getElderlyDbId(id) {
  const value = String(id || "").trim();

  return Number(value);
}

function toDbNurseStatus(status) {
  const value = String(status || "").trim().toLowerCase();

  if (value === "suspended" || value === "on leave") return "suspended";
  if (value === "resigned") return "resigned";

  return "active";
}

function isActiveElderlyStatus(status) {
  return String(status || "").trim().toLowerCase() === "active";
}

function isActiveNurseStatus(status) {
  return String(status || "").trim().toLowerCase() === "active";
}

function normalizeHireDate(value) {
  const raw = String(value || "").trim();

  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (slashMatch) {
    const month = slashMatch[1].padStart(2, "0");
    const day = slashMatch[2].padStart(2, "0");
    const year = slashMatch[3];

    return `${year}-${month}-${day}`;
  }

  return raw;
}

function getRoomDbId(value) {
  const roomId = Number(value);
  return Number.isInteger(roomId) && roomId > 0 ? roomId : null;
}

async function validateRoomAssignment(connection, roomId, elderlyId = null, { required = true } = {}) {
  if (!roomId) {
    return required ? { roomId: "Room is required." } : null;
  }

  const [roomRows] = await connection.query(
    "SELECT room_id FROM rooms WHERE room_id = :roomId LIMIT 1",
    { roomId }
  );

  if (!roomRows[0]) {
    return { roomId: "Select a valid room." };
  }

  const params = { roomId, elderlyId: elderlyId || 0 };
  const [occupiedRows] = await connection.query(
    `SELECT elderly_id
     FROM ${elderlyTable}
     WHERE room_id = :roomId
       AND elderly_id <> :elderlyId
       AND COALESCE(elderly_status, 'active') = 'active'
     LIMIT 1`,
    params
  );

  if (occupiedRows[0]) {
    return { roomId: "This room is already assigned to another elderly profile." };
  }

  return null;
}

const scheduleColumns = `
  s.schedule_id AS id,
  s.nurse_id AS nurseId,
  COALESCE(n.name, s.nurse_id) AS nurseName,
  'https://i.pravatar.cc/40' AS nurseAvatar,
  s.elderly_id AS elderlyId,
  COALESCE(e.name, s.elderly_id) AS elderlyName,
  COALESCE(e.avatar, 'https://i.pravatar.cc/40') AS elderlyAvatar,
  DATE_FORMAT(s.visit_time, '%H:%i') AS visitTime,
  COALESCE(DATE_FORMAT(s.visit_date, '%Y-%m-%d'), s.visit_date) AS visitDate,
  s.purpose,
  s.schedule_status AS scheduleStatus,
  s.recurring_group_id AS recurringGroupId,
  s.recurring_sequence AS recurringSequence
`;

app.get("/api/health", async (_req, res) => {
  try {
    await checkDatabase();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/schedules", async (req, res) => {
  const nurseId = String(req.query.nurseId || "").trim();

  try {
    const params = {};
    let where = "";

    if (nurseId) {
      params.nurseId = nurseId;
      where = "WHERE s.nurse_id = :nurseId";
    }

    const [schedules] = await pool.query(
      `SELECT ${scheduleColumns}
       FROM \`schedule\` s
       INNER JOIN nurse n ON CAST(n.nurse_id AS CHAR) = CAST(s.nurse_id AS CHAR)
       INNER JOIN ${elderlyTable} e ON CAST(e.elderly_id AS CHAR) = CAST(s.elderly_id AS CHAR)
       ${where}
       ${where ? "AND" : "WHERE"} COALESCE(n.nurse_status, 'active') = 'active'
         AND COALESCE(e.elderly_status, 'active') = 'active'
       ORDER BY s.visit_date ASC, s.visit_time ASC, s.schedule_id DESC
       LIMIT 100`,
      params
    );

    res.json({ schedules });
  } catch (error) {
    res.status(500).json({ error: "Failed to load schedules.", details: error.message });
  }
});

function normalizeScheduleDate(value) {
  return String(value || "").trim().replace(/[\/\u2010-\u2015\u2212]/g, "-");
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeScheduleDateKey(value) {
  if (value instanceof Date) {
    return toDateKey(value);
  }

  const raw = String(value || "").trim();
  if (!raw) return "";

  const datePart = raw.split(/[T ]/)[0].replace(/[\/\u2010-\u2015\u2212]/g, "-");
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return datePart;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return toDateKey(parsed);
  }

  return "";
}

function isScheduleDueForCompletion(scheduleDate, referenceDate = new Date()) {
  const normalizedTarget = normalizeScheduleDateKey(scheduleDate);
  const normalizedToday = toDateKey(referenceDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedTarget)) return false;
  return normalizedTarget <= normalizedToday;
}

function normalizeSchedulePurpose(value) {
  const text = String(value || "").trim();
  if (!text) return text;

  const normalized = text.toLowerCase().replace(/\s+/g, " ");
  const legacyPurposeMap = {
    "vitals check": "Blood Pressure",
    "blood pressure check": "Blood Pressure",
    "blood pressure": "Blood Pressure",
    "glucose check": "Blood Glucose",
    "blood sugar": "Blood Glucose",
    "blood glucose": "Blood Glucose",
    "medication check": "Medication",
    "medicine check": "Medication",
    "medication": "Medication",
    "medicine": "Medication",
    "routine visit": "Routine Visit",
    "emergency follow-up": "Routine Visit",
    "emergency follow up": "Routine Visit",
  };

  if (legacyPurposeMap[normalized]) return legacyPurposeMap[normalized];
  if (normalized.includes("blood pressure")) return "Blood Pressure";
  if (normalized.includes("blood glucose") || normalized.includes("glucose")) return "Blood Glucose";
  if (normalized.includes("medication") || normalized.includes("medicine")) return "Medication";
  if (normalized.includes("routine") || normalized.includes("visit")) return "Routine Visit";

  return text;
}

function addDaysToDateKey(dateKey, daysToAdd) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return dateKey;

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  date.setDate(date.getDate() + daysToAdd);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function validateSchedulePayload(payload, visitDate, visitTime) {
  const selectedDate = visitDate ? new Date(`${visitDate}T00:00:00`) : null;
  const allowedPurposes = ["Blood Pressure", "Blood Glucose", "Medication", "Routine Visit"];
  const errors = {};

  if (!String(payload.nurseId || "").trim()) errors.nurseId = "Select a caregiver or nurse.";
  if (!String(payload.elderlyId || "").trim()) errors.elderlyId = "Select an elderly profile.";
  if (!visitDate) {
    errors.visitDate = "Visit date is required.";
  } else if (!selectedDate || Number.isNaN(selectedDate.getTime())) {
    errors.visitDate = "Enter a valid visit date.";
  }
  if (!visitTime) errors.visitTime = "Visit time is required.";
  if (!allowedPurposes.includes(String(payload.purpose || "").trim())) {
    errors.purpose = "Select a valid purpose.";
  }

  return errors;
}

async function validateActiveScheduleParticipants({ nurseId, elderlyId }) {
  const errors = {};

  const [nurses] = await pool.query(
    "SELECT nurse_status AS status FROM nurse WHERE nurse_id = :nurseId",
    { nurseId }
  );
  const [elderly] = await pool.query(
    `SELECT elderly_status AS status FROM ${elderlyTable} WHERE elderly_id = :elderlyId`,
    { elderlyId }
  );

  if (!nurses[0]) {
    errors.nurseId = "Select an existing caregiver or nurse.";
  } else if (!isActiveNurseStatus(nurses[0].status || "active")) {
    errors.nurseId = "Select an active caregiver or nurse.";
  }

  if (!elderly[0]) {
    errors.elderlyId = "Select an existing elderly profile.";
  } else if (!isActiveElderlyStatus(elderly[0].status || "active")) {
    errors.elderlyId = "Select an active elderly profile.";
  }

  if (Object.keys(errors).length === 0) {
    if (!(await hasActiveNurseElderlyAssignment({ nurseId, elderlyId }))) {
      errors.elderlyId = "There is no assigned elder. Please assign first.";
    }
  }

  return errors;
}

async function hasActiveNurseElderlyAssignment({ nurseId, elderlyId }) {
  const [assignments] = await pool.query(
    `SELECT assignment_id
     FROM nurse_elderly_assignments
     WHERE nurse_id = :nurseId
       AND elderly_id = :elderlyId
       AND status = 'active'
     LIMIT 1`,
    { nurseId, elderlyId }
  );

  return Boolean(assignments[0]);
}

async function selectScheduleById(id) {
  const [rows] = await pool.query(
    `SELECT ${scheduleColumns}
     FROM \`schedule\` s
     INNER JOIN nurse n ON CAST(n.nurse_id AS CHAR) = CAST(s.nurse_id AS CHAR)
     INNER JOIN ${elderlyTable} e ON CAST(e.elderly_id AS CHAR) = CAST(s.elderly_id AS CHAR)
     WHERE s.schedule_id = :id
     LIMIT 1`,
    { id }
  );

  return rows[0];
}

async function findNurseScheduleConflict({
  nurseId,
  visitDate,
  visitTime,
  excludeScheduleId = null,
  excludeRecurringGroupId = null,
}) {
  const params = {
    nurseId: String(nurseId).trim(),
    visitTime: `${visitDate} ${visitTime.length === 5 ? `${visitTime}:00` : visitTime}`,
    excludeScheduleId,
    excludeRecurringGroupId,
  };

  const [rows] = await pool.query(
    `SELECT ${scheduleColumns}
     FROM \`schedule\` s
     INNER JOIN nurse n ON CAST(n.nurse_id AS CHAR) = CAST(s.nurse_id AS CHAR)
     INNER JOIN ${elderlyTable} e ON CAST(e.elderly_id AS CHAR) = CAST(s.elderly_id AS CHAR)
     WHERE CAST(s.nurse_id AS CHAR) = :nurseId
       AND s.visit_time = :visitTime
       AND s.schedule_status <> 'cancelled'
       AND COALESCE(n.nurse_status, 'active') = 'active'
       AND COALESCE(e.elderly_status, 'active') = 'active'
       AND (:excludeScheduleId IS NULL OR s.schedule_id <> :excludeScheduleId)
       AND (:excludeRecurringGroupId IS NULL OR s.recurring_group_id IS NULL OR s.recurring_group_id <> :excludeRecurringGroupId)
     LIMIT 1`,
    params
  );

  return rows[0] || null;
}

function sendNurseScheduleConflict(res, conflict) {
  res.status(422).json({
    valid: false,
    errors: {
      visitTime: `${conflict.nurseName} already has a visit at this date and time.`,
    },
  });
}

async function createScheduleReportRecords(db, scheduleId, schedule, display) {
  const purpose = String(schedule.purpose || "").trim();

  if (String(schedule.scheduleStatus || "").toLowerCase() === "cancelled") return;

  const base = {
    scheduleId,
    nurseId: schedule.nurseId,
    elderlyId: schedule.elderlyId,
    visitDate: display.visitDate,
    visitTime: display.visitTime,
  };

  if (purpose === "Blood Pressure") {
    await db.query(
      `INSERT INTO elderly_blood_pressure (
        schedule_id, nurse_id, elderly_id, recorded_date, recorded_time,
        systolic, diastolic
      ) VALUES (
        :scheduleId, :nurseId, :elderlyId, :visitDate, :visitTime,
        NULL, NULL
      )`,
      base
    );
    return;
  }

  if (purpose === "Blood Glucose") {
    await db.query(
      `INSERT INTO elderly_blood_glucose (
        schedule_id, nurse_id, elderly_id, recorded_date, recorded_time,
        glucose_value
      ) VALUES (
        :scheduleId, :nurseId, :elderlyId, :visitDate, :visitTime,
        NULL
      )`,
      base
    );
    return;
  }

  if (purpose !== "Medication") return;

  const [medications] = await db.query(
    `SELECT medication_id AS medicationId,
            medication_name AS medicationName,
            dosage,
            instructions
     FROM elderly_medications
     WHERE elderly_id = :elderlyId
       AND medication_status = 'Active'
     ORDER BY medication_name ASC`,
    { elderlyId: schedule.elderlyId }
  );

  for (const medication of medications) {
    await db.query(
      `INSERT INTO medication_logs (
        schedule_id, medication_id, nurse_id, elderly_id, medication_name, dosage,
        instructions, scheduled_time, scheduled_date, compliance_status
      ) VALUES (
        :scheduleId, :medicationId, :nurseId, :elderlyId, :medicationName, :dosage,
        :instructions, :visitTime, :visitDate, 'Pending'
      )`,
      {
        ...base,
        medicationId: medication.medicationId,
        medicationName: medication.medicationName,
        dosage: medication.dosage,
        instructions: medication.instructions,
      }
    );
  }
}

async function deleteScheduleReportRecords(db, scheduleIds) {
  const ids = scheduleIds
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0);

  for (const scheduleId of ids) {
    const [schedules] = await db.query(
      `SELECT schedule_id AS id,
              nurse_id AS nurseId,
              elderly_id AS elderlyId,
              COALESCE(DATE_FORMAT(visit_date, '%Y-%m-%d'), visit_date) AS visitDate,
              DATE_FORMAT(visit_time, '%H:%i') AS visitTime
       FROM \`schedule\`
       WHERE schedule_id = :scheduleId
       LIMIT 1`,
      { scheduleId }
    );
    const schedule = schedules[0];

    await db.query("DELETE FROM elderly_blood_pressure WHERE schedule_id = :scheduleId", { scheduleId });
    await db.query("DELETE FROM elderly_blood_glucose WHERE schedule_id = :scheduleId", { scheduleId });
    await db.query("DELETE FROM medication_logs WHERE schedule_id = :scheduleId", { scheduleId });

    if (!schedule) continue;

    await db.query(
      `DELETE FROM elderly_blood_pressure
       WHERE elderly_id = :elderlyId
         AND recorded_date = :visitDate
         AND recorded_time = :visitTime
         AND (nurse_id = :nurseId OR nurse_id IS NULL OR nurse_id = '')`,
      schedule
    );
    await db.query(
      `DELETE FROM elderly_blood_glucose
       WHERE elderly_id = :elderlyId
         AND recorded_date = :visitDate
         AND recorded_time = :visitTime
         AND (nurse_id = :nurseId OR nurse_id IS NULL OR nurse_id = '')`,
      schedule
    );
    await db.query(
      `DELETE FROM medication_logs
       WHERE elderly_id = :elderlyId
         AND scheduled_date = :visitDate
         AND scheduled_time = :visitTime
         AND (nurse_id = :nurseId OR nurse_id IS NULL OR nurse_id = '')`,
      schedule
    );
  }
}

async function replaceScheduleReportRecords(db, scheduleId, schedule, display) {
  await deleteScheduleReportRecords(db, [scheduleId]);
  await createScheduleReportRecords(db, scheduleId, schedule, display);
}

app.post("/api/schedules", async (req, res) => {
  const payload = req.body;
  const visitDate = normalizeScheduleDate(payload.visitDate);
  const visitTime = String(payload.visitTime || "").trim();
  const purpose = normalizeSchedulePurpose(payload.purpose);
  const allowedStatuses = ["scheduled", "completed", "missed", "cancelled"];
  const errors = validateSchedulePayload({ ...payload, purpose }, visitDate, visitTime);

  if (Object.keys(errors).length > 0) {
    res.status(422).json({ valid: false, errors });
    return;
  }

  const data = {
    nurseId: String(payload.nurseId).trim(),
    elderlyId: String(payload.elderlyId).trim(),
    visitTime: `${visitDate} ${visitTime.length === 5 ? `${visitTime}:00` : visitTime}`,
    visitDate: `${visitDate} 00:00:00`,
    purpose,
    scheduleStatus: allowedStatuses.includes(String(payload.scheduleStatus || "").toLowerCase())
      ? String(payload.scheduleStatus).toLowerCase()
      : "scheduled",
    recurringGroupId: String(payload.recurringGroupId || "").trim() || null,
    recurringSequence: Number.isInteger(Number(payload.recurringSequence))
      ? Number(payload.recurringSequence)
      : null,
  };

  try {
    const validation = await validateScheduleWithCobol({
      nurseId: payload.nurseId,
      elderlyId: payload.elderlyId,
      visitDate,
      visitTime,
      purpose,
      scheduleStatus: payload.scheduleStatus || "scheduled",
      slotLockDate: normalizeScheduleDate(payload.slotLockDate),
      slotLockHour: String(payload.slotLockHour || "").trim(),
      recurrenceIntervalDays: payload.recurrenceIntervalDays,
      hasAssignedElder: (await hasActiveNurseElderlyAssignment(data)) ? "Y" : "N",
    });

    if (!validation.valid) {
      res.status(422).json(validation);
      return;
    }

    const activeParticipantErrors = await validateActiveScheduleParticipants(data);

    if (Object.keys(activeParticipantErrors).length > 0) {
      res.status(422).json({ valid: false, errors: activeParticipantErrors });
      return;
    }

    const conflict = await findNurseScheduleConflict({
      nurseId: data.nurseId,
      visitDate,
      visitTime,
    });

    if (conflict) {
      sendNurseScheduleConflict(res, conflict);
      return;
    }

    const result = await transaction(async (db) => {
      const [insertResult] = await db.query(
        `INSERT INTO \`schedule\` (
           nurse_id, elderly_id, visit_time, visit_date, purpose, schedule_status,
           recurring_group_id, recurring_sequence
         ) VALUES (
           :nurseId, :elderlyId, :visitTime, :visitDate, :purpose, :scheduleStatus,
           :recurringGroupId, :recurringSequence
         )`,
        data
      );

      await createScheduleReportRecords(db, insertResult.insertId, data, {
        visitDate,
        visitTime,
        nurseName: String(payload.nurseName || payload.nurseId || "").trim(),
        elderlyName: String(payload.elderlyName || payload.elderlyId || "").trim(),
      });

      return insertResult;
    });

    res.status(201).json({
      id: result.insertId,
      ...data,
      visitTime,
      visitDate,
      nurseName: String(payload.nurseName || payload.nurseId || "").trim(),
      nurseAvatar: "https://i.pravatar.cc/40?img=49",
      elderlyName: String(payload.elderlyName || payload.elderlyId || "").trim(),
      elderlyAvatar: String(payload.elderlyAvatar || "https://i.pravatar.cc/40"),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to save schedule.", details: error.message });
  }
});

app.put("/api/schedules/:id", async (req, res) => {
  const id = Number(req.params.id);
  const payload = req.body;
  const updateGroup = req.query.group === "true";
  const stopRecurring = req.query.stopRecurring === "true";
  const visitDate = normalizeScheduleDate(payload.visitDate);
  const visitTime = String(payload.visitTime || "").trim();
  const purpose = normalizeSchedulePurpose(payload.purpose);
  const allowedStatuses = ["scheduled", "completed", "missed", "cancelled"];
  const errors = validateSchedulePayload({ ...payload, purpose }, visitDate, visitTime);

  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid schedule id." });
    return;
  }

  if (Object.keys(errors).length > 0) {
    res.status(422).json({ valid: false, errors });
    return;
  }

  try {
    const existingSchedule = await selectScheduleById(id);
    if (!existingSchedule) {
      res.status(404).json({ error: "Schedule not found." });
      return;
    }

    const dateTimeUnchanged = existingSchedule.visitDate === visitDate && existingSchedule.visitTime === visitTime;

    const baseData = {
      id,
      nurseId: String(payload.nurseId).trim(),
      elderlyId: String(payload.elderlyId).trim(),
      visitTime: `${visitDate} ${visitTime.length === 5 ? `${visitTime}:00` : visitTime}`,
      visitDate: `${visitDate} 00:00:00`,
      purpose,
      scheduleStatus: allowedStatuses.includes(String(payload.scheduleStatus || "").toLowerCase())
        ? String(payload.scheduleStatus).toLowerCase()
        : "scheduled",
      recurringGroupId: String(payload.recurringGroupId || "").trim() || null,
      recurringSequence: Number.isInteger(Number(payload.recurringSequence))
        ? Number(payload.recurringSequence)
        : null,
    };

    const validation = await validateScheduleWithCobol({
      nurseId: payload.nurseId,
      elderlyId: payload.elderlyId,
      visitDate,
      visitTime,
      purpose,
      scheduleStatus: payload.scheduleStatus || "scheduled",
      allowPastDateTime: dateTimeUnchanged ? "Y" : "N",
      recurrenceIntervalDays: payload.recurrenceIntervalDays,
      hasAssignedElder: (await hasActiveNurseElderlyAssignment(baseData)) ? "Y" : "N",
    });

    if (!validation.valid) {
      res.status(422).json(validation);
      return;
    }

    const activeParticipantErrors = await validateActiveScheduleParticipants(baseData);

    if (Object.keys(activeParticipantErrors).length > 0) {
      res.status(422).json({ valid: false, errors: activeParticipantErrors });
      return;
    }

    if (stopRecurring && existingSchedule.recurringGroupId) {
      const conflict = await findNurseScheduleConflict({
        nurseId: baseData.nurseId,
        visitDate,
        visitTime,
        excludeRecurringGroupId: existingSchedule.recurringGroupId,
      });

      if (conflict) {
        sendNurseScheduleConflict(res, conflict);
        return;
      }

      const result = await transaction(async (db) => {
        const [updateResult] = await db.query(
          `UPDATE \`schedule\`
           SET nurse_id = :nurseId,
               elderly_id = :elderlyId,
               visit_time = :visitTime,
               visit_date = :visitDate,
               purpose = :purpose,
               schedule_status = :scheduleStatus,
               recurring_group_id = NULL,
               recurring_sequence = NULL
           WHERE schedule_id = :id`,
          baseData
        );

        const [removedSchedules] = await db.query(
          "SELECT schedule_id AS id FROM `schedule` WHERE recurring_group_id = :recurringGroupId",
          { recurringGroupId: existingSchedule.recurringGroupId }
        );
        await deleteScheduleReportRecords(db, removedSchedules.map((row) => row.id));
        await db.query(
          "DELETE FROM `schedule` WHERE recurring_group_id = :recurringGroupId",
          { recurringGroupId: existingSchedule.recurringGroupId }
        );
        await replaceScheduleReportRecords(db, id, baseData, {
          visitDate,
          visitTime,
          nurseName: String(payload.nurseName || payload.nurseId || "").trim(),
          elderlyName: String(payload.elderlyName || payload.elderlyId || "").trim(),
        });

        return updateResult;
      });

      if (result.affectedRows === 0) {
        res.status(404).json({ error: "Schedule not found." });
        return;
      }

      res.json(await selectScheduleById(id));
      return;
    }

    if (updateGroup && existingSchedule.recurringGroupId) {
      const recurrenceIntervalDays = Number(payload.recurrenceIntervalDays) === 1 ? 1 : 7;
      const [groupRows] = await pool.query(
        `SELECT schedule_id AS id, recurring_sequence AS recurringSequence
         FROM \`schedule\`
         WHERE recurring_group_id = :recurringGroupId
         ORDER BY recurring_sequence ASC, schedule_id ASC`,
        { recurringGroupId: existingSchedule.recurringGroupId }
      );

      const groupUpdates = [];

      for (const groupRow of groupRows) {
        const sequenceOffset = Number(groupRow.recurringSequence || 1) - Number(existingSchedule.recurringSequence || 1);
        const nextVisitDate = addDaysToDateKey(visitDate, sequenceOffset * recurrenceIntervalDays);
        const conflict = await findNurseScheduleConflict({
          nurseId: baseData.nurseId,
          visitDate: nextVisitDate,
          visitTime,
          excludeRecurringGroupId: existingSchedule.recurringGroupId,
        });

        if (conflict) {
          sendNurseScheduleConflict(res, conflict);
          return;
        }

        groupUpdates.push({
          ...baseData,
          id: groupRow.id,
          visitTime: `${nextVisitDate} ${visitTime.length === 5 ? `${visitTime}:00` : visitTime}`,
          visitDate: `${nextVisitDate} 00:00:00`,
          displayVisitDate: nextVisitDate,
        });
      }

      await transaction(async (db) => {
        for (const groupUpdate of groupUpdates) {
          await db.query(
            `UPDATE \`schedule\`
             SET nurse_id = :nurseId,
                 elderly_id = :elderlyId,
                 visit_time = :visitTime,
                 visit_date = :visitDate,
                 purpose = :purpose,
                 schedule_status = :scheduleStatus
             WHERE schedule_id = :id`,
            groupUpdate
          );
          await replaceScheduleReportRecords(db, groupUpdate.id, groupUpdate, {
            visitDate: groupUpdate.displayVisitDate,
            visitTime,
            nurseName: String(payload.nurseName || payload.nurseId || "").trim(),
            elderlyName: String(payload.elderlyName || payload.elderlyId || "").trim(),
          });
        }
      });

      const [updatedSchedules] = await pool.query(
        `SELECT ${scheduleColumns}
         FROM \`schedule\` s
         INNER JOIN nurse n ON CAST(n.nurse_id AS CHAR) = CAST(s.nurse_id AS CHAR)
         INNER JOIN ${elderlyTable} e ON CAST(e.elderly_id AS CHAR) = CAST(s.elderly_id AS CHAR)
         WHERE s.recurring_group_id = :recurringGroupId
           AND COALESCE(n.nurse_status, 'active') = 'active'
           AND COALESCE(e.elderly_status, 'active') = 'active'
         ORDER BY s.recurring_sequence ASC, s.visit_date ASC`,
        { recurringGroupId: existingSchedule.recurringGroupId }
      );

      res.json({ schedules: updatedSchedules });
      return;
    }

    const conflict = await findNurseScheduleConflict({
      nurseId: baseData.nurseId,
      visitDate,
      visitTime,
      excludeScheduleId: id,
    });

    if (conflict) {
      sendNurseScheduleConflict(res, conflict);
      return;
    }

    const result = await transaction(async (db) => {
      const [updateResult] = await db.query(
        `UPDATE \`schedule\`
         SET nurse_id = :nurseId,
             elderly_id = :elderlyId,
             visit_time = :visitTime,
             visit_date = :visitDate,
             purpose = :purpose,
             schedule_status = :scheduleStatus,
             recurring_group_id = :recurringGroupId,
             recurring_sequence = :recurringSequence
         WHERE schedule_id = :id`,
        baseData
      );

      await replaceScheduleReportRecords(db, id, baseData, {
        visitDate,
        visitTime,
        nurseName: String(payload.nurseName || payload.nurseId || "").trim(),
        elderlyName: String(payload.elderlyName || payload.elderlyId || "").trim(),
      });

      return updateResult;
    });

    if (result.affectedRows === 0) {
      res.status(404).json({ error: "Schedule not found." });
      return;
    }

    res.json(await selectScheduleById(id));
  } catch (error) {
    res.status(500).json({ error: "Failed to update schedule.", details: error.message });
  }
});

app.patch("/api/schedules/:id/status", async (req, res) => {
  const id = Number(req.params.id);
  const scheduleStatus = String(req.body.scheduleStatus || "").trim().toLowerCase();
  const allowedStatuses = ["scheduled", "completed", "missed", "cancelled"];

  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid schedule id." });
    return;
  }

  if (!allowedStatuses.includes(scheduleStatus)) {
    res.status(422).json({ errors: { scheduleStatus: "Select a valid schedule status." } });
    return;
  }

  try {
    const [scheduleRows] = await pool.query("SELECT DATE(visit_date) AS visitDate FROM `schedule` WHERE schedule_id = ? LIMIT 1", [id]);
    const visitDate = scheduleRows[0]?.visitDate;

    if (scheduleStatus === "completed" && !isScheduleDueForCompletion(visitDate)) {
      res.status(409).json({ error: "This visit is not available until its scheduled date." });
      return;
    }

    const result = await transaction(async (db) => {
      const [updateResult] = await db.query(
        "UPDATE `schedule` SET schedule_status = :scheduleStatus WHERE schedule_id = :id",
        { id, scheduleStatus }
      );

      if (scheduleStatus === "cancelled") {
        await deleteScheduleReportRecords(db, [id]);
      }

      return updateResult;
    });

    if (result.affectedRows === 0) {
      res.status(404).json({ error: "Schedule not found." });
      return;
    }

    res.json(await selectScheduleById(id));
  } catch (error) {
    res.status(500).json({ error: "Failed to update schedule.", details: error.message });
  }
});

// Health log - save vitals/notes for a visit
app.post("/api/health", async (req, res) => {
  const nurseId = Number(req.body.nurseId);
  const elderlyId = Number(req.body.elderlyId);
  const scheduleId = req.body.scheduleId ? Number(req.body.scheduleId) : null;
  const purpose = normalizeSchedulePurpose(req.body.purpose);
  const complianceStatus = String(req.body.complianceStatus || "").trim();
  const medicationName = String(req.body.medicationName || "").trim();
  let systolic = req.body.systolic !== undefined ? Number(req.body.systolic) : null;
  let diastolic = req.body.diastolic !== undefined ? Number(req.body.diastolic) : null;
  let bloodSugar = req.body.bloodSugar !== undefined ? Number(req.body.bloodSugar) : null;
  let notes = String(req.body.notes || "").trim();

  if (!Number.isInteger(nurseId) || nurseId <= 0) {
    res.status(400).json({ error: "Valid nurseId is required." });
    return;
  }

  if (!Number.isInteger(elderlyId) || elderlyId <= 0) {
    res.status(400).json({ error: "Valid elderlyId is required." });
    return;
  }

  const allowEmptyMedicationCompletion = purpose === "Medication" && Number.isInteger(scheduleId) && scheduleId > 0;
  if (!allowEmptyMedicationCompletion && systolic === null && diastolic === null && bloodSugar === null && !notes) {
    res.status(422).json({ error: "At least one measurement or note is required." });
    return;
  }

  try {
    // Ensure DB NOT NULL columns receive defaults if omitted
    if (systolic === null) systolic = 0;
    if (diastolic === null) diastolic = 0;
    if (bloodSugar === null) bloodSugar = 0;
    if (!notes) notes = "";

    let healthLogResult;
    const nowDate = getForcedNow();
    const nowDateTimeSql = formatDateTimeForSql(nowDate);
    const nowDateOnlySql = formatDateForSql(nowDate);
    const nowTimeOnlySql = formatTimeForSql(nowDate);

    if (Number.isInteger(scheduleId) && scheduleId > 0) {
      [healthLogResult] = await pool.query(
        `INSERT INTO health_log (schedule_id, nurse_id, elderly_id, visit_time, visit_date, bloodpressure_systolic, bloodpressure_diastolic, blood_sugar, condition_notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [scheduleId, nurseId, elderlyId, nowDateTimeSql, nowDateOnlySql, systolic, diastolic, bloodSugar, notes]
      );
    } else {
      [healthLogResult] = await pool.query(
        `INSERT INTO health_log (nurse_id, elderly_id, visit_time, visit_date, bloodpressure_systolic, bloodpressure_diastolic, blood_sugar, condition_notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [nurseId, elderlyId, nowDateTimeSql, nowDateOnlySql, systolic, diastolic, bloodSugar, notes]
      );
    }

    if (Number.isInteger(scheduleId) && scheduleId > 0) {
      if (purpose === "Blood Pressure") {
        const [existingRows] = await pool.query(
          "SELECT pressure_id AS id FROM elderly_blood_pressure WHERE schedule_id = ? LIMIT 1",
          [scheduleId]
        );

        if (existingRows[0]?.id) {
          await pool.query(
            `UPDATE elderly_blood_pressure
             SET nurse_id = ?, elderly_id = ?, recorded_date = ?, recorded_time = ?, systolic = ?, diastolic = ?
             WHERE pressure_id = ?`,
            [nurseId, elderlyId, nowDateOnlySql, nowTimeOnlySql, systolic, diastolic, existingRows[0].id]
          );
        } else {
          await pool.query(
            `INSERT INTO elderly_blood_pressure (schedule_id, nurse_id, elderly_id, recorded_date, recorded_time, systolic, diastolic)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [scheduleId, nurseId, elderlyId, nowDateOnlySql, nowTimeOnlySql, systolic, diastolic]
          );
        }
      } else if (purpose === "Blood Glucose") {
        const [existingRows] = await pool.query(
          "SELECT glucose_id AS id FROM elderly_blood_glucose WHERE schedule_id = ? LIMIT 1",
          [scheduleId]
        );

        if (existingRows[0]?.id) {
          await pool.query(
            `UPDATE elderly_blood_glucose
             SET nurse_id = ?, elderly_id = ?, recorded_date = ?, recorded_time = ?, glucose_value = ?
             WHERE glucose_id = ?`,
            [nurseId, elderlyId, nowDateOnlySql, nowTimeOnlySql, bloodSugar, existingRows[0].id]
          );
        } else {
          await pool.query(
            `INSERT INTO elderly_blood_glucose (schedule_id, nurse_id, elderly_id, recorded_date, recorded_time, glucose_value)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [scheduleId, nurseId, elderlyId, nowDateOnlySql, nowTimeOnlySql, bloodSugar]
          );
        }
      } else if (purpose === "Medication") {
        const targetStatus = ["Taken", "Missed"].includes(complianceStatus) ? complianceStatus : "Taken";
        await pool.query(
          `UPDATE medication_logs
           SET compliance_status = ?, report_notes = ?, reported_at = CURRENT_TIMESTAMP
           WHERE schedule_id = ?`,
          [targetStatus, notes || medicationName || "Medication completed", scheduleId]
        );
      }
    }

    const insertId = healthLogResult.insertId;
    const [rows] = await pool.query("SELECT * FROM health_log WHERE log_id = ?", [insertId]);
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to save health log.", details: error.message });
  }
});

// Fetch health logs. Accepts query params: nurseId, elderlyId, limit
app.get("/api/health/logs", async (req, res) => {
  const nurseId = req.query.nurseId ? Number(req.query.nurseId) : null;
  const elderlyId = req.query.elderlyId ? Number(req.query.elderlyId) : null;
  const scheduleId = req.query.scheduleId ? Number(req.query.scheduleId) : null;
  const limit = req.query.limit ? Math.min(100, Number(req.query.limit)) : 50;

  try {
    let sql = "SELECT * FROM health_log";
    const params = [];
    const where = [];
    if (Number.isInteger(scheduleId) && scheduleId > 0) {
      where.push("schedule_id = ?");
      params.push(scheduleId);
    } else {
      if (Number.isInteger(nurseId) && nurseId > 0) {
        where.push("nurse_id = ?");
        params.push(nurseId);
      }
      if (Number.isInteger(elderlyId) && elderlyId > 0) {
        where.push("elderly_id = ?");
        params.push(elderlyId);
      }
    }

    if (where.length > 0) sql += " WHERE " + where.join(" AND ");
    sql += " ORDER BY visit_time DESC LIMIT ?";
    params.push(limit);

    const [rows] = await pool.query(sql, params);
    res.json({ logs: rows });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch health logs.", details: error.message });
  }
});

app.delete("/api/schedules/:id", async (req, res) => {
  const id = Number(req.params.id);
  const deleteGroup = req.query.group === "true";

  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid schedule id." });
    return;
  }

  try {
    const existingSchedule = await selectScheduleById(id);
    const params = { id };
    let sql = "DELETE FROM `schedule` WHERE schedule_id = :id";

    if (deleteGroup && existingSchedule?.recurringGroupId) {
      params.recurringGroupId = existingSchedule.recurringGroupId;
      sql = "DELETE FROM `schedule` WHERE recurring_group_id = :recurringGroupId";
    }

    const result = await transaction(async (db) => {
      const [scheduleRows] = await db.query(
        deleteGroup && existingSchedule?.recurringGroupId
          ? "SELECT schedule_id AS id FROM `schedule` WHERE recurring_group_id = :recurringGroupId"
          : "SELECT schedule_id AS id FROM `schedule` WHERE schedule_id = :id",
        params
      );
      await deleteScheduleReportRecords(db, scheduleRows.map((row) => row.id));
      const [deleteResult] = await db.query(sql, params);
      return deleteResult;
    });

    if (result.affectedRows === 0) {
      res.status(404).json({ error: "Schedule not found." });
      return;
    }

    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete schedule.", details: error.message });
  }
});

app.get("/api/profiles", async (_req, res) => {
  try {
    const [elderly] = await pool.query(
      `SELECT ${elderlyColumns} FROM ${elderlyFromClause} ORDER BY ${elderlyTable}.elderly_id`
    );
    const [rooms] = await pool.query(
      `SELECT ${roomColumns}
       FROM rooms
       LEFT JOIN ${elderlyTable} occupied
         ON occupied.room_id = rooms.room_id
        AND COALESCE(occupied.elderly_status, 'active') = 'active'
       ORDER BY rooms.floor_number, rooms.room_number`
    );

    let nurses = [];
    let nurseElderlyAssignments = [];

    try {
      const [nurseRows] = await pool.query(
        `SELECT ${nurseColumns} FROM nurse ORDER BY nurse_id`
      );
      nurses = nurseRows;
    } catch (error) {
      if (error.code !== "ER_NO_SUCH_TABLE") throw error;
      console.warn("nurse table not found. Returning elderly profiles only.");
    }

    try {
      const [assignmentRows] = await pool.query(
        `SELECT
           nea.nurse_id AS nurseId,
           nea.elderly_id AS elderlyId
         FROM nurse_elderly_assignments nea
         INNER JOIN ${elderlyTable} e ON e.elderly_id = nea.elderly_id
         WHERE nea.status = 'active'
           AND COALESCE(e.elderly_status, 'active') = 'active'
         ORDER BY nea.nurse_id, nea.elderly_id`
      );
      nurseElderlyAssignments = assignmentRows;
    } catch (error) {
      if (error.code !== "ER_NO_SUCH_TABLE") throw error;
    }

    res.json({ elderly, nurses, rooms, nurseElderlyAssignments });
  } catch (error) {
    res.status(500).json({
      error: "Failed to load profiles",
      details: error.message,
    });
  }
});

app.get("/api/nurses/:id/elderly-assignments", async (req, res) => {
  const nurseId = getNurseDbId(req.params.id);

  if (!Number.isInteger(nurseId) || nurseId <= 0) {
    res.status(400).json({ error: "Valid nurse id is required." });
    return;
  }

  try {
    const [assignments] = await pool.query(
      `SELECT
         nea.nurse_id AS nurseId,
         nea.elderly_id AS elderlyId,
         ${elderlyColumns}
       FROM nurse_elderly_assignments nea
       INNER JOIN ${elderlyTable} ON ${elderlyTable}.elderly_id = nea.elderly_id
       LEFT JOIN rooms ON rooms.room_id = ${elderlyTable}.room_id
       WHERE nea.nurse_id = :nurseId
         AND nea.status = 'active'
         AND COALESCE(${elderlyTable}.elderly_status, 'active') = 'active'
       ORDER BY ${elderlyTable}.name`,
      { nurseId }
    );

    res.json({ assignments });
  } catch (error) {
    res.status(500).json({
      error: "Failed to load nurse elderly assignments.",
      details: error.message,
    });
  }
});

app.put("/api/nurses/:id/elderly-assignments", async (req, res) => {
  const nurseId = getNurseDbId(req.params.id);
  const requestedElderlyIds = Array.isArray(req.body.elderlyIds) ? req.body.elderlyIds : [];
  const parsedElderlyIds = requestedElderlyIds.map(getElderlyDbId);
  const elderlyIds = Array.from(new Set(parsedElderlyIds));

  if (!Number.isInteger(nurseId) || nurseId <= 0) {
    res.status(400).json({ error: "Valid nurse id is required." });
    return;
  }

  if (!parsedElderlyIds.every((id) => Number.isInteger(id) && id > 0)) {
    res.status(400).json({ error: "Elderly ids must be positive numbers." });
    return;
  }

  let connection;

  try {
    await ensureNurseElderlyAssignmentsTable();

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [nurseRows] = await connection.query("SELECT nurse_id FROM nurse WHERE nurse_id = :nurseId", { nurseId });

    if (!nurseRows[0]) {
      await connection.rollback();
      res.status(404).json({ error: "Nurse profile not found." });
      return;
    }

    if (elderlyIds.length > 0) {
      const [elderlyRows] = await connection.query(
        `SELECT elderly_id AS id
         FROM ${elderlyTable}
         WHERE elderly_id IN (:elderlyIds)
           AND COALESCE(elderly_status, 'active') = 'active'`,
        { elderlyIds }
      );

      if (elderlyRows.length !== elderlyIds.length) {
        await connection.rollback();
        res.status(422).json({ error: "Only active elderly profiles can be assigned." });
        return;
      }

      const [assignedRows] = await connection.query(
        `SELECT elderly_id AS elderlyId, nurse_id AS nurseId
         FROM nurse_elderly_assignments
         WHERE elderly_id IN (:elderlyIds)
           AND nurse_id <> :nurseId
           AND status = 'active'`,
        { elderlyIds, nurseId }
      );

      if (assignedRows.length > 0) {
        await connection.rollback();
        res.status(409).json({
          error: "Some elderly profiles are already assigned to another nurse.",
          assignedElderlyIds: assignedRows.map((row) => String(row.elderlyId)),
        });
        return;
      }
    }

    await connection.query(
      "UPDATE nurse_elderly_assignments SET status = 'inactive' WHERE nurse_id = :nurseId",
      { nurseId }
    );

    for (const elderlyId of elderlyIds) {
      await connection.query(
        `INSERT INTO nurse_elderly_assignments (nurse_id, elderly_id, status)
         VALUES (:nurseId, :elderlyId, 'active')
         ON DUPLICATE KEY UPDATE status = 'active', assigned_at = CURRENT_TIMESTAMP`,
        { nurseId, elderlyId }
      );
    }

    const [assignments] = await connection.query(
      `SELECT nurse_id AS nurseId, elderly_id AS elderlyId
       FROM nurse_elderly_assignments
       WHERE nurse_id = :nurseId
         AND status = 'active'
       ORDER BY elderly_id`,
      { nurseId }
    );

    await connection.commit();
    res.json({ assignments });
  } catch (error) {
    if (connection) await connection.rollback();
    res.status(500).json({
      error: "Failed to save nurse elderly assignments.",
      details: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
});

app.get("/api/admin/login-history", async (_req, res) => {
  try {
    const [history] = await pool.query(
      `SELECT
         history_id AS id,
         admin_id AS adminId,
         username,
         name,
         DATE_FORMAT(signed_in_at, '%Y-%m-%d %H:%i:%s') AS signedInAt,
         DATE_FORMAT(signed_out_at, '%Y-%m-%d %H:%i:%s') AS signedOutAt
       FROM admin_login_history
       ORDER BY signed_in_at DESC
       LIMIT 100`
    );

    res.json({ history });
  } catch (error) {
    res.status(500).json({
      error: "Failed to load admin login history.",
      details: error.message,
    });
  }
});

app.post("/api/auth/admin-logout", async (req, res) => {
  const loginHistoryId = Number(req.body.loginHistoryId);
  const username = String(req.body.username || "").trim();

  if ((!Number.isInteger(loginHistoryId) || loginHistoryId <= 0) && !username) {
    res.status(400).json({ error: "Login history id or username is required." });
    return;
  }

  try {
    if (Number.isInteger(loginHistoryId) && loginHistoryId > 0) {
      await pool.query(
        `UPDATE admin_login_history
         SET signed_out_at = CURRENT_TIMESTAMP
         WHERE history_id = :loginHistoryId
           AND signed_out_at IS NULL`,
        { loginHistoryId }
      );
    } else {
      await pool.query(
        `UPDATE admin_login_history
         SET signed_out_at = CURRENT_TIMESTAMP
         WHERE username = :username
           AND signed_out_at IS NULL
         ORDER BY signed_in_at DESC
         LIMIT 1`,
        { username }
      );
    }

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({
      error: "Failed to record admin logout.",
      details: error.message,
    });
  }
});

app.post("/api/auth/admin-login", async (req, res) => {
  const login = String(req.body.login || "").trim();
  const password = String(req.body.password || "");

  if (!login || !password) {
    res.status(400).json({ error: "Username/email and password are required." });
    return;
  }

  const fallbackAdmin = {
    admin_id: 1,
    username: "admin",
    password: "admin123",
    name: "Admin User",
    email: "admin@elderease.com",
    avatar: "",
    admin_status: "active",
  };

  if (
    (login === fallbackAdmin.username || login === fallbackAdmin.email) &&
    password === fallbackAdmin.password
  ) {
    res.json({
      role: "admin",
      id: fallbackAdmin.admin_id,
      username: fallbackAdmin.username,
      name: fallbackAdmin.name,
      email: fallbackAdmin.email,
      avatar: fallbackAdmin.avatar || "",
      loginHistoryId: 0,
    });
    return;
  }

  try {
    let admin = null;

    try {
      const [rows] = await pool.query(
        `SELECT admin_id, username, password, name, email, avatar, admin_status
         FROM admin
         WHERE username = :login OR email = :login
         LIMIT 1`,
        { login }
      );

      admin = rows[0] || null;
    } catch (error) {
      if (
        error.code === "ER_NO_SUCH_TABLE" ||
        error.code === "ER_BAD_DB_ERROR" ||
        error.code === "ECONNREFUSED" ||
        error.code === "ETIMEDOUT"
      ) {
        admin = null;
      } else {
        throw error;
      }
    }

    if (!admin || admin.password !== password) {
      res.status(401).json({ error: "Incorrect admin username/email or password." });
      return;
    }

    if (admin.admin_status && admin.admin_status !== "active") {
      res.status(403).json({ error: "This admin account is suspended." });
      return;
    }

    let loginHistoryId = 0;

    try {
      const [loginHistory] = await pool.query(
        `INSERT INTO admin_login_history (
           admin_id, username, name
         ) VALUES (
           :adminId, :username, :name
         )`,
        {
          adminId: admin.admin_id,
          username: admin.username,
          name: admin.name,
        }
      );

      loginHistoryId = loginHistory.insertId;
    } catch (error) {
      if (
        error.code === "ER_NO_SUCH_TABLE" ||
        error.code === "ER_BAD_DB_ERROR" ||
        error.code === "ECONNREFUSED" ||
        error.code === "ETIMEDOUT"
      ) {
        loginHistoryId = 0;
      } else {
        throw error;
      }
    }

    res.json({
      role: "admin",
      id: admin.admin_id,
      username: admin.username,
      name: admin.name,
      email: admin.email,
      avatar: admin.avatar || "",
      loginHistoryId,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to sign in admin.",
      details: error.message,
    });
  }
});

app.post("/api/auth/nurse-login", async (req, res) => {
  const login = String(req.body.login || "").trim();
  const password = String(req.body.password || "");

  if (!login || !password) {
    res.status(400).json({ error: "Username/email and password are required." });
    return;
  }

  try {
    const [rows] = await pool.query(
      `SELECT
         nurse_id,
         name,
         email,
         username,
         license_number AS licenseNumber,
         position,
         COALESCE(avatar, '') AS avatar,
         nurse_status
       FROM nurse
       WHERE (username = :login OR email = :login)
         AND password = :password
       LIMIT 1`,
      { login, password }
    );

    const nurse = rows[0];

    if (!nurse) {
      res.status(401).json({ error: "Incorrect nurse username/email or password." });
      return;
    }

    if (nurse.nurse_status && nurse.nurse_status !== "active") {
      res.status(403).json({ error: "This nurse account is not active." });
      return;
    }

    res.json({
      role: "nurse",
      id: nurse.nurse_id,
      username: nurse.username,
      name: nurse.name,
      email: nurse.email,
      licenseNumber: nurse.licenseNumber || "",
      position: nurse.position || "Nurse",
      avatar: nurse.avatar || "",
      status: nurse.nurse_status,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to sign in nurse.",
      details: error.message,
    });
  }
});

app.get("/api/admin/profile", async (req, res) => {
  const username = String(req.query.username || "").trim();

  if (!username) {
    res.status(400).json({ error: "Username is required." });
    return;
  }

  try {
    const [rows] = await pool.query(
      `SELECT
         admin_id AS id,
         username,
         name,
         email,
         COALESCE(avatar, '') AS avatar,
         admin_status AS status
       FROM admin
       WHERE username = :username OR email = :username OR name = :username
       LIMIT 1`,
      { username }
    );

    if (!rows[0]) {
      res.status(404).json({ error: "Admin profile not found." });
      return;
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({
      error: "Failed to load admin profile.",
      details: error.message,
    });
  }
});

app.put("/api/admin/profile/:id/avatar", async (req, res) => {
  const id = Number(req.params.id);
  const avatar = String(req.body.avatar || "");

  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Valid admin id is required." });
    return;
  }

  try {
    await pool.query(
      `UPDATE admin
       SET avatar = :avatar
       WHERE admin_id = :id`,
      { id, avatar }
    );

    const [rows] = await pool.query(
      `SELECT
         admin_id AS id,
         username,
         name,
         email,
         COALESCE(avatar, '') AS avatar,
         admin_status AS status
       FROM admin
       WHERE admin_id = :id
       LIMIT 1`,
      { id }
    );

    if (!rows[0]) {
      res.status(404).json({ error: "Admin profile not found." });
      return;
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({
      error: "Failed to update admin photo.",
      details: error.message,
    });
  }
});

app.post("/api/elderly", async (req, res) => {
  const profile = { ...req.body, type: "elderly" };
  const validation = await validateProfileWithCobol(profile);

  if (!validation.valid) {
    res.status(422).json(validation);
    return;
  }

  try {
    const data = {
      name: String(profile.name || "").trim(),
      age: Number(profile.age),
      gender: String(profile.gender || "").toLowerCase(),
      birthdate: profile.birthdate || null,
      address: profile.address || "",
      phone: profile.phone || "",
      medicalCondition: profile.medicalCondition || "",
      allergies: profile.allergies || "",
      bloodType: profile.bloodType || "",
      emergencyName: profile.emergencyName || "",
      emergencyPhone: profile.emergencyPhone || "",
      emergencyAddress: profile.emergencyAddress || "",
      roomId: getRoomDbId(profile.roomId),
      avatar: profile.avatar || "",
    };

    const result = await transaction(async (connection) => {
      const roomErrors = await validateRoomAssignment(connection, data.roomId);

      if (roomErrors) {
        const error = new Error("Room validation failed.");
        error.statusCode = 422;
        error.validation = { valid: false, errors: roomErrors };
        throw error;
      }

      const [insertResult] = await connection.query(
        `INSERT INTO ${elderlyTable} (
          name, age, gender, birthdate, address, phone, medical_conditions,
          allergies, blood_type, emergency_name, emergency_phone, emergency_address, room_id, avatar
        ) VALUES (
          :name, :age, :gender, :birthdate, :address, :phone,
          :medicalCondition, :allergies, :bloodType, :emergencyName,
          :emergencyPhone, :emergencyAddress, :roomId, :avatar
        )`,
        data
      );

      return insertResult;
    });

    const [rows] = await pool.query(
      `SELECT ${elderlyColumns} FROM ${elderlyFromClause} WHERE ${elderlyTable}.elderly_id = :elderlyId`,
      { elderlyId: result.insertId }
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.statusCode === 422 && error.validation) {
      res.status(422).json(error.validation);
      return;
    }

    res.status(500).json({
      error: "Failed to create elderly profile",
      details: error.message,
    });
  }
});

app.get("/api/elderly/search", async (req, res) => {
  const name = String(req.query.name || "").trim();

  if (!name) {
    res.status(400).json({ error: "Name query parameter is required." });
    return;
  }

  try {
    const [elderly] = await pool.query(
      `SELECT ${elderlyColumns}
       FROM ${elderlyFromClause}
       WHERE ${elderlyTable}.name LIKE :name
       ORDER BY ${elderlyTable}.name
       LIMIT 10`,
      { name: `${name}%` }
    );

    res.json({ elderly });
  } catch (error) {
    res.status(500).json({
      error: "Failed to search elderly profiles",
      details: error.message,
    });
  }
});

app.put("/api/elderly/:id", async (req, res) => {
  const { id } = req.params;
  const profile = req.body;

  const validation = await validateProfileWithCobol({
    ...profile,
    type: "elderly",
    birthdate: profile.dob || profile.birthdate || "",
    emergencyName: profile.emergencyContact || profile.emergencyName || "",
    elderlyStatus: profile.status === "Inactive" ? "passed away" : "active",
    username: "",
    password: "",
    confirmPassword: "",
  });

  if (!validation.valid) {
    res.status(422).json(validation);
    return;
  }

  try {
    const data = {
      id,
      name: String(profile.name || "").trim(),
      age: Number(profile.age) || 0,
      gender: String(profile.gender || "").toLowerCase(),
      phone: profile.phone || "",
      medicalCondition: profile.medicalCondition || "",
      emergencyName: profile.emergencyContact || profile.emergencyName || "",
      birthdate: profile.dob || profile.birthdate || null,
      address: profile.address || "",
      bloodType: profile.bloodType || "",
      allergies: profile.allergies || "",
      emergencyPhone: profile.emergencyPhone || "",
      emergencyAddress: profile.emergencyAddress || "",
      roomId: getRoomDbId(profile.roomId),
      elderlyStatus: profile.status === "Inactive" ? "passed away" : "active",
      avatar: profile.avatar || "",
    };

    await transaction(async (connection) => {
      const roomErrors = await validateRoomAssignment(connection, data.roomId, Number(id), {
        required: isActiveElderlyStatus(data.elderlyStatus),
      });

      if (roomErrors) {
        const error = new Error("Room validation failed.");
        error.statusCode = 422;
        error.validation = { valid: false, errors: roomErrors };
        throw error;
      }

      await connection.query(
        `UPDATE ${elderlyTable}
         SET name = :name,
             age = :age,
             gender = :gender,
             phone = :phone,
             medical_conditions = :medicalCondition,
             emergency_name = :emergencyName,
             birthdate = :birthdate,
             address = :address,
             blood_type = :bloodType,
             allergies = :allergies,
             emergency_phone = :emergencyPhone,
             emergency_address = :emergencyAddress,
             room_id = :roomId,
             elderly_status = :elderlyStatus,
             avatar = :avatar
         WHERE elderly_id = :id`,
        data
      );

      if (!isActiveElderlyStatus(data.elderlyStatus)) {
        await connection.query("DELETE FROM `schedule` WHERE elderly_id = :id", data);
        await connection.query("UPDATE nurse_elderly_assignments SET status = 'inactive' WHERE elderly_id = :id", data);
      }
    });

    const [rows] = await pool.query(
      `SELECT ${elderlyColumns} FROM ${elderlyFromClause} WHERE ${elderlyTable}.elderly_id = :id`,
      { id }
    );

    res.json(rows[0]);
  } catch (error) {
    if (error.statusCode === 422 && error.validation) {
      res.status(422).json(error.validation);
      return;
    }

    res.status(500).json({
      error: "Failed to update elderly profile",
      details: error.message,
    });
  }
});

app.delete("/api/elderly/:id", async (req, res) => {
  try {
    await transaction(async (connection) => {
      await connection.query("DELETE FROM `schedule` WHERE elderly_id = :id", { id: req.params.id });
      await connection.query("DELETE FROM nurse_elderly_assignments WHERE elderly_id = :id", { id: req.params.id });
      await connection.query(`DELETE FROM ${elderlyTable} WHERE elderly_id = :id`, { id: req.params.id });
    });

    res.status(204).end();
  } catch (error) {
    res.status(500).json({
      error: "Failed to delete elderly profile",
      details: error.message,
    });
  }
});

const medicationAssignmentColumns = `
  ml.log_id AS id,
  ml.schedule_id AS scheduleId,
  ml.medication_id AS medicationId,
  ml.nurse_id AS nurseId,
  ml.elderly_id AS elderlyId,
  COALESCE(e.name, ml.elderly_id) AS elderlyName,
  COALESCE(n.name, ml.nurse_id) AS nurseName,
  ml.medication_name AS medicationName,
  ml.dosage,
  ml.instructions,
  ml.scheduled_time AS scheduledTime,
  DATE_FORMAT(ml.scheduled_date, '%Y-%m-%d') AS scheduledDate,
  ml.compliance_status AS complianceStatus,
  NULL AS notes,
  ml.report_notes AS reportNotes,
  DATE_FORMAT(ml.reported_at, '%Y-%m-%d %H:%i:%s') AS reportedAt,
  DATE_FORMAT(ml.created_at, '%Y-%m-%d %H:%i:%s') AS createdAt
`;

const elderlyMedicationColumns = `
  medication_id AS id,
  elderly_id AS elderlyId,
  elderly_name AS elderlyName,
  medication_name AS medicationName,
  dosage,
  instructions,
  notes,
  medication_status AS status,
  DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS createdAt,
  DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') AS updatedAt
`;

function validateElderlyMedicationPayload(payload) {
  const errors = {};

  if (!String(payload.elderlyId || "").trim()) errors.elderlyId = "Select an elderly profile.";
  if (!String(payload.elderlyName || "").trim()) errors.elderlyName = "Elderly name is required.";
  if (!String(payload.medicationName || "").trim()) errors.medicationName = "Medicine name is required.";
  else if (String(payload.medicationName).trim().length > 160) errors.medicationName = "Medicine name must be 160 characters or fewer.";
  if (!String(payload.dosage || "").trim()) errors.dosage = "Dosage is required.";
  else if (String(payload.dosage).trim().length > 80) errors.dosage = "Dosage must be 80 characters or fewer.";
  if (!String(payload.instructions || "").trim()) errors.instructions = "Instructions are required.";
  else if (String(payload.instructions).trim().length > 500) errors.instructions = "Instructions must be 500 characters or fewer.";

  return errors;
}

app.get("/api/elderly-medications", async (req, res) => {
  const elderlyId = String(req.query.elderlyId || "").trim();

  try {
    const params = {};
    let where = "";

    if (elderlyId) {
      params.elderlyId = elderlyId;
      where = "WHERE elderly_id = :elderlyId";
    }

    const [medications] = await pool.query(
      `SELECT ${elderlyMedicationColumns}
       FROM elderly_medications
       ${where}
       ORDER BY medication_status = 'Active' DESC, elderly_name ASC, medication_name ASC`,
      params
    );

    res.json({ medications });
  } catch (error) {
    res.status(500).json({
      error: "Failed to load elderly medications.",
      details: error.message,
    });
  }
});

app.post("/api/elderly-medications", async (req, res) => {
  const payload = req.body;
  const errors = validateElderlyMedicationPayload(payload);

  if (Object.keys(errors).length > 0) {
    res.status(422).json({ valid: false, errors });
    return;
  }

  try {
    const data = {
      elderlyId: String(payload.elderlyId).trim(),
      elderlyName: String(payload.elderlyName).trim(),
      medicationName: String(payload.medicationName).trim(),
      dosage: String(payload.dosage).trim(),
      instructions: String(payload.instructions).trim(),
      notes: String(payload.notes || "").trim(),
      status: payload.status === "Inactive" ? "Inactive" : "Active",
    };

    const [result] = await pool.query(
      `INSERT INTO elderly_medications (
        elderly_id, elderly_name, medication_name, dosage, instructions, notes, medication_status
      ) VALUES (
        :elderlyId, :elderlyName, :medicationName, :dosage, :instructions, :notes, :status
      )`,
      data
    );

    const [rows] = await pool.query(
      `SELECT ${elderlyMedicationColumns}
       FROM elderly_medications
       WHERE medication_id = :id`,
      { id: result.insertId }
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({
      error: "Failed to create elderly medication.",
      details: error.message,
    });
  }
});

app.put("/api/elderly-medications/:id", async (req, res) => {
  const id = Number(req.params.id);
  const payload = req.body;
  const errors = validateElderlyMedicationPayload(payload);

  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Valid medication id is required." });
    return;
  }

  if (Object.keys(errors).length > 0) {
    res.status(422).json({ valid: false, errors });
    return;
  }

  try {
    const data = {
      id,
      elderlyId: String(payload.elderlyId).trim(),
      elderlyName: String(payload.elderlyName).trim(),
      medicationName: String(payload.medicationName).trim(),
      dosage: String(payload.dosage).trim(),
      instructions: String(payload.instructions).trim(),
      notes: String(payload.notes || "").trim(),
      status: payload.status === "Inactive" ? "Inactive" : "Active",
    };

    const [result] = await pool.query(
      `UPDATE elderly_medications
       SET elderly_id = :elderlyId,
           elderly_name = :elderlyName,
           medication_name = :medicationName,
           dosage = :dosage,
           instructions = :instructions,
           notes = :notes,
           medication_status = :status
       WHERE medication_id = :id`,
      data
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ error: "Medication not found." });
      return;
    }

    const [rows] = await pool.query(
      `SELECT ${elderlyMedicationColumns}
       FROM elderly_medications
       WHERE medication_id = :id`,
      { id }
    );

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({
      error: "Failed to update elderly medication.",
      details: error.message,
    });
  }
});

app.delete("/api/elderly-medications/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Valid medication id is required." });
    return;
  }

  try {
    const [result] = await pool.query(
      "DELETE FROM elderly_medications WHERE medication_id = :id",
      { id }
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ error: "Medication not found." });
      return;
    }

    res.status(204).end();
  } catch (error) {
    res.status(500).json({
      error: "Failed to delete elderly medication.",
      details: error.message,
    });
  }
});

app.get("/api/medications", async (req, res) => {
  const nurseName = String(req.query.nurseName || "").trim();
  const nurseId = String(req.query.nurseId || "").trim();

  try {
    const params = {};
    let where = "";

    if (nurseId) {
      params.nurseId = nurseId;
      where = "WHERE ml.nurse_id = :nurseId";
    } else if (nurseName) {
      params.nurseName = nurseName;
      where = "WHERE LOWER(n.name) = LOWER(:nurseName)";
    }

    const [medications] = await pool.query(
      `SELECT ${medicationAssignmentColumns}
       FROM medication_logs ml
       LEFT JOIN nurse n ON CAST(n.nurse_id AS CHAR) = CAST(ml.nurse_id AS CHAR)
       LEFT JOIN ${elderlyTable} e ON CAST(e.elderly_id AS CHAR) = CAST(ml.elderly_id AS CHAR)
       ${where}
       ORDER BY ml.scheduled_date ASC, ml.log_id DESC
       LIMIT 100`,
      params
    );

    res.json({ medications });
  } catch (error) {
    res.status(500).json({
      error: "Failed to load medication assignments.",
      details: error.message,
    });
  }
});

app.post("/api/medications", async (req, res) => {
  const payload = req.body;
  const scheduledDate = String(payload.scheduledDate || "").trim();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selectedDate = scheduledDate ? new Date(`${scheduledDate}T00:00:00`) : null;

  const errors = {};

  if (!String(payload.elderlyId || "").trim()) errors.elderlyId = "Select an elderly profile.";
  if (!String(payload.nurseName || "").trim()) errors.nurseName = "Assign caregiver or nurse is required.";
  if (!String(payload.medicationName || "").trim()) errors.medicationName = "Medicine name is required.";
  if (!String(payload.dosage || "").trim()) errors.dosage = "Dosage is required.";
  if (!String(payload.instructions || "").trim()) errors.instructions = "Quantity or dosage instruction is required.";
  if (!String(payload.scheduledTime || "").trim()) errors.scheduledTime = "Schedule time is required.";

  if (!scheduledDate) {
    errors.scheduledDate = "Date is required.";
  } else if (!selectedDate || Number.isNaN(selectedDate.getTime())) {
    errors.scheduledDate = "Enter a valid date.";
  } else if (selectedDate < today) {
    errors.scheduledDate = "Date cannot be in the past.";
  }

  if (Object.keys(errors).length > 0) {
    res.status(422).json({ valid: false, errors });
    return;
  }

  try {
    const data = {
      elderlyId: String(payload.elderlyId).trim(),
      scheduleId: Number(payload.scheduleId) || null,
      medicationId: Number(payload.medicationId) || null,
      nurseId: String(payload.nurseId || "").trim() || null,
      medicationName: String(payload.medicationName).trim(),
      dosage: String(payload.dosage).trim(),
      instructions: String(payload.instructions).trim(),
      scheduledTime: String(payload.scheduledTime).trim(),
      scheduledDate,
      complianceStatus: ["Pending", "Taken", "Missed", "Due Soon"].includes(payload.complianceStatus)
        ? payload.complianceStatus
        : "Pending",
    };

    const [result] = await pool.query(
      `INSERT INTO medication_logs (
        schedule_id, medication_id, nurse_id, elderly_id, medication_name, dosage,
        instructions, scheduled_time, scheduled_date, compliance_status
      ) VALUES (
        :scheduleId, :medicationId, :nurseId, :elderlyId, :medicationName, :dosage,
        :instructions, :scheduledTime, :scheduledDate, :complianceStatus
      )`,
      data
    );

    res.status(201).json({
      id: result.insertId,
      ...data,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to assign medication.",
      details: error.message,
    });
  }
});

app.patch("/api/medications/:id/status", async (req, res) => {
  const id = Number(req.params.id);
  const complianceStatus = String(req.body.complianceStatus || "").trim();
  const notes = String(req.body.notes || "").trim();

  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Valid medication assignment id is required." });
    return;
  }

  if (!["Pending", "Taken", "Missed", "Due Soon"].includes(complianceStatus)) {
    res.status(422).json({ error: "Valid compliance status is required." });
    return;
  }

  try {
    await pool.query(
      `UPDATE medication_logs
       SET compliance_status = :complianceStatus,
           report_notes = :notes,
           reported_at = CURRENT_TIMESTAMP
       WHERE log_id = :id`,
      { id, complianceStatus, notes }
    );

    const [rows] = await pool.query(
      `SELECT ${medicationAssignmentColumns}
       FROM medication_logs ml
       LEFT JOIN nurse n ON CAST(n.nurse_id AS CHAR) = CAST(ml.nurse_id AS CHAR)
       LEFT JOIN ${elderlyTable} e ON CAST(e.elderly_id AS CHAR) = CAST(ml.elderly_id AS CHAR)
       WHERE ml.log_id = :id`,
      { id }
    );

    if (!rows[0]) {
      res.status(404).json({ error: "Medication assignment not found." });
      return;
    }

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({
      error: "Failed to update medication status.",
      details: error.message,
    });
  }
});

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

function buildElderlyReportNote({ bpStatus, glucoseStatus, medicationTotal, medicationMissed }) {
  const notes = [];

  if (bpStatus === "Stable") notes.push("Blood pressure average is stable for the selected period.");
  else if (bpStatus === "High") notes.push("Blood pressure average is high. Continue monitoring and consider clinical follow-up.");
  else if (bpStatus === "Low") notes.push("Blood pressure average is low. Monitor for dizziness or weakness.");
  else notes.push("No blood pressure readings were recorded for this period.");

  if (glucoseStatus === "Stable") notes.push("Blood glucose average is stable.");
  else if (glucoseStatus === "High") notes.push("Blood glucose average is high. Review diet, medication timing, and care notes.");
  else if (glucoseStatus === "Low") notes.push("Blood glucose average is low. Watch for hypoglycemia symptoms.");
  else notes.push("No blood glucose readings were recorded for this period.");

  if (medicationTotal === 0) {
    notes.push("No medication assignments were recorded for this period.");
  } else if (medicationMissed === 0) {
    notes.push(`All ${medicationTotal} medication assignment(s) were completed without missed doses.`);
  } else {
    notes.push(`${medicationMissed} of ${medicationTotal} medication assignment(s) were missed.`);
  }

  return notes.join(" ");
}

app.get("/api/reports/elderly-summary", async (req, res) => {
  const elderlyId = String(req.query.elderlyId || "").trim();
  const startDate = normalizeScheduleDate(req.query.startDate || "");
  const endDate = normalizeScheduleDate(req.query.endDate || "");

  if (!elderlyId) {
    res.status(400).json({ error: "Elderly id is required." });
    return;
  }

  if (!startDate || !endDate) {
    res.status(400).json({ error: "Start date and end date are required." });
    return;
  }

  try {
    const validation = await validateReportWithCobol({ elderlyId, startDate, endDate });

    if (!validation.valid) {
      res.status(422).json(validation);
      return;
    }

    const [elderlyRows] = await pool.query(
      `SELECT ${elderlyColumns}
       FROM ${elderlyFromClause}
       WHERE ${elderlyTable}.elderly_id = :elderlyId
       LIMIT 1`,
      { elderlyId }
    );

    if (!elderlyRows[0]) {
      res.status(404).json({ error: "Elderly profile not found." });
      return;
    }

    const [bloodPressureRows] = await pool.query(
      `SELECT
         pressure_id AS id,
         schedule_id AS scheduleId,
         nurse_id AS nurseId,
         elderly_id AS elderlyId,
         DATE_FORMAT(recorded_date, '%Y-%m-%d') AS recordedDate,
         recorded_time AS recordedTime,
         systolic,
         diastolic
       FROM elderly_blood_pressure
       WHERE elderly_id = :elderlyId
         AND recorded_date BETWEEN :startDate AND :endDate
       ORDER BY recorded_date ASC, recorded_time ASC`,
      { elderlyId, startDate, endDate }
    );

    const [bloodGlucoseRows] = await pool.query(
      `SELECT
         glucose_id AS id,
         schedule_id AS scheduleId,
         nurse_id AS nurseId,
         elderly_id AS elderlyId,
         DATE_FORMAT(recorded_date, '%Y-%m-%d') AS recordedDate,
         recorded_time AS recordedTime,
         glucose_value AS glucoseValue
       FROM elderly_blood_glucose
       WHERE elderly_id = :elderlyId
         AND recorded_date BETWEEN :startDate AND :endDate
       ORDER BY recorded_date ASC, recorded_time ASC`,
      { elderlyId, startDate, endDate }
    );

    const [medications] = await pool.query(
      `SELECT ${medicationAssignmentColumns}
       FROM medication_logs ml
       LEFT JOIN nurse n ON CAST(n.nurse_id AS CHAR) = CAST(ml.nurse_id AS CHAR)
       LEFT JOIN ${elderlyTable} e ON CAST(e.elderly_id AS CHAR) = CAST(ml.elderly_id AS CHAR)
       WHERE ml.elderly_id = :elderlyId
         AND ml.scheduled_date BETWEEN :startDate AND :endDate
         AND ml.compliance_status <> 'Pending'
       ORDER BY ml.scheduled_date ASC, ml.scheduled_time ASC`,
      { elderlyId, startDate, endDate }
    );

    const vitals = [
      ...bloodPressureRows.map((item) => ({ ...item, glucoseValue: null, vitalType: "Blood Pressure" })),
      ...bloodGlucoseRows.map((item) => ({ ...item, systolic: null, diastolic: null, vitalType: "Blood Glucose" })),
    ].sort((a, b) => {
      const dateComparison = String(a.recordedDate).localeCompare(String(b.recordedDate));
      if (dateComparison !== 0) return dateComparison;
      return String(a.recordedTime).localeCompare(String(b.recordedTime));
    });

    const bpRows = bloodPressureRows.filter((item) => item.systolic !== null && item.diastolic !== null);
    const glucoseRows = bloodGlucoseRows.filter((item) => item.glucoseValue !== null);
    const reportCalculation = await calculateReportWithCobol({
      bpSystolicSum: bpRows.reduce((sum, item) => sum + Number(item.systolic || 0), 0),
      bpDiastolicSum: bpRows.reduce((sum, item) => sum + Number(item.diastolic || 0), 0),
      bpCount: bpRows.length,
      glucoseSum: glucoseRows.reduce((sum, item) => sum + Number(item.glucoseValue || 0), 0),
      glucoseCount: glucoseRows.length,
      medicationTotal: medications.length,
      medicationTaken: medications.filter((item) => item.complianceStatus === "Taken").length,
      medicationMissed: medications.filter((item) => item.complianceStatus === "Missed").length,
      medicationPending: medications.filter((item) => item.complianceStatus === "Pending").length,
      medicationDueSoon: medications.filter((item) => item.complianceStatus === "Due Soon").length,
    });

    res.json({
      elderly: elderlyRows[0],
      range: { startDate, endDate },
      bloodPressure: {
        averageSystolic: reportCalculation.averageSystolic,
        averageDiastolic: reportCalculation.averageDiastolic,
        readings: bpRows.length,
        status: reportCalculation.bloodPressureStatus,
      },
      bloodGlucose: {
        average: reportCalculation.averageGlucose,
        readings: glucoseRows.length,
        status: reportCalculation.bloodGlucoseStatus,
      },
      medication: {
        total: reportCalculation.medicationTotal,
        taken: reportCalculation.medicationTaken,
        missed: reportCalculation.medicationMissed,
        pending: reportCalculation.medicationPending,
        dueSoon: reportCalculation.medicationDueSoon,
        compliancePercent: reportCalculation.compliancePercent,
      },
      note: buildElderlyReportNote({
        bpStatus: reportCalculation.bloodPressureStatus,
        glucoseStatus: reportCalculation.bloodGlucoseStatus,
        medicationTotal: reportCalculation.medicationTotal,
        medicationMissed: reportCalculation.medicationMissed,
      }),
      vitals,
      medications,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to generate elderly report.",
      details: error.message,
    });
  }
});

app.post("/api/nurses", async (req, res) => {
  const profile = { ...req.body, type: "nurse" };
  const validation = await validateProfileWithCobol(profile);

  if (!validation.valid) {
    res.status(422).json(validation);
    return;
  }

  if (!allowedNursePositions.has(String(profile.position || "").trim())) {
    res.status(422).json({
      valid: false,
      errors: { position: "Position must be Assistant Nurse, Junior Nurse, Senior Nurse, or Head Nurse." },
    });
    return;
  }

  try {
    const data = {
      name: String(profile.name || "").trim(),
      age: Number(profile.age) || 0,
      gender: String(profile.gender || "").toLowerCase(),
      phone: String(profile.phone || "").trim(),
      email: String(profile.email || "").trim(),
      licenseNumber: Number(profile.licenseNumber || profile.license_number) || 0,
      position: String(profile.position || "").trim(),
      shiftSchedule: String(profile.shiftSchedule || profile.shift_schedule || "").trim(),
      username: String(profile.username || "").trim(),
      password: String(profile.password || "").trim(),
      address: String(profile.address || "").trim(),
      avatar: String(profile.avatar || "").trim(),
      hireDate: normalizeHireDate(profile.hireDate || profile.hire_date),
      nurseStatus: toDbNurseStatus(profile.nurseStatus || profile.status),
    };

    const [result] = await pool.query(
      `INSERT INTO nurse (
        name,
        age,
        gender,
        phone,
        email,
        license_number,
        position,
        shift_schedule,
        username,
        password,
        address,
        avatar,
        hire_date,
        created_at,
        nurse_status
      ) VALUES (
        :name,
        :age,
        :gender,
        :phone,
        :email,
        :licenseNumber,
        :position,
        :shiftSchedule,
        :username,
        :password,
        :address,
        :avatar,
        :hireDate,
        CURRENT_TIMESTAMP,
        :nurseStatus
      )`,
      data
    );

    const createdNurseId = Number(result.insertId);
    const [rows] = await pool.query(`SELECT ${nurseColumns} FROM nurse WHERE nurse_id = ${createdNurseId}`);
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({
      error: "Failed to create nurse profile",
      details: error.message,
    });
  }
});

app.put("/api/nurses/:id", async (req, res) => {
  const nurseId = getNurseDbId(req.params.id);

  if (!Number.isInteger(nurseId) || nurseId <= 0) {
    res.status(400).json({ error: "Valid nurse id is required." });
    return;
  }

  let existingNurse;

  try {
    const [existingRows] = await pool.query(
      `SELECT
         username,
         password,
         license_number AS licenseNumber,
         shift_schedule AS shiftSchedule
       FROM nurse
       WHERE nurse_id = ${nurseId}
       LIMIT 1`
    );

    existingNurse = existingRows[0];

    if (!existingNurse) {
      res.status(404).json({ error: "Nurse profile not found." });
      return;
    }
  } catch (error) {
    console.error("Failed to load nurse profile:", error);
    res.status(500).json({
      error: "Failed to load nurse profile",
      details: error.message,
    });
    return;
  }

  const profile = {
    ...req.body,
    licenseNumber: req.body.licenseNumber ?? req.body.license_number ?? existingNurse.licenseNumber ?? "",
    shiftSchedule: req.body.shiftSchedule ?? req.body.shift_schedule ?? existingNurse.shiftSchedule ?? "",
    username: String(req.body.username || existingNurse.username || "").trim(),
    password: String(req.body.password || existingNurse.password || "").trim(),
    nurseStatus: req.body.nurseStatus || req.body.status || "Active",
    status: req.body.status || req.body.nurseStatus || "Active",
  };

  const errors = {};
  const age = Number(profile.age);

  if (!String(profile.name || "").trim()) errors.name = "Full name is required.";
  if (!Number.isInteger(age) || age < 18 || age > 80) errors.age = "Caregiver age must be between 18 and 80.";
  if (!String(profile.gender || "").trim()) errors.gender = "Gender is required.";
  if (!/^09-\d{9}$/.test(String(profile.phone || "").trim())) errors.phone = "Phone must use format 09-#########.";
  if (!/^[A-Za-z][A-Za-z0-9._%+-]*@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(String(profile.email || "").trim())) {
    errors.email = "Email must include @ and a valid domain.";
  }
  if (!String(profile.address || "").trim()) errors.address = "Address is required.";
  if (!String(profile.position || "").trim()) errors.position = "Position is required.";
  else if (!allowedNursePositions.has(String(profile.position || "").trim())) {
    errors.position = "Position must be Assistant Nurse, Junior Nurse, Senior Nurse, or Head Nurse.";
  }
  if (!String(profile.hireDate || profile.hire_date || "").trim()) errors.hireDate = "Hire date is required.";

  if (Object.keys(errors).length > 0) {
    res.status(422).json({ valid: false, errors });
    return;
  }

  try {
    const data = {
      nurseId,
      name: String(profile.name || "").trim(),
      age,
      gender: String(profile.gender || "").toLowerCase(),
      phone: String(profile.phone || "").trim(),
      email: String(profile.email || "").trim(),
      licenseNumber: String(profile.licenseNumber || "").trim(),
      position: String(profile.position || "").trim(),
      shiftSchedule: String(profile.shiftSchedule || "").trim(),
      username: String(profile.username || "").trim(),
      password: String(profile.password || "").trim(),
      address: String(profile.address || "").trim(),
      avatar: String(profile.avatar || "").trim(),
      hireDate: normalizeHireDate(profile.hireDate || profile.hire_date),
      nurseStatus: toDbNurseStatus(profile.nurseStatus || profile.status),
    };

    await transaction(async (connection) => {
      await connection.query(
        `UPDATE nurse
         SET
           name = :name,
           age = :age,
           gender = :gender,
           phone = :phone,
           email = :email,
           license_number = :licenseNumber,
           position = :position,
           shift_schedule = :shiftSchedule,
           username = :username,
           password = :password,
           address = :address,
           avatar = :avatar,
           hire_date = :hireDate,
           nurse_status = :nurseStatus
         WHERE nurse_id = :nurseId`,
        data
      );
    });

    const [rows] = await pool.query(`SELECT ${nurseColumns} FROM nurse WHERE nurse_id = ${nurseId}`);

    if (!rows[0]) {
      res.status(404).json({ error: "Nurse profile not found." });
      return;
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Failed to update nurse profile:", error);
    res.status(500).json({
      error: "Failed to update nurse profile",
      details: error.message,
    });
  }
});

app.delete("/api/nurses/:id", async (req, res) => {
  const nurseId = getNurseDbId(req.params.id);

  if (!Number.isInteger(nurseId) || nurseId <= 0) {
    res.status(400).json({ error: "Valid nurse id is required." });
    return;
  }

  try {
    const result = await transaction(async (connection) => {
      await connection.query("DELETE FROM `schedule` WHERE nurse_id = :nurseId", { nurseId });
      await connection.query("DELETE FROM nurse_elderly_assignments WHERE nurse_id = :nurseId", { nurseId });
      const [deleteResult] = await connection.query("DELETE FROM nurse WHERE nurse_id = :nurseId", { nurseId });
      return deleteResult;
    });

    if (result.affectedRows === 0) {
      res.status(404).json({ error: "Nurse profile not found." });
      return;
    }

    res.status(204).end();
  } catch (error) {
    res.status(500).json({
      error: "Failed to delete nurse profile",
      details: error.message,
    });
  }
});

app.listen(port, async () => {
  try {
    await checkDatabase();
    await ensureRoomsTable();
    await ensureElderlyAvatarColumn();
    await ensureAdminProfileColumns();
    await ensureNurseColumns();
    await ensureNurseCreatedAtColumn();
    await ensureNurseElderlyAssignmentsTable();
    await ensureScheduleColumns();
    await ensureElderlyMedicationsTable();
    await ensureMedicationLogsTable();
    await ensureBloodPressureAndGlucoseTables();
    await ensureHealthLogScheduleColumn();
    console.log(`API server running at http://localhost:${port}`);
    console.log("MySQL connection successful for database eldercare");
  } catch (error) {
    console.error("API server started, but MySQL connection failed:");
    console.error(error.message);
    console.error("Verify XAMPP MySQL is running and that the root account can access the eldercare database.");
  }
});
