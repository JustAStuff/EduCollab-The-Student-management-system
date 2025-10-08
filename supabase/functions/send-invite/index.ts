// supabase/functions/send-invite/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Read the secrets from environment
const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
const SITE_URL = Deno.env.get("SITE_URL") || "http://localhost:5173";

if (!SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY is not configured in secrets");
}

// Must match a verified sender in SendGrid single-sender or domain auth
const VERIFIED_SENDER = "ravipriyadarshini1605@gmail.com";

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": SITE_URL,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type",
  };

  // Handle preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const body = await req.json();
    const { workspaceName, description, userId, emails, workspaceId } = body;

    // Basic validation - only workspaceName and userId are required
    if (!workspaceName || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing required data: workspaceName, userId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Filter and clean emails (emails are optional)
    const validEmails = (emails && Array.isArray(emails)) 
      ? emails
          .map((e: any) => typeof e === "string" ? e.trim() : "")
          .filter((e: string) => /\S+@\S+\.\S+/.test(e))
      : [];

    let workspace;
    
    if (workspaceId) {
      // Adding members to existing workspace
      const { data: existingWorkspace, error: fetchError } = await getWorkspaceById(workspaceId);
      if (fetchError || !existingWorkspace) {
        console.error("Workspace fetch error:", fetchError);
        return new Response(
          JSON.stringify({ error: "Could not find workspace" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      workspace = existingWorkspace;
    } else {
      // Create new workspace
      const { data: newWorkspace, error: wsError } = await createWorkspaceInDB(workspaceName, description, userId);
      if (wsError || !newWorkspace) {
        console.error("Workspace creation error:", wsError);
        return new Response(
          JSON.stringify({ error: "Could not create workspace" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      workspace = newWorkspace;
    }

    let emailsSent = 0;

    // Only process emails if there are valid ones
    if (validEmails.length > 0) {
      for (const email of validEmails) {
        try {
          // Insert invitation in DB
          await insertInvitationInDB(workspace.id, email);
          // Send email via SendGrid
          const sendResult = await sendInvitationEmail(email, workspaceName, description, workspace.id);
          if (sendResult.success) {
            emailsSent++;
          }
        } catch (err) {
          console.error(`Error for email ${email}:`, err);
          // continue with next
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        workspace: workspace, 
        invitationsSent: emailsSent, 
        totalInvitations: validEmails.length,
        message: workspaceId 
          ? `${emailsSent} invitations sent to existing workspace!`
          : validEmails.length > 0 
            ? `Workspace created successfully! ${emailsSent} invitations sent.`
            : "Workspace created successfully!"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

// Helper to create workspace (using Supabase client)
async function createWorkspaceInDB(
  workspaceName: string,
  description: string,
  userId: string
) {
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabaseClient
    .from("workspaces")
    .insert([
      {
        name: workspaceName,
        description: description || null,
        created_by: userId,
      },
    ])
    .select()
    .single();

  return { data, error };
}

// Helper to get workspace by ID
async function getWorkspaceById(workspaceId: string) {
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabaseClient
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .single();

  return { data, error };
}

// Helper to insert invitation row
async function insertInvitationInDB(workspaceId: string, email: string) {
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

  const { error } = await supabaseClient
    .from("workspace_invitations")
    .insert([
      {
        workspace_id: workspaceId,
        email: email,
        status: "pending",
      },
    ]);

  return { error };
}

// Helper to send email via SendGrid
async function sendInvitationEmail(
  email: string,
  workspaceName: string,
  description: string,
  workspaceId: string
) {
  const inviteLink = `${SITE_URL}/join-workspace/${workspaceId}`;

  const emailPayload = {
    personalizations: [
      {
        to: [{ email }],
        subject: `Invitation to join ${workspaceName}`,
      },
    ],
    from: {
      email: VERIFIED_SENDER,
    },
    content: [
      {
        type: "text/html",
        value: `
          <p>You have been invited to join <b>${workspaceName}</b>.</p>
          ${description ? `<p>${description}</p>` : ""}
          <p><a href="${inviteLink}">Click here to accept invite</a></p>
        `,
      },
    ],
  };

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(emailPayload),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("SendGrid error:", response.status, errText);
    throw new Error(`SendGrid send failed: ${response.status}`);
  }

  return { success: true };
}
