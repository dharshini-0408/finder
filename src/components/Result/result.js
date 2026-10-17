import "./result.css";

const INCONCLUSIVE_MARGIN = 0.1;

function fakeScore(scores) {
  return scores.find((item) => item.label.toUpperCase() === "FAKE")?.score ?? 0;
}

function verdictFor(fake, aiTag) {
  if (aiTag) {
    return {
      key: "synthetic",
      title: "AI-generated",
      summary: `The file itself is labelled as AI-made (${aiTag.detail}).`,
    };
  }
  if (Math.abs(fake - 0.5) < INCONCLUSIVE_MARGIN) {
    return {
      key: "inconclusive",
      title: "Inconclusive",
      summary: "The signal is too weak to call either way.",
    };
  }
  return fake > 0.5
    ? {
        key: "synthetic",
        title: "AI-generated",
        summary: "Patterns consistent with synthetic imagery were detected.",
      }
    : {
        key: "authentic",
        title: "Authentic",
        summary: "No strong traces of AI generation were found.",
      };
}

const EDIT_STATUS = {
  edited: { badge: "Edited", fallback: "Editing software found in metadata." },
  possible: {
    badge: "Possible edits",
    fallback: "Some signals suggest local changes.",
  },
  clean: {
    badge: "No edits found",
    fallback: "No editing traces in metadata or compression.",
  },
};

const MAX_SIGNALS = 4;

function summaryFor(verdict, edits) {
  if (edits?.status !== "edited") return verdict.summary;
  if (verdict.key === "authentic") {
    return "Likely a real capture, but it has been edited.";
  }
  return `${verdict.summary} The file was also edited.`;
}

function EditCheck({ edits, isVideo }) {
  if (!edits) return null;
  const status = EDIT_STATUS[edits.status];
  const signals = edits.signals.slice(0, MAX_SIGNALS);

  return (
    <div className={`edits edits--${edits.status}`}>
      <div className="edits__head">
        <span className="result__eyebrow">Edit check</span>
        <span className="edits__badge">{status.badge}</span>
      </div>
      {signals.length > 0 ? (
        <ul className="edits__list">
          {signals.map((signal) => (
            <li
              key={signal.detail}
              className={`edits__signal edits__signal--${signal.strength}`}
            >
              <span>{signal.label}</span>
              {signal.detail}
            </li>
          ))}
        </ul>
      ) : (
        <p className="edits__note">{status.fallback}</p>
      )}
      {isVideo && (
        <p className="edits__note">For video, only the file metadata is checked.</p>
      )}
    </div>
  );
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export default function Result({ result, onReset }) {
  const fake = fakeScore(result.scores);
  const aiTag = result.edits?.signals.find((signal) => signal.kind === "ai");
  const verdict = verdictFor(fake, aiTag);
  const isEdited = result.edits?.status === "edited";

  return (
    <article className={`result result--${verdict.key}`}>
      <span className="result__eyebrow">Verdict</span>
      <div className="result__heading">
        <h2 className="result__title">{verdict.title}</h2>
        {isEdited && <span className="result__tag">+ Edited</span>}
      </div>
      <p className="result__summary">{summaryFor(verdict, result.edits)}</p>

      <div className="result__score">
        <span className="result__number">{formatPercent(fake)}</span>
        <span className="result__label">AI likelihood</span>
      </div>

      <div
        className="meter"
        role="img"
        aria-label={`${formatPercent(1 - fake)} real, ${formatPercent(fake)} AI`}
      >
        <span className="meter__real" style={{ width: `${(1 - fake) * 100}%` }} />
        <span className="meter__fake" style={{ width: `${fake * 100}%` }} />
      </div>
      <div className="meter__legend">
        <span>Real {formatPercent(1 - fake)}</span>
        <span>AI {formatPercent(fake)}</span>
      </div>

      <EditCheck edits={result.edits} isVideo={Boolean(result.frames)} />

      {result.frames && (
        <div className="filmstrip">
          <span className="result__eyebrow">
            Frame by frame / {result.frames.length} samples
          </span>
          <ol className="filmstrip__list">
            {result.frames.map((frame, index) => {
              const frameFake = fakeScore(frame.scores);
              return (
                <li
                  key={index}
                  className={`frame${frameFake > 0.5 ? " frame--flagged" : ""}`}
                >
                  <img src={frame.thumbnail} alt={`Frame at ${formatTime(frame.time)}`} />
                  <span className="frame__meta">
                    <span>{formatTime(frame.time)}</span>
                    <span>{Math.round(frameFake * 100)}%</span>
                  </span>
                  <span className="frame__bar">
                    <span style={{ width: `${frameFake * 100}%` }} />
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <button className="result__reset" type="button" onClick={onReset}>
        Scan another file
      </button>
    </article>
  );
}
