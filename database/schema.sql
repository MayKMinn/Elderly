CREATE DATABASE IF NOT EXISTS eldercare;
USE eldercare;

CREATE TABLE IF NOT EXISTS elderly_profiles (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  age INT NOT NULL,
  gender VARCHAR(30) NOT NULL,
  phone VARCHAR(40),
  medical_condition VARCHAR(160),
  emergency_contact VARCHAR(120),
  status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  avatar VARCHAR(255),
  dob VARCHAR(80),
  address VARCHAR(255),
  blood_type VARCHAR(10),
  allergies VARCHAR(160),
  doctor_name VARCHAR(120),
  relationship VARCHAR(80),
  emergency_phone VARCHAR(40),
  admission_date VARCHAR(80),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS nurse_profiles (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  age INT NOT NULL,
  gender VARCHAR(30) NOT NULL,
  phone VARCHAR(40),
  email VARCHAR(160),
  position VARCHAR(120),
  hire_date VARCHAR(80),
  status ENUM('Active', 'On Leave') NOT NULL DEFAULT 'Active',
  avatar VARCHAR(255),
  assigned_elders INT NOT NULL DEFAULT 0,
  work_area VARCHAR(120),
  nurse_status VARCHAR(80)
);

INSERT INTO elderly_profiles (
  id, name, age, gender, phone, medical_condition, emergency_contact, status,
  avatar, dob, address, blood_type, allergies, doctor_name, relationship,
  emergency_phone, admission_date, notes
) VALUES
('ELD-0001', 'Mary Wilson', 78, 'Female', '(555) 234-5678', 'Hypertension', 'James Wilson', 'Active', 'https://i.pravatar.cc/40?img=47', 'June 12, 1946', '123 Maple Street, Springfield, IL 62701', 'A+', 'Penicillin', 'Dr. Patricia Moore', 'Son', '(555) 987-6543', 'February 3, 2022', 'Requires daily blood pressure monitoring. Walks with assistance.'),
('ELD-0002', 'Robert Brown', 82, 'Male', '(555) 345-6789', 'Diabetes Type 2', 'Patricia Brown', 'Active', 'https://i.pravatar.cc/40?img=12', 'March 8, 1942', '456 Oak Avenue, Springfield, IL 62702', 'B+', 'Sulfa drugs', 'Dr. James Carter', 'Daughter', '(555) 876-5432', 'April 15, 2021', 'Insulin-dependent. Low-sugar diet required.'),
('ELD-0003', 'Penney Smith', 75, 'Female', '(555) 456-7890', 'Alzheimer''s', 'Michael Smith', 'Active', 'https://i.pravatar.cc/40?img=45', 'September 20, 1949', '789 Elm Street, Springfield, IL 62703', 'O+', 'None', 'Dr. Susan Lee', 'Son', '(555) 765-4321', 'January 10, 2023', 'Requires constant supervision. Memory care unit.')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO nurse_profiles (
  id, name, age, gender, phone, email, position, hire_date, status,
  avatar, assigned_elders, work_area, nurse_status
) VALUES
('NRS-0001', 'Emily Clark', 34, 'Female', '(555) 111-2233', 'emily.clark@eldercare.com', 'Senior Nurse', 'March 15, 2020', 'Active', 'https://i.pravatar.cc/40?img=49', 8, 'Memory Care Unit', 'Active'),
('NRS-0002', 'James Lee', 29, 'Male', '(555) 222-3344', 'james.lee@eldercare.com', 'Registered Nurse', 'June 10, 2021', 'Active', 'https://i.pravatar.cc/40?img=53', 6, 'General Ward', 'Active'),
('NRS-0003', 'Sophia Martinez', 38, 'Female', '(555) 333-4455', 'sophia.martinez@eldercare.com', 'Charge Nurse', 'January 5, 2019', 'Active', 'https://i.pravatar.cc/40?img=46', 10, 'Cardiac Care', 'Active')
ON DUPLICATE KEY UPDATE name = VALUES(name);
