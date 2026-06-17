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

  if (error) {
    console.error("Erro Supabase:", error);
    return;
  }

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

  for (const tarefa of tarefas) {
    if (!tarefa.email) continue;

    const horario = new Date(tarefa.data_hora);
    const aviso = new Date(
      horario.getTime() - Number(tarefa.minutos_antes) * 60000
    );

    console.log("Verificando:", tarefa.titulo);
    console.log("Horário:", horario.toISOString());
    console.log("Aviso:", aviso.toISOString());
    console.log("Pode enviar?", agora >= aviso);

    if (agora >= aviso) {
      const resultado = await resend.emails.send({
        from: "Lembretes TI <onboarding@resend.dev>",
        to: tarefa.email,
        subject: `🔔 Lembrete TI: ${tarefa.titulo}`,
        html: `
          <div style="font-family: Arial, sans-serif; color: #111827;">
            <h2 style="color:#0d2ed3;">🔔 Lembrete TI</h2>

            <p>Você possui um lembrete agendado.</p>

            <div style="border-left:4px solid #0d2ed3;padding-left:14px;margin:18px 0;">
              <h3 style="margin:0 0 8px;">${tarefa.titulo}</h3>

              <p style="margin:4px 0;">
                <strong>Data/Hora:</strong>
                ${horario.toLocaleString("pt-BR")}
              </p>

              <p style="margin:4px 0;">
                <strong>Prioridade:</strong>
                ${tarefa.prioridade || "Não informada"}
              </p>

              <p style="margin:4px 0;">
                <strong>Descrição:</strong><br>
                ${tarefa.descricao || "Sem descrição"}
              </p>
            </div>

            <p style="font-size:12px;color:#6b7280;">
              Este e-mail foi enviado automaticamente pelo sistema Lembretes TI.
            </p>
          </div>
        `
      });

      console.log("Resposta Resend:", resultado);

      if (resultado.error) {
        console.error("Erro Resend:", resultado.error);
        continue;
      }

      await supabase
        .from("tarefas")
        .update({ notificado_email: true })
        .eq("id", tarefa.id);

      console.log(`E-mail enviado e marcado como notificado: ${tarefa.email}`);
    }
  }
}

executar();
