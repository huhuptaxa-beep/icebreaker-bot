import React from "react";

interface WorkingZoneProps {
  state: "analysis" | "suggestions" | "idle" | "action" | "opener";
  analysis: React.ReactNode;
  suggestions: React.ReactNode;
  idle: React.ReactNode;
  action?: React.ReactNode;
  opener?: React.ReactNode;
}

const WorkingZone: React.FC<WorkingZoneProps> = ({
  state,
  analysis,
  suggestions,
  idle,
  action,
  opener,
}) => {
  return (
    <section className="working-zone">
      {state === "analysis" && analysis}
      {state === "suggestions" && suggestions}
      {state === "idle" && idle}
      {state === "action" && action}
      {state === "opener" && opener}
    </section>
  );
};

export default WorkingZone;
