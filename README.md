# Sudoku

Jogo de Sudoku em HTML, CSS e JavaScript puro, com foco em acessibilidade, uso no celular e recuperação de progresso.

## Recursos

- Cinco níveis de dificuldade com tabuleiros de solução única.
- Modo **Normal** e modo **Notas** para rascunhar candidatos.
- Navegação completa por teclado e tabuleiro com semântica ARIA.
- Desfazer, refazer, limpar célula e até três dicas por partida.
- Pausa manual e pausa automática ao trocar de aba.
- Salvamento automático, retomada de jogo e aviso de conflito entre abas.
- Recordes por dificuldade e estatísticas de partidas, vitórias, sequências, tempo médio e dicas.
- Configurações de tema, limite de erros, política de erros, notas automáticas, realces, cronômetro e vibração.
- Tema claro, escuro e "seguir o sistema", com contraste revisado.
- Layout fluido para celular, alvos de toque maiores e respeito a `prefers-reduced-motion`.
- PWA instalável com funcionamento offline.

## Como executar

O jogo funciona abrindo `index.html` diretamente, mas o service worker (modo offline/PWA) só é registrado em HTTP ou HTTPS.

```sh
python3 -m http.server 8080
# Abra http://localhost:8080
```

Ou:

```sh
npm run serve
```

## Testes

```sh
npm test
```

Ou individualmente:

```sh
node tests/test.js
node tests/storage.test.js
```

Os testes cobrem geração e validação de tabuleiros, soluções únicas, cronômetro, persistência, validação de saves, recordes, estatísticas e configurações.

## Estrutura

```text
index.html                 Markup, diálogos e conteúdo de ajuda
css/style.css              Tokens de design, temas, layout e acessibilidade
js/constants.js            Constantes, dificuldades e configurações padrão
js/board.js                Geração, solver, unicidade e utilidades do tabuleiro
js/storage.js              Persistência, versionamento, validação, recordes e estatísticas
js/timer.js                Cronômetro baseado em tempo real
js/ui.js                   Tema, toasts, anúncios, diálogos e compartilhamento
js/renderer.js             Renderização, ARIA do tabuleiro, numpad e recordes
js/game.js                 Estado do jogo, entrada, teclado, pausa e fluxos
sw.js                      Cache offline
manifest.webmanifest       Configuração PWA
```

## Decisões de UX

- **Prevenção de perda:** novo jogo e troca de dificuldade não descartam uma partida em andamento sem confirmação.
- **Erros não contaminam o tabuleiro:** no modo padrão, o número errado é apenas um estado visual transitório. Ele nunca é gravado no tabuleiro nem no save. Isso elimina a corrida entre o flash de erro, novo jogo, pausa e desfazer.
- **Pausa de verdade:** enquanto pausado, tabuleiro e controles ficam inertes; o cronômetro para e a sidebar não aceita entrada.
- **Atalhos com escopo:** teclas de jogo não capturam botões, selects ou campos. Espaço ativa o controle focado; no tabuleiro, alterna Notas.
- **Diálogos nativos:** `<dialog>` fornece foco preso, `Esc`, restauração de foco e inércia do conteúdo de fundo.
- **Celular primeiro:** tabuleiro com largura fluida, sem overflow em 320 px, numpad próximo e dicas de teclado escondidas em dispositivos de toque.
- **Feedback em texto:** os erros têm contagem e anúncio em região `aria-live`, não dependem só das bolinhas verdes/vermelhas.
- **Configuração em vez de regra rígida:** limite de erros ajustável, erros ilimitados, erros mantidos ou removidos, cronômetro no primeiro movimento ou ao abrir.

## Persistência

As chaves usadas são:

- `sudoku-current-game`
- `sudoku-best-times`
- `sudoku-difficulty`
- `sudoku-settings`
- `sudoku-stats`
- `sudoku-seen-tip`

O save atual tem `SAVE_VERSION = 2`. Saves inválidos são descartados em vez de quebrar a inicialização. Se o `localStorage` estiver indisponível, o jogo avisa que o progresso não será salvo.

## PWA e cache

Ao alterar arquivos estáticos, incremente `CACHE_NAME` em `sw.js` para que os clientes recebam a nova versão. O service worker usa rede primeiro para navegação e cache para os demais recursos.

## Limitações conhecidas

- A dificuldade é baseada na quantidade de pistas e na garantia de solução única. Um classificador por técnicas (singles, pares, X-Wing) ainda não está implementado e o nível Mestre pode variar ligeiramente entre partidas.
- O histórico de desfazer/refazer fica em memória; ao recarregar, o tabuleiro é restaurado, mas o histórico recomeça.
- O conflito entre abas pausa a partida e avisa, mas não faz sincronização em tempo real.
- Não há desafio diário, compartilhamento de tabuleiro por seed ou sincronização entre dispositivos.

## Licença

MIT.
