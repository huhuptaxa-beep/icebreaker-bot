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
  return (
    <section className="working-zone">
      {state === "analysis" && analysis}
      {state === "suggestions" && suggestions}
      {state === "idle" && idle}
      {state === "action" && action}
    </section>
  );
};

export default WorkingZone;
