import { useCallback, useEffect, useRef, useState } from "react";

// The API has no progress stream: show one honest pending stage.
export const ANALYSIS_STAGES = [{ id: "analysis", label: "Normalizing input, running prediction, generating explanation and checking emergency indicators" }];

export default function useAnalysis() {
  const [phase, setPhase] = useState("idle");
  const [result, setResult] = useState(null);
  const active = useRef(null);
  const reset = useCallback(() => {
    active.current?.abort();
    active.current = null;
    setPhase("idle");
    setResult(null);
  }, []);
  const run = useCallback(async (fetcher) => {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setResult(null);
    setPhase("loading");
    let payload;
    try { payload = await fetcher(controller.signal); }
    catch (error) {
      payload = { ...error.result, status: "error", code: error.code, message: error.message || "Analysis service is unavailable." };
    }
    if (controller.signal.aborted) return null;
    payload.analyzedAt = new Date().toISOString();
    setResult(payload);
    setPhase("result");
    active.current = null;
    return payload;
  }, []);
  useEffect(() => () => active.current?.abort(), []);
  return { phase, activeStage: phase === "loading" ? 0 : -1, result, run, reset };
}
