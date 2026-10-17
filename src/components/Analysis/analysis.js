import "./analysis.css";

function stepText(step, modelStatus) {
  switch (step?.stage) {
    case "loading-model":
      return modelStatus.state === "ready"
        ? "Model ready"
        : `Loading model ${Math.round(modelStatus.progress)}%`;
    case "extracting":
      return "Extracting frames";
    case "analyzing":
      return step.total > 1
        ? `Analyzing frame ${step.current} / ${step.total}`
        : "Analyzing pixels";
    default:
      return "Preparing";
  }
}

function stageIndex(step) {
  switch (step?.stage) {
    case "extracting":
      return 1;
    case "analyzing":
      return 2;
    default:
      return 0;
  }
}

const STAGES = ["Model", "Frames", "Analyse"];

export default function Analysis({ step, modelStatus, error, onReset }) {
  if (error) {
    return (
      <div className="analysis">
        <span className="eyebrow">Error</span>
        <p className="analysis__step">{error}</p>
        <button className="button" type="button" onClick={onReset}>
          Try another file
        </button>
      </div>
    );
  }

  const active = stageIndex(step);

  return (
    <div className="analysis" role="status">
      <span className="eyebrow">Analysis in progress</span>
      <p className="analysis__step">{stepText(step, modelStatus)}</p>

      <ol className="analysis__stages">
        {STAGES.map((stage, index) => (
          <li
            key={stage}
            className={
              index < active ? "is-done" : index === active ? "is-active" : ""
            }
          >
            <span>0{index + 1}</span>
            {stage}
          </li>
        ))}
      </ol>

      <div className="analysis__ticker" aria-hidden="true">
        <span />
      </div>
      <p className="analysis__note">
        The first run downloads the model once. After that it is cached.
      </p>
      <button className="analysis__cancel" type="button" onClick={onReset}>
        Cancel
      </button>
    </div>
  );
}
