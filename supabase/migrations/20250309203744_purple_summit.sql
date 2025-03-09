/*
  # Create clipboard items table with device-specific storage

  1. New Tables
    - `clipboard_items`
      - `id` (uuid, primary key)
      - `device_id` (text, not null) - Unique identifier for each device
      - `content` (text, not null) - The clipboard content
      - `created_at` (timestamp with timezone, default: now())
      - `favorite` (boolean, default: false)
      - `category` (text, default: 'uncategorized')
      - `tags` (text array, default: empty array)

  2. Security
    - Enable RLS on `clipboard_items` table
    - Add policies for authenticated users to manage their data
*/

-- Create the table with all necessary columns
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'clipboard_items') THEN
    CREATE TABLE clipboard_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      device_id text NOT NULL,
      content text NOT NULL,
      created_at timestamptz DEFAULT now(),
      favorite boolean DEFAULT false,
      category text DEFAULT 'uncategorized',
      tags text[] DEFAULT '{}'::text[]
    );
  END IF;
END $$;

-- Enable RLS
ALTER TABLE clipboard_items ENABLE ROW LEVEL SECURITY;

-- Create policies one by one
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'clipboard_items' 
    AND policyname = 'Users can read own device data'
  ) THEN
    CREATE POLICY "Users can read own device data"
      ON clipboard_items
      FOR SELECT
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'clipboard_items' 
    AND policyname = 'Users can insert own device data'
  ) THEN
    CREATE POLICY "Users can insert own device data"
      ON clipboard_items
      FOR INSERT
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'clipboard_items' 
    AND policyname = 'Users can update own device data'
  ) THEN
    CREATE POLICY "Users can update own device data"
      ON clipboard_items
      FOR UPDATE
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'clipboard_items' 
    AND policyname = 'Users can delete own device data'
  ) THEN
    CREATE POLICY "Users can delete own device data"
      ON clipboard_items
      FOR DELETE
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;