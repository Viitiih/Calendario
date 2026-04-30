# Deploy no GitHub Pages

O projeto já está configurado para gerar o build em `docs/`.

## Como publicar

1. Rode `npm run build`.
2. No GitHub, crie um repositório chamado `calendario`.
3. Envie o código para a branch `main`.
4. No repositório, abra **Settings > Pages**.
5. Selecione a branch `gh-pages` como fonte de publicação.
6. Salve.

## Como funcionará

- O GitHub Actions irá rodar a cada push na branch `main`.
- Ele instala dependências, faz o build e publica a pasta `docs/` na branch `gh-pages`.
- O site será servido automaticamente pelo GitHub Pages.

## Observações

- Você não precisa enviar `node_modules`.
- O conteúdo publicado será o que estiver em `docs/`.
