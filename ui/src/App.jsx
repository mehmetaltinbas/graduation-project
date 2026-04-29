import axios from "axios";
import { useEffect, useRef, useState } from "react";
import DetectionList from "./components/DetectionList";
import Header from "./components/Header";
import ImagePreview from "./components/ImagePreview";
import UploadControls from "./components/UploadControls";

const API_URL = import.meta.env.VITE_API_URL;
const FRAME_INTERVAL_MS = 300;
const SPEED_OPTIONS = [150, 300, 500, 800];

export default function App() {
    const videoRef = useRef(null);
    const captureCanvasRef = useRef(null);
    const detectionIntervalRef = useRef(null);
    const requestInFlightRef = useRef(false);
    const detectionRunIdRef = useRef(0);

    const [videoFile, setVideoFile] = useState(null);
    const [videoUrl, setVideoUrl] = useState(null);
    const [detections, setDetections] = useState(null);
    const [imageDims, setImageDims] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isDetecting, setIsDetecting] = useState(false);
    const [frameIntervalMs, setFrameIntervalMs] = useState(FRAME_INTERVAL_MS);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastLatencyMs, setLastLatencyMs] = useState(null);
    const [sentFrameCount, setSentFrameCount] = useState(0);
    const [detectionStartedAt, setDetectionStartedAt] = useState(null);
    const [sessionSeconds, setSessionSeconds] = useState(0);

    useEffect(() => {
        if (videoFile) {
            const url = URL.createObjectURL(videoFile);
            setVideoUrl(url);
            setDetections(null);
            setImageDims(null);
            setError(null);
            setIsPlaying(false);
            setIsDetecting(false);
            setLoading(false);
            setLastLatencyMs(null);
            setSentFrameCount(0);
            setDetectionStartedAt(null);
            setSessionSeconds(0);
            detectionRunIdRef.current += 1;
            return () => URL.revokeObjectURL(url);
        }
        setVideoUrl(null);
    }, [videoFile]);

    useEffect(() => {
        return () => {
            if (detectionIntervalRef.current) {
                clearInterval(detectionIntervalRef.current);
                detectionIntervalRef.current = null;
            }
        };
    }, []);

    const handleFileChange = (e) => {
        const nextFile = e.target.files[0] || null;
        if (!nextFile) return;

        if (detectionIntervalRef.current) {
            clearInterval(detectionIntervalRef.current);
            detectionIntervalRef.current = null;
        }

        requestInFlightRef.current = false;
        detectionRunIdRef.current += 1;
        setVideoFile(nextFile);
    };

    const runFrameDetection = async () => {
        const video = videoRef.current;
        const canvas = captureCanvasRef.current;
        if (!video || !canvas) return;
        if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) return;
        if (video.paused || video.ended) return;
        if (requestInFlightRef.current) return;

        const requestRunId = detectionRunIdRef.current;
        requestInFlightRef.current = true;
        setLoading(true);
        const startedAt = performance.now();
        setSentFrameCount((prev) => prev + 1);

        try {
            const ctx = canvas.getContext("2d");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const frameBlob = await new Promise((resolve, reject) => {
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error("Could not capture video frame."));
                    }
                }, "image/jpeg", 0.9);
            });

            const form = new FormData();
            form.append("file", frameBlob, "frame.jpg");
            const { data } = await axios.post(`${API_URL}/predict`, form, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            if (requestRunId !== detectionRunIdRef.current) return;
            setDetections(data.detections);
            setImageDims({ width: data.image_width, height: data.image_height });
            setLastLatencyMs(Math.round(performance.now() - startedAt));
            setError(null);
        } catch (err) {
            if (requestRunId !== detectionRunIdRef.current) return;
            setLastLatencyMs(Math.round(performance.now() - startedAt));
            setError(err.response?.data?.detail || err.message || "Prediction failed");
        } finally {
            requestInFlightRef.current = false;
            if (requestRunId === detectionRunIdRef.current) {
                setLoading(false);
            }
        }
    };

    const handlePlayPause = () => {
        const video = videoRef.current;
        if (!video) return;

        if (video.paused || video.ended) {
            video.play();
            setIsPlaying(true);
            return;
        }

        video.pause();
        setIsPlaying(false);
    };

    const handleToggleDetection = () => {
        if (!videoFile) return;

        if (isDetecting) {
            if (detectionIntervalRef.current) {
                clearInterval(detectionIntervalRef.current);
                detectionIntervalRef.current = null;
            }
            detectionRunIdRef.current += 1;
            requestInFlightRef.current = false;
            setIsDetecting(false);
            setLoading(false);
            setLastLatencyMs(null);
            return;
        }

        setError(null);
        setDetections(null);
        setImageDims(null);
        setLastLatencyMs(null);
        setSentFrameCount(0);
        setDetectionStartedAt(Date.now());
        setSessionSeconds(0);
        setIsDetecting(true);
        detectionRunIdRef.current += 1;
        runFrameDetection();
    };

    const handleVideoEnded = () => {
        setIsPlaying(false);
        if (detectionIntervalRef.current) {
            clearInterval(detectionIntervalRef.current);
            detectionIntervalRef.current = null;
        }
        detectionRunIdRef.current += 1;
        requestInFlightRef.current = false;
        setIsDetecting(false);
        setLoading(false);
        setLastLatencyMs(null);
        setDetectionStartedAt(null);
        setSessionSeconds(0);
    };

    const handleVideoPlaying = () => {
        setIsPlaying(true);
        if (isDetecting) {
            runFrameDetection();
        }
    };

    const handleVideoPause = () => {
        setIsPlaying(false);
    };

    useEffect(() => {
        if (!isDetecting || !isPlaying) {
            if (detectionIntervalRef.current) {
                clearInterval(detectionIntervalRef.current);
                detectionIntervalRef.current = null;
            }
            return;
        }

        detectionIntervalRef.current = setInterval(() => {
            runFrameDetection();
        }, frameIntervalMs);

        return () => {
            if (detectionIntervalRef.current) {
                clearInterval(detectionIntervalRef.current);
                detectionIntervalRef.current = null;
            }
        };
    }, [isDetecting, isPlaying, frameIntervalMs]);

    useEffect(() => {
        if (!isDetecting || !detectionStartedAt) {
            setSessionSeconds(0);
            return;
        }

        const timer = setInterval(() => {
            setSessionSeconds(Math.floor((Date.now() - detectionStartedAt) / 1000));
        }, 1000);

        return () => clearInterval(timer);
    }, [isDetecting, detectionStartedAt]);

    const effectiveFps =
        sessionSeconds > 0 ? Number((sentFrameCount / sessionSeconds).toFixed(1)) : 0;
    const detectionCount = detections?.length ?? 0;

    const getFriendlyError = (rawError) => {
        if (!rawError) return null;
        const message = String(rawError);
        const lower = message.toLowerCase();
        if (lower.includes("network") || lower.includes("failed to fetch")) {
            return "API baglantisi kurulamadı. Sunucunun calistigini kontrol et.";
        }
        if (lower.includes("invalid image")) {
            return "Video karesi okunamadi. Farkli bir video deneyin.";
        }
        if (lower.includes("upload an image")) {
            return "Frame gonderimi gecersiz. UI'dan yeniden Start Detection deneyin.";
        }
        return message;
    };

    const friendlyError = getFriendlyError(error);

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />

      <main className="mx-auto max-w-5xl px-6 py-10 space-y-8">
        <UploadControls
          file={videoFile}
          isPlaying={isPlaying}
          isDetecting={isDetecting}
          loading={loading}
          hasError={Boolean(error)}
              isDetectionWaiting={isDetecting && !isPlaying}
          lastLatencyMs={lastLatencyMs}
          sentFrameCount={sentFrameCount}
          sessionSeconds={sessionSeconds}
          effectiveFps={effectiveFps}
          frameIntervalMs={frameIntervalMs}
          speedOptions={SPEED_OPTIONS}
          onFileChange={handleFileChange}
          onPlayPause={handlePlayPause}
          onToggleDetection={handleToggleDetection}
          onFrameIntervalChange={setFrameIntervalMs}
        />

        {friendlyError && (
          <p className="text-sm text-red-400">{friendlyError}</p>
        )}

        {videoUrl && (
          <section className="grid gap-8 lg:grid-cols-[1fr_280px]">
            <ImagePreview
              videoRef={videoRef}
              videoUrl={videoUrl}
              detections={detections}
              imageDims={imageDims}
              loading={loading}
              onEnded={handleVideoEnded}
              onPlaying={handleVideoPlaying}
              onPause={handleVideoPause}
            />
            <div>
              <h2 className="text-xs font-medium uppercase tracking-wider text-white/40 mb-3">
                Results
              </h2>
              <p className="mb-3 text-xs text-white/50">
                {loading
                  ? "Analyzing latest frame..."
                  : `Latest frame detections: ${detectionCount}`}
              </p>
              <DetectionList detections={detections} loading={loading} />
            </div>
          </section>
        )}
      </main>

      <canvas ref={captureCanvasRef} className="hidden" />
    </div>
  );
}
