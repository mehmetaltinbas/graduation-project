from roboflow import Roboflow

# Your project credentials
rf = Roboflow(api_key="yFln7xXWISavCcWk1ZmU")
project = rf.workspace("rakymzhan-baimurat-6kqpv").project("weapon-detection-jqd3x-4auq8")
version = project.version(1)

# This command will download the folder to his computer
dataset = version.download("yolov8")

print(f"Dataset downloaded to: {dataset.location}")
