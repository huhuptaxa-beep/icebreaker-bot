import React from "react";

interface WorkingZoneProps {
  state: "analysis" | "suggestions" | "idle";
  analysis: React.ReactNode;
  suggestions: React.ReactNode;
  idle: React.ReactNode;
}

const WorkingZone: React.FC<WorkingZoneProps> = ({ state, analysis, suggestions, idle }) => {
  return (
    <section className="working-zone">
      {state === "analysis" && analysis}
      {state === "suggestions" && suggestions}
      {state === "idle" && idle}
    </section>
  );
};

export default WorkingZone;
