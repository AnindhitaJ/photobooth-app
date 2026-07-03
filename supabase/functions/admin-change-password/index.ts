import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const superAdminEmail = Deno.env.get("SUPER_ADMIN_EMAIL") || "luxphotobooth.id@gmail.com";

    if (!supabaseUrl) throw new Error("Missing SUPABASE_URL env");
    if (!serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY env");

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

    // 1) Ambil auth user langsung dari Auth, bukan dari profiles.
    const { data: beforeUser, error: getBeforeError } = await admin.auth.admin.getUserById(user_id);
    if (getBeforeError || !beforeUser?.user) {
      throw new Error(getBeforeError?.message || "Auth user tidak ditemukan. Pastikan profiles.id sama dengan auth.users.id.");
    }

    const email = beforeUser.user.email;
    if (!email) throw new Error("Auth user tidak punya email");

    // 2) Update password di Supabase Auth.
    const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(user_id, {
      password,
      email_confirm: true,
    });
    if (updateError) throw updateError;

    // 3) Verification login pakai anon key.
    // Ini sengaja supaya CMS tidak bilang berhasil kalau password barunya belum benar-benar bisa dipakai login.
    let verified = false;
    let verifyError = "";
    if (anonKey) {
      const authClient = createClient(supabaseUrl, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { error: signInError } = await authClient.auth.signInWithPassword({ email, password });
      if (signInError) {
        verifyError = signInError.message || "Verification login failed";
      } else {
        verified = true;
        await authClient.auth.signOut();
      }
    }

    if (anonKey && !verified) {
      throw new Error("Password sudah dikirim ke Auth, tapi verifikasi login gagal: " + verifyError);
    }

    return json({
      ok: true,
      verified,
      user_id,
      email,
      updated_at: updated?.user?.updated_at || null,
      message: verified
        ? "Password berhasil diganti dan sudah diverifikasi bisa login."
        : "Password berhasil diganti. SUPABASE_ANON_KEY belum diset, jadi verifikasi login dilewati.",
    });
  } catch (e) {
    return json({ ok: false, error: e.message || String(e) }, 400);
  }
});
