const SYSTEM_PROMPT = `You are a Wardley mapping assistant.
Return ONLY JSON with this exact shape:
{
  "name": "<short map name>",
  "components": [ { "name": "<string>", "evolution": <0..1>, "visibility": <0..1> }, ... ],
  "links": [ { "from": "<component name>", "to": "<component name>" }, ... ]
}
Rules:
- evolution is x-axis [0..1] from genesis(0) to commodity(1)
- visibility is y-axis [0..1] from low(0) to high(1)
- Keep 5-12 components; avoid duplicates.
- Do not include any text outside the JSON.
`;

function extractJson(text) {
  try {
    // Try direct JSON
    return JSON.parse(text);
  } catch (_) {
    // Try fenced code block
    const match = text.match(/```(?:json)?\n([\s\S]*?)```/i);
    if (match) {
      return JSON.parse(match[1]);
    }
    throw new Error('Failed to parse JSON from AI response');
  }
}

async function generateMapFromPrompt(userPrompt, fetchImpl = fetch) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY');
  }

  const body = {
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.2,
  };

  const resp = await fetchImpl('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`OpenAI error: ${resp.status} ${txt}`);
  }
  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || '';
  const parsed = extractJson(content);

  // Basic validation
  if (!parsed || !Array.isArray(parsed.components)) throw new Error('Invalid AI output: components missing');
  parsed.components = parsed.components
    .filter(c => c && typeof c.name === 'string')
    .map(c => ({
      name: c.name.trim(),
      evolution: clamp01(c.evolution),
      visibility: clamp01(c.visibility),
    }));
  if (!Array.isArray(parsed.links)) parsed.links = [];
  parsed.links = parsed.links
    .filter(l => l && typeof l.from === 'string' && typeof l.to === 'string');

  return parsed;
}

function clamp01(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

module.exports = { generateMapFromPrompt };

