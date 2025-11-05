-- Create missing profile for user andrei_999@list.ru

-- This migration creates a profile for the user that doesn't have one
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = 'acd70956-59ff-45d7-ba63-96688c84aa40') THEN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
      'acd70956-59ff-45d7-ba63-96688c84aa40'::uuid,
      '',
      'user'
    );
    RAISE NOTICE 'Profile created successfully for user: acd70956-59ff-45d7-ba63-96688c84aa40';
  ELSE
    RAISE NOTICE 'Profile already exists for user: acd70956-59ff-45d7-ba63-96688c84aa40';
  END IF;
END $$;