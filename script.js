// StudyFlow – simple task & deadline tracker (data saved in LocalStorage)
const KEY = "studyflow-data";
const pad = n => String(n).padStart(2,"0");
const toISO = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parseDate = s => { const [y,m,d] = s.split("-").map(Number); return new Date(y,m-1,d); };
const today = () => { const t=new Date(); return new Date(t.getFullYear(),t.getMonth(),t.getDate()); };
const offset = days => { const d=today(); d.setDate(d.getDate()+days); return toISO(d); };
const daysFrom = s => Math.round((parseDate(s)-today())/86400000);
const fmtDate = s => s ? parseDate(s).toLocaleDateString(undefined,{month:"short",day:"numeric"}) : "—";

function dueBadge(s, done){
  if (done) return `<span class="badge b-done">Completed</span>`;
  const n = daysFrom(s);
  if (n < 0) return `<span class="badge b-late">Overdue</span>`;
  if (n === 0) return `<span class="badge b-soon">Due today</span>`;
  if (n <= 3) return `<span class="badge b-soon">In ${n}d</span>`;
  return `<span class="badge b-ok">In ${n}d</span>`;
}

function sampleData(){
  return { tasks: [
    { id:1, name:"Read Chapter 4 – Research Methods", subject:"ITP104", due:offset(1), priority:"High", notes:"Focus on data collection section", done:false },
    { id:2, name:"Finish Flutter login screen", subject:"ITP107", due:offset(2), priority:"High", notes:"Match the design system", done:false },
    { id:3, name:"Group meeting prep", subject:"ITP107", due:offset(4), priority:"Medium", notes:"", done:false },
    { id:4, name:"Submit midterm essay quiz", subject:"ITP104", due:offset(-1), priority:"High", notes:"", done:false },
    { id:5, name:"Math problem set 3", subject:"Calculus", due:offset(6), priority:"Low", notes:"", done:false },
    { id:6, name:"Lab report draft", subject:"Chemistry", due:offset(-3), priority:"Medium", notes:"", done:true }
  ]};
}
function loadData(){
  try{ const s = JSON.parse(localStorage.getItem(KEY)); if (s && Array.isArray(s.tasks)) return s; }catch(e){}
  const fresh = sampleData(); localStorage.setItem(KEY, JSON.stringify(fresh)); return fresh;
}
let data = loadData();
const save = () => localStorage.setItem(KEY, JSON.stringify(data));
const nextId = list => list.reduce((m,x)=>Math.max(m,x.id),0)+1;

const $ = id => document.getElementById(id);
const esc = t => { const d=document.createElement("div"); d.textContent=t??""; return d.innerHTML; };
let toastTimer;
function toast(msg){ $("toast").textContent=msg; $("toast").classList.add("show"); clearTimeout(toastTimer); toastTimer=setTimeout(()=>$("toast").classList.remove("show"),2200); }

document.querySelectorAll(".nav-btn").forEach(btn=>btn.addEventListener("click",()=>{
  document.querySelectorAll(".nav-btn,.view").forEach(el=>el.classList.remove("active"));
  btn.classList.add("active"); $(btn.dataset.view).classList.add("active");
}));

let editingId = null;
function openForm(task){
  editingId = task ? task.id : null;
  $("formTitle").textContent = task ? "Edit Task" : "Add Task";
  $("f_name").value = task ? task.name : "";
  $("f_subject").value = task ? task.subject : "";
  $("f_due").value = task ? task.due : offset(1);
  $("f_priority").value = task ? task.priority : "Medium";
  $("f_notes").value = task ? task.notes : "";
  $("subjList").innerHTML = [...new Set(data.tasks.map(t=>t.subject))].map(s=>`<option value="${esc(s)}">`).join("");
  $("modal").hidden = false; $("f_name").focus();
}
function closeForm(){ $("modal").hidden = true; editingId = null; }
$("addTaskBtn").addEventListener("click",()=>openForm());
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",closeForm));
$("modal").addEventListener("click",e=>{ if(e.target===$("modal")) closeForm(); });
document.addEventListener("keydown",e=>{ if(e.key==="Escape") closeForm(); });

