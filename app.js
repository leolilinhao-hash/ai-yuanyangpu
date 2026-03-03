const LS_KEY="yy_hf_ai_v1";
const ZODIACS=["Aries 白羊","Taurus 金牛","Gemini 双子","Cancer 巨蟹","Leo 狮子","Virgo 处女","Libra 天秤","Scorpio 天蝎","Sagittarius 射手","Capricorn 摩羯","Aquarius 水瓶","Pisces 双鱼"];
function loadState(){try{const r=localStorage.getItem(LS_KEY);if(!r)return{me:{},ta:{},context:{},ui:{route:"home"},cache:{}};return JSON.parse(r);}catch{return{me:{},ta:{},context:{},ui:{route:"home"},cache:{}}}}
function saveState(s){localStorage.setItem(LS_KEY,JSON.stringify(s))}
let state=loadState();
const $=(s)=>document.querySelector(s);
function el(html){const t=document.createElement("template");t.innerHTML=html.trim();return t.content.firstChild;}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));}
function toast(m){alert(m);}
function todayStr(){const d=new Date();const y=d.getFullYear();const m=String(d.getMonth()+1).padStart(2,"0");const dd=String(d.getDate()).padStart(2,"0");return `${y}-${m}-${dd}`;}
function ymd(d){const y=d.getFullYear();const m=String(d.getMonth()+1).padStart(2,"0");const dd=String(d.getDate()).padStart(2,"0");return `${y}-${m}-${dd}`;}
function getProfileSafe(p){return{nick:(p.nick||"").trim(),baziYear:(p.baziYear||"").trim(),baziMonth:(p.baziMonth||"").trim(),baziDay:(p.baziDay||"").trim(),baziHour:(p.baziHour||"").trim(),zodiac:(p.zodiac||"").trim()};}
function hasEnough(p){return p.baziYear&&p.baziMonth&&p.baziDay&&p.baziHour&&p.zodiac;}
async function postJSON(url,body){const res=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data?.error||data?.message||`HTTP ${res.status}`);return data;}
function setRoute(r){state.ui||={};state.ui.route=r;saveState(state);render();}
document.addEventListener("click",(e)=>{const b=e.target.closest("[data-route]");if(b)setRoute(b.dataset.route);});
function markActive(){document.querySelectorAll(".chip").forEach(b=>b.classList.toggle("active",b.dataset.route===state.ui?.route));}

