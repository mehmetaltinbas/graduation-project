export default function UploadControls({ file, loading, onFileChange, onDetect }) {
    return (
        <div className="flex items-center gap-3">
            <label className="cursor-pointer rounded-full bg-white px-5 py-2 text-sm font-medium text-black transition-opacity hover:opacity-80">
                Upload
                <input
                type="file"
                accept="image/*"
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
                        onClick={onDetect}
                        disabled={loading}
                        className="rounded-full bg-white/10 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        {loading ? "Analyzing..." : "Detect"}
                    </button>
                </>
            )}
        </div>
    );
}
