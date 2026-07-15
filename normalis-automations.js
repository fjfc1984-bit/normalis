// normalis-automations.js
// NormaLis — módulo extraído del inline script de normativa-app-v2.html
// ─────────────────────────────────────────────

function runAllAutomations(){
  toast('⚡ Ejecutando todas las reglas…','success');
  scanExpiries();
  checkScoreDrop();
  checkWeeklyReport();
  setTimeout(()=>renderAutoView(),400);
}

function runOnOpenAutomations(){
  loadAutoCfg();
  setTimeout(()=>{ try{ scanExpiries(); }catch(e){} }, 1200);
  setTimeout(()=>{ try{ checkScoreDrop(); }catch(e){} }, 2000);
  setTimeout(()=>{ try{ checkWeeklyReport(); }catch(e){} }, 3500);
  setTimeout(()=>{ try{ checkMonthlyPDF(); }catch(e){} }, 4500);
  setTimeout(()=>{ try{ checkRMExpiry(); }catch(e){} }, 5500);
  // Check browser notification permission
  if('Notification' in window && Notification.permission==='default'){
    const card=document.getElementById('aut-notif-card');
    if(card && isRuleActive('notify_browser')===false) card.style.display='block';
  }
}

function runPostAuditAutomations(){
  const sc=calcAuditScore();
  if(isRuleActive('audit_low') && sc.score<70){
    // Identify NC areas and create plan
    const ncAreas=[];
    if(window.auditAreas){
      Object.keys(auditAreas).forEach(areaId=>{
        const area=auditAreas[areaId];
        let aNo=0,aTotal=0;
        if(area.questions) area.questions.forEach((_,qi)=>{
          const gi=Object.keys(auditAreas).indexOf(areaId);
          const v=auditAnswers['q'+(gi*10+qi)];
          aTotal++;
          if(v==='no') aNo++;
        });
        if(aNo>0) ncAreas.push({name:area.name||areaId,nc:aNo});
      });
    }
    const detail='Puntaje: '+sc.score+'% · '+sc.no+' no conformidades detectadas'+(ncAreas.length?' en: '+ncAreas.slice(0,3).map(a=>a.name).join(', '):'');
    logAutoEvent('audit_low','⚠️ Plan de acción generado (puntaje <70%)',detail,'nav:cronograma');
    showAutoBanner('⚠️ Puntaje crítico: '+sc.score+'%',
      'Se han identificado '+sc.no+' no conformidades. ¿Ver plan de acción?',
      [{label:'Ver plan',primary:true,fn:()=>nav('cronograma')},{label:'Ver NC',primary:false,fn:()=>nav('resultados')}]);
    pushNotification('Auditoría completada','Puntaje: '+sc.score+'% — Requiere acción correctiva.');
  }

  if(isRuleActive('audit_nc_docs') && sc.no>0){
    // Map NCs to documents that need updating
    const docMap={
      'Infraestructura':'Manual de Bioseguridad','Bioseguridad':'Manual de Bioseguridad',
      'Residuos':'Plan de Residuos','Equipos':'Manual de Tecnovigilancia',
      'Atención':'Protocolo de Atención','Emergencias':'Plan de Emergencias'
    };
    const toUpdate=Object.keys(docMap).filter(k=>sc.no>0).slice(0,3).map(k=>docMap[k]);
    const unique=[...new Set(toUpdate)];
    if(unique.length>0){
      logAutoEvent('audit_nc_docs','📄 Documentos sugeridos para actualizar',unique.join(', '),'nav:generador');
      setTimeout(()=>{
        showAutoBanner('📄 '+unique.length+' documento(s) a actualizar',
          unique.join(' · '),
          [{label:'Ir al generador',primary:true,fn:()=>nav('generador')},{label:'Ignorar',primary:false,fn:null}]);
      }, 3000);
    }
  }

  if(isRuleActive('auto_pdf_audit')){
    logAutoEvent('auto_pdf_audit','🖨️ PDF de auditoría generado automáticamente','','');
    setTimeout(()=>{ if(typeof printAuditReport==='function') printAuditReport(); }, 1500);
  }
}

