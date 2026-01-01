const fs = require("fs");
const OpenAI = require("openai");
const crypto = require("crypto");
// const env = require("dotenv");

const ElevenLabsClient = require("@elevenlabs/elevenlabs-js").ElevenLabsClient;

// env.config();

const openai = new OpenAI();
const elevenLabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

const elevenLabsVoices = {
  sanna: "aSLKtNoVBZlxQEMsnGL2",
  adam: "x0u3EW21dbrORJzOq1m9",
};

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
  const data = response?.data?.[0];
  if (!data) {
    console.error(response);
    throw new Error("No image found");
  }
  return {
    url: data.url,
    prompt: data.revised_prompt,
    fileName,
  };
}

async function textToSpeechOpenAI(text, narrator) {
  const [_, voiceName] = narrator.split("-");

  const mp3 = await openai.audio.speech.create({
    // model: "tts-1",
    // model: "tts-1-hd",
    model: "gpt-4o-mini-tts",
    voice: voiceName,
    input: text,
  });
  const fileName = `${hashString(`${voiceName}_${text}`)}.mp3`;

  return {
    buffer: Buffer.from(await mp3.arrayBuffer()),
    fileName,
  };
}

async function textToSpeechElevenLabs(text, narrator) {
  const [_, voiceName, langCode] = narrator.split("-");

  const voice = elevenLabsVoices[voiceName];

  const mp3Stream = await elevenLabs.textToSpeech.convert(voice, {
    languageCode: langCode,
    outputFormat: "mp3_44100_128",
    text,
    modelId: "eleven_multilingual_v2",
  });

  const fileName = `${hashString(`${voice}_${langCode}_${text}`)}.mp3`;

  console.log("Generated speech with ElevenLabs:", fileName);

  const chunks = [];
  for await (const chunk of mp3Stream) {
    chunks.push(chunk);
  }

  return {
    buffer: Buffer.concat(chunks),
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
  textToSpeechOpenAI,
  textToSpeechElevenLabs,
  textToText,
  speechToText,
};
