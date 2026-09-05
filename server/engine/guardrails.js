const ALLOWED_ACTIONS = ['gentle_reminder', 'firm_followup', 'escalate_to_manager', 'legal_notice_draft'];

function checkInputGuardrails(invoice) {
  if (Boolean(invoice.dnc_flag)) return { allowed: false, reason: 'dnc' };
  if (Number(invoice.amount) < 50000) return { allowed: false, reason: 'below_cost_floor' };
  if (Number(invoice.contact_count || 0) >= 4) return { allowed: false, reason: 'max_contacts' };
  if (invoice.status !== 'open') return { allowed: false, reason: 'already_resolved' };
  return { allowed: true };
}

function validateDecisionOutput(value) {
  if (!value || typeof value !== 'object') return { valid: false, reason: 'invalid_action' };
  if (!ALLOWED_ACTIONS.includes(value.action)) return { valid: false, reason: 'invalid_action' };
  if (typeof value.confidence !== 'number' || value.confidence < 0 || value.confidence > 1) return { valid: false, reason: 'invalid_confidence' };
  if (typeof value.reasoning !== 'string' || value.reasoning.length > 300) return { valid: false, reason: 'invalid_reasoning' };
  if (typeof value.message_draft !== 'string') return { valid: false, reason: 'invalid_message' };
  return { valid: true, needsEscalation: value.confidence < 0.6 };
}

module.exports = { ALLOWED_ACTIONS, checkInputGuardrails, validateDecisionOutput };