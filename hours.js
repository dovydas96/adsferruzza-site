// hours.js - Populate opening hours (regular + special) & JSON-LD from /data/reviews.json
// Enhancements:
// - Regular hours with weekdayDescriptions
// - Special days (holiday / exception) from specialOpeningHours.specialHourPeriods (if present)
// - Improved readability: single column on narrow screens, aligned columns, inline 'oggi', summary sentence
// - Updates JSON-LD openingHoursSpecification (regular only – special days are ephemeral)
// Fallback: If fetch or parsing fails, static markup remains.
(function(){
  const DATA_URL = (location.protocol === 'file:' ? './data/reviews.json' : '/data/reviews.json');
  const DAY_ORDER = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const DAY_MAP_IT = {Monday:'Lun',Tuesday:'Mar',Wednesday:'Mer',Thursday:'Gio',Friday:'Ven',Saturday:'Sab',Sunday:'Dom'};
  const IT_TO_EN = {lunedì:'Monday',martedì:'Tuesday',mercoledì:'Wednesday',giovedì:'Thursday',venerdì:'Friday',sabato:'Saturday',domenica:'Sunday'};
  function parseDescription(desc){
    // e.g. 'Monday: 7:00 AM – 8:00 PM' or 'lunedì: 07:00–20:00' or 'Wednesday: Closed'
    if(!desc || typeof desc !== 'string') return null;
    const parts = desc.split(/:/); // first colon splits day
    if(parts.length < 2) return null;
    let dayName = parts.shift().trim();
    // Convert Italian to English
    const dayLower = dayName.toLowerCase();
    if(IT_TO_EN[dayLower]) dayName = IT_TO_EN[dayLower];
    const rest = parts.join(':').trim();
    // Normalize dash variants
    const closed = /chius|closed/i.test(rest);
    if(closed) return { day: dayName, closed:true };
    // Split on dash/en dash/em dash
    const rangeParts = rest.split(/[–—-]/).map(s=>s.trim()).filter(Boolean); // en dash or hyphen
    if(rangeParts.length === 2){
      return { day: dayName, opens: rangeParts[0].replace(/\s+/g,''), closes: rangeParts[1].replace(/\s+/g,'') };
    }
    return { day: dayName, raw: rest };
  }
  function formatTime24(str){
    if(!str) return null;
    // Google may return HH:MM:SS or HH:MM
    const m = str.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
    if(!m) return str; // leave as-is
    return `${m[1]}:${m[2]}`;
  }
  function isoToReadable(dateStr){
    // dateStr like 2025-12-24
    const d = new Date(dateStr+'T00:00:00');
    return d.toLocaleDateString('it-IT', { weekday:'short', day:'2-digit', month:'2-digit' });
  }
  async function run(){
    const wrapper = document.querySelector('.hours-block');
    const ul = wrapper?.querySelector('.hours-list');
    if(!ul) return;
    try {
      const res = await fetch(DATA_URL, { cache:'no-store' });
      if(!res.ok) throw new Error('HTTP '+res.status);
      const json = await res.json();
  const roh = json?.place?.regularOpeningHours;
  const soh = json?.place?.specialOpeningHours; // object with specialHourPeriods
  const descs = roh?.weekdayDescriptions || roh?.weekday_text;
      if(!Array.isArray(descs) || !descs.length) return; // keep static
      const parsed = descs.map(parseDescription).filter(Boolean);
      // Order by DAY_ORDER
      const byDay = {};
      parsed.forEach(p=>{ byDay[p.day] = p; });
      // Regenerate list
  ul.innerHTML = '';
      DAY_ORDER.forEach(enDay => {
        const p = byDay[enDay];
        const li = document.createElement('li');
        let label = DAY_MAP_IT[enDay] || enDay.slice(0,3);
          let timeText = '—';
          let badge = '';
          if(p){
            if(p.closed){
              li.classList.add('closed');
              timeText = 'Chiuso';
              badge = '<span class="badge">chiuso</span>';
            } else if(p.opens && p.closes){
              const fmt = (t)=> t.replace(/AM|PM|\.m\.|/gi,'').replace(/\./g,'').replace(/(\d)(?:\s*)([ap]m)/i,'$1').replace(/^([0-9]):/,'0$1:');
              timeText = `${fmt(p.opens)}–${fmt(p.closes)}`;
              badge = '<span class="badge">aperto</span>';
            } else {
              timeText = p.raw || '';
            }
          }
          li.innerHTML = `<span>${label}</span><span>${timeText}</span>${badge}`;
        ul.appendChild(li);
      });
      // Re-apply today highlight after replacement
      const today = new Date().getDay(); // 0=Sun
      const map = {0:'Dom',1:'Lun',2:'Mar',3:'Mer',4:'Gio',5:'Ven',6:'Sab'};
      const todayLabel = map[today];
      ul.querySelectorAll('li').forEach(li=>{
        const d = li.firstElementChild?.textContent?.trim();
        if(d === todayLabel) li.classList.add('today');
          if(d === todayLabel){
            li.classList.add('today');
            const badge = li.querySelector('.badge');
            if(badge) badge.textContent = 'oggi';
          }
      });
      // Insert summary line (first child) describing if open now
      try {
        const now = new Date();
        const dayIdx = now.getDay(); // 0=Sun
        const label = map[dayIdx];
        const todayLi = Array.from(ul.children).find(li=>li.firstElementChild?.textContent?.trim()===label);
        let summaryText = 'Orari aggiornati';
        if(todayLi){
          const range = todayLi.querySelector('span:last-child')?.textContent || '';
          if(/chius/i.test(range)) {
            summaryText = 'Oggi chiuso';
          } else {
            // Determine open/closed now (approx)
            const match = range.match(/(\d{2}:\d{2})\s*[–-]\s*(\d{2}:\d{2})/);
            if(match){
              const [_, o, c] = match;
              const [oh,om] = o.split(':').map(Number); const [ch,cm] = c.split(':').map(Number);
              const nowMin = now.getHours()*60 + now.getMinutes();
              const openMin = oh*60 + om; const closeMin = ch*60 + cm;
              const openNow = nowMin >= openMin && nowMin < closeMin;
              summaryText = openNow ? `Aperto ora · ${range}` : `Chiude alle ${c}`;
            }
          }
        }
        const summary = document.createElement('div');
        summary.className = 'hours-summary';
        summary.textContent = summaryText;
        wrapper.insertBefore(summary, ul);
      } catch(_) {}

      // Special days (upcoming) list
      if(soh?.specialHourPeriods && Array.isArray(soh.specialHourPeriods)){
        const upcoming = soh.specialHourPeriods
          .map(p => {
            const date = p?.startDate?.year && p?.startDate?.month && p?.startDate?.day ? `${p.startDate.year}-${String(p.startDate.month).padStart(2,'0')}-${String(p.startDate.day).padStart(2,'0')}` : null;
            const closed = p.closed === true;
            const openTime = formatTime24(p?.openTime);
            const closeTime = formatTime24(p?.closeTime);
            return { date, closed, openTime, closeTime };
          })
          .filter(x => x.date)
          .sort((a,b)=> a.date.localeCompare(b.date));
        const future = upcoming.filter(x => new Date(x.date+'T00:00:00') >= new Date(new Date().toISOString().slice(0,10)+'T00:00:00'));
        if(future.length){
          const specialWrap = document.createElement('div');
          specialWrap.className = 'special-hours';
          const title = document.createElement('div');
          title.className = 'special-hours-title';
          title.textContent = 'Giorni speciali';
            specialWrap.appendChild(title);
          const list = document.createElement('ul');
          list.className = 'special-hours-list';
          future.slice(0,5).forEach(sp => {
            const li = document.createElement('li');
            li.innerHTML = `<span>${isoToReadable(sp.date)}</span><span>${sp.closed ? 'Chiuso' : `${sp.openTime?.slice(0,5)||''}–${sp.closeTime?.slice(0,5)||''}`}</span>`;
            if(sp.closed) li.classList.add('closed');
            list.appendChild(li);
          });
          specialWrap.appendChild(list);
          wrapper.appendChild(specialWrap);
        }
      }
  // Update JSON-LD bakery openingHoursSpecification (if we can parse into periods with opens/closes)
      const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      const spec = [];
      DAY_ORDER.forEach(enDay => {
        const p = byDay[enDay];
        if(!p) return;
        if(p.closed) return; // skip closed day
        if(p.opens && p.closes){
          // Expect HH:MM (24h) otherwise skip
          const open24 = /24/.test(p.opens) && /24/.test(p.closes);
          const norm = (t)=>{
            // convert 7:00AM etc to 07:00
            let m = t.match(/(\d{1,2})(?::(\d{2}))?/);
            if(!m) return null;
            let h = parseInt(m[1],10); let min = m[2]||'00';
            if(/pm/i.test(t) && h < 12) h+=12;
            if(/am/i.test(t) && h === 12) h = 0;
            return (h<10?'0':'')+h+':'+min;
          };
          const o = norm(p.opens); const c = norm(p.closes);
          if(o && c){
            spec.push({ '@type':'OpeningHoursSpecification', dayOfWeek:[enDay], opens:o, closes:c });
          }
        }
      });
      if(spec.length){
        scripts.forEach(s => {
          try {
            const data = JSON.parse(s.textContent.trim());
            if(data && (data['@type']==='Bakery' || data['@type']==='LocalBusiness')){
              data.openingHoursSpecification = spec;
              s.textContent = JSON.stringify(data);
            }
          } catch(e){ /* ignore */ }
        });
      }
      // Notify layout equalizers that heights may have changed
      document.dispatchEvent(new CustomEvent('hours-updated'));
    } catch(err){
      console.warn('[hours] fallback to static hours:', err.message);
    }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
