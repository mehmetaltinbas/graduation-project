export function drawBoxes(canvas, displayW, displayH, imageDims, detections) {
    if (!canvas) return;
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
}
