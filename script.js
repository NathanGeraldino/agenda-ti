const form = document.getElementById("formTarefa");
const lista = document.getElementById("listaTarefas");
const filtroStatus = document.getElementById("filtroStatus");
const btnCancelar = document.getElementById("btnCancelar");
const btnNotificacao = document.getElementById("btnNotificacao");
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
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
  });
}

function estaAtrasada(tarefa) {
  return tarefa.status !== "concluida" && new Date(tarefa.data_hora) < new Date();
}

async function carregarTarefas() {
  if (!supabaseConfigurado()) {
    tarefas = JSON.parse(localStorage.getItem("tarefas-ti") || "[]");
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

  tarefas = data || [];
  renderizar();
}

async function salvarTarefa(tarefa) {
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

  const data = new Date(t.data_hora);
  document.getElementById("tarefaId").value = t.id;
  document.getElementById("titulo").value = t.titulo;
  document.getElementById("descricao").value = t.descricao || "";
  document.getElementById("data").value = data.toISOString().slice(0, 10);
  document.getElementById("hora").value = data.toTimeString().slice(0, 5);
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
  const hoje = new Date().toISOString().slice(0, 10);

  const pendentes = tarefas.filter(t => t.status !== "concluida");
  document.getElementById("totalPendentes").textContent = pendentes.length;
  document.getElementById("totalHoje").textContent = pendentes.filter(t => t.data_hora.slice(0, 10) === hoje).length;
  document.getElementById("totalAtrasadas").textContent = pendentes.filter(estaAtrasada).length;

  const proxima = pendentes.filter(t => new Date(t.data_hora) >= new Date()).sort((a,b) => new Date(a.data_hora) - new Date(b.data_hora))[0];
  document.getElementById("proximoLembrete").innerHTML = proxima
    ? `<strong>Próximo:</strong><br>${proxima.titulo}<br><small>${formatarDataHora(proxima.data_hora)}</small>`
    : "Nenhum lembrete pendente.";

  let filtradas = [...tarefas];
  if (filtro === "pendente") filtradas = filtradas.filter(t => t.status !== "concluida");
  if (filtro === "concluida") filtradas = filtradas.filter(t => t.status === "concluida");
  filtradas.sort((a,b) => new Date(a.data_hora) - new Date(b.data_hora));

  if (!filtradas.length) {
    lista.innerHTML = `<div class="empty">Nenhum lembrete encontrado.</div>`;
    return;
  }

  lista.innerHTML = filtradas.map(t => {
    const atrasada = estaAtrasada(t);
    return `
      <article class="task">
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
}

function verificarNotificacoesLocais() {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const agora = new Date();
  tarefas.forEach(t => {
    if (t.status === "concluida") return;
    if (notificadasLocalmente.has(t.id)) return;

    const horario = new Date(t.data_hora);
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
    data_hora: dataHoraISO(document.getElementById("data").value, document.getElementById("hora").value),
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
  if (!("Notification" in window)) return mostrarToast("Seu navegador não suporta notificações.");
  const permission = await Notification.requestPermission();
  mostrarToast(permission === "granted" ? "Notificações ativadas." : "Notificações não foram permitidas.");
});

carregarTarefas();
setInterval(verificarNotificacoesLocais, 30000);
setInterval(carregarTarefas, 60000);
