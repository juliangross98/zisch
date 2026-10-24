(function(){
"use strict";

/* ================= constants ================= */
const CATS = [
  {id:'cola', name:'Cola', color:'#5B3423'},
  {id:'cola-mix', name:'Cola-Mix', color:'#8A4F24'},
  {id:'mate', name:'Mate', color:'#9A6810'},
  {id:'limo', name:'Limonade', color:'#C45A0C'},
  {id:'bio', name:'Bio-Limo', color:'#3B7F4C'},
  {id:'schorle', name:'Schorle', color:'#5A841C'},
  {id:'eistee', name:'Eistee', color:'#A3502A'},
  {id:'energy', name:'Energy', color:'#2E4CBC'},
  {id:'bitter', name:'Bitter & Tonic', color:'#2C6E92'},
  {id:'ginger', name:'Ginger', color:'#8C6B16'},
  {id:'malz', name:'Malz', color:'#4B3322'},
  {id:'sonst', name:'Sonstiges', color:'#655892'},
];
const CAT = Object.fromEntries(CATS.map(c=>[c.id,c]));
const catOf = id => CAT[id] || CAT.sonst;
const SERVINGS = ['Glasflasche','PET-Flasche','Dose','Im Glas','Postmix'];

const BADGES = [
  {id:'erster-schluck', name:'Erster Schluck', desc:'Dein allererster Check-in.', mono:'1', color:'#D42E63', val:s=>s.total, goal:1},
  {id:'stammgast', name:'Stammgast', desc:'10 Check-ins.', mono:'10', color:'#15594F', val:s=>s.total, goal:10},
  {id:'durstloescher', name:'Durstlöscher', desc:'50 Check-ins.', mono:'50', color:'#2E4CBC', val:s=>s.total, goal:50},
  {id:'entdecker', name:'Entdecker', desc:'10 verschiedene Drinks probiert.', mono:'En', color:'#C45A0C', val:s=>s.unique.size, goal:10},
  {id:'sortiment', name:'Sortiment-Profi', desc:'25 verschiedene Drinks probiert.', mono:'25', color:'#655892', val:s=>s.unique.size, goal:25},
  {id:'cola', name:'Cola-Kenner', desc:'5 verschiedene Colas oder Cola-Mixe.', mono:'Co', color:'#5B3423', val:s=>s.uniqueCola.size, goal:5},
  {id:'mate', name:'Mate-Mönch', desc:'5 Check-ins mit Mate.', mono:'Ma', color:'#9A6810', val:s=>s.mate, goal:5},
  {id:'zuckerfrei', name:'Ohne Zucker', desc:'5 zuckerfreie Check-ins.', mono:'0g', color:'#2C6E92', val:s=>s.sugarFree, goal:5},
  {id:'koffein', name:'Koffein-Kick', desc:'5 Check-ins mit mindestens 20 mg Koffein pro 100 ml.', mono:'Kf', color:'#A33B2A', val:s=>s.caff, goal:5},
  {id:'schorle', name:'Schorle-Schorsch', desc:'5 Schorlen.', mono:'Sc', color:'#5A841C', val:s=>s.schorle, goal:5},
  {id:'bio', name:'Bio-Brause', desc:'3 verschiedene Bio-Limos.', mono:'Bi', color:'#3B7F4C', val:s=>s.bio.size, goal:3},
  {id:'bitter', name:'Bitter-Fan', desc:'3 Check-ins aus Bitter & Tonic oder Ginger.', mono:'Bt', color:'#8C6B16', val:s=>s.bitter, goal:3},
  {id:'nachteule', name:'Nachteule', desc:'Ein Check-in zwischen 0 und 4 Uhr.', mono:'Na', color:'#2B2F6B', val:s=>s.night, goal:1},
  {id:'frueh', name:'Frühaufsteher', desc:'Ein Check-in zwischen 4 und 7 Uhr.', mono:'Fr', color:'#B27A0A', val:s=>s.early, goal:1},
  {id:'knipser', name:'Knipser', desc:'5 Check-ins mit Foto.', mono:'Fo', color:'#843C86', val:s=>s.photos, goal:5},
  {id:'kritiker', name:'Kritiker', desc:'10 Check-ins mit Kommentar.', mono:'Kr', color:'#45545F', val:s=>s.comments, goal:10},
  {id:'wochenende', name:'Wochenend-Zischer', desc:'5 Check-ins am Samstag oder Sonntag.', mono:'Wo', color:'#B8325E', val:s=>s.weekend, goal:5},
  {id:'ehrlich', name:'Ehrliche Haut', desc:'Eine Bewertung unter 2 Kronkorken vergeben.', mono:'Eh', color:'#56652A', val:s=>s.low, goal:1},
  {id:'volltreffer', name:'Volltreffer', desc:'Volle 5 Kronkorken vergeben.', mono:'5', color:'#A97A06', val:s=>s.five, goal:1},
];
const BADGE = Object.fromEntries(BADGES.map(b=>[b.id,b]));

const ICONS = {
  feed:'<path d="M3 12.5h4l3-7.5 4 14 3-6.5h4"/>',
  search:'<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  barcode:'<path d="M4 5.5v13M7 5.5v13M10.5 5.5v13M13 5.5v13M16.5 5.5v13M20 5.5v13"/>',
  trophy:'<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5.5a2.5 2.5 0 0 0 2.8 3.6M16 6h2.5a2.5 2.5 0 0 1-2.8 3.6M12 13v4M8.5 20h7M10 17h4"/>',
  user:'<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
  back:'<path d="M14.5 5.5L8 12l6.5 6.5"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  camera:'<path d="M4 8.5h3.2L9 6h6l1.8 2.5H20V19H4z"/><circle cx="12" cy="13.5" r="3.3"/>',
  chat:'<path d="M4.5 5.5h15v10h-9L6 19v-3.5H4.5z"/>',
  glass:'<path d="M6.5 4h11l-1.6 14.2a2 2 0 0 1-2 1.8h-3.8a2 2 0 0 1-2-1.8z"/><path d="M7.2 9.5h9.6"/><circle cx="11" cy="13.2" r=".8"/><circle cx="13.5" cy="15.8" r=".8"/><circle cx="12.8" cy="12" r=".5"/>',
  bookmark:'<path d="M6.5 4h11v16.5L12 16.8l-5.5 3.7z"/>',
  pencil:'<path d="M4.5 19.5h3.8L19 8.8 15.2 5 4.5 15.7z"/><path d="M13.5 6.7l3.8 3.8"/>',
  trash:'<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5"/>',
  x:'<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  pin:'<path d="M12 20.5s6.5-6 6.5-11a6.5 6.5 0 0 0-13 0c0 5 6.5 11 6.5 11z"/><circle cx="12" cy="9.5" r="2.3"/>',
  send:'<path d="M4.5 12L20 4.5 15.5 20l-3.2-6.3z"/><path d="M12.3 13.7L20 4.5"/>',
  image:'<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M5 17l4.5-4.5 3 3 2.5-2.5L19.5 17"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  info:'<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.2"/>',
  store:'<path d="M4 9.5L5.5 4.5h13L20 9.5zM4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0M5.5 12v7.5h13V12M10 19.5V15h4v4.5"/>',
  logout:'<path d="M10 5H5.5v14H10M14 8l4 4-4 4M18 12H9.5"/>',
  bolt:'<path d="M13 3.5L6 13h5l-1 7.5 7-9.5h-5z"/>',
};

(function(){
  const pts=[]; const n=21;
  for(let i=0;i<n*2;i++){ const a=i*Math.PI/n-Math.PI/2; const r=i%2?10.3:11.7; pts.push((12+r*Math.cos(a)).toFixed(2)+','+(12+r*Math.sin(a)).toFixed(2)); }
  document.getElementById('cap-poly').setAttribute('points',pts.join(' '));
})();

/* ================= state ================= */
const S = {
  me:null, uid:null, isAdmin:false, booted:false, loaded:false, version:0,
  users:new Map(), drinks:new Map(), checkins:[], wishlist:[], dstats:new Map(),
  route:{name:'feed'}, stack:[],
  feedFilter:'all', feedLimit:30,
  searchQ:'', searchCat:'', searchSF:false,
  topTab:'rated', topCat:'', profTab:'activity', authTab:'login',
};

/* ================= helpers ================= */
const $ = s => document.querySelector(s);
const view = $('#view');
const sheetRoot = $('#sheet-root');

function h(tag, props, ...kids){
  const el = document.createElement(tag);
  if(props) for(const k in props){
    const v = props[k];
    if(v==null || v===false) continue;
    if(k==='class') el.className = v;
    else if(k==='style') el.style.cssText = v;
    else if(k.startsWith('on') && typeof v==='function') el.addEventListener(k.slice(2), v);
    else if(k==='value' || k==='checked' || k==='disabled' || k==='hidden' || k==='selected') el[k] = v;
    else el.setAttribute(k, v===true ? '' : v);
  }
  add(el, kids);
  return el;
}
function add(el, kids){
  for(const k of kids.flat(Infinity)){
    if(k==null || k===false) continue;
    el.append(k instanceof Node ? k : String(k));
  }
  return el;
}
function icon(n, s=20, sw=1.8){
  const sp = document.createElement('span'); sp.className='ic';
  sp.innerHTML = `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n]||''}</svg>`;
  return sp;
}
const CAP_SVG = cls => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-cap"/></svg>`;
const fmtR = r => Number(r).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtN = n => Number(n).toLocaleString('de-DE');
const plural = (n, one, many) => `${fmtN(n)} ${n===1?one:many}`;
function ago(ts){
  const s = (Date.now()-ts)/1000;
  if(s<60) return 'gerade eben';
  if(s<3600) return `vor ${Math.floor(s/60)} Min.`;
  if(s<86400) return `vor ${Math.floor(s/3600)} Std.`;
  const d = Math.floor(s/86400);
  if(d===1) return 'gestern';
  if(d<7) return `vor ${d} Tagen`;
  const dt = new Date(ts);
  return dt.toLocaleDateString('de-DE', dt.getFullYear()===new Date().getFullYear() ? {day:'numeric',month:'short'} : {day:'numeric',month:'short',year:'numeric'});
}
const fullDate = ts => new Date(ts).toLocaleString('de-DE',{weekday:'short',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'});
function initials(name){
  const w = String(name||'?').replace(/[^\p{L}\p{N}\s-]/gu,'').split(/[\s-]+/).filter(Boolean);
  if(!w.length) return '?';
  const a = w[0][0], b = w[1] ? w[1][0] : (w[0][1]||'');
  return (a.toUpperCase() + b.toLowerCase());
}
const norm = s => String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/ß/g,'ss');
const photoUrl = id => '/uploads/'+id+'.jpg';

function normEAN(raw){
  let c = String(raw||'').replace(/\D/g,'');
  if(c.length===12) c = '0'+c;
  return c;
}
function eanValid(code){
  if(!/^(\d{8}|\d{13})$/.test(code)) return false;
  const d = code.split('').map(Number); const check = d.pop();
  let sum = 0; d.reverse().forEach((x,i)=>{ sum += x*(i%2===0?3:1); });
  return (10 - sum%10)%10 === check;
}
const fmtEAN = c => c.length===13 ? `${c[0]} ${c.slice(1,7)} ${c.slice(7)}` : c.length===8 ? `${c.slice(0,4)} ${c.slice(4)}` : c;
function findByBarcode(code){
  for(const d of S.drinks.values()) if((d.barcodes||[]).some(b=>normEAN(b)===code)) return d;
  return null;
}

/* ================= server ================= */
async function api(method, url, body, opts={}){
  const init = {method, headers:{'X-Requested-With':'zisch'}, credentials:'same-origin'};
  if(body instanceof Blob){ init.body = body; init.headers['Content-Type'] = body.type || 'image/jpeg'; }
  else if(body!==undefined){ init.body = JSON.stringify(body); init.headers['Content-Type'] = 'application/json'; }
  let r;
  try { r = await fetch(url, init); }
  catch(e){ throw {status:0, message:'Keine Verbindung zum Server. Prüf dein Netz und versuch es nochmal.'}; }
  let j = null; try { j = await r.json(); } catch(e){}
  if(!r.ok){
    if(r.status===401 && !opts.allow401 && S.me){ S.me = null; S.uid = null; closeSheet(true); render(); }
    throw {status:r.status, message:(j && j.error) || 'Das hat nicht geklappt. Versuch es nochmal.'};
  }
  return j;
}
async function act(fn, okMsg){
  try { const r = await fn(); await refresh(); if(okMsg) snack(okMsg); return r || true; }
  catch(e){ snack(e.message || 'Das hat nicht geklappt.'); return false; }
}
async function refresh(){
  const d = await api('GET','/api/data');
  applyData(d);
}
function applyData(d){
  S.version = d.version;
  S.me = d.me; S.uid = d.me.id; S.isAdmin = !!d.me.isAdmin;
  S.users = new Map(d.users.map(u=>[u.id,u]));
  S.drinks = new Map(d.drinks.map(x=>[x.id,x]));
  S.checkins = d.checkins.map(c=>Object.assign({}, c, {
    toasts: Object.fromEntries(c.toasts.map(u=>[u,true])),
    comments: Object.fromEntries(c.comments.map(m=>[m.id,m])),
  }));
  S.wishlist = d.wishlist;
  S.loaded = true;
  computeDrinkStats();
  scheduleRender();
}

/* ================= small components ================= */
function caps(r, size=18, label=true){
  const wrap = h('span',{class:'caps',style:`--cs:${size}px`});
  if(label){ wrap.setAttribute('role','img'); wrap.setAttribute('aria-label', r ? `${fmtR(r)} von 5 Kronkorken` : 'Keine Bewertung'); }
  else wrap.setAttribute('aria-hidden','true');
  for(let i=0;i<5;i++){
    const f = Math.max(0, Math.min(1, (r||0)-i));
    const c = h('span',{class:'cap'});
    c.innerHTML = CAP_SVG('e') + `<span class="f" style="width:${(f*100).toFixed(1)}%">${CAP_SVG('')}</span>`;
    wrap.append(c);
  }
  return wrap;
}
function miniCap(size){
  const el = h('span',{class:'caps',style:`--cs:${size}px`,'aria-hidden':'true'});
  el.innerHTML = `<span class="cap"><span class="f" style="width:100%">${CAP_SVG('')}</span></span>`;
  return el;
}
function drinkLabel(d, size=48){
  const fallback = () => h('span',{class:'dl',style:`--dl:${size}px;--cc:${catOf(d&&d.category).color}`,'aria-hidden':'true'}, initials(d&&d.name));
  if(d && d.imageUrl){
    const box = h('span',{class:'dl dl-img',style:`--dl:${size}px`,'aria-hidden':'true'});
    const img = h('img',{src:d.imageUrl,alt:'',loading:'lazy',referrerpolicy:'no-referrer'});
    img.addEventListener('error', ()=>box.replaceWith(fallback()));
    box.append(img);
    return box;
  }
  return fallback();
}
function bcap(b, size=64, on=true){
  const el = h('span',{class:'bcap'+(on?'':' off'),style:`--bs:${size}px;--bc:${b.color}`,'aria-hidden':'true'});
  el.innerHTML = CAP_SVG('');
  el.append(h('span',null,b.mono));
  return el;
}
function initialsAvatar(name, color){
  const t = initials(name).toUpperCase().replace(/[^\p{L}\p{N}]/gu,'').slice(0,2) || '?';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="${color||'#728884'}"/><text x="32" y="41" font-family="Figtree,Arial,sans-serif" font-size="26" font-weight="700" text-anchor="middle" fill="#ffffff">${t}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
function profiles(){
  const P = {};
  for(const u of S.users.values()) P[u.id] = {name:u.displayName, avatarUrl: u.avatarId ? photoUrl(u.avatarId) : initialsAvatar(u.displayName, u.color), color:u.color, isAdmin:u.isAdmin};
  return P;
}
function nameOf(uid, P){ const p = P && P[uid]; return (p && p.name) || 'Gelöschtes Konto'; }
function avatar(uid, P, size=40){
  const p = P && P[uid];
  const src = p ? p.avatarUrl : initialsAvatar('?', '#728884');
  return h('img',{class:'av',src, alt:'', width:size, height:size, style:`width:${size}px;height:${size}px`});
}
function catTag(id){ const c=catOf(id); return h('span',{class:'tag tag-cat',style:`--cc:${c.color}`}, c.name); }
function segmented(opts, value, onChange){
  return h('div',{class:'seg',role:'group'}, opts.map(([v,l])=>h('button',{type:'button','aria-pressed':String(v===value),onclick:()=>onChange(v)},l)));
}
function emptyState(b, title, text, ...actions){
  return h('div',{class:'card empty'}, b ? bcap(b,56,true) : null, h('h2',null,title), h('p',null,text), actions.filter(Boolean).length ? h('div',{class:'row-wrap',style:'justify-content:center;margin-top:6px'}, actions) : null);
}
function skeletons(n){
  const box = h('div',{class:'stack','aria-label':'Wird geladen'});
  for(let i=0;i<n;i++) box.append(h('div',{class:'card skel-card pulse'}, h('div',{class:'skel'}), h('div',{style:'display:flex;flex-direction:column;gap:8px'}, h('div',{class:'skel',style:'height:14px;width:70%'}), h('div',{class:'skel',style:'height:12px;width:40%'}), h('div',{class:'skel',style:'height:12px;width:90%'}))));
  return box;
}
function backbar(){
  return h('div',{class:'backbar'}, h('button',{type:'button',onclick:back}, icon('back',20), 'Zurück'));
}
function snack(msg){
  const r = $('#snack-root'); r.replaceChildren(h('div',{class:'snack',role:'status'}, msg));
  clearTimeout(snack.t); snack.t = setTimeout(()=>r.replaceChildren(), 3400);
}
const canAct = () => !!S.me;

/* ================= stats ================= */
function computeDrinkStats(){
  const m = new Map();
  for(const c of S.checkins){
    let s = m.get(c.drinkId);
    if(!s){ s = {n:0, rated:0, sum:0, users:new Set(), hist:[0,0,0,0,0], photos:[], last:0}; m.set(c.drinkId, s); }
    s.n++; s.users.add(c.userId); s.last = Math.max(s.last, c.createdAt||0);
    if(c.rating){ s.rated++; s.sum += c.rating; s.hist[Math.min(4, Math.max(0, Math.ceil(c.rating)-1))]++; }
    if(c.photoId) s.photos.push(c);
  }
  for(const s of m.values()) s.avg = s.rated ? s.sum/s.rated : 0;
  S.dstats = m;
}
const dstat = id => S.dstats.get(id) || {n:0, rated:0, sum:0, avg:0, users:new Set(), hist:[0,0,0,0,0], photos:[], last:0};

function userStats(uid, list){
  const st = {total:0, unique:new Set(), uniqueCola:new Set(), mate:0, sugarFree:0, caff:0, schorle:0, bio:new Set(), bitter:0, night:0, early:0, photos:0, comments:0, weekend:0, low:0, five:0, first:0};
  for(const c of list){
    if(c.userId!==uid) continue;
    const d = S.drinks.get(c.drinkId) || {};
    st.total++; st.unique.add(c.drinkId);
    if(!st.first || c.createdAt<st.first) st.first = c.createdAt;
    const cat = d.category;
    if(cat==='cola' || cat==='cola-mix') st.uniqueCola.add(c.drinkId);
    if(cat==='mate') st.mate++;
    if(d.sugarFree) st.sugarFree++;
    if((d.caffeine||0)>=20) st.caff++;
    if(cat==='schorle') st.schorle++;
    if(cat==='bio') st.bio.add(c.drinkId);
    if(cat==='bitter' || cat==='ginger') st.bitter++;
    const dt = new Date(c.createdAt); const hr = dt.getHours(); const wd = dt.getDay();
    if(hr<4) st.night++;
    if(hr>=4 && hr<7) st.early++;
    if(wd===0 || wd===6) st.weekend++;
    if(c.photoId) st.photos++;
    if(c.comment && c.comment.trim()) st.comments++;
    if(c.rating && c.rating<2) st.low++;
    if(c.rating===5) st.five++;
  }
  return st;
}
const earned = st => BADGES.filter(b=>b.val(st)>=b.goal).map(b=>b.id);

/* ================= navigation ================= */
function go(name, params){ S.stack.push(S.route); S.route = Object.assign({name}, params||{}); window.scrollTo(0,0); render(); }
function back(){ S.route = S.stack.pop() || {name:'feed'}; render(); }
function tab(name){ S.stack = []; S.route = {name}; window.scrollTo(0,0); render(); }

/* ================= rendering ================= */
let renderQueued = false, pendingRender = false;
function isTyping(){
  const a = document.activeElement;
  return !!(a && view.contains(a) && (a.tagName==='INPUT' || a.tagName==='TEXTAREA') && a.type!=='range');
}
function scheduleRender(){
  if(renderQueued) return; renderQueued = true;
  requestAnimationFrame(()=>{ renderQueued = false; if(isTyping()){ pendingRender = true; return; } render(); });
}
document.addEventListener('focusout', ()=>{ if(pendingRender) setTimeout(()=>{ if(pendingRender && !isTyping()){ pendingRender=false; render(); } }, 0); });

function render(){
  pendingRender = false;
  document.body.classList.toggle('anon', !S.me);
  let node;
  try { node = buildView(profiles()); }
  catch(e){
    console.error(e);
    node = h('div',{class:'col'}, emptyState(null,'Da ist was schiefgelaufen','Diese Ansicht konnte nicht angezeigt werden.', h('button',{class:'btn btn-primary',onclick:()=>tab('feed')},'Zum Feed')));
  }
  view.replaceChildren(node);
  updateChrome();
}
function buildView(P){
  if(!S.booted) return h('div',{class:'col'}, skeletons(3));
  if(!S.me) return viewAuth();
  const r = S.route;
  switch(r.name){
    case 'feed': return viewFeed(P);
    case 'search': return viewSearch(P);
    case 'top': return viewTop(P);
    case 'profile': return viewUser(P, S.uid);
    case 'user': return viewUser(P, r.uid);
    case 'drink': return viewDrink(P, r.id);
    case 'brand': return viewBrand(P, r.brand);
    case 'checkin': return viewCheckin(P, r.id);
    default: return viewFeed(P);
  }
}
function updateChrome(){
  const active = {feed:'feed', search:'search', top:'top', profile:'profile'}[S.route.name] || (S.route.name==='user' && S.route.uid===S.uid ? 'profile' : null);
  document.querySelectorAll('[data-tab]').forEach(b=>{ if(b.dataset.tab===active) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current'); });
  const me = $('#me-btn');
  me.replaceChildren(S.uid ? avatar(S.uid, profiles(), 32) : icon('user',20));
}

/* ================= auth ================= */
function viewAuth(){
  const wrap = h('div',{class:'auth'});
  const hero = h('section',{class:'hero'});
  [[10,12,8,-2,20],[30,7,7,-5,60],[56,10,9,-3,40],[78,6,6,-1,70],[88,12,10,-6,30]].forEach(([l,s,d,dl,rest])=>hero.append(h('span',{class:'bubble','aria-hidden':'true',style:`left:${l}%;width:${s}px;height:${s}px;--dur:${d}s;--delay:${dl}s;--sway:${s%2?6:-6}px;--rest:${rest}%`})));
  hero.append(h('div',{class:'hero-c'}, h('h1',null,'Zisch'), h('p',null,'Softdrinks einchecken, mit Kronkorken bewerten, Fotos teilen und Abzeichen sammeln.')));
  wrap.append(hero);
  wrap.append(h('div',{style:'display:flex;justify-content:center'}, segmented([['login','Anmelden'],['register','Registrieren']], S.authTab, v=>{ S.authTab=v; render(); })));
  const card = h('section',{class:'panel'});
  const err = h('p',{class:'err',hidden:true,role:'alert'});
  if(S.authTab==='login'){
    const u = h('input',{class:'input',id:'login-user',autocomplete:'username',autocapitalize:'none',spellcheck:'false',required:true});
    const p = h('input',{class:'input',id:'login-pass',type:'password',autocomplete:'current-password',required:true});
    const btn = h('button',{class:'btn btn-primary btn-block',type:'submit'},'Anmelden');
    card.append(h('form',{novalidate:true,onsubmit:async e=>{
      e.preventDefault(); err.hidden = true; btn.disabled = true;
      try { await api('POST','/api/login',{username:u.value.trim(), password:p.value},{allow401:true}); await boot(); }
      catch(ex){ err.hidden=false; err.textContent=ex.message; btn.disabled=false; }
    }},
      h('div',{class:'field'}, h('label',{for:'login-user'},'Benutzername'), u),
      h('div',{class:'field'}, h('label',{for:'login-pass'},'Passwort'), p),
      err, btn));
  } else {
    const inv = h('input',{class:'input',id:'reg-invite',autocomplete:'off',autocapitalize:'none',spellcheck:'false'});
    const u = h('input',{class:'input',id:'reg-user',autocomplete:'username',autocapitalize:'none',spellcheck:'false',maxlength:'24'});
    const dn = h('input',{class:'input',id:'reg-name',autocomplete:'nickname',maxlength:'40'});
    const p = h('input',{class:'input',id:'reg-pass',type:'password',autocomplete:'new-password'});
    const btn = h('button',{class:'btn btn-primary btn-block',type:'submit'},'Konto anlegen');
    card.append(h('form',{novalidate:true,onsubmit:async e=>{
      e.preventDefault(); err.hidden = true;
      if(!/^[A-Za-z0-9_.-]{3,24}$/.test(u.value.trim())){ err.hidden=false; err.textContent='Benutzername: 3 bis 24 Zeichen, nur Buchstaben, Ziffern, Punkt, Minus und Unterstrich.'; return; }
      if(p.value.length<8){ err.hidden=false; err.textContent='Das Passwort braucht mindestens 8 Zeichen.'; return; }
      btn.disabled = true;
      try { await api('POST','/api/register',{invite:inv.value.trim(), username:u.value.trim(), displayName:dn.value.trim(), password:p.value},{allow401:true}); await boot(); snack('Willkommen bei Zisch!'); }
      catch(ex){ err.hidden=false; err.textContent=ex.message; btn.disabled=false; }
    }},
      h('div',{class:'field'}, h('label',{for:'reg-invite'},'Einladungscode'), inv, h('span',{class:'hint'},'Den Code bekommst du von der Person, die Zisch betreibt.')),
      h('div',{class:'field'}, h('label',{for:'reg-user'},'Benutzername'), u, h('span',{class:'hint'},'Damit meldest du dich an.')),
      h('div',{class:'field'}, h('label',{for:'reg-name'},'Anzeigename'), dn, h('span',{class:'hint'},'So sehen dich die anderen, z. B. „Julian“.')),
      h('div',{class:'field'}, h('label',{for:'reg-pass'},'Passwort'), p, h('span',{class:'hint'},'Mindestens 8 Zeichen.')),
      err, btn));
  }
  wrap.append(card);
  return wrap;
}

/* ================= views ================= */
function heroCard(){
  const hero = h('section',{class:'hero','aria-labelledby':'hero-t'});
  const bubbles = [[8,14,7,-2,10],[18,9,9,-5,30],[30,6,6,-1,55],[44,12,11,-7,20],[58,7,8,-3,70],[70,10,10,-6,40],[82,5,7,-4,15],[90,13,12,-8,60],[64,4,5,-2,85],[24,4,6,-6,80]];
  for(const [left,size,dur,delay,rest] of bubbles){
    hero.append(h('span',{class:'bubble','aria-hidden':'true',style:`left:${left}%;width:${size}px;height:${size}px;--dur:${dur}s;--delay:${delay}s;--sway:${size%2?6:-6}px;--rest:${rest}%`}));
  }
  hero.append(h('div',{class:'hero-c'},
    h('h1',{id:'hero-t'},'Was zischt bei dir?'),
    h('p',null,'Scann die Flasche oder such deinen Drink. Dann Kronkorken vergeben, Kommentar dazu, Foto drauf.'),
    h('div',{class:'row-wrap'},
      h('button',{class:'btn btn-primary',onclick:()=>openScan('checkin')}, icon('barcode',18), 'Barcode scannen'),
      h('button',{class:'btn btn-ghost',onclick:()=>tab('search')}, icon('search',18), 'Drink suchen'))));
  return hero;
}

function viewFeed(P){
  const col = h('div',{class:'feed-col'});
  col.append(heroCard());
  col.append(h('div',{class:'section-head'}, h('h2',{class:'h-section'},'Neueste Check-ins'), segmented([['all','Alle'],['mine','Meine']], S.feedFilter, v=>{ S.feedFilter=v; S.feedLimit=30; render(); })));
  let list = S.checkins;
  if(S.feedFilter==='mine') list = list.filter(c=>c.userId===S.uid);
  if(!S.loaded) col.append(skeletons(3));
  else if(!list.length){
    col.append(S.feedFilter==='mine'
      ? emptyState(BADGE['erster-schluck'], 'Noch kein Check-in von dir', 'Scann deine erste Flasche und hol dir das Abzeichen „Erster Schluck“.', h('button',{class:'btn btn-primary',onclick:()=>openScan('checkin')}, icon('barcode',18),'Barcode scannen'))
      : emptyState(BADGE['erster-schluck'], 'Hier ist es noch ruhig', 'Sobald jemand eincheckt, erscheint der Drink hier im Feed. Mach du den Anfang.', h('button',{class:'btn btn-primary',onclick:()=>openScan('checkin')}, icon('barcode',18),'Barcode scannen'), h('button',{class:'btn btn-ghost',onclick:()=>tab('search')},'Drink suchen')));
  } else {
    const st = h('div',{class:'stack'});
    list.slice(0, S.feedLimit).forEach(c=>st.append(checkinCard(c, P)));
    col.append(st);
    if(list.length > S.feedLimit) col.append(h('button',{class:'btn btn-ghost btn-block',onclick:()=>{ S.feedLimit += 30; render(); }},'Ältere Check-ins laden'));
  }
  return h('div',{class:'feed-layout'}, col, rail(P));
}

function rail(P){
  const aside = h('aside',{class:'rail','aria-label':'Übersicht'});
  const weekAgo = Date.now() - 7*86400000;
  const counts = new Map();
  for(const c of S.checkins) if(c.createdAt>=weekAgo) counts.set(c.drinkId, (counts.get(c.drinkId)||0)+1);
  let trending = [...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5);
  let label = 'Diese Woche beliebt';
  if(!trending.length){ trending = [...S.dstats.entries()].map(([id,s])=>[id,s.n]).sort((a,b)=>b[1]-a[1]).slice(0,5); label = 'Am häufigsten getrunken'; }
  const tp = h('section',{class:'panel'}, h('h3',null,label));
  if(trending.length){
    const l = h('div',{class:'stack',style:'gap:10px'});
    for(const [id,n] of trending){ const d = S.drinks.get(id); if(!d) continue;
      l.append(h('button',{class:'row',style:'text-align:left;width:100%',onclick:()=>go('drink',{id})}, drinkLabel(d,36), h('span',{style:'min-width:0;flex:1'}, h('span',{class:'li-t',style:'display:block'},d.name), h('span',{class:'li-s',style:'display:block'},plural(n,'Check-in','Check-ins')))));
    }
    tp.append(l);
  } else tp.append(h('p',{class:'muted small'},'Noch keine Check-ins. Der erste Drink landet hier.'));
  aside.append(tp);
  const st = userStats(S.uid, S.checkins);
  const next = BADGES.filter(b=>b.val(st)<b.goal).map(b=>({b, p:b.val(st)/b.goal})).sort((a,b)=>b.p-a.p)[0];
  const me = h('section',{class:'panel'}, h('h3',null,'Deine Bilanz'),
    h('div',{class:'row',style:'justify-content:space-between'},
      h('div',null, h('div',{class:'h-display',style:'font-size:28px'},fmtN(st.total)), h('div',{class:'faint small'},'Check-ins')),
      h('div',null, h('div',{class:'h-display',style:'font-size:28px'},fmtN(st.unique.size)), h('div',{class:'faint small'},'Drinks')),
      h('div',null, h('div',{class:'h-display',style:'font-size:28px'},fmtN(earned(st).length)), h('div',{class:'faint small'},'Abzeichen'))));
  if(next){
    const v = next.b.val(st);
    me.append(h('div',{class:'row',style:'margin-top:14px'}, bcap(next.b,40,false), h('div',{style:'flex:1;min-width:0'}, h('div',{style:'font-weight:700;font-size:14px'},'Nächstes: ',next.b.name), h('div',{class:'faint small'},`${fmtN(v)} von ${fmtN(next.b.goal)} · ${next.b.desc}`))));
  }
  aside.append(me);
  return aside;
}

function checkinCard(c, P, opts={}){
  const d = S.drinks.get(c.drinkId) || {name:'Unbekannter Drink', brand:'', category:'sonst'};
  const uname = nameOf(c.userId, P);
  const mine = c.userId===S.uid;
  const card = h('article',{class:'card ci'});
  const line = h('p',{class:'ci-line'},
    h('button',{class:'lnk',onclick:()=>go('user',{uid:c.userId})}, uname), h('span',{class:'verb'},' trinkt '),
    h('button',{class:'lnk',onclick:()=>go('drink',{id:c.drinkId})}, d.name),
    d.brand ? [h('span',{class:'verb'},' von '), h('button',{class:'lnk',onclick:()=>go('brand',{brand:d.brand})}, d.brand)] : null);
  card.append(h('div',{class:'ci-head'},
    h('button',{class:'av-btn',onclick:()=>go('user',{uid:c.userId}),'aria-label':'Profil von '+uname}, avatar(c.userId,P,40)),
    h('div',{style:'min-width:0'}, line, c.place ? h('p',{class:'ci-place'}, icon('pin',14), c.place) : null),
    h('button',{onclick:()=>go('drink',{id:c.drinkId}),'aria-label':'Zum Drink '+d.name}, drinkLabel(d,46))));
  const body = h('div',{class:'ci-body'});
  if(c.rating) body.append(h('div',{class:'rating-line'}, caps(c.rating,19), h('span',{class:'rating-num'},fmtR(c.rating))));
  if(c.comment) body.append(h('p',{class:'ci-comment'}, c.comment));
  if(c.photoId) body.append(photoEl(c, d));
  const tags = [];
  if(c.serving) tags.push(h('span',{class:'tag'}, c.serving));
  for(const bid of (c.badges||[])){ const b = BADGE[bid]; if(b) tags.push(h('span',{class:'tag tag-badge'}, bcap(b,16), 'Abzeichen: '+b.name)); }
  if(tags.length) body.append(h('div',{class:'row-wrap'}, tags));
  if(body.childNodes.length) card.append(body);

  const toasters = Object.keys(c.toasts||{});
  const toasted = !!(S.uid && c.toasts && c.toasts[S.uid]);
  const ncm = Object.keys(c.comments||{}).length;
  const foot = h('div',{class:'ci-foot'},
    opts.detail ? h('span',{class:'ci-time',title:fullDate(c.createdAt)}, new Date(c.createdAt).toLocaleString('de-DE',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}))
                : h('button',{class:'ci-time',title:fullDate(c.createdAt),onclick:()=>go('checkin',{id:c.id})}, ago(c.createdAt)),
    h('button',{class:'act','aria-pressed':String(toasted),onclick:()=>toggleToast(c),'aria-label':toasted?'Prost zurücknehmen':'Prost sagen'}, icon('glass',18), toasters.length ? fmtN(toasters.length) : null),
    h('button',{class:'act',onclick:()=>go('checkin',{id:c.id, focus:true}),'aria-label':'Kommentare'}, icon('chat',18), ncm ? fmtN(ncm) : null),
    mine ? h('button',{class:'act',onclick:()=>openCheckin(c.drinkId,{editId:c.id}),'aria-label':'Check-in bearbeiten'}, icon('pencil',17)) : null,
    (mine || S.isAdmin) ? h('button',{class:'act',onclick:()=>confirmDelete(c),'aria-label':'Check-in löschen'}, icon('trash',17)) : null);
  card.append(foot);
  if(toasters.length && !opts.detail){
    const avs = h('span',{class:'avs'}); toasters.slice(0,5).forEach(u=>avs.append(avatar(u,P,22)));
    const names = toasters.slice(0,2).map(u=>nameOf(u,P));
    const more = toasters.length-names.length;
    card.append(h('div',{class:'toasters'}, avs, h('span',null, names.join(', ') + (more>0?` und ${more} weitere`:'') + (toasters.length===1?' sagt Prost':' sagen Prost'))));
  }
  return card;
}
function photoEl(c, d){
  const img = h('img',{class:'ci-photo',src:photoUrl(c.photoId),alt:'Foto zum Check-in von '+(d?d.name:'Drink'),loading:'lazy'});
  img.addEventListener('error', ()=>img.replaceWith(h('div',{class:'ci-photo-miss'},'Foto nicht gefunden.')));
  img.addEventListener('click', ()=>openPhoto(c.photoId, img.alt));
  return img;
}

function viewCheckin(P, id){
  const c = S.checkins.find(x=>x.id===id);
  const col = h('div',{class:'col'}, backbar());
  if(!c){ col.append(S.loaded ? emptyState(null,'Check-in nicht gefunden','Der Check-in wurde gelöscht.') : skeletons(1)); return col; }
  col.append(checkinCard(c, P, {detail:true}));
  const toasters = Object.keys(c.toasts||{});
  if(toasters.length){
    const tp = h('section',{class:'panel'}, h('h3',null, plural(toasters.length,'Prost','Prosts')));
    const l = h('div',{class:'row-wrap'});
    toasters.forEach(u=>l.append(h('button',{class:'chip',onclick:()=>go('user',{uid:u})}, avatar(u,P,22), nameOf(u,P))));
    tp.append(l); col.append(tp);
  }
  const cms = Object.values(c.comments||{}).sort((a,b)=>a.createdAt-b.createdAt);
  const cp = h('section',{class:'panel'}, h('h3',null, cms.length ? plural(cms.length,'Kommentar','Kommentare') : 'Kommentare'));
  if(cms.length){
    const l = h('div');
    for(const m of cms){
      l.append(h('div',{class:'cm'},
        h('button',{class:'av-btn',onclick:()=>go('user',{uid:m.userId})}, avatar(m.userId,P,32)),
        h('div',{style:'min-width:0'}, h('div',{class:'row',style:'gap:8px'}, h('button',{class:'lnk small',onclick:()=>go('user',{uid:m.userId})}, nameOf(m.userId,P)), h('span',{class:'faint small',title:fullDate(m.createdAt)}, ago(m.createdAt))), h('p',null,m.text)),
        (m.userId===S.uid || c.userId===S.uid || S.isAdmin) ? h('button',{class:'act','aria-label':'Kommentar löschen',onclick:()=>act(()=>api('DELETE','/api/comments/'+m.id))}, icon('trash',16)) : null));
    }
    cp.append(l);
  } else cp.append(h('p',{class:'muted small'},'Noch keine Kommentare.'));
  const ta = h('textarea',{class:'textarea',id:'cm-input',rows:'1',maxlength:'280',placeholder:'Kommentar schreiben …','aria-label':'Kommentar'});
  const send = h('button',{class:'btn btn-primary',type:'submit','aria-label':'Kommentar senden'}, icon('send',18));
  const form = h('form',{class:'composer',style:'margin-top:12px',onsubmit:async e=>{
    e.preventDefault(); const text = ta.value.trim(); if(!text) return;
    send.disabled = true;
    const ok = await act(()=>api('POST','/api/checkins/'+c.id+'/comments',{text}));
    send.disabled = false;
    if(ok){ ta.value=''; ta.blur(); render(); }
  }}, ta, send);
  ta.addEventListener('keydown', e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); form.requestSubmit(); } });
  cp.append(form);
  if(S.route.focus){ S.route.focus=false; setTimeout(()=>ta.focus(),50); }
  col.append(cp);
  return col;
}

async function toggleToast(c){
  const on = !!(c.toasts && c.toasts[S.uid]);
  if(on) delete c.toasts[S.uid]; else c.toasts[S.uid] = true;
  render();
  await act(()=>api('POST','/api/checkins/'+c.id+'/toast'));
}
function confirmDelete(c){
  const d = S.drinks.get(c.drinkId);
  const own = c.userId===S.uid;
  openSheet(api_=>h('div',{style:'display:flex;flex-direction:column;gap:16px'},
    sheetHead('Check-in löschen?', api_),
    h('p',{class:'muted'}, `${own?'Dein':'Dieser'} Check-in von ${d?d.name:'diesem Drink'} wird mit Bewertung, Foto, Kommentaren und Prosts entfernt. Das lässt sich nicht rückgängig machen.`),
    h('div',{class:'row',style:'justify-content:flex-end'},
      h('button',{class:'btn btn-ghost',onclick:api_.close},'Abbrechen'),
      h('button',{class:'btn btn-danger',onclick:async ()=>{
        const ok = await act(()=>api('DELETE','/api/checkins/'+c.id), 'Check-in gelöscht.');
        if(ok){ api_.close(); if(S.route.name==='checkin') back(); }
      }}, icon('trash',17),'Löschen'))), {label:'Check-in löschen'});
}

/* ---------- search ---------- */
function searchMatches(q, cat, sf){
  const nq = norm(q).trim();
  let arr = [...S.drinks.values()];
  if(cat) arr = arr.filter(d=>d.category===cat);
  if(sf) arr = arr.filter(d=>d.sugarFree);
  if(nq){
    const qd = q.replace(/\D/g,'');
    arr = arr.filter(d=>norm(d.name+' '+d.brand).includes(nq) || (qd.length>=6 && (d.barcodes||[]).some(b=>b.includes(qd))));
    arr.sort((a,b)=>(norm(a.name).startsWith(nq)?0:1)-(norm(b.name).startsWith(nq)?0:1) || dstat(b.id).n-dstat(a.id).n || a.name.localeCompare(b.name,'de'));
  } else arr.sort((a,b)=>dstat(b.id).n-dstat(a.id).n || a.name.localeCompare(b.name,'de'));
  return arr;
}
function drinkRow(d, onClick, right){
  const s = dstat(d.id);
  return h('button',{class:'li',onclick:onClick},
    drinkLabel(d,44),
    h('span',{style:'min-width:0'}, h('span',{class:'li-t',style:'display:block'}, d.name), h('span',{class:'li-s',style:'display:block'}, [d.brand, catOf(d.category).name, d.sugarFree?'zuckerfrei':null].filter(Boolean).join(' · '))),
    right !== undefined ? right : h('span',{class:'li-r'}, s.rated ? h('span',{class:'rating-line',style:'gap:5px'}, caps(s.avg,13), h('span',{class:'rating-num',style:'color:var(--ink)'},fmtR(s.avg))) : h('span',null,'unbewertet'), h('span',null, plural(s.n,'Check-in','Check-ins'))));
}
function viewSearch(P){
  const col = h('div',{class:'col'});
  col.append(h('h1',{class:'h-page'},'Drinks'));
  const results = h('div');
  const input = h('input',{class:'input',id:'search-input',type:'search',placeholder:'Name, Hersteller oder Barcode-Nummer','aria-label':'Drinks durchsuchen',value:S.searchQ,autocomplete:'off'});
  const paint = ()=>{
    const arr = searchMatches(S.searchQ, S.searchCat, S.searchSF);
    results.replaceChildren();
    if(!S.loaded){ results.append(skeletons(2)); return; }
    const brands = S.searchQ.trim().length>=2 ? [...new Set([...S.drinks.values()].map(d=>d.brand).filter(b=>b && norm(b).includes(norm(S.searchQ.trim()))))].slice(0,6) : [];
    if(brands.length) results.append(h('div',{class:'row-wrap',style:'margin-bottom:12px'}, h('span',{class:'faint small'},'Hersteller:'), brands.map(b=>h('button',{class:'chip',onclick:()=>go('brand',{brand:b})}, icon('store',15), b))));
    if(arr.length){
      const l = h('div',{class:'list'}); arr.slice(0,80).forEach(d=>l.append(drinkRow(d, ()=>go('drink',{id:d.id})))); results.append(l);
      results.append(h('p',{class:'faint small',style:'margin-top:10px'}, plural(arr.length,'Drink','Drinks') + (arr.length>80?', die ersten 80 werden angezeigt':'')));
    } else results.append(emptyState(null, 'Nichts gefunden', 'Kein Drink passt zu deiner Suche. Leg ihn einfach neu an, dann können alle ihn einchecken.'));
    results.append(h('div',{class:'row',style:'justify-content:center;margin-top:14px'}, h('button',{class:'btn btn-ghost',onclick:()=>openDrinkForm({prefill:{name:S.searchQ.trim()}})}, icon('plus',18),'Neuen Drink anlegen')));
  };
  input.addEventListener('input', ()=>{ S.searchQ = input.value; paint(); });
  const chips = h('div',{class:'chips',role:'group','aria-label':'Kategorie'},
    h('button',{class:'chip','aria-pressed':String(!S.searchCat),onclick:()=>{ S.searchCat=''; render(); }},'Alle'),
    CATS.map(c=>h('button',{class:'chip','aria-pressed':String(S.searchCat===c.id),style:`--cc:${c.color}`,onclick:()=>{ S.searchCat = S.searchCat===c.id?'':c.id; render(); }}, h('span',{class:'dot'}), c.name)));
  const sf = h('label',{class:'check small'}, h('input',{type:'checkbox',id:'sf',checked:S.searchSF,onchange:e=>{ S.searchSF = e.target.checked; paint(); }}), 'Nur zuckerfreie');
  col.append(h('div',{style:'display:flex;flex-direction:column;gap:12px'}, h('div',{class:'row'}, input, h('button',{class:'btn btn-primary',style:'flex:none',onclick:()=>openScan('checkin'),'aria-label':'Barcode scannen'}, icon('barcode',18))), chips, sf));
  col.append(results);
  paint();
  return col;
}

/* ---------- drink ---------- */
function viewDrink(P, id){
  const d = S.drinks.get(id);
  const col = h('div',{class:'col'}, backbar());
  if(!d){ col.append(S.loaded ? emptyState(null,'Drink nicht gefunden','Dieser Drink wurde entfernt.') : skeletons(1)); return col; }
  const s = dstat(id);
  const mineN = S.checkins.filter(c=>c.drinkId===id && c.userId===S.uid).length;
  const wished = S.wishlist.includes(id);
  col.append(h('header',{class:'dhead'}, drinkLabel(d,84),
    h('div',{style:'min-width:0;display:flex;flex-direction:column;gap:6px'},
      h('h1',{class:'h-page'}, d.name),
      d.brand ? h('button',{class:'lnk',style:'align-self:flex-start',onclick:()=>go('brand',{brand:d.brand})}, d.brand) : null,
      h('div',{class:'row-wrap'}, catTag(d.category), d.sugarFree ? h('span',{class:'tag'},'zuckerfrei') : null, (d.caffeine||d.caffeine===0) ? h('span',{class:'tag'}, d.caffeine ? `${fmtN(d.caffeine)} mg Koffein/100 ml` : 'koffeinfrei') : null))));
  col.append(h('div',{class:'stats'},
    h('div',{class:'stat'}, h('b',null, s.rated ? fmtR(s.avg) : '–'), h('span',null,'Ø Kronkorken')),
    h('div',{class:'stat'}, h('b',null, fmtN(s.n)), h('span',null,'Check-ins')),
    h('div',{class:'stat'}, h('b',null, fmtN(s.users.size)), h('span',null,'Leute')),
    h('div',{class:'stat'}, h('b',null, fmtN(mineN)), h('span',null,'Von dir'))));
  col.append(h('div',{class:'row-wrap'},
    h('button',{class:'btn btn-primary',onclick:()=>openCheckin(id)}, icon('check',18),'Einchecken'),
    h('button',{class:'btn btn-ghost','aria-pressed':String(wished),onclick:()=>toggleWish(id)}, icon('bookmark',17), wished?'Auf der Merkliste':'Merken'),
    h('button',{class:'btn btn-quiet',onclick:()=>openDrinkForm({drinkId:id})}, icon('pencil',17),'Bearbeiten')));
  if(d.note) col.append(h('p',{class:'muted'}, d.note));

  if(s.rated){
    const hp = h('section',{class:'panel'}, h('h3',null,'Bewertungen'));
    const box = h('div',{class:'row',style:'gap:14px;align-items:center;margin-bottom:14px'}, caps(s.avg,26), h('span',null, h('span',{class:'h-display',style:'font-size:26px'},fmtR(s.avg)), h('span',{class:'faint small'},' aus ', plural(s.rated,'Bewertung','Bewertungen'))));
    const hist = h('div',{class:'hist'}); const max = Math.max(...s.hist,1);
    for(let i=4;i>=0;i--) hist.append(h('div',{class:'hist-row'}, h('span',{class:'k'}, String(i+1), miniCap(12)), h('span',{class:'bar'}, h('i',{style:`width:${(s.hist[i]/max*100).toFixed(1)}%`})), h('span',{class:'num faint'}, fmtN(s.hist[i]))));
    hp.append(box, hist); col.append(hp);
  }
  if(s.photos.length){
    const ph = h('section',{class:'panel'}, h('h3',null,'Fotos'));
    const strip = h('div',{class:'photos'});
    s.photos.slice(0,20).forEach(c=>{ const img = h('img',{src:photoUrl(c.photoId),alt:'Foto von '+d.name,loading:'lazy'}); img.addEventListener('error',()=>img.parentNode && img.parentNode.remove()); strip.append(h('button',{onclick:()=>openPhoto(c.photoId,'Foto von '+d.name)}, img)); });
    ph.append(strip); col.append(ph);
  }
  const bp = h('section',{class:'panel'}, h('h3',null,'Barcodes'));
  const codes = (d.barcodes||[]);
  if(codes.length) bp.append(h('div',{class:'codes'}, codes.map(c=>h('span',{class:'code'}, icon('barcode',16), h('span',{class:'mono'}, fmtEAN(c))))));
  else bp.append(h('p',{class:'muted small'},'Für diesen Drink ist noch kein Barcode hinterlegt. Wer ihn zuerst scannt, verknüpft ihn für alle.'));
  bp.append(h('button',{class:'btn btn-ghost btn-sm',style:'margin-top:12px',onclick:()=>openScan('assign', id)}, icon('plus',16),'Barcode hinzufügen'));
  col.append(bp);

  col.append(h('h2',{class:'h-section'}, 'Check-ins'));
  const list = S.checkins.filter(c=>c.drinkId===id);
  if(list.length){ const st = h('div',{class:'stack'}); list.slice(0,50).forEach(c=>st.append(checkinCard(c,P))); col.append(st); }
  else col.append(emptyState(null, 'Noch niemand hat den probiert', 'Sei die erste Person, die ihn bewertet.', h('button',{class:'btn btn-primary',onclick:()=>openCheckin(id)}, icon('check',18),'Einchecken')));
  return col;
}
async function toggleWish(id){
  const on = S.wishlist.includes(id);
  S.wishlist = on ? S.wishlist.filter(x=>x!==id) : [id, ...S.wishlist]; render();
  await act(()=>api(on?'DELETE':'PUT','/api/wishlist/'+encodeURIComponent(id)), on ? 'Von der Merkliste genommen.' : 'Auf deine Merkliste gesetzt.');
}

/* ---------- brand ---------- */
function viewBrand(P, brand){
  const col = h('div',{class:'col'}, backbar());
  const drinks = [...S.drinks.values()].filter(d=>d.brand===brand).sort((a,b)=>dstat(b.id).n-dstat(a.id).n || a.name.localeCompare(b.name,'de'));
  let n=0, rated=0, sum=0; const users = new Set();
  for(const d of drinks){ const s = dstat(d.id); n+=s.n; rated+=s.rated; sum+=s.sum; s.users.forEach(u=>users.add(u)); }
  col.append(h('header',{class:'dhead'}, h('span',{class:'dl',style:'--dl:84px;--cc:var(--glass)','aria-hidden':'true'}, initials(brand)),
    h('div',{style:'min-width:0;display:flex;flex-direction:column;gap:6px'}, h('span',{class:'h-section'},'Hersteller'), h('h1',{class:'h-page'}, brand))));
  col.append(h('div',{class:'stats'},
    h('div',{class:'stat'}, h('b',null, rated?fmtR(sum/rated):'–'), h('span',null,'Ø Kronkorken')),
    h('div',{class:'stat'}, h('b',null, fmtN(drinks.length)), h('span',null,'Drinks')),
    h('div',{class:'stat'}, h('b',null, fmtN(n)), h('span',null,'Check-ins')),
    h('div',{class:'stat'}, h('b',null, fmtN(users.size)), h('span',null,'Leute'))));
  if(drinks.length){ const l = h('div',{class:'list'}); drinks.forEach(d=>l.append(drinkRow(d, ()=>go('drink',{id:d.id})))); col.append(l); }
  return col;
}

/* ---------- top ---------- */
function viewTop(P){
  const col = h('div',{class:'col'});
  col.append(h('h1',{class:'h-page'},'Bestenliste'));
  col.append(h('div',{class:'section-head'}, segmented([['rated','Bestbewertet'],['most','Meistgetrunken'],['people','Durstigste']], S.topTab, v=>{ S.topTab=v; render(); })));
  if(S.topTab!=='people') col.append(h('div',{class:'chips',role:'group','aria-label':'Kategorie'},
    h('button',{class:'chip','aria-pressed':String(!S.topCat),onclick:()=>{ S.topCat=''; render(); }},'Alle'),
    CATS.map(c=>h('button',{class:'chip','aria-pressed':String(S.topCat===c.id),style:`--cc:${c.color}`,onclick:()=>{ S.topCat = S.topCat===c.id?'':c.id; render(); }}, h('span',{class:'dot'}), c.name))));
  if(!S.loaded){ col.append(skeletons(2)); return col; }
  if(S.topTab==='people'){
    const m = new Map();
    for(const c of S.checkins) m.set(c.userId, (m.get(c.userId)||0)+1);
    const rows = [...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,50);
    if(!rows.length){ col.append(emptyState(null,'Noch niemand dabei','Wer eincheckt, taucht hier auf.')); return col; }
    const l = h('div',{class:'list'});
    rows.forEach(([uid,n],i)=>{ const st = userStats(uid, S.checkins);
      l.append(h('button',{class:'li',onclick:()=>go('user',{uid})}, h('span',{class:'row',style:'gap:10px'}, h('span',{class:'rank'+(i<3?' top':'')},String(i+1)), avatar(uid,P,40)),
        h('span',{style:'min-width:0'}, h('span',{class:'li-t',style:'display:block'}, nameOf(uid,P)), h('span',{class:'li-s',style:'display:block'}, `${plural(st.unique.size,'Drink','Drinks')} · ${plural(earned(st).length,'Abzeichen','Abzeichen')}`)),
        h('span',{class:'li-r'}, h('strong',{class:'num',style:'color:var(--ink);font-size:15px'},fmtN(n)), h('span',null,'Check-ins')))); });
    col.append(l); return col;
  }
  let arr = [...S.drinks.values()].filter(d=>!S.topCat || d.category===S.topCat).map(d=>({d, s:dstat(d.id)}));
  if(S.topTab==='rated') arr = arr.filter(x=>x.s.rated>0).sort((a,b)=>b.s.avg-a.s.avg || b.s.rated-a.s.rated);
  else arr = arr.filter(x=>x.s.n>0).sort((a,b)=>b.s.n-a.s.n || b.s.avg-a.s.avg);
  arr = arr.slice(0,50);
  if(!arr.length){ col.append(emptyState(null,'Noch keine Liste', S.topTab==='rated' ? 'Sobald Drinks bewertet werden, entsteht hier die Rangliste.' : 'Sobald eingecheckt wird, entsteht hier die Rangliste.')); return col; }
  const l = h('div',{class:'list'});
  arr.forEach(({d,s},i)=>{
    const right = S.topTab==='rated'
      ? h('span',{class:'li-r'}, h('span',{class:'rating-line',style:'gap:5px'}, caps(s.avg,13), h('span',{class:'rating-num',style:'color:var(--ink)'},fmtR(s.avg))), h('span',null, plural(s.rated,'Bewertung','Bewertungen')))
      : h('span',{class:'li-r'}, h('strong',{class:'num',style:'color:var(--ink);font-size:15px'},fmtN(s.n)), h('span',null, plural(s.users.size,'Person','Leute')));
    const row = drinkRow(d, ()=>go('drink',{id:d.id}), right);
    row.prepend(h('span',{class:'rank'+(i<3?' top':'')},String(i+1)));
    row.style.gridTemplateColumns = 'auto auto minmax(0,1fr) auto';
    l.append(row);
  });
  col.append(l);
  if(S.topTab==='rated') col.append(h('p',{class:'faint small'},'Sortiert nach Durchschnitt aller Bewertungen. Bei Gleichstand zählt die Zahl der Bewertungen.'));
  return col;
}

/* ---------- profile ---------- */
function viewUser(P, uid){
  const col = h('div',{class:'col'});
  if(S.route.name==='user') col.append(backbar());
  const u = S.users.get(uid);
  if(!u){ col.append(emptyState(null,'Profil nicht gefunden','Dieses Konto gibt es nicht mehr.')); return col; }
  const isMe = uid===S.uid;
  const list = S.checkins.filter(c=>c.userId===uid);
  const st = userStats(uid, S.checkins);
  const got = new Set(earned(st));
  col.append(h('header',{class:'prof',style:`--pc:${u.color}`}, avatar(uid,P,76),
    h('div',{style:'min-width:0;display:flex;flex-direction:column;gap:4px'},
      h('h1',{class:'h-page',style:'overflow-wrap:anywhere'}, u.displayName),
      h('p',{class:'muted small'}, '@'+u.username, ' · ', st.first ? `zischt seit ${new Date(st.first).toLocaleDateString('de-DE',{month:'long',year:'numeric'})}` : 'noch kein Check-in'),
      u.isAdmin ? h('span',{class:'admin-tag'},'Admin') : null)));
  if(isMe) col.append(h('div',{class:'prof-actions'},
    h('button',{class:'btn btn-ghost btn-sm',onclick:openSettings}, icon('pencil',16),'Profil bearbeiten'),
    h('button',{class:'btn btn-quiet btn-sm',onclick:logout}, icon('logout',16),'Abmelden')));
  col.append(h('div',{class:'stats'},
    h('div',{class:'stat'}, h('b',null,fmtN(st.total)), h('span',null,'Check-ins')),
    h('div',{class:'stat'}, h('b',null,fmtN(st.unique.size)), h('span',null,'Drinks')),
    h('div',{class:'stat'}, h('b',null,fmtN(got.size)), h('span',null,'Abzeichen')),
    h('div',{class:'stat'}, h('b',null,fmtN(st.photos)), h('span',null,'Fotos'))));
  const tabs = [['activity','Aktivität'],['badges','Abzeichen'],['favs','Lieblinge']]; if(isMe) tabs.push(['wish','Merkliste']);
  if(!tabs.some(t=>t[0]===S.profTab)) S.profTab='activity';
  col.append(h('div',{style:'overflow-x:auto'}, segmented(tabs, S.profTab, v=>{ S.profTab=v; render(); })));

  if(S.profTab==='activity'){
    if(list.length){ const s2 = h('div',{class:'stack'}); list.slice(0,50).forEach(c=>s2.append(checkinCard(c,P))); col.append(s2); }
    else col.append(emptyState(BADGE['erster-schluck'], isMe?'Dein Feed ist noch leer':'Noch nichts eingecheckt', isMe?'Scann eine Flasche und check deinen ersten Drink ein.':'Sobald hier eingecheckt wird, siehst du es.', isMe?h('button',{class:'btn btn-primary',onclick:()=>openScan('checkin')}, icon('barcode',18),'Barcode scannen'):null));
  } else if(S.profTab==='badges'){
    const g = h('div',{class:'badges'});
    const sorted = [...BADGES].sort((a,b)=>(got.has(b.id)?1:0)-(got.has(a.id)?1:0));
    for(const b of sorted){
      const on = got.has(b.id); const v = Math.min(b.val(st), b.goal);
      g.append(h('div',{class:'badge'+(on?'':' locked')}, bcap(b,64,on), h('b',null,b.name), h('small',null,b.desc),
        !on && b.goal>1 ? h('span',{class:'prog','aria-label':`${v} von ${b.goal}`}, h('i',{style:`width:${(v/b.goal*100).toFixed(0)}%`})) : null,
        !on && b.goal>1 ? h('small',{class:'num'},`${fmtN(v)} / ${fmtN(b.goal)}`) : null));
    }
    col.append(h('p',{class:'muted small'}, `${fmtN(got.size)} von ${fmtN(BADGES.length)} Abzeichen freigeschaltet.`), g);
  } else if(S.profTab==='favs'){
    const m = new Map();
    for(const c of list) if(c.rating){ const x = m.get(c.drinkId) || {sum:0,n:0}; x.sum+=c.rating; x.n++; m.set(c.drinkId,x); }
    const arr = [...m.entries()].map(([id,x])=>({d:S.drinks.get(id), avg:x.sum/x.n, n:x.n})).filter(x=>x.d).sort((a,b)=>b.avg-a.avg || b.n-a.n).slice(0,30);
    if(arr.length){ const l = h('div',{class:'list'}); arr.forEach(x=>l.append(drinkRow(x.d, ()=>go('drink',{id:x.d.id}), h('span',{class:'li-r'}, h('span',{class:'rating-line',style:'gap:5px'}, caps(x.avg,13), h('span',{class:'rating-num',style:'color:var(--ink)'},fmtR(x.avg))), h('span',null, x.n>1?`${x.n}× bewertet`:'1× bewertet'))))); col.append(l); }
    else col.append(emptyState(null,'Noch keine Lieblinge','Hier landen die am besten bewerteten Drinks.'));
  } else if(S.profTab==='wish'){
    const arr = S.wishlist.map(id=>S.drinks.get(id)).filter(Boolean);
    if(arr.length){ const l = h('div',{class:'list'}); arr.forEach(d=>l.append(drinkRow(d, ()=>go('drink',{id:d.id})))); col.append(l); }
    else col.append(emptyState(null,'Merkliste ist leer','Tipp auf einer Drink-Seite auf „Merken“, um ihn für später vorzumerken. Nur du siehst diese Liste.'));
  }
  return col;
}
async function logout(){
  try { await api('POST','/api/logout'); } catch(e){}
  S.me = null; S.uid = null; S.loaded = false; S.route = {name:'feed'}; S.stack = []; S.authTab = 'login';
  render();
}
function openSettings(){
  const me = S.users.get(S.uid);
  let avatarId = me.avatarId || null, preview = null, busy = false;
  openSheet(sh=>{
    const f = h('form',{style:'display:flex;flex-direction:column;gap:16px',novalidate:true});
    f.append(sheetHead('Profil bearbeiten', sh));
    const avBox = h('div',{class:'avatar-edit'});
    const avIn = h('input',{type:'file',accept:'image/*',hidden:true,id:'av-file'});
    const paintAv = ()=>{
      const src = preview || (avatarId ? photoUrl(avatarId) : initialsAvatar(me.displayName, me.color));
      avBox.replaceChildren(h('img',{class:'av',src,alt:'Profilbild',width:72,height:72,style:'width:72px;height:72px'}),
        h('div',{class:'row-wrap'},
          h('button',{type:'button',class:'btn btn-ghost btn-sm',onclick:()=>avIn.click()}, icon('camera',16), avatarId?'Anderes Bild':'Bild wählen'),
          avatarId ? h('button',{type:'button',class:'btn btn-quiet btn-sm',onclick:()=>{ avatarId=null; preview=null; paintAv(); }}, icon('trash',16),'Entfernen') : null));
    };
    avIn.addEventListener('change', async ()=>{
      const file = avIn.files && avIn.files[0]; avIn.value=''; if(!file) return;
      try {
        busy = true; save.disabled = true;
        const blob = await shrinkPhoto(file, 400, true);
        const r = await api('POST','/api/uploads', blob);
        avatarId = r.id; preview = URL.createObjectURL(blob); paintAv();
      } catch(e){ snack(e.message || 'Das Bild ließ sich nicht hochladen.'); }
      finally { busy = false; save.disabled = false; }
    });
    paintAv();
    const dn = h('input',{class:'input',id:'set-name',maxlength:'40',value:me.displayName});
    const cur = h('input',{class:'input',id:'set-cur',type:'password',autocomplete:'current-password'});
    const np = h('input',{class:'input',id:'set-new',type:'password',autocomplete:'new-password'});
    const err = h('p',{class:'err',hidden:true,role:'alert'});
    const save = h('button',{class:'btn btn-primary btn-block',type:'submit'}, icon('check',18),'Speichern');
    f.append(h('div',{class:'field'}, h('span',{class:'lbl'},'Profilbild'), avBox, avIn),
      h('div',{class:'field'}, h('label',{for:'set-name'},'Anzeigename'), dn),
      h('div',{class:'field'}, h('span',{class:'lbl'},'Passwort ändern (optional)'),
        h('label',{for:'set-cur',class:'hint'},'Aktuelles Passwort'), cur, h('label',{for:'set-new',class:'hint'},'Neues Passwort, mindestens 8 Zeichen'), np),
      err, save);
    f.addEventListener('submit', async e=>{
      e.preventDefault(); if(busy) return; err.hidden = true;
      const body = {displayName: dn.value.trim(), avatarId};
      if(np.value){ if(np.value.length<8){ err.hidden=false; err.textContent='Das neue Passwort braucht mindestens 8 Zeichen.'; return; } body.currentPassword = cur.value; body.newPassword = np.value; }
      save.disabled = true;
      try { await api('PATCH','/api/me', body); await refresh(); sh.close(); snack('Profil gespeichert.'); }
      catch(ex){ err.hidden=false; err.textContent=ex.message; save.disabled=false; }
    });
    return f;
  }, {label:'Profil bearbeiten'});
}

/* ================= sheets ================= */
let prevFocus = null, sheetOnClose = null;
function openSheet(build, o={}){
  closeSheet(true);
  const scrim = h('div',{class:'sheet-scrim'});
  const sheet = h('div',{class:'sheet'+(o.wide?' sheet-wide':''),role:'dialog','aria-modal':'true','aria-label':o.label||'Dialog'});
  scrim.addEventListener('click', e=>{ if(e.target===scrim) closeSheet(); });
  scrim.append(sheet);
  const api_ = { el:sheet, close:()=>closeSheet(), onClose:fn=>{ sheetOnClose = fn; } };
  prevFocus = document.activeElement;
  sheetRoot.append(scrim);
  document.body.classList.add('noscroll');
  sheet.append(build(api_));
  setTimeout(()=>{ const f = sheet.querySelector('[data-autofocus]') || sheet.querySelector('button,input,textarea,select'); if(f) f.focus({preventScroll:true}); }, 40);
  return api_;
}
function closeSheet(silent){
  if(sheetOnClose){ const fn = sheetOnClose; sheetOnClose = null; try { fn(); } catch(e){} }
  if(!sheetRoot.firstChild) return;
  sheetRoot.replaceChildren();
  document.body.classList.remove('noscroll');
  if(!silent && prevFocus && document.contains(prevFocus)) try{ prevFocus.focus({preventScroll:true}); }catch(e){}
  if(pendingRender && !isTyping()){ pendingRender=false; render(); }
}
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && sheetRoot.firstChild) closeSheet(); });
function sheetHead(title, sh){
  return h('div',{class:'sh-head'}, h('h2',null,title), h('button',{class:'x',type:'button',onclick:sh.close,'aria-label':'Schließen'}, icon('x',20)));
}
function openPhoto(id, alt){
  openSheet(sh=>h('div',{style:'position:relative'},
    h('img',{src:photoUrl(id), alt:alt||'Foto'}),
    h('button',{class:'x',style:'position:absolute;top:8px;right:8px',onclick:sh.close,'aria-label':'Schließen'}, icon('x',20))), {wide:true, label:'Foto'});
}

