const fetch = require('node-fetch');

const SYSTEM = `You are GramSathi AI, a helpful assistant for Indian rural Self-Help Group (SHG) members.
You help with: government schemes (MUDRA, PMJDY, NRLM, PMAY, MGNREGA, JSY etc.), SHG loans, rural livelihoods, skill development, health guidance, and marketplace selling.
Be warm, simple, and practical. Give specific actionable advice. Reference Indian government schemes when relevant.
For health emergencies always mention calling 108. Keep responses concise (under 300 words).`;

const HEALTH_SYSTEM = `You are a trusted health advisor for rural Indian communities. Give safe, accurate health guidance on nutrition, maternal health, child health, hygiene, mental wellness. Always recommend professional consultation for serious conditions. For emergencies mention calling 108.`;

const fs = require('fs');

function loadLocalKeys() {
  try {
    const p = path.resolve(__dirname, '..', '..', 'ai_keys.json')
    if (fs.existsSync(p)) {
      const j = JSON.parse(fs.readFileSync(p, 'utf8'))
      process.env.GROQ_API_KEY = process.env.GROQ_API_KEY || j.groq_key || process.env.GROQ_API_KEY
      process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || j.gemini_key || process.env.GEMINI_API_KEY
    }
  } catch (e) { }
}

const path = require('path');

// try to load persistent keys if env vars are not present
loadLocalKeys();

