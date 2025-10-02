-- Health Records Table
CREATE TABLE health_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    weight DECIMAL(5,2), -- in kg, e.g., 70.50
    height DECIMAL(5,2), -- in cm, e.g., 175.00
    blood_pressure_systolic INTEGER, -- e.g., 120
    blood_pressure_diastolic INTEGER, -- e.g., 80
    heart_rate INTEGER, -- beats per minute
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on user_id for faster queries
CREATE INDEX idx_health_records_user_id ON health_records(user_id);

-- Create an index on date for faster date-based queries
CREATE INDEX idx_health_records_date ON health_records(date);

-- Function to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at when a record is modified
CREATE TRIGGER update_health_records_updated_at 
    BEFORE UPDATE ON health_records 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies (uncomment these after setting up authentication)
/*
-- Allow users to see only their own records
CREATE POLICY "Users can view own health records" ON health_records
FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own records
CREATE POLICY "Users can insert own health records" ON health_records
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own records
CREATE POLICY "Users can update own health records" ON health_records
FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own records
CREATE POLICY "Users can delete own health records" ON health_records
FOR DELETE USING (auth.uid() = user_id);
*/