import { useEffect, useRef, useState } from "react";
import { MAX_FRAME_EDGE } from "../constants/max-frame-edge.constant";
import { WS_URL } from "../constants/wd-url.constant";
import { drawDetections } from "../utils/draw-detections.util";

// "Live" mode hook. Mirrors use-video-detection.hook.js (same capture loop,
// socket machinery, reconnect/backoff, run-id staleness guards and stats), but
// the frame source is a camera (getUserMedia) instead of a file. Frames go to the
// same /predict/ws endpoint the video mode uses, and detections are painted onto
// the captured frame locally. To use a phone's camera, expose the phone as a
// webcam to this machine (iPhone Continuity Camera, or an Android virtual-camera
// app) and pick it from the camera dropdown.
export function useLiveDetection(result) {
    const { setDetections, setImageDims, setLoading, setError, setLastLatencyMs } = result;

    const videoRef = useRef(null);
    const captureCanvasRef = useRef(null);
    const displayCanvasRef = useRef(null);
    const streamRef = useRef(null);
    const pendingFrameRef = useRef(null);
    const requestInFlightRef = useRef(false);
    const detectionRunIdRef = useRef(0);
    const socketRef = useRef(null);
    const lastSentAtRef = useRef(0);
    const reconnectAttemptsRef = useRef(0);
    const reconnectTimerRef = useRef(null);
    const activeStartedAtRef = useRef(null);
    const accumulatedActiveMsRef = useRef(0);

    const [cameras, setCameras] = useState([]);
    const [cameraId, setCameraId] = useState(null);
    const [cameraReady, setCameraReady] = useState(false);
    const [isDetecting, setIsDetecting] = useState(false);
    const [sentFrameCount, setSentFrameCount] = useState(0);
    const [sessionSeconds, setSessionSeconds] = useState(0);

    useEffect(() => {
        return () => {
            closeSocket();
            stopCamera();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const stopCamera = () => {
        const stream = streamRef.current;
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        const video = videoRef.current;
        if (video) video.srcObject = null;
        setCameraReady(false);
    };

    const refreshCameraList = async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            setCameras(devices.filter((d) => d.kind === "videoinput"));
        } catch {
            // Non-fatal: the picker just won't list device names.
        }
    };

    const startCamera = async (deviceId) => {
        if (!navigator.mediaDevices?.getUserMedia) {
            setError("Camera access isn't available in this browser/context.");
            return;
        }
        // Switching cameras: tear down the old stream first.
        stopCamera();
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: deviceId ? { deviceId: { exact: deviceId } } : true,
            });
            streamRef.current = stream;
            const video = videoRef.current;
            if (video) {
                video.srcObject = stream;
                await video.play().catch(() => {});
            }
            setCameraReady(true);
            setError(null);
            setCameraId(stream.getVideoTracks()[0]?.getSettings().deviceId ?? deviceId ?? null);
            // Device labels are only populated after permission is granted.
            refreshCameraList();
        } catch {
            setError("Could not access the camera. Check permissions and try again.");
        }
    };

    const discardPendingFrame = () => {
        if (pendingFrameRef.current) {
            pendingFrameRef.current.close();
            pendingFrameRef.current = null;
        }
    };

    const paintResult = (dims, detections) => {
        const canvas = displayCanvasRef.current;
        const frame = pendingFrameRef.current;
        if (!canvas || !frame) return;
        const w = frame.width;
        const h = frame.height;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(frame, 0, 0);
        drawDetections(ctx, w, h, dims, detections);
        frame.close();
        pendingFrameRef.current = null;
    };

    const clearReconnect = () => {
        if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        }
    };

    const closeSocket = () => {
        clearReconnect();
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
        discardPendingFrame();
    };

    const MAX_RECONNECT_ATTEMPTS = 5;

    const scheduleReconnect = (runId) => {
        if (runId !== detectionRunIdRef.current) return;
        if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
            setError("Detection connection lost. Stop and start detection again to retry.");
            return;
        }
        const delay = Math.min(8000, 500 * 2 ** reconnectAttemptsRef.current);
        reconnectAttemptsRef.current += 1;
        reconnectTimerRef.current = setTimeout(() => {
            reconnectTimerRef.current = null;
            if (runId !== detectionRunIdRef.current) return;
            openSocket();
        }, delay);
    };

    const openSocket = () => {
        closeSocket();
        const socket = new WebSocket(WS_URL);
        socket.binaryType = "arraybuffer";
        socketRef.current = socket;
        const runId = detectionRunIdRef.current;

        socket.onopen = () => {
            if (runId !== detectionRunIdRef.current) return;
            reconnectAttemptsRef.current = 0;
            setError(null);
            runFrameDetection();
        };

        socket.onmessage = (event) => {
            if (runId !== detectionRunIdRef.current) return;
            try {
                const data = JSON.parse(event.data);
                if (data.error) {
                    requestInFlightRef.current = false;
                    setLoading(false);
                    runFrameDetection();
                    return;
                }
                const dims = { width: data.image_width, height: data.image_height };
                setDetections(data.detections);
                setImageDims(dims);
                setLastLatencyMs(Math.round(performance.now() - lastSentAtRef.current));
                setError(null);
                paintResult(dims, data.detections);
            } catch {
                setError("Bad response from detection server.");
            } finally {
                requestInFlightRef.current = false;
                setLoading(false);
            }
            runFrameDetection();
        };

        socket.onerror = () => {
            if (runId !== detectionRunIdRef.current) return;
            requestInFlightRef.current = false;
            setLoading(false);
        };

        socket.onclose = (event) => {
            if (runId !== detectionRunIdRef.current) return;
            requestInFlightRef.current = false;
            setLoading(false);
            if (event.code === 1008) {
                setError("Detection connection rejected by server.");
                return;
            }
            scheduleReconnect(runId);
        };
    };

    const runFrameDetection = async () => {
        const video = videoRef.current;
        const canvas = captureCanvasRef.current;
        const socket = socketRef.current;
        if (!video || !canvas || !socket) return;
        if (socket.readyState !== WebSocket.OPEN) return;
        if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) return;
        if (requestInFlightRef.current) return;

        const requestRunId = detectionRunIdRef.current;
        requestInFlightRef.current = true;
        setLoading(true);
        const startedAt = performance.now();
        setSentFrameCount((prev) => prev + 1);

        try {
            const srcW = video.videoWidth;
            const srcH = video.videoHeight;
            const scale = Math.min(1, MAX_FRAME_EDGE / Math.max(srcW, srcH));
            const dstW = Math.round(srcW * scale);
            const dstH = Math.round(srcH * scale);

            const ctx = canvas.getContext("2d");
            canvas.width = dstW;
            canvas.height = dstH;
            ctx.drawImage(video, 0, 0, dstW, dstH);

            const frameBitmap = await createImageBitmap(canvas);

            const frameBlob = await new Promise((resolve, reject) => {
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error("Could not capture camera frame."));
                    }
                }, "image/jpeg", 0.6);
            });

            if (requestRunId !== detectionRunIdRef.current) {
                frameBitmap.close();
                return;
            }
            const live = socketRef.current;
            if (!live || live.readyState !== WebSocket.OPEN) {
                frameBitmap.close();
                return;
            }

            const buffer = await frameBlob.arrayBuffer();
            discardPendingFrame();
            pendingFrameRef.current = frameBitmap;
            lastSentAtRef.current = startedAt;
            live.send(buffer);
        } catch (err) {
            if (requestRunId !== detectionRunIdRef.current) return;
            requestInFlightRef.current = false;
            setLoading(false);
            setError(err.message || "Failed to send frame.");
        }
    };

    const handleToggleDetection = () => {
        if (!cameraReady) return;

        if (isDetecting) {
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
        activeStartedAtRef.current = null;
        accumulatedActiveMsRef.current = 0;
        setSessionSeconds(0);
        setIsDetecting(true);
        detectionRunIdRef.current += 1;
        reconnectAttemptsRef.current = 0;
        openSocket();
    };

    useEffect(() => {
        // Accumulate session time while detection is on (the camera stream plays
        // continuously, so there's no separate "playing" gate like video mode).
        if (!isDetecting) return;

        activeStartedAtRef.current = Date.now();
        const tick = () => {
            const ongoing =
                activeStartedAtRef.current !== null
                    ? Date.now() - activeStartedAtRef.current
                    : 0;
            setSessionSeconds(
                Math.floor((accumulatedActiveMsRef.current + ongoing) / 1000),
            );
        };
        const timer = setInterval(tick, 1000);

        return () => {
            clearInterval(timer);
            if (activeStartedAtRef.current !== null) {
                accumulatedActiveMsRef.current += Date.now() - activeStartedAtRef.current;
                activeStartedAtRef.current = null;
            }
        };
    }, [isDetecting]);

    const reset = () => {
        detectionRunIdRef.current += 1;
        closeSocket();
        stopCamera();
        setIsDetecting(false);
        setSentFrameCount(0);
        activeStartedAtRef.current = null;
        accumulatedActiveMsRef.current = 0;
        setSessionSeconds(0);
    };

    const effectiveFps =
        sessionSeconds > 0 ? (sentFrameCount / sessionSeconds).toFixed(1) : "0.0";

    return {
        videoRef,
        captureCanvasRef,
        displayCanvasRef,
        cameras,
        cameraId,
        cameraReady,
        isDetecting,
        sentFrameCount,
        sessionSeconds,
        effectiveFps,
        startCamera,
        handleToggleDetection,
        reset,
    };
}
