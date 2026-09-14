import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore, doc, onSnapshot, setDoc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { firebaseConfig, DOC_PATH } from "./firebase-config.js";

// ---------- Firebase ----------
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const stateRef = doc(db, DOC_PATH.collection, DOC_PATH.doc);

// ---------- Estado local ----------
let state = { nomeFrota: "Frota do Angelo", cars: [] };
let editingCarId = null;   // carro sendo editado no modal de carro
let entryCarId = null;     // carro alvo do modal de lançamento
let entryTipo = "receita";
let isTypingName = false;

const $ = (sel) => document.querySelector(sel);
const fmtMoney = (n) => (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ---------- Sincronização em tempo real ----------
const syncEl = $("#syncStatus");

onSnapshot(stateRef,
  (snap) => {
    if (snap.exists()) {
      state = snap.data();
      if (!state.cars) state.cars = [];
    }
    syncEl.textContent = "sincronizado";
    syncEl.className = "sync-status ok";
    render();
  },
  (err) => {
    console.error(err);
    syncEl.textContent = "sem conexão com os dados";
    syncEl.className = "sync-status erro";
  }
);

let saveTimeout = null;
function persist() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    setDoc(stateRef, state).catch((err) => {
      console.error(err);
      syncEl.textContent = "não salvou — verifique a internet";
      syncEl.className = "sync-status erro";
    });
  }, 250);
}

// ---------- Nome da frota ----------
const nomeEl = $("#nomeFrota");
nomeEl.addEventListener("focus", () => (isTypingName = true));
nomeEl.addEventListener("blur", () => {
  isTypingName = false;
  const txt = nomeEl.textContent.trim() || "Frota do Angelo";
  nomeEl.textContent = txt;
  state.nomeFrota = txt;
  persist();
});
nomeEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); nomeEl.blur(); }
});

// ---------- Cálculo de óleo ----------
function nextOilChange(car) {
  if (!car.oilLastChangeDate) return null;
  const last = new Date(car.oilLastChangeDate + "T00:00:00");
  const due = new Date(last);
  due.setMonth(due.getMonth() + (car.oilIntervalMonths || 3));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due - today) / 86400000);
  return { due, diffDays };
}

function oilBadgeHTML(car) {
  const info = nextOilChange(car);
  if (!info) {
    return `<div class="oil-badge oil-warn"><span class="dot"></span>data da última troca não informada</div>`;
  }
  const { diffDays } = info;
  if (diffDays < 0) {
    return `<div class="oil-badge oil-due"><span class="dot"></span>troca de óleo atrasada há ${Math.abs(diffDays)} dia(s)</div>`;
  }
  if (diffDays <= 15) {
    return `<div class="oil-badge oil-warn"><span class="dot"></span>trocar óleo em ${diffDays} dia(s)</div>`;
  }
  return `<div class="oil-badge oil-ok"><span class="dot"></span>próxima troca em ${diffDays} dias</div>`;
}

// ---------- Render ----------
function carTotals(car) {
  let receita = 0, despesa = 0;
  (car.entries || []).forEach((e) => {
    if (e.type === "receita") receita += Number(e.amount) || 0;
    else despesa += Number(e.amount) || 0;
  });
  return { receita, despesa, lucro: receita - despesa };
}

