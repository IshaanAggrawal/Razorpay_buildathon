const PROMISE_SYSTEM_PROMPT = `Extract a payment promise date from the customer's message below. Today's date is {today}. Respond with ONLY valid JSON: {"date": "YYYY-MM-DD or null", "confidence": 0.0-1.0}. If no clear date is promised, return null for date and confidence 0.`;

function parsePromiseDate(text, today = new Date()) {
  const source = String(text).toLowerCase();
  if (/\b(?:will not|won't|cannot|can't|unable to|no)\s+pay\b/.test(source)) return { date: null, confidence: 0 };
  const explicit = source.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (explicit) return { date: `${explicit[1]}-${String(explicit[2]).padStart(2, '0')}-${String(explicit[3]).padStart(2, '0')}`, confidence: 0.98 };
  const day = source.match(/\b(?:by|on)\s+(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)?\b/);
  if (!day) return { date: null, confidence: 0 };
  const date = new Date(today);
  date.setDate(Number(day[1]));
  if (date <= today) date.setMonth(date.getMonth() + 1);
  return { date: date.toISOString().slice(0, 10), confidence: 0.82 };
}

async function parsePromiseDateWithModel(text, today = new Date()) {
  if (!process.env.GROQ_API_KEY) return parsePromiseDate(text, today);
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: process.env.PROMISE_MODEL || 'llama-3.1-8b-instant',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: PROMISE_SYSTEM_PROMPT.replace('{today}', today.toISOString().slice(0, 10)) },
          { role: 'user', content: text }
        ]
      })
    });
    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (!response.ok || !content) return parsePromiseDate(text, today);
    const parsed = JSON.parse(content);
    return typeof parsed.date === 'string' && typeof parsed.confidence === 'number' ? parsed : parsePromiseDate(text, today);
  } catch {
    return parsePromiseDate(text, today);
  }
}

function expirePromise(id, today) {
  const { statements } = require('../db');
  const promise = statements.promise.get(id);
  if (!promise) return null;
  if (promise.status === 'pending' && promise.promised_date && promise.promised_date < today) {
    statements.updatePromise.run('broken', id);
    statements.insertAudit.run(promise.invoice_id, 'system', 'escalate_to_manager', `Promise ${id} expired on ${promise.promised_date}; customer payment was not recorded.`);
  }
  return statements.promise.get(id);
}

module.exports = { PROMISE_SYSTEM_PROMPT, parsePromiseDate, parsePromiseDateWithModel, expirePromise };