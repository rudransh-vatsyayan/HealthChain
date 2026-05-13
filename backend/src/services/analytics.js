/**
 * Clinical Data Processing Algorithm
 * Calculates a dynamic health score (0-100) based on:
 * 1. Vital stability (Heart Rate, BP, SpO2)
 * 2. Clinical record frequency and status
 * 3. Recent activity patterns
 */
export function calculateHealthScore(vitals = [], records = []) {
  let score = 85; // Base healthy score

  // 1. Process Vitals
  vitals.forEach(v => {
    if (v.label === 'Heart Rate') {
      if (v.val < 60 || v.val > 100) score -= 5;
      if (v.val > 120) score -= 10;
    }
    if (v.label === 'SpO2' && v.val < 95) {
      score -= (95 - v.val) * 3;
    }
    if (v.label === 'Blood Pressure') {
      if (v.val > 140) score -= 8;
      if (v.val > 160) score -= 15;
    }
  });

  // 2. Process Clinical Records
  const flagged = records.filter(r => r.status === 'flagged').length;
  score -= (flagged * 12);

  // 3. Frequency Bonus/Penalty
  if (records.length === 0) score -= 10; // Lack of data
  if (records.length > 10) score += 5;   // Good historical tracking

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Anomaly Detection Algorithm
 * Detects suspicious spikes or drops in vital data
 */
export function detectAnomalies(vitals = []) {
  return vitals.filter(v => {
    if (v.label === 'Heart Rate' && (v.val > 130 || v.val < 40)) return true;
    if (v.label === 'SpO2' && v.val < 90) return true;
    return false;
  });
}
