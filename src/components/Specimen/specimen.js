import { useState } from "react";
import "./specimen.css";

export default function Specimen({ file, previewUrl, isScanning, elaMap }) {
  const [showMap, setShowMap] = useState(false);
  const isVideo = file.type.startsWith("video/");
  const mapVisible = showMap && Boolean(elaMap);

  return (
    <figure className={`specimen${isScanning ? " specimen--scanning" : ""}`}>
      <span className="corners" aria-hidden="true" />
      <div className="specimen__frame">
        {previewUrl &&
          (isVideo ? (
            <video
              className="specimen__media"
              src={previewUrl}
              controls
              muted
              playsInline
            />
          ) : (
            <img
              className="specimen__media"
              src={previewUrl}
              alt="Uploaded file being analyzed"
            />
          ))}
        {elaMap && (
          <img
            className={`specimen__media specimen__map${
              mapVisible ? " specimen__map--visible" : ""
            }`}
            src={elaMap}
            alt="Error level map: brighter areas compressed differently"
          />
        )}
        {isScanning && <span className="specimen__scanline" aria-hidden="true" />}
      </div>
      <figcaption className="specimen__caption">
        <span>{file.name}</span>
        {elaMap ? (
          <span className="specimen__toggle" role="group" aria-label="Preview mode">
            <button
              type="button"
              aria-pressed={!mapVisible}
              onClick={() => setShowMap(false)}
            >
              Original
            </button>
            <button
              type="button"
              aria-pressed={mapVisible}
              onClick={() => setShowMap(true)}
              title="Bright patches compressed differently from the rest, which can point to pasted or retouched areas."
            >
              Error map
            </button>
          </span>
        ) : (
          <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
        )}
      </figcaption>
    </figure>
  );
}
