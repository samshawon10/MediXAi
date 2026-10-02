import { useCallback, useState } from "react";
import { normalizeChip } from "@/lib/symptoms";

export default function useSymptomInput() {
  const [chips, setChips] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const parse = useCallback((input) => {
    return String(input)
      .split(/[,;]+/)
      .map(normalizeChip)
      .filter(Boolean);
  }, []);

  const addMany = useCallback(
    (items) => {
      const additions = [...new Set(items.map((s) => s.trim().toLowerCase()))]
        .filter((s) => s && !chips.includes(s));
      if (additions.length) setChips((prev) => [...prev, ...additions]);
      return additions;
    },
    [chips]
  );

  const addFromText = useCallback(
    (value) => {
      const parsed = parse(value);
      const added = addMany(parsed);
      if (added.length) setError("");
      setText("");
      return added;
    },
    [parse, addMany]
  );

  const addSingle = useCallback(
    (value) => {
      const v = normalizeChip(value);
      if (!v) return;
      if (chips.includes(v)) return;
      setChips((prev) => [...prev, v]);
      setError("");
    },
    [chips]
  );

  const remove = useCallback(
    (value) => setChips((prev) => prev.filter((c) => c !== value)),
    []
  );

  const clearAll = useCallback(() => {
    setChips([]);
    setText("");
    setError("");
  }, []);

  return {
    chips,
    text,
    setText,
    error,
    setError,
    addFromText,
    addSingle,
    remove,
    clearAll,
  };
}
