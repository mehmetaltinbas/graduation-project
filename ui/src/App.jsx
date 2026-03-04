import axios from "axios";
import { useEffect, useState } from "react";
import DetectionList from "./components/DetectionList";
import Header from "./components/Header";
import ImagePreview from "./components/ImagePreview";
import UploadControls from "./components/UploadControls";

const API_URL = import.meta.env.VITE_API_URL;

export default function App() {
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [detections, setDetections] = useState(null);
    const [imageDims, setImageDims] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (file) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        setDetections(null);
        setImageDims(null);
        setError(null);
        return () => URL.revokeObjectURL(url);
        }
        setPreviewUrl(null);
    }, [file]);

    const handleFileChange = (e) => {
        setFile(e.target.files[0] || null);
    };

    const handlePredict = async () => {
        if (!file) return;
        setLoading(true);
        setError(null);
        setDetections(null);

        try {
            const form = new FormData();
            form.append("file", file);
            const { data } = await axios.post(`${API_URL}/predict`, form, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setDetections(data.detections);
            setImageDims({ width: data.image_width, height: data.image_height });
        } catch (err) {
            setError(err.response?.data?.detail || err.message || "Prediction failed");
        } finally {
            setLoading(false);
        }
    };

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />

      <main className="mx-auto max-w-5xl px-6 py-10 space-y-8">
        <UploadControls
          file={file}
          loading={loading}
          onFileChange={handleFileChange}
          onDetect={handlePredict}
        />

        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        {previewUrl && (
          <section className="grid gap-8 lg:grid-cols-[1fr_280px]">
            <ImagePreview
              previewUrl={previewUrl}
              detections={detections}
              imageDims={imageDims}
              loading={loading}
            />
            <div>
              <h2 className="text-xs font-medium uppercase tracking-wider text-white/40 mb-3">
                Results
              </h2>
              <DetectionList detections={detections} loading={loading} />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
