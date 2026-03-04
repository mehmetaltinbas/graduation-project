# Real-Time Weapon Detection in CCTV Footage

Object detection system using YOLOv8 for real-time weapon detection in CCTV footage.

## Project Structure

```
graduation-project/
├── ui/          → React dashboard (deployed on Vercel)
├── api/           → FastAPI API + inference (deployed on VPS via Docker)
└── model/             → YOLOv8 training data & scripts (not deployed)
```

## How It All Fits Together

1. **Train the model** (`model/`) — runs YOLOv8s on the dataset, produces `best.pt`
2. **Copy weights** — `best.pt` goes into `api/weights/`
3. **API serves predictions** (`api/`) — receives an image, runs inference, returns detections
4. **UI displays results** (`ui/`) — uploads image, draws bounding boxes on a canvas overlay

## Environment Variables

### API (`api/.env`)

| Variable               | Description                                | Default                 |
| ---------------------- | ------------------------------------------ | ----------------------- |
| `HOST`                 | Server bind address                        | `0.0.0.0`               |
| `PORT`                 | Server port                                | `8000`                  |
| `CORS_ORIGINS`         | Allowed frontend origins (comma-separated) | `http://localhost:5173` |
| `MODEL_PATH`           | Path to YOLO weights file                  | `weights/best.pt`       |
| `CONFIDENCE_THRESHOLD` | Min detection confidence (0-1)             | `0.5`                   |

### UI (`ui/.env`)

| Variable       | Description  | Default                 |
| -------------- | ------------ | ----------------------- |
| `VITE_API_URL` | API base URL | `http://127.0.0.1:8000` |

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
# See model/README.md for training instructions
# After training, copy best.pt to api/weights/
```
