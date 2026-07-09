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
  elderly_status ENUM('active', 'passed away') DEFAULT 'active',
  enroll_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  avatar MEDIUMTEXT
);

CREATE TABLE IF NOT EXISTS nurse (
  nurse_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  age INT NOT NULL,
  gender ENUM('male', 'female', 'other') NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(30) NOT NULL,
  license_number INT NOT NULL,
  position VARCHAR(20) NOT NULL,
  shift_schedule VARCHAR(50) NOT NULL,
  work_area VARCHAR(400) NOT NULL,
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

CREATE TABLE IF NOT EXISTS medication_assignments (
  assignment_id INT AUTO_INCREMENT PRIMARY KEY,
  schedule_id INT NULL,
  nurse_id VARCHAR(40) NULL,
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
  INDEX idx_medication_assignments_nurse_id (nurse_id),
  INDEX idx_medication_assignments_schedule_id (schedule_id),
  INDEX idx_medication_assignments_scheduled_date (scheduled_date)
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

INSERT INTO elderly (
  elderly_id, name, age, gender, birthdate, address, phone, medical_conditions, allergies,
  blood_type, emergency_name, emergency_phone, emergency_address, elderly_status,
  enroll_date, avatar
) VALUES
('1', 'Mary Wilson', 78, 'female', '1946-06-12', '123 Maple Street, Springfield, IL 62701', '(555) 234-5678', 'Hypertension', 'Penicillin', 'A+', 'James Wilson', '(555) 987-6543', '', 'active', '2022-02-03', 'https://i.pravatar.cc/40?img=47'),
('2', 'Robert Brown', 82, 'male', '1942-03-08', '456 Oak Avenue, Springfield, IL 62702', '(555) 345-6789', 'Diabetes Type 2', 'Sulfa drugs', 'B+', 'Patricia Brown', '(555) 876-5432', '', 'active', '2021-04-15', 'https://i.pravatar.cc/40?img=12'),
('3', 'Penney Smith', 75, 'female', '1949-09-20', '789 Elm Street, Springfield, IL 62703', '(555) 456-7890', 'Alzheimer''s', 'None', 'O+', 'Michael Smith', '(555) 765-4321', '', 'active', '2023-01-10', 'https://i.pravatar.cc/40?img=45')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO nurse (
  nurse_id, name, age, gender, phone, email, license_number, position, shift_schedule,
  work_area, username, password, address, hire_date, nurse_status
) VALUES
('1', 'Emily Clark', 34, 'female', '(555) 111-2233', 'emily.clark@elderease.com', 1001, 'Senior Nurse', 'Morning', 'Memory Care Unit', 'emilyclark', 'password123', 'Yangon', '2020-03-15', 'active'),
('2', 'James Lee', 29, 'male', '(555) 222-3344', 'james.lee@elderease.com', 1002, 'Registered Nurse', 'Morning', 'General Ward', 'jameslee', 'password123', 'Yangon', '2021-06-10', 'active'),
('3', 'Sophia Martinez', 38, 'female', '(555) 333-4455', 'sophia.martinez@elderease.com', 1003, 'Charge Nurse', 'Morning', 'Cardiac Care', 'sophiamartinez', 'password123', 'Yangon', '2019-01-05', 'active')
ON DUPLICATE KEY UPDATE name = VALUES(name);
