// normalis-users.js
// NormaLis — módulo extraído del inline script de normativa-app-v2.html
// ─────────────────────────────────────────────

async function createUser(nombre, rol, pin){
  const ini = nombre.split(' ').filter(Boolean).map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const u = { id:Date.now(), nombre, rol, pinHash:await pinHash(pin),
    color:ROLE_DEF[rol]?.color||'#64748b', ini, createdAt:new Date().toISOString() };
  _users.push(u); saveUsers(); return u;
}

function editUser(id){
  const u=_users.find(x=>x.id===id); if(!u) return;
  _editingUserId=id;
  const fn=document.getElementById('um-form-nombre'); if(fn) fn.value=u.nombre;
  const fr=document.getElementById('um-form-rol'); if(fr) fr.value=u.rol;
  const fp=document.getElementById('um-form-pin'); if(fp){ fp.value=''; fp.placeholder='Dejar vacío = sin cambios'; }
  const ft=document.getElementById('um-form-title'); if(ft) ft.textContent='✏️ Editar Usuario';
  const form=document.getElementById('um-form'); if(form){ form.style.display='block'; form.scrollIntoView({behavior:'smooth'}); }
}

function deleteUser(id){ _users=_users.filter(u=>u.id!==id); saveUsers(); }

function confirmDeleteUser(id){
  const u=_users.find(x=>x.id===id); if(!u) return;
  if(!confirm('¿Eliminar el perfil de '+u.nombre+'? Esta acción no se puede deshacer.')) return;
  logActivity('user_deleted','perfiles','Usuario eliminado: '+u.nombre);
  deleteUser(id); renderUserMgmt(); toast('Usuario eliminado','success');
}

function newUser(){
  _editingUserId=null;
  const fn=document.getElementById('um-form-nombre'); if(fn){ fn.value=''; fn.focus(); }
  const fr=document.getElementById('um-form-rol'); if(fr) fr.value='auxiliar';
  const fp=document.getElementById('um-form-pin'); if(fp){ fp.value=''; fp.placeholder='4 dígitos numéricos'; }
  const ft=document.getElementById('um-form-title'); if(ft) ft.textContent='➕ Nuevo Usuario';
  const form=document.getElementById('um-form'); if(form) form.style.display='block';
}

function openProfModal(id){
  var arr=loadPersonal();
  var p=arr.find(function(x){ return x.id===id; });
  if(!p) return;
  var pmName=document.getElementById('pm-name'); if(pmName) pmName.textContent=p.nombre;
  var pmRole=document.getElementById('pm-role'); if(pmRole) pmRole.textContent=p.cargo+' · '+p.tipo;
  var ini=(p.nombre||'?').split(' ').slice(0,2).map(function(w){ return w[0]; }).join('').toUpperCase();
  var pmAvatar=document.getElementById('pm-avatar'); if(pmAvatar) pmAvatar.textContent=ini;
  var docNames={titulo:'Título profesional',rethus:'Tarjeta RETHUS',contrato:'Contrato vigente',vacunas:'Esquema vacunas',bioseg:'Capacitación bioseguridad'};
  var docsEl=document.getElementById('pm-docs');
  if(docsEl) docsEl.innerHTML=Object.keys(docNames).map(function(k){
    var ok=p.docs&&p.docs[k];
    return '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">'+
      '<span>'+(ok?'✅':'❌')+'</span>'+
      '<span style="font-size:13px;color:'+(ok?'var(--text)':'var(--danger)')+'">'+docNames[k]+'</span>'+
      '</div>';
  }).join('');
  var actions=document.querySelector('#prof-modal .pm-actions');
  if(actions&&!actions.querySelector('[data-del]')){
    var delBtn=document.createElement('button');
    delBtn.className='btn btn-sm';
    delBtn.style.cssText='background:rgba(239,68,68,.12);color:#fca5a5;border:1px solid rgba(239,68,68,.3)';
    delBtn.textContent='🗑 Eliminar';
    delBtn.setAttribute('data-del',id);
    delBtn.onclick=function(){ if(confirm('¿Eliminar a '+p.nombre+'?')){ var a=loadPersonal(); savePersonal(a.filter(function(x){ return x.id!==id; })); closeProfModal(); renderProfGrid(); toast('Profesional eliminado','info'); } };
    actions.insertBefore(delBtn,actions.firstChild);
  } else if(actions) {
    var existing=actions.querySelector('[data-del]');
    if(existing) existing.setAttribute('data-del',id);
  }
  var modal=document.getElementById('prof-modal'); if(modal) modal.style.display='flex';
}

function closeProfModal(){
  var modal=document.getElementById('prof-modal'); if(modal) modal.style.display='none';
  var actions=document.querySelector('#prof-modal .pm-actions');
  if(actions){ var del=actions.querySelector('[data-del]'); if(del) del.remove(); }
}

// END:normalis-users.js — NormaLis integrity seal