/* ---------- image helpers ---------- */
async function loadBitmap(file){
  if(window.createImageBitmap){ try { return await createImageBitmap(file, {imageOrientation:'from-image'}); } catch(e){} }
  return await new Promise((res,rej)=>{ const url = URL.createObjectURL(file); const img = new Image(); img.onload=()=>res(img); img.onerror=()=>rej(new Error('Bild konnte nicht geladen werden')); img.src = url; });
}
const bw = b => b.width || b.naturalWidth; const bh = b => b.height || b.naturalHeight;
async function shrinkPhoto(file, max=1600, square=false){
  const bmp = await loadBitmap(file);
  let sx=0, sy=0, sw=bw(bmp), sh=bh(bmp);
  if(square){ const m = Math.min(sw,sh); sx = (sw-m)/2; sy = (sh-m)/2; sw = sh = m; }
  const sc = Math.min(1, max/Math.max(sw,sh));
  const cv = document.createElement('canvas'); cv.width = Math.round(sw*sc); cv.height = Math.round(sh*sc);
  const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0,0,cv.width,cv.height);
  g.drawImage(bmp, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
  return await new Promise((res,rej)=>cv.toBlob(b=>b?res(b):rej(new Error('toBlob')), 'image/jpeg', 0.84));
}

/* ---------- barcode reading ---------- */
let zxingPromise = null;
function loadZXing(){
  if(window.ZXing) return Promise.resolve(window.ZXing);
  if(zxingPromise) return zxingPromise;
  const urls = ['/vendor/zxing.min.js','https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js'];
  zxingPromise = new Promise((res,rej)=>{
    let i = 0;
    const tryNext = ()=>{
      if(i>=urls.length){ zxingPromise=null; return rej(new Error('Der Barcode-Leser konnte nicht geladen werden.')); }
      const s = document.createElement('script'); s.src = urls[i++]; s.async = true;
      s.onload = ()=> window.ZXing ? res(window.ZXing) : tryNext();
      s.onerror = tryNext;
      document.head.append(s);
    };
    tryNext();
  });
  return zxingPromise;
}
async function makeZxReader(tryHarder){
  const Z = await loadZXing();
  const hints = new Map();
  hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.UPC_E]);
  if(tryHarder) hints.set(Z.DecodeHintType.TRY_HARDER, true);
  const reader = new Z.MultiFormatReader(); reader.setHints(hints);
  return canvas => {
    let src; try { src = new Z.HTMLCanvasElementLuminanceSource(canvas); } catch(e){ return null; }
    for(const Bin of [Z.HybridBinarizer, Z.GlobalHistogramBinarizer]){
      try { const r = reader.decode(new Z.BinaryBitmap(new Bin(src))); if(r) return r.getText(); } catch(e){}
    }
    return null;
  };
}
async function nativeDetector(){
  if(!('BarcodeDetector' in window)) return null;
  try {
    const sup = await window.BarcodeDetector.getSupportedFormats();
    const want = ['ean_13','ean_8','upc_a','upc_e'].filter(f=>sup.includes(f));
    return want.length ? new window.BarcodeDetector({formats:want}) : null;
  } catch(e){ return null; }
}
function drawVariant(bmp, {max, rot=0, crop=1}){
  const W = bw(bmp), H = bh(bmp);
  const cw = W*crop, ch = H*crop, sx = (W-cw)/2, sy = (H-ch)/2;
  const sc = Math.min(1.5, max/Math.max(cw,ch));
  const w = Math.round(cw*sc), hh = Math.round(ch*sc);
  const cv = document.createElement('canvas');
  const r90 = rot===90;
  cv.width = r90 ? hh : w; cv.height = r90 ? w : hh;
  const g = cv.getContext('2d', {willReadFrequently:true});
  if(r90){ g.translate(cv.width,0); g.rotate(Math.PI/2); }
  g.drawImage(bmp, sx, sy, cw, ch, 0, 0, w, hh);
  return cv;
}
async function decodeFromPhoto(file){
  const bmp = await loadBitmap(file);
  const det = await nativeDetector();
  if(det){ try { const r = await det.detect(bmp); if(r && r.length) return r[0].rawValue; } catch(e){} }
  const read = await makeZxReader(true);
  const variants = [{max:1280},{max:1280,rot:90},{max:900},{max:1280,crop:.6},{max:1800},{max:1280,crop:.6,rot:90},{max:640}];
  for(const v of variants){
    const t = read(drawVariant(bmp, v)); if(t) return t;
    await new Promise(r=>setTimeout(r,0));
  }
  return null;
}
const liveCameraPossible = () => !!(window.isSecureContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

function startLiveScan(video, {onCode, onError, onReady}){
  let stream = null, stopped = false, timer = null, det = null, zx = null, track = null;
  const canvas = document.createElement('canvas');
  (async ()=>{
    try {
      stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}, width:{ideal:1280}, height:{ideal:720}}, audio:false});
    } catch(e){ onError(e); return; }
    if(stopped){ stream.getTracks().forEach(t=>t.stop()); return; }
    track = stream.getVideoTracks()[0];
    video.srcObject = stream; video.muted = true; video.setAttribute('playsinline',''); video.setAttribute('muted','');
    try { await video.play(); } catch(e){}
    det = await nativeDetector();
    if(!det){ try { zx = await makeZxReader(false); } catch(e){ onError(e); return; } }
    let torch = false;
    try { torch = !!(track.getCapabilities && track.getCapabilities().torch); } catch(e){}
    onReady({ torch: torch ? (on => track.applyConstraints({advanced:[{torch:on}]}).catch(()=>{})) : null });
    loop();
  })();
  async function loop(){
    if(stopped) return;
    if(video.readyState >= 2 && video.videoWidth){
      try {
        let code = null;
        if(det){ const r = await det.detect(video); if(r && r.length) code = r[0].rawValue; }
        else {
          const vw = video.videoWidth, vh = video.videoHeight;
          const ch = Math.round(vh*0.55), sy = Math.round((vh-ch)/2);
          const sc = Math.min(1, 960/vw);
          canvas.width = Math.round(vw*sc); canvas.height = Math.round(ch*sc);
          canvas.getContext('2d',{willReadFrequently:true}).drawImage(video, 0, sy, vw, ch, 0, 0, canvas.width, canvas.height);
          code = zx(canvas);
        }
        if(code){ const n = normEAN(code); if(eanValid(n)){ if(navigator.vibrate) navigator.vibrate(60); stop(); onCode(n); return; } }
      } catch(e){}
    }
    if(!stopped) timer = setTimeout(loop, det ? 120 : 200);
  }
  function stop(){ stopped = true; clearTimeout(timer); if(stream) stream.getTracks().forEach(t=>t.stop()); try { video.srcObject = null; } catch(e){} }
  return stop;
}

