-- Akses baca khusus admin untuk halaman Kasir & Shift.
-- Aman dijalankan ulang; tidak mengubah policy kasir yang sudah ada.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class AS c
    JOIN pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'cashier_active_sessions'
      AND c.relrowsecurity IS TRUE
  ) THEN
    RAISE EXCEPTION 'RLS belum aktif di public.cashier_active_sessions. Periksa policy kasir yang sudah ada sebelum mengaktifkannya.';
  END IF;
END;
$$;

GRANT SELECT ON TABLE public.cashier_active_sessions TO authenticated;

DROP POLICY IF EXISTS owner_monitor_admin_read_cashier_sessions
ON public.cashier_active_sessions;

CREATE POLICY owner_monitor_admin_read_cashier_sessions
ON public.cashier_active_sessions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_profiles AS profile
    WHERE profile.id = (SELECT auth.uid())
      AND lower(trim(coalesce(profile.role, ''))) = 'admin'
      AND profile.is_active IS TRUE
  )
);
