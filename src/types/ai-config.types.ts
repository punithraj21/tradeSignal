export type AIProviderName = "openrouter" | "pollinations" | "anthropic" | "google";

export interface AIModelConfig {
  id?: string;
  provider: AIProviderName;
  modelId: string;
  displayName: string;
  isActive: boolean;
  isDefault: boolean;
  capabilities: ("chat" | "structured-output" | "streaming")[];
  createdAt: Date;
  updatedAt: Date;
}
