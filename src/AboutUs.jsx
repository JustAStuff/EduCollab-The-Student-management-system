import React from "react";
import { Box, Typography, Container } from "@mui/material";

const AboutUs = () => {
  return (
    <Container maxWidth="md" sx={{ py: 5 }}>
      <Box sx={{ textAlign: "center", mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: "bold", color: "#106EBE" }}>
          About EduCollab
        </Typography>
        <Typography variant="body1" color="text.secondary">
          EduCollab is a collaborative student management platform designed to
          connect students, educators, and institutions. Our goal is to simplify
          collaboration by offering tools for project management, communication,
          and event organization, making education more interactive and
          efficient.
        </Typography>
      </Box>
    </Container>
  );
};

export default AboutUs;
