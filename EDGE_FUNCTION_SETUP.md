# Supabase Edge Function Setup Guide

## Overview
This guide explains how to set up and deploy the contact form email function using Supabase Edge Functions and Resend API.

## Prerequisites
1. Supabase account and project
2. Resend account and API key
3. Supabase CLI installed (`npm install -g supabase`)

## Step 1: Get Your Resend API Key
1. Sign up or log in to [Resend](https://resend.com)
2. Go to API Keys section
3. Create a new API key
4. Copy the API key (starts with `re_`)

## Step 2: Set Up Environment Variables in Supabase
1. Go to your Supabase project dashboard
2. Navigate to **Settings** > **Edge Functions** > **Secrets**
3. Add the following secrets:
   - `RESEND_API_KEY`: Your Resend API key
   - `ADMIN_EMAIL`: The email address where contact form submissions should be sent (e.g., `info@movelinxsd.com`)
   - `FROM_EMAIL`: The email address to send from (must be verified in Resend, e.g., `noreply@movelinxsd.com`)

## Step 3: Deploy the Edge Function

### Option A: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **Edge Functions**
3. Click **Create a new function**
4. Name it: `send-contact-email`
5. Copy and paste the contents of `supabase/functions/send-contact-email/index.ts`
6. Click **Deploy**

### Option B: Using Supabase CLI
```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy the function
supabase functions deploy send-contact-email
```

## Step 4: Verify Domain in Resend
1. Go to Resend dashboard > **Domains**
2. Add your domain (e.g., `movelinxsd.com`)
3. Add the DNS records provided by Resend to your domain's DNS settings
4. Wait for verification (usually takes a few minutes)

## Step 5: Test the Function
You can test the function using the Supabase dashboard:
1. Go to **Edge Functions** > `send-contact-email`
2. Click **Invoke**
3. Use this test payload:
```json
{
  "name": "Test User",
  "email": "test@example.com",
  "phone": "+1234567890",
  "subject": "general",
  "message": "This is a test message"
}
```

## Function Endpoint
Once deployed, the function will be available at:
```
https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-contact-email
```

## Contact Form Integration
The contact form in `contact.html` is already configured to use this function. Make sure:
1. Your Supabase URL and anon key are set in your environment variables
2. The function name matches: `send-contact-email`

## Troubleshooting

### Email not sending
- Check that `RESEND_API_KEY` is set correctly
- Verify your domain in Resend
- Check that `FROM_EMAIL` is verified in Resend
- Check Supabase function logs for errors

### CORS errors
- The function includes CORS headers
- Make sure your Supabase project allows requests from your domain

### Function not found
- Verify the function name is exactly `send-contact-email`
- Check that the function is deployed and active
- Ensure you're using the correct Supabase project

## Email Template
The function sends a nicely formatted HTML email with:
- Contact form fields (name, email, phone, subject, message)
- Timestamp
- Professional styling

## Security Notes
- The function validates all required fields
- Email format is validated
- HTML is escaped to prevent XSS
- CORS is properly configured
- API keys are stored as environment variables (never in code)

