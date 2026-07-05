import express from "express";
import { checkDatabase, pool } from "./db.js";
import { validateProfileWithCobol } from "./profileValidator.js";

const app = express();
const port = Number(process.env.SERVER_PORT || 3002);
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
  id,
  name,
  age,
  gender,
  phone,
  email,
  position,
  hire_date AS hireDate,
  status,
  avatar,
  assigned_elders AS assignedElders,
  work_area AS workArea,
  nurse_status AS nurseStatus
`;

app.get("/api/health", async (_req, res) => {
  try {
    await checkDatabase();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/profiles", async (_req, res) => {
  try {
    const [elderly] = await pool.query(`SELECT ${elderlyColumns} FROM ${elderlyTable} ORDER BY elderly_id`);
    let nurses = [];

    try {
      const [nurseRows] = await pool.query(`SELECT ${nurseColumns} FROM nurse_profiles ORDER BY id`);
      nurses = nurseRows;
    } catch (error) {
      if (error.code !== "ER_NO_SUCH_TABLE") throw error;
      console.warn("nurse_profiles table not found. Returning elderly profiles only.");
    }

    res.json({ elderly, nurses });
  } catch (error) {
    res.status(500).json({ error: "Failed to load profiles", details: error.message });
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
    res.status(500).json({ error: "Failed to load admin login history.", details: error.message });
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
    res.status(500).json({ error: "Failed to record admin logout.", details: error.message });
  }
});

app.post("/api/auth/admin-login", async (req, res) => {
  const login = String(req.body.login || "").trim();
  const password = String(req.body.password || "");

  if (!login || !password) {
    res.status(400).json({ error: "Username/email and password are required." });
    return;
  }

  try {
    const [rows] = await pool.query(
      `SELECT admin_id, username, password, name, email, admin_status
       FROM admin
       WHERE username = :login OR email = :login
       LIMIT 1`,
      { login }
    );

    const admin = rows[0];

    if (!admin || admin.password !== password) {
      res.status(401).json({ error: "Incorrect admin username/email or password." });
      return;
    }

    if (admin.admin_status && admin.admin_status !== "active") {
      res.status(403).json({ error: "This admin account is suspended." });
      return;
    }

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

    res.json({
      role: "admin",
      id: admin.admin_id,
      username: admin.username,
      name: admin.name,
      email: admin.email,
      loginHistoryId: loginHistory.insertId,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to sign in admin.", details: error.message });
  }
});

async function nextProfileId(table, prefix) {
  const [rows] = await pool.query(`SELECT id FROM ${table} ORDER BY id DESC LIMIT 1`);
  const lastId = rows[0]?.id || `${prefix}-0000`;
  const nextNumber = Number(String(lastId).replace(`${prefix}-`, "")) + 1;
  return `${prefix}-${String(nextNumber).padStart(4, "0")}`;
}

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

    const [rows] = await pool.query(`SELECT ${elderlyColumns} FROM ${elderlyTable} WHERE elderly_id = ?`, [
      result.insertId,
    ]);
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to create elderly profile", details: error.message });
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
      `SELECT ${elderlyColumns} FROM ${elderlyTable} WHERE name LIKE ? ORDER BY name LIMIT 10`,
      [`${name}%`]
    );
    res.json({ elderly });
  } catch (error) {
    res.status(500).json({ error: "Failed to search elderly profiles", details: error.message });
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

    const [rows] = await pool.query(`SELECT ${elderlyColumns} FROM ${elderlyTable} WHERE elderly_id = ?`, [id]);
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to update elderly profile", details: error.message });
  }
});

app.delete("/api/elderly/:id", async (req, res) => {
  try {
    await pool.query(`DELETE FROM ${elderlyTable} WHERE elderly_id = ?`, [req.params.id]);
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete elderly profile", details: error.message });
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
    const id = await nextProfileId("nurse_profiles", "NRS");
    const data = {
      id,
      name: String(profile.name || "").trim(),
      age: Number(profile.age),
      gender: profile.gender,
      phone: profile.phone || "",
      email: profile.email || "",
      position: profile.position || "",
      hireDate: profile.hireDate || "",
      status: profile.nurseStatus === "On Leave" ? "On Leave" : "Active",
      avatar: profile.avatar || "https://i.pravatar.cc/40?img=49",
      assignedElders: Number(profile.assignedElders) || 0,
      workArea: profile.workArea || "",
      nurseStatus: profile.nurseStatus || "Active",
    };

    await pool.query(
      `INSERT INTO nurse_profiles (
        id, name, age, gender, phone, email, position, hire_date, status,
        avatar, assigned_elders, work_area, nurse_status
      ) VALUES (
        :id, :name, :age, :gender, :phone, :email, :position, :hireDate,
        :status, :avatar, :assignedElders, :workArea, :nurseStatus
      )`,
      data
    );

    const [rows] = await pool.query(`SELECT ${nurseColumns} FROM nurse_profiles WHERE id = ?`, [id]);
    res.status(201).json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to create nurse profile", details: error.message });
  }
});

app.put("/api/nurses/:id", async (req, res) => {
  const { id } = req.params;
  const profile = req.body;

  try {
    await pool.query(
      `UPDATE nurse_profiles
       SET name = :name,
           age = :age,
           gender = :gender,
           phone = :phone,
           email = :email,
           position = :position,
           hire_date = :hireDate,
           status = :status,
           avatar = :avatar,
           assigned_elders = :assignedElders,
           work_area = :workArea,
           nurse_status = :nurseStatus
       WHERE id = :id`,
      {
        ...profile,
        id,
        age: Number(profile.age) || 0,
        assignedElders: Number(profile.assignedElders) || 0,
      }
    );

    const [rows] = await pool.query(`SELECT ${nurseColumns} FROM nurse_profiles WHERE id = ?`, [id]);
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to update nurse profile", details: error.message });
  }
});

app.delete("/api/nurses/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM nurse_profiles WHERE id = ?", [req.params.id]);
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete nurse profile", details: error.message });
  }
});

app.listen(port, async () => {
  try {
    await checkDatabase();
    await ensureElderlyAvatarColumn();
    console.log(`API server running at http://localhost:${port}`);
  } catch (error) {
    console.error("API server started, but MySQL connection failed:");
    console.error(error.message);
  }
});
