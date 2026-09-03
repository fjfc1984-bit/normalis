/**
 * scripts/linkedin-post.js
 * Publica el post de LinkedIn que corresponde a la fecha de hoy.
 *
 * Variables de entorno requeridas (GitHub Secrets):
 *   LINKEDIN_TOKEN      — OAuth 2.0 access token con scope w_member_social
 *   LINKEDIN_PERSON_URN — urn:li:person:XXXXXXXX (campo "sub" de /v2/userinfo, scope openid)
 *
 * Usa la API moderna /rest/posts (LinkedIn-Version header) — /v2/ugcPosts
 * está deprecado y las apps nuevas ya no tienen acceso a su capa legada.
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const POSTS_FILE = path.join(__dirname, '..', 'normalis-linkedin-posts.json');
const TOKEN      = process.env.LINKEDIN_TOKEN;
const PERSON_URN = process.env.LINKEDIN_PERSON_URN;

if (!TOKEN) { console.error('LINKEDIN_TOKEN no configurado.'); process.exit(1); }
if (!PERSON_URN) { console.error('LINKEDIN_PERSON_URN no configurado.'); process.exit(1); }

function getTodayCOT() {
  const now = new Date();
  const cot = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  return cot.toISOString().split('T')[0];
}

const today  = getTodayCOT();
const posts  = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'));
const toPost = posts.find(p => p.date === today);

if (!toPost) {
  console.log('No hay post programado para hoy (' + today + '). Nada que publicar.');
  process.exit(0);
}

console.log('Publicando post ' + toPost.id + ' (' + today + '):');
console.log(toPost.text.slice(0, 80) + '...');

const body = JSON.stringify({
  author: PERSON_URN,
  commentary: toPost.text,
  visibility: 'PUBLIC',
  distribution: {
    feedDistribution: 'MAIN_FEED',
    targetEntities: [],
    thirdPartyDistributionChannels: []
  },
  lifecycleState: 'PUBLISHED',
  isReshareDisabledByAuthor: false
});

const options = {
  hostname: 'api.linkedin.com',
  path: '/rest/posts',
  method: 'POST',
  headers: {
    'Authorization':             'Bearer ' + TOKEN,
    'Content-Type':              'application/json',
    'X-Restli-Protocol-Version': '2.0.0',
    'LinkedIn-Version':          '202608',
    'X-RestLi-Method':           'CREATE',
    'Content-Length':            Buffer.byteLength(body)
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    if (res.statusCode === 201) {
      const postId = res.headers['x-restli-id'] || (data ? JSON.parse(data).id : null);
      console.log('Post publicado. LinkedIn ID: ' + postId);
    } else {
      console.error('Error LinkedIn API: HTTP ' + res.statusCode);
      console.error('Headers: ' + JSON.stringify(res.headers));
      console.error(data);
      process.exit(1);
    }
  });
});
req.on('error', (err) => { console.error('Error de red:', err.message); process.exit(1); });
req.write(body);
req.end();
