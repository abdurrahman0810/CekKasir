-- Jalankan di Supabase SQL Editor jika RLS aktif dan login gagal membaca profil.
-- Mengizinkan pengguna yang sudah login membaca profilnya sendiri saja.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class AS c
    JOIN pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'user_profiles'
      AND c.relrowsecurity IS TRUE
  ) THEN
    RAISE EXCEPTION 'RLS belum aktif pada public.user_profiles. Periksa kebijakan yang ada sebelum mengaktifkannya.';
  END IF;
END;
$$;

DROP POLICY IF EXISTS owner_monitor_read_own_profile ON public.user_profiles;
CREATE POLICY owner_monitor_read_own_profile
ON public.user_profiles
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = id);
