// normalis-audit-score.js
// NormaLis — Módulo de resultados de auditoría: calcAuditScore, showResults, logAuditCompleted
// ─────────────────────────────────────────────

// ══════════════════════════════════════════════
// RESULTADOS DINÁMICOS — calcula score real de auditAnswers
// ══════════════════════════════════════════════
function calcAuditScore(){
  const total = flatQ.length;
  if(!total) return {score:0,si:0,no:0,parcial:0,na:0,total:0};
  let si=0,no=0,parcial=0,na=0;
  flatQ.forEach((_,i)=>{
    const v = auditAnswers['q'+i];
    if(v==='si') si++;
    else if(v==='no') no++;
    else if(v==='parcial') parcial++;
    else if(v==='na') na++;
  });
  const effective = total - na;
  const raw = effective>0 ? Math.round(((si + parcial*0.5)/effective)*100) : 0;
  return {score:raw, si, no, parcial, na, total, effective};
}

function renderResultadosDynamic(){
  const r = calcAuditScore();
  const score = r.score;
  const scoreColor = score>=85?'#10b981':score>=70?'#f59e0b':'#ef4444';
  const scoreLabel = score>=85?'✅ Habilitación probable':score>=70?'⚠️ Riesgo moderado':'🔴 Riesgo alto';
  const riskLabel  = score>=85?'✅ Habilitación probable':score>=70?'⚠️ Riesgo moderado':'🔴 Riesgo alto';
  const today = new Date().toLocaleDateString('es-CO',{day:'numeric',month:'long',year:'numeric'});
  const segLabel = {general:'Establecimiento General',domiciliaria:'Salud Domiciliaria',imagenologia:'Imagenología',calidad:'Calidad en Salud',urgencias:'Urgencias',internacion:'Internación',quirurgicos:'Quirúrgicos',laboratorio:'Laboratorio Clínico',transporte:'Transporte Asistencial',rehabilitacion:'Rehabilitación',salud_mental:'Salud Mental',odontologia:'Odontología'}[segActivo]||'Auditoría';

  // Update hero score
  const heroScore = document.querySelector('#view-resultados .res-big');
  if(heroScore) heroScore.textContent = score;
  if(heroScore) heroScore.style.color = scoreColor;

  // Update date and segment
  const heroSub = document.querySelector('#view-resultados .res-score-hero .text-sm');
  if(heroSub) heroSub.textContent = '/ 100 · '+segLabel+' · '+today;

  // Update risk badge
  const heroBadge = document.querySelector('#view-resultados .res-score-hero .badge');
  if(heroBadge){
    heroBadge.textContent = riskLabel;
    heroBadge.style.background = score>=85?'rgba(16,185,129,.2)':score>=70?'rgba(245,158,11,.2)':'rgba(239,68,68,.2)';
    heroBadge.style.color = scoreColor;
  }

  // Update sidebar score
  const sbScore = document.getElementById('sb-score-val');
  if(sbScore) sbScore.textContent = score;
  const sbNote = document.querySelector('.sb-score-note');
  if(sbNote) sbNote.textContent = riskLabel+' · Meta: 85+';

  // Build area-by-area breakdown
  const breakdown = document.getElementById('res-area-breakdown');
  if(breakdown && areas && areas.length){
    let html='';
    let qOffset=0;
    areas.forEach(area=>{
      const aQs = area.q||[];
      let aSi=0,aNo=0,aPar=0,aNa=0;
      aQs.forEach((_,qi)=>{
        const v=auditAnswers['q'+(qOffset+qi)];
        if(v==='si') aSi++;
        else if(v==='no') aNo++;
        else if(v==='parcial') aPar++;
        else if(v==='na') aNa++;
      });
      const aEff = aQs.length - aNa;
      const aPct = aEff>0 ? Math.round(((aSi+aPar*0.5)/aEff)*100) : 100;
      const aColor = aPct>=85?'var(--success)':aPct>=60?'var(--warning)':'var(--danger)';
      html+=`<div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <span style="font-size:13px;font-weight:700">${area.icon} ${area.name}</span>
          <span style="font-size:13px;font-weight:800;color:${aColor}">${aPct}%</span>
        </div>
        <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden">
          <div style="height:100%;width:${aPct}%;background:${aColor};border-radius:4px;transition:width .6s"></div>
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:3px">${aSi} sí · ${aNo} no · ${aPar} parcial${aNa?' · '+aNa+' N/A':''}</div>
      </div>`;
      qOffset += aQs.length;
    });
    breakdown.innerHTML = html;
  }

  // Non-conformidades list
  const ncList = document.getElementById('res-nc-list');
  if(ncList && areas && areas.length){
    let html='', qOffset=0, ncCount=0;
    areas.forEach(area=>{
      (area.q||[]).forEach((q,qi)=>{
        const v=auditAnswers['q'+(qOffset+qi)];
        if(v==='no'||v==='parcial'){
          ncCount++;
          const sev=v==='no'?'🔴 No cumple':'🟡 Cumple parcialmente';
          html+=`<div style="padding:12px 0;border-bottom:1px solid var(--border)">
            <div style="display:flex;gap:8px;align-items:flex-start">
              <span style="font-size:12px;margin-top:1px">${sev}</span>
              <div style="flex:1">
                <div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:2px">${area.icon} ${area.name}</div>
                <div style="font-size:11px;color:var(--text-muted);line-height:1.45">${q.length>120?q.slice(0,120)+'…':q}</div>
              </div>
            </div>
          </div>`;
        }
        qOffset++;
      });
      qOffset -= (area.q||[]).length; // reset — already incremented inside
    });
    // Recalculate with correct offset
    qOffset=0; html=''; ncCount=0;
    areas.forEach(area=>{
      (area.q||[]).forEach((q,qi)=>{
        const v=auditAnswers['q'+(qOffset+qi)];
        if(v==='no'||v==='parcial'){
          ncCount++;
          const sev=v==='no'?'🔴 No cumple':'🟡 Cumple parcialmente';
          html+=`<div style="padding:12px 0;border-bottom:1px solid var(--border)">
            <div style="display:flex;gap:8px;align-items:flex-start">
              <div style="padding-top:2px">${sev}</div>
              <div style="flex:1">
                <div style="font-size:12px;font-weight:700;margin-bottom:2px">${area.icon} ${area.name}</div>
                <div style="font-size:11px;color:var(--text-muted);line-height:1.45">${q.length>130?q.slice(0,130)+'…':q}</div>
              </div>
            </div>
          </div>`;
        }
      });
      qOffset+=(area.q||[]).length;
    });
    const ncTitle=document.getElementById('res-nc-title');
    if(ncTitle) ncTitle.textContent=ncCount>0?ncCount+' No Conformidades detectadas':'✅ Sin no conformidades detectadas';
    ncList.innerHTML = html||'<div style="padding:20px;text-align:center;color:var(--success);font-weight:700">✅ Todas las preguntas respondidas conforme</div>';
  }

  // Summary counters
  const counters = {
    'res-total': r.total,
    'res-si': r.si,
    'res-no': r.no,
    'res-parcial': r.parcial,
  };
  Object.entries(counters).forEach(([id,val])=>{
    const el=document.getElementById(id);
    if(el) el.textContent=val;
  });

  // ─── Top bars (resumen rápido por área) ───
  const topBars = document.getElementById('res-top-bars');
  if(topBars && areas && areas.length){
    let html='', qOffset=0;
    areas.forEach(area=>{
      const aQs=area.q||[];
      let aSi=0,aNa=0,aPar=0;
      aQs.forEach((_,qi)=>{
        const v=auditAnswers['q'+(qOffset+qi)];
        if(v==='si') aSi++;
        else if(v==='parcial') aPar++;
        else if(v==='na') aNa++;
      });
      const aEff=aQs.length-aNa;
      const aPct=aEff>0?Math.round(((aSi+aPar*0.5)/aEff)*100):100;
      const aColor=aPct>=85?'#10b981':aPct>=60?'#f59e0b':'#ef4444';
      html+=`<div class="hb-row"><div class="hb-label">${area.icon||''} ${area.name}</div><div class="hb-bar"><div class="hb-fill" style="width:${aPct}%;background:${aColor};transition:width .6s"></div></div><div class="hb-pct" style="color:${aColor}">${aPct}%</div></div>`;
      qOffset+=aQs.length;
    });
    topBars.innerHTML=html||'<div style="color:var(--text-muted);font-size:12px;text-align:center;padding:8px">Sin datos de área</div>';
  }

  // ─── Plan de Acción Priorizado (dinámico desde NCs reales) ───
  const actionPlan = document.getElementById('res-action-plan');
  if(actionPlan && areas && areas.length){
    const noItems=[], parcialItems=[];
    let qOffset=0;
    areas.forEach(area=>{
      (area.q||[]).forEach((q,qi)=>{
        const v=auditAnswers['q'+(qOffset+qi)];
        if(v==='no') noItems.push({area:area.name,icon:area.icon||'📌',q:q.length>90?q.slice(0,90)+'…':q});
        else if(v==='parcial') parcialItems.push({area:area.name,icon:area.icon||'📌',q:q.length>90?q.slice(0,90)+'…':q});
      });
      qOffset+=(area.q||[]).length;
    });
    if(noItems.length===0&&parcialItems.length===0){
      actionPlan.innerHTML='<div style="padding:20px;text-align:center;color:var(--success);font-weight:700;font-size:14px">🎉 ¡Felicitaciones! No se detectaron no conformidades. Tu establecimiento está listo para visita.</div>';
    } else {
      let html='';
      if(noItems.length){
        html+=`<div style="font-size:10px;font-weight:700;color:var(--danger);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">🔴 No cumple — Acción inmediata (${noItems.length})</div>`;
        noItems.forEach(item=>{
          html+=`<div class="alert-item"><div class="alert-dot dot-r"></div><div style="flex:1"><div class="al-title">${item.icon} ${item.area}</div><div style="font-size:11px;color:var(--text-muted);margin-top:2px">${item.q}</div><div class="al-action" onclick="nav('generador')">→ Generar documento correctivo</div></div></div>`;
        });
      }
      if(parcialItems.length){
        html+=`<div style="font-size:10px;font-weight:700;color:var(--warning);text-transform:uppercase;letter-spacing:.05em;margin-top:14px;margin-bottom:8px">🟡 Cumplimiento parcial — Mejorar (${parcialItems.length})</div>`;
        parcialItems.forEach(item=>{
          html+=`<div class="alert-item"><div class="alert-dot dot-y"></div><div style="flex:1"><div class="al-title">${item.icon} ${item.area}</div><div style="font-size:11px;color:var(--text-muted);margin-top:2px">${item.q}</div></div></div>`;
        });
      }
      html+=`<div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--border);display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-primary btn-sm" onclick="nav('generador')">✨ Generar documentos faltantes</button><button class="btn btn-outline btn-sm" onclick="printAuditReport()">📥 Descargar PDF completo</button></div>`;
      actionPlan.innerHTML=html;
    }
  }
}


// END:normalis-audit-score.js — NormaLis integrity seal
