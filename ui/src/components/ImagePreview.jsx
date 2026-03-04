import { useRef, useEffect, useCallback } from "react";

export default function ImagePreview({ previewUrl, detections, imageDims, loading }) {
    const imgRef = useRef(null);
    const canvasRef = useRef(null);

    const drawBoxes = useCallback(() => {
        const img = imgRef.current;
        const canvas = canvasRef.current;
        if (!img || !canvas) return;

        const displayW = img.clientWidth;
        const displayH = img.clientHeight;
        canvas.width = displayW;
        canvas.height = displayH;

        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, displayW, displayH);

        if (!detections || !imageDims) return;

        const scaleX = displayW / imageDims.width;
        const scaleY = displayH / imageDims.height;

        detections.forEach((det) => {
            const [x1, y1, x2, y2] = det.bbox;
            const sx1 = x1 * scaleX;
            const sy1 = y1 * scaleY;
            const sx2 = x2 * scaleX;
            const sy2 = y2 * scaleY;

            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 1.5;
            ctx.strokeRect(sx1, sy1, sx2 - sx1, sy2 - sy1);

            const label = `${det.label} ${Math.round(det.confidence * 100)}%`;
            ctx.font = "500 12px -apple-system, sans-serif";
            const textW = ctx.measureText(label).width;
            ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            ctx.fillRect(sx1, sy1 - 18, textW + 10, 18);
            ctx.fillStyle = "#fff";
            ctx.fillText(label, sx1 + 5, sy1 - 5);
        });
    }, [detections, imageDims]);

    useEffect(() => {
        drawBoxes();
        window.addEventListener("resize", drawBoxes);
        return () => window.removeEventListener("resize", drawBoxes);
    }, [drawBoxes]);

    return (
        <div className="relative inline-block">
            <img
            ref={imgRef}
            src={previewUrl}
            alt="Uploaded preview"
            onLoad={drawBoxes}
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
