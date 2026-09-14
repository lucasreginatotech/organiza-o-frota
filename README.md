# Painel da Frota

Site simples para o seu pai acompanhar, carro por carro: quanto recebeu, quanto gastou, o lucro e quando é a próxima troca de óleo. Funciona em qualquer aparelho (celular, tablet, computador) e os dados ficam sincronizados entre eles — quem tiver o link, vê a mesma informação atualizada.

Não precisa de aplicativo nem de servidor pago: o site fica hospedado de graça no GitHub Pages, e os dados ficam guardados de graça no Firebase (do Google).

Isso exige uma configuração única de uns 10 minutos. Depois disso, é só usar.

## Passo 1 — Criar o banco de dados gratuito (Firebase)

1. Acesse **https://console.firebase.google.com** e entre com uma conta Google.
2. Clique em **"Criar projeto"**, dê um nome (ex: `frota-do-pai`) e siga os passos (pode desativar o Google Analytics, não é necessário).
3. Dentro do projeto, no menu à esquerda, clique em **"Firestore Database"** → **"Criar banco de dados"**.
   - Escolha o local mais próximo (ex: `southamerica-east1`).
   - Selecione **"Iniciar em modo de teste"**.
4. Ainda no menu, clique no ícone de engrenagem (⚙) → **"Configurações do projeto"**.
5. Role até **"Seus aplicativos"** e clique no ícone **`</>`** (Web) para criar um app da Web.
   - Dê um apelido (ex: `painel-frota`) e clique em **"Registrar app"**.
6. O Firebase vai mostrar um bloco de código com `firebaseConfig = { ... }`. Copie esses valores.
7. Abra o arquivo **`firebase-config.js`** deste projeto e cole cada valor no lugar de `"COLE_AQUI"`.

### Ajustar as regras de acesso

Por padrão, o "modo de teste" libera o acesso por 30 dias e depois bloqueia. Para não expirar, ajuste a regra:

1. No Firestore, vá na aba **"Regras"**.
2. Substitua o conteúdo por:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /frota/{docId} {
         allow read, write: if true;
       }
     }
   }
   ```
3. Clique em **"Publicar"**.

> Nota: isso deixa os dados acessíveis para quem tiver o link do site — não há login. Para uso pessoal da família costuma ser suficiente, mas não é indicado para dados sensíveis.

## Passo 2 — Colocar o site no ar (GitHub Pages)

1. Crie um repositório novo no GitHub (pode ser privado ou público).
2. Suba estes arquivos para o repositório: `index.html`, `style.css`, `app.js`, `firebase-config.js` (já com suas chaves coladas).
3. No repositório, vá em **Settings → Pages**.
4. Em **"Source"**, escolha a branch `main` e a pasta `/ (root)`. Salve.
5. Depois de 1–2 minutos, o GitHub mostra o link do site, algo como:
   `https://seu-usuario.github.io/nome-do-repositorio/`
6. Esse é o link para mandar para o seu pai.

## Como usar

- **Adicionar carro**: toque em "+ adicionar carro", preencha nome, placa e a data da última troca de óleo.
- **Lançar receita ou gasto**: dentro do carro, toque em "+ lançamento", escolha "recebi" ou "gastei" e o valor.
- **Óleo**: o aviso muda de verde → amarelo (faltam 15 dias ou menos) → vermelho (atrasado), calculado a partir da última troca e do intervalo em meses que você definir.
- **Nome do painel**: toque no título no topo para renomear (ex: colocar o nome do seu pai ou da frota).

## Fazer alguma alteração depois

Qualquer mudança nos arquivos `.html`, `.css` ou `.js`: só subir de novo (commit) para o GitHub, e o site atualiza sozinho em 1–2 minutos.
