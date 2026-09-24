# Direção visual — Login, cabeçalho, banner de erro e modal do e-mail

Data: 2026-09-24 · Planejado com `impeccable shape` · Build: code-led (sem comp; não há geração de imagem nesta máquina)
Status: aprovado pelo usuário em 2026-09-24

## 1. Trabalho e público

- **Quem:** o dono do app (e, no futuro, outras pessoas com o próprio Gmail) abrindo o app de vez em quando para ver o gasto do mês com Uber. Modo **Operate**: a tarefa manda, a expressão vive nos detalhes.
- **Primeira vez:** a tela de Login é a porta. Precisa deixar claro o que o app faz, por que pede uma *senha de app* (e não a senha do Google) e que a senha fica guardada com segurança — sem jargão.
- **Sucesso:** entrar em menos de um minuto na primeira vez; nas próximas, cair direto na Home.

## 2. Direção escolhida — "Prospecto Cívico" (late-modern corporate)

Escolhida pelo usuário na página de decisão (rodada 2; sorteio `d52a6010`, re-roll 1, card *challenger-civic*). Referências de acabamento: `.impeccable/mocks/decision/civic-hero.png` e `civic-board.png` — calibram o nível de acabamento, não a composição.

- **Tese:** quase tudo é branco-osso vazio; toda a cor do mundo é gasta numa única fita de luz (verde-água → lilás → violeta) e num único botão violeta. O texto carrega o argumento em dois pesos de uma só face.
- **O que ela recusa:** o card de login centralizado com sombra e o dashboard de KPIs em cards — o padrão da categoria.
- **Tradução para o produto:** a fita é a "corrida" do mês — um traço contínuo que atravessa a borda direita do Login. Nada de banco, skyline ou selos do mundo original (o produto não tem esses fatos). Nenhuma marca da Uber.

### Mundo (tokens)

| Papel | Claro | Escuro |
|---|---|---|
| Fundo (ground) | `#F7F7FA` → `#FFFFFF` | `#0F0D24` |
| Superfície (painel, input) | `#FFFFFF` | `#17143A` |
| Tinta (títulos) | `#1B1547` — nunca preto puro | `#EDEBFA` |
| Corpo | `#4B5165` | `#B7B4D1` |
| Violeta (ação, foco, 2ª linha do título) | `#6B5CE7`, hover `#5A4BD6`, ativo `#3F3499` | `#8F84F0`, hover `#A39AF4` |
| Hairline | `#E6E7EE` | `#2A2657` |
| Fita | `#7FD8D0` → `#C9B8F0` → `#5B4FD6` | mesmos, 85% de opacidade |
| Erro (só erro) | `#C2364B`, fundo `#C2364B` a 6% | `#F07A8C`, fundo a 12% |

Os tokens entram em `src/renderer/src/assets/base.css` mapeados nas variáveis do shadcn (`--background`, `--foreground`, `--primary`, `--border`, `--ring`, `--destructive`, `--muted-foreground`), para que o resto do app (tabela, gráfico) já herde a paleta sem ser redesenhado agora.

- **Tipo:** uma grotesca geométrica, pesos **400 e 500 apenas**. Face: **Figtree** (OFL), com o woff2 empacotado em `src/renderer/src/assets/fonts/` e `@font-face` no `base.css`. É um arquivo de fonte, não uma dependência npm, e funciona offline. Algarismos com `font-variant-numeric: tabular-nums` em todo valor em reais.
- **Escala (janela desktop):** título do Login 56px/1.05 (500), deck 18px/1.6 (400, cor corpo), rótulo 14px/500, corpo 15px, legenda 13px.
- **Forma:** raio 8px em botão e input, 12px em painel e modal; separação por hairline de 1px, sem sombra (exceto uma sombra única e difusa no modal).
- **Movimento:** `cubic-bezier(.25,1,.5,1)` 0.3s para hover e foco; painel que surge sobe 24px em 0.8s `cubic-bezier(.165,.84,.44,1)`. Com `prefers-reduced-motion` tudo aparece no lugar, sem deslocamento.

## 3. Superfícies

### 3.1 Tela de Login

**Composição (primeira tela):** janela inteira sobre o fundo branco-osso.
- **Coluna esquerda** (até 48% da largura, texto alinhado à esquerda, margem 96px, centrada na vertical):
  1. Marca pequena: ícone de recibo (lucide `ReceiptText`, 24px, tinta) + nome do app em 18px/500. *O nome do app é decisão em aberto (ver §5); até lá, "Recibos de corrida".*
  2. Título em duas linhas — linha 1 em tinta, linha 2 em violeta: **"Seu mês de corridas,"** / **"num só lugar."**
  3. Deck (máx. 44ch): "Conecte o Gmail onde chegam os recibos da Uber. O app só lê esses recibos — nada é enviado nem apagado."
  4. Formulário (largura 380px, gap 16px):
     - Rótulo "E-mail do Gmail" + input.
     - Rótulo "Senha de app" + input do tipo senha. Logo abaixo, uma legenda de 13px: "Não é a senha normal do Google. [Gere uma senha de app ↗] — leva 1 minuto e exige verificação em duas etapas." O link é violeta e sublinhado no hover.
     - Linha de erro (`role="alert"`), só quando há erro.
     - Botão primário cheio em violeta, com o texto "Entrar" e um chevron à direita, ocupando a largura do formulário, com 44px de altura.
  5. Nota de confiança, 13px na cor do corpo, com ícone `LockKeyhole` 14px: "Sua senha fica guardada cifrada neste computador."
- **Borda direita:** a **fita** sangra do topo ao pé da janela, ocupando cerca de 45% da largura.
  - É um único `<svg>` com um path largo e um gradiente linear nas três cores da fita, mais um segundo path mais claro para dar volume. É decorativa (`aria-hidden`).
  - **Interação assinatura:** a crista da fita se curva até 12px na direção do cursor, com transição de 0.3s. Com reduced-motion, fica estática.
- **Abaixo de 900px de largura:** a fita vira uma faixa de 120px no topo e a coluna ocupa a largura inteira.

**Estados:**

| Estado | O que muda |
|---|---|
| Vazio | O foco começa no e-mail (`autoFocus`) e o botão fica habilitado. A validação acontece no main. |
| Enviando | O botão mostra "Verificando…" com um spinner de 16px à esquerda e fica `disabled`. Os inputs ficam `readOnly`. A fita desacelera, sem pausar. |
| Erro | Um texto de 14px em cor de erro, com ícone `CircleAlert`, aparece sob os campos. A mensagem vem do main: "E-mail ou senha de app incorretos.", "Não foi possível conectar ao Gmail. Verifique sua internet." ou "Este computador não oferece armazenamento seguro de senhas…". Os inputs ganham `aria-invalid` e borda de erro, e o foco volta para a senha. |
| Sucesso | A coluna esmaece (0.3s) e a Home entra com o painel subindo 24px. |

**Acessibilidade:**
- Cada rótulo é um `<label>` ligado ao seu input.
- A ordem de tab é e-mail → senha → link → Entrar.
- O link abre no navegador do sistema (`target="_blank"`, `https:`).
- O contraste do violeta `#6B5CE7` sobre branco é 4.9:1 e cumpre AA para o texto do botão, que é branco sobre violeta.
- O anel de foco tem 3px em violeta a 40%.

### 3.2 Cabeçalho da Home

- **Barra:** 64px de altura, fixa no topo, com fundo igual ao fundo da página e hairline inferior de 1px.
  - **Esquerda:** a mesma marca do Login (ícone + nome, 16px/500).
  - **Direita:** o e-mail logado em 14px na cor do corpo e truncado com reticências a partir de 32ch, com `title` mostrando o completo. Depois, **24px de espaço vazio**, e só então o botão secundário "Sair": contorno de 1px em violeta, texto violeta, 32px de altura e ícone `LogOut` 14px. É uma ação destrutiva, então fica isolada, sem nenhum outro botão por perto.
- **Estado "saindo":** o botão fica `disabled` enquanto o logout roda. Se o logout falhar, o erro aparece no banner (3.3).
- **Acessibilidade:** a barra é um `<header>`; o botão tem o nome acessível "Sair da conta {e-mail}".

### 3.3 Banner de erro da Home

- **Posição:** logo abaixo do formulário de busca, dentro do trilho de conteúdo (máx. 1180px), empurrando o conteúdo para baixo. Não é toast.
- **Forma:** painel com raio de 12px, borda de 1px em cor de erro a 30%, fundo de erro a 6% e padding 16px 20px.
  - À esquerda, o ícone `CircleAlert` de 20px na cor do erro.
  - Ao centro, um título de 15px/500 em tinta e a mensagem de 14px na cor do corpo.
  - À direita, um botão só de ícone `X` 16px com o rótulo "Fechar aviso".
- **Título por código de erro** (a mensagem vem do main):
  - `NETWORK` → "Sem conexão com o Gmail"
  - `AUTH_FAILED` → "Sua senha de app não vale mais", com a mensagem complementada por "Saia e entre de novo com uma senha nova."
  - `INVALID_INPUT` → "Mês ou ano inválido"
  - `UNKNOWN` e demais → "Algo deu errado"
- **Comportamento:** o banner some numa nova busca bem-sucedida ou ao fechar. Aparece com fade + 8px de subida (0.3s); com reduced-motion, aparece direto.
- **Acessibilidade:** `role="alert"` no painel. O foco não é roubado, porque o alerta é anunciado sozinho.

### 3.4 Modal "E-mail original"

- **Gatilho:** o texto "Ver e-mail original" com ícone `Mail` de 14px, dentro do detalhe da corrida. É um `<button>`, não um `<a>`.
- **Overlay:** tinta `#1B1547` a 45% no claro e preto a 60% no escuro.
- **Painel:**
  - Superfície com raio de 12px, 920px de largura máxima e 85vh de altura. Sobe 24px ao abrir, em 0.3s.
  - **Cabeçalho:** o título "E-mail original" em 20px/500, tinta. Abaixo, a legenda de 13px na cor do corpo com ícone `ShieldCheck` de 14px: "Scripts e imagens externas ficam bloqueados por segurança." No canto, o botão de fechar `X`.
  - **Corpo:** o `<iframe sandbox="" srcDoc>` preenche o resto da altura, com fundo sempre branco (o HTML do recibo assume fundo claro, mesmo no tema escuro), hairline de 1px e raio de 8px.
- **Estados:**
  - Abrindo: o painel sobe.
  - Conteúdo vazio (HTML vazio): em vez do iframe, uma mensagem centralizada: "Este recibo não tem conteúdo para mostrar."
- **Acessibilidade:**
  - O foco fica preso no modal (Radix) e volta para o gatilho ao fechar. `Esc` fecha.
  - O `<iframe title="Conteúdo do e-mail">` é navegável por tab, mas não executa nada.

## 4. Limites e anti-objetivos

- **Entra agora:** tokens no `base.css` (claro e escuro), a fonte, o Login, o cabeçalho, o banner, o modal e os primitivos `Input` e `Dialog` no novo estilo.
- **Não entra agora:** redesenhar a tabela, o gráfico de pizza e o formulário de busca da Home, que é o subprojeto 4. Eles só herdam as cores novas pelos tokens.
- **Anti-objetivos:**
  - Glassmorphism, gradiente em botão, sombra em card, emoji na UI nova e múltiplos acentos.
  - Qualquer marca, cor ou logo da Uber.
  - Preto puro.
- **Sem nova dependência npm:** a fita é SVG + CSS, e as animações usam CSS (ou o `framer-motion`, que já existe).

## 5. Decisões em aberto (o build não inventa)

- **Nome do app:** até o usuário decidir, a marca mostra "Recibos de corrida". Trocar depois é mudar uma string só.
- **Fonte:** Figtree é a escolha deste brief. Se o usuário preferir outra geométrica, só muda o arquivo woff2 e o `@font-face`.

## 6. Contrato de direção (para o build e a revisão final)

- **THESIS:** branco-osso vazio; toda a cor gasta numa fita contínua e num botão violeta. Recusa o card de login com sombra e o dashboard de cards.
- **OWN-WORLD:**
  - Fundo `#F7F7FA`, tinta `#1B1547`, violeta `#6B5CE7`, hairline `#E6E7EE`.
  - Fita verde-água → lilás → violeta.
  - Figtree 400/500, raios de 8 e 12px, sem sombra, algarismos tabulares.
- **STORY:** a pessoa entende que o app lê só os recibos da Uber do próprio Gmail, confia que a senha fica cifrada, entra, e depois vê o mês.
- **FIRST VIEWPORT:**
  - Coluna esquerda com 48% da largura: marca, título em duas linhas de 56px (a segunda em violeta), deck, formulário de 380px e botão "Entrar" violeta de largura cheia.
  - A fita sangra pelos 45% da direita.
- **FORM:** challenger `civic-bureau-prospectus-late-modern`, escolhido pelo usuário (rodada 2), sorteio `d52a6010`.
- **FINISH:** "unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance".
