import React from "react";

interface WorkingZoneProps {
  state: "analysis" | "suggestions" | "idle" | "action";
  analysis: React.ReactNode;
  suggestions: React.ReactNode;
  idle: React.ReactNode;
  action?: React.ReactNode;
}

const WorkingZone: React.FC<WorkingZoneProps> = ({
  state,
  analysis,
  suggestions,
  idle,
  action,
}) => {
  switch (state) {
    case "analysis":
      return <section className="working-zone">{analysis}</section>;
    case "suggestions":
      return <section className="working-zone">{suggestions}</section>;
    case "action":
      return <section className="working-zone">{action}</section>;
    default:
      return <section className="working-zone">{idle}</section>;
  }
};

export default WorkingZone;
