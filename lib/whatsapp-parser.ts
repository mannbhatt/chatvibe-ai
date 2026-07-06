import JSZip from 'jszip';
import * as FileSystem from 'expo-file-system/legacy';

export type ParsedMessage = {
  timestamp: string;
  sender: string;
  message: string;
};

export type ParseResult = {
  messages: ParsedMessage[];
  participants: string[];
};

// Regex to detect phone numbers
// E.g., +1 234-567-8900, 1234567890, +44 7911 123456
const PHONE_REGEX = /(\+?\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}/g;

export function redactPhoneNumbers(text: string): string {
  if (!text) return text;
  // Fallback broad digit matcher if standard phone regex misses weird formatting
  // Matches any string with 7 or more digits with spaces/dashes between them
  const broadDigitRegex = /(?:\+?\d[\s-]?){7,15}/g;
  return text.replace(broadDigitRegex, '[number]');
}

export function redactString(str: string): string {
  return redactPhoneNumbers(str);
}

export const parseWhatsAppText = (rawText: string): ParseResult => {
  const lines = rawText.split(/\r?\n/);
  const messages: ParsedMessage[] = [];
  const participantsSet = new Set<string>();

  // Matches: DD/MM/YY, H:MM am/pm - Sender Name: message (Android)
  const androidRegex = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s(\d{1,2}:\d{2}(?::\d{2})?\s?(?:am|pm|AM|PM)?)\s-\s([^:]+?):\s(.*)$/;
  // Matches: [DD/MM/YYYY, HH:MM:SS] Sender Name: message (iOS)
  const iosRegex = /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s(\d{1,2}:\d{2}:\d{2}\s?(?:AM|PM|am|pm)?)\]\s([^:]+?):\s(.*)$/;

  let currentMessage: ParsedMessage | null = null;

  for (let line of lines) {
    if (!line.trim()) continue;

    const androidMatch = line.match(androidRegex);
    const iosMatch = line.match(iosRegex);

    if (androidMatch || iosMatch) {
      const match = androidMatch || iosMatch;
      // If it's a new message, push the old one
      if (currentMessage) {
        messages.push(currentMessage);
      }

      // Filter out "<Media omitted>" and system messages (which wouldn't match the colon anyway)
      const messageText = match![4].trim();
      if (messageText === '<Media omitted>' || messageText === 'image omitted' || messageText === 'video omitted' || messageText === 'sticker omitted') {
        currentMessage = null; // Skip this message
        continue;
      }

      const sender = redactString(match![3].trim());
      participantsSet.add(sender);

      currentMessage = {
        timestamp: `${match![1]}, ${match![2]}`,
        sender: sender,
        message: redactString(messageText),
      };
    } else {
      // It's a multi-line message continuation
      // Also verify it's not an android system message like "DD/MM/YY, H:MM - You added John"
      const androidSystemRegex = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s(\d{1,2}:\d{2}(?::\d{2})?\s?(?:am|pm|AM|PM)?)\s-\s(.*)$/;
      const iosSystemRegex = /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s(\d{1,2}:\d{2}:\d{2}\s?(?:AM|PM|am|pm)?)\]\s(.*)$/;

      if (androidSystemRegex.test(line) || iosSystemRegex.test(line)) {
        continue; // It's a system event (no colon), ignore it
      }

      if (currentMessage) {
        currentMessage.message += '\n' + redactString(line);
      }
    }
  }

  // Push the last message
  if (currentMessage) {
    messages.push(currentMessage);
  }

  // Slice to last 150 messages to save tokens and prevent huge payloads
  const recentMessages = messages.slice(-150);

  return {
    messages: recentMessages,
    participants: Array.from(participantsSet),
  };
};

export const extractZipAndParse = async (fileUri: string): Promise<ParseResult> => {
  const fileInfo = await FileSystem.getInfoAsync(fileUri, { size: true });
  if (fileInfo.exists && fileInfo.size && fileInfo.size > 10 * 1024 * 1024) {
    throw new Error('File exceeds 10MB limit.');
  }

  // Read file as base64
  const base64Data = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(base64Data, { base64: true });
  
  const foundFiles = Object.keys(loadedZip.files);

  for (const filename of foundFiles) {
    if (filename.endsWith('.txt') && !filename.startsWith('__MACOSX')) {
      const text = await loadedZip.files[filename].async("string");
      return parseWhatsAppText(text);
    }
  }

  throw new Error(`No .txt file found inside the ZIP archive. Found files: ${foundFiles.join(', ')}`);
};
