// Streams text chunks from Gemini or OpenAI. Usage: for await (const t of streamAI({system, prompt})) {...}
async function* sseLines(res) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (line.startsWith('data:')) yield line.slice(5).trim();
    }
  }
}

async function* streamGemini({ system, prompt, signal }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set on the server');
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;
  const res = await fetch(url, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  for await (const data of sseLines(res)) {
    try {
      const parts = JSON.parse(data).candidates?.[0]?.content?.parts || [];
      for (const p of parts) if (p.text) yield p.text;
    } catch { /* ignore partial JSON */ }
  }
}

async function* streamOpenAI({ system, prompt, signal }) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY is not set on the server');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      stream: true,
      temperature: 0.3,
      max_tokens: 2048,
      messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  for await (const data of sseLines(res)) {
    if (data === '[DONE]') return;
    try {
      const t = JSON.parse(data).choices?.[0]?.delta?.content;
      if (t) yield t;
    } catch { /* ignore */ }
  }
}

function streamAI(opts) {
  return (process.env.AI_PROVIDER || 'gemini') === 'openai' ? streamOpenAI(opts) : streamGemini(opts);
}

module.exports = { streamAI };
