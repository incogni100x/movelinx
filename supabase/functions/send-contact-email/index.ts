// Supabase Edge Function to send contact form emails via Resend
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') || 'info@movelinxsd.com'
// Use a branded From header (ensure the domain is verified in Resend)
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'Movelinx Security and Delivery <updates@movelinxsd.com>'

interface ContactFormData {
  name: string
  email: string
  phone?: string
  subject: string
  message: string
}

const subjectLabels: Record<string, string> = {
  'general': 'General Inquiry',
  'quote': 'Request a Quote',
  'support': 'Customer Support',
  'billing': 'Billing Question',
  'partnership': 'Partnership Opportunity',
  'other': 'Other'
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate API key
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is not set')
    }

    // Parse request body
    const body: ContactFormData = await req.json()

    // Validate required fields
    if (!body.name || !body.email || !body.subject || !body.message) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          details: 'Name, email, subject, and message are required'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid email format'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Prepare email content
    const subjectLabel = subjectLabels[body.subject] || body.subject
    const emailSubject = `New Contact Form Submission: ${subjectLabel}`
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            :root {
              --primary: #0a2463;
              --accent: #c26943;
              --bg: #f6f7fb;
              --text: #1f2937;
              --muted: #6b7280;
              --border: #e5e7eb;
            }
            body { font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: var(--text); background: var(--bg); margin: 0; padding: 0; }
            .container { max-width: 640px; margin: 24px auto; padding: 0 16px; }
            .card { background: #ffffff; border-radius: 14px; box-shadow: 0 14px 35px rgba(0,0,0,0.08); overflow: hidden; border: 1px solid var(--border); }
            .header { background: linear-gradient(135deg, var(--primary), #0d307f); color: #fff; padding: 22px; }
            .brand { display: flex; align-items: center; gap: 12px; }
            .logo-dot { width: 12px; height: 12px; border-radius: 999px; background: var(--accent); display: inline-block; box-shadow: 0 0 0 6px rgba(194,105,67,0.15); }
            .brand-text { display: flex; flex-direction: column; }
            .brand-title { font-weight: 800; letter-spacing: -0.015em; }
            .brand-sub { color: rgba(255,255,255,0.9); font-size: 13px; }
            .content { padding: 22px 22px 12px; background: #fff; }
            .section { margin-bottom: 16px; background: #f8fafc; border-radius: 12px; border: 1px solid var(--border); padding: 14px 16px; }
            .field { margin-bottom: 12px; }
            .label { font-weight: 700; color: var(--primary); font-size: 13px; letter-spacing: 0.01em; text-transform: uppercase; }
            .value { margin-top: 5px; padding: 10px 12px; background-color: #fff; border-radius: 10px; border: 1px solid var(--border); color: var(--text); }
            .footer { padding: 16px 22px 20px; font-size: 12px; color: var(--muted); background: #fff; border-top: 1px solid var(--border); }
            .footer strong { color: var(--primary); }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="header">
                <div class="brand">
                  <span class="logo-dot"></span>
                  <div class="brand-text">
                    <div class="brand-title">Movelinx Security and Delivery</div>
                    <div class="brand-sub">New contact form submission</div>
                  </div>
                </div>
              </div>
              <div class="content">
                <div class="section">
                  <div class="field">
                    <div class="label">Name</div>
                    <div class="value">${escapeHtml(body.name)}</div>
                  </div>
                  <div class="field">
                    <div class="label">Email</div>
                    <div class="value">${escapeHtml(body.email)}</div>
                  </div>
                  ${body.phone ? `
                  <div class="field">
                    <div class="label">Phone</div>
                    <div class="value">${escapeHtml(body.phone)}</div>
                  </div>
                  ` : ''}
                  <div class="field">
                    <div class="label">Subject</div>
                    <div class="value">${escapeHtml(subjectLabel)}</div>
                  </div>
                  <div class="field">
                    <div class="label">Message</div>
                    <div class="value">${escapeHtml(body.message)}</div>
                  </div>
                </div>
              </div>
              <div class="footer">
                <p><strong>Movelinx Security and Delivery</strong> — contact form</p>
                <p>Submitted at: ${new Date().toLocaleString()}</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `

    const emailText = `
Movelinx Security and Delivery - Contact Form

Name: ${body.name}
Email: ${body.email}
${body.phone ? `Phone: ${body.phone}\n` : ''}Subject: ${subjectLabel}

Message:
${body.message}

---
Submitted at: ${new Date().toLocaleString()}
    `.trim()

    // Send email via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [ADMIN_EMAIL],
        reply_to: body.email,
        subject: emailSubject,
        html: emailHtml,
        text: emailText
      })
    })

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json()
      console.error('Resend API error:', errorData)
      throw new Error(`Failed to send email: ${errorData.message || 'Unknown error'}`)
    }

    const resendData = await resendResponse.json()

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Contact form submitted successfully',
        id: resendData.id
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error processing contact form:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message || 'An unexpected error occurred'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// Helper function to escape HTML
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

