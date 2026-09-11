import { useState, useRef } from "react";
import { Mic, Square, Upload } from "lucide-react";
import { Btn } from "./atoms";
import { COLORS } from "../lib/ui";

export default function AudioRecorder({ value, onChange }) {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const mrRef = useRef(null);
  const chunksRef = useRef([]);

  async function start() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => onChange(reader.result);
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mrRef.current = mr;
      mr.start();
      setRecording(true);
    } catch (e) {
      setError("The browser mic isn't available here — you can upload an audio file instead of recording directly.");
    }
  }
  function stop() {
    if (mrRef.current && recording) { mrRef.current.stop(); setRecording(false); }
  }
  function handleFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => onChange(reader.result);
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {!recording ? (
          <Btn variant="primary" onClick={start}><Mic size={15} /> Record</Btn>
        ) : (
          <Btn variant="danger" onClick={stop}><Square size={15} /> Stop</Btn>
        )}
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium" style={{ borderColor: COLORS.border, color: COLORS.ink }}>
          <Upload size={15} /> Upload audio file
          <input type="file" accept="audio/*" className="hidden" onChange={handleFile} />
        </label>
        {recording && <span className="text-xs" style={{ color: COLORS.danger }}>Recording…</span>}
      </div>
      {error && <p className="text-xs" style={{ color: COLORS.warn }}>{error}</p>}
      {value && <audio controls src={value} className="h-10 w-full" style={{ maxWidth: 320 }} />}
    </div>
  );
}
