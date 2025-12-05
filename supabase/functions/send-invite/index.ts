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
  // CORS headers - More flexible for development and production
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*", // Allow all origins for now
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400", // Cache preflight for 24 hours
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
        .map((e: any) => typeof e === "string" ? e.trim().toLowerCase() : "")
        .filter((e: string) => {
          // More robust email validation
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(e) && e.length <= 254; // RFC 5321 limit
        })
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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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

  // Start a transaction to create workspace and add owner as member
  const { data: workspace, error: workspaceError } = await supabaseClient
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

  if (workspaceError || !workspace) {
    return { data: null, error: workspaceError };
  }

  // Add the workspace creator as an owner member
  const { error: memberError } = await supabaseClient
    .from("workspace_members")
    .insert([
      {
        workspace_id: workspace.id,
        user_id: userId,
        role: "owner",
        accepted_at: new Date().toISOString(),
      },
    ]);

  if (memberError) {
    console.error("Error adding workspace owner as member:", memberError);
    // Don't fail the entire operation, but log the error
  }

  return { data: workspace, error: null };
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

  // Check if invitation already exists
  const { data: existingInvitation } = await supabaseClient
    .from("workspace_invitations")
    .select("id, status")
    .eq("workspace_id", workspaceId)
    .eq("email", email)
    .single();

  if (existingInvitation) {
    // Update existing invitation if it was previously declined or expired
    if (existingInvitation.status !== "pending") {
      const { error } = await supabaseClient
        .from("workspace_invitations")
        .update({
          status: "pending",
          created_at: new Date().toISOString(),
        })
        .eq("id", existingInvitation.id);
      return { error };
    }
    // If already pending, don't create duplicate
    return { error: null };
  }

  // Create new invitation
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
      name: "EduCollab Team",
    },
    content: [
      {
        type: "text/html",
        value: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #106EBE;">You're invited to join ${workspaceName}!</h2>
            <p>You have been invited to collaborate in the <strong>${workspaceName}</strong> workspace on EduCollab.</p>
            ${description ? `<p style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;"><em>${description}</em></p>` : ""}
            <div style="text-align: center; margin: 30px 0;">
              <a href="${inviteLink}" 
                 style="background-color: #106EBE; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Accept Invitation
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${inviteLink}">${inviteLink}</a>
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">
              This invitation was sent by EduCollab. If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
        `,
      },
    ],
  };

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    if (!response.ok) {
      let errorMessage = `SendGrid API error: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.errors?.[0]?.message || errorMessage;
      } catch (parseError) {
        const errorText = await response.text();
        errorMessage = errorText || errorMessage;
      }

      console.error("SendGrid error:", response.status, errorMessage);
      throw new Error(errorMessage);
    }

    return { success: true };
  } catch (error) {
    console.error("Email sending error:", error);
    throw error;
  }
}
