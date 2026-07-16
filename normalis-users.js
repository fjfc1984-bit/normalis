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
  document.getElementById('um-form-nombre').value=u.nombre;
  document.getElementById('um-form-rol').value=u.rol;
  document.getElementById('um-form-pin').value='';
  document.getElementById('um-form-pin').placeholder='Dejar vacío = sin cambios';
  document.getElementById('um-form-title').textContent='✏️ Editar Usuario';
  document.getElementById('um-form').style.display='block';
  document.getElementById('um-form').scrollIntoView({behavior:'smooth'});
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
  document.getElementById('um-form-nombre').value='';
  document.getElementById('um-form-rol').value='auxiliar';
  document.getElementById('um-form-pin').value='';
  document.getElementById('um-form-pin').placeholder='4 dígitos numéricos';
  document.getElementById('um-form-title').textContent='➕ Nuevo Usuario';
  document.getElementById('um-form').style.display='block';
  document.getElementById('um-form-nombre').focus();
}

function openProfModal(id){
  var arr=loadPersonal();
  var p=arr.find(function(x){ return x.id===id; });
  if(!p) return;
  document.getElementById('pm-name').textContent=p.nombre;
  document.getElementById('pm-role').textContent=p.cargo+' · '+p.tipo;
  var ini=(p.nombre||'?').split(' ').slice(0,2).map(function(w){ return w[0]; }).join('').toUpperCase();
  document.getElementById('pm-avatar').textContent=ini;
  var docNames={titulo:'Título profesional',rethus:'Tarjeta RETHUS',contrato:'Contrato vigente',vacunas:'Esquema vacunas',bioseg:'Capacitación bioseguridad'};
  var docsEl=document.getElementById('pm-docs');
  if(docsEl) docsEl.innerHTML=Object.keys(docNames).map(function(k){
    var ok=p.docs&&p.docs[k];
    return '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">'+
      '<span>'+(ok?'✅':'❌')+'</span>'+
      '<span style="font-size:13px;color:'+(ok?'var(--text)':'var(--danger)')+'">'+docNames[k]+'</span>'+
      '</div>';
  }).join('');
  // Delete button in actions
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
  document.getElementById('prof-modal').style.display='flex';
}

function closeProfModal(){
  document.getElementById('prof-modal').style.display='none';
  var actions=document.querySelector('#prof-modal .pm-actions');
  if(actions){ var del=actions.querySelector('[data-del]'); if(del) del.remove(); }
}

// END:normalis-users.js — NormaLis integrity seal
