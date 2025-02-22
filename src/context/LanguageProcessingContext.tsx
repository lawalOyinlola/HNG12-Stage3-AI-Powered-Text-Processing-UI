import { createContext, useContext, useState, useEffect } from "react";
interface DetectedLanguage {
  detectedLanguage: string;
  confidence: number;
}

interface LanguageDetector {
  detect: (text: string) => Promise<DetectedLanguage[]>;
  ready: Promise<void>;
}

interface TranslatorInstance {
  translate: (text: string) => Promise<string>;
}

interface Translator {
  create: (params: {
    sourceLanguage: string;
    targetLanguage: string;
  }) => Promise<TranslatorInstance>;
}

interface LanguageProcessingContextProps {
  detectLanguage: (
    text: string,
    count?: number
  ) => Promise<DetectedLanguage[] | DetectedLanguage | null>;
  translateText: (
    text: string,
    targetLanguage: string
  ) => Promise<string | null>;
  getLanguageName: (
    languageTag: string | null,
    targetLanguage?: string
  ) => string;
  sourceLanguage: string | null;
  isLoading: boolean;
  translatorError: string | null;
  error: string | null;
}

const LanguageProcessingContext = createContext<
  LanguageProcessingContextProps | undefined
>(undefined);

export const useLanguageProcessing = () => {
  const context = useContext(LanguageProcessingContext);
  if (!context) {
    throw new Error(
      "useLanguageProcessing must be used within a LanguageProcessingProvider"
    );
  }
  return context;
};

const SUPPORTED_LANGUAGES = ["en", "pt", "es", "ru", "tr", "fr"];

export const LanguageProcessingProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [translatorError, setTranslatorError] = useState<string | null>(null);
  const [detector, setDetector] = useState<LanguageDetector | null>(null);
  const [translator, setTranslator] = useState<Translator | null>(null);
  const [sourceLanguage, setSourceLanguage] = useState<string | null>(null);

  useEffect(() => {
    const setupAPIs = async () => {
      if (
        !("ai" in self) ||
        !("languageDetector" in (self.ai as any)) ||
        !("translator" in (self.ai as any))
      ) {
        setError("AI APIs are not supported in this browser.");
        return;
      }

      try {
        // Setup Language Detector
        const detectorCapabilities = await (
          self.ai as any
        ).languageDetector.capabilities();
        if (detectorCapabilities.capabilities !== "no") {
          const newDetector = await (self.ai as any).languageDetector.create();
          await newDetector.ready;
          setDetector(newDetector as LanguageDetector);
        }

        // Setup Translator
        const translatorCapabilities = await (
          self.ai as any
        ).translator.capabilities();
        if (translatorCapabilities) {
          setTranslator((self.ai as any).translator as Translator);
        }
      } catch (err) {
        setError("Failed to initialize AI APIs.");
      }
    };

    setupAPIs();
  }, []);

  const detectLanguage = async (
    text: string,
    count: number = 1
  ): Promise<DetectedLanguage[] | DetectedLanguage | null> => {
    if (!detector) return null;
    setIsLoading(true);
    try {
      const results = await detector.detect(text);
      const filteredResults = results
        .filter((r: DetectedLanguage) => r.confidence >= 0.3)
        .map((r: DetectedLanguage) => ({
          detectedLanguage: r.detectedLanguage,
          confidence: r.confidence,
        }));

      if (filteredResults.length === 0) {
        return { detectedLanguage: "Unknown language", confidence: 1 };
      }

      if (
        filteredResults.length === 1 &&
        filteredResults[0].confidence >= 0.7
      ) {
        return filteredResults[0];
      }
      return count === 1 ? filteredResults[0] : filteredResults.slice(0, count);
    } catch (err) {
      setError("Error detecting language.");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const translateText = async (
    text: string,
    targetLanguage: string
  ): Promise<string | null> => {
    if (!translator || !SUPPORTED_LANGUAGES.includes(targetLanguage)) {
      return `Error: Target language '${getLanguageName(
        targetLanguage
      )}' is not supported. Supported languages: ${SUPPORTED_LANGUAGES.map(
        (lang) => getLanguageName(lang)
      ).join(", ")}`;
    }
    setIsLoading(true);
    setError(null);
    setTranslatorError(null);

    try {
      const detectedLanguageResult = await detectLanguage(text, 1);
      if (!detectedLanguageResult || Array.isArray(detectedLanguageResult)) {
        return "Error: Could not reliably detect the source language.";
      }

      const sourceLanguage = detectedLanguageResult.detectedLanguage;
      if (!SUPPORTED_LANGUAGES.includes(sourceLanguage)) {
        return `Error: Detected language '${getLanguageName(
          sourceLanguage
        )}' is not supported. Supported languages: ${SUPPORTED_LANGUAGES.map(
          (lang) => getLanguageName(lang)
        ).join(", ")}`;
      }

      const instance = await translator.create({
        sourceLanguage,
        targetLanguage,
      });
      const translatedText = await instance.translate(text);
      setSourceLanguage(sourceLanguage);
      return translatedText;
    } catch (err) {
      setTranslatorError("Error translating text.");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const getLanguageName = (
    languageTag: string | null,
    targetLanguage: string = "en"
  ) => {
    if (!languageTag) return "Unknown";
    try {
      const displayNames = new Intl.DisplayNames([targetLanguage], {
        type: "language",
      });
      return displayNames.of(languageTag) || languageTag;
    } catch {
      return languageTag;
    }
  };

  return (
    <LanguageProcessingContext.Provider
      value={{
        detectLanguage,
        translateText,
        getLanguageName,
        sourceLanguage,
        isLoading,
        translatorError,
        error,
      }}
    >
      {children}
    </LanguageProcessingContext.Provider>
  );
};
