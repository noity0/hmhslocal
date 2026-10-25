"""
Python Client Example for LocalAI / OllamaNode API
Compatible with standard Ollama API clients and direct HTTP requests.
"""

import json
import requests

API_URL = "http://localhost:3000/api"

def list_models():
    res = requests.get(f"{API_URL}/tags")
    models = res.json().get("models", [])
    print(f"Installed Models ({len(models)}):")
    for m in models:
        print(f"  • {m['name']} ({m.get('details', {}).get('quantization_level', 'N/A')})")

def chat_stream(model="llama3.3:8b", prompt="Explain vector embeddings"):
    print(f"\nPrompting [{model}]: {prompt}\n")
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "stream": True,
    }
    with requests.post(f"{API_URL}/chat", json=payload, stream=True) as r:
        for line in r.iter_lines():
            if line:
                data = json.loads(line.decode("utf-8"))
                content = data.get("message", {}).get("content", "")
                print(content, end="", flush=True)
    print("\n")

if __name__ == "__main__":
    list_models()
    chat_stream()
