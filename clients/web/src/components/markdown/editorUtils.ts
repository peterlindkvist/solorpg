// https://github.com/uiwjs/react-md-editor/issues/83

export async function onImagePasted(
  dataTransfer: DataTransfer,
  setMarkdown: (value: string) => void,
  fileUpload: (file: File) => Promise<string | undefined>
) {
  const files: File[] = [];
  for (let index = 0; index < dataTransfer.items.length; index += 1) {
    const file = dataTransfer.files.item(index);

    if (file) {
      files.push(file);
    }
  }

  await Promise.all(
    files.map(async (file) => {
      const url = await fileUpload(file);
      const insertedMarkdown = insertToTextArea(`![](${url})`);
      if (!insertedMarkdown) {
        return;
      }
      setMarkdown(insertedMarkdown);
    })
  );
}

export function insertToTextArea(insertString: string) {
  const textarea = document.querySelector("textarea");
  if (!textarea) {
    return null;
  }

  let sentence = textarea.value;
  const len = sentence.length;
  const pos = textarea.selectionStart;
  const end = textarea.selectionEnd;

  const front = sentence.slice(0, pos);
  const back = sentence.slice(pos, len);

  sentence = front + insertString + back;

  textarea.value = sentence;
  textarea.selectionEnd = end + insertString.length;

  return sentence;
}

// https://github.com/uiwjs/react-md-editor?tab=readme-ov-file#support-custom-mermaid-preview
export function randomid() {
  return parseInt(String(Math.random() * 1e15), 10).toString(36);
}
