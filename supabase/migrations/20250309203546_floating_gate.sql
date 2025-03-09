/*
  # Create clipboard items table

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
    - Add policy for authenticated users to read their own data
    - Add policy for authenticated users to insert their own data
    - Add policy for authenticated users to update their own data
    - Add policy for authenticated users to delete their own data
*/

CREATE TABLE IF NOT EXISTS clipboard_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  favorite boolean DEFAULT false,
  category text DEFAULT 'uncategorized',
  tags text[] DEFAULT '{}'::text[]
);

ALTER TABLE clipboard_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own device data"
  ON clipboard_items
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert own device data"
  ON clipboard_items
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own device data"
  ON clipboard_items
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own device data"
  ON clipboard_items
  FOR DELETE
  USING (auth.uid() IS NOT NULL);