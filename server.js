require("dotenv").config();
const busboy = require("busboy");

const getStaticFile =
  require("./server/services/staticFileService").getStaticFile;

const {
  textToImage,
  textToSpeech,
  speechToText,
  textToText,
} = require("./server/services/assetsService");

const {
  uploadUrlToStorage,
  uploadTextToStorage,
  fetchTextFromStorage,
  uploadFileToStorage,
  streamToBuffer,
} = require("./server/services/storageService");

async function solorpg(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, PUT, GET, OPTIONS");

  console.log("REQ", req.method, req.path);

  if (req.path.startsWith("/api/stories")) {
    if (req.method === "GET") {
      const filePath = req.path.replace("/api/stories/", "");
      let content = await fetchTextFromStorage(filePath);
      if (!content) {
        content = storyTemplate(filePath.split("/").pop());
      }
      res.send(content);
      return;
    }
    if (req.method === "PUT") {
      const filePath = req.path.replace("/api/stories/", "");
      const content = JSON.parse(req.body).text;
      const ret = await uploadTextToStorage(content, filePath);
      res.send({ text: content, url: ret.url });
      return;
    }
  }

  if (req.path.startsWith("/api/images")) {
    if (req.method === "GET") {
      const { description, context, storyId } = req.query;
      const ret = await textToImage(description, context);
      const image = await uploadUrlToStorage(
        ret.url,
        `${storyId}/${ret.fileName}`
      );

      res.send({ url: image.url, text: ret.prompt });
      return;
    }
    if (req.method === "POST") {
      const { storyId } = req.query;
      const bb = busboy({ headers: req.headers });
      await new Promise((resolve, reject) => {
        bb.once("close", resolve)
          .once("error", reject)
          .on("file", async (_name, fileStream, _info) => {
            fileStream.resume();
            const buffer = await streamToBuffer(fileStream);
            const destination = `${storyId}/${Math.random()
              .toString()
              .replace(".", "")}.jpg`;
            const image = await uploadFileToStorage(
              buffer,
              destination,
              "image/jpeg"
            );
            res.send({ url: image.url });
          })
          .end(req.rawBody);
      });

      return;
    }
  }

  if (req.path.startsWith("/api/speech") && req.method === "POST") {
    const { text, storyId, narrator } = req.query;
    console.log("text", text, narrator);
    const ret = await textToSpeech(text, narrator);
    const file = await uploadFileToStorage(
      ret.buffer,
      `${storyId}/${ret.fileName}`
    );

    res.send({ url: file.url });
    return;
  }

  if (req.path.startsWith("/api/text")) {
    if (req.method === "POST") {
      const bb = busboy({ headers: req.headers });
      await new Promise((resolve, reject) => {
        bb.once("close", resolve)
          .once("error", reject)
          .on("file", async (_name, fileStream, _info) => {
            fileStream.resume();
            const buffer = await streamToBuffer(fileStream);
            const transcript = await speechToText(buffer);
            res.send({ text: transcript.text });
          })
          .end(req.rawBody);
      });

      return;
    }
    if (req.method === "GET") {
      const { text, context } = req.query;
      const newText = await textToText(text, context);
      res.send(newText);
    }
  }

  const file = getStaticFile(`${__dirname}/server/public`, req.path, true);

  res.setHeader("Content-Type", file.mime);

  res.send(file.content);
}

function storyTemplate(storyName) {
  const codeChars = "```";
  return `# ${storyName}
${codeChars}
{
"name": "${storyName}",
  "assistant": {
    "imageContext": "Icy mountains",
    "textContext": "Rewite the story in a lovecraftian style",
    "narrator": "nova"
  },
  health : 14,
  gold: 2
}
${codeChars}
A story about cold mountains and an incredible adventures

You decide where the story goes

- [start](#start)
- [leave](#leave)

## start
You are in the middle of the mountains, the cold wind is blowing and you can see a cave in the distance

\`{gold : "+=10"}\`

## leave
You decide to leave the mountains and go back to the city. Adventures are not for you
`;
}

module.exports = {
  solorpg,
};
