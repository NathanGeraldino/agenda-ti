const { createClient } = require("@supabase/supabase-js");
const { Resend } = require("resend");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const resend = new Resend(process.env.RESEND_API_KEY);

async function executar() {
  const agora = new Date();

  const { data: tarefas, error } = await supabase
    .from("tarefas")
    .select("*")
    .eq("status", "pendente")
    .eq("notificado_email", false);

  console.log("Agora:", agora.toISOString());
console.log("Tarefas encontradas:", tarefas.length);
console.table(tarefas.map(t => ({
  titulo: t.titulo,
  data_hora: t.data_hora,
  minutos_antes: t.minutos_antes,
  email: t.email,
  status: t.status,
  notificado_email: t.notificado_email
})));

  if (error) {
    console.error(error);
    return;
  }
  

  for (const tarefa of tarefas) {
    if (!tarefa.email) continue;

    const horario = new Date(tarefa.data_hora);

    const aviso = new Date(
      horario.getTime() - tarefa.minutos_antes * 60000
    );

    console.log("Verificando:", tarefa.titulo);
console.log("Horário:", horario.toISOString());
console.log("Aviso:", aviso.toISOString());
console.log("Pode enviar?", agora >= aviso);

    if (agora >= aviso) {
      try {
        await resend.emails.send({
          from: "Lembretes TI <onboarding@resend.dev>",
          to: tarefa.email,
          subject: `🔔 Lembrete TI: ${tarefa.titulo}`,
          html: `
            <h2>${tarefa.titulo}</h2>

            <p>
              <strong>Data:</strong>
              ${horario.toLocaleString("pt-BR")}
            </p>

            <p>
              <strong>Descrição:</strong><br>
              ${tarefa.descricao || "Sem descrição"}
            </p>

            <hr>

            <p>
              Este e-mail foi enviado automaticamente pelo sistema
              Lembretes TI.
            </p>
          `
        });

        await supabase
          .from("tarefas")
          .update({
            notificado_email: true
          })
          .eq("id", tarefa.id);

        console.log(
          `E-mail enviado para ${tarefa.email}`
        );

      } catch (erro) {
        console.error(erro);
      }
    }
  }
}

executar();
