# AI-Powered Chat App | Chat With Isime

This is an AI-powered chat application built using **React** and **TypeScript**. It allows users to send messages, detect language, translate text, and summarize messages using Chrome's AI APIs.

## Features

✅ **Real-Time Language Detection**: Detects the language of the input text as you type.
✅ **Text Translation**: Translate messages into multiple languages (English, Portuguese, Spanish, Russian, Turkish, French).
✅ **Text Summarization**: Summarizes long messages using AI-powered summarization.
✅ **Message Storage**: Messages persist using local storage.
✅ **Accessibility**: Supports keyboard navigation and screen readers.
✅ **Interactive UI**: Users can long-press messages to access options.

## Tech Stack

- **React** (with Hooks & Context API)
- **TypeScript**
- **Chrome AI APIs** (for language processing)

## Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/lawalOyinlola/HNG12-Stage3-AI-Powered-Text-Processing-UI.git
   cd HNG12-Stage3-AI-Powered-Text-Processing-UI
   ```

2. Install dependencies:

   ```sh
   npm install
   ```

3. Start the development server:
   ```sh
   npm run dev
   ```

## Usage

1. **Start Chatting**: Type a message and send it.
2. **Detect Language**: The app automatically detects the language of the input text.
3. **Translate Messages**:
   - Click the '⋮' button on a message.
   - Select a target language.
4. **Summarize Messages**:
   - Click the '⋮' button on a long message.
   - Click the 'Summarize' button.
   - The summary will be inserted right after the original message.

## Accessibility Features

- Keyboard navigation and focus states.
- Screen reader-friendly labels.
- ARIA attributes for dynamic elements.

## Known Issues & Improvements

- **Delayed Summarization**: The first attempt to summarize may show an error due to initialization delays.
- **Better UI for Message Actions**: Could improve how users interact with translation and summarization options.

## Contributing

1. Fork the repository.
2. Create a new branch:
   ```sh
   git checkout -b feature-branch
   ```
3. Commit your changes:
   ```sh
   git commit -m "Add a new feature"
   ```
4. Push to the branch:
   ```sh
   git push origin feature-branch
   ```
5. Open a Pull Request.
