# Lembretes TI

Site simples para cadastrar reuniões/tarefas e receber lembretes.

## Como usar localmente

1. Abra o arquivo `index.html` no navegador.
2. Enquanto o Supabase não estiver configurado, ele salva no navegador usando localStorage.

## Como configurar Supabase

1. Crie um projeto no Supabase.
2. Vá em SQL Editor.
3. Cole e execute o conteúdo do arquivo `supabase.sql`.
4. Vá em Project Settings > API.
5. Copie a Project URL e a anon public key.
6. Cole no arquivo `config.js`.

## GitHub Pages

1. Crie um repositório no GitHub.
2. Envie estes arquivos.
3. Vá em Settings > Pages.
4. Em Source, selecione Deploy from a branch.
5. Escolha a branch main e a pasta `/root`.

## E-mail automático

Esta versão já tem o campo de e-mail e o campo `notificado_email` no banco.
A próxima etapa é criar uma automação com Supabase Edge Function + Cron ou n8n para enviar os lembretes mesmo com o navegador fechado.
