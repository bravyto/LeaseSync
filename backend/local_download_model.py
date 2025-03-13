from transformers import AutoModelForTokenClassification, AutoTokenizer
import os

MODEL_NAME = "FacebookAI/xlm-roberta-large-finetuned-conll03-english"
LOCAL_PATH = "./models/xlmrobertaconll03"  # Local storage path

# Check if the model is already downloaded
if not os.path.exists(LOCAL_PATH):
    print("🚀 Downloading the model...")

    # Download model & tokenizer
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    tokenizer.save_pretrained(LOCAL_PATH)

    model = AutoModelForTokenClassification.from_pretrained(MODEL_NAME)
    model.save_pretrained(LOCAL_PATH)

    print("✅ Model downloaded and saved locally!")
else:
    print("⚡ Model already exists locally, skipping download.")
