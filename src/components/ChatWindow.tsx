import { useEffect, useRef, useState } from "react";
import { useLanguageProcessing } from "../context/LanguageProcessingContext";
import { useSummarizer } from "../context/SummarizerContext";

interface Message {
  id: number;
  text: string;
  language?: string;
  sender: string | "user" | "bot";
  purpose?: string | "chat" | "translation" | "summarization";
}

const ChatWindow = () => {
  const { detectLanguage, translateText, getLanguageName, isLoading, error } =
    useLanguageProcessing();

  const {
    summarizeText,
    isLoading: summarizerIsLoading,
    error: summarizerError,
  } = useSummarizer();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [inputText, setInputText] = useState("");

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hello! How can I help you?",
      language: "English",
      sender: "bot",
    },
    {
      id: 2,
      text: "Can you translate this text?",
      language: "English",
      sender: "user",
    },
    {
      id: 3,
      text: 'Yes, I can! I can detect the message language as you type. Click the "⋮" button to access options for translation and summarization.',
      language: "English",
      sender: "bot",
    },
  ]);

  const [selectedMessage, setSelectedMessage] = useState<{
    id: number;
    text: string;
  } | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [translatedLanguage, setTranslatedLanguage] = useState<string | null>(
    null
  );
  // const [detectedMessageLanguage, setDetectedMessageLanguage] = useState<
  //   string | null
  // >(null);
  const [targetLanguage, setTargetLanguage] = useState("en");

  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortController = useRef<AbortController | null>(null);

  // useEffect(() => {
  //   const storedMessages = localStorage.getItem("chatMessages");
  //   if (storedMessages) {
  //     setMessages(JSON.parse(storedMessages));
  //   }
  // }, []);

  // useEffect(() => {
  //   localStorage.setItem("chatMessages", JSON.stringify(messages));
  // }, [messages]);

  useEffect(() => {
    if (inputText.length < 3) {
      setDetectedLanguage(null);
      return;
    }

    if (typingTimeout.current) clearTimeout(typingTimeout.current);

    if (abortController.current) abortController.current.abort();

    abortController.current = new AbortController();

    typingTimeout.current = setTimeout(async () => {
      if (!inputText.trim()) return;
      try {
        const detectionResult = await detectLanguage(inputText);
        if (detectionResult) {
          setDetectedLanguage(
            Array.isArray(detectionResult)
              ? getLanguageName(detectionResult[0].detectedLanguage)
              : getLanguageName(detectionResult.detectedLanguage)
          );
        }
      } catch (error) {
        console.error("Language detection aborted or failed:", error);
      }
    }, 500);

    return () => {
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    };
  }, [inputText, detectLanguage, getLanguageName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleSummarize = async (
    text: string,
    msgId: number,
    msgLang: string
  ) => {
    if (!text.trim()) return;

    const result = await summarizeText(text);
    if (!result) return;

    const messageIndex = messages.findIndex((msg) => msg.id === msgId);
    if (messageIndex === -1) return;

    const summaryMessage = {
      id: Date.now(),
      purpose: "Summary",
      text: `Summary: ${result}`,
      language: msgLang,
      sender: "bot",
    };

    const updatedMessages = [
      ...messages.slice(0, messageIndex + 1),
      summaryMessage,
      ...messages.slice(messageIndex + 1),
    ];

    setMessages(updatedMessages);
    closeOptions();
  };

  const sendMessage = async () => {
    if (inputText.trim() === "") return;

    const detectedLanguage = await handleDetectLanguage(inputText);

    setMessages([
      ...messages,
      {
        id: Date.now(),
        text: inputText,
        language: detectedLanguage || "Unknown",
        sender: "user",
      },
    ]);

    setInputText("");
  };

  const openOptions = (id: number) => {
    const message = messages.find((msg) => msg.id === id);
    if (message) setSelectedMessage(message);
  };

  const closeOptions = () => {
    setSelectedMessage(null);
  };

  const handleDetectLanguage = async (text?: string) => {
    const textToDetect = text?.trim() || inputText.trim();

    if (!textToDetect) return;

    const detectionResult = await detectLanguage(textToDetect);
    const languageName = detectionResult
      ? Array.isArray(detectionResult)
        ? getLanguageName(detectionResult[0].detectedLanguage)
        : getLanguageName(detectionResult.detectedLanguage)
      : null;

    return languageName;
  };

  const handleTranslate = async (text: string, msgId: number) => {
    if (!text.trim()) return;

    const detectedLanguage = await handleDetectLanguage(text); // Detect source language
    if (!detectedLanguage) return;

    const translation = await translateText(text, targetLanguage);
    if (!translation) return;

    const messageIndex = messages.findIndex((msg) => msg.id === msgId);
    if (messageIndex === -1) return;

    setTranslatedLanguage(targetLanguage);

    const translationMessage = {
      id: Date.now(),
      purpose: "Translation",
      text: translation,
      language: `${detectedLanguage}  ➝  ${getLanguageName(targetLanguage)}`,
      sender: "bot",
    };

    const updatedMessages = [
      ...messages.slice(0, messageIndex + 1),
      translationMessage,
      ...messages.slice(messageIndex + 1),
    ];

    setMessages(updatedMessages);
    closeOptions();
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h1>Chat With Isime</h1>
      </div>
      <div className="chat-box" role="log" aria-live="polite">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`message ${msg.sender} ${
              selectedMessage?.id === msg.id && "selected"
            }`}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") openOptions(msg.id);
            }}
            onClick={closeOptions}
            aria-label={`Message from ${
              msg.sender === "user" ? "you" : "bot"
            }: ${msg.text}. Press Enter for more options.`}
            ref={messagesEndRef}
          >
            <button
              className="options-button"
              aria-label="Open message options"
              onClick={(e) => {
                e.stopPropagation();
                openOptions(msg.id);
              }}
            >
              ⋮
            </button>
            {msg.purpose && <div className="purpose">{msg.purpose}</div>}
            {msg.text}
            {<em className="language">{msg.language}</em>}

            {selectedMessage?.id === msg.id && (
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div>
                  Translate to
                  <select
                    value={targetLanguage}
                    onChange={(e) => {
                      setTargetLanguage(e.target.value);
                    }}
                    disabled={isLoading}
                  >
                    {isLoading && <option value="">Loading...</option>}
                    {["en", "pt", "es", "ru", "tr", "fr"]
                      .filter(
                        (lang) =>
                          getLanguageName(lang) !== msg.language ||
                          translatedLanguage
                      )
                      .map((lang) => (
                        <option key={lang} value={lang}>
                          {getLanguageName(lang)}
                        </option>
                      ))}
                  </select>
                </div>
                <button
                  onClick={() => handleTranslate(msg.text, msg.id)}
                  disabled={isLoading}
                >
                  {isLoading ? "Translating..." : "Translate"}
                </button>

                {error && <p> {error}</p>}

                {msg.text.length > 150 && (
                  <button
                    onClick={() =>
                      handleSummarize(msg.text, msg.id, msg.language)
                    }
                    disabled={isLoading}
                  >
                    Summarize
                  </button>
                )}

                {summarizerIsLoading && <p>Summarizing...</p>}
                {summarizerError && <p>{summarizerError}</p>}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="input-area">
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message..."
          aria-label="Type your message here"
        />
        <button onClick={sendMessage} aria-label="Send message">
          ➤
        </button>
      </div>
      {!error ? (
        <em className="typing" aria-live="polite">
          You are typing in {detectedLanguage || "..."}
        </em>
      ) : (
        <p className="typing">{error}</p>
      )}
      {selectedMessage && (
        <div className="modal-overlay" onClick={closeOptions}></div>
      )}
    </div>
  );
};

export default ChatWindow;
