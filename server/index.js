import express from "express";
import { checkDatabase, pool } from "./db.js";
import { validateProfileWithCobol } from "./profileValidator.js";
import { validateScheduleWithCobol } from "./scheduleValidator.js";

const app = express();
const port = Number(process.env.SERVER_PORT || 3001);
const elderlyTable = process.env.ELDERLY_TABLE || "elderly";

app.use(express.json({ limit: "5mb" }));

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
}

async function ensureMedicationAssignmentsTable() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS medication_assignments (
      assignment_id INT AUTO_INCREMENT PRIMARY KEY,
      elderly_id VARCHAR(40) NOT NULL,
      elderly_name VARCHAR(120) NOT NULL,
      nurse_name VARCHAR(120) NOT NULL,
      medication_name VARCHAR(160) NOT NULL,
      dosage VARCHAR(80) NOT NULL,
      instructions VARCHAR(500) NOT NULL,
      scheduled_time VARCHAR(20) NOT NULL,
      scheduled_date DATE NOT NULL,
      compliance_status ENUM('Pending', 'Taken', 'Missed', 'Due Soon') NOT NULL DEFAULT 'Pending',
      notes TEXT,
      report_notes TEXT,
      reported_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_medication_assignments_elderly_id (elderly_id),
      INDEX idx_medication_assignments_scheduled_date (scheduled_date)
    )`
  );

  try {
    await pool.query("ALTER TABLE medication_assignments ADD COLUMN report_notes TEXT NULL");
  } catch (error) {
    if (error.code !== "ER_DUP_FIELDNAME") throw error;
  }

  try {
    await pool.query("ALTER TABLE medication_assignments ADD COLUMN reported_at TIMESTAMP NULL");
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
}

const elderlyColumns = `
  elderly_id AS id,
  name,
  age,
  gender,
  phone,
  medical_conditions AS medicalCondition,
  emergency_name AS emergencyContact,
  COALESCE(emergency_address, '') AS emergencyAddress,
  CASE elderly_status
    WHEN 'active' THEN 'Active'
    ELSE 'Inactive'
  END AS status,
  COALESCE(NULLIF(avatar, ''), 'https://i.pravatar.cc/40') AS avatar,
  DATE_FORMAT(birthdate, '%Y-%m-%d') AS dob,
  address,
  blood_type AS bloodType,
  allergies,
  '' AS doctorName,
  '' AS relationship,
  emergency_phone AS emergencyPhone,
  DATE_FORMAT(enroll_date, '%Y-%m-%d %H:%i:%s') AS admissionDate,
  '' AS notes
`;

const nurseColumns = `
  CONCAT('NRS-', LPAD(nurse_id, 4, '0')) AS id,
  nurse_id AS nurseId,
  name,
  age,
  gender,
  phone,
  email,
  license_number AS licenseNumber,
  position,
  shift_schedule AS shiftSchedule,
  work_area AS workArea,
  username,
  address,
  DATE_FORMAT(hire_date, '%Y-%m-%d') AS hireDate,
  CASE nurse_status
    WHEN 'active' THEN 'Active'
    WHEN 'suspended' THEN 'Suspended'
    WHEN 'resigned' THEN 'Resigned'
    ELSE 'Active'
  END AS status,
  COALESCE(NULLIF(avatar, ''), 'https://i.pravatar.cc/40?img=49') AS avatar,
  0 AS assignedElders,
  CASE nurse_status
    WHEN 'active' THEN 'Active'
    WHEN 'suspended' THEN 'Suspended'
    WHEN 'resigned' THEN 'Resigned'
    ELSE 'Active'
  END AS nurseStatus
