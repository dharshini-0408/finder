import { useEffect, useState } from "react";
import { subscribeModelStatus } from "../../services/aiDetector";
import "./header.css";

function statusText({ state, progress }) {
  switch (state) {
    case "loading":
      return `Loading model ${Math.round(progress)}%`;
    case "ready":
      return "Model ready";
    case "error":
      return "Model offline";
    default:
      return "Standby";
  }
}

export default function Header() {
  const [status, setStatus] = useState({ state: "idle", progress: 0 });

  useEffect(() => subscribeModelStatus(setStatus), []);

  return (
    <header className="header">
      <a className="header__brand" href="/" aria-label="Finder home">
        <span className="header__mark" aria-hidden="true" />
        <span className="header__wordmark">Finder</span>
      </a>

      <div
        className={`header__status header__status--${status.state}`}
        role="status"
      >
        <span className="header__dot" aria-hidden="true" />
        {statusText(status)}
      </div>
    </header>
  );
}
