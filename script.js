// Cute To‑Do App with counters, filters, and localStorage
const inputBox = document.getElementById("input-box");
const addBtn = document.getElementById("add-btn");
const listContainer = document.getElementById("list-container");
const completedCounter = document.getElementById("completed-counter");
const uncompletedCounter = document.getElementById("uncompleted-counter");
const chips = document.querySelectorAll(".chip");
const clearCompletedBtn = document.getElementById("clear-completed");
const exportBtn = document.getElementById("export-json");
const importBtn = document.getElementById("import-json");
const importFile = document.getElementById("import-file");
const confetti = document.getElementById("confetti");

let tasks = loadTasks();
let filter = "all";

function loadTasks(){
  try{
    const raw = localStorage.getItem("cute_tasks_v1");
    return raw ? JSON.parse(raw) : [];
  }catch(e){
    console.warn("Local storage not available.", e);
    return [];
  }
}
function saveTasks(){
  try{
    localStorage.setItem("cute_tasks_v1", JSON.stringify(tasks));
  }catch(e){ /* ignore */ }
}

function render(){
  listContainer.innerHTML = "";
  const frag = document.createDocumentFragment();
  const tmpl = document.getElementById("item-template");

  const visible = tasks.filter(t => filter === "all" ? true : filter === "active" ? !t.completed : t.completed);

  for(const t of visible){
    const node = tmpl.content.firstElementChild.cloneNode(true);
    const checkbox = node.querySelector(".toggle");
    const text = node.querySelector(".text");
    const edit = node.querySelector(".edit");
    const del = node.querySelector(".delete");

    text.textContent = t.text;
    checkbox.checked = !!t.completed;
    if(t.completed){
      node.classList.add("completed");
      text.classList.add("completed");
    }

    checkbox.addEventListener("change", () => {
      t.completed = checkbox.checked;
      saveTasks();
      updateCounters();
      render();
      maybeCelebrate();
    });

    edit.addEventListener("click", () => beginEdit(node, t));
    del.addEventListener("click", () => deleteTask(t.id));

    frag.appendChild(node);
  }
  listContainer.appendChild(frag);
  updateCounters();
}

function beginEdit(node, t){
  const text = node.querySelector(".text");
  const editing = text.getAttribute("contenteditable") === "true";
  if(!editing){
    text.setAttribute("contenteditable","true");
    text.focus();
    placeCaretAtEnd(text);
    node.classList.remove("completed");
    text.classList.remove("completed");
  }
  text.addEventListener("keydown", (e) => {
    if(e.key === "Enter"){
      e.preventDefault();
      endEdit();
    } else if(e.key === "Escape"){
      text.textContent = t.text;
      endEdit();
    }
  }, { once: true });

  text.addEventListener("blur", () => endEdit(), { once: true });

  function endEdit(){
    text.setAttribute("contenteditable","false");
    const val = text.textContent.trim();
    if(val){
      t.text = val;
      t.completed = false;
      saveTasks();
      render();
    }else{
      // empty becomes delete
      deleteTask(t.id);
    }
  }
}

function placeCaretAtEnd(el){
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

function addTask(){
  const task = inputBox.value.trim();
  if(!task){
    inputBox.focus();
    inputBox.setAttribute("placeholder","Please write down a task ✨");
    return;
  }
  tasks.push({ id: Date.now(), text: task, completed: false, createdAt: new Date().toISOString() });
  inputBox.value = "";
  saveTasks();
  filter = "all";
  setActiveChip("all");
  render();
}

function deleteTask(id){
  if(confirm("Delete this task?")){
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    render();
  }
}

function updateCounters(){
  const completed = tasks.filter(t => t.completed).length;
  const uncompleted = tasks.length - completed;
  completedCounter.textContent = completed;
  uncompletedCounter.textContent = uncompleted;
}

function setActiveChip(name){
  chips.forEach(c => {
    const active = c.dataset.filter === name;
    c.classList.toggle("active", active);
    c.setAttribute("aria-selected", active ? "true":"false");
  });
}

function maybeCelebrate(){
  if(tasks.length > 0 && tasks.every(t => t.completed)){
    confetti.classList.add("active");
    setTimeout(() => confetti.classList.remove("active"), 800);
  }
}

// events
addBtn.addEventListener("click", addTask);
inputBox.addEventListener("keyup", (e) => { if(e.key === "Enter") addTask(); });
chips.forEach(c => c.addEventListener("click", () => { filter = c.dataset.filter; setActiveChip(filter); render(); }));
clearCompletedBtn.addEventListener("click", () => {
  const hadCompleted = tasks.some(t => t.completed);
  tasks = tasks.filter(t => !t.completed);
  if(hadCompleted){ saveTasks(); render(); }
});

exportBtn.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(tasks, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tasks-export.json";
  a.click();
  URL.revokeObjectURL(url);
});

importBtn.addEventListener("click", () => importFile.click());
importFile.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if(!file) return;
  try{
    const text = await file.text();
    const arr = JSON.parse(text);
    if(Array.isArray(arr)){
      tasks = arr.map(t => ({
        id: t.id ?? Date.now()+Math.random(),
        text: String(t.text ?? "").slice(0,120),
        completed: !!t.completed,
        createdAt: t.createdAt ?? new Date().toISOString()
      }));
      saveTasks();
      render();
    }else{
      alert("Invalid file format.");
    }
  }catch(err){
    alert("Couldn't import that file.");
  }finally{
    importFile.value = "";
  }
});

// initial paint
render();
