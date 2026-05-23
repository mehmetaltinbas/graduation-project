import { useEffect, useRef, useState } from "react";
import { API_URL } from "../constants/api-url.constant";
import { FRAME_INTERVAL_MS } from "../constants/frame-interval-ms.constant";
import { MAX_FRAME_EDGE } from "../constants/max-frame-edge.constant";

// API_URL is http(s)://... — convert to ws(s)://... for the WebSocket endpoint.
const WS_URL = `${API_URL.replace(/^http/, "ws")}/predict/ws`;

export function useVideoDetection(result) {
    const { setDetections, setImageDims, setLoading, setError, setLastLatencyMs, reset: resetResult } = result;

    const videoRef = useRef(null);
    const captureCanvasRef = useRef(null);
    const detectionIntervalRef = useRef(null);
    const requestInFlightRef = useRef(false);
    const detectionRunIdRef = useRef(0);
    const socketRef = useRef(null);
    const lastSentAtRef = useRef(0);

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
            closeSocket();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const closeSocket = () => {
        const socket = socketRef.current;
        if (!socket) return;
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;
        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
            socket.close();
        }
        socketRef.current = null;
        requestInFlightRef.current = false;
    };

    const openSocket = () => {
        closeSocket();
        const socket = new WebSocket(WS_URL);
        socket.binaryType = "arraybuffer";
        socketRef.current = socket;
        const runId = detectionRunIdRef.current;

        socket.onopen = () => {
            if (runId !== detectionRunIdRef.current) return;
            // Kick off the first frame as soon as the channel is open.
            runFrameDetection();
        };

        socket.onmessage = (event) => {
            if (runId !== detectionRunIdRef.current) return;
            try {
                const data = JSON.parse(event.data);
                setDetections(data.detections);
                setImageDims({ width: data.image_width, height: data.image_height });
                setLastLatencyMs(Math.round(performance.now() - lastSentAtRef.current));
                setError(null);
            } catch {
                setError("Bad response from detection server.");
            } finally {
                requestInFlightRef.current = false;
                setLoading(false);
            }
        };

        socket.onerror = () => {
            if (runId !== detectionRunIdRef.current) return;
            setError("Detection connection error.");
            requestInFlightRef.current = false;
            setLoading(false);
        };

        socket.onclose = () => {
            if (runId !== detectionRunIdRef.current) return;
            requestInFlightRef.current = false;
            setLoading(false);
        };
    };

    const runFrameDetection = async () => {
        const video = videoRef.current;
        const canvas = captureCanvasRef.current;
        const socket = socketRef.current;
        if (!video || !canvas || !socket) return;
        if (socket.readyState !== WebSocket.OPEN) return;
        if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) return;
        if (video.paused || video.ended) return;
        if (requestInFlightRef.current) return;

        const requestRunId = detectionRunIdRef.current;
        requestInFlightRef.current = true;
        setLoading(true);
        const startedAt = performance.now();
        setSentFrameCount((prev) => prev + 1);

        try {
            // The YOLO model letterboxes input to 640x640 server-side, so any
            // pixels beyond that are pure upload + CPU resize waste. Downscale
            // the long edge to MAX_FRAME_EDGE here; bbox scaling in drawBoxes
            // uses the API-returned image_width/height so this is transparent
            // to the UI.
            const srcW = video.videoWidth;
            const srcH = video.videoHeight;
            const scale = Math.min(1, MAX_FRAME_EDGE / Math.max(srcW, srcH));
            const dstW = Math.round(srcW * scale);
            const dstH = Math.round(srcH * scale);

            const ctx = canvas.getContext("2d");
            canvas.width = dstW;
            canvas.height = dstH;
            ctx.drawImage(video, 0, 0, dstW, dstH);

            const frameBlob = await new Promise((resolve, reject) => {
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error("Could not capture video frame."));
                    }
                }, "image/jpeg", 0.6);
            });

            // Stale-check after the async encode: the user may have stopped
            // detection or switched files while we were encoding.
            if (requestRunId !== detectionRunIdRef.current) return;
            const live = socketRef.current;
            if (!live || live.readyState !== WebSocket.OPEN) return;

            const buffer = await frameBlob.arrayBuffer();
            lastSentAtRef.current = startedAt;
            live.send(buffer);
            // requestInFlightRef stays true; cleared in socket.onmessage.
        } catch (err) {
            if (requestRunId !== detectionRunIdRef.current) return;
            requestInFlightRef.current = false;
            setLoading(false);
            setError(err.message || "Failed to send frame.");
        }
    };

    const handleFileChange = (e) => {
        const nextFile = e.target.files[0] || null;
        if (!nextFile) return;

        if (detectionIntervalRef.current) {
            clearInterval(detectionIntervalRef.current);
            detectionIntervalRef.current = null;
        }

        detectionRunIdRef.current += 1;
        closeSocket();

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
            closeSocket();
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
        // Socket open triggers the first runFrameDetection() in its onopen.
        openSocket();
    };

    const handleVideoEnded = () => {
        setIsPlaying(false);
        if (detectionIntervalRef.current) {
            clearInterval(detectionIntervalRef.current);
            detectionIntervalRef.current = null;
        }
        detectionRunIdRef.current += 1;
        closeSocket();
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
        detectionRunIdRef.current += 1;
        closeSocket();
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