function render() {
  if (!isTypingName) nomeEl.textContent = state.nomeFrota || "Frota do Angelo";

  let totalReceita = 0, totalDespesa = 0;
  (state.cars || []).forEach((car) => {
    const t = carTotals(car);
    totalReceita += t.receita;
    totalDespesa += t.despesa;
  });
  $("#totalReceita").textContent = fmtMoney(totalReceita);
  $("#totalDespesa").textContent = fmtMoney(totalDespesa);
  $("#totalLucro").textContent = fmtMoney(totalReceita - totalDespesa);

  const grid = $("#carsGrid");
  const emptyHint = $("#emptyHint");
  grid.innerHTML = "";

  if (!state.cars || state.cars.length === 0) {
    emptyHint.hidden = false;
    return;
  }
  emptyHint.hidden = true;

  state.cars.forEach((car) => {
    const t = carTotals(car);
    const entriesSorted = [...(car.entries || [])].sort((a, b) => (a.date < b.date ? 1 : -1));

    const entriesHTML = entriesSorted.length
      ? entriesSorted.map((e) => `
        <div class="entry-row">
          <div style="min-width:0">
            <div class="entry-desc">${escapeHTML(e.description || (e.type === "receita" ? "Recebimento" : "Gasto"))}</div>
            ${e.renter ? `<div class="entry-renter">👤 ${escapeHTML(e.renter)}</div>` : ""}
            <div class="entry-date">${formatDateBR(e.date)}</div>
          </div>
          <div style="display:flex; align-items:center;">
            <span class="entry-value ${e.type}">${e.type === "receita" ? "+" : "−"} ${fmtMoney(e.amount)}</span>
            <button class="entry-remove" data-car="${car.id}" data-entry="${e.id}" title="remover" aria-label="remover lançamento">✕</button>
          </div>
        </div>`).join("")
      : `<div class="entry-empty">nenhum lançamento ainda</div>`;

    const card = document.createElement("div");
    card.className = "car-card";
    card.innerHTML = `
      <div class="car-card-head">
        <div>
          <div class="car-name">${escapeHTML(car.nome)}</div>
          ${car.placa ? `<span class="car-plate">${escapeHTML(car.placa)}</span>` : ""}
        </div>
      </div>
      ${oilBadgeHTML(car)}
      <div class="car-stats">
        <div class="car-stat">
          <span class="car-stat-label">recebido</span>
          <span class="car-stat-value pos">${fmtMoney(t.receita)}</span>
        </div>
        <div class="car-stat">
          <span class="car-stat-label">gasto</span>
          <span class="car-stat-value neg">${fmtMoney(t.despesa)}</span>
        </div>
        <div class="car-stat">
          <span class="car-stat-label">lucro</span>
          <span class="car-stat-value ${t.lucro >= 0 ? "pos" : "neg"}">${fmtMoney(t.lucro)}</span>
        </div>
      </div>
      <div class="entries-list">${entriesHTML}</div>
      <div class="car-card-foot">
        <button class="btn btn-small btn-primary" data-action="add-entry" data-car="${car.id}">+ lançamento</button>
        <button class="btn btn-small btn-ghost" data-action="edit-car" data-car="${car.id}">editar</button>
        <button class="btn btn-small btn-ghost btn-danger-text" data-action="delete-car" data-car="${car.id}">excluir</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

function escapeHTML(str) {
  const d = document.createElement("div");
  d.textContent = str ?? "";
  return d.innerHTML;
}
function formatDateBR(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// ---------- Ações na grade (delegação de eventos) ----------
$("#carsGrid").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const action = btn.dataset.action;
  const carId = btn.dataset.car;

  if (action === "add-entry") openLancamentoDialog(carId);
  if (action === "edit-car") openCarDialog(carId);
  if (action === "delete-car") deleteCar(carId);

  if (btn.classList.contains("entry-remove")) {
    const entryId = btn.dataset.entry;
    removeEntry(carId, entryId);
  }
});

function deleteCar(carId) {
  const car = state.cars.find((c) => c.id === carId);
  if (!car) return;
  if (!confirm(`Excluir "${car.nome}" e todo o histórico dele?`)) return;
  state.cars = state.cars.filter((c) => c.id !== carId);
  persist();
  render();
}

function removeEntry(carId, entryId) {
  const car = state.cars.find((c) => c.id === carId);
  if (!car) return;
  car.entries = (car.entries || []).filter((e) => e.id !== entryId);
  persist();
  render();
}

// ---------- Modal: carro ----------
const dialogCarro = $("#dialogCarro");
$("#btnNovoCarro").addEventListener("click", () => openCarDialog(null));
$("#btnCancelarCarro").addEventListener("click", () => dialogCarro.close());

function openCarDialog(carId) {
  editingCarId = carId;
  const car = carId ? state.cars.find((c) => c.id === carId) : null;
  $("#dialogCarroTitulo").textContent = car ? "Editar carro" : "Novo carro";
  $("#inputCarroNome").value = car?.nome || "";
  $("#inputCarroPlaca").value = car?.placa || "";
  $("#inputOleoData").value = car?.oilLastChangeDate || "";
  $("#inputOleoIntervalo").value = car?.oilIntervalMonths || 3;
  dialogCarro.showModal();
}

$("#formCarro").addEventListener("submit", (e) => {
  e.preventDefault();
  const nome = $("#inputCarroNome").value.trim();
  if (!nome) return;
  const payload = {
    nome,
    placa: $("#inputCarroPlaca").value.trim(),
    oilLastChangeDate: $("#inputOleoData").value || null,
    oilIntervalMonths: Number($("#inputOleoIntervalo").value) || 3,
  };

  if (editingCarId) {
    const car = state.cars.find((c) => c.id === editingCarId);
    Object.assign(car, payload);
  } else {
    state.cars = state.cars || [];
    state.cars.push({ id: crypto.randomUUID(), entries: [], ...payload });
  }
  persist();
  render();
  dialogCarro.close();
});

// ---------- Modal: lançamento ----------
const dialogLancamento = $("#dialogLancamento");
$("#btnCancelarLancamento").addEventListener("click", () => dialogLancamento.close());

document.querySelectorAll(".tipo-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tipo-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    entryTipo = btn.dataset.tipo;
    toggleLocatarioField();
  });
});

function toggleLocatarioField() {
  $("#labelLocatario").style.display = entryTipo === "receita" ? "flex" : "none";
}

function openLancamentoDialog(carId) {
  entryCarId = carId;
  entryTipo = "receita";
  document.querySelectorAll(".tipo-btn").forEach((b) => b.classList.remove("active"));
  $(".tipo-receita").classList.add("active");
  $("#inputValor").value = "";
  $("#inputDescricao").value = "";
  $("#inputLocatario").value = "";
  $("#inputData").value = new Date().toISOString().slice(0, 10);
  toggleLocatarioField();
  dialogLancamento.showModal();
}

$("#formLancamento").addEventListener("submit", (e) => {
  e.preventDefault();
  const car = state.cars.find((c) => c.id === entryCarId);
  if (!car) return;
  const amount = Number($("#inputValor").value);
  if (!amount || amount <= 0) return;

  car.entries = car.entries || [];
  car.entries.push({
    id: crypto.randomUUID(),
    type: entryTipo,
    amount,
    date: $("#inputData").value || new Date().toISOString().slice(0, 10),
    description: $("#inputDescricao").value.trim(),
    renter: entryTipo === "receita" ? $("#inputLocatario").value.trim() : "",
  });
  persist();
  render();
  dialogLancamento.close();
});

render();
