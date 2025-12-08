-- PostgreSQL Schema for Movelinx Security and Delivery Shipments
-- This schema is based on the create.html form and shipment-details.html status values

-- Create shipment status enum
CREATE TYPE shipment_status AS ENUM (
  'Processing',
  'Picked Up',
  'In Transit',
  'At Destination',
  'Delivered'
);

-- Create package type enum
CREATE TYPE package_type AS ENUM (
  'document',
  'small-parcel',
  'medium-box',
  'large-box',
  'pallet'
);

-- Create payment status enum
CREATE TYPE payment_status AS ENUM (
  'paid',
  'pending',
  'unpaid'
);

-- Create clearance status enum
CREATE TYPE clearance_status AS ENUM (
  'in-progress',
  'completed',
  'pending',
  'rejected'
);

-- Create shipments table
CREATE TABLE shipments (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tracking Information
  tracking_id VARCHAR(50) UNIQUE NOT NULL,
  status shipment_status NOT NULL DEFAULT 'Processing',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Sender Information
  sender_name VARCHAR(255) NOT NULL,
  sender_phone VARCHAR(50) NOT NULL,
  sender_email VARCHAR(255),
  sender_street VARCHAR(255) NOT NULL,
  sender_city VARCHAR(100) NOT NULL,
  sender_country VARCHAR(10) NOT NULL,
  
  -- Receiver Information
  receiver_name VARCHAR(255) NOT NULL,
  receiver_phone VARCHAR(50) NOT NULL,
  receiver_street VARCHAR(255) NOT NULL,
  receiver_city VARCHAR(100) NOT NULL,
  receiver_country VARCHAR(10) NOT NULL,
  
  -- Package Details
  package_type package_type NOT NULL,
  weight_kg DECIMAL(10, 2),
  length_cm DECIMAL(10, 2),
  width_cm DECIMAL(10, 2),
  height_cm DECIMAL(10, 2),
  declared_value_usd DECIMAL(12, 2),
  
  -- Payment Information
  invoice_number VARCHAR(100),
  payment_status payment_status,
  payment_method VARCHAR(100),
  payment_date DATE,
  shipping_cost_yen DECIMAL(12, 2),
  insurance_yen DECIMAL(12, 2),
  taxes_yen DECIMAL(12, 2),
  additional_fees_usd DECIMAL(12, 2),
  total_amount_yen DECIMAL(12, 2),
  
  -- Customs Clearance Information
  clearance_status clearance_status,
  declaration_number VARCHAR(100),
  clearance_notes TEXT
);

-- Create index on tracking_id for fast lookups
CREATE INDEX idx_shipments_tracking_id ON shipments(tracking_id);

-- Create index on status for filtering
CREATE INDEX idx_shipments_status ON shipments(status);

-- Create index on created_at for sorting
CREATE INDEX idx_shipments_created_at ON shipments(created_at DESC);

-- Create index on sender_country and receiver_country for filtering
CREATE INDEX idx_shipments_sender_country ON shipments(sender_country);
CREATE INDEX idx_shipments_receiver_country ON shipments(receiver_country);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at on row update
CREATE TRIGGER update_shipments_updated_at
  BEFORE UPDATE ON shipments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to generate tracking ID
CREATE OR REPLACE FUNCTION generate_tracking_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate tracking ID in format: TRK-XXXXXX (6 random alphanumeric characters)
  IF NEW.tracking_id IS NULL OR NEW.tracking_id = '' THEN
    NEW.tracking_id := 'MSD' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate tracking ID if not provided
CREATE TRIGGER generate_shipment_tracking_id
  BEFORE INSERT ON shipments
  FOR EACH ROW
  EXECUTE FUNCTION generate_tracking_id();

-- Optional: Create a shipments_timeline table for tracking status changes
CREATE TABLE shipment_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  status shipment_status NOT NULL,
  location VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Index for fast lookups
  CONSTRAINT fk_shipment_timeline_shipment FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE
);

-- Create index on shipment_id for timeline lookups
CREATE INDEX idx_shipment_timeline_shipment_id ON shipment_timeline(shipment_id);
CREATE INDEX idx_shipment_timeline_created_at ON shipment_timeline(created_at DESC);

-- Add comment to table
COMMENT ON TABLE shipments IS 'Main shipments table storing all shipment information from the create form';
COMMENT ON TABLE shipment_timeline IS 'Timeline of status changes for each shipment';

