import { useRef, useState, useEffect } from "react";

export function useAudioRecorder() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const prevUrlRef = useRef<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

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

    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      setAudioBlob(blob);

      // Revoke previous URL if present
      if (prevUrlRef.current) {
        try {
          URL.revokeObjectURL(prevUrlRef.current);
        } catch (e) {}
      }

      const newUrl = URL.createObjectURL(blob);
      prevUrlRef.current = newUrl;
      setAudioUrl(newUrl);

      // Stop tracks
      try {
        recorder.stream.getTracks().forEach((t) => t.stop());
      } catch (e) {}
    };

    recorder.start();
    setIsRecording(true);
  };

  const stop = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    try {
      recorder.stop();
    } catch (e) {}
    setIsRecording(false);
    mediaRecorderRef.current = null;
  };

  const clear = () => {
    if (prevUrlRef.current) {
      try {
        URL.revokeObjectURL(prevUrlRef.current);
      } catch (e) {}
      prevUrlRef.current = null;
    }
    setAudioBlob(null);
    setAudioUrl(null);
  };

  const getFile = (): File | null => {
    if (!audioBlob) return null;
    return new File([audioBlob], `recording-${Date.now()}.webm`, {
      type: "audio/webm",
    });
  };

  // Cleanup on unmount: stop recorder, stop tracks, revoke URL
  useEffect(() => {
    return () => {
      try {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      } catch (e) {}

      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }
      } catch (e) {}

      if (prevUrlRef.current) {
        try {
          URL.revokeObjectURL(prevUrlRef.current);
        } catch (e) {}
        prevUrlRef.current = null;
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
