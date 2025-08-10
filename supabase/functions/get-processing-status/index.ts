import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface StatusRequest {
  documentId: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { documentId }: StatusRequest = await req.json()

    if (!documentId) {
      return new Response(
        JSON.stringify({ error: 'Missing documentId' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get document status
    const { data: document, error: docError } = await supabaseClient
      .from('search_documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Count extracted plans
    const { count: planCount, error: countError } = await supabaseClient
      .from('survey_plans')
      .select('*', { count: 'exact', head: true })
      .eq('search_document_id', documentId)

    if (countError) {
      console.error('Plan count error:', countError)
    }

    // Determine status based on document status and plan count
    let status: 'pending' | 'processing' | 'completed' | 'failed'
    let progress = 0

    switch (document.status) {
      case 'pending':
        status = 'pending'
        progress = 0
        break
      case 'approved':
        if ((planCount || 0) > 0) {
          status = 'completed'
          progress = 100
        } else {
          status = 'processing'
          progress = 50 // Assume halfway through processing
        }
        break
      case 'rejected':
        status = 'failed'
        progress = 0
        break
      default:
        status = 'pending'
        progress = 0
    }

    return new Response(
      JSON.stringify({ 
        status,
        progress,
        planCount: planCount || 0,
        documentStatus: document.status,
        lastUpdated: document.created_at
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Status check error:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})