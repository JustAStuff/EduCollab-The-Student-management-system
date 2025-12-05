// src/pages/JoinWorkspace.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import LayoutContainer from "./components/layout/LayoutContainer";
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    CircularProgress,
    Alert,
} from "@mui/material";

export default function JoinWorkspace() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [workspace, setWorkspace] = useState(null);
    const [error, setError] = useState(null);
    const [joining, setJoining] = useState(false);
    const [needsLogin, setNeedsLogin] = useState(false);

    useEffect(() => {
        const fetchWorkspace = async () => {
            try {
                const { data, error } = await supabase
                    .from("workspaces")
                    .select("*")
                    .eq("id", id)
                    .single();

                if (error) throw error;
                setWorkspace(data);
            } catch (err) {
                console.error("❌ Error fetching workspace:", err.message);
                setError("Workspace not found or already closed.");
            } finally {
                setLoading(false);
            }
        };

        fetchWorkspace();
    }, [id]);

    const handleJoin = async () => {
        setJoining(true);
        try {
            const {
                data: { user },
                error: userError,
            } = await supabase.auth.getUser();

            if (userError || !user) {
                setNeedsLogin(true);
                setError("You need to log in first.");
                setJoining(false);
                return;
            }

            // 1. Save/update user in Users table
            const { error: userInsertError } = await supabase.from("users").upsert(
                {
                    id: user.id,
                    email: user.email,
                    full_name: user.user_metadata?.full_name || user.email.split('@')[0],
                    created_at: new Date().toISOString(),
                },
                { onConflict: "id" }
            );

            if (userInsertError) {
                console.error("Error updating users table:", userInsertError);
            }

            // 2. Check if user is the workspace owner first
            const { data: workspaceData } = await supabase
                .from("workspaces")
                .select("created_by")
                .eq("id", id)
                .single();

            // If user is the owner, don't add them as a member
            if (workspaceData && workspaceData.created_by === user.id) {
                console.log("User is the workspace owner, skipping member insertion");
            } else {
                // Insert member into workspace_members table only if not the owner
                const { error: joinError } = await supabase
                    .from("workspace_members")
                    .insert([{
                        workspace_id: id,
                        user_id: user.id,
                        role: 'member',
                        joined_at: new Date().toISOString()
                    }]);

                if (joinError && !joinError.message.includes('duplicate')) {
                    throw joinError;
                }
            }

            // 3. Update workspace_invitations table - change status from 'pending' to 'accepted'
            const { error: inviteUpdateError } = await supabase
                .from("workspace_invitations")
                .update({
                    status: "accepted",
                    accepted_at: new Date().toISOString()
                })
                .eq("workspace_id", id)
                .eq("email", user.email)
                .eq("status", "pending");

            if (inviteUpdateError) {
                console.error("Error updating invitation status:", inviteUpdateError);
                // Don't throw error here as the main join operation succeeded
            }

            // Navigate to appropriate workspace view
            if (workspaceData && workspaceData.created_by === user.id) {
                navigate(`/workspace/${id}`); // Owner view
            } else {
                navigate(`/workspace-member/${id}`); // Member view
            }
        } catch (err) {
            console.error("❌ Failed to join:", err.message);
            setError("Could not join the workspace. Try again later.");
        } finally {
            setJoining(false);
        }
    };

    const handleLogin = () => {
        navigate(`/?redirect=/join-workspace/${id}`);
    };

    if (loading) {
        return (
            <Box className="layout-container layout-flex-center">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box className="layout-container layout-flex-center">
            <LayoutContainer 
                maxWidth="md" 
                padding="default"
                sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}
            >
                <Card sx={{ maxWidth: 500, p: 3, boxShadow: 3, borderRadius: "16px" }}>
                <CardContent>
                    {error ? (
                        <>
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {error}
                            </Alert>
                            {needsLogin && (
                                <Button
                                    variant="contained"
                                    fullWidth
                                    onClick={handleLogin}
                                    sx={{
                                        bgcolor: "#1976d2",
                                        "&:hover": { bgcolor: "#115293" },
                                        borderRadius: "12px",
                                        py: 1.2,
                                    }}
                                >
                                    Login to Continue
                                </Button>
                            )}
                        </>
                    ) : (
                        <>
                            <Typography
                                variant="h5"
                                sx={{ fontWeight: "bold", color: "#1976d2", mb: 2 }}
                            >
                                Join Workspace
                            </Typography>
                            <Typography variant="h6" sx={{ mb: 1 }}>
                                {workspace?.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                {workspace?.description || "No description provided"}
                            </Typography>
                            <Button
                                variant="contained"
                                fullWidth
                                sx={{
                                    bgcolor: "#1976d2",
                                    "&:hover": { bgcolor: "#115293" },
                                    borderRadius: "12px",
                                    py: 1.2,
                                }}
                                onClick={handleJoin}
                                disabled={joining}
                            >
                                {joining ? (
                                    <CircularProgress size={24} sx={{ color: "white" }} />
                                ) : (
                                    "Join Workspace"
                                )}
                            </Button>
                        </>
                    )}
                </CardContent>
            </Card>
            </LayoutContainer>
        </Box>
    );
}