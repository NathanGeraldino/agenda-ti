const form = document.getElementById("formTarefa");
const lista = document.getElementById("listaTarefas");
const filtroStatus = document.getElementById("filtroStatus");
const btnCancelar = document.getElementById("btnCancelar");
const btnNotificacao = document.getElementById("btnNotificacao");
const btnTema = document.getElementById("btnTema");
const calendario = document.getElementById("calendario");
const calendarioMes = document.getElementById("calendarioMes");
const toast = document.getElementById("toast");

let tarefas = [];
let notificadasLocalmente = new Set();

function supabaseConfigurado() {
  return !SUPABASE_URL.includes("COLE_AQUI") && !SUPABASE_ANON_KEY.includes("COLE_AQUI");
}

function mostrarToast(msg) {
  toast.textContent = msg;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 4000);
}

function dataHoraISO(data, hora) {
  return `${data}T${hora}:00`;
}

function formatarDataHora(iso) {
  if (!iso) return "";

  const [data, horaCompleta] = iso.split("T");
  const [ano, mes, dia] = data.split("-");
  const hora = horaCompleta.slice(0, 5);

  return `${dia}/${mes}/${ano} ${hora}`;
}

function criarDataLocal(valor) {
  const [data, horaCompleta] = valor.split("T");
  const [ano, mes, dia] = data.split("-").map(Number);
  const [hora, minuto] = horaCompleta.split(":").map(Number);

  return new Date(ano, mes - 1, dia, hora, minuto);
}

function hojeLocalISO() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function normalizarDataHora(valor) {
  if (!valor) return "";

  return valor
    .replace(" ", "T")
    .replace("+00:00", "")
    .replace("Z", "")
    .slice(0, 19);
}

function estaAtrasada(tarefa) {
  return tarefa.status !== "concluida" && criarDataLocal(tarefa.data_hora) < new Date();
}

async function carregarTarefas() {
  if (!supabaseConfigurado()) {
    tarefas = JSON.parse(localStorage.getItem("tarefas-ti") || "[]").map(t => ({
      ...t,
      data_hora: normalizarDataHora(t.data_hora)
    }));

    renderizar();
    return;
  }

  const { data, error } = await supabaseClient
    .from("tarefas")
    .select("*")
    .order("data_hora", { ascending: true });

  if (error) {
    mostrarToast("Erro ao carregar tarefas: " + error.message);
    return;
  }

  tarefas = (data || []).map(t => ({
    ...t,
    data_hora: normalizarDataHora(t.data_hora)
  }));

  renderizar();
}

async function salvarTarefa(tarefa) {
  tarefa.data_hora = normalizarDataHora(tarefa.data_hora);

  if (!supabaseConfigurado()) {
    if (tarefa.id) {
      tarefas = tarefas.map(t => t.id === tarefa.id ? tarefa : t);
    } else {
      tarefa.id = crypto.randomUUID();
      tarefas.push(tarefa);
    }

    localStorage.setItem("tarefas-ti", JSON.stringify(tarefas));
    await carregarTarefas();
    return;
  }

  const { error } = tarefa.id
    ? await supabaseClient.from("tarefas").update(tarefa).eq("id", tarefa.id)
    : await supabaseClient.from("tarefas").insert(tarefa);

  if (error) mostrarToast("Erro ao salvar: " + error.message);

  await carregarTarefas();
}

async function atualizarStatus(id, status) {
  const tarefa = tarefas.find(t => t.id === id);
  if (!tarefa) return;

  if (!supabaseConfigurado()) {
    tarefa.status = status;
    localStorage.setItem("tarefas-ti", JSON.stringify(tarefas));
    renderizar();
    return;
  }

  await supabaseClient.from("tarefas").update({ status }).eq("id", id);
  await carregarTarefas();
}

async function excluirTarefa(id) {
  if (!confirm("Deseja excluir este lembrete?")) return;

  if (!supabaseConfigurado()) {
    tarefas = tarefas.filter(t => t.id !== id);
    localStorage.setItem("tarefas-ti", JSON.stringify(tarefas));
    renderizar();
    return;
  }

  await supabaseClient.from("tarefas").delete().eq("id", id);
  await carregarTarefas();
}

