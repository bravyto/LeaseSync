from transformers import pipeline, AutoModelForTokenClassification, AutoTokenizer

LOCAL_PATH = "./backend/models/layoutlmv3"  # Path to local model

def load_model():
    tokenizer = AutoTokenizer.from_pretrained(LOCAL_PATH)
    model = AutoModelForTokenClassification.from_pretrained(LOCAL_PATH)

    # Define NER pipeline
    ner_pipeline = pipeline("ner", model=model, tokenizer=tokenizer, aggregation_strategy="simple")

    return ner_pipeline

# Load the pipeline once
ner_pipeline = load_model()
