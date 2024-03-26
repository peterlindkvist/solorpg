const fs = require("fs");
const mime = require("mime-types");

function getStaticFile(folder, filename, fallbackToIndex = false) {
  filename = filename === "/" ? "/index.html" : filename;
  const path = `${folder}${filename}`;
  console.log("path", path);
  if (fs.existsSync(path)) {
    const content = fs.readFileSync(path);
    return {
      content: content.toString(),
      mime: mime.lookup(path),
    };
  }
  if (fallbackToIndex) {
    const content = fs.readFileSync(`${folder}/index.html`);
    return {
      content: content.toString(),
      mime: "text/html",
    };
  }
}

module.exports = {
  getStaticFile,
};