/* ---------- scan sheet ---------- */
function openScan(mode, targetId){
  openSheet(sh=>{
    const wrap = h('div',{style:'display:flex;flex-direction:column;gap:16px'});
    const target = targetId ? S.drinks.get(targetId) : null;
    wrap.append(sheetHead(mode==='assign' ? 'Barcode hinzufügen' : 'Barcode scannen', sh));
    if(target) wrap.append(h('div',{class:'sh-drink'}, drinkLabel(target,40), h('div',null, h('div',{style:'font-weight:700'},target.name), h('div',{class:'muted small'},target.brand))));
    const status = h('p',{class:'scan-status',role:'status'});
    const fileIn = h('input',{type:'file',accept:'image/*',capture:'environment',hidden:true,id:'scan-file'});
    fileIn.addEventListener('change', ()=>{ const f = fileIn.files && fileIn.files[0]; fileIn.value=''; if(f) handleFile(f); });
    const top = h('div',{style:'display:flex;flex-direction:column;gap:10px'});
    const lower = h('div',{style:'display:flex;flex-direction:column;gap:14px'});
    let stopCam = null;
    sh.onClose(()=>{ if(stopCam) stopCam(); });

    function showPhotoZone(note){
      const zone = h('button',{class:'scan-zone',type:'button',onclick:()=>fileIn.click()}, icon('barcode',42,1.6), h('strong',null,'Foto vom Barcode machen'), h('span',null, note || 'Am Handy öffnet sich die Kamera. Am Rechner wählst du ein Bild aus oder ziehst es hierher.'));
      zone.addEventListener('dragover', e=>{ e.preventDefault(); zone.classList.add('drag'); });
      zone.addEventListener('dragleave', ()=>zone.classList.remove('drag'));
      zone.addEventListener('drop', e=>{ e.preventDefault(); zone.classList.remove('drag'); const f = e.dataTransfer.files && e.dataTransfer.files[0]; if(f) handleFile(f); });
      top.replaceChildren(zone);
    }
    function showLive(){
      const video = h('video',{autoplay:true,playsinline:true,muted:true,'aria-label':'Kamerabild'});
      const msg = h('span',{class:'vf-msg'},'Kamera startet …');
      const vf = h('div',{class:'viewfinder'}, video, h('span',{class:'frame','aria-hidden':'true'}), h('span',{class:'laser','aria-hidden':'true'}), msg);
      top.replaceChildren(vf, h('button',{class:'btn btn-ghost btn-sm',style:'align-self:center',type:'button',onclick:()=>fileIn.click()}, icon('camera',16),'Stattdessen Foto machen'));
      stopCam = startLiveScan(video, {
        onReady: ({torch})=>{
          msg.textContent = 'Halte den Barcode in den Rahmen';
          if(torch){ let on=false; const tb = h('button',{class:'torch',type:'button','aria-pressed':'false',onclick:()=>{ on=!on; tb.setAttribute('aria-pressed',String(on)); torch(on); }}, icon('bolt',15),' Licht'); vf.append(tb); }
        },
        onCode: code=>{ stopCam = null; resolve(code); },
        onError: e=>{
          stopCam = null;
          const denied = e && (e.name==='NotAllowedError' || e.name==='SecurityError');
          showPhotoZone(denied ? 'Kamera-Zugriff wurde nicht erlaubt. Du kannst die Freigabe in den Browser-Einstellungen ändern oder ein Foto machen.' : 'Die Live-Kamera ist auf diesem Gerät nicht verfügbar. Mach einfach ein Foto vom Barcode.');
        },
      });
    }
    if(liveCameraPossible()) showLive(); else showPhotoZone();

    const manual = h('input',{class:'input mono',id:'ean-input',inputmode:'numeric',autocomplete:'off',placeholder:'z. B. 4 012345 678901','aria-label':'Barcode-Nummer'});
    const manErr = h('p',{class:'err',hidden:true});
    const manForm = h('form',{class:'row',onsubmit:e=>{ e.preventDefault(); const code = normEAN(manual.value); if(!eanValid(code)){ manErr.hidden=false; manErr.textContent = /^\d{8}$|^\d{13}$/.test(code) ? 'Die Prüfziffer passt nicht. Schau nochmal auf die Zahlen unter den Strichen.' : 'Ein Barcode hat 8 oder 13 Ziffern (bei US-Codes 12).'; return; } manErr.hidden=true; if(stopCam){ stopCam(); stopCam=null; } resolve(code); }}, manual, h('button',{class:'btn btn-primary',type:'submit',style:'flex:none'},'Los'));
    wrap.append(top, fileIn, status, h('div',{class:'or'},'oder Nummer eintippen'), h('div',{style:'display:flex;flex-direction:column;gap:6px'}, manForm, manErr), lower);
    if(mode!=='assign'){
      lower.append(h('div',{class:'or'},'oder ohne Barcode'));
      lower.append(drinkPicker('Drink suchen …', d=>{ sh.close(); openCheckin(d.id); }));
    }

    async function handleFile(f){
      if(stopCam){ stopCam(); stopCam=null; showPhotoZone(); }
      status.className='scan-status busy'; status.textContent='Barcode wird gelesen …';
      let code = null;
      try { code = await decodeFromPhoto(f); }
      catch(e){ status.className='scan-status err'; status.textContent = 'Der Barcode-Leser ließ sich nicht laden. Tipp die Nummer unter den Strichen einfach ein.'; return; }
      if(!code){ status.className='scan-status err'; status.textContent='Kein Barcode erkannt. Fotografier die Striche gerade, scharf und bildfüllend, oder tipp die Nummer ein.'; return; }
      status.className='scan-status'; status.textContent='';
      resolve(normEAN(code));
    }
    async function resolve(code){
      const hit = findByBarcode(code);
      if(mode==='assign'){
        if(hit && hit.id===targetId){ snack('Der Barcode ist schon hinterlegt.'); sh.close(); return; }
        if(hit){ status.className='scan-status err'; status.textContent = `${fmtEAN(code)} gehört schon zu ${hit.name}.`; if(liveCameraPossible()) showLive(); return; }
        const ok = await act(()=>api('POST','/api/drinks/'+encodeURIComponent(targetId)+'/barcodes',{code}), 'Barcode gespeichert. Ab jetzt findet der Scan diesen Drink.');
        if(ok) sh.close();
        return;
      }
      if(hit){ sh.close(); openCheckin(hit.id, {barcode:code}); return; }
      showUnknown(code);
    }
    async function showUnknown(code){
      top.replaceChildren(h('div',{class:'unknown'}, h('div',{class:'row',style:'justify-content:space-between;flex-wrap:wrap'}, h('strong',null,'Neuer Barcode'), h('span',{class:'mono'}, fmtEAN(code))), h('p',{class:'muted small'},'Schaue bei Open Food Facts nach …')));
      lower.replaceChildren();
      let off = {found:false};
      try { off = await api('GET','/api/lookup/'+code); } catch(e){ off = {found:false, error:e.message}; }
      if(off.local){ await refresh().catch(()=>{}); const d = S.drinks.get(off.local); if(d){ sh.close(); openCheckin(d.id,{barcode:code}); return; } }
      const box = h('div',{class:'unknown'}, h('div',{class:'row',style:'justify-content:space-between;flex-wrap:wrap'}, h('strong',null,'Neuer Barcode'), h('span',{class:'mono'}, fmtEAN(code))));
      if(off.found){
        box.append(h('div',{class:'off-card'},
          h('span',{class:'off-img'}, off.imageUrl ? h('img',{src:off.imageUrl,alt:'',referrerpolicy:'no-referrer'}) : drinkLabel({name:off.name, category:off.category},64)),
          h('div',{style:'min-width:0'}, h('div',{style:'font-weight:800'}, off.name), h('div',{class:'muted small'}, [off.brand, off.quantity].filter(Boolean).join(' · ')), h('div',{style:'margin-top:4px'}, catTag(off.category)))),
          h('p',{class:'muted small'},'Gefunden bei Open Food Facts. Bei Zisch gibt es diesen Drink noch nicht.'),
          h('button',{class:'btn btn-primary',onclick:()=>{ sh.close(); openDrinkForm({prefill:off, barcode:code, thenCheckin:true}); }}, icon('check',18),'Übernehmen und einchecken'));
        const similar = searchMatches(off.name,'',false).slice(0,3);
        if(similar.length){
          box.append(h('p',{class:'small',style:'font-weight:700;margin-top:4px'},'Oder ist es einer von diesen?'));
          const l = h('div',{class:'list'}); similar.forEach(d=>l.append(drinkRow(d, ()=>assignAndCheckin(d), h('span',{class:'li-r'}, icon('check',18))))); box.append(l);
        }
      } else {
        box.append(h('p',{class:'muted small'}, off.error ? off.error+' Ordne den Barcode selbst zu.' : 'Den kennt noch niemand. Welcher Drink ist das? Einmal zugeordnet, findet ihn der Scan für alle.'));
      }
      box.append(h('p',{class:'small',style:'font-weight:700;margin-top:4px'}, off.found ? 'Anderen Drink suchen' : 'Vorhandenen Drink suchen'));
      box.append(drinkPicker('Passenden Drink suchen …', assignAndCheckin));
      box.append(h('button',{class:off.found?'btn btn-quiet':'btn btn-ghost',onclick:()=>{ sh.close(); openDrinkForm({barcode:code, thenCheckin:true}); }}, icon('plus',18),'Selbst neu anlegen'));
      top.replaceChildren(box);
      async function assignAndCheckin(d){
        const ok = await act(()=>api('POST','/api/drinks/'+encodeURIComponent(d.id)+'/barcodes',{code}), `Barcode mit ${d.name} verknüpft.`);
        if(ok){ sh.close(); openCheckin(d.id, {barcode:code}); }
      }
    }
    return wrap;
  }, {label:'Barcode scannen'});
}
function drinkPicker(placeholder, onPick){
  const box = h('div',{style:'display:flex;flex-direction:column;gap:8px'});
  const inp = h('input',{class:'input',type:'search',placeholder,'aria-label':placeholder,autocomplete:'off'});
  const res = h('div',{class:'list'}); res.hidden = true;
  inp.addEventListener('input', ()=>{
    const q = inp.value.trim(); res.replaceChildren();
    if(q.length<1){ res.hidden = true; return; }
    const arr = searchMatches(q,'',false).slice(0,6);
    res.hidden = false;
    if(!arr.length){ res.append(h('p',{class:'muted small',style:'padding:12px 14px'},'Kein Treffer.')); return; }
    arr.forEach(d=>res.append(drinkRow(d, ()=>onPick(d), h('span',{class:'li-r'}, icon('check',18)))));
  });
  box.append(inp, res);
  return box;
}

