import { useRef, useEffect, useCallback } from "react";
import { drawBoxes } from "../utils/draw-boxes.util";

export default function VideoPreview({
    videoRef,
    captureCanvasRef,
    videoUrl,
    detections,
    imageDims,
    loading,
    onEnded,
    onPlaying,
    onPause,
}) {
    const overlayCanvasRef = useRef(null);

    const redraw = useCallback(() => {
        const video = videoRef.current;
        const canvas = overlayCanvasRef.current;
        if (!video || !canvas) return;
        drawBoxes(canvas, video.clientWidth, video.clientHeight, imageDims, detections);
    }, [detections, imageDims, videoRef]);

    useEffect(() => {
        redraw();
        window.addEventListener("resize", redraw);
        return () => window.removeEventListener("resize", redraw);
    }, [redraw]);

    return (
        <div className="relative inline-block">
            <video
                ref={videoRef}
                src={videoUrl}
                controls
                onLoadedMetadata={redraw}
                onTimeUpdate={redraw}
                onPlaying={onPlaying}
                onPause={onPause}
                onEnded={onEnded}
                className="max-w-full rounded-lg"
            />

            <canvas
                ref={overlayCanvasRef}
                className="absolute top-0 left-0 pointer-events-none"
            />

            <canvas ref={captureCanvasRef} className="hidden" />

            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg">
                    <div className="h-8 w-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
            )}
        </div>
    );
}
