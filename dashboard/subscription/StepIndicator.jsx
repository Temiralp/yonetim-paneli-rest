/**
 * StepIndicator — Adım göstergesi bileşeni.
 * Tek sorumluluk: mevcut adımı görselleştirmek ve adımlar arası geçiş sağlamak.
 */
import React from "react";
import { FaCheck } from "react-icons/fa";
import { STEP_LABELS, STEP_MAP } from "./constants";

const StepIndicator = ({ currentStep, onStepChange }) => {
  const currentIdx = STEP_MAP[currentStep] ?? 0;
  const stepKeys = Object.keys(STEP_MAP);

  return (
    <div className="step-indicator">
      {STEP_LABELS.map((label, idx) => (
        <React.Fragment key={label}>
          <div
            className={`step-item ${idx > currentIdx ? "disabled" : ""}`}
            onClick={() => {
              if (idx < currentIdx) onStepChange(stepKeys[idx]);
            }}
          >
            <div
              className={`step-number ${
                idx < currentIdx
                  ? "completed"
                  : idx === currentIdx
                  ? "active"
                  : "pending"
              }`}
            >
              {idx < currentIdx ? (
                <FaCheck style={{ fontSize: "0.7rem" }} />
              ) : (
                idx + 1
              )}
            </div>
            <span className="step-label">{label}</span>
          </div>

          {idx < STEP_LABELS.length - 1 && (
            <div
              className={`step-connector ${
                idx < currentIdx ? "done" : "pending"
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default StepIndicator;