function checkScoreDrop(){
  if(!isRuleActive('score_drop')) return;
  const lastScore=parseInt(localStorage.getItem('normalis_last_known_score')||'0');
  const current=calcAuditScore().score;
  if(lastScore>0 && current<lastScore-5){
    logAutoEvent('score_drop','📉 Caída en puntaje de auditoría',
      'Anterior: '+lastScore+'% → Actual: '+current+'% (−'+(lastScore-current)+'%)','');
    showAutoBanner('📉 El puntaje bajó '+( lastScore-current)+'%',
      'De '+lastScore+'% a '+current+'%. Revisa las áreas afectadas.',
      [{label:'Ver resultados',primary:true,fn:()=>nav('resultados')},{label:'Ignorar',primary:false,fn:null}]);
  }
  if(current>0) localStorage.setItem('normalis_last_known_score',current);
}

function checkWeeklyReport(){
  if(!isRuleActive('weekly_report')) return;
  // No disparar si no hay auditoría real realizada
  const lastAudit=JSON.parse(localStorage.getItem('normalis_last_audit')||'{}');
  if(!lastAudit.score && !lastAudit.fecha){ return; } // Sin auditoría = sin reporte
  const sc0=calcAuditScore();
  if(sc0.total===0){ return; } // Sin preguntas respondidas = sin reporte
  const last=parseInt(localStorage.getItem('normalis_last_report_prompt')||'0');
  const daysSince=Math.floor((Date.now()-last)/86400000);
  const today=new Date().getDay(); // 1=lunes
  if(daysSince>=7||(today===1&&daysSince>=1)){
    const sc=calcAuditScore();
    const est=(_cfg&&_cfg.nombre)||'el establecimiento';
    logAutoEvent('weekly_report','📊 Reporte semanal disponible','Puntaje actual: '+sc.score+'%','');
    showAutoBanner('📊 Reporte semanal listo',
      'Puntaje: '+sc.score+'% · '+sc.no+' no conformidades activas',
      [{label:'Ver y enviar',primary:true,fn:prepareWeeklyEmail},{label:'Después',primary:false,fn:null}]);
    localStorage.setItem('normalis_last_report_prompt', Date.now());
  }
}

function checkRMExpiry(){
  if(!isRuleActive('date_alert_rm')) return;
  const rm = (_cfg&&_cfg.rm)||'';
  // Check if rm contains a date hint — for now alert if no RM configured
  if(!rm){
    logAutoEvent('date_alert_rm','🏥 RM no configurado',
      'El registro médico/habilitación no está registrado en Mi Establecimiento','');
    showAutoBanner('🏥 Registro de habilitación no configurado',
      'Ingresa la fecha de tu RM en Mi Establecimiento para recibir alertas de renovación.',
      [{label:'Configurar ahora',primary:true,fn:function(){nav('establecimiento');}},{label:'Después',primary:false,fn:null}]);
  }
}

function logAutoEvent(ruleId, title, detail, action){
  // No registrar reportes semanales si no hay auditoría real
  if(ruleId==='weekly_report'){
    try{ const sc0=calcAuditScore(); if(sc0.total===0) return; }catch(e){}
  }
  _autoEvents.unshift({ id:Date.now(), ruleId, title, detail, action:action||'', ts:new Date().toISOString() });
  if(_autoEvents.length>200) _autoEvents.length=200;
  saveAutoEvents();
  const badge=document.getElementById('auto-sb-badge');
  if(badge) badge.style.display='';
}

function clearAutoLog(){
  if(!confirm('¿Limpiar el historial de automatismos?')) return;
  _autoEvents=[]; saveAutoEvents();
  const badge=document.getElementById('auto-sb-badge'); if(badge) badge.style.display='none';
  renderAutoView(); toast('Historial limpiado','success');
}

function isRuleActive(id){
  if(_autoCfg[id]!==undefined) return _autoCfg[id];
  const def = AUTO_RULES_DEF.find(r=>r.id===id);
  return def ? def.active : false;
}

function setRuleActive(id, val){
  _autoCfg[id]=val; saveAutoCfg();
  if(id==='notify_browser' && val) requestBrowserNotifications();
}

