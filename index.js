const express = require("express");
const dotenv = require("dotenv");
const session = require("express-session");

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const app = express();
const users = [];
const messages = [];

function menu(user) {
  if (user) {
    return `
    <div><a href="/">Tela Inicial</a></div>
    <div><a href="/cadastrar">Cadastro de usuários</a></div>
    <div><a href="/chat">Bate papo</a></div>
    <div>${user.username} - ${user.lastLogin}</div>
      <div><a href="/sair">Sair</a></div>`;
  }

  return "";
}

// Retorna o conteúdo HTML da página
function html(req, content, options) {
  const title = options.title;
  const user = req.session.user;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <link rel="stylesheet" href="/public/style.css" />
      </head>
      <body>
        <header>
          <h1>${title}</h1>
          <nav>
            ${menu(user)}
          </nav>
        </header>
        <main class="container">
          ${content}
        </main>
      </body>
    </html>
  `;
}

app.use("/public", express.static("public"));

app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1800000,
    },
    rolling: true,
  })
);

app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  if (!req.session.user && req.path !== "/entrar") {
    res.redirect("/entrar");
  } else {
    next();
  }
});

app.get("/", (req, res) => {
  res
    .status(200)
    .send(
      html(
        req,
        `<div>lorem ipsum dolor sit amet consectetur adipisicing elit</div>`,
        { title: "Tela Inicial" }
      )
    );
});
app.get("/entrar", (req, res) => {
  res.status(200).send(
    html(
      req,
      `<form action="/entrar" method="POST">
        <div>
          <label for="username">Usuário</label>
          <input type="text" name="username" placeholder="Usuário" id="username" />
        </div>
        <div>
          <label for="password">Senha</label>
          <input type="password" name="password" placeholder="Senha" id="password" />
        </div>
        <button type="submit">Entrar</button>
      </form>`,
      { title: "Login" }
    )
  );
});

app.get("/sair", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      res.status(500).send("Erro ao sair");
    } else {
      res.redirect("/entrar");
    }
  });
});

app.post("/entrar", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  if (username === "admin" && password === "admin") {
    req.session.user = {
      username,
      lastLogin: new Date(),
    };

    res.redirect("/");
    return;
  }

  res.redirect("/entrar");
});

function criarTabelaUsuarios(users) {
  let tbody = "<tbody>";

  for (let i = 0; i < users.length; i++) {
    tbody += `
      <tr>
        <td>${users[i].username}</td>
        <td>${users[i].data.toLocaleDateString()}</td>
        <td>${users[i].nickname}</td>
      </tr>
    `;
  }

  tbody += "</tbody>";

  return tbody;
}

app.get("/cadastrar", (req, res) => {
  const errors = req.session.errors;
  req.session.errors = null;

  const content = `
    <h1>Cadastrar usuários</h1>
    <form action="/cadastrar" method="POST">
      <div>
        <label for="username">Usuário</label>
        <input type="text" name="username" placeholder="Usuário" id="username" />
        ${errors?.username ? `<p>${errors.username}</p>` : ""}
      </div>
      <div>
        <label for="data">Data de nascimento</label>
        <input type="date" name="data" placeholder="Data de nascimento" id="data" />
        ${errors?.data ? `<p>${errors.data}</p>` : ""}
      </div>
      <div>
        <label for="nickname">Apelido</label>
        <input type="text" name="nickname" placeholder="Apelido" id="nickname" />
        ${errors?.nickname ? `<p>${errors.nickname}</p>` : ""}
      </div>
      <button type="submit">Cadastrar</button>
    </form>
    <table id="users-table">
      <thead>
        <tr>
          <th>Usuário</th>
          <th>Data de nascimento</th>
          <th>Apelido</th>
        </tr>
      </thead>
      <tbody>
        ${criarTabelaUsuarios(users)}
      </tbody>
    </table>
  `;

  res.status(200).send(html(req, content, { title: "Cadastro" }));
});

app.post("/cadastrar", (req, res) => {
  const username = req.body.username;
  const data = req.body.data;
  const nickname = req.body.nickname;

  if (username && data && nickname) {
    users.push({ username, data: new Date(data), nickname });

    res.redirect("/cadastrar");
  } else {
    req.session.errors = {
      username: !username ? "Usuário é obrigatório" : "",
      data: !data ? "Data de nascimento é obrigatório" : "",
      nickname: !nickname ? "Apelido é obrigatório" : "",
    };

    res.redirect("/cadastrar");
  }
});

function criaOpcoesUsuarios(users) {
  let options = "";

  for (let i = 0; i < users.length; i++) {
    options += `<option value="${users[i].username}">${users[i].username}</option>`;
  }

  return options;
}

function criaListaMensagens(messages) {
  let lis = "";

  for (let i = 0; i < messages.length; i++) {
    lis += `<li>${messages[i].nickname} - ${
      messages[i].message
    } - enviado em ${messages[i].date.toLocaleString()}</li>`;
  }

  return lis;
}

app.get("/chat", (req, res) => {
  if (!users.length) {
    res.redirect("/cadastrar");
    return;
  }

  const content = `<form action="/chat" method="POST">
      <label for="message">Mensagem</label>
      <input type="text" name="message" placeholder="Mensagem" id="message" />
      <label for="username">Usuário</label>
      <select name="username" id="username">
        ${criaOpcoesUsuarios(users)}
      </select>
      <button type="submit">Enviar</button>
    </form>
    <ul>
      ${criaListaMensagens(messages)}
    </ul>`;

  res.status(200).send(html(req, content, { title: "Chat" }));
});

app.post("/chat", (req, res) => {
  const message = req.body.message;
  const username = req.body.username;

  if (message && username) {
    messages.push({ message, username, date: new Date() });
  }

  res.redirect("/chat");
});

app.listen(PORT, function () {
  console.log("http://localhost:" + PORT);
});

module.exports = app;
