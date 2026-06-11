export function LiveMainControls({
    cameras,
    cameraId,
    cameraReady,
    isDetecting,
    onStartCamera,
    onToggleDetection,
}) {
    return (
        <>
            {cameraReady ? (
                <select
                    value={cameraId ?? ""}
                    onChange={(e) => onStartCamera(e.target.value)}
                    disabled={isDetecting}
                    className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    {cameras.map((cam, i) => (
                        <option key={cam.deviceId || i} value={cam.deviceId} className="bg-black">
                            {cam.label || `Camera ${i + 1}`}
                        </option>
                    ))}
                </select>
            ) : (
                <button
                    onClick={() => onStartCamera(null)}
                    className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black transition-opacity hover:opacity-80"
                >
                    Enable Camera
                </button>
            )}

            {cameraReady && (
                <button
                    onClick={onToggleDetection}
                    className="w-40 shrink-0 rounded-full bg-white/10 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
                >
                    {isDetecting ? "Stop Detection" : "Start Detection"}
                </button>
            )}
        </>
    );
}
