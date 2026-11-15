# STATE

## Decisions

### AD-001
- **Decision**: Usar servidor Express.js no backend Node.js com persistência atômica em arquivos `.json` e SPA Front-end em ES Modules nativos com CSS/SVG temático de Bomberman (zero dependências no front-end) e testes nativos via `node --test`.
- **Reason**: Combina a ergonomia de rotas HTTP do Express.js escolhida pelo usuário com front-end e suíte de testes sem dependências pesadas de build/transpilação (`question: "1. Arquitetura do sistema (Design)" / answer: "servidor Express.js + SPA Front-end em ES Modules e CSS/SVG Arcade Bomberman"`).
- **Trade-off**: Requer o pacote `express` em `node_modules` para o servidor HTTP, mantendo o cliente web livre de bundlers.
- **Scope**: Todo o repositório `bomber-tournament` (servidor HTTP, persistência, front-end e testes).
- **Date**: 2026-11-15
- **Status**: active

## Handoff
