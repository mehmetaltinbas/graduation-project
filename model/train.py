"""
YOLOv8 training script for weapon detection.

Usage:
    cd model
    python train.py

Configuration is read from model/.env (see .env.example for required keys).
"""

import os

from dotenv import load_dotenv
from roboflow import Roboflow
from ultralytics import YOLO

load_dotenv()

api_key = os.environ["ROBOFLOW_API_KEY"]
workspace = os.environ["ROBOFLOW_WORKSPACE"]
project_id = os.environ["ROBOFLOW_PROJECT"]
version_number = int(os.environ["ROBOFLOW_VERSION"])
yolo_model = os.environ["YOLO_MODEL"]
epochs = int(os.environ["EPOCHS"])

rf = Roboflow(api_key=api_key)
project = rf.workspace(workspace).project(project_id)
version = project.version(version_number)
dataset = version.download("yolov8")

model = YOLO(yolo_model)

model.train(
    data=f"{dataset.location}/data.yaml",
    epochs=epochs,
    imgsz=640,
    device="mps"
)
