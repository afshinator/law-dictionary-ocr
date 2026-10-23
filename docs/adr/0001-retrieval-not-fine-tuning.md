# Retrieval, not fine-tuning

The endgame is a deterministic lookup over the extracted dictionary, not a fine-tuned
model. v1's plan was LoRA fine-tuning followed by an inference API. We chose retrieval:
it is verifiable (every result shows its source crop), correctable (fix an entry without
retraining), and cannot confabulate a legal equivalent. Fine-tuning is out of scope as an
accuracy mechanism.