function renderHome(view){
  const me=getProfileSafe(state.me), ta=getProfileSafe(state.ta);
  const ready=hasEnough(me)&&hasEnough(ta);
  const box=el(`<div class="grid">
    <div class="card">
      <h2>🧸 AI小管家</h2>
      <div class="p">实时联网回答，只保留与你们相关的要点。</div>
      <div class="row" style="margin-top:8px">
        <input class="input" id="q" placeholder="例如：今天我该怎么跟TA沟通？"/>
        <button class="btn" id="ask">发送</button>
      </div>
      <div class="row" style="margin-top:8px">
        <button class="btn ghost" id="qq1">今日相处重点</button>
        <button class="btn ghost" id="qq2">冲突时怎么说</button>
        <button class="btn ghost" id="qq3">今晚约会建议</button>
      </div>
      <div id="chat"></div>
      <div class="hr"></div>
      <div class="row">
        <button class="btn secondary" id="refreshToday">生成/刷新 今日提醒</button>
        <button class="btn ghost" id="goSetup">去设置</button>
      </div>
      <div id="todayBox"></div>
    </div>
    <div class="card">
      <h2>🗓️ 日历</h2>
      <div class="row">
        <button class="btn secondary" id="goCal">打开日历</button>
        <button class="btn ghost" id="clearCache">清空缓存</button>
      </div>
      <div class="hr"></div>
      <h2>🧾 资料状态</h2>
      <div class="p" id="status"></div>
      <div class="hr"></div>
      <h2>⚙️ 现实因素</h2>
      <div class="p" id="ctxBrief"></div>
    </div>
  </div>`);
  box.querySelector("#goSetup").onclick=()=>setRoute("setup");
  box.querySelector("#goCal").onclick=()=>setRoute("calendar");
  box.querySelector("#clearCache").onclick=()=>{if(confirm("清空AI缓存？")){state.cache={};saveState(state);toast("已清空");render();}};
  box.querySelector("#status").innerHTML=`${ready?"✅ 可用":"⏳ 先去设置填信息"}<div class="row" style="margin-top:8px"><span class="badge">我：${escapeHtml(me.zodiac||"")}</span><span class="badge">TA：${escapeHtml(ta.zodiac||"")}</span></div>`;
  const ctx=state.context||{};
  const brief=[ctx.sleep?`作息：${ctx.sleep}`:"",ctx.stress?`压力：${ctx.stress}`:"",ctx.plan?`计划：${ctx.plan}`:"",ctx.triggers?`雷点：${ctx.triggers}`:"",ctx.goals?`目标：${ctx.goals}`:""].filter(Boolean);
  box.querySelector("#ctxBrief").innerHTML=brief.length?brief.map(x=>`<div class="p">• ${escapeHtml(x)}</div>`).join(""):`<div class="p">未填写</div>`;
  const chat=box.querySelector("#chat");
  function pushBubble(who,text){chat.prepend(el(`<div class="bubble"><div class="who">${escapeHtml(who)}</div><div class="p" style="white-space:pre-wrap">${escapeHtml(text)}</div></div>`));}
  function setLoading(on){const btn=box.querySelector("#ask");btn.disabled=on;btn.innerHTML=on?`<span class="spinner"></span>`:"发送";}
  async function doAsk(q){
    if(!q||q.trim().length<2)return toast("问题太短");
    if(!ready)return toast("先去设置填双方信息");
    pushBubble(state.me?.nick||"我",q);
    setLoading(true);
    try{
      const data=await postJSON("/api/ask",{date:todayStr(),question:q,me,ta,context:state.context||{}});
      pushBubble("小管家",data.answer||"（无返回）");
    }catch(err){pushBubble("小管家",`出错：${err.message}`);}
    finally{setLoading(false);box.querySelector("#q").value="";}
  }
  box.querySelector("#ask").onclick=()=>doAsk(box.querySelector("#q").value);
  box.querySelector("#qq1").onclick=()=>doAsk("今天相处重点是什么？给可执行建议。");
  box.querySelector("#qq2").onclick=()=>doAsk("如果发生冲突，我该怎么说？给一句可复制的话。");
  box.querySelector("#qq3").onclick=()=>doAsk("今晚约会/相处给2-3个具体方案。");

  const todayBox=box.querySelector("#todayBox");
  function renderToday(){
    const k="daily:"+todayStr();
    const n=state.cache?.[k];
    if(!n){todayBox.innerHTML=`<div class="p">还没有今日提醒。</div>`;return;}
    todayBox.innerHTML=`<div class="bubble">
      <div class="who">📌 今日提醒（${escapeHtml(n.date)}）</div>
      <div class="p">${escapeHtml(n.oneLiner||"")}</div>
      <div class="p"><b>✅ 做：</b><br>• ${(n.do||[]).map(escapeHtml).join("<br>• ")}</div>
      <div class="p"><b>🚫 避：</b><br>• ${(n.avoid||[]).map(escapeHtml).join("<br>• ")}</div>
      ${(n.real||[]).length?`<div class="p"><b>🧠 现实注意：</b><br>• ${(n.real||[]).map(escapeHtml).join("<br>• ")}</div>`:""}
      ${n.task?`<div class="p"><b>💞 今日任务：</b>${escapeHtml(n.task)}</div>`:""}
    </div>`;
  }
  async function refreshToday(){
    if(!ready)return toast("先去设置填双方信息");
    const btn=box.querySelector("#refreshToday");
    btn.disabled=true;btn.innerHTML=`<span class="spinner"></span>`;
    try{
      const data=await postJSON("/api/daily",{date:todayStr(),me,ta,context:state.context||{}});
      state.cache||={};state.cache["daily:"+todayStr()]=data;saveState(state);
      renderToday();
    }catch(err){todayBox.innerHTML=`<div class="p">生成失败：${escapeHtml(err.message)}</div>`;}
    finally{btn.disabled=false;btn.innerHTML="生成/刷新 今日提醒";}
  }
  box.querySelector("#refreshToday").onclick=refreshToday;
  renderToday();
  view.appendChild(box);
}

