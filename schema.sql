-- Travel Connect Professional database foundation
CREATE TABLE IF NOT EXISTS users(
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 mobile TEXT,
 email TEXT,
 role TEXT NOT NULL DEFAULT 'driver',
 status TEXT NOT NULL DEFAULT 'active',
 created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS vehicle_categories(
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL UNIQUE,
 standard_rate REAL NOT NULL DEFAULT 0,
 competitive_rate REAL NOT NULL DEFAULT 0,
 safety_rate REAL NOT NULL DEFAULT 0,
 local_rate REAL NOT NULL DEFAULT 0,
 included_km REAL NOT NULL DEFAULT 80,
 included_hours REAL NOT NULL DEFAULT 8,
 additional_km_rate REAL NOT NULL DEFAULT 0,
 additional_hour_rate REAL NOT NULL DEFAULT 0,
 active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS vehicles(
 id TEXT PRIMARY KEY,
 category_id TEXT,
 name TEXT NOT NULL,
 vehicle_number TEXT,
 seats INTEGER,
 active INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS drivers(
 id TEXT PRIMARY KEY,
 user_id TEXT,
 name TEXT NOT NULL,
 mobile TEXT,
 vehicle_id TEXT,
 active INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS customers(
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 mobile TEXT,
 email TEXT,
 gstin TEXT,
 address TEXT,
 created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS enquiries(
 id TEXT PRIMARY KEY,
 customer_id TEXT,
 pickup TEXT,
 destinations_json TEXT,
 return_point TEXT,
 trip_type TEXT,
 required_date TEXT,
 status TEXT NOT NULL DEFAULT 'new',
 created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS quotations(
 id TEXT PRIMARY KEY,
 quotation_no TEXT NOT NULL UNIQUE,
 customer_id TEXT,
 vehicle_id TEXT,
 driver_id TEXT,
 trip_type TEXT,
 pickup TEXT,
 destinations_json TEXT,
 return_point TEXT,
 estimated_start_date TEXT,
 estimated_start_time TEXT,
 estimated_close_date TEXT,
 estimated_close_time TEXT,
 estimated_km REAL,
 estimated_hours REAL,
 rate_plan TEXT,
 rate_snapshot_json TEXT,
 quoted_amount REAL,
 status TEXT NOT NULL DEFAULT 'draft',
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS trips(
 id TEXT PRIMARY KEY,
 quotation_id TEXT,
 actual_start_date TEXT,
 actual_start_time TEXT,
 actual_close_date TEXT,
 actual_close_time TEXT,
 actual_start_point TEXT,
 actual_destinations_json TEXT,
 actual_close_point TEXT,
 actual_km REAL,
 actual_hours REAL,
 status TEXT NOT NULL DEFAULT 'confirmed',
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS bills(
 id TEXT PRIMARY KEY,
 trip_id TEXT,
 standard_amount REAL,
 selected_amount REAL,
 additional_amount REAL,
 extra_expenses REAL,
 discount REAL,
 advance REAL,
 final_amount REAL,
 balance_amount REAL,
 settlement_type TEXT,
 payment_status TEXT,
 created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS ledger(
 id TEXT PRIMARY KEY,
 type TEXT NOT NULL,
 category TEXT,
 description TEXT,
 amount REAL NOT NULL,
 trip_id TEXT,
 created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS network_posts(
 id TEXT PRIMARY KEY,
 user_id TEXT,
 message TEXT,
 latitude REAL,
 longitude REAL,
 created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS subscriptions(
 id TEXT PRIMARY KEY,
 user_id TEXT,
 plan TEXT,
 status TEXT,
 start_at TEXT,
 end_at TEXT,
 created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_logs(
 id TEXT PRIMARY KEY,
 user_id TEXT,
 action TEXT,
 entity TEXT,
 entity_id TEXT,
 created_at TEXT NOT NULL
);