`;

function getNurseDbId(id) {
  const value = String(id || "").trim();

  if (value.startsWith("NRS-")) {
    return Number(value.replace("NRS-", ""));
  }

  return Number(value);
}

function toDbNurseStatus(status) {
  const value = String(status || "").toLowerCase();

  if (value === "suspended") return "suspended";
  if (value === "resigned") return "resigned";
  if (value === "on leave") return "suspended";

  return "active";
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
       LEFT JOIN nurse n ON CAST(n.nurse_id AS CHAR) = CAST(s.nurse_id AS CHAR)
       LEFT JOIN ${elderlyTable} e ON CAST(e.elderly_id AS CHAR) = CAST(s.elderly_id AS CHAR)
       ${where}
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

async function selectScheduleById(id) {
  const [rows] = await pool.query(
    `SELECT ${scheduleColumns}
     FROM \`schedule\` s
     LEFT JOIN nurse n ON CAST(n.nurse_id AS CHAR) = CAST(s.nurse_id AS CHAR)
     LEFT JOIN ${elderlyTable} e ON CAST(e.elderly_id AS CHAR) = CAST(s.elderly_id AS CHAR)
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
     LEFT JOIN nurse n ON CAST(n.nurse_id AS CHAR) = CAST(s.nurse_id AS CHAR)
     LEFT JOIN ${elderlyTable} e ON CAST(e.elderly_id AS CHAR) = CAST(s.elderly_id AS CHAR)
     WHERE CAST(s.nurse_id AS CHAR) = :nurseId
       AND s.visit_time = :visitTime
       AND s.schedule_status <> 'cancelled'
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

app.post("/api/schedules", async (req, res) => {
  const payload = req.body;
  const visitDate = normalizeScheduleDate(payload.visitDate);
  const visitTime = String(payload.visitTime || "").trim();
  const allowedStatuses = ["scheduled", "completed", "missed", "cancelled"];
  const errors = validateSchedulePayload(payload, visitDate, visitTime);

  if (Object.keys(errors).length > 0) {
    res.status(422).json({ valid: false, errors });
    return;
  }

  const validation = await validateScheduleWithCobol({
    nurseId: payload.nurseId,
    elderlyId: payload.elderlyId,
    visitDate,
    visitTime,
    purpose: payload.purpose,
    scheduleStatus: payload.scheduleStatus || "scheduled",
    slotLockDate: normalizeScheduleDate(payload.slotLockDate),
    slotLockHour: String(payload.slotLockHour || "").trim(),
  });

  if (!validation.valid) {
    res.status(422).json(validation);
    return;
  }

  const data = {
    nurseId: String(payload.nurseId).trim(),
    elderlyId: String(payload.elderlyId).trim(),
    visitTime: `${visitDate} ${visitTime.length === 5 ? `${visitTime}:00` : visitTime}`,
    visitDate: `${visitDate} 00:00:00`,
    purpose: String(payload.purpose).trim(),
    scheduleStatus: allowedStatuses.includes(String(payload.scheduleStatus || "").toLowerCase())
      ? String(payload.scheduleStatus).toLowerCase()
      : "scheduled",
    recurringGroupId: String(payload.recurringGroupId || "").trim() || null,
    recurringSequence: Number.isInteger(Number(payload.recurringSequence))
      ? Number(payload.recurringSequence)
      : null,
  };

  try {
    const conflict = await findNurseScheduleConflict({
      nurseId: data.nurseId,
      visitDate,
      visitTime,
    });

    if (conflict) {
      sendNurseScheduleConflict(res, conflict);
      return;
    }

    const [result] = await pool.query(
      `INSERT INTO \`schedule\` (
         nurse_id, elderly_id, visit_time, visit_date, purpose, schedule_status,
         recurring_group_id, recurring_sequence
       ) VALUES (
         :nurseId, :elderlyId, :visitTime, :visitDate, :purpose, :scheduleStatus,
         :recurringGroupId, :recurringSequence
       )`,
      data
    );

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
  const allowedStatuses = ["scheduled", "completed", "missed", "cancelled"];
  const errors = validateSchedulePayload(payload, visitDate, visitTime);

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

    const validation = await validateScheduleWithCobol({
      nurseId: payload.nurseId,
      elderlyId: payload.elderlyId,
      visitDate,
      visitTime,
      purpose: payload.purpose,
      scheduleStatus: payload.scheduleStatus || "scheduled",
      allowPastDateTime: dateTimeUnchanged ? "Y" : "N",
    });

    if (!validation.valid) {
      res.status(422).json(validation);
      return;
    }

    const baseData = {
      id,
      nurseId: String(payload.nurseId).trim(),
      elderlyId: String(payload.elderlyId).trim(),
      visitTime: `${visitDate} ${visitTime.length === 5 ? `${visitTime}:00` : visitTime}`,
      visitDate: `${visitDate} 00:00:00`,
      purpose: String(payload.purpose).trim(),
      scheduleStatus: allowedStatuses.includes(String(payload.scheduleStatus || "").toLowerCase())
        ? String(payload.scheduleStatus).toLowerCase()
        : "scheduled",
      recurringGroupId: String(payload.recurringGroupId || "").trim() || null,
      recurringSequence: Number.isInteger(Number(payload.recurringSequence))
        ? Number(payload.recurringSequence)
        : null,
    };

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

      const [result] = await pool.query(
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

      await pool.query(
        "DELETE FROM `schedule` WHERE recurring_group_id = :recurringGroupId",
        { recurringGroupId: existingSchedule.recurringGroupId }
      );

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

        await pool.query(
          `UPDATE \`schedule\`
           SET nurse_id = :nurseId,
               elderly_id = :elderlyId,
               visit_time = :visitTime,
               visit_date = :visitDate,
               purpose = :purpose,
               schedule_status = :scheduleStatus
           WHERE schedule_id = :id`,
          {
            ...baseData,
            id: groupRow.id,
            visitTime: `${nextVisitDate} ${visitTime.length === 5 ? `${visitTime}:00` : visitTime}`,
            visitDate: `${nextVisitDate} 00:00:00`,
          }
        );
      }

      const [updatedSchedules] = await pool.query(
        `SELECT ${scheduleColumns}
         FROM \`schedule\` s
         LEFT JOIN nurse n ON CAST(n.nurse_id AS CHAR) = CAST(s.nurse_id AS CHAR)
         LEFT JOIN ${elderlyTable} e ON CAST(e.elderly_id AS CHAR) = CAST(s.elderly_id AS CHAR)
         WHERE s.recurring_group_id = :recurringGroupId
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

    const [result] = await pool.query(
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
    const [result] = await pool.query(
      "UPDATE `schedule` SET schedule_status = :scheduleStatus WHERE schedule_id = :id",
      { id, scheduleStatus }
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ error: "Schedule not found." });
      return;
    }

    res.json(await selectScheduleById(id));
  } catch (error) {
    res.status(500).json({ error: "Failed to update schedule.", details: error.message });
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

    const [result] = await pool.query(sql, params);

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
      `SELECT ${elderlyColumns} FROM ${elderlyTable} ORDER BY elderly_id`
    );

    let nurses = [];

    try {
      const [nurseRows] = await pool.query(
        `SELECT ${nurseColumns} FROM nurse ORDER BY nurse_id`
      );
      nurses = nurseRows;
    } catch (error) {
      if (error.code !== "ER_NO_SUCH_TABLE") throw error;
      console.warn("nurse table not found. Returning elderly profiles only.");
    }

    res.json({ elderly, nurses });
  } catch (error) {
    res.status(500).json({
      error: "Failed to load profiles",
      details: error.message,
    });
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
      avatar: profile.avatar || "",
    };

    const [result] = await pool.query(
      `INSERT INTO ${elderlyTable} (
        name, age, gender, birthdate, address, phone, medical_conditions,
        allergies, blood_type, emergency_name, emergency_phone, emergency_address, avatar
      ) VALUES (
        :name, :age, :gender, :birthdate, :address, :phone,
        :medicalCondition, :allergies, :bloodType, :emergencyName,
        :emergencyPhone, :emergencyAddress, :avatar
      )`,
      data
    );

    const [rows] = await pool.query(
      `SELECT ${elderlyColumns} FROM ${elderlyTable} WHERE elderly_id = :elderlyId`,
      { elderlyId: result.insertId }
    );

    res.status(201).json(rows[0]);
  } catch (error) {
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
       FROM ${elderlyTable}
       WHERE name LIKE :name
       ORDER BY name
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
      elderlyStatus: profile.status === "Inactive" ? "passed away" : "active",
      avatar: profile.avatar || "",
    };

    await pool.query(
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
           elderly_status = :elderlyStatus,
           avatar = :avatar
       WHERE elderly_id = :id`,
      data
    );

    const [rows] = await pool.query(
      `SELECT ${elderlyColumns} FROM ${elderlyTable} WHERE elderly_id = :id`,
      { id }
    );

    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({
      error: "Failed to update elderly profile",
      details: error.message,
    });
  }
});