function renderCalendar(view){
  const me=getProfileSafe(state.me), ta=getProfileSafe(state.ta);
  const ready=hasEnough(me)&&hasEnough(ta);
  if(!ready){
    const c=el(`<div class="card"><h2>🗓️ 日历</h2><div class="p">先去设置填双方信息。</div><button class="btn" id="go">去设置</button></div>`);
    c.querySelector("#go").onclick=()=>setRoute("setup");view.appendChild(c);return;
  }
  const box=el(`<div class="card">
    <h2>🗓️ 日历提醒（AI）</h2>
    <div class="row">
      <button class="btn ghost" id="prev">上个月</button>
      <div class="badge" id="label"></div>
      <button class="btn ghost" id="next">下个月</button>
      <button class="btn secondary" id="today">回到今天</button>
    </div>
    <div class="calendar" id="cal"></div>
    <div id="popup"></div>
  </div>`);
  let cur=new Date();cur.setDate(1);
  const cal=box.querySelector("#cal"),label=box.querySelector("#label"),popup=box.querySelector("#popup");
  function showFrom(n){
    popup.innerHTML=`<div class="bubble">
      <div class="who">📌 ${escapeHtml(n.date)} 提醒</div>
      <div class="p">${escapeHtml(n.oneLiner||"")}</div>
      <div class="p"><b>✅ 做：</b><br>• ${(n.do||[]).map(escapeHtml).join("<br>• ")}</div>
      <div class="p"><b>🚫 避：</b><br>• ${(n.avoid||[]).map(escapeHtml).join("<br>• ")}</div>
      ${(n.real||[]).length?`<div class="p"><b>🧠 现实注意：</b><br>• ${(n.real||[]).map(escapeHtml).join("<br>• ")}</div>`:""}
      ${n.task?`<div class="p"><b>💞 今日任务：</b>${escapeHtml(n.task)}</div>`:""}
    </div>`;
  }
  async function showDay(key){
    const ck="daily:"+key;state.cache||={};
    if(state.cache[ck])return showFrom(state.cache[ck]);
    popup.innerHTML=`<div class="bubble"><div class="who">小管家</div><div class="p"><span class="spinner"></span> 生成中…</div></div>`;
    try{
      const data=await postJSON("/api/daily",{date:key,me,ta,context:state.context||{}});
      state.cache[ck]=data;saveState(state);showFrom(data);
    }catch(err){popup.innerHTML=`<div class="bubble"><div class="who">小管家</div><div class="p">失败：${escapeHtml(err.message)}</div></div>`;}
  }
  function draw(){
    cal.innerHTML="";popup.innerHTML="";
    const y=cur.getFullYear(),m=cur.getMonth();
    label.textContent=`${y}年 ${m+1}月`;
    const first=new Date(y,m,1);const start=first.getDay();
    const days=new Date(y,m+1,0).getDate();
    const t=todayStr();
    for(let i=0;i<start;i++)cal.appendChild(el(`<div class="day" style="opacity:.35;pointer-events:none"></div>`));
    for(let d=1;d<=days;d++){
      const key=ymd(new Date(y,m,d));
      const cell=el(`<div class="day ${key===t?"today":""}"><div class="n">${d}</div><div class="tiny">点我生成</div></div>`);
      cell.onclick=()=>showDay(key);
      cal.appendChild(cell);
    }
  }
  box.querySelector("#prev").onclick=()=>{cur.setMonth(cur.getMonth()-1);draw();};
  box.querySelector("#next").onclick=()=>{cur.setMonth(cur.getMonth()+1);draw();};
  box.querySelector("#today").onclick=()=>{cur=new Date();cur.setDate(1);draw();showDay(todayStr());};
  draw();view.appendChild(box);
}

