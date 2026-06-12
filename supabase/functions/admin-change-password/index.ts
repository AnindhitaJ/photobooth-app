import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const superAdminEmail = Deno.env.get("SUPER_ADMIN_EMAIL") || "luxphotobooth.id@gmail.com";

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) throw new Error("Missing authorization token");

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: requester, error: requesterError } = await admin.auth.getUser(token);
    if (requesterError || !requester?.user?.email) {
      throw new Error("Unauthorized");
    }

    if (requester.user.email !== superAdminEmail) {
      throw new Error("Forbidden: only super admin can change password");
    }

    const { user_id, password } = await req.json();
    if (!user_id || typeof user_id !== "string") {
      throw new Error("Missing user_id");
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      throw new Error("Password minimal 6 karakter");
    }

    const { error } = await admin.auth.admin.updateUserById(user_id, { password });
    if (error) throw error;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e.message || String(e) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
