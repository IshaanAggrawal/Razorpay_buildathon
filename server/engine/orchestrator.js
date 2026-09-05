const { statements } = require('../db');
const { checkInputGuardrails, validateDecisionOutput } = require('./guardrails');
const { decide } = require('./decisionAgent');
const { escalate } = require('./escalationAgent');

async function processInvoice(invoice) {
  const gate = checkInputGuardrails(invoice);
  if (!gate.allowed) {
    statements.insertAudit.run(invoice.id, 'guardrail', `blocked:${gate.reason}`, `Input guardrail blocked invoice ${invoice.id}; no contact was attempted.`);
    return { id: invoice.id, status: 'blocked', reason: gate.reason };
  }
  let decision = await decide(invoice);
  const validation = validateDecisionOutput(decision);
  if (!validation.valid) {
    statements.insertAudit.run(invoice.id, 'guardrail', `blocked:${validation.reason}`, 'Decision output failed the fixed action contract; no action was executed.');
    return { id: invoice.id, status: 'blocked', reason: validation.reason };
  }
  if (validation.needsEscalation) {
    statements.insertAudit.run(invoice.id, 'decision_agent', 'low_confidence_routed', `Confidence ${decision.confidence}; routed to escalation agent before execution.`);
    const review = await escalate(invoice, decision);
    statements.insertAudit.run(invoice.id, 'escalation_agent', review.decision === 'escalate_to_human' ? 'escalate_to_human' : review.action, review.reasoning);
    if (review.decision === 'escalate_to_human') return { id: invoice.id, status: 'human_review' };
    decision = { ...decision, action: review.action, reasoning: review.reasoning };
  }
  statements.incrementContact.run(invoice.id);
  statements.insertAudit.run(invoice.id, 'decision_agent', decision.action, decision.reasoning);
  return { id: invoice.id, status: 'executed', action: decision.action };
}

module.exports = { processInvoice };