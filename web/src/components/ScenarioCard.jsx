import React from "react";

export default function ScenarioCard({ scenario }) {
  if (!scenario) return null;
  return (
    <div className="scenario-card">
      <div className="scenario-card__label">{scenario.label}</div>
      <div className="scenario-card__rationale">{scenario.rationale}</div>
      <div className="scenario-card__tags">
        {scenario.moodTags?.map((tag) => (
          <span className="chip" key={tag}>
            {tag}
          </span>
        ))}
        {scenario.bpmRange && (
          <span className="chip chip--bpm">
            {scenario.bpmRange[0]}–{scenario.bpmRange[1]} BPM
          </span>
        )}
      </div>
    </div>
  );
}
