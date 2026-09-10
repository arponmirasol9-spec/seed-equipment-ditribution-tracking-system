-- Seed and Equipment Distribution Tracking System Database
-- Created: 2026-04-01

CREATE DATABASE IF NOT EXISTS distribution_system;
USE distribution_system;

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('admin', 'staff', 'farmer') DEFAULT 'staff',
    status ENUM('active', 'inactive') DEFAULT 'active',
    last_login DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Login logs table for access and login history tracking
CREATE TABLE IF NOT EXISTS login_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NULL,
    username VARCHAR(50) NOT NULL,
    full_name VARCHAR(100) NULL,
    role VARCHAR(50) NULL,
    ip_address VARCHAR(50) NULL,
    user_agent TEXT NULL,
    status ENUM('success', 'failed') DEFAULT 'success',
    failure_reason VARCHAR(255) NULL,
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (user_id),
    INDEX (login_time)
);

-- Farmers table
CREATE TABLE IF NOT EXISTS farmers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    rsbsa_number VARCHAR(50),
    name VARCHAR(100) NOT NULL,
    last_name VARCHAR(50),
    first_name VARCHAR(50),
    middle_name VARCHAR(50),
    extension VARCHAR(20),
    sex VARCHAR(10),
    birthdate DATE,
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    barangay VARCHAR(100),
    municipality VARCHAR(100),
    province VARCHAR(100),
    farm_location VARCHAR(255),
    farm_size DECIMAL(10,2),
    farm_size_unit VARCHAR(20) DEFAULT 'hectares',
    crop_type VARCHAR(100),
    registration_date DATE,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seeds inventory
CREATE TABLE IF NOT EXISTS seeds_inventory (
    id INT PRIMARY KEY AUTO_INCREMENT,
    crop_type VARCHAR(100) NOT NULL,
    variety VARCHAR(100),
    quantity INT NOT NULL DEFAULT 0,
    unit VARCHAR(20) DEFAULT 'kg',
    threshold DECIMAL(10,2) DEFAULT 10,
    status ENUM('available', 'low_stock', 'out_of_stock') DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Equipment inventory
CREATE TABLE IF NOT EXISTS equipment_inventory (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(100),
    quantity INT NOT NULL DEFAULT 0,
    `condition` ENUM('new', 'good', 'fair', 'poor') DEFAULT 'good',
    threshold INT DEFAULT 5,
    notes TEXT,
    status ENUM('available', 'low_stock', 'out_of_stock') DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Distributions table
CREATE TABLE IF NOT EXISTS distributions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    farmer_id INT NOT NULL,
    distribution_date DATE NOT NULL,
    season VARCHAR(50),
    notes TEXT,
    total_items INT DEFAULT 0,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE CASCADE
);

-- Distribution items (many-to-many)
CREATE TABLE IF NOT EXISTS distribution_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    distribution_id INT NOT NULL,
    item_type ENUM('seed', 'equipment') NOT NULL,
    item_id INT NOT NULL,
    quantity INT NOT NULL,
    FOREIGN KEY (distribution_id) REFERENCES distributions(id) ON DELETE CASCADE
);

-- Schedules table
CREATE TABLE IF NOT EXISTS schedules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    schedule_date DATE NOT NULL,
    schedule_time TIME,
    location VARCHAR(255),
    assigned_staff VARCHAR(100),
    description TEXT,
    item_details TEXT,
    status ENUM('scheduled', 'completed', 'cancelled') DEFAULT 'scheduled',
    reminder_sent TINYINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Stock history for tracking changes
CREATE TABLE IF NOT EXISTS stock_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    item_type ENUM('seed', 'equipment') NOT NULL,
    item_id INT NOT NULL,
    quantity_change DECIMAL(10,2) NOT NULL,
    change_type ENUM('addition', 'distribution', 'adjustment', 'expired') NOT NULL,
    reference_id INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sync queue for offline operations
