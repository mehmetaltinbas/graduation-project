import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { API_URL } from "../constants/api-url.constant";
import { FRAME_INTERVAL_MS } from "../constants/frame-interval-ms.constant";

export function useVideoDetection(result) {
    const { setDetections, setImageDims, setLoading, setError, setLastLatencyMs, reset: resetResult } = result;

    const videoRef = useRef(null);
    const captureCanvasRef = useRef(null);
    const detectionIntervalRef = useRef(null);
    const requestInFlightRef = useRef(false);
    const detectionRunIdRef = useRef(0);

    const [file, setFile] = useState(null);
    const [url, setUrl] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isDetecting, setIsDetecting] = useState(false);
    const [frameIntervalMs, setFrameIntervalMs] = useState(FRAME_INTERVAL_MS);
    const [sentFrameCount, setSentFrameCount] = useState(0);
    const [detectionStartedAt, setDetectionStartedAt] = useState(null);
    const [sessionSeconds, setSessionSeconds] = useState(0);

    useEffect(() => {
        if (!file) {
            setUrl(null);
            return;
        }
        const next = URL.createObjectURL(file);
        setUrl(next);
        return () => URL.revokeObjectURL(next);
    }, [file]);

    useEffect(() => {
        return () => {
            if (detectionIntervalRef.current) {
                clearInterval(detectionIntervalRef.current);
                detectionIntervalRef.current = null;
            }
        };
    }, []);

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

    const handleFileChange = (e) => {
        const nextFile = e.target.files[0] || null;
        if (!nextFile) return;

        if (detectionIntervalRef.current) {
            clearInterval(detectionIntervalRef.current);
            detectionIntervalRef.current = null;
        }

        requestInFlightRef.current = false;
        detectionRunIdRef.current += 1;

        setIsPlaying(false);
        setIsDetecting(false);
        setSentFrameCount(0);
        setDetectionStartedAt(null);
        setSessionSeconds(0);
        resetResult();

        setFile(nextFile);
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
        if (!file) return;

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

    const reset = () => {
        if (detectionIntervalRef.current) {
            clearInterval(detectionIntervalRef.current);
            detectionIntervalRef.current = null;
        }
        const video = videoRef.current;
        if (video && !video.paused) video.pause();
        requestInFlightRef.current = false;
        detectionRunIdRef.current += 1;
        setFile(null);
        setIsPlaying(false);
        setIsDetecting(false);
        setSentFrameCount(0);
        setDetectionStartedAt(null);
        setSessionSeconds(0);
    };

    const effectiveFps =
        sessionSeconds > 0 ? Number((sentFrameCount / sessionSeconds).toFixed(1)) : 0;

    return {
        videoRef,
        captureCanvasRef,
        file,
        url,
        isPlaying,
        isDetecting,
        frameIntervalMs,
        setFrameIntervalMs,
        sentFrameCount,
        sessionSeconds,
        effectiveFps,
        handleFileChange,
        handlePlayPause,
        handleToggleDetection,
        handleVideoEnded,
        handleVideoPlaying,
        handleVideoPause,
        reset,
    };
}