function editarTarefa(id) {
  const t = tarefas.find(item => item.id === id);
  if (!t) return;

  const dataHora = normalizarDataHora(t.data_hora);

  document.getElementById("tarefaId").value = t.id;
  document.getElementById("titulo").value = t.titulo;
  document.getElementById("descricao").value = t.descricao || "";
  document.getElementById("data").value = dataHora.slice(0, 10);
  document.getElementById("hora").value = dataHora.slice(11, 16);
  document.getElementById("prioridade").value = t.prioridade;
  document.getElementById("minutosAntes").value = t.minutos_antes;
  document.getElementById("email").value = t.email || "";

  btnCancelar.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function limparForm() {
  form.reset();
  document.getElementById("tarefaId").value = "";
  document.getElementById("prioridade").value = "media";
  document.getElementById("minutosAntes").value = "15";
  btnCancelar.classList.add("hidden");
}

function renderizar() {
  const filtro = filtroStatus.value;
  const hoje = hojeLocalISO();

  const pendentes = tarefas.filter(t => t.status !== "concluida");

  document.getElementById("totalPendentes").textContent = pendentes.length;
  document.getElementById("totalHoje").textContent = pendentes.filter(t => t.data_hora.slice(0, 10) === hoje).length;
  document.getElementById("totalAtrasadas").textContent = pendentes.filter(estaAtrasada).length;

  const concluidas = tarefas.filter(t => t.status === "concluida");
const totalGeral = tarefas.length;
const taxa = totalGeral > 0 ? Math.round((concluidas.length / totalGeral) * 100) : 0;

document.getElementById("totalConcluidas").textContent = concluidas.length;
document.getElementById("taxaConclusao").textContent = `${taxa}%`;
document.getElementById("totalReunioes").textContent = concluidas.length;

  const proxima = pendentes
    .sort((a, b) => criarDataLocal(a.data_hora) - criarDataLocal(b.data_hora))[0];

  const atrasada = proxima && criarDataLocal(proxima.data_hora) < new Date();

document.getElementById("proximoLembrete").innerHTML = proxima
  ? `
    <div style="font-size:12px;color:#6b7280;font-weight:bold;margin-bottom:8px;">
      ${atrasada ? "TAREFA ATRASADA" : "PRÓXIMO LEMBRETE"}
    </div>

    <div style="
      font-size:20px;
      font-weight:bold;
      color:${atrasada ? "#dc2626" : "#0d2ed3"};
    ">
      ${proxima.titulo}
    </div>

    <div style="margin-top:8px;">
      ${formatarDataHora(proxima.data_hora)}
    </div>

    <div style="margin-top:12px;color:#6b7280;">
      Aviso ${proxima.minutos_antes} minutos antes
    </div>
  `
  : `
    <div style="font-size:18px;font-weight:bold;">
      Nenhum lembrete pendente
    </div>
  `;

  let filtradas = [...tarefas];

  if (filtro === "pendente") filtradas = filtradas.filter(t => t.status !== "concluida");
  if (filtro === "concluida") filtradas = filtradas.filter(t => t.status === "concluida");

  filtradas.sort((a, b) => criarDataLocal(a.data_hora) - criarDataLocal(b.data_hora));

  if (!filtradas.length) {
    lista.innerHTML = `<div class="empty">Nenhum lembrete encontrado.</div>`;
    return;
  }

  lista.innerHTML = filtradas.map(t => {
    const atrasada = estaAtrasada(t);

    return `
      <article class="task prioridade-${t.prioridade}">
        <div>
          <h3>${t.titulo}</h3>
          <p>${t.descricao || "Sem descrição."}</p>
          <div class="meta">
            <span class="badge">${formatarDataHora(t.data_hora)}</span>
            <span class="badge ${t.prioridade}">${t.prioridade}</span>
            <span class="badge">Avisar ${t.minutos_antes} min antes</span>
            ${t.email ? `<span class="badge">${t.email}</span>` : ""}
            ${atrasada ? `<span class="badge atrasada">Atrasada</span>` : ""}
            ${t.status === "concluida" ? `<span class="badge concluida">Concluída</span>` : ""}
          </div>
        </div>
        <div class="actions">
          ${t.status !== "concluida" ? `<button class="done" onclick="atualizarStatus('${t.id}', 'concluida')">✓</button>` : `<button class="done" onclick="atualizarStatus('${t.id}', 'pendente')">↺</button>`}
          <button class="edit" onclick="editarTarefa('${t.id}')">✎</button>
          <button class="delete" onclick="excluirTarefa('${t.id}')">🗑</button>
        </div>
      </article>
    `;
  }).join("");
  renderizarCalendario();
}

function renderizarCalendario() {
  if (!calendario || !calendarioMes) return;

  const hoje = new Date();
  const mesSelecionado =
    calendarioMes.value ||
    `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;

  calendarioMes.value = mesSelecionado;

  const [ano, mes] = mesSelecionado.split("-").map(Number);
  const primeiroDiaSemana = new Date(ano, mes - 1, 1).getDay();
  const ultimoDia = new Date(ano, mes, 0).getDate();

  const nomesDias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  calendario.innerHTML = nomesDias
    .map(dia => `<div class="calendar-weekday">${dia}</div>`)
    .join("");

  for (let i = 0; i < primeiroDiaSemana; i++) {
    calendario.innerHTML += `<div class="calendar-day empty-day"></div>`;
  }

  for (let dia = 1; dia <= ultimoDia; dia++) {
    const dataISO = `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

    const tarefasDia = tarefas.filter(t => t.data_hora.slice(0, 10) === dataISO);

    calendario.innerHTML += `
      <div class="calendar-day ${tarefasDia.length ? "has-event" : ""}">
        <strong>${dia}</strong>

        <div class="calendar-events">
          ${tarefasDia.map(t => `
            <span class="calendar-item prioridade-${t.prioridade}">
              ${t.status === "concluida" ? "✓" : "•"} ${t.titulo}
            </span>
          `).join("")}
        </div>
      </div>
    `;
  }
}

