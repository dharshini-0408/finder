import Analysis from "../../components/Analysis/analysis";
import FileUpload from "../../components/FileUpload/fileUpload";
import Result from "../../components/Result/result";
import Specimen from "../../components/Specimen/specimen";
import useDetection from "../../utils/useDetection";
import "./home.css";

const STEPS = [
  { title: "Drop", text: "A photo or video. It never leaves your device." },
  { title: "Scan", text: "A vision model reads pixel-level traces." },
  { title: "Verdict", text: "AI likelihood, frame by frame for video." },
];

function Hero() {
  return (
    <div className="hero">
      <span className="hero__eyebrow">AI image &amp; video detector</span>
      <h1 className="hero__title">
        <span className="hero__line">Real</span>
        <span className="hero__line hero__line--outline">or rendered?</span>
        <span className="hero__sweep" aria-hidden="true" />
      </h1>
      <p className="hero__lede">
        Find out whether an image or video was made by a camera or by a
        machine.
      </p>
      <ol className="steps">
        {STEPS.map((step, index) => (
          <li className="step" key={step.title}>
            <span className="step__index">0{index + 1}</span>
            <strong className="step__title">{step.title}</strong>
            <span className="step__text">{step.text}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function Home() {
  const detection = useDetection();
  const { file, previewUrl, result, error, isBusy } = detection;

  let panel = <Hero />;
  if (file && (isBusy || error)) {
    panel = (
      <Analysis
        step={detection.step}
        modelStatus={detection.modelStatus}
        error={error}
        onReset={detection.reset}
      />
    );
  } else if (file && result) {
    panel = <Result result={result} onReset={detection.reset} />;
  }

  return (
    <main className="home">
      <div className="home__panel" aria-live="polite">
        {panel}
      </div>
      <div className="home__stage">
        {file ? (
          <Specimen
            key={`${file.name}-${file.size}-${file.lastModified}`}
            file={file}
            previewUrl={previewUrl}
            isScanning={isBusy}
            elaMap={result?.edits?.elaMap}
          />
        ) : (
          <FileUpload onFile={detection.analyze} error={error} />
        )}
      </div>
    </main>
  );
}
