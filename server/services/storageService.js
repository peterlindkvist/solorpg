const { Storage } = require("@google-cloud/storage");

const bucketName = "solorpg";

const storage = new Storage({
  keyFilename: `${__dirname}/../../solorpg-keystorage.json`,
});
const bucket = storage.bucket(bucketName);

function uploadImageToStorage(fileName, storyName, buffer) {
  bucket.upload(
    `${__dirname}/../assets/94f096a159b3fce1a64fdea0386de343829ecc8f9194af842209918c3a428022.jpg`,
    {
      destination: `${storyName}/${fileName}`,
    },
    function (err, file) {
      if (err) {
        console.error(`Error uploading ${fileName}: ${err}`);
      } else {
        console.log(`${fileName} uploaded to ${bucketName}.`);

        file.makePublic(async function (err) {
          if (err) {
            console.error(`Error making file public: ${err}`);
          } else {
            console.log(`File ${file.name} is now public.`);
            const publicUrl = file.publicUrl();
            console.log(`Public URL for ${file.name}: ${publicUrl}`);
          }
        });
      }
    }
  );
}

async function uploadUrlToStorage(url, destination) {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(destination);
    const stream = file.createWriteStream({
      metadata: {
        contentType: response.headers.get("content-type"),
      },
    });

    stream.end(buffer);

    await new Promise((resolve, reject) => {
      stream.on("finish", resolve);
      stream.on("error", reject);
    });

    console.log(`Image uploaded to Google Cloud Storage: ${destination}`);

    return {
      url: file.publicUrl(),
    };
  } catch (error) {
    console.error("Error uploading image:", error);
  }
}

async function uploadTextToStorage(textContent, destination) {
  try {
    const buffer = Buffer.from(textContent, "utf-8");

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(destination);
    const stream = file.createWriteStream({
      metadata: {
        contentType: "text/plain",
      },
    });

    stream.end(buffer);

    await new Promise((resolve, reject) => {
      stream.on("finish", resolve);
      stream.on("error", reject);
    });

    console.log(`Text uploaded to Google Cloud Storage: ${destination}`);
    return {
      url: file.publicUrl(),
    };
  } catch (error) {
    console.error("Error uploading image:", error);
  }
}

async function uploadFileToStorage(
  buffer,
  destination,
  contentType = "audio/mpeg"
) {
  try {
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(destination);
    const stream = file.createWriteStream({
      metadata: {
        contentType,
      },
    });

    stream.end(buffer);

    await new Promise((resolve, reject) => {
      stream.on("finish", resolve);
      stream.on("error", reject);
    });

    console.log(`File uploaded to Google Cloud Storage: ${destination}`);
    return {
      url: file.publicUrl(),
    };
  } catch (error) {
    console.error("Error uploading image:", error);
  }
}

async function fetchTextFromStorage(fileName) {
  console.log("fetchFileFromStorage", fileName);
  const bucket = storage.bucket(bucketName);
  const file = await bucket.file(fileName);
  const exists = await file.exists();
  if (exists[0]) {
    const content = await file.download();
    return content.toString();
  }
}

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const _buf = [];

    stream.on("data", (chunk) => _buf.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(_buf)));
    stream.on("error", (err) => reject(err));
  });
}

module.exports = {
  uploadImageToStorage,
  uploadUrlToStorage,
  uploadTextToStorage,
  uploadFileToStorage,
  fetchTextFromStorage,
  streamToBuffer,
};
