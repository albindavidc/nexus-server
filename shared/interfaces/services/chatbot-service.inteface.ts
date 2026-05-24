import {
  IChatBotRequestDto,
  IChatBotResponseDto,
  IBulkChatRequestDto,
  IBulkChatResponseDto,
} from "../../types/chatbot.types";

export interface IChatBotService {
  chat(userId: string, dto: IChatBotRequestDto): Promise<IChatBotResponseDto>;
  chatStream(
    userId: string,
    dto: IChatBotRequestDto,
    onChunk: (chunk: string) => void,
    onDone: () => void,
    onError: (err: Error) => void,
  ): Promise<void>;
  bulkChat(
    userId: string,
    dto: IBulkChatRequestDto,
  ): Promise<IBulkChatResponseDto>;
}
