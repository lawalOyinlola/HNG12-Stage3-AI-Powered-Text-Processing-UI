import { useEffect, useRef, useState } from "react";
import { useLanguageProcessing } from "../context/LanguageProcessingContext";
import { useSummarizer } from "../context/SummarizerContext";
import { MoreVertical, Trash2 } from "react-feather";
import { useAutoAnimate } from "@formkit/auto-animate/react";

interface Message {
  id: number;
  originalMessageId?: number;
  text: string;
  language?: string;
  translatedLanguage?: string;
  sender: string | "user" | "bot";
  purpose?: string | "Translation" | "Summary";
}

const SUPPORTED_LANGUAGES = ["en", "pt", "es", "ru", "tr", "fr"];
const INITIAL_MESSAGES = [
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
];

const ChatWindow = () => {
  const {
    detectLanguage,
    translateText,
    getLanguageName,
    isLoading,
    translatorError,
    error,
  } = useLanguageProcessing();
  const {
    summarizeText,
    isLoading: summarizerIsLoading,
    error: summarizerError,
  } = useSummarizer();

  const [animateMessages] = useAutoAnimate();

  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortController = useRef<AbortController | null>(null);
  const lastMessageRef = useRef<HTMLDivElement | null>(null);

  const [messages, setMessages] = useState<Message[]>(() => {
    const storedMessages = localStorage.getItem("chatMessages");
    return storedMessages ? JSON.parse(storedMessages) : INITIAL_MESSAGES;
  });
  const [inputText, setInputText] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<{
    id: number;
    text: string;
  } | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState("en");

  useEffect(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [messages]);

  useEffect(() => {
    if (messages.length > 3) {
      localStorage.setItem("chatMessages", JSON.stringify(messages));
    }
  }, [messages]);

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
  }, [inputText, error, detectLanguage, getLanguageName]);

  const hasStoredMessages = localStorage.getItem("chatMessages") !== null;

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const target = e.currentTarget;
      if (target.value.trim()) {
        sendMessage();
        setInputText("");
      }
    }
  };

  const handleDelete = () => {
    if (messages.length > 3) {
      localStorage.removeItem("chatMessages");
      setMessages(INITIAL_MESSAGES);
    }
  };

  const getSupportedLangOptions = (message: Message) =>
    message.translatedLanguage ?? message.language;

  const sendMessage = async () => {
    if (inputText.trim() === "") return;

    const detectedLanguage = await handleDetectLanguage(inputText);

    setMessages((prevMessages) => [
      ...prevMessages,
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

    const detectedLanguage = await handleDetectLanguage(text);
    if (
      !detectedLanguage ||
      detectedLanguage === getLanguageName(targetLanguage)
    )
      return;

    const translation = await translateText(text, targetLanguage);
    if (!translation) return;

    setMessages((prevMessages) => {
      const messageIndex = prevMessages.findIndex((msg) => msg.id === msgId);
      if (messageIndex === -1) return prevMessages;

      const translatedLanguage = getLanguageName(targetLanguage);

      const existingTranslation = prevMessages.find(
        (msg) =>
          msg.purpose === "Translation" &&
          msg.sender === "bot" &&
          (msg.originalMessageId === msgId || msg.id === msgId)
      );

      const translationMessage: Message = {
        id: existingTranslation ? existingTranslation.id : Date.now(),
        originalMessageId: existingTranslation
          ? existingTranslation.originalMessageId
          : msgId,
        purpose: "Translation",
        text: translation,
        language: `${detectedLanguage} ➝ ${translatedLanguage}`,
        translatedLanguage: translatedLanguage,
        sender: "bot",
      };

      let updatedMessages = [...prevMessages];

      if (existingTranslation) {
        updatedMessages = updatedMessages.map((msg) =>
          msg.id === existingTranslation.id ? translationMessage : msg
        );
      } else {
        updatedMessages = updatedMessages.filter(
          (msg) =>
            !(
              msg.purpose === "Translation" &&
              msg.sender === "bot" &&
              msg.originalMessageId === msgId
            )
        );

        updatedMessages.splice(messageIndex + 1, 0, translationMessage);
      }

      return updatedMessages;
    });

    closeOptions();
  };

  const handleSummarize = async (text: string, msgId: number) => {
    if (!text.trim()) return;

    const result = await summarizeText(text);
    if (!result) return;

    const detectedLanguage = await handleDetectLanguage(text);
    if (!detectedLanguage) return;

    const messageIndex = messages.findIndex((msg) => msg.id === msgId);
    if (messageIndex === -1) return;

    const summaryMessage = {
      id: Date.now(),
      purpose: "Summary",
      text: `Summary: ${result}`,
      language: detectedLanguage,
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

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h1>Chat With Isime</h1>{" "}
        {hasStoredMessages && (
          <button onClick={handleDelete}>
            <Trash2 size={20} color="orangered" cursor={"pointer"} />
          </button>
        )}
      </div>
      <div
        className="chat-box"
        role="log"
        aria-live="polite"
        ref={animateMessages}
      >
        {messages.map((msg, index) => (
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
            ref={index === messages.length - 1 ? lastMessageRef : null}
          >
            <button
              className="options-button"
              aria-label="Open message options"
              onClick={(e) => {
                e.stopPropagation();
                openOptions(msg.id);
              }}
            >
              <MoreVertical size={15} color="#fff" cursor={"pointer"} />
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
                    <option value="">Language</option>
                    {SUPPORTED_LANGUAGES.filter(
                      (lang) =>
                        getLanguageName(lang) !== getSupportedLangOptions(msg)
                    ).map((lang) => (
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
                {translatorError && <p> {translatorError}</p>}

                {msg.text.length > 150 && (
                  <button
                    onClick={() => handleSummarize(msg.text, msg.id)}
                    disabled={isLoading}
                  >
                    {summarizerIsLoading ? " Summarizing..." : " Summarize"}
                  </button>
                )}

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
          onKeyDown={handleKeyDown}
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