async function callGroq(messages, system = SYSTEM) {
  if (!process.env.GROQ_API_KEY) throw new Error('No GROQ key');
  const url = process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
  const payload = { model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant', messages: [{ role: 'system', content: system }, ...messages], max_tokens: 600, temperature: 0.7 };
    try {
      console.log(`[aiService] callGroq url=${url} model=${payload.model} messages=${messages.length}`);
    } catch (e) {}
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify(payload),
    // increase timeout for slower models
    timeout: 30000,
  });
  if (!r.ok) {
    const body = await r.text().catch(() => '');
    console.error(`[aiService] callGroq non-ok status=${r.status} body=${body.substring(0,200)}`);
    // try to detect model decommission and optionally retry with fallback
    try {
      const parsed = JSON.parse(body || '{}');
      const code = parsed?.error?.code;
      if ((code === 'model_decommissioned' || code === 'model_not_found') && process.env.GROQ_FALLBACK_MODEL && payload.model !== process.env.GROQ_FALLBACK_MODEL) {
        console.log(`[aiService] detected model_decommissioned or model_not_found, retrying with fallback model=${process.env.GROQ_FALLBACK_MODEL}`);
        payload.model = process.env.GROQ_FALLBACK_MODEL;
        const r2 = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` }, body: JSON.stringify(payload), timeout: 30000 });
        if (r2.ok) {
          const j2 = await r2.json();
          if (j2.choices && j2.choices.length) {
            const ch = j2.choices[0];
            if (ch.message && ch.message.content) return ch.message.content;
            if (typeof ch.message === 'string') return ch.message;
            if (ch.text) return ch.text;
            if (ch.delta && ch.delta.content) return ch.delta.content;
          }
          if (j2.output) {
            if (Array.isArray(j2.output) && j2.output.length) {
              const parts = [];
              for (const o of j2.output) {
                if (o.content && Array.isArray(o.content)) {
                  for (const c of o.content) if (typeof c.text === 'string') parts.push(c.text);
                } else if (typeof o === 'string') parts.push(o);
              }
              if (parts.length) return parts.join('\n');
            } else if (typeof j2.output === 'string') return j2.output;
          }
        } else {
          const b2 = await r2.text().catch(() => '');
          console.error(`[aiService] fallback call non-ok status=${r2.status} body=${b2.substring(0,200)}`);
        }
      }
    } catch (e) { console.error('[aiService] error parsing groq error body', e && e.message); }
    // Map Groq errors to HTTP-friendly error objects so callers can return proper status codes
    let msg = `Groq ${r.status} ${body}`;
    try {
      const parsed = JSON.parse(body || '{}');
      if (parsed?.error?.message) msg = parsed.error.message;
    } catch (e) {}
    const err = new Error(msg);
    // If model not found, indicate client/admin configuration issue (400)
    if (r.status === 404 || /model_not_found|model_decommissioned/i.test(msg)) err.status = 400;
    else if (r.status >= 500) err.status = 502;
    else err.status = 502;
    throw err;
  }
  const j = await r.json();
    try { console.log('[aiService] callGroq response keys=',Object.keys(j).join(',')); } catch (e) {}
  // Support multiple response shapes from different Groq/compat endpoints
  if (j.choices && j.choices.length) {
    const ch = j.choices[0];
    if (ch.message && ch.message.content) return ch.message.content;
    if (typeof ch.message === 'string') return ch.message;
    if (ch.text) return ch.text;
    if (ch.delta && ch.delta.content) return ch.delta.content;
  }
  // Fallback for other response formats (e.g., `output` or `data`)
  if (j.output) {
    if (Array.isArray(j.output) && j.output.length) {
      // try to join text parts
      const parts = [];
      for (const o of j.output) {
        if (o.content && Array.isArray(o.content)) {
          for (const c of o.content) if (typeof c.text === 'string') parts.push(c.text);
        } else if (typeof o === 'string') parts.push(o);
      }
      if (parts.length) return parts.join('\n');
    } else if (typeof j.output === 'string') return j.output;
  }
  throw new Error('Groq: unexpected response shape');
}

// helper to log provider usage
function logProvider(name, info) {
  try { console.log(`[aiService] provider=${name} ${info||''}`); } catch (e) {}
}

async function callGemini(text, system = SYSTEM) {
  if (!process.env.GEMINI_API_KEY) throw new Error('No Gemini key');
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: system + '\n\nUser: ' + text }] }], generationConfig: { maxOutputTokens: 600 } }),
    timeout: 12000,
  });
  if (!r.ok) throw new Error(`Gemini ${r.status}`);
  return (await r.json()).candidates[0].content.parts[0].text;
}

const FALLBACKS = {
  scheme: `Here are key government schemes for SHG members:\n\n🏛️ **PM Jan Dhan Yojana** — Zero balance account + ₹1L insurance\n💼 **MUDRA Shishu** — ₹50,000 business loan, no collateral\n🏠 **PM Awas Yojana** — ₹1.30L for house construction\n🌾 **NRLM** — ₹15,000 revolving fund + training\n💊 **Janani Suraksha** — ₹1,400 for institutional delivery\n\nVisit your nearest CSC center or contact your coordinator to apply.`,
  loan: `SHG Loan options:\n\n💰 **Internal SHG Loan** — Up to ₹10,000, immediate\n🏦 **MUDRA Shishu** — Up to ₹50,000 @ 6.5% interest\n📊 **Bank Linkage** — Up to ₹1 lakh based on credit score\n\nYour credit score depends on:\n• Regular monthly savings\n• Meeting attendance (aim 100%)\n• Timely repayment of past loans\n\nApply via the Financial tab → Apply for Loan`,
  income: `Best income opportunities for your skills:\n\n🪡 **Tailoring** — ₹8,000-15,000/month | ₹12,000 investment\n🍄 **Mushroom Farming** — ₹7,000-14,000/month | ₹15,000 investment\n🍯 **Honey Processing** — ₹5,000-10,000/month | ₹8,000 investment\n🌿 **Vermicompost** — ₹4,000-8,000/month | ₹10,000 investment\n\n💡 Start with MUDRA loan (₹50,000) and list products on GramSathi marketplace to reach buyers nationwide!`,
  health: `Health guidance for rural communities:\n\n🥗 **Nutrition**: Iron-rich foods daily (spinach, jaggery, dal, eggs). Drink 8 glasses water.\n🤰 **Maternal Health**: 4 minimum ANC visits at PHC (free). Register for Janani Suraksha Yojana.\n🧒 **Child Health**: Follow vaccination schedule at PHC. Exclusive breastfeeding 6 months.\n🧼 **Hygiene**: Wash hands 5 times daily. Boil drinking water.\n\n🆘 Emergency: Call **108** — free ambulance 24/7`,
  default: `Namaste! 🙏 I'm GramSathi AI. I can help you with:\n\n🏛️ Government schemes & eligibility\n💰 Loans & credit scoring\n🎓 Skills & free training programs\n💼 Livelihood & income opportunities\n🏥 Health guidance\n🛒 Marketplace selling tips\n\nWhat would you like to know today?`,
};

function fallback(msg) {
  const m = msg.toLowerCase();
  if (m.match(/scheme|yojana|government|sarkar|subsidy/)) return FALLBACKS.scheme;
  if (m.match(/loan|credit|borrow|finance|emi/)) return FALLBACKS.loan;
  if (m.match(/income|earn|livelihood|business|money|kamai/)) return FALLBACKS.income;
  if (m.match(/health|doctor|medicine|sick|pregnant|nutrition/)) return FALLBACKS.health;
  return FALLBACKS.default;
}

async function getAIResponse(message, history = [], lang=null) {
  const msgs = [...history.slice(-8).map(h => ({ role: h.role, content: h.content })), { role: 'user', content: message }];
  const forced = (process.env.AI_PROVIDER||'').toLowerCase();
  const langMap = { hi: 'Hindi', en: 'English', te: 'Telugu', ta: 'Tamil', kn: 'Kannada', ml: 'Malayalam', bn: 'Bengali', gu: 'Gujarati', pa: 'Punjabi', or: 'Odia' };
  const langLabel = lang && langMap[lang] ? langMap[lang] : null;
  // If a specific provider is forced to Gemini, use it
  if (forced === 'gemini') {
    try { const r = await callGemini(message, langLabel ? SYSTEM + `\n\nRespond ONLY in ${langLabel}.` : SYSTEM); logProvider('gemini'); return r; } catch (e) { console.error('[aiService] gemini error', e.message); }
  }
  // default: prefer Groq
  try {
    const systemPrompt = langLabel ? SYSTEM + `\n\nRespond ONLY in ${langLabel}.` : SYSTEM;
    const r = await callGroq(msgs, systemPrompt);
    logProvider('groq');
    return r;
  } catch (e) {
    console.error('[aiService] groq error', e.message);
    if (forced === 'groq') throw e; // if forced, don't fallback
    try { const r2 = await callGemini(message, langLabel ? SYSTEM + `\n\nRespond ONLY in ${langLabel}.` : SYSTEM); logProvider('gemini'); return r2; } catch (e2) {
      console.error('[aiService] gemini error', e2.message);
      logProvider('fallback');
      return fallback(message);
    }
  }
}

async function getHealthResponse(query) {
  try { return await callGroq([{ role: 'user', content: query }], HEALTH_SYSTEM); } catch {
    try { return await callGemini(query, HEALTH_SYSTEM); } catch { return fallback('health ' + query); }
  }
}

async function genProductDesc(name, category, price) {
  const prompt = `Write a compelling 2-sentence product description for: "${name}" (${category}, ₹${price}). It's made by rural Indian SHG women artisans. Highlight authenticity and quality.`;
  try { return await callGroq([{ role:'user', content:prompt }]); } catch {
    return `Handcrafted ${name} made by skilled rural women artisans with traditional expertise. Premium quality ${category.toLowerCase()} product supporting local livelihoods at an affordable ₹${price}.`;
  }
}

module.exports = { getAIResponse, getHealthResponse, genProductDesc, fallback };
