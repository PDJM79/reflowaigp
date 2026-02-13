import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as OTPAuth from "https://esm.sh/otpauth@9.4.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MFARequest {
  action: "enable" | "disable";
  userId: string;
  password: string;
  mfaSecret?: string; // For enable
  totpCode: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Client with user's JWT for authentication
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user is authenticated
    const { data: { user: authUser }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !authUser) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { action, userId, password, mfaSecret, totpCode }: MFARequest = await req.json();

    if (!action || !userId || !password || !totpCode) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the acting user's info from users table
    const { data: actingUser, error: actingUserError } = await supabaseAdmin
      .from("users")
      .select("id, practice_id, is_master_user")
      .eq("auth_user_id", authUser.id)
      .single();

    if (actingUserError || !actingUser) {
      console.error("Acting user error:", actingUserError);
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the target user's info
    const { data: targetUser, error: targetUserError } = await supabaseAdmin
      .from("users")
      .select("id, auth_user_id, practice_id, email, name")
      .eq("id", userId)
      .single();

    if (targetUserError || !targetUser) {
      console.error("Target user error:", targetUserError);
      return new Response(
        JSON.stringify({ error: "Target user not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check authorization: either modifying own account or master user for same practice
    const isSelfModification = actingUser.id === targetUser.id;
    const isMasterUserForPractice = actingUser.is_master_user && actingUser.practice_id === targetUser.practice_id;

    if (!isSelfModification && !isMasterUserForPractice) {
      console.error("Authorization failed: not self or master user");
      return new Response(
        JSON.stringify({ error: "Not authorized to modify this user's MFA settings" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Re-authenticate the acting user with password
    console.log("Re-authenticating user with password...");
    const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: authUser.email!,
      password: password,
    });

    if (signInError) {
      console.error("Password verification failed:", signInError);
      
      // Log failed attempt
      await supabaseAdmin.from("audit_logs").insert({
        practice_id: actingUser.practice_id,
        user_id: actingUser.id,
        entity_type: "mfa_settings",
        entity_id: targetUser.id,
        action: `mfa_${action}_failed_reauth`,
        after_data: { 
          reason: "password_verification_failed",
          target_user_id: targetUser.id,
          is_self: isSelfModification 
        },
      });

      return new Response(
        JSON.stringify({ error: "Password verification failed" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Password verified successfully");

    if (action === "enable") {
      // Validate MFA secret is provided
      if (!mfaSecret) {
        return new Response(
          JSON.stringify({ error: "MFA secret is required for enable action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify the TOTP code
      const totp = new OTPAuth.TOTP({
        issuer: "ReflowAI GP",
        label: targetUser.email || "user",
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(mfaSecret),
      });

      const delta = totp.validate({ token: totpCode, window: 1 });
      if (delta === null) {
        console.error("Invalid TOTP code for enable");
        return new Response(
          JSON.stringify({ error: "Invalid verification code" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Save the MFA secret
      const { error: upsertError } = await supabaseAdmin
        .from("user_auth_sensitive")
        .upsert({
          user_id: targetUser.id,
          mfa_secret: mfaSecret,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (upsertError) {
        console.error("Error saving MFA secret:", upsertError);
        throw upsertError;
      }

      // Update mfa_enabled flag
      await supabaseAdmin
        .from("users")
        .update({ mfa_enabled: true })
        .eq("id", targetUser.id);

      // Log successful enable
      await supabaseAdmin.from("audit_logs").insert({
        practice_id: actingUser.practice_id,
        user_id: actingUser.id,
        entity_type: "mfa_settings",
        entity_id: targetUser.id,
        action: "mfa_enabled",
        after_data: { 
          target_user_id: targetUser.id,
          target_user_email: targetUser.email,
          is_self: isSelfModification,
          actor_is_master: actingUser.is_master_user 
        },
      });

      console.log(`MFA enabled for user ${targetUser.id}`);

      // Trigger notification email
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-mfa-change-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            userId: targetUser.id,
            action: "enabled",
            actorId: actingUser.id,
            isSelf: isSelfModification,
          }),
        });
      } catch (notifyError) {
        console.error("Failed to send notification:", notifyError);
        // Don't fail the request if notification fails
      }

      return new Response(
        JSON.stringify({ success: true, message: "MFA enabled successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "disable") {
      // Get current MFA secret to verify the code
      const { data: mfaData, error: mfaError } = await supabaseAdmin
        .from("user_auth_sensitive")
        .select("mfa_secret")
        .eq("user_id", targetUser.id)
        .single();

      if (mfaError || !mfaData?.mfa_secret) {
        console.error("MFA not configured for user");
        return new Response(
          JSON.stringify({ error: "MFA is not configured for this user" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify the TOTP code
      const totp = new OTPAuth.TOTP({
        issuer: "ReflowAI GP",
        label: targetUser.email || "user",
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(mfaData.mfa_secret),
      });

      const delta = totp.validate({ token: totpCode, window: 1 });
      if (delta === null) {
        console.error("Invalid TOTP code for disable");
        
        // Log failed attempt
        await supabaseAdmin.from("audit_logs").insert({
          practice_id: actingUser.practice_id,
          user_id: actingUser.id,
          entity_type: "mfa_settings",
          entity_id: targetUser.id,
          action: "mfa_disable_failed_totp",
          after_data: { 
            reason: "invalid_totp_code",
            target_user_id: targetUser.id,
            is_self: isSelfModification 
          },
        });

        return new Response(
          JSON.stringify({ error: "Invalid verification code" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Remove the MFA secret
      const { error: deleteError } = await supabaseAdmin
        .from("user_auth_sensitive")
        .update({ mfa_secret: null })
        .eq("user_id", targetUser.id);

      if (deleteError) {
        console.error("Error removing MFA secret:", deleteError);
        throw deleteError;
      }

      // Update mfa_enabled flag
      await supabaseAdmin
        .from("users")
        .update({ mfa_enabled: false })
        .eq("id", targetUser.id);

      // Log successful disable
      await supabaseAdmin.from("audit_logs").insert({
        practice_id: actingUser.practice_id,
        user_id: actingUser.id,
        entity_type: "mfa_settings",
        entity_id: targetUser.id,
        action: "mfa_disabled",
        after_data: { 
          target_user_id: targetUser.id,
          target_user_email: targetUser.email,
          is_self: isSelfModification,
          actor_is_master: actingUser.is_master_user 
        },
      });

      console.log(`MFA disabled for user ${targetUser.id}`);

      // Trigger notification email
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-mfa-change-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            userId: targetUser.id,
            action: "disabled",
            actorId: actingUser.id,
            isSelf: isSelfModification,
          }),
        });
      } catch (notifyError) {
        console.error("Failed to send notification:", notifyError);
        // Don't fail the request if notification fails
      }

      return new Response(
        JSON.stringify({ success: true, message: "MFA disabled successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in manage-mfa-settings:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
