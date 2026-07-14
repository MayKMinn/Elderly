CREATE DATABASE IF NOT EXISTS eldercare;
USE eldercare;

CREATE TABLE IF NOT EXISTS elderly (
  elderly_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  age INT NOT NULL,
  gender ENUM('male', 'female', 'other') NOT NULL,
  birthdate DATETIME DEFAULT CURRENT_TIMESTAMP,
  address VARCHAR(500) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  medical_conditions VARCHAR(500) NOT NULL,
  allergies VARCHAR(300) NOT NULL,
  blood_type VARCHAR(10) NOT NULL,
  emergency_name VARCHAR(100) NOT NULL,
  emergency_phone VARCHAR(20) NOT NULL,
  emergency_address VARCHAR(500),
  room_id INT NULL,
  elderly_status ENUM('active', 'passed away') DEFAULT 'active',
  enroll_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  avatar MEDIUMTEXT,
  UNIQUE KEY unique_elderly_room (room_id)
);

CREATE TABLE IF NOT EXISTS rooms (
  room_id INT AUTO_INCREMENT PRIMARY KEY,
  floor_number INT NOT NULL,
  room_number INT NOT NULL,
  room_label VARCHAR(20) GENERATED ALWAYS AS (CONCAT('F', floor_number, '-R', LPAD(room_number, 2, '0'))) STORED,
  UNIQUE KEY unique_floor_room (floor_number, room_number),
  CONSTRAINT chk_floor_number CHECK (floor_number BETWEEN 1 AND 4),
  CONSTRAINT chk_room_number CHECK (room_number BETWEEN 1 AND 15)
);

CREATE TABLE IF NOT EXISTS nurse (
  nurse_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  age INT NOT NULL,
  gender ENUM('male', 'female', 'other') NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(30) NOT NULL,
  license_number INT NOT NULL,
  position ENUM('Assistant Nurse', 'Junior Nurse', 'Senior Nurse', 'Head Nurse') NOT NULL,
  shift_schedule VARCHAR(50) NOT NULL,
  username VARCHAR(30) NOT NULL,
  password VARCHAR(100) NOT NULL,
  address VARCHAR(500) NOT NULL,
  hire_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  nurse_status ENUM('active', 'suspended', 'resigned') DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS schedule (
  schedule_id INT AUTO_INCREMENT PRIMARY KEY,
  nurse_id INT NOT NULL,
  elderly_id INT NOT NULL,
  visit_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  visit_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  purpose ENUM('Blood Pressure', 'Blood Glucose', 'Medication', 'Routine Visit', 'Vitals Check', 'Medication Check', 'Emergency Follow-up') NOT NULL,
  schedule_status ENUM('scheduled', 'completed', 'missed', 'cancelled') DEFAULT 'scheduled',
  recurring_group_id VARCHAR(40) NULL,
  recurring_sequence INT NULL,
  INDEX fk_schedule_nurse (nurse_id),
  INDEX fk_schedule_elderly (elderly_id),
  INDEX idx_schedule_recurring_group_id (recurring_group_id)
);

CREATE TABLE IF NOT EXISTS nurse_elderly_assignments (
  assignment_id INT AUTO_INCREMENT PRIMARY KEY,
  nurse_id INT NOT NULL,
  elderly_id INT NOT NULL,
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  UNIQUE KEY unique_nurse_elderly_assignment (nurse_id, elderly_id),
  INDEX idx_assignment_nurse_id (nurse_id),
  INDEX idx_assignment_elderly_id (elderly_id)
);

CREATE TABLE IF NOT EXISTS admin (
  admin_id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(80) NOT NULL UNIQUE,
  password VARCHAR(120) NOT NULL,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) UNIQUE,
  avatar MEDIUMTEXT,
  admin_status ENUM('active', 'suspended') NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS admin_login_history (
  history_id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NOT NULL,
  username VARCHAR(80) NOT NULL,
  name VARCHAR(120) NOT NULL,
  signed_in_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  signed_out_at TIMESTAMP NULL,
  INDEX idx_admin_login_history_signed_in_at (signed_in_at),
  CONSTRAINT fk_admin_login_history_admin
    FOREIGN KEY (admin_id) REFERENCES admin(admin_id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS medication_logs (
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
);

CREATE TABLE IF NOT EXISTS elderly_medications (
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
);

CREATE TABLE IF NOT EXISTS elderly_blood_pressure (
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
);

CREATE TABLE IF NOT EXISTS elderly_blood_glucose (
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
);

INSERT INTO elderly (
  elderly_id, name, age, gender, birthdate, address, phone, medical_conditions, allergies,
  blood_type, emergency_name, emergency_phone, emergency_address, room_id, elderly_status,
  enroll_date, avatar
) VALUES
('1', 'Mary Wilson', 78, 'female', '1946-06-12', '123 Maple Street, Springfield, IL 62701', '(555) 234-5678', 'Hypertension', 'Penicillin', 'A+', 'James Wilson', '(555) 987-6543', '', 1, 'active', '2022-02-03', 'https://i.pravatar.cc/40?img=47'),
('2', 'Robert Brown', 82, 'male', '1942-03-08', '456 Oak Avenue, Springfield, IL 62702', '(555) 345-6789', 'Diabetes Type 2', 'Sulfa drugs', 'B+', 'Patricia Brown', '(555) 876-5432', '', 2, 'active', '2021-04-15', 'https://i.pravatar.cc/40?img=12'),
('3', 'Penney Smith', 75, 'female', '1949-09-20', '789 Elm Street, Springfield, IL 62703', '(555) 456-7890', 'Alzheimer''s', 'None', 'O+', 'Michael Smith', '(555) 765-4321', '', 3, 'active', '2023-01-10', 'https://i.pravatar.cc/40?img=45')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT IGNORE INTO rooms (floor_number, room_number)
SELECT floors.floor_number, rooms.room_number
FROM (
  SELECT 1 AS floor_number UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
) floors
CROSS JOIN (
  SELECT 1 AS room_number UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
  UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10
  UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15
) rooms;

INSERT INTO nurse (
  nurse_id, name, age, gender, phone, email, license_number, position, shift_schedule,
  username, password, address, hire_date, nurse_status
) VALUES
('1', 'Emily Clark', 34, 'female', '(555) 111-2233', 'emily.clark@elderease.com', 1001, 'Senior Nurse', 'Morning', 'emilyclark', 'password123', 'Yangon', '2020-03-15', 'active'),
('2', 'James Lee', 29, 'male', '(555) 222-3344', 'james.lee@elderease.com', 1002, 'Junior Nurse', 'Morning', 'jameslee', 'password123', 'Yangon', '2021-06-10', 'active'),
('3', 'Sophia Martinez', 38, 'female', '(555) 333-4455', 'sophia.martinez@elderease.com', 1003, 'Assistant Nurse', 'Morning', 'sophiamartinez', 'password123', 'Yangon', '2019-01-05', 'active')
ON DUPLICATE KEY UPDATE name = VALUES(name);
