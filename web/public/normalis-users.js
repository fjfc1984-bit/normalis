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

  // ── Cumplimiento documental ──────────────────────────────────────────────
  const compliance = (typeof getDocCompliance === 'function') ? getDocCompliance(p) : null;
  const complianceBadge = compliance
    ? '<div style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700;background:'+compliance.color+'22;color:'+compliance.color+';border:1px solid '+compliance.color+'44">'+
        '<span>📋</span><span>'+compliance.pct+'% documental ('+compliance.ok+'/'+compliance.total+')</span></div>'
    : '';

  // Actualizar pm-role con badge de cumplimiento
  if(pmRole){
    pmRole.innerHTML = (p.cargo+' · '+p.tipo)+
      (complianceBadge ? '<br><span style="margin-top:4px;display:inline-block">'+complianceBadge+'</span>' : '');
  }

  // ── Documentos con semáforo ──────────────────────────────────────────────
  const docNames={
    titulo:'Título profesional', rethus:'Tarjeta RETHUS', contrato:'Contrato vigente',
    vacunas:'Esquema vacunas', bioseg:'Capacitación bioseguridad',
    induccion:'Inducción institucional', bls:'BLS/RCP vigente',
    residuos:'Manejo de residuos', simulacro:'Simulacro emergencias'
  };
  const reqDocs = compliance ? compliance.req : Object.keys(docNames);
  const docsEl=document.getElementById('pm-docs');
  if(docsEl){
    // Sección documentos
    let html = reqDocs.map(function(k){
      const ok=p.docs&&p.docs[k];
      const isRequired = compliance && compliance.req.includes(k);
      return '<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border)">'+
        '<span style="font-size:16px">'+(ok?'✅':'❌')+'</span>'+
        '<span style="font-size:13px;color:'+(ok?'var(--text)':'var(--danger)')+'">'+docNames[k]+'</span>'+
        (isRequired&&!ok ? '<span style="font-size:10px;background:#ef444422;color:#ef4444;padding:1px 6px;border-radius:10px;margin-left:auto">Requerido</span>' : '')+
        '</div>';
    }).join('');

    // Sección vencimientos si existen
    const hoy = new Date();
    const vencItems = [
      {key:'venc_tarjeta', label:'Venc. tarjeta profesional'},
      {key:'venc_contrato', label:'Venc. contrato'},
      {key:'venc_rethus',  label:'Últ. verif. RETHUS'},
      {key:'fecha_bls',    label:'BLS/RCP (vence 2 años)'},
    ].filter(function(vc){ return p[vc.key]; });

    if(vencItems.length){
      html += '<div style="font-size:11px;font-weight:700;color:var(--text-muted);margin:10px 0 4px;text-transform:uppercase;letter-spacing:.5px">📅 Vencimientos</div>';
      html += vencItems.map(function(vc){
        var fecha = new Date(p[vc.key]);
        var dias = Math.ceil((fecha - hoy)/(1000*60*60*24));
        var color = dias < 0 ? '#ef4444' : dias <= 30 ? '#f59e0b' : dias <= 60 ? '#eab308' : '#10b981';
        var badge = dias < 0
          ? '<span style="color:#ef4444;font-size:11px;margin-left:auto">⚠️ Vencido hace '+Math.abs(dias)+'d</span>'
          : dias <= 60
            ? '<span style="color:'+color+';font-size:11px;margin-left:auto">⏳ Vence en '+dias+'d</span>'
            : '<span style="color:#10b981;font-size:11px;margin-left:auto">✓ '+p[vc.key]+'</span>';
        return '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid var(--border)">'+
          '<span style="font-size:13px;color:var(--text-muted)">'+vc.label+'</span>'+badge+'</div>';
      }).join('');
    }

    // Alertas de RETHUS no verificado
    if(compliance && compliance.warnings.filter(function(w){ return w.tipo==='rethus'; }).length){
      html += '<div style="margin-top:8px;padding:8px 10px;background:#f59e0b18;border:1px solid #f59e0b44;border-radius:8px;font-size:12px;color:#f59e0b">'+
        '⚠️ RETHUS sin verificar — consultar en MinSalud para confirmar vigencia de tarjeta profesional</div>';
    }

    docsEl.innerHTML = html;
  }

  // ── Acciones ────────────────────────────────────────────────────────────
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

  // ── Botón verificar RETHUS mejorado ─────────────────────────────────────
  if(actions){
    let rethusBtn=actions.querySelector('[data-rethus-btn]');
    if(!rethusBtn){
      rethusBtn=document.createElement('button');
      rethusBtn.className='btn btn-outline btn-sm';
      rethusBtn.setAttribute('data-rethus-btn','1');
      actions.insertBefore(rethusBtn,actions.firstChild);
    }
    if(p.rethus){
      rethusBtn.innerHTML='🔍 Verificar RETHUS · '+p.rethus;
      rethusBtn.title='Copia el No. '+p.rethus+' y abre RETHUS MinSalud para verificar vigencia';
      rethusBtn.style.cssText='';
      rethusBtn.onclick=function(){
        if(typeof openRethusVerification==='function'){
          openRethusVerification(p.rethus, p.nombre);
        } else {
          try{ navigator.clipboard.writeText(p.rethus); }catch(e){}
          toast('No. RETHUS '+p.rethus+' copiado — pégalo en el buscador RETHUS','info');
          window.open('https://rethus.minsalud.gov.co/Paginas/ConsultaPublica.aspx','_blank');
        }
      };
    } else {
      rethusBtn.innerHTML='🔍 Verificar RETHUS';
      rethusBtn.title='Agrega el No. RETHUS al profesional para habilitar la verificación directa';
      rethusBtn.style.cssText='opacity:0.5;cursor:default';
      rethusBtn.onclick=function(){ toast('Agrega el No. RETHUS al guardar este profesional','info'); };
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
