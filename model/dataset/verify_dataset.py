import os

# ================================
# 🧩 CONFIGURATION
# ================================

# Full path to your dataset folder
dataset_path = "/Users/rak/Documents/GitHub/GraduationProject/model/dataset"

# Define folders
images_dir = os.path.join(dataset_path, "train", "images")
labels_dir = os.path.join(dataset_path, "train", "labels")

# Classes (from your data.yaml)
classes = ["knife", "pistol", "class_2", "class_3", "class_4"]

# ================================
# 🔍 VERIFY IMAGE-LABEL MATCHING
# ================================

image_files = set([
    os.path.splitext(f)[0]
    for f in os.listdir(images_dir)
    if f.lower().endswith((".jpg", ".jpeg", ".png"))
])

label_files = set([
    os.path.splitext(f)[0]
    for f in os.listdir(labels_dir)
    if f.lower().endswith(".txt")
])

missing_labels = image_files - label_files
missing_images = label_files - image_files

print("=== IMAGE-LABEL VERIFICATION ===")
print(f"🖼️  Images without labels: {len(missing_labels)}")
if missing_labels:
    print("   →", list(missing_labels)[:5], "...")

print(f"📄 Labels without images: {len(missing_images)}")
if missing_images:
    print("   →", list(missing_images)[:5], "...")

# ================================
# ⚠️ CHECK LABEL CONTENTS
# ================================
invalid_labels = []

for label_file in os.listdir(labels_dir):
    if not label_file.endswith(".txt"):
        continue
    with open(os.path.join(labels_dir, label_file)) as f:
        for line in f:
            if not line.strip():
                continue
            try:
                class_id = int(line.split()[0])
                if class_id >= len(classes):
                    invalid_labels.append((label_file, class_id))
            except ValueError:
                print(f"⚠️ Non-integer class ID found in {label_file}: {line.strip()}")

if invalid_labels:
    print("\n=== ⚠️ INVALID CLASS IDS FOUND ===")
    for file, cid in invalid_labels[:10]:  # limit preview
        print(f"   {file}: {cid}")
    print(f"Total invalid entries: {len(invalid_labels)}")
else:
    print("\n✅ All label files have valid class IDs.")

print("\n✅ Verification complete.")
