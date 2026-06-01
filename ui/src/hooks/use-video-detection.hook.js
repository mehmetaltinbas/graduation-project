import { useEffect, useRef, useState } from "react";
import { API_URL } from "../constants/api-url.constant";
import { MAX_FRAME_EDGE } from "../constants/max-frame-edge.constant";
import { WS_URL } from "../constants/wd-url.constant";
import { drawDetections } from "../utils/draw-detections.util";

export function useVideoDetection(result) {
    const { setDetections, setImageDims, setLoading, setError, setLastLatencyMs, reset: resetResult } = result;

    const videoRef = useRef(null);
    const captureCanvasRef = useRef(null);
    // The canvas the user actually watches during detection. We paint the
    // analyzed frame and its boxes onto it together, so what's on screen is
    // always the exact frame the boxes belong to — no drift while the source
    // video keeps advancing underneath.
    const displayCanvasRef = useRef(null);
    // Snapshot of the frame currently in flight, set on send and consumed when
    // its detection result comes back. Held as an ImageBitmap so a later
    // capture overwriting captureCanvas can't corrupt it.
    const pendingFrameRef = useRef(null);
    const requestInFlightRef = useRef(false);
    const detectionRunIdRef = useRef(0);
    const socketRef = useRef(null);
    const lastSentAtRef = useRef(0);
    const reconnectAttemptsRef = useRef(0);
    const reconnectTimerRef = useRef(null);
    // Active-time accounting for effective FPS: we only count wall-clock
    // seconds during which detection is on AND the video is playing, since
    // those are the only intervals when frames can actually be sent.
    const activeStartedAtRef = useRef(null);
    const accumulatedActiveMsRef = useRef(0);

    const [file, setFile] = useState(null);
    const [url, setUrl] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isDetecting, setIsDetecting] = useState(false);
    const [sentFrameCount, setSentFrameCount] = useState(0);
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
            closeSocket();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const discardPendingFrame = () => {
        if (pendingFrameRef.current) {
            pendingFrameRef.current.close();
            pendingFrameRef.current = null;
        }
    };

    // Paint the in-flight frame and its boxes onto the display canvas in one
    // shot. Because both come from the same response cycle, the box geometry
    // can never lag the picture. Sizing the canvas to the frame's own pixels
    // means box coords (in API image space, == frame space) map 1:1; CSS scales
    // the whole canvas to fit, keeping frame and boxes locked together.
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
        // Backoff: 500ms, 1s, 2s, 4s, 8s.
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
            // Successful (re)connection — reset the backoff counter and clear
            // any stale "connection lost" error from a previous attempt.
            reconnectAttemptsRef.current = 0;
            setError(null);
            // Kick off the first frame as soon as the channel is open.
            runFrameDetection();
        };

        socket.onmessage = (event) => {
            if (runId !== detectionRunIdRef.current) return;
            try {
                const data = JSON.parse(event.data);
                const dims = { width: data.image_width, height: data.image_height };
                // Drive the sidebar (count + list) off React state...
                setDetections(data.detections);
                setImageDims(dims);
                setLastLatencyMs(Math.round(performance.now() - lastSentAtRef.current));
                setError(null);
                // ...but paint the canvas directly from the frame we sent, so
                // the picture and boxes update atomically instead of riding a
                // separate state -> effect -> redraw hop that could desync.
                paintResult(dims, data.detections);
            } catch {
                setError("Bad response from detection server.");
            } finally {
                requestInFlightRef.current = false;
                setLoading(false);
            }
            // Chain the next frame as soon as a response arrives. This makes
            // the effective send rate equal to the round-trip latency — no
            // wall-clock interval can do better, and any fixed interval would
            // either idle (interval > latency) or waste ticks (interval <
            // latency). runFrameDetection's own guards (video paused/ended,
            // socket not OPEN, etc.) keep this from running off the rails.
            runFrameDetection();
        };

        // onerror is always followed by onclose, so we only schedule the
        // reconnect from onclose to avoid double-scheduling.
        socket.onerror = () => {
            if (runId !== detectionRunIdRef.current) return;
            requestInFlightRef.current = false;
            setLoading(false);
        };

        socket.onclose = (event) => {
            if (runId !== detectionRunIdRef.current) return;
            requestInFlightRef.current = false;
            setLoading(false);
            // 1008 = policy violation (origin check). Reconnecting won't help —
            // surface the error directly.
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

            // Snapshot the exact pixels we're about to send. The response will
            // be painted onto this, guaranteeing boxes match the picture.
            const frameBitmap = await createImageBitmap(canvas);

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
            // Hand off the snapshot for the response to paint. Only ever one in
            // flight (requestInFlightRef gate), but close any prior straggler.
            discardPendingFrame();
            pendingFrameRef.current = frameBitmap;
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

        detectionRunIdRef.current += 1;
        closeSocket();

        setIsPlaying(false);
        setIsDetecting(false);
        setSentFrameCount(0);
        activeStartedAtRef.current = null;
        accumulatedActiveMsRef.current = 0;
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
        // Fresh session: ignore any leftover backoff state from a prior run
        // that the user gave up on.
        reconnectAttemptsRef.current = 0;
        // Socket open triggers the first runFrameDetection() in its onopen.
        openSocket();
    };

    const handleVideoEnded = () => {
        setIsPlaying(false);
        detectionRunIdRef.current += 1;
        closeSocket();
        setIsDetecting(false);
        setLoading(false);
        setLastLatencyMs(null);
        activeStartedAtRef.current = null;
        accumulatedActiveMsRef.current = 0;
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
        // Only accumulate session time while detection is on AND the video is
        // playing — pausing the video should freeze the counter so effective
        // FPS reflects the actual send rate, not wall-clock-with-idle-time.
        if (!isDetecting || !isPlaying) return;

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
                accumulatedActiveMsRef.current +=
                    Date.now() - activeStartedAtRef.current;
                activeStartedAtRef.current = null;
            }
        };
    }, [isDetecting, isPlaying]);

    const reset = () => {
        const video = videoRef.current;
        if (video && !video.paused) video.pause();
        detectionRunIdRef.current += 1;
        closeSocket();
        setFile(null);
        setIsPlaying(false);
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
        file,
        url,
        isPlaying,
        isDetecting,
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
