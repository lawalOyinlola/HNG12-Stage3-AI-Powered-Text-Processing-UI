import { useEffect, useRef, useState } from "react";
import { useLanguageProcessing } from "../context/LanguageProcessingContext";
import { useSummarizer } from "../context/SummarizerContext";
import { MoreVertical } from "react-feather";

const ChatWindow = () => {
  const {
    detectLanguage,
    translateText,
    getLanguageName,
    sourceLanguage,
    isLoading,
    error,
  } = useLanguageProcessing();

  const {
    summarizeText,
    isLoading: summarizerIsLoading,
    error: summarizerError,
  } = useSummarizer();

  const [inputText, setInputText] = useState("");

  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! How can I help you?", type: "bot" },
    { id: 2, text: "Can you translate this text?", type: "user" },
    {
      id: 3,
      text: 'Yes, I can! I can detect the message language as you type. Click the "⋮" button to access options for translation and summarization.',
      type: "bot",
    },
  ]);

  const [selectedMessage, setSelectedMessage] = useState<{
    id: number;
    text: string;
  } | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [detectedMessageLanguage, setDetectedMessageLanguage] = useState<
    string | null
  >(null);
  // const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState("en");

  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortController = useRef<AbortController | null>(null);

  useEffect(() => {
    const storedMessages = localStorage.getItem("chatMessages");
    if (storedMessages) {
      setMessages(JSON.parse(storedMessages));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("chatMessages", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (inputText.length < 3) {
      setDetectedLanguage(null);
      return;
    }

    // Clear previous timeout to prevent unnecessary detections
    if (typingTimeout.current) clearTimeout(typingTimeout.current);

    // Abort the previous request if user is still typing
    if (abortController.current) abortController.current.abort();

    // Create a new abort controller for this request
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
    }, 1000);

    return () => {
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    };
  }, [inputText, detectLanguage, getLanguageName]);

  const handleSummarize = async (text: string, msgId: number) => {
    if (!text.trim()) return;

    const result = await summarizeText(text);
    if (!result) return;

    const messageIndex = messages.findIndex((msg) => msg.id === msgId);
    if (messageIndex === -1) return;

    const summaryMessage = {
      id: Date.now(),
      text: `Summary: ${result}`,
      type: "bot",
    };

    const updatedMessages = [
      ...messages.slice(0, messageIndex + 1),
      summaryMessage,
      ...messages.slice(messageIndex + 1),
    ];

    setMessages(updatedMessages);
    closeOptions();
  };

  const sendMessage = () => {
    if (inputText.trim() === "") return;
    setMessages([
      ...messages,
      { id: Date.now(), text: inputText, type: "user" },
    ]);
    setInputText("");

    handleDetectLanguage();
  };

  const openOptions = (id: number) => {
    const message = messages.find((msg) => msg.id === id);
    if (message) setSelectedMessage(message);
  };

  const closeOptions = () => {
    setSelectedMessage(null);
    setDetectedMessageLanguage(null);
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

    if (text) {
      setDetectedMessageLanguage(languageName);
    } else {
      setDetectedLanguage(languageName);
    }
  };

  const handleTranslate = async (
    text: string,
    targetLang: string,
    msgId: number
  ) => {
    if (!text.trim) return;
    const translation = await translateText(text, targetLang);
    if (!translation) return;

    const messageIndex = messages.findIndex((msg) => msg.id === msgId);
    if (messageIndex === -1) return;

    const translationMessage = {
      id: Date.now(),
      text: `Translation: ${translation}`,
      type: "bot",
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
            className={`message ${msg.type} ${
              selectedMessage?.id === msg.id && "selected"
            }`}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") openOptions(msg.id);
            }}
            onClick={closeOptions}
            aria-label={`Message from ${msg.type === "user" ? "you" : "bot"}: ${
              msg.text
            }. Press Enter for more options.`}
          >
            <button
              className="options-button"
              aria-label="Open message options"
              onClick={(e) => {
                e.stopPropagation();
                openOptions(msg.id);
              }}
            >
              <MoreVertical size={16} color="#fff" />
            </button>
            {msg.text}

            {selectedMessage?.id === msg.id && (
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div>
                  Translate to
                  <select
                    value={targetLanguage}
                    onChange={(e) => {
                      const newLanguage = e.target.value;
                      if (newLanguage === sourceLanguage) return;
                      setTargetLanguage(newLanguage);
                      handleTranslate(
                        selectedMessage.text,
                        newLanguage,
                        selectedMessage.id
                      );
                    }}
                    disabled={isLoading}
                  >
                    {isLoading && <option value="">Loading...</option>}
                    <option value="en">English</option>
                    <option value="pt">Portuguese</option>
                    <option value="es">Spanish</option>
                    <option value="ru">Russian</option>
                    <option value="tr">Turkish</option>
                    <option value="fr">French</option>
                  </select>
                </div>
                <button
                  onClick={() =>
                    handleDetectLanguage(selectedMessage?.text || "")
                  }
                  disabled={isLoading}
                >
                  Detect Language
                </button>
                {detectedMessageLanguage && (
                  <p>≫ Language is in {detectedMessageLanguage}</p>
                )}
                {error && <p> {error}</p>}

                {selectedMessage.text.length > 150 && (
                  <button
                    onClick={() =>
                      handleSummarize(selectedMessage.text, selectedMessage.id)
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