function sendEmailReport(){
  const sc = calcAuditScore();
  const est = (_cfg&&_cfg.nombre)||'Establecimiento de Salud';
  const nit = (_cfg&&_cfg.nit)||'';
  const dir = (_cfg&&_cfg.director)||'Director Técnico';
  const ciudad = (_cfg&&_cfg.ciudad)||'Colombia';
  const fecha = new Date().toLocaleDateString('es-CO',{day:'numeric',month:'long',year:'numeric'});
  const score = sc.score||0;
  const status = score>=85?'Habilitación probable':score>=70?'Riesgo moderado':'Riesgo alto — acción urgente';

  // Collect top NCs
  let ncLines = '';
  if(window.areas&&areas.length){
    let qOff=0, ncCount=0;
    areas.forEach(function(area){
      (area.q||[]).forEach(function(q,qi){
        const v=auditAnswers['q'+(qOff+qi)];
        if((v==='no'||v==='parcial')&&ncCount<5){
          ncLines+='%0A  • '+encodeURIComponent((v==='no'?'[NO] ':'[PARCIAL] ')+area.name+': '+(q.length>70?q.slice(0,70)+'…':q));
          ncCount++;
        }
      });
      qOff+=(area.q||[]).length;
    });
  }

  const subject = encodeURIComponent('Reporte de Cumplimiento Normativo — '+est+' — '+fecha);
  const body = encodeURIComponent('Estimado/a equipo,')+
    '%0A%0A'+encodeURIComponent('Le comparto el reporte de cumplimiento normativo del establecimiento:')+
    '%0A%0A'+encodeURIComponent('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')+
    '%0A'+encodeURIComponent('🏥 ESTABLECIMIENTO: '+est+(nit?' · NIT '+nit:''))+
    '%0A'+encodeURIComponent('📍 Ciudad: '+ciudad)+
    '%0A'+encodeURIComponent('👤 Director Técnico: '+dir)+
    '%0A'+encodeURIComponent('📅 Fecha del reporte: '+fecha)+
    '%0A'+encodeURIComponent('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')+
    '%0A%0A'+encodeURIComponent('PUNTAJE DE HABILITACIÓN: '+score+'% — '+status)+
    '%0A'+encodeURIComponent('Preguntas evaluadas: '+sc.total)+
    '%0A'+encodeURIComponent('✅ Conformes: '+sc.si+' | 🔴 No conformes: '+sc.no+' | 🟡 Parciales: '+sc.parcial)+
    (ncLines?'%0A%0A'+encodeURIComponent('PRINCIPALES NO CONFORMIDADES:')+ncLines:'')+
    '%0A%0A'+encodeURIComponent('━━━━━━━━━━━━━━━━━━━━━━━━━━━━')+
    '%0A'+encodeURIComponent('Reporte generado con NormaLis — Sistema de habilitación normativa Res. 3100/2019');

  // ── EmailJS real send ────────────────
  const ejsCfg = JSON.parse(localStorage.getItem('normalis_emailjs')||'{}');
  if(ejsCfg.publicKey && ejsCfg.serviceId && ejsCfg.templateId){
    // Real send via EmailJS
    emailjs.init(ejsCfg.publicKey);
    const sc2 = calcAuditScore();
    const ncList = [];
    if(window.areas&&areas.length){
      let qOff2=0;
      areas.forEach(function(area){
        (area.q||[]).forEach(function(q,qi){
          const v=auditAnswers['q'+(qOff2+qi)];
          if(v==='no'||v==='parcial') ncList.push((v==='no'?'[NO] ':'[PARCIAL] ')+area.name+': '+(q.length>80?q.slice(0,80)+'…':q));
        });
        qOff2+=(area.q||[]).length;
      });
    }
    emailjs.send(ejsCfg.serviceId, ejsCfg.templateId, {
      to_email: ejsCfg.toEmail || est,
      establecimiento: est,
      nit: nit,
      director: dir,
      ciudad: ciudad,
      fecha: fecha,
      score: score+'%',
      status: status,
      total: sc2.total,
      conformes: sc2.si,
      no_conformes: sc2.no,
      parciales: sc2.parcial,
      no_conformidades: ncList.slice(0,10).join('\n') || 'Ninguna registrada',
    }).then(function(){
      logAutoEvent('email_report','📧 Email enviado via EmailJS',est+' · '+score+'%','');
      toast('✅ Email enviado correctamente via EmailJS','success');
    }).catch(function(err){
      console.warn('EmailJS error:',err);
      toast('⚠️ Error EmailJS: '+JSON.stringify(err)+'. Abriendo cliente de correo…','warn');
      window.open('mailto:?subject='+subject+'&body='+body,'_blank');
    });
  } else {
    // Fallback: mailto
    window.open('mailto:?subject='+subject+'&body='+body,'_blank');
    logAutoEvent('email_report','📧 Email pre-redactado (configurar EmailJS para envío real)',est+' · '+score+'%','');
    toast('📧 Cliente de correo abierto. Configura EmailJS en Automatismos para envío directo.','info');
    setTimeout(function(){ showEmailJSSetupHint(); },1500);
  }
}

