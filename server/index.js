import express from "express";
import { checkDatabase, pool } from "./db.js";

const app = express();
const port = Number(process.env.SERVER_PORT || 3001);

app.use(express.json());

const elderlyColumns = `
  id,
  name,
  age,
  gender,
  phone,
  medical_condition AS medicalCondition,
  emergency_contact AS emergencyContact,
  status,
  avatar,
  dob,
  address,
  blood_type AS bloodType,
  allergies,
  doctor_name AS doctorName,
  relationship,
  emergency_phone AS emergencyPhone,
  admission_date AS admissionDate,
  notes
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
    const [elderly] = await pool.query(`SELECT ${elderlyColumns} FROM elderly_profiles ORDER BY id`);
    const [nurses] = await pool.query(`SELECT ${nurseColumns} FROM nurse_profiles ORDER BY id`);

    res.json({ elderly, nurses });
  } catch (error) {
    res.status(500).json({ error: "Failed to load profiles", details: error.message });
  }
});

app.put("/api/elderly/:id", async (req, res) => {
  const { id } = req.params;
  const profile = req.body;

  try {
    await pool.query(
      `UPDATE elderly_profiles
       SET name = :name,
           age = :age,
           gender = :gender,
           phone = :phone,
           medical_condition = :medicalCondition,
           emergency_contact = :emergencyContact,
           status = :status,
           avatar = :avatar,
           dob = :dob,
           address = :address,
           blood_type = :bloodType,
           allergies = :allergies,
           doctor_name = :doctorName,
           relationship = :relationship,
           emergency_phone = :emergencyPhone,
           admission_date = :admissionDate,
           notes = :notes
       WHERE id = :id`,
      { ...profile, id, age: Number(profile.age) || 0 }
    );

    const [rows] = await pool.query(`SELECT ${elderlyColumns} FROM elderly_profiles WHERE id = ?`, [id]);
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: "Failed to update elderly profile", details: error.message });
  }
});

app.delete("/api/elderly/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM elderly_profiles WHERE id = ?", [req.params.id]);
    res.status(204).end();
  } catch (error) {
    res.status(500).json({ error: "Failed to delete elderly profile", details: error.message });
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
    console.log(`API server running at http://localhost:${port}`);
  } catch (error) {
    console.error("API server started, but MySQL connection failed:");
    console.error(error.message);
  }
});
