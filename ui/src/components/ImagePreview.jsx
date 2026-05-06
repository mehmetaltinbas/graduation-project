import { useRef, useEffect, useCallback } from "react";
import { drawBoxes } from "../utils/draw-boxes.util";

export default function ImagePreview({
    imageUrl,
    detections,
    imageDims,
    loading,
}) {
    const imgRef = useRef(null);
    const canvasRef = useRef(null);

    const redraw = useCallback(() => {
        const img = imgRef.current;
        const canvas = canvasRef.current;
        if (!img || !canvas) return;
        drawBoxes(canvas, img.clientWidth, img.clientHeight, imageDims, detections);
    }, [detections, imageDims]);

    useEffect(() => {
        redraw();
        window.addEventListener("resize", redraw);
        return () => window.removeEventListener("resize", redraw);
    }, [redraw]);

    return (
        <div className="relative inline-block">
            <img
                ref={imgRef}
                src={imageUrl}
                onLoad={redraw}
                alt="Uploaded preview"
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
