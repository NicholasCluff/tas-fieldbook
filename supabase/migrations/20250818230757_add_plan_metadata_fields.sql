-- Add new metadata fields to survey_plans table
ALTER TABLE survey_plans 
ADD COLUMN IF NOT EXISTS surveyor_name TEXT,
ADD COLUMN IF NOT EXISTS title_references TEXT[],
ADD COLUMN IF NOT EXISTS survey_datum TEXT,
ADD COLUMN IF NOT EXISTS bearing_swing_difference NUMERIC,
ADD COLUMN IF NOT EXISTS remarks JSONB,
ADD COLUMN IF NOT EXISTS lot_numbers TEXT[],
ADD COLUMN IF NOT EXISTS deposited_plan_numbers TEXT[];

-- Add check constraints
ALTER TABLE survey_plans 
ADD CONSTRAINT bearing_swing_difference_range 
CHECK (bearing_swing_difference IS NULL OR (bearing_swing_difference >= -180 AND bearing_swing_difference <= 180));

-- Add indexes for searchable fields
CREATE INDEX IF NOT EXISTS idx_survey_plans_surveyor_name ON survey_plans USING gin(surveyor_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_survey_plans_survey_datum ON survey_plans (survey_datum);
CREATE INDEX IF NOT EXISTS idx_survey_plans_title_references ON survey_plans USING gin(title_references);
CREATE INDEX IF NOT EXISTS idx_survey_plans_lot_numbers ON survey_plans USING gin(lot_numbers);

-- Add comments for documentation
COMMENT ON COLUMN survey_plans.surveyor_name IS 'Name of the surveyor who created the plan';
COMMENT ON COLUMN survey_plans.title_references IS 'Array of title references covered by the survey plan';
COMMENT ON COLUMN survey_plans.survey_datum IS 'Datum used for the survey (e.g., GDA94, GDA2020)';
COMMENT ON COLUMN survey_plans.bearing_swing_difference IS 'Bearing swing difference to MGA in degrees';
COMMENT ON COLUMN survey_plans.remarks IS 'JSON array of remark objects with text and reference numbers';
COMMENT ON COLUMN survey_plans.lot_numbers IS 'Array of lot numbers covered by the plan';
COMMENT ON COLUMN survey_plans.deposited_plan_numbers IS 'Array of related deposited plan numbers';