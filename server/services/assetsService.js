const fs = require("fs");
const OpenAI = require("openai");
const crypto = require("crypto");

const openai = new OpenAI();

async function generateImages(context, renderType, descriptions) {
  for (const description of descriptions) {
    await textToImage(description, context, renderType);
  }
}

async function textToImage(description, context, renderType) {
  const prompt = `${context} ${description}`;
  const query = {
    model: "dall-e-3",
    prompt,
    n: 1,
    size: "1024x1024",
  };
  const response = await openai.images.generate(query);
  const fileName = `${hashString(prompt)}.jpg`;
  const filePath = `${__dirname}/../../assets/${fileName}`;
  const url = response?.data?.[0]?.url;
  if (!url) {
    console.error(response);
    throw new Error("No image url found");
  }
  // await saveImage(url, filePath);
  return {
    url,
    fileName,
  };
}

async function textToSpeech(text, voice) {
  const mp3 = await openai.audio.speech.create({
    model: "tts-1",
    voice,
    input: text,
  });
  const fileName = `${hashString(`${voice}_${text}`)}.mp3`;
  console.log(mp3);

  return {
    buffer: Buffer.from(await mp3.arrayBuffer()),
    fileName,
  };
}

async function speechToText(audio) {
  audio.name = "audio.wav";

  // const blob = new Blob([audio]); // JavaScript Blob

  const file = await OpenAI.toFile(audio, "audio.wav", { type: "wav" });
  console.log("audio", audio, file);

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    // response_format: "verbose_json",
    // timestamp_granularities: ["word"]
  });

  console.log("transcription", transcription);

  return {
    text: transcription.text,
  };
}

async function textToText(text, context) {
  const query = {
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: context },
      { role: "user", content: text },
    ],
  };
  console.log("query", query);
  const response = await openai.chat.completions.create(query);
  console.log("response", JSON.stringify(response, undefined, 2));

  return {
    text: response.choices[0].message.content,
  };
}

async function saveImage(imageURL, fileName) {
  const response = await fetch(imageURL);
  const buffer = Buffer.from(await response.arrayBuffer());

  fs.writeFile(fileName, buffer, (error) => {
    if (error) {
      console.error("Error saving image: ", error);
    }
  });
}

function hashString(string) {
  return crypto.createHash("md5").update(string).digest("base64");
}

module.exports = {
  generateImages,
  textToImage,
  textToSpeech,
  textToText,
  speechToText,
};
