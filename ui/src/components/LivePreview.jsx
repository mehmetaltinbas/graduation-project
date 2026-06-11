export default function LivePreview({
    videoRef,
    captureCanvasRef,
    displayCanvasRef,
    cameraReady,
    isDetecting,
}) {
    return (
        <div className="relative flex justify-center w-full aspect-video overflow-hidden rounded-lg bg-black/30">
            <div className="relative h-full shrink-0">
                {/* The live camera preview. autoPlay/muted/playsInline are required
                    for a MediaStream source to render (and to autoplay on mobile).
                    During detection the display canvas covers it with the analyzed
                    frames so boxes never drift from the picture. */}
                <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="block h-full w-auto"
                />

                {isDetecting && (
                    <canvas
                        ref={displayCanvasRef}
                        className="absolute top-0 left-0 h-full w-full bg-black"
                    />
                )}

                <canvas ref={captureCanvasRef} className="hidden" />
            </div>

            {!cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-white/40">
                    Choose a camera to start.
                </div>
            )}
        </div>
    );
}
