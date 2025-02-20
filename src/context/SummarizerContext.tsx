import { createContext, useContext, useState, ReactNode } from "react";

interface SummarizerContextType {
  summarizeText: (text: string, context?: string) => Promise<string | null>;

  isLoading: boolean;
  error: string | null;
}

const SummarizerContext = createContext<SummarizerContextType | undefined>(
  undefined
);

export const useSummarizer = () => {
  const context = useContext(SummarizerContext);
  if (!context) {
    throw new Error("useSummarizer must be used within a SummarizerProvider");
  }
  return context;
};

export const SummarizerProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summarizer, setSummarizer] = useState<any | null>(null);

  // ✅ Check API support and initialize summarizer
  const initializeSummarizer = async () => {
    if (!("ai" in self) || !("summarizer" in self.ai)) {
      setError("Summarizer API is not supported in this browser.");
      return null;
    }

    try {
      const capabilities = await self.ai.summarizer.capabilities();
      if (capabilities.available === "no") {
        setError("Summarizer API is unavailable due to system limitations.");
        return null;
      }

      setError(null);
      setIsLoading(true);

      const newSummarizer = await self.ai.summarizer.create({
        type: "tl;dr",
        format: "plain-text",
        length: "medium",
      });

      if (capabilities.available === "after-download") {
        newSummarizer.addEventListener("downloadprogress", (e: any) => {
          console.log(`Downloading model: ${e.loaded} of ${e.total} bytes.`);
        });
        await newSummarizer.ready;
      }

      setSummarizer(newSummarizer);
      return newSummarizer;
    } catch (err) {
      setError("Error initializing Summarizer API.");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const summarizeText = async (text: string, context: string = "") => {
    if (!summarizer) {
      const initialized = await initializeSummarizer();
      if (!initialized) return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const summary = await summarizer.summarize(text, { context });
      return summary;
    } catch (err) {
      setError("Error summarizing text... Try again!");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SummarizerContext.Provider value={{ summarizeText, isLoading, error }}>
      {children}
    </SummarizerContext.Provider>
  );
};