app.delete("/api/elderly/:id", async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM ${elderlyTable} WHERE elderly_id = :id`,
      { id: req.params.id }
    );

    res.status(204).end();
  } catch (error) {
    res.status(500).json({
      error: "Failed to delete elderly profile",
      details: error.message,
    });
  }
});

const medicationAssignmentColumns = `
  assignment_id AS id,
  elderly_id AS elderlyId,
  elderly_name AS elderlyName,
  nurse_name AS nurseName,
  medication_name AS medicationName,
  dosage,
  instructions,
  scheduled_time AS scheduledTime,
  DATE_FORMAT(scheduled_date, '%Y-%m-%d') AS scheduledDate,
  compliance_status AS complianceStatus,
  notes,
  report_notes AS reportNotes,
  DATE_FORMAT(reported_at, '%Y-%m-%d %H:%i:%s') AS reportedAt,
  DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS createdAt
`;

app.get("/api/medications", async (req, res) => {
  const nurseName = String(req.query.nurseName || "").trim();

  try {
    const params = {};
    let where = "";

    if (nurseName) {
      params.nurseName = nurseName;
      where = "WHERE LOWER(nurse_name) = LOWER(:nurseName)";
    }

    const [medications] = await pool.query(
      `SELECT ${medicationAssignmentColumns}
       FROM medication_assignments
       ${where}
       ORDER BY scheduled_date ASC, assignment_id DESC
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
      elderlyName: String(payload.elderlyName || "").trim(),
      nurseName: String(payload.nurseName).trim(),
      medicationName: String(payload.medicationName).trim(),
      dosage: String(payload.dosage).trim(),
      instructions: String(payload.instructions).trim(),
      scheduledTime: String(payload.scheduledTime).trim(),
      scheduledDate,
      complianceStatus: ["Pending", "Taken", "Missed", "Due Soon"].includes(payload.complianceStatus)
        ? payload.complianceStatus
        : "Pending",
      notes: String(payload.notes || "").trim(),
    };

    const [result] = await pool.query(
      `INSERT INTO medication_assignments (
        elderly_id, elderly_name, nurse_name, medication_name, dosage,
        instructions, scheduled_time, scheduled_date, compliance_status, notes
      ) VALUES (
        :elderlyId, :elderlyName, :nurseName, :medicationName, :dosage,
        :instructions, :scheduledTime, :scheduledDate, :complianceStatus, :notes
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
      `UPDATE medication_assignments
       SET compliance_status = :complianceStatus,
           report_notes = :notes,
           reported_at = CURRENT_TIMESTAMP
       WHERE assignment_id = :id`,
      { id, complianceStatus, notes }
    );

    const [rows] = await pool.query(
      `SELECT ${medicationAssignmentColumns}
       FROM medication_assignments
       WHERE assignment_id = :id`,
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

app.post("/api/nurses", async (req, res) => {
  const profile = { ...req.body, type: "nurse" };
  const validation = await validateProfileWithCobol(profile);

  if (!validation.valid) {
    res.status(422).json(validation);
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
      workArea: String(profile.workArea || profile.work_area || "").trim(),
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
        work_area,
        username,
        password,
        address,
        avatar,
        hire_date,
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
        :workArea,
        :username,
        :password,
        :address,
        :avatar,
        :hireDate,
        :nurseStatus
      )`,
      data
    );

    const [rows] = await pool.query(`SELECT ${nurseColumns} FROM nurse WHERE nurse_id = :nurseId`, {
      nurseId: Number(result.insertId),
    });
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

  const profile = { ...req.body, type: "nurse" };
  const validation = await validateProfileWithCobol(profile);

  if (!validation.valid) {
    res.status(422).json(validation);
    return;
  }

  try {
    const data = {
      nurseId,
      name: String(profile.name || "").trim(),
      age: Number(profile.age) || 0,
      gender: String(profile.gender || "").toLowerCase(),
      phone: String(profile.phone || "").trim(),
      email: String(profile.email || "").trim(),
      licenseNumber: Number(profile.licenseNumber || profile.license_number) || 0,
      position: String(profile.position || "").trim(),
      shiftSchedule: String(profile.shiftSchedule || profile.shift_schedule || "").trim(),
      workArea: String(profile.workArea || profile.work_area || "").trim(),
      username: String(profile.username || "").trim(),
      password: String(profile.password || "").trim(),
      address: String(profile.address || "").trim(),
      avatar: String(profile.avatar || "").trim(),
      hireDate: normalizeHireDate(profile.hireDate || profile.hire_date),
      nurseStatus: toDbNurseStatus(profile.nurseStatus || profile.status),
    };

    await pool.query(
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
         work_area = :workArea,
         username = :username,
         password = :password,
         address = :address,
         avatar = :avatar,
         hire_date = :hireDate,
         nurse_status = :nurseStatus
       WHERE nurse_id = :nurseId`,
      data
    );

    const [rows] = await pool.query(`SELECT ${nurseColumns} FROM nurse WHERE nurse_id = :nurseId`, { nurseId });

    if (!rows[0]) {
      res.status(404).json({ error: "Nurse profile not found." });
      return;
    }

    res.json(rows[0]);
  } catch (error) {
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
    const [result] = await pool.query("DELETE FROM nurse WHERE nurse_id = :nurseId", { nurseId });

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
    await ensureElderlyAvatarColumn();
    await ensureAdminProfileColumns();
    await ensureNurseColumns();
    await ensureMedicationAssignmentsTable();
    console.log(`API server running at http://localhost:${port}`);
  } catch (error) {
    console.error("API server started, but MySQL connection failed:");
    console.error(error.message);
  }
});
