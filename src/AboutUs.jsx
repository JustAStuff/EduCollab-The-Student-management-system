import React from "react";
import { Box, Typography } from "@mui/material";
import LayoutContainer from "./components/layout/LayoutContainer";

const AboutUs = () => {
  return (
    <Box className="layout-container layout-flex-center">
      <LayoutContainer maxWidth="md" padding="spacious">
        <Box className="layout-content-wrapper" sx={{ textAlign: "center" }}>
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
      </LayoutContainer>
    </Box>
  );
};

export default AboutUs;
