/**
 * Node.js SDK Example for LocalAI / OllamaNode API
 */

const API_URL = 'http://localhost:3000/api';

async function main() {
  console.log('--- Querying LocalAI Ollama-compatible API ---');

  // 1. List models
  const tagsRes = await fetch(`${API_URL}/tags`);
  const { models } = await tagsRes.json();
  console.log(`Available models: ${models.map(m => m.name).join(', ')}`);

  // 2. Chat stream
  const response = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.3:8b',
      messages: [{ role: 'user', content: 'Generate a short UUID v4 implementation in TypeScript' }],
      stream: true,
    }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  process.stdout.write('\nResponse: ');
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    const lines = text.split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.message?.content) {
          process.stdout.write(parsed.message.content);
        }
      } catch (err) {
        // ignore partial chunks
      }
    }
  }
  console.log('\n\nDone!');
}

main().catch(console.error);
