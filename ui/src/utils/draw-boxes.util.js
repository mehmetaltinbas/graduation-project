import { drawDetections } from "./draw-detections.util";

// Clears `canvas`, sizes it to displayW×displayH, and draws the boxes. Used by
// the static image path where the boxes overlay a separate <img>.
export function drawBoxes(canvas, displayW, displayH, imageDims, detections) {
    if (!canvas) return;
    if (displayW <= 0 || displayH <= 0) return;
    canvas.width = displayW;
    canvas.height = displayH;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, displayW, displayH);

    drawDetections(ctx, displayW, displayH, imageDims, detections);
}
