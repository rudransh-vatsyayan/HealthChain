/**
 * Insurance Insight Generation Service
 * Produces ONLY derived/computed metrics from patient data.
 * NEVER exposes raw records, prescriptions, or personally identifiable details.
 */
import { calculateHealthScore, detectAnomalies } from './analytics.js';

/**
 * Generate derived insurance insights for a single patient.
 * Returns a computed summary with NO raw clinical data.
 */
export function generateInsuranceInsights(patient, vitals = [], records = []) {
  const healthScore  = patient.healthScore  || 85;
  const riskScore    = patient.riskScore    || 0;
  const flagged      = records.filter(r => r.status === 'flagged').length;
  const anomalies    = detectAnomalies(vitals);

  // ── Eligibility Score (0–100) ─────────────────────────────────────────────
  const eligibilityScore = Math.max(0, Math.min(100, Math.round(
    healthScore * 0.45 +
    (100 - riskScore) * 0.35 +
    (records.length > 5 ? 8 : 4) -
    (flagged * 10) -
    (anomalies.length * 6)
  )));

  // ── Risk Profile ──────────────────────────────────────────────────────────
  let riskProfile;
  if (riskScore > 60 || flagged > 2 || anomalies.length > 1) riskProfile = 'high';
  else if (riskScore > 30 || flagged > 0 || anomalies.length > 0) riskProfile = 'medium';
  else riskProfile = 'low';

  // ── Claim Likelihood (%) ─────────────────────────────────────────────────
  const claimLikelihood = Math.max(5, Math.min(95, Math.round(
    riskScore * 0.35 +
    flagged * 14 +
    anomalies.length * 12 +
    (healthScore < 70 ? 15 : 0)
  )));

  // ── Anomaly Score (0–100) ────────────────────────────────────────────────
  const anomalyScore = Math.min(100, Math.round(
    anomalies.length * 30 + flagged * 10
  ));

  // ── Fraud Indicator ───────────────────────────────────────────────────────
  const fraudIndicator = claimLikelihood > 78 && anomalyScore > 45;

  // ── Federated Confidence (%) ─────────────────────────────────────────────
  const federatedConfidence = Math.min(98.5, +(
    68 + Math.min(records.length * 1.8, 20) + Math.min(vitals.length * 1.2, 10)
  ).toFixed(1));

  return {
    eligibilityScore,
    riskProfile,
    claimLikelihood,
    anomalyScore,
    fraudIndicator,
    federatedConfidence,
    dataPoints:  records.length + vitals.length,
    lastUpdated: new Date().toISOString(),

    // Anonymized population-safe indicators — NO patient identifiers
    anonymizedMetrics: {
      ageGroup:         patient.age < 30 ? '18–30' : patient.age < 50 ? '30–50' : '50+',
      coverageTier:     patient.insurance || 'Standard',
      enrollmentStatus: patient.isVerified ? 'verified' : 'pending',
    },
  };
}

/**
 * Generate population-level aggregate insights across all patients.
 * Returns anonymized aggregate metrics only.
 */
export function generatePopulationInsights(patients = [], allRecords = [], allVitals = []) {
  if (!patients.length) return emptyPopulation();

  const avgHealth       = patients.reduce((s, p) => s + (p.healthScore || 85), 0) / patients.length;
  const highRiskCount   = patients.filter(p => (p.riskScore || 0) > 60).length;
  const lowRiskCount    = patients.filter(p => (p.riskScore || 0) <= 30).length;
  const totalFlagged    = allRecords.filter(r => r.status === 'flagged').length;
  const avgEligibility  = Math.round(avgHealth * 0.78 - (totalFlagged / patients.length) * 8);
  const claimRate       = Math.max(8, Math.min(45, Math.round(
    (highRiskCount / patients.length) * 100 * 0.6 + totalFlagged * 2
  )));
  const fraudAlerts     = patients.filter(p => (p.riskScore || 0) > 70).length;
  const federatedConf   = Math.min(97, +(68 + (allRecords.length / patients.length) * 2.5).toFixed(1));

  return {
    type: 'population',
    totalEnrolled:     patients.length,
    avgEligibilityScore: Math.max(0, Math.min(100, avgEligibility)),
    avgHealthScore:    +avgHealth.toFixed(1),
    highRiskCount,
    mediumRiskCount:   patients.length - highRiskCount - lowRiskCount,
    lowRiskCount,
    claimRate,
    fraudAlerts,
    federatedConfidence: federatedConf,
    totalRecordsProcessed: allRecords.length,
    lastUpdated: new Date().toISOString(),
  };
}

function emptyPopulation() {
  return {
    type: 'population',
    totalEnrolled: 0, avgEligibilityScore: 0, avgHealthScore: 0,
    highRiskCount: 0, mediumRiskCount: 0, lowRiskCount: 0,
    claimRate: 0, fraudAlerts: 0, federatedConfidence: 0,
    totalRecordsProcessed: 0, lastUpdated: new Date().toISOString(),
  };
}