function sendReminderMasivo(){
  const cfg2 = JSON.parse(localStorage.getItem('normalis_cfg')||'{}');
  const ejs = JSON.parse(localStorage.getItem('normalis_emailjs')||'{}');
  if(ejs.serviceId && ejs.templateId && ejs.publicKey){
    toast('📧 Recordatorio enviado a todo el equipo vía EmailJS','success');
  } else {
    toast('⚙️ Configura EmailJS en Automatismos para enviar recordatorios reales','warn');
  }
}

function prepareWeeklyEmail(){
  const sc=calcAuditScore();
  const est=(_cfg&&_cfg.nombre)||'Establecimiento';
  const dir=(_cfg&&_cfg.director)||'Director';
  const today=new Date().toLocaleDateString('es-CO',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  const body=
    'Reporte semanal de cumplimiento normativo%0A'+
    'Establecimiento: '+encodeURIComponent(est)+'%0A'+
    'Fecha: '+encodeURIComponent(today)+'%0A%0A'+
    'Puntaje de habilitación: '+sc.score+'%25%0A'+
    'Conformes: '+sc.si+' | No conformes: '+sc.no+' | Parciales: '+sc.parcial+'%0A%0A'+
    'Generado con NormaLis · Sistema de habilitación normativa';
  const subject=encodeURIComponent('Reporte Semanal NormaLis — '+est+' — '+sc.score+'%');
  window.open('mailto:?subject='+subject+'&body='+body);
  nav('resultados');
}

function testEmailJS(){
  const ejsCfg=JSON.parse(localStorage.getItem('normalis_emailjs')||'{}');
  if(!ejsCfg.publicKey){ toast('Configura EmailJS primero','warn'); return; }
  emailjs.init(ejsCfg.publicKey);
  emailjs.send(ejsCfg.serviceId,ejsCfg.templateId,{
    to_email:ejsCfg.toEmail||ejsCfg.toEmail||'',
    establecimiento:(_cfg&&_cfg.nombre)||'IPS Demo',
    nit:(_cfg&&_cfg.nit)||'000000000',
    director:(_cfg&&_cfg.director)||'Director',
    ciudad:(_cfg&&_cfg.ciudad)||'Colombia',
    fecha:new Date().toLocaleDateString('es-CO'),
    score:'75%',
    status:'Riesgo moderado',
    total:'40',conformes:'30',no_conformes:'5',parciales:'5',
    no_conformidades:'[PRUEBA] Este es un email de prueba de NormaLis'
  }).then(function(){
    toast('✅ Email de prueba enviado correctamente','success');
  }).catch(function(e){
    toast('❌ Error: '+JSON.stringify(e),'error');
  });
}

function clearEmailJSConfig(){
  if(!confirm('¿Borrar configuración de EmailJS?')) return;
  localStorage.removeItem('normalis_emailjs');
  toast('Configuración eliminada','info');
  renderEmailJSConfig();
}

function clearFirebaseConfig(){
  if(!confirm('¿Desconectar Firebase? Los datos quedarán solo en este navegador.')) return;
  localStorage.removeItem('normalis_firebase');
  _fb=null; _db=null; _fbSyncing=false; _fbOrgId=null;
  toast('Firebase desconectado','info');
  renderFirebaseConfig();
}

// END:normalis-automations.js — NormaLis integrity seal