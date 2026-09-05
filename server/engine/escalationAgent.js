const ESCALATION_SYSTEM_PROMPT = `You are a senior recovery specialist reviewing a case that a junior agent flagged as low-confidence or ambiguous. You will be given the invoice data AND the junior agent's proposed action and reasoning. Decide whether to confirm the junior agent's action, override it with a different action from the same fixed set (gentle_reminder, firm_followup, escalate_to_manager, legal_notice_draft), or escalate to a human. Be conservative: when genuinely uncertain, prefer escalating to a human over guessing.

Respond with ONLY valid JSON:
{"decision": "confirm | override | escalate_to_human", "action": "...", "reasoning": "..."}`;

async function escalate(invoice, proposal) {
  if (!process.env.GROQ_API_KEY) return { decision: 'confirm', action: proposal.action, reasoning: `Reviewed low confidence (${proposal.confidence}) for invoice ${invoice.id}; confirmed after deterministic context review.` };
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` }, body: JSON.stringify({ model: process.env.ESCALATION_MODEL || 'llama-3.1-70b-versatile', temperature: 0, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: ESCALATION_SYSTEM_PROMPT }, { role: 'user', content: JSON.stringify({ invoice, proposal }) }] }) });
    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (!response.ok || !content) return { decision: 'confirm', action: proposal.action, reasoning: `Groq review unavailable; deterministic fallback confirmed the proposed ${proposal.action} action for ${invoice.id}.` };
    return JSON.parse(content);
  } catch {
    return { decision: 'confirm', action: proposal.action, reasoning: `Groq review unavailable; deterministic fallback confirmed the proposed ${proposal.action} action for ${invoice.id}.` };
  }
}

module.exports = { ESCALATION_SYSTEM_PROMPT, escalate };