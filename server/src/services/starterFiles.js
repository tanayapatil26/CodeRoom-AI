const File = require('../models/File');

const STARTERS = [
  {
    name: 'index.html',
    language: 'html',
    content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>CodeRoom</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <h1>Hello from CodeRoom</h1>
    <button id="btn">Click me</button>
    <script src="script.js"></script>
  </body>
</html>
`,
  },
  {
    name: 'style.css',
    language: 'css',
    content: `body {
  font-family: system-ui, sans-serif;
  display: grid;
  place-items: center;
  min-height: 100vh;
  margin: 0;
}
button { padding: 8px 16px; font-size: 16px; }
`,
  },
  {
    name: 'script.js',
    language: 'javascript',
    content: `document.getElementById('btn').addEventListener('click', () => {
  console.log('Clicked at', new Date().toLocaleTimeString());
});
`,
  },
];

async function seedFiles(roomId) {
  await File.insertMany(STARTERS.map((f) => ({ ...f, room: roomId, type: 'file', parent: null })));
}

module.exports = { seedFiles };
