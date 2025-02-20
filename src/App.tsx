import React from "react";
import { LanguageProcessingProvider } from "./context/LanguageProcessingContext";
import ChatWindow from "./components/ChatWindow";
import { SummarizerProvider } from "./context/SummarizerContext";
import "./App.css";

const App: React.FC = () => {
  return (
    <LanguageProcessingProvider>
      <SummarizerProvider>
        <ChatWindow />
      </SummarizerProvider>
    </LanguageProcessingProvider>
  );
};

export default App;