function renderSetup(view){
  const me=getProfileSafe(state.me), ta=getProfileSafe(state.ta);
  const ctx=state.context||{};
  const box=el(`<div class="grid">
    <div class="card">
      <h2>🧾 你</h2>
      <label>昵称</label><input class="input" id="meNick"/>
      <div class="twoCol">
        <div><label>年柱</label><input class="input" id="meY"/></div>
        <div><label>月柱</label><input class="input" id="meM"/></div>
        <div><label>日柱</label><input class="input" id="meD"/></div>
        <div><label>时柱</label><input class="input" id="meH"/></div>
      </div>
      <label>星座</label><select id="meZ"></select>
      <div class="row" style="margin-top:12px"><button class="btn" id="saveMe">保存</button></div>
    </div>
    <div class="card">
      <h2>💞 TA</h2>
      <label>昵称</label><input class="input" id="taNick"/>
      <div class="twoCol">
        <div><label>年柱</label><input class="input" id="taY"/></div>
        <div><label>月柱</label><input class="input" id="taM"/></div>
        <div><label>日柱</label><input class="input" id="taD"/></div>
        <div><label>时柱</label><input class="input" id="taH"/></div>
      </div>
      <label>星座</label><select id="taZ"></select>
      <div class="row" style="margin-top:12px"><button class="btn secondary" id="saveTa">保存</button></div>
    </div>
    <div class="card" style="grid-column:1/-1">
      <h2>🧠 现实因素</h2>
      <div class="twoCol">
        <div><label>作息/精力</label><input class="input" id="sleep"/></div>
        <div><label>压力来源</label><input class="input" id="stress"/></div>
        <div><label>近期计划</label><input class="input" id="plan"/></div>
        <div><label>雷点/敏感点</label><input class="input" id="triggers"/></div>
      </div>
      <label>关系目标</label><input class="input" id="goals"/>
      <div class="row" style="margin-top:12px">
        <button class="btn" id="saveCtx">保存现实因素</button>
        <button class="btn ghost" id="wipeCache">清空AI缓存</button>
      </div>
    </div>
  </div>`);
  const meZ=box.querySelector("#meZ"), taZ=box.querySelector("#taZ");
  ZODIACS.forEach(z=>{const o1=document.createElement("option");o1.value=z;o1.textContent=z;meZ.appendChild(o1);const o2=document.createElement("option");o2.value=z;o2.textContent=z;taZ.appendChild(o2);});
  box.querySelector("#meNick").value=me.nick||"";box.querySelector("#meY").value=me.baziYear||"";box.querySelector("#meM").value=me.baziMonth||"";box.querySelector("#meD").value=me.baziDay||"";box.querySelector("#meH").value=me.baziHour||"";if(me.zodiac)meZ.value=me.zodiac;
  box.querySelector("#taNick").value=ta.nick||"";box.querySelector("#taY").value=ta.baziYear||"";box.querySelector("#taM").value=ta.baziMonth||"";box.querySelector("#taD").value=ta.baziDay||"";box.querySelector("#taH").value=ta.baziHour||"";if(ta.zodiac)taZ.value=ta.zodiac;
  box.querySelector("#sleep").value=ctx.sleep||"";box.querySelector("#stress").value=ctx.stress||"";box.querySelector("#plan").value=ctx.plan||"";box.querySelector("#triggers").value=ctx.triggers||"";box.querySelector("#goals").value=ctx.goals||"";
  function savePerson(which){
    const nick=box.querySelector(which==="me"?"#meNick":"#taNick").value.trim();
    const y=box.querySelector(which==="me"?"#meY":"#taY").value.trim();
    const m=box.querySelector(which==="me"?"#meM":"#taM").value.trim();
    const d=box.querySelector(which==="me"?"#meD":"#taD").value.trim();
    const h=box.querySelector(which==="me"?"#meH":"#taH").value.trim();
    const z=(which==="me"?meZ:taZ).value;
    if(!y||!m||!d||!h||!z){toast("八字四柱+星座要都填");return false;}
    state[which]={nick,baziYear:y,baziMonth:m,baziDay:d,baziHour:h,zodiac:z};saveState(state);return true;
  }
  box.querySelector("#saveMe").onclick=()=>{if(savePerson("me"))toast("已保存");};
  box.querySelector("#saveTa").onclick=()=>{if(savePerson("ta"))toast("已保存");};
  box.querySelector("#saveCtx").onclick=()=>{state.context={sleep:box.querySelector("#sleep").value.trim(),stress:box.querySelector("#stress").value.trim(),plan:box.querySelector("#plan").value.trim(),triggers:box.querySelector("#triggers").value.trim(),goals:box.querySelector("#goals").value.trim()};saveState(state);toast("已保存");};
  box.querySelector("#wipeCache").onclick=()=>{if(confirm("清空AI缓存？")){state.cache={};saveState(state);toast("已清空");}};
  view.appendChild(box);
}

function renderAbout(view){
  view.appendChild(el(`<div class="card"><h2>说明</h2><div class="p">部署后需要在 Vercel 环境变量设置：HF_API_TOKEN（Hugging Face 免费账号可创建）。</div></div>`));
}

function render(){const view=$("#view");view.innerHTML="";state.ui||={route:"home"};markActive();const r=state.ui.route||"home";if(r==="setup")return renderSetup(view);if(r==="calendar")return renderCalendar(view);if(r==="about")return renderAbout(view);return renderHome(view);}
render();
