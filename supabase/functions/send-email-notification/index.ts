import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify authentication
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { recipient_email, subject, body, notification_data } = await req.json()

    console.log('Email notification request:', { recipient_email, subject })

    // TODO: Integrate with Resend or another email service
    // For now, just log the notification
    console.log('Would send email:', {
      to: recipient_email,
      subject,
      body,
      notification_data
    })

    // Create activity log entry
    if (notification_data) {
      const { error: logError } = await supabaseAdmin
        .from('activity_logs')
        .insert({
          entity_type: notification_data.entity_type,
          entity_id: notification_data.entity_id,
          user_id: user.id,
          action_type: notification_data.action_type,
          notes: notification_data.notes,
          recipient_id: notification_data.recipient_id,
          notification_type: 'email',
        })

      if (logError) {
        console.error('Error creating activity log:', logError)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Email notification queued (email service integration pending)'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error in send-email-notification:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
