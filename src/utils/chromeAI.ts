export const detectLanguage = async (text: string) => {
  if (!window.chrome || !window.chrome.ai || !window.chrome.ai.detectLanguage) {
    throw new Error("Chrome AI APIs are not available in this browser.");
  }

  try {
    const response = await window.chrome.ai.detectLanguage({ text });
    return response.language;
  } catch (error) {
    console.error("Language Detection Error:", error);
    throw new Error("Failed to detect language.");
  }
};

export const summarizeText = async (text: string) => {
  if (!window.chrome || !window.chrome.ai || !window.chrome.ai.summarize) {
    throw new Error("Chrome AI APIs are not available.");
  }

  try {
    const response = await window.chrome.ai.summarize({ text });
    return response.summary;
  } catch (error) {
    console.error("Summarization Error:", error);
    throw new Error("Failed to summarize text.");
  }
};

export const translateText = async (text: string, targetLang: string) => {
  if (!window.chrome || !window.chrome.ai || !window.chrome.ai.translate) {
    throw new Error("Chrome AI APIs are not available.");
  }

  try {
    const response = await window.chrome.ai.translate({ text, to: targetLang });
    return response.translatedText;
  } catch (error) {
    console.error("Translation Error:", error);
    throw new Error("Failed to translate text.");
  }
};
