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

    // Verify the requesting user is authenticated
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      console.error('Authentication error:', userError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get request body
    const { email, password, name, role, company_id, vendor_id } = await req.json()

    console.log('Creating user:', { email, name, role, company_id, vendor_id })

    // Verify user has permission (company or vendor role)
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role, company_id')
      .eq('user_id', user.id)
      .eq('company_id', company_id)
      .single()

    if (roleError || !userRole || !['company', 'vendor'].includes(userRole.role)) {
      console.error('Permission check failed:', roleError, userRole)
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create the new user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name }
    })

    if (createError) {
      console.error('User creation error:', createError)
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User created successfully:', newUser.user.id)

    // Create role record
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        company_id,
        role
      })

    if (roleInsertError) {
      console.error('Role creation error:', roleInsertError)
      // Rollback user creation
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      return new Response(
        JSON.stringify({ error: roleInsertError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create vendor or worker record
    if (role === 'vendor') {
      const { error: vendorError } = await supabaseAdmin
        .from('vendors')
        .insert({
          user_id: newUser.user.id,
          company_id,
          name,
          email
        })

      if (vendorError) {
        console.error('Vendor creation error:', vendorError)
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
        return new Response(
          JSON.stringify({ error: vendorError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else if (role === 'worker') {
      const { error: workerError } = await supabaseAdmin
        .from('workers')
        .insert({
          user_id: newUser.user.id,
          company_id,
          vendor_id: vendor_id || null,
          name,
          email
        })

      if (workerError) {
        console.error('Worker creation error:', workerError)
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
        return new Response(
          JSON.stringify({ error: workerError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    console.log('User setup completed successfully')

    return new Response(
      JSON.stringify({ data: newUser.user }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