/* ---------- check-in composer ---------- */
function openCheckin(drinkId, o={}){
  const d = S.drinks.get(drinkId); if(!d) return;
  const editing = o.editId ? S.checkins.find(c=>c.id===o.editId) : null;
  let rating = editing ? (editing.rating||0) : 0;
  let serving = editing ? (editing.serving||'') : '';
  let photoBlob = null, photoPreview = null, keepPhoto = editing ? editing.photoId||null : null;

  openSheet(sh=>{
    const wrap = h('form',{style:'display:flex;flex-direction:column;gap:18px',novalidate:true});
    wrap.append(sheetHead(editing ? 'Check-in bearbeiten' : 'Einchecken', sh));
    wrap.append(h('div',{class:'sh-drink'}, drinkLabel(d,52), h('div',{style:'min-width:0'}, h('div',{style:'font-weight:800;font-size:17px'}, d.name), h('div',{class:'muted small'}, [d.brand, catOf(d.category).name].filter(Boolean).join(' · ')), o.barcode ? h('div',{class:'faint small mono'}, 'Per Barcode ', fmtEAN(o.barcode)) : null)));

    const val = h('span',{class:'rate-val'});
    const capsBox = h('div',{class:'rate-caps'});
    const range = h('input',{type:'range',min:'0',max:'5',step:'0.25',id:'ci-rating','aria-label':'Bewertung in Kronkorken, Viertelschritte'});
    const paint = ()=>{
      range.value = String(rating);
      val.textContent = rating ? fmtR(rating) : 'Noch keine Bewertung';
      val.className = 'rate-val' + (rating ? '' : ' none');
      capsBox.replaceChildren();
      for(let i=0;i<5;i++){
        const f = Math.max(0, Math.min(1, rating-i));
        const b = h('button',{type:'button','aria-label':`${i+1} Kronkorken`,onclick:()=>{ rating = (rating===i+1) ? 0 : i+1; paint(); }});
        const c = h('span',{class:'cap',style:'--cs:40px'}); c.innerHTML = CAP_SVG('e') + `<span class="f" style="width:${(f*100).toFixed(1)}%">${CAP_SVG('')}</span>`;
        b.append(c); capsBox.append(b);
      }
    };
    range.addEventListener('input', ()=>{ rating = Number(range.value); paint(); });
    paint();
    wrap.append(h('div',{class:'rate'}, h('div',{class:'rate-top'}, h('span',{style:'font-weight:700'},'Deine Bewertung'), val), capsBox, range, h('p',{class:'hint'},'Tipp auf einen Kronkorken oder schieb den Regler für Viertelschritte.')));

    const ta = h('textarea',{class:'textarea',id:'ci-comment',maxlength:'280',placeholder:'Wie schmeckt’s? Zu süß, zu wenig Kohlensäure, genau richtig?',value:editing?editing.comment||'':''});
    const cnt = h('span',{class:'hint num'});
    const upd = ()=>{ cnt.textContent = `${ta.value.length}/280`; }; ta.addEventListener('input', upd); upd();
    wrap.append(h('div',{class:'field'}, h('div',{class:'row',style:'justify-content:space-between'}, h('label',{for:'ci-comment'},'Kommentar'), cnt), ta));

    const phBox = h('div',{class:'photo-pick'});
    const phIn = h('input',{type:'file',accept:'image/*',hidden:true,id:'ci-photo'});
    const paintPhoto = ()=>{
      phBox.replaceChildren();
      const src = photoPreview || (keepPhoto ? photoUrl(keepPhoto) : null);
      if(src){
        phBox.append(h('img',{src,alt:'Ausgewähltes Foto'}), h('div',{class:'row-wrap'},
          h('button',{class:'btn btn-ghost btn-sm',type:'button',onclick:()=>phIn.click()}, icon('image',16),'Anderes Foto'),
          h('button',{class:'btn btn-quiet btn-sm',type:'button',onclick:()=>{ if(photoPreview) URL.revokeObjectURL(photoPreview); photoBlob=null; photoPreview=null; keepPhoto=null; paintPhoto(); }}, icon('trash',16),'Entfernen')));
      } else phBox.append(h('button',{class:'btn btn-ghost',type:'button',onclick:()=>phIn.click()}, icon('camera',18),'Foto hinzufügen'));
    };
    phIn.addEventListener('change', async ()=>{
      const f = phIn.files && phIn.files[0]; phIn.value=''; if(!f) return;
      try { photoBlob = await shrinkPhoto(f); if(photoPreview) URL.revokeObjectURL(photoPreview); photoPreview = URL.createObjectURL(photoBlob); paintPhoto(); }
      catch(e){ snack('Dieses Bild lässt sich nicht öffnen. Versuch ein JPG oder PNG.'); }
    });
    paintPhoto();
    wrap.append(h('div',{class:'field'}, h('span',{class:'lbl'},'Foto'), phBox, phIn));

    const serveBox = h('div',{class:'serve',role:'group','aria-label':'Serviert als'});
    const paintServe = ()=>{ serveBox.replaceChildren(...SERVINGS.map(s=>h('button',{type:'button',class:'chip','aria-pressed':String(serving===s),onclick:()=>{ serving = serving===s ? '' : s; paintServe(); }}, s))); };
    paintServe();
    wrap.append(h('div',{class:'field'}, h('span',{class:'lbl'},'Serviert als'), serveBox));

    const place = h('input',{class:'input',id:'ci-place',maxlength:'60',placeholder:'z. B. Späti am Eck, Büro, Freibad',value:editing?editing.place||'':''});
    wrap.append(h('div',{class:'field'}, h('label',{for:'ci-place'},'Wo trinkst du?'), place));

    const err = h('p',{class:'err',hidden:true,role:'alert'});
    const label = h('span',null, editing ? 'Änderungen speichern' : 'Einchecken');
    const submit = h('button',{class:'btn btn-primary btn-block',type:'submit',style:'min-height:50px;font-size:16px'}, icon('check',19), label);
    wrap.append(err, submit);

    wrap.addEventListener('submit', async e=>{
      e.preventDefault();
      submit.disabled = true; err.hidden = true;
      let photoId = keepPhoto;
      try {
        if(photoBlob){ label.textContent = 'Foto wird hochgeladen …'; photoId = (await api('POST','/api/uploads', photoBlob)).id; }
        label.textContent = 'Wird gespeichert …';
        const body = {rating: rating||null, comment: ta.value.trim().slice(0,280), serving, place: place.value.trim().slice(0,60), photoId: photoId||null};
        if(editing){
          await api('PATCH','/api/checkins/'+editing.id, body);
          await refresh(); sh.close(); snack('Check-in aktualisiert.');
          return;
        }
        const draft = Object.assign({drinkId, userId:S.uid, createdAt:Date.now()}, body);
        const before = new Set(earned(userStats(S.uid, S.checkins)));
        const fresh = earned(userStats(S.uid, [...S.checkins, draft])).filter(b=>!before.has(b));
        const r = await api('POST','/api/checkins', Object.assign({drinkId, badges:fresh}, body));
        if(photoPreview) URL.revokeObjectURL(photoPreview);
        await refresh();
        sh.close();
        S.stack.push(S.route); S.route = {name:'checkin', id:r.id}; window.scrollTo(0,0); render();
        if(fresh.length) showUnlocked(fresh); else snack(`Eingecheckt: ${d.name}. Prost!`);
      } catch(ex){
        err.hidden = false; err.textContent = ex.message || 'Das hat nicht geklappt.';
        submit.disabled = false; label.textContent = editing ? 'Änderungen speichern' : 'Einchecken';
      }
    });
    return wrap;
  }, {label:'Einchecken'});
}
function showUnlocked(ids){
  openSheet(sh=>h('div',{class:'unlock',style:'display:flex;flex-direction:column;gap:16px'},
    h('div',{class:'sh-head',style:'width:100%'}, h('h2',{style:'text-align:center'}, ids.length>1 ? 'Neue Abzeichen!' : 'Neues Abzeichen!'), h('button',{class:'x',onclick:sh.close,'aria-label':'Schließen'}, icon('x',20))),
    h('div',{class:'unlock-list'}, ids.map(id=>{ const b = BADGE[id]; return h('div',{class:'badge',style:'max-width:150px'}, bcap(b,92,true), h('b',{style:'font-size:15px'},b.name), h('small',null,b.desc)); })),
    h('button',{class:'btn btn-primary',onclick:sh.close,'data-autofocus':true},'Prost!')), {label:'Abzeichen freigeschaltet'});
}

