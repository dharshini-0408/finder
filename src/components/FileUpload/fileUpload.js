import { useState } from "react";
import { loadDetector } from "../../services/aiDetector";
import "./fileUpload.css";

function warmUp() {
  loadDetector().catch(() => {});
}

export default function FileUpload({ onFile, error }) {
  const [isDragging, setIsDragging] = useState(false);

  function onDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    onFile(event.dataTransfer.files[0]);
  }

  return (
    <label
      className={`dropzone${isDragging ? " dropzone--active" : ""}`}
      onPointerEnter={warmUp}
      onFocus={warmUp}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
    >
      <input
        className="dropzone__input"
        type="file"
        accept="image/*,video/*"
        onChange={(event) => {
          onFile(event.target.files[0]);
          event.target.value = "";
        }}
      />
      <span className="corners" aria-hidden="true" />
      <span className="dropzone__target" aria-hidden="true">
        <span className="dropzone__radar" />
        <span className="dropzone__icon">+</span>
      </span>
      <span className="dropzone__title">
        {isDragging ? "Release to scan" : "Drop an image or video"}
      </span>
      <span className="dropzone__hint">
        or click to browse / JPG · PNG · WEBP · MP4 · MOV · WEBM
      </span>
      {error && <span className="dropzone__error">{error}</span>}
    </label>
  );
}
