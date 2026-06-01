export default function VideoPreview({
    videoRef,
    captureCanvasRef,
    displayCanvasRef,
    videoUrl,
    loading,
    isDetecting,
    onEnded,
    onPlaying,
    onPause,
}) {
    return (
        <div className="relative flex justify-center w-full aspect-video overflow-hidden rounded-lg bg-black/30">
            <div className="relative h-full shrink-0">
                {/* When idle, the user previews/scrubs the raw video with native
                    controls. During detection the <video> keeps playing purely
                    as the frame source for the capture loop — we hide its
                    controls and mute it (audio would race ahead of the slower,
                    detection-paced frames) and let the display canvas cover it. */}
                <video
                    ref={videoRef}
                    src={videoUrl}
                    controls={!isDetecting}
                    muted={isDetecting}
                    onPlaying={onPlaying}
                    onPause={onPause}
                    onEnded={onEnded}
                    className="block h-full w-auto"
                />

                {/* The thing the user watches while detecting: each analyzed
                    frame is painted here together with its own boxes (in the
                    hook's socket.onmessage), so the box can't drift from the
                    picture — they are the same frame by construction. */}
                {isDetecting && (
                    <canvas
                        ref={displayCanvasRef}
                        className="absolute top-0 left-0 h-full w-full bg-black"
                    />
                )}

                <canvas ref={captureCanvasRef} className="hidden" />
            </div>

            {/* Keep the full-frame spinner only for the brief one-off load
                before detection starts; during continuous detection the
                StatusBadge + latency counter convey per-frame progress. */}
            {loading && !isDetecting && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <div className="h-8 w-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
            )}
        </div>
    );
}
