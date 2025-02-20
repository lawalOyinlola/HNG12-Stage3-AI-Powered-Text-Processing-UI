import { createContext, useContext, useState, useEffect } from "react";

interface DetectedLanguage {
  detectedLanguage: string;
  confidence: number;
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

export const LanguageProcessingProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detector, setDetector] = useState<any>(null);
  const [translator, setTranslator] = useState<any>(null);
  const [sourceLanguage, setSourceLanguage] = useState<string | null>(null);

  const SUPPORTED_LANGUAGES = ["en", "pt", "es", "ru", "tr", "fr"];

  useEffect(() => {
    const setupAPIs = async () => {
      if (
        !("ai" in self) ||
        !("languageDetector" in (self as any).ai) ||
        !("translator" in (self as any).ai)
      ) {
        setError("AI APIs are not supported in this browser.");
        return;
      }

      try {
        // Setup Language Detector
        const detectorCapabilities = await (
          self as any
        ).ai.languageDetector.capabilities();
        if (detectorCapabilities.capabilities !== "no") {
          const newDetector = await (self as any).ai.languageDetector.create();
          await newDetector.ready;
          setDetector(newDetector);
        }

        // Setup Translator
        const translatorCapabilities = await (
          self as any
        ).ai.translator.capabilities();
        if (translatorCapabilities) {
          setTranslator((self as any).ai.translator);
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
        .filter((r: DetectedLanguage) => r.confidence >= 0.005)
        .map((r: DetectedLanguage) => ({
          detectedLanguage: r.detectedLanguage,
          confidence: r.confidence,
        }));

      console.log(results);

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
      setError("Error translating text.");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const getLanguageName = (
    languageTag: string,
    targetLanguage: string = "en"
  ) => {
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
        error,
      }}
    >
      {children}
    </LanguageProcessingContext.Provider>
  );
};
