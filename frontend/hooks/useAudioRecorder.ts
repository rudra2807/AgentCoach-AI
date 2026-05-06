import { useRef, useState, useEffect } from "react";

export function useAudioRecorder() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const prevUrlRef = useRef<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const getSupportedMimeType = () => {
    if (typeof MediaRecorder === "undefined") return "";
    if (MediaRecorder.isTypeSupported("audio/mp4")) return "audio/mp4";
    if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
    return "";
  };

  const start = async () => {
    if (isRecording) return;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.error("Failed to get user media", err);
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];

    const mimeType = getSupportedMimeType();

    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);

    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      const blobType = mimeType || recorder.mimeType || "audio/mp4";
      const blob = new Blob(chunksRef.current, { type: blobType });

      setAudioBlob(blob);

      if (prevUrlRef.current) {
        URL.revokeObjectURL(prevUrlRef.current);
      }

      const url = URL.createObjectURL(blob);
      prevUrlRef.current = url;
      setAudioUrl(url);

      try {
        stream.getTracks().forEach((t) => t.stop());
      } catch {}
    };

    recorder.start();
    setIsRecording(true);
  };

  const stop = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    try {
      recorder.stop();
    } catch {}

    setIsRecording(false);
    mediaRecorderRef.current = null;
  };

  const clear = () => {
    if (prevUrlRef.current) {
      URL.revokeObjectURL(prevUrlRef.current);
      prevUrlRef.current = null;
    }
    setAudioBlob(null);
    setAudioUrl(null);
  };

  const getFile = (): File | null => {
    if (!audioBlob) return null;

    const type = audioBlob.type || "audio/mp4";
    const ext = type.includes("mp4") ? "m4a" : "webm";

    return new File([audioBlob], `recording-${Date.now()}.${ext}`, {
      type,
    });
  };

  useEffect(() => {
    return () => {
      try {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      } catch {}

      try {
        streamRef.current?.getTracks().forEach((t) => t.stop());
      } catch {}

      if (prevUrlRef.current) {
        URL.revokeObjectURL(prevUrlRef.current);
      }
    };
  }, []);

  return {
    start,
    stop,
    clear,
    getFile,
    isRecording,
    audioUrl,
  };
}
