export function VideoMainControls({
    file,
    isPlaying,
    isDetecting,
    onFileChange,
    onPlayPause,
    onToggleDetection,
}) {
    return (
        <>
            <label className="cursor-pointer rounded-full bg-white px-5 py-2 text-sm font-medium text-black transition-opacity hover:opacity-80">
                Upload Video
                <input
                    type="file"
                    accept="video/*"
                    onChange={onFileChange}
                    className="hidden"
                />
            </label>

            {file && (
                <>
                    <span className="text-xs text-white/40 truncate max-w-48">
                        {file.name}
                    </span>

                    <button
                        onClick={onPlayPause}
                        className="w-24 shrink-0 rounded-full bg-white/10 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        {isPlaying ? "Pause" : "Play"}
                    </button>

                    <button
                        onClick={onToggleDetection}
                        className="w-40 shrink-0 rounded-full bg-white/10 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
                    >
                        {isDetecting ? "Stop Detection" : "Start Detection"}
                    </button>
                </>
            )}
        </>
    );
}