/* ---------- drink form ---------- */
function openDrinkForm(o={}){
  const d = o.drinkId ? S.drinks.get(o.drinkId) : null;
  const pre = o.prefill || {};
  const sc = d ? S.checkins.filter(c=>c.drinkId===d.id).length : 0;
  let imageUrl = d ? d.imageUrl || null : pre.imageUrl || null;
  openSheet(sh=>{
    const f = h('form',{style:'display:flex;flex-direction:column;gap:16px',novalidate:true});
    f.append(sheetHead(d ? 'Drink bearbeiten' : 'Neuer Drink', sh));
    const imgBox = h('div');
    const paintImg = ()=>{
      imgBox.replaceChildren();
      if(imageUrl) imgBox.append(h('div',{class:'off-card'}, h('span',{class:'off-img'}, h('img',{src:imageUrl,alt:'',referrerpolicy:'no-referrer'})),
        h('div',null, h('div',{class:'small muted'},'Produktbild von Open Food Facts'), h('button',{type:'button',class:'btn btn-quiet btn-sm',onclick:()=>{ imageUrl=null; paintImg(); }}, icon('trash',15),'Bild nicht verwenden'))));
    };
    paintImg();
    const name = h('input',{class:'input',id:'df-name',maxlength:'60',value:d?d.name:(pre.name||''),placeholder:'z. B. Club-Mate'});
    const brands = [...new Set([...S.drinks.values()].map(x=>x.brand).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'de'));
    const dl = h('datalist',{id:'df-brands'}, brands.map(b=>h('option',{value:b})));
    const brand = h('input',{class:'input',id:'df-brand',maxlength:'50',list:'df-brands',value:d?d.brand:(pre.brand||''),placeholder:'z. B. Brauerei Loscher'});
    const catSel = d ? d.category : (pre.category || 'limo');
    const cat = h('select',{class:'select',id:'df-cat'}, CATS.map(c=>h('option',{value:c.id,selected:catSel===c.id}, c.name)));
    const sf = h('input',{type:'checkbox',id:'df-sf',checked:d ? !!d.sugarFree : !!pre.sugarFree});
    const cafV = d ? d.caffeine : pre.caffeine;
    const caf = h('input',{class:'input',id:'df-caf',type:'number',min:'0',max:'100',step:'1',inputmode:'numeric',placeholder:'leer lassen, wenn unbekannt',value:(cafV||cafV===0)?String(cafV):''});
    const codes = d ? [...(d.barcodes||[])] : (o.barcode ? [o.barcode] : []);
    const codeBox = h('div',{class:'codes'});
    const paintCodes = ()=>{ codeBox.replaceChildren(...codes.map((c,i)=>h('span',{class:'code'}, h('span',{class:'mono'},fmtEAN(c)), h('button',{type:'button','aria-label':'Barcode entfernen',onclick:()=>{ codes.splice(i,1); paintCodes(); }}, icon('x',15))))); if(!codes.length) codeBox.append(h('span',{class:'hint'},'Noch kein Barcode. Du kannst ihn später auf der Drink-Seite scannen.')); };
    paintCodes();
    const note = h('textarea',{class:'textarea',id:'df-note',maxlength:'240',style:'min-height:64px',placeholder:'Optional: Geschmack, Besonderheiten, Herkunft',value:d?d.note||'':''});
    const dupe = h('p',{class:'hint'});
    const checkDupe = ()=>{
      const n = norm(name.value).trim(); dupe.replaceChildren();
      if(n.length<3) return;
      const m = [...S.drinks.values()].filter(x=>(!d || x.id!==d.id) && norm(x.name).includes(n)).slice(0,3);
      if(m.length) dupe.append('Gibt es schon: ', ...m.map((x,i)=>[i?', ':'', h('button',{type:'button',class:'lnk-accent',onclick:()=>{ sh.close(); go('drink',{id:x.id}); }}, x.name)]));
    };
    name.addEventListener('input', checkDupe); checkDupe();
    f.append(imgBox,
      h('div',{class:'field'}, h('label',{for:'df-name'},'Name'), name, dupe),
      h('div',{class:'field'}, h('label',{for:'df-brand'},'Hersteller'), brand, dl),
      h('div',{class:'field'}, h('label',{for:'df-cat'},'Kategorie'), cat),
      h('label',{class:'check'}, sf, 'Zuckerfrei'),
      h('div',{class:'field'}, h('label',{for:'df-caf'},'Koffein (mg pro 100 ml)'), caf),
      h('div',{class:'field'}, h('span',{class:'lbl'},'Barcodes'), codeBox),
      h('div',{class:'field'}, h('label',{for:'df-note'},'Notiz'), note));
    const err = h('p',{class:'err',hidden:true,role:'alert'});
    const save = h('button',{class:'btn btn-primary btn-block',type:'submit',style:'min-height:48px'}, icon('check',18), d ? 'Speichern' : (o.thenCheckin ? 'Anlegen und einchecken' : 'Drink anlegen'));
    f.append(err, save);
    if(d && sc===0 && (d.createdBy===S.uid || S.isAdmin)){
      f.append(h('button',{class:'btn btn-quiet',type:'button',style:'color:var(--danger)',onclick:async ()=>{
        const ok = await act(()=>api('DELETE','/api/drinks/'+encodeURIComponent(d.id)), 'Drink gelöscht.');
        if(ok){ sh.close(); tab('search'); }
      }}, icon('trash',16),'Drink löschen'));
    }
    f.addEventListener('submit', async e=>{
      e.preventDefault(); err.hidden = true;
      const nm = name.value.trim(), br = brand.value.trim();
      if(!nm){ err.hidden=false; err.textContent='Gib dem Drink einen Namen.'; name.focus(); return; }
      if(!br){ err.hidden=false; err.textContent='Trag den Hersteller ein, damit man ihn wiederfindet.'; brand.focus(); return; }
      const body = {name:nm, brand:br, category:cat.value, sugarFree:sf.checked, caffeine: caf.value.trim()==='' ? null : Number(caf.value), barcodes:codes, note:note.value.trim(), imageUrl};
      save.disabled = true;
      try {
        if(d){ await api('PATCH','/api/drinks/'+encodeURIComponent(d.id), body); await refresh(); sh.close(); snack('Drink gespeichert.'); return; }
        const r = await api('POST','/api/drinks', body);
        await refresh();
        sh.close(); snack(`${nm} angelegt.`);
        if(o.thenCheckin) openCheckin(r.id, {barcode:o.barcode}); else go('drink',{id:r.id});
      } catch(ex){ err.hidden=false; err.textContent=ex.message; save.disabled=false; }
    });
    return f;
  }, {label: d ? 'Drink bearbeiten' : 'Neuer Drink'});
}

