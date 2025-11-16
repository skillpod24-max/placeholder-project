import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify the user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Invalid authentication");
    }

    const { phoneNumber, message } = await req.json();

    console.log("SMS notification request:", {
      phoneNumber,
      message: message.substring(0, 50) + "...",
      user: user.email,
    });

    // TODO: Implement SMS sending using Twilio or similar service
    // For now, we'll just log the SMS details
    
    // Example Twilio integration (requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER):
    /*
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");
    
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: phoneNumber,
          From: twilioPhoneNumber,
          Body: message,
        }),
      }
    );
    
    const data = await response.json();
    */

    // Log to activity_logs table
    const { error: logError } = await supabaseClient
      .from("activity_logs")
      .insert({
        user_id: user.id,
        entity_type: "sms",
        entity_id: user.id,
        action_type: "sms_notification",
        notes: `SMS notification sent to ${phoneNumber}`,
      });

    if (logError) {
      console.error("Error logging SMS notification:", logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "SMS notification logged (SMS service not configured yet - please add Twilio credentials)",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in send-sms-notification function:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
