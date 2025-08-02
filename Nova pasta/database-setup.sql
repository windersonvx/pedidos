-- Supabase table creation for order management
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS pedidos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_name VARCHAR NOT NULL,
  buyer_phone VARCHAR,
  purchase_id VARCHAR UNIQUE NOT NULL,
  tracking_code VARCHAR,
  product VARCHAR,
  product_title VARCHAR,
  quantity INTEGER DEFAULT 1,
  product_value DECIMAL(10,2) DEFAULT 0.00,
  purchase_date DATE DEFAULT CURRENT_DATE,
  current_location TEXT,
  observations TEXT,
  status VARCHAR NOT NULL DEFAULT 'PAGAMENTO_CONFIRMADO',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pedidos_purchase_id ON pedidos(purchase_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_updated_at ON pedidos(updated_at);

-- Enable Row Level Security (RLS)
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust as needed for your security requirements)
CREATE POLICY "Allow all operations on pedidos" ON pedidos
  FOR ALL USING (true) WITH CHECK (true);

-- Grant permissions to anon and authenticated users
GRANT ALL ON pedidos TO anon;
GRANT ALL ON pedidos TO authenticated;

-- Optional: Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to auto-update timestamp
CREATE TRIGGER update_pedidos_updated_at 
  BEFORE UPDATE ON pedidos 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