/* ================= chrome wiring ================= */
const TABDEF = {feed:['feed','Feed'], search:['search','Suchen'], top:['trophy','Top'], profile:['user','Profil']};
document.querySelectorAll('.tab').forEach(b=>{ const [ic,l] = TABDEF[b.dataset.tab]; b.append(icon(ic,23), h('span',null,l)); });
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click', ()=>tab(b.dataset.tab)));
$('#fab').append(icon('barcode',24,2));
$('#fab').addEventListener('click', ()=>openScan('checkin'));
$('#top-scan').append(icon('barcode',17), 'Scannen');
$('#top-scan').addEventListener('click', ()=>openScan('checkin'));
$('#logo').addEventListener('click', ()=>{ if(S.me) tab('feed'); });
$('#me-btn').addEventListener('click', ()=>tab('profile'));

setInterval(async ()=>{
  if(!S.me || document.hidden) return;
  try { const v = await api('GET','/api/version'); if(v.version!==S.version) await refresh(); } catch(e){}
}, 8000);
document.addEventListener('visibilitychange', ()=>{ if(!document.hidden && S.me) refresh().catch(()=>{}); });
setInterval(()=>{ if(S.me && S.route.name==='feed' && !sheetRoot.firstChild) scheduleRender(); }, 60000);

/* ================= boot ================= */
async function boot(){
  try { const r = await api('GET','/api/me', undefined, {allow401:true}); S.me = r.user; S.uid = r.user.id; }
  catch(e){ S.me = null; S.uid = null; }
  S.booted = true;
  if(S.me){ S.route = {name:'feed'}; S.stack = []; render(); try { await refresh(); } catch(e){ snack(e.message); } }
  render();
}
render();
boot();
})();
