function calculateAging(invoice) {
  const daysOverdue = Number(invoice.days_overdue || 0);
  const amount = Number(invoice.amount || 0);
  const pastDefaults = Number(invoice.past_default_count || 0);
  const bucket = daysOverdue <= 30 ? '0-30' : daysOverdue <= 60 ? '31-60' : '60+';
  const riskScore = (amount / 1000) * (1 + daysOverdue / 30) * (1 + pastDefaults * 0.5);
  return { daysOverdue, bucket, riskScore: Number(riskScore.toFixed(2)) };
}

module.exports = { calculateAging };