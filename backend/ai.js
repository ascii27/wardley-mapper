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
// Phase 5b wizard suggester functions
async function callOpenAI(messages, fetchImpl = fetch) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');
  const resp = await fetchImpl('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-4o-mini', temperature: 0.2, messages })
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`OpenAI error: ${resp.status} ${txt}`);
  }
  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || '';
  return extractJson(content);
}

async function suggestUsersNeeds(contextText, fetchImpl = fetch) {
  const sys = 'Return ONLY JSON { users:[string], needs:[{ name:string, forUser:string }] }.';
  const user = `Context: ${contextText}\nList primary users and their explicit needs.`;
  return callOpenAI([{ role:'system', content: sys }, { role:'user', content: user }], fetchImpl);
}

async function suggestCapabilities(needsJson, context = '', fetchImpl = fetch) {
  const sys = 'Return ONLY JSON { capabilities:[{ name:string }], links:[{ need:string, capability:string }] }.';
  const user = `Context: ${context}\nGiven these needs: ${JSON.stringify(needsJson)} propose capabilities and Need->Capability links.`;
  return callOpenAI([{ role:'system', content: sys }, { role:'user', content: user }], fetchImpl);
}

async function suggestEvolution(capabilitiesJson, context = '', fetchImpl = fetch) {
  const sys = 'Return ONLY JSON [{ name:string, stage:number(1..4), rationale:string }] based on Wardley evolution (Genesis, Custom, Product, Commodity).';
  const user = `Context: ${context}\nCapabilities: ${JSON.stringify(capabilitiesJson)}. Suggest stage 1..4 per item with a short rationale.`;
  return callOpenAI([{ role:'system', content: sys }, { role:'user', content: user }], fetchImpl);
}

module.exports.suggestUsersNeeds = suggestUsersNeeds;
module.exports.suggestCapabilities = suggestCapabilities;
module.exports.suggestEvolution = suggestEvolution;
// Phase 4 chat utilities
const CHAT_SYSTEM_PROMPT = `You are a Wardley mapping copilot. Respond with STRICT JSON only:
{
  "reply": "<1-3 concise sentences>",
  "commands": [
    // zero or more operations to modify the map
    { "op": "add_component", "name": "<string>", "evolution": <0..1>, "visibility": <0..1> },
    { "op": "move_component", "name": "<string>", "evolution": <0..1>, "visibility": <0..1> },
    { "op": "delete_component", "name": "<string>" },
    { "op": "add_link", "from": "<string>", "to": "<string>" },
    { "op": "delete_link", "from": "<string>", "to": "<string>" }
  ]
}
Rules:
- Only include commands when explicitly requested or clearly implied by the user.
- Never include text outside JSON.
- Keep names consistent with provided components.
`;

async function chatOnMap({ prompt, map, history, fetchImpl = fetch }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');

  const context = {
    map: {
      id: map.id,
      name: map.name,
      components: map.components.map(c => ({ name: c.name, evolution: c.evolution, visibility: c.visibility })),
      links: map.links.map(l => ({ from: l.fromName || l.from, to: l.toName || l.to }))
    },
    instructions: 'Advise on Wardley mapping and optionally propose changes using commands.'
  };

  const messages = [
    { role: 'system', content: CHAT_SYSTEM_PROMPT },
    { role: 'system', content: 'CONTEXT:' + JSON.stringify(context) },
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: prompt }
  ];

  const body = { model: 'gpt-4o-mini', messages, temperature: 0.2 };
  const resp = await fetchImpl('https://api.openai.com/v1/chat/completions', {
    method: 'POST', headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`OpenAI error: ${resp.status} ${txt}`);
  }
  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || '';
  const parsed = extractJson(content);
  if (!parsed.reply) parsed.reply = '';
  if (!Array.isArray(parsed.commands)) parsed.commands = [];
  // sanitize commands
  parsed.commands = parsed.commands.filter(cmd => typeof cmd === 'object' && typeof cmd.op === 'string');
  return parsed;
}

module.exports.chatOnMap = chatOnMap;
