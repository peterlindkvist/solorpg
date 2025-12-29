require("dotenv").config();
const busboy = require("busboy");

const getStaticFile =
  require("./server/services/staticFileService").getStaticFile;

const {
  textToImage,
  textToSpeechOpenAI,
  textToSpeechElevenLabs,
  speechToText,
  textToText,
} = require("./server/services/assetsService");

const {
  uploadUrlToStorage,
  uploadTextToStorage,
  fetchTextFromStorage,
  uploadFileToStorage,
  fetchTextMetadataFromStorage,
  streamToBuffer,
  checkFileExists,
} = require("./server/services/storageService");

async function solorpg(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, PUT, GET, OPTIONS");

  console.log("REQ", req.method, req.path);

  if (req.path.startsWith("/api/stories")) {
    if (req.method === "GET") {
      const filePath = req.path.replace("/api/stories/", "");
      let content = "";
      if (filePath === "list") {
        const metadata = await fetchTextMetadataFromStorage();
        content = JSON.stringify(metadata, undefined, 2);
      } else {
        content = await fetchTextFromStorage(filePath);
        if (!content) {
          content = await fetchTextFromStorage(`help/default.md`);
        }
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
    const { text, storyId, narrator = "nova" } = req.query;
    
    // Create a consistent filename based on text content and narrator
    const crypto = require("crypto");
    const textHash = crypto
    .createHash("md5")
    .update(text + narrator)
    .digest("hex");
    const fileName = `${storyId}/speech_${textHash}.mp3`;
    const speachEngine = narrator.startsWith("elevenlabs") ? "elevenlabs" : "openai";

    // Check if the file already exists
    const existingFile = await checkFileExists(fileName);
    if (existingFile.exists) {
      console.log("Using existing speech file:", fileName);
      res.send({ url: existingFile.url });
      return;
    }

    // Generate new speech file
    const ret = speachEngine === "elevenlabs"
      ? await textToSpeechElevenLabs(text, narrator)
      : await textToSpeechOpenAI(text, narrator);
    const file = await uploadFileToStorage(ret.buffer, fileName);

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

module.exports = {
  solorpg,
};
