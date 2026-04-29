import { useRef, useEffect, useCallback } from "react";

export default function ImagePreview({
    videoRef,
    videoUrl,
    detections,
    imageDims,
    loading,
    onEnded,
    onPlaying,
    onPause,
}) {
    const canvasRef = useRef(null);

    const drawBoxes = useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        const displayW = video.clientWidth;
        const displayH = video.clientHeight;
        if (displayW <= 0 || displayH <= 0) return;
        canvas.width = displayW;
        canvas.height = displayH;

        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, displayW, displayH);

        if (!detections || !imageDims) return;
        if (imageDims.width <= 0 || imageDims.height <= 0) return;

        const scaleX = displayW / imageDims.width;
        const scaleY = displayH / imageDims.height;
        const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

        detections.forEach((det) => {
            if (!Array.isArray(det.bbox) || det.bbox.length !== 4) return;
            const [x1, y1, x2, y2] = det.bbox;
            if (![x1, y1, x2, y2].every((value) => Number.isFinite(value))) return;

            const rawX1 = x1 * scaleX;
            const rawY1 = y1 * scaleY;
            const rawX2 = x2 * scaleX;
            const rawY2 = y2 * scaleY;

            const sx1 = clamp(Math.min(rawX1, rawX2), 0, displayW);
            const sy1 = clamp(Math.min(rawY1, rawY2), 0, displayH);
            const sx2 = clamp(Math.max(rawX1, rawX2), 0, displayW);
            const sy2 = clamp(Math.max(rawY1, rawY2), 0, displayH);
            const boxW = sx2 - sx1;
            const boxH = sy2 - sy1;
            if (boxW < 1 || boxH < 1) return;

            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 1.5;
            ctx.strokeRect(sx1, sy1, boxW, boxH);

            const safeConfidence = Number.isFinite(det.confidence) ? det.confidence : 0;
            const label = `${det.label ?? "object"} ${Math.round(safeConfidence * 100)}%`;
            ctx.font = "500 12px -apple-system, sans-serif";
            const textW = ctx.measureText(label).width;
            const labelY = sy1 < 20 ? sy1 + 2 : sy1 - 18;
            ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            ctx.fillRect(sx1, labelY, textW + 10, 18);
            ctx.fillStyle = "#fff";
            ctx.fillText(label, sx1 + 5, labelY + 13);
        });
    }, [detections, imageDims]);

    useEffect(() => {
        drawBoxes();
        window.addEventListener("resize", drawBoxes);
        return () => window.removeEventListener("resize", drawBoxes);
    }, [drawBoxes]);

    return (
        <div className="relative inline-block">
            <video
                ref={videoRef}
                src={videoUrl}
                controls
                onLoadedMetadata={drawBoxes}
                onTimeUpdate={drawBoxes}
                onPlaying={onPlaying}
                onPause={onPause}
                onEnded={onEnded}
                className="max-w-full rounded-lg"
            />

            <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 pointer-events-none"
            />
            
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
                    <div className="h-8 w-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
            )}
        </div>
    );
}
