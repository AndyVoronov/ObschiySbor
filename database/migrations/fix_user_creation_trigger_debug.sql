-- Fix user creation trigger with debugging

-- First, let's check if the trigger exists and drop it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the function to recreate it
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Log the attempt
  RAISE NOTICE 'handle_new_user triggered for user: %', new.id;
  
  -- Check if profile already exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = new.id) THEN
    -- Log the insert attempt
    RAISE NOTICE 'Creating profile for user: %', new.id;
    
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'full_name', ''),
      'user'
    );
    
    -- Log success
    RAISE NOTICE 'Profile created successfully for user: %', new.id;
  ELSE
    -- Log that profile already exists
    RAISE NOTICE 'Profile already exists for user: %', new.id;
  END IF;
  
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Log any errors
    RAISE NOTICE 'Error in handle_new_user: %', SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;