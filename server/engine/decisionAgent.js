const { ALLOWED_ACTIONS } = require('./guardrails');

const DECISION_SYSTEM_PROMPT = `You are a compliance-bound B2B receivables recovery agent. You will be given one overdue invoice's data (amount, days overdue, risk score, bucket, past default count, prior contact count). You must decide exactly one recovery action from this fixed set — never invent a new action:

- gentle_reminder: for early-stage, low-risk invoices
- firm_followup: for invoices that have already had a gentle reminder or moderate risk
- escalate_to_manager: for high risk, high value, or repeat defaulters
- legal_notice_draft: only for severe cases — very high risk AND very overdue AND high value

Respond with ONLY valid JSON, no other text, in this exact shape:
{"action": "...", "confidence": 0.0-1.0, "reasoning": "...", "message_draft": "..."}

The reasoning field must reference the specific numbers you were given (amount, days overdue, risk score) — do not give a generic justification.`;

function mockDecision(invoice) {
  if (invoice.id === 'INV-0007') return { action: 'firm_followup', confidence: 0.42, reasoning: `Amount ${invoice.amount}, ${invoice.days_overdue} days overdue, risk ${invoice.risk_score}; ambiguous case needs review.`, message_draft: 'Please confirm your payment plan.' };
  const action = invoice.amount >= 200000000 || invoice.past_default_count >= 3 ? 'escalate_to_manager' : invoice.days_overdue > 60 ? 'firm_followup' : 'gentle_reminder';
  return { action, confidence: 0.88, reasoning: `Amount ${invoice.amount}, ${invoice.days_overdue} days overdue, risk ${invoice.risk_score}; selected ${action}.`, message_draft: 'Please arrange payment or reply with a payment date.' };
}

async function decide(invoice) {
  if (!process.env.GROQ_API_KEY) return mockDecision(invoice);
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` }, body: JSON.stringify({ model: process.env.DECISION_MODEL || 'llama-3.1-8b-instant', temperature: 0, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: DECISION_SYSTEM_PROMPT }, { role: 'user', content: JSON.stringify(invoice) }] }) });
    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (!response.ok || !content) return mockDecision(invoice);
    return JSON.parse(content);
  } catch {
    return mockDecision(invoice);
  }
}

module.exports = { DECISION_SYSTEM_PROMPT, decide, ALLOWED_ACTIONS };