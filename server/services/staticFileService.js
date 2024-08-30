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
    const file = assetsFilename.split("/")[1]?.startsWith("game")
      ? "game.html"
      : "index.html";

    console.log(
      "fallback to index",
      folder,
      filename,
      file,
      filename.split("/")
    );

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
