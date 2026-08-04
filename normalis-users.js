// normalis-users.js
// NormaLis — módulo extraído del inline script de normativa-app-v2.html
// ─────────────────────────────────────────────

async function createUser(nombre, rol, pin){
  try {
    const ini = nombre.split(' ').filter(Boolean).map(w=>w[0]).join('').slice(0,2).toUpperCase();
    const hash = await pinHash(pin);
    const u = { id:Date.now(), nombre, rol, pinHash:hash,
      color:ROLE_DEF[rol]?.color||'#64748b', ini, createdAt:new Date().toISOString() };
    _users.push(u); saveUsers(); return u;
  } catch(e) {
    console.error('[NormaLis Users] Error creando usuario:', e);
    if (typeof NormalisAutofix !== 'undefined') NormalisAutofix.report('normalis-users', e, { fn:'createUser', nombre, rol });
    throw e;
  }
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
  nlConfirm('¿Eliminar el perfil de <strong>'+u.nombre+'</strong>?<br><span style="font-size:12px;color:#f87171">Esta acción no se puede deshacer.</span>', 'Eliminar', '#ef4444').then(function(ok){
    if(!ok) return;
    logActivity('user_deleted','perfiles','Usuario eliminado: '+u.nombre);
    deleteUser(id); renderUserMgmt(); toast('Usuario eliminado','success');
  });
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
  const arr=loadPersonal();
  const p=arr.find(function(x){ return x.id===id; });
  if(!p) return;
  const pmName=document.getElementById('pm-name'); if(pmName) pmName.textContent=p.nombre;
  const pmRole=document.getElementById('pm-role'); if(pmRole) pmRole.textContent=p.cargo+' · '+p.tipo;
  let ini=(p.nombre||'?').split(' ').slice(0,2).map(function(w){ return w[0]; }).join('').toUpperCase();
  const pmAvatar=document.getElementById('pm-avatar'); if(pmAvatar) pmAvatar.textContent=ini;
  const docNames={titulo:'Título profesional',rethus:'Tarjeta RETHUS',contrato:'Contrato vigente',vacunas:'Esquema vacunas',bioseg:'Capacitación bioseguridad'};
  const docsEl=document.getElementById('pm-docs');
  if(docsEl) docsEl.innerHTML=Object.keys(docNames).map(function(k){
    const ok=p.docs&&p.docs[k];
    return '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">'+
      '<span>'+(ok?'✅':'❌')+'</span>'+
      '<span style="font-size:13px;color:'+(ok?'var(--text)':'var(--danger)')+'">'+docNames[k]+'</span>'+
      '</div>';
  }).join('');
  let actions=document.querySelector('#prof-modal .pm-actions');
  if(actions&&!actions.querySelector('[data-del]')){
    const delBtn=document.createElement('button');
    delBtn.className='btn btn-sm';
    delBtn.style.cssText='background:rgba(239,68,68,.12);color:#fca5a5;border:1px solid rgba(239,68,68,.3)';
    delBtn.textContent='🗑 Eliminar';
    delBtn.setAttribute('data-del',id);
    delBtn.onclick=function(){ nlConfirm('¿Eliminar a <strong>'+p.nombre+'</strong>?', 'Eliminar', '#ef4444').then(function(ok){ if(!ok) return; var a=loadPersonal(); savePersonal(a.filter(function(x){ return x.id!==id; })); closeProfModal(); renderProfGrid(); toast('Profesional eliminado','info'); }); };
    actions.insertBefore(delBtn,actions.firstChild);
  } else if(actions) {
    const existing=actions.querySelector('[data-del]');
    if(existing) existing.setAttribute('data-del',id);
  }
  // Botón verificar RETHUS — añadir o actualizar
  if(actions){
    let rethusBtn=actions.querySelector('[data-rethus-btn]');
    if(!rethusBtn){
      rethusBtn=document.createElement('button');
      rethusBtn.className='btn btn-outline btn-sm';
      rethusBtn.setAttribute('data-rethus-btn','1');
      actions.insertBefore(rethusBtn,actions.firstChild);
    }
    if(p.rethus){
      rethusBtn.innerHTML='🔍 Verificar RETHUS';
      rethusBtn.title='Verificar tarjeta profesional No. '+p.rethus+' en RETHUS';
      rethusBtn.style.display='';
      rethusBtn.onclick=function(){
        window.open('https://rethus.minsalud.gov.co/','_blank');
      };
    } else {
      rethusBtn.innerHTML='🔍 Verificar RETHUS';
      rethusBtn.title='Registra el No. RETHUS al agregar este profesional para verificar directamente';
      rethusBtn.style.cssText='opacity:0.5;cursor:default';
      rethusBtn.onclick=function(){ toast('Agrega el No. RETHUS en el perfil del profesional para usar esta función','info'); };
    }
  }
  let modal=document.getElementById('prof-modal'); if(modal) modal.style.display='flex';
}

function closeProfModal(){
  let modal=document.getElementById('prof-modal'); if(modal) modal.style.display='none';
  let actions=document.querySelector('#prof-modal .pm-actions');
  if(actions){ var del=actions.querySelector('[data-del]'); if(del) del.remove(); }
}

// END:normalis-users.js — NormaLis integrity seal