CREATE TABLE IF NOT EXISTS sync_queue (
    id INT PRIMARY KEY AUTO_INCREMENT,
    operation VARCHAR(20) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id INT,
    data_json TEXT NOT NULL,
    synced TINYINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Farms table
CREATE TABLE IF NOT EXISTS farms (
    id INT PRIMARY KEY AUTO_INCREMENT,
    farmer_id INT NOT NULL,
    farm_name VARCHAR(100),
    location VARCHAR(255),
    size DECIMAL(10,2),
    size_unit VARCHAR(20) DEFAULT 'hectares',
    crop_type VARCHAR(100),
    soil_type VARCHAR(50),
    irrigation_type VARCHAR(50),
    latitude DECIMAL(10,8),
    longitude DECIMAL(10,8),
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE CASCADE
);

-- Insert default admin user (password: admin123)
INSERT IGNORE INTO users (username, password, full_name, role) VALUES 
('admin', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'System Administrator', 'admin');

-- Insert sample staff user
INSERT IGNORE INTO users (username, password, full_name, role) VALUES 
('staff', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Agricultural Staff', 'staff');

-- Insert sample farmers
INSERT IGNORE INTO farmers (name, phone, email, address, barangay, farm_location, farm_size, crop_type, registration_date, status) VALUES
('John Mwangi', '254712345678', 'john.mwangi@email.com', 'Kitale, Trans Nzoia', 'Kitale', 'Kitale Area A', 5.5, 'Maize', '2025-01-15', 'active'),
('Mary Wanjiku', '254723456789', 'mary.wanjiku@email.com', 'Nakuru, Nakuru County', 'Nakuru East', 'Nakuru East', 3.2, 'Wheat', '2025-02-20', 'active'),
('Peter Otieno', '254734567890', 'peter.otieno@email.com', 'Kisumu, Kisumu County', 'Kisumu West', 'Kisumu West', 4.0, 'Rice', '2025-03-10', 'active'),
('Sarah Kemunto', '254745678901', 'sarah.kemunto@email.com', 'Eldoret, Uasin Gishu', 'Eldoret North', 'Eldoret North', 6.0, 'Beans', '2025-01-25', 'active'),
('David Kiprotich', '254756789012', 'david.kiprotich@email.com', 'Naivasha, Nakuru', 'Naivasha', 'Naivasha', 2.5, 'Potatoes', '2025-04-05', 'active');

-- Insert sample farms
INSERT IGNORE INTO farms (farmer_id, farm_name, location, size, size_unit, soil_type, irrigation_type, status) VALUES
(1, 'Mwangi Farm', 'Kitale Area A', 5.5, 'hectares', 'Loam', 'Rainfed', 'active'),
(2, 'Wanjiku Farm', 'Nakuru East', 3.2, 'hectares', 'Clay', 'Drip', 'active'),
(3, 'Otieno Farm', 'Kisumu West', 4.0, 'hectares', 'Silt', 'Flood', 'active'),
(4, 'Kemunto Farm', 'Eldoret North', 6.0, 'hectares', 'Sandy', 'Sprinkler', 'active'),
(5, 'Kiprotich Farm', 'Naivasha', 2.5, 'hectares', 'Loam', 'Drip', 'active');

-- Insert sample seeds inventory
INSERT IGNORE INTO seeds_inventory (crop_type, variety, quantity, unit, price_per_unit, threshold, expiry_date, supplier, status) VALUES
('Maize', 'Hybrid 624', 500, 'kg', 150, 50, '2026-12-31', 'Kenya Seeds Co.', 'available'),
('Wheat', 'Kenya Kwale', 200, 'kg', 180, 30, '2026-08-15', 'Wheat Board', 'available'),
('Rice', 'IR64', 150, 'kg', 200, 25, '2026-06-30', 'Rice Millers Ltd', 'available'),
('Beans', 'Rosecoco', 80, 'kg', 220, 20, '2027-01-15', 'Bean Growers', 'low_stock'),
('Sorghum', 'Serena', 300, 'kg', 120, 40, '2026-11-20', 'Sorghum Ltd', 'available'),
('Cowpeas', 'M66', 25, 'kg', 250, 30, '2026-09-30', 'Legume Seeds', 'out_of_stock'),
('Potatoes', 'Shangi', 400, 'kg', 80, 50, '2026-05-15', 'Potato Center', 'available');

-- Insert sample equipment inventory
INSERT IGNORE INTO equipment_inventory (name, category, quantity, `condition`, threshold, notes, status) VALUES
('Hand Hoe', 'Tools', 50, 'good', 10, 'Standard agricultural hand hoe', 'available'),
('Spray Pump', 'Equipment', 15, 'good', 5, 'Manual operated spray pump', 'available'),
('Watering Can', 'Tools', 30, 'good', 10, '10L capacity', 'available'),
('Wheelbarrow', 'Transport', 8, 'fair', 3, 'Heavy duty wheelbarrow', 'available'),
('Seed Drill', 'Planting', 3, 'good', 2, 'Mechanical seed drill', 'low_stock'),
('Harvesting Scythe', 'Harvesting', 25, 'good', 8, 'Traditional harvesting tool', 'available'),
('Storage Sacks', 'Storage', 100, 'new', 20, '50kg capacity polypropylene sacks', 'available');

-- Insert sample schedules
INSERT IGNORE INTO schedules (title, schedule_date, schedule_time, location, assigned_staff, description, status) VALUES
('Maize Seeds Distribution', '2026-04-05', '09:00:00', 'Kitale Community Hall', 'John Smith', 'Distribution of hybrid maize seeds for planting season', 'scheduled'),
('Equipment Lending Program', '2026-04-10', '10:30:00', 'Nakuru Agricultural Office', 'Mary Johnson', 'Loan of spray pumps to registered farmers', 'scheduled'),
('Wheat Training Workshop', '2026-04-15', '08:00:00', 'Eldoret Training Center', 'David Koech', 'Training on modern wheat farming techniques', 'scheduled'),
('Rice Seeds Distribution', '2026-04-20', '09:30:00', 'Kisumu Fish Market', 'Peter Omollo', 'Distribution of improved rice variety seeds', 'scheduled');

-- Insert sample distribution
INSERT IGNORE INTO distributions (farmer_id, distribution_date, season, notes, total_items, created_by) VALUES
(1, '2026-03-15', 'Long Rains 2026', 'First distribution for planting season', 2, 1),
(2, '2026-03-18', 'Long Rains 2026', 'Wheat seeds and hand hoes', 2, 1),
(3, '2026-03-20', 'Long Rains 2026', 'Rice seeds for paddy farming', 1, 1),
(4, '2026-03-22', 'Long Rains 2026', 'Bean seeds and spray pump', 2, 1);

INSERT IGNORE INTO distribution_items (distribution_id, item_type, item_id, quantity) VALUES
(1, 'seed', 1, 20),
(1, 'seed', 4, 10),
(2, 'seed', 2, 15),
(2, 'equipment', 1, 2),
(3, 'seed', 3, 25),
(4, 'seed', 4, 12),
(4, 'equipment', 2, 1);