import { useEffect, useRef, useState } from "react";
import AiDetector, { subscribeModelStatus } from "../services/aiDetector";
import detectEdits from "../services/editDetector";

function isSupported(file) {
  return file.type.startsWith("image/") || file.type.startsWith("video/");
}

export default function useDetection() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [step, setStep] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [modelStatus, setModelStatus] = useState({ state: "idle", progress: 0 });
  const runId = useRef(0);

  useEffect(() => subscribeModelStatus(setModelStatus), []);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function analyze(nextFile) {
    if (!nextFile) return;
    if (!isSupported(nextFile)) {
      setError("Unsupported file. Drop an image or a video.");
      return;
    }

    const id = ++runId.current;
    setFile(nextFile);
    setResult(null);
    setError(null);
    setStep({ stage: "loading-model" });

    const editCheck = detectEdits(nextFile).catch((editError) => {
      console.warn("Edit check failed:", editError);
      return null;
    });

    Promise.all([
      AiDetector(nextFile, (nextStep) => {
        if (runId.current === id) setStep(nextStep);
      }),
      editCheck,
    ])
      .then(([detection, edits]) => {
        if (runId.current === id) setResult({ ...detection, edits });
      })
      .catch((detectionError) => {
        console.error("Detection failed:", detectionError);
        if (runId.current === id) {
          setError("Could not analyze this file. Try another one.");
        }
      })
      .finally(() => {
        if (runId.current === id) setStep(null);
      });
  }

  function reset() {
    runId.current++;
    setFile(null);
    setResult(null);
    setError(null);
    setStep(null);
  }

  return {
    file,
    previewUrl,
    step,
    result,
    error,
    modelStatus,
    isBusy: step !== null,
    analyze,
    reset,
  };
}
