# Real-Time Weapon Detection in CCTV Footage

Object detection system using YOLOv8 for real-time weapon detection in CCTV footage.

## Project Structure

```
graduation-project/
├── ui/               → React dashboard (deployed on Vercel)
├── api/             → FastAPI API + inference (deployed on VPS via Docker)
└── model/       → YOLOv8 training data & scripts (not deployed)
```

## How It All Fits Together

1. **Train the model** (`model/`) — runs YOLOv8s on the dataset, produces `best.pt`
2. **Copy weights** — `best.pt` goes into `api/weights/`
3. **API serves predictions** (`api/`) — receives an image, runs inference, returns detections
4. **UI displays results** (`ui/`) — uploads image, draws bounding boxes on a canvas overlay

## Environment Variables

Each module has its own `.env.example` listing the variables it expects — copy it to `.env` and fill in the values:

- `api/.env.example`
- `ui/.env.example`
- `model/.env.example`

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Make

### API

```bash
cd api
cp .env.example .env        # configure environment variables
make setup                   # creates .venv virtual environment
source .venv/bin/activate    # Windows: .venv\Scripts\activate
make install                 # installs dependencies
make dev                     # starts FastAPI on port 8000
```

### UI

```bash
cd ui
cp .env.example .env         # configure environment variables
npm install
npm run dev                  # starts Vite on port 5173
```

### Model Training

```bash
cd model
cp .env.example .env           # then fill in ROBOFLOW_API_KEY etc.
python train.py                # downloads Roboflow dataset + trains YOLO on MPS
```

`train.py` reads its configuration (API key, workspace, project, dataset version, base model) from `model/.env`, downloads the pinned dataset version, and trains for 10 epochs at `imgsz=640` on the Apple MPS device. Outputs land in `model/runs/detect/train*/weights/best.pt`.

After training, copy the weights into the API:

```bash
cp runs/detect/train/weights/best.pt ../api/weights/best.pt
```

#### Bumping the dataset version

When you label more images in Roboflow and publish a new version, just update `ROBOFLOW_VERSION` in `model/.env`:

```
ROBOFLOW_VERSION=3
```

Then re-run `python train.py` — no code changes needed. The Roboflow SDK downloads the new version into a fresh folder (e.g. `Real-Time-Weapon-Detection-in-CCTV-Footage-Using-Object-Detection-Algorithms-3/`) and training picks it up via `dataset.location`. Swap workspace/project the same way via `ROBOFLOW_WORKSPACE` and `ROBOFLOW_PROJECT`.