function verificarNotificacoesLocais() {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const agora = new Date();

  tarefas.forEach(t => {
    if (t.status === "concluida") return;
    if (notificadasLocalmente.has(t.id)) return;

    const horario = criarDataLocal(t.data_hora);
    const aviso = new Date(horario.getTime() - Number(t.minutos_antes) * 60000);

    if (agora >= aviso && agora <= horario) {
      new Notification("Lembrete TI", {
        body: `${t.titulo} - ${formatarDataHora(t.data_hora)}`
      });

      notificadasLocalmente.add(t.id);
      mostrarToast(`Lembrete: ${t.titulo}`);
    }
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = document.getElementById("tarefaId").value;

  const tarefa = {
    titulo: document.getElementById("titulo").value.trim(),
    descricao: document.getElementById("descricao").value.trim(),
    data_hora: dataHoraISO(
      document.getElementById("data").value,
      document.getElementById("hora").value
    ),
    prioridade: document.getElementById("prioridade").value,
    minutos_antes: Number(document.getElementById("minutosAntes").value),
    email: document.getElementById("email").value.trim(),
    status: "pendente",
    notificado_email: false
  };

  if (id) tarefa.id = id;

  await salvarTarefa(tarefa);
  limparForm();
  mostrarToast("Lembrete salvo com sucesso.");
});

btnCancelar.addEventListener("click", limparForm);

filtroStatus.addEventListener("change", renderizar);

btnNotificacao.addEventListener("click", async () => {
  if (!("Notification" in window)) {
    return mostrarToast("Seu navegador não suporta notificações.");
  }

  const permission = await Notification.requestPermission();

  if (permission === "granted") {
    mostrarToast("Notificações ativadas.");
    btnNotificacao.style.display = "none";
  } else {
    mostrarToast("Notificações não foram permitidas.");
  }
});

if ("Notification" in window && Notification.permission === "granted") {
  btnNotificacao.style.display = "none";
}

const temaSalvo = localStorage.getItem("tema-lembretes");

if (temaSalvo === "dark") {
  document.body.classList.add("dark");
  btnTema.textContent = "☀️ Modo claro";
}

btnTema.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  const darkAtivo = document.body.classList.contains("dark");

  localStorage.setItem("tema-lembretes", darkAtivo ? "dark" : "light");
  btnTema.textContent = darkAtivo ? "☀️ Modo claro" : "🌙 Modo escuro";
});

calendarioMes.addEventListener("change", renderizarCalendario);

carregarTarefas();

setInterval(verificarNotificacoesLocais, 30000);
setInterval(carregarTarefas, 60000);
