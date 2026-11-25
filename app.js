const API = "https://api.audius.co/v1";
const APP_NAME = "MIXWAVE";
const $ = id => document.getElementById(id);
const audio = $("audio");
let tracks = [], current = -1, mode = "trending";
let liked = JSON.parse(localStorage.getItem("mixwave_liked") || "[]");
let history = JSON.parse(localStorage.getItem("mixwave_history") || "[]");
const key = () => localStorage.getItem("mixwave_audius_key") || "";
function headers(){ return key() ? {"X-API-Key":key()} : {}; }
function endpoint(path){ return `${API}${path}${path.includes("?")?"&":"?"}app_name=${encodeURIComponent(APP_NAME)}`; }
function esc(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function imageUrl(t){return t?.artwork?.["150x150"] || t?.user?.["profile_picture"]?.["150x150"] || "";}
function render(){
 const root=$("tracks"); root.innerHTML="";
 if(!tracks.length){$("status").textContent="Ничего не найдено. Попробуй другой запрос.";return;}
 $("status").textContent=`Найдено треков: ${tracks.length}`;
 tracks.forEach((t,i)=>{
  const isLiked=liked.includes(String(t.id));
  const row=document.createElement("div");row.className="track";
  row.innerHTML=`<div class="cover">${imageUrl(t)?`<img src="${esc(imageUrl(t))}" alt="">`:"〰"}</div><div class="track-info"><b>${esc(t.title||"Без названия")}</b><small>${esc(t.user?.name||"Неизвестный артист")}</small></div><div class="track-actions"><button class="round ${isLiked?"liked":""}" data-like="${i}">${isLiked?"♥":"♡"}</button><button class="round" data-play="${i}">▶</button></div>`;
  root.appendChild(row);
 });
}
async function load(path,title,kind){
 mode=kind;$("listTitle").textContent=title;$("status").textContent="Ищем музыку…";$("tracks").innerHTML="";
 try{
  const r=await fetch(endpoint(path),{headers:headers()});
  if(!r.ok) throw new Error(`Audius API ответил ${r.status}`);
  const data=await r.json();tracks=data.data||[];render();
 }catch(e){$("status").textContent=`Не удалось загрузить каталог: ${e.message}. Проверь интернет или API key в настройках.`;}
}
function playAt(i){
 if(i<0||i>=tracks.length)return;current=i;const t=tracks[i];
 audio.src=endpoint(`/tracks/${encodeURIComponent(t.id)}/stream`);
 audio.play().then(()=>{$("playBtn").textContent="Ⅱ";}).catch(()=>{$("status").textContent="Не удалось запустить поток. Возможно, этот трек недоступен для воспроизведения."});
 $("playerTitle").textContent=t.title||"Без названия";$("playerArtist").textContent=t.user?.name||"Неизвестный артист";
 const img=imageUrl(t);$("playerCover").innerHTML=img?`<img src="${esc(img)}" alt="">`:"〰";
 history=[String(t.id),...history.filter(x=>x!==String(t.id))].slice(0,50);localStorage.setItem("mixwave_history",JSON.stringify(history));
}
$("tracks").addEventListener("click",e=>{
 const p=e.target.closest("[data-play]"),l=e.target.closest("[data-like]");
 if(p)playAt(Number(p.dataset.play));
 if(l){const t=tracks[Number(l.dataset.like)],id=String(t.id);liked=liked.includes(id)?liked.filter(x=>x!==id):[...liked,id];localStorage.setItem("mixwave_liked",JSON.stringify(liked));render();}
});
$("searchBtn").onclick=()=>{const q=$("searchInput").value.trim();if(q)load(`/tracks/search?query=${encodeURIComponent(q)}&limit=25`,`Результаты: ${q}`,"search");};
$("searchInput").addEventListener("keydown",e=>{if(e.key==="Enter")$("searchBtn").click();});
$("refreshBtn").onclick=()=>load("/tracks/trending?limit=25","Сейчас в тренде","trending");
$("settingsBtn").onclick=()=>$("settingsModal").classList.remove("hidden");
$("closeSettings").onclick=()=>$("settingsModal").classList.add("hidden");
$("saveKey").onclick=()=>{localStorage.setItem("mixwave_audius_key",$("apiKey").value.trim());$("settingsModal").classList.add("hidden");load("/tracks/trending?limit=25","Сейчас в тренде","trending");};
$("apiKey").value=key();
$("playBtn").onclick=()=>{if(!audio.src){if(tracks.length)playAt(0);return;}if(audio.paused)audio.play();else audio.pause();};
audio.onplay=()=>$("playBtn").textContent="Ⅱ";audio.onpause=()=>$("playBtn").textContent="▶";
audio.ontimeupdate=()=>{if(audio.duration){$("seek").value=audio.currentTime/audio.duration*100;$("elapsed").textContent=fmt(audio.currentTime);$("duration").textContent=fmt(audio.duration);}};
$("seek").oninput=()=>{if(audio.duration)audio.currentTime=audio.duration*Number($("seek").value)/100;};
$("nextBtn").onclick=()=>playAt(current+1);$("prevBtn").onclick=()=>playAt(Math.max(0,current-1));
$("homeNav").onclick=()=>{document.querySelectorAll(".nav-item").forEach(x=>x.classList.remove("active"));$("homeNav").classList.add("active");load("/tracks/trending?limit=25","Сейчас в тренде","trending");};
$("likedNav").onclick=()=>{document.querySelectorAll(".nav-item").forEach(x=>x.classList.remove("active"));$("likedNav").classList.add("active");tracks=liked.map(id=>({id,title:"Избранный трек",user:{name:"Открой главную и выбери трек"}}));$("listTitle").textContent="Избранное";render();};
$("historyNav").onclick=()=>{document.querySelectorAll(".nav-item").forEach(x=>x.classList.remove("active"));$("historyNav").classList.add("active");tracks=history.map(id=>({id,title:"Трек из истории",user:{name:"Недавно слушал"}}));$("listTitle").textContent="История";render();};
function fmt(n){if(!Number.isFinite(n))return"0:00";return `${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,"0")}`;}
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
load("/tracks/trending?limit=25","Сейчас в тренде","trending");
