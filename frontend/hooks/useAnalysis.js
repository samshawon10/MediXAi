import { useCallback, useEffect, useRef, useState } from "react";

export const ANALYSIS_STAGES = [
  { id: "patient", label: "Processing patient information" },
  { id: "normalize", label: "Normalizing symptoms" },
  { id: "features", label: "Extracting symptom features" },
  { id: "predict", label: "Running ML prediction" },
  { id: "explain", label: "Preparing explanation" },
];

/**
 * Analysis lifecycle hook.
 *
 * Modes:
 *   - No fetcher provided (current 30% phase): plays the loading sequence as a
 *     UX preview and resolves to a `not_connected` result so the UI shows honest
 *     empty/locked states.
 *   - A fetcher (async fn returning a JSON prediction) is provided: the sequence
 *     plays and the result is taken from the real network response. This makes the
 *     hook reusable for the future FastAPI/Express integration without redesigning
 *     the UI.
 *
 * Returns: { phase, activeStage, result, run, reset } (phase: idle|loading|result)
 */
export default function useAnalysis(stages = ANALYSIS_STAGES) {
  const [phase, setPhase] = useState("idle");
  const [activeStage, setActiveStage] = useState(-1);
  const [result, setResult] = useState(null);
  const timers = useRef([]);

  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };

  const reset = useCallback(() => {
    clearTimers();
    setPhase("idle");
    setActiveStage(-1);
    setResult(null);
  }, []);

  const run = useCallback(
    async (fetcher) => {
      clearTimers();
      setResult(null);
      setPhase("loading");
      setActiveStage(0);

      return new Promise((resolve) => {
        stages.forEach((_, i) => {
          timers.current.push(setTimeout(() => setActiveStage(i), i * 720));
        });

        const finishAt = stages.length * 720 + 450;
        timers.current.push(
          setTimeout(async () => {
            let payload = { status: "not_connected" };
            if (typeof fetcher === "function") {
              try {
                payload = await fetcher();
              } catch (e) {
                payload = {
                  status: "error",
                  message: e?.message || "Analysis service is unavailable.",
                };
              }
            }
            setResult(payload);
            setPhase("result");
            resolve(payload);
          }, finishAt)
        );
      });
    },
    [stages]
  );

  useEffect(() => clearTimers, []);

  return { phase, activeStage, result, run, reset };
}