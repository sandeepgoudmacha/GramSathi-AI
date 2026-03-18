const { getDb } = require('../db/database');

function getMemberFeatures(userId) {
  const db = getDb();
  const profile = db.prepare('SELECT * FROM member_profiles WHERE user_id = ?').get(userId) || {};
  const savingRows = db.prepare('SELECT * FROM savings WHERE member_id = ? ORDER BY transaction_date').all(userId);
  const deposits = savingRows.filter(s => s.transaction_type === 'deposit');
  const totalSaved = deposits.reduce((a, s) => a + s.amount, 0) - savingRows.filter(s => s.transaction_type === 'withdrawal').reduce((a, s) => a + s.amount, 0);
  const depositMonths = new Set(deposits.map(s => s.transaction_date.slice(0, 7))).size;
  const skillCount = db.prepare('SELECT COUNT(*) as c FROM member_skills WHERE member_id = ?').get(userId).c;
  const activeLoans = db.prepare("SELECT COUNT(*) as c FROM loans WHERE applicant_id = ? AND status IN ('approved','disbursed')").get(userId).c;
  const paidRep = db.prepare("SELECT COUNT(*) as c FROM repayments r JOIN loans l ON r.loan_id=l.id WHERE l.applicant_id=? AND r.is_paid=1").get(userId).c;
  const totalRep = db.prepare("SELECT COUNT(*) as c FROM repayments r JOIN loans l ON r.loan_id=l.id WHERE l.applicant_id=?").get(userId).c;
  const shgMonths = Math.max(12, depositMonths);
  return {
    savings_consistency: Math.min((depositMonths / shgMonths) * 100, 100),
    repayment_rate: totalRep > 0 ? (paidRep / totalRep) * 100 : 100,
    attendance_pct: profile.attendance_pct || 0,
    shg_duration_months: shgMonths,
    total_savings: Math.max(totalSaved, 0),
    active_loans: activeLoans,
    skill_count: skillCount,
  };
}

function calcScore(f) {
  let s = 0;
  s += Math.min(f.savings_consistency / 100, 1) * 30;
  s += Math.min(f.repayment_rate / 100, 1) * 25;
  s += Math.min(f.attendance_pct / 100, 1) * 15;
  s += Math.min(f.shg_duration_months / 24, 1) * 10;
  s += Math.min(f.total_savings / 50000, 1) * 10;
  s += Math.max(0, 1 - f.active_loans * 0.3) * 7;
  s += Math.min(f.skill_count / 5, 1) * 3;
  return Math.round(Math.min(Math.max(s, 10), 100) * 10) / 10;
}

function getCreditScore(userId) {
  const f = getMemberFeatures(userId);
  const score = calcScore(f);
  const grade = score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : score >= 50 ? 'Fair' : score >= 35 ? 'Poor' : 'Very Poor';
  const risk = score >= 65 ? 'Low' : score >= 50 ? 'Medium' : 'High';
  const eligible = score >= 80 ? 150000 : score >= 65 ? 75000 : score >= 50 ? 40000 : score >= 35 ? 15000 : 5000;
  const rec = score >= 65 ? 'Strong candidate. Recommend approval with standard terms.' : score >= 50 ? 'Moderate risk. Consider smaller loan with monthly monitoring.' : score >= 35 ? 'High risk. Require additional guarantor and smaller amount.' : 'Very high risk. Improve savings for 3 months before applying.';
  return {
    score, grade, risk_level: risk, eligible_amount: eligible, recommendation: rec,
    breakdown: {
      'Savings Consistency': Math.round(f.savings_consistency),
      'Repayment History': Math.round(f.repayment_rate),
      'Meeting Attendance': Math.round(f.attendance_pct),
      'SHG Tenure': Math.round(Math.min(f.shg_duration_months / 24 * 100, 100)),
      'Savings Amount': Math.round(Math.min(f.total_savings / 50000 * 100, 100)),
    },
  };
}

const LIVELIHOODS = [
  { id:1, icon:'🪡', title:'Tailoring & Garments', income_min:8000, income_max:15000, investment:12000, months:2, training:true, mode:'offline', tags:['home_based','low_investment'], skills:['tailoring','embroidery'] },
  { id:2, icon:'🍄', title:'Mushroom Farming', income_min:7000, income_max:14000, investment:15000, months:2, training:true, mode:'offline', tags:['year_round','organic'], skills:['mushroom farming','farming'] },
  { id:3, icon:'🍯', title:'Honey Processing', income_min:5000, income_max:10000, investment:8000, months:3, training:true, mode:'online', tags:['organic','low_risk'], skills:['beekeeping'] },
  { id:4, icon:'🥜', title:'Food Processing', income_min:5500, income_max:11000, investment:18000, months:2, training:true, mode:'online', tags:['fssai','steady_demand'], skills:['food processing','cooking','baking'] },
  { id:5, icon:'🐐', title:'Goat Rearing', income_min:6000, income_max:12000, investment:25000, months:6, training:true, mode:'offline', tags:['steady_income','subsidy'], skills:['animal husbandry'] },
  { id:6, icon:'🧺', title:'Bamboo Craft', income_min:4000, income_max:9000, investment:5000, months:1, training:true, mode:'offline', tags:['traditional','export'], skills:['bamboo work','basket weaving'] },
  { id:7, icon:'🌿', title:'Vermicompost', income_min:4000, income_max:8000, investment:10000, months:2, training:true, mode:'offline', tags:['organic','dual_income'], skills:['farming','vegetable farming'] },
  { id:8, icon:'💻', title:'CSC Digital Services', income_min:8000, income_max:20000, investment:30000, months:1, training:true, mode:'online', tags:['high_income','govt_supported'], skills:['computer basics','digital payments'] },
];

function getLivelihoods(userId) {
  const db = getDb();
  const skills = db.prepare('SELECT lower(s.name) as n FROM member_skills ms JOIN skills s ON ms.skill_id=s.id WHERE ms.member_id=?').all(userId).map(r => r.n);
  const profile = db.prepare('SELECT annual_income FROM member_profiles WHERE user_id=?').get(userId);
  const capacity = Math.min(((profile?.annual_income || 60000) * 0.3), 30000);
  return LIVELIHOODS.map(l => {
    let s = 50;
    const match = l.skills.filter(sk => skills.some(us => us.includes(sk) || sk.includes(us))).length;
    s += (match / Math.max(l.skills.length, 1)) * 25;
    if (l.investment <= capacity) s += 12;
    else if (l.investment <= capacity * 1.5) s += 6;
    if (l.training) s += 5;
    s += Math.random() * 4;
    return { ...l, match_score: Math.min(Math.round(s), 100) };
  }).sort((a, b) => b.match_score - a.match_score);
}

module.exports = { getCreditScore, getMemberFeatures, getLivelihoods };
