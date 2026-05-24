export type ChatBotRole = "user" | "assistant";

export interface IChatBotMessage {
  role: ChatBotRole;
  message: string;
}

export interface IChatBotRequestDto {
  message: string;
  history?: IChatBotMessage[];
}

export interface IChatBotResponseDto {
  reply: string;
  tokensUsed?: number;
}

export interface IBulkChatItem {
  id: string;
  message: string;
  history?: IChatBotMessage[];
}

export interface IBulkChatRequestDto {
  items: IBulkChatItem[];
}

export interface IBulkChatResult {
  id: string;
  reply?: string;
  error?: string;
  tokensUsed?: number;
}

export interface IBulkChatResponseDto {
  results: IBulkChatResult[];
  totalTokensUsed: number;
  totalItems: number;
  successCount: number;
  errorCount: number;
}

export interface IBotMessagePayload {
  id: string;
  message: string;
  history?: IChatBotMessage[];
}

export interface IBotChunkPayload {
  id: string;
  chunk: string;
}

export interface IBotDonePayload {
  id: string;
  fullReply: string;
}

export interface IBotErrorPayload {
  id: string;
  error: string;
}
