# Passaporte GSK

Esta pasta contém a versão React/TypeScript do passaporte, preparada para edição no VS Code. Não há arquivos `.mjs` nem a implementação HTML paralela.

## Conexão com o Supabase

Esta versão salva o cadastro e os vistos na tabela `public.passaportes`. Não há login por e-mail: o navegador guarda somente o UUID do passaporte no `localStorage`, e o servidor Next.js acessa o Supabase.

1. Execute `supabase/configurar-sem-login.sql` no SQL Editor do Supabase.
2. Copie `.env.local.example` para `.env.local`.
3. Preencha `SUPABASE_URL` e `SUPABASE_SECRET_KEY` em `.env.local`.
4. Execute `npm run dev`.

A chave secreta é usada apenas pelas rotas do servidor em `app/api`. Nunca renomeie `SUPABASE_SECRET_KEY` para uma variável iniciada por `NEXT_PUBLIC_` e nunca envie o arquivo `.env.local` para outras pessoas.

## Como abrir

1. Instale Node.js 22.13 ou superior.
2. Abra esta pasta no VS Code.
3. Execute `npm install` no terminal.
4. Execute `npm run dev`.
5. Abra `http://localhost:5173` no navegador.

Os arquivos principais são `app/page.tsx` (interface e interações) e `app/globals.css` (estilo). O cadastro e os vistos continuam sendo apenas uma demonstração gravada no navegador. Ainda não há banco de dados ou leitura real de QR Code.

Se o sistema de envio também bloquear arquivos `.js` ou `.tsx`, envie o arquivo ZIP sem extrair e peça à pessoa que o extraia na máquina dela. Se o bloqueio for por política da empresa, use um meio de compartilhamento aprovado por ela.

## Vercel

cd "C:\caminho\do\seu\projeto"

- vercel whoami
- vercel login
- vercel link
- vercel

### depois de testar:
- vercel --prod

## Github

- git status
- git add .
- git commit -m "Descrição das alterações"
- git push

Remover área

## Link dos checkouts

- ?checkout=lecture-online (palestra online)
- ?checkout=lecture-presential (palestra presencial)
- ?checkout=activity (atividade)

## Para atualizar os qrcodes (por atividade e por dia)

update public.controle_checkouts
set
  ativo = true,
  data_evento = '2026-10-19'
where tipo = 'lecture-presential';