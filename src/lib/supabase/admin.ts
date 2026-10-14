import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cliente con service_role: solo en el servidor y solo para la API de administración de Auth (invitaciones).
// Nunca usarlo para leer o escribir tablas clínicas: se saltaría RLS.
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