$("form").addEventListener("submit", e=>{
  e.preventDefault();
  const name = $("f_name").value.trim();
  const subject = $("f_subject").value.trim();
  if (!name) return toast("Please enter a task name");
  if (!subject) return toast("Please enter a subject");
  const values = { name, subject, due: $("f_due").value, priority: $("f_priority").value, notes: $("f_notes").value.trim() };
  if (editingId){ Object.assign(data.tasks.find(t=>t.id===editingId), values); toast("Task updated"); }
  else { data.tasks.push({ id: nextId(data.tasks), done:false, ...values }); toast("Task added"); }
  save(); closeForm(); renderAll();
});

function renderDashboard(){
  const total = data.tasks.length;
  const completed = data.tasks.filter(t=>t.done).length;
  const dueToday = data.tasks.filter(t=>!t.done && daysFrom(t.due)===0).length;
  const overdue = data.tasks.filter(t=>!t.done && daysFrom(t.due)<0).length;
  $("stats").innerHTML = [["Total Tasks",total],["Due Today",dueToday],["Overdue",overdue],["Completed",completed]]
    .map(([l,n])=>`<div class="card"><span>${l}</span><strong>${n}</strong></div>`).join("");
  $("progText").textContent = `${completed} / ${total} tasks completed`;
  $("progBar").style.width = (total? Math.round(completed/total*100):0) + "%";

  const due = data.tasks.filter(t=>!t.done).sort((a,b)=>a.due.localeCompare(b.due)).slice(0,6);
  $("dueList").innerHTML = due.length ? due.map(t=>`
    <li><div class="grow"><b>${esc(t.name)}</b><span>${esc(t.subject)} · ${fmtDate(t.due)}</span></div>${dueBadge(t.due,false)}</li>
  `).join("") : `<li class="empty">No pending tasks. Nice work!</li>`;
}

function renderTasks(){
  const q = $("searchTask").value.trim().toLowerCase();
  const subject = $("filterSubject").value;
  const status = $("filterStatus").value;
  $("filterSubject").innerHTML = `<option value="">All subjects</option>` +
    [...new Set(data.tasks.map(t=>t.subject))].map(s=>`<option ${s===subject?"selected":""}>${esc(s)}</option>`).join("");

  const rows = data.tasks.filter(t=>
    (t.name+" "+t.subject+" "+t.notes).toLowerCase().includes(q) &&
    (!subject || t.subject===subject) &&
    (!status || (status==="Completed"?t.done:!t.done))
  ).sort((a,b)=> (a.done-b.done) || a.due.localeCompare(b.due));

  $("taskList").innerHTML = rows.length ? rows.map(t=>`
    <div class="task ${t.priority} ${t.done?"done":""}">
      <input type="checkbox" data-toggle="${t.id}" ${t.done?"checked":""} aria-label="Mark ${esc(t.name)} complete" style="width:auto">
      <div class="grow">
        <span class="t-name">${esc(t.name)}</span>
        <span class="t-meta">${esc(t.subject)} · Due ${fmtDate(t.due)} · ${t.priority} priority${t.notes? " · "+esc(t.notes):""}</span>
      </div>
      ${dueBadge(t.due, t.done)}
      <div>
        <button class="small" data-edit="${t.id}">Edit</button>
        <button class="small del" data-del="${t.id}">Delete</button>
      </div>
    </div>
  `).join("") : `<p class="empty">No tasks found. Add a task or change your filters.</p>`;
}

$("taskList").addEventListener("click", e=>{
  const t = e.target;
  if (t.dataset.toggle){
    const task = data.tasks.find(x=>x.id==t.dataset.toggle);
    task.done = t.checked; save(); renderAll(); toast(task.done?"Task completed":"Marked as pending");
  }
  if (t.dataset.edit) openForm(data.tasks.find(x=>x.id==t.dataset.edit));
  if (t.dataset.del && confirm("Delete this task?")){
    data.tasks = data.tasks.filter(x=>x.id!=t.dataset.del);
    save(); renderAll(); toast("Task deleted");
  }
});
$("searchTask").addEventListener("input", renderTasks);
$("filterSubject").addEventListener("change", renderTasks);
$("filterStatus").addEventListener("change", renderTasks);

function renderAll(){ renderDashboard(); renderTasks(); }
renderAll();
