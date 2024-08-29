const fs = require("fs");
const mime = require("mime-types");

function getStaticFile(folder, filename, fallbackToIndex = false) {
  filename = filename === "/" ? "/index.html" : filename;
  const assetsFilename = filename.replace("/solorpg", "");
  const path = `${folder}${assetsFilename}`;

  if (fs.existsSync(path)) {
    const content = fs.readFileSync(path);
    return {
      content: content.toString(),
      mime: mime.lookup(path),
    };
  }
  if (fallbackToIndex) {
    const file = filename.split("/")[2]?.startsWith("game")
      ? "game.html"
      : "index.html";

    const content = fs.readFileSync(`${folder}/${file}`);

    return {
      content: content.toString(),
      mime: "text/html",
    };
  }
}

module.exports = {
  getStaticFile,
};
