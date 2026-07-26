/**
 * scripts/linkedin-post.js
 * Publica el post de LinkedIn que corresponde a la fecha de hoy.
 *
 * Variables de entorno requeridas (GitHub Secrets):
 *   LINKEDIN_TOKEN    — OAuth 2.0 access token con scope w_member_social
 *   LINKEDIN_PERSON_URN — urn:li:person:XXXXXXXX (obtenido con /v2/me)
 *
 * Uso local:
 *   LINKEDIN_TOKEN=xxx LINKEDIN_PERSON_URN=urn:li:person:xxx node scripts/linkedin-post.js
 *
 * Uso en GitHub Actions:
 *   Configurar los dos secrets en el repo y el workflow los inyecta automáticamente.
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

// ── Config ──────────────────────────────────────────────────────────────────
const POSTS_FILE = path.join(__dirname, '..', 'normalis-linkedin-posts.json');
const TOKEN      = process.env.LINKEDIN_TOKEN;
const PERSON_URN = process.env.LINKEDIN_PERSON_URN; // ej: urn:li:person:AbCdEfGhIj

if (!TOKEN) {
  console.error('❌ LINKEDIN_TOKEN no configurado.');
  process.exit(1);
}
if (!PERSON_URN) {
  console.error('❌ LINKEDIN_PERSON_URN no configurado.');
  process.exit(1);
}

// ── Fecha de hoy en Colombia (UTC-5) ────────────────────────────────────────
function getTodayCOT() {
  const now = new Date();
  // COT = UTC - 5 horas
  const cot = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  return cot.toISOString().split('T')[0]; // YYYY-MM-DD
}

// ── Buscar post para hoy ─────────────────────────────────────────────────────
const today  = getTodayCOT();
const posts  = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'));
const toPost = posts.find(p => p.date === today);

if (!toPost) {
  console.log(`ℹ️  No hay post programado para hoy (${today}). Nada que publicar.`);
  process.exit(0);
}

console.log(`📤 Publicando post ${toPost.id} (${today}):`);
console.log(toPost.text.slice(0, 80) + '…');

// ── Llamada a LinkedIn UGC Posts API ────────────────────────────────────────
const body = JSON.stringify({
  author: PERSON_URN,
  lifecycleState: 'PUBLISHED',
  specificContent: {
    'com.linkedin.ugc.ShareContent': {
      shareCommentary: {
        text: toPost.text
      },
      shareMediaCategory: 'NONE'
    }
  },
  visibility: {
    'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
  }
});

const options = {
  hostname: 'api.linkedin.com',
  path: '/v2/ugcPosts',
  method: 'POST',
  headers: {
    'Authorization':              `Bearer ${TOKEN}`,
    'Content-Type':               'application/json',
    'X-Restli-Protocol-Version':  '2.0.0',
    'Content-Length':             Buffer.byteLength(body)
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    if (res.statusCode === 201) {
      const result = JSON.parse(data);
      console.log(`✅ Post publicado. LinkedIn ID: ${result.id}`);
      console.log(`   Ver en: https://www.linkedin.com/feed/`);
    } else {
      console.error(`❌ Error LinkedIn API: HTTP ${res.statusCode}`);
      console.error(data);
      process.exit(1);
    }
  });
});

req.on('error', (err) => {
  console.error('❌ Error de red:', err.message);
  process.exit(1);
});

req.write(body);
req.end();
