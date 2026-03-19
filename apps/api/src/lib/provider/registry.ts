import {
  queryArkVideoGeneration,
  submitArkAudioSpeech,
  submitArkImageGeneration,
  submitArkTextResponse,
  submitArkVideoGeneration,
} from '../ark-client.js';
import {
  queryPlatouVideoGeneration,
  submitPlatouChatCompletion,
  submitPlatouImageGeneration,
  submitPlatouVideoGeneration,
} from '../platou-client.js';
import type { TransportHookMetadata } from '../transport-hooks.js';

export type ProviderExecutionCapability = 'text' | 'image' | 'video' | 'audio' | 'lipsync';

interface ProviderExecutionBaseRequest {
  providerCode: string;
  baseUrl: string;
  apiKey: string;
  hookMetadata?: TransportHookMetadata;
}

export interface ProviderExecutionTextRequest extends ProviderExecutionBaseRequest {
  model: string;
  prompt: string;
}

export interface ProviderExecutionImageRequest extends ProviderExecutionBaseRequest {
  model: string;
  prompt: string;
}

export interface ProviderExecutionVideoRequest extends ProviderExecutionBaseRequest {
  model: string;
  prompt: string;
  images?: string[];
  duration?: number;
  aspectRatio?: string;
}

export interface ProviderExecutionVideoPollRequest extends ProviderExecutionBaseRequest {
  taskId: string;
}

export interface ProviderExecutionAudioRequest extends ProviderExecutionBaseRequest {
  model: string;
  prompt: string;
  voice?: string;
  responseFormat?: 'mp3' | 'wav';
}

interface ProviderExecutionHandlers {
  text?: (args: ProviderExecutionTextRequest) => Promise<Record<string, unknown>>;
  image?: (args: ProviderExecutionImageRequest) => Promise<Record<string, unknown>>;
  video?: (args: ProviderExecutionVideoRequest) => Promise<Record<string, unknown>>;
  pollVideo?: (args: ProviderExecutionVideoPollRequest) => Promise<Record<string, unknown>>;
  audio?: (args: ProviderExecutionAudioRequest) => Promise<Record<string, unknown>>;
  lipsync?: boolean;
}

interface ProviderExecutionRegistration {
  capabilities: Record<ProviderExecutionCapability, boolean>;
  handlers: ProviderExecutionHandlers;
}

const unsupportedCapabilities = {
  text: false,
  image: false,
  video: false,
  audio: false,
  lipsync: false,
} as const satisfies Record<ProviderExecutionCapability, boolean>;

const providerExecutionRegistry: Record<string, ProviderExecutionRegistration> = {
  ark: {
    capabilities: {
      text: true,
      image: true,
      video: true,
      audio: true,
      lipsync: false,
    },
    handlers: {
      text: (args) =>
        submitArkTextResponse({
          model: args.model,
          prompt: args.prompt,
          baseUrl: args.baseUrl,
          apiKey: args.apiKey,
          hookMetadata: args.hookMetadata,
        }),
      image: (args) =>
        submitArkImageGeneration({
          baseUrl: args.baseUrl,
          apiKey: args.apiKey,
          model: args.model,
          prompt: args.prompt,
          hookMetadata: args.hookMetadata,
        }),
      video: (args) =>
        submitArkVideoGeneration({
          baseUrl: args.baseUrl,
          apiKey: args.apiKey,
          model: args.model,
          prompt: args.prompt,
          images: args.images,
          duration: args.duration,
          aspectRatio: args.aspectRatio,
          hookMetadata: args.hookMetadata,
        }),
      pollVideo: (args) =>
        queryArkVideoGeneration({
          baseUrl: args.baseUrl,
          apiKey: args.apiKey,
          taskId: args.taskId,
          hookMetadata: args.hookMetadata,
        }),
      audio: (args) =>
        submitArkAudioSpeech({
          baseUrl: args.baseUrl,
          apiKey: args.apiKey,
          model: args.model,
          prompt: args.prompt,
          voice: args.voice,
          responseFormat: args.responseFormat,
          hookMetadata: args.hookMetadata,
        }),
      lipsync: false,
    },
  },
  platou: {
    capabilities: {
      text: true,
      image: true,
      video: true,
      audio: false,
      lipsync: false,
    },
    handlers: {
      text: (args) =>
        submitPlatouChatCompletion({
          baseUrl: args.baseUrl,
          apiKey: args.apiKey,
          model: args.model,
          prompt: args.prompt,
          hookMetadata: args.hookMetadata,
        }),
      image: (args) =>
        submitPlatouImageGeneration({
          baseUrl: args.baseUrl,
          apiKey: args.apiKey,
          model: args.model,
          prompt: args.prompt,
          hookMetadata: args.hookMetadata,
        }),
      video: (args) =>
        submitPlatouVideoGeneration({
          baseUrl: args.baseUrl,
          apiKey: args.apiKey,
          model: args.model,
          prompt: args.prompt,
          images: args.images,
          duration: args.duration,
          aspectRatio: args.aspectRatio,
          hookMetadata: args.hookMetadata,
        }),
      pollVideo: (args) =>
        queryPlatouVideoGeneration({
          baseUrl: args.baseUrl,
          apiKey: args.apiKey,
          taskId: args.taskId,
          hookMetadata: args.hookMetadata,
        }),
      lipsync: false,
    },
  },
};

export function normalizeProviderRegistryCode(providerCode: string) {
  return providerCode.trim().toLowerCase();
}

export function getProviderExecutionRegistration(providerCode: string) {
  return providerExecutionRegistry[normalizeProviderRegistryCode(providerCode)] ?? null;
}

export function getProviderExecutionCapabilities(providerCode: string): Record<ProviderExecutionCapability, boolean> {
  const registration = getProviderExecutionRegistration(providerCode);
  return registration?.capabilities ?? { ...unsupportedCapabilities };
}

export function supportsProviderExecutionCapability(providerCode: string, capability: ProviderExecutionCapability) {
  return getProviderExecutionCapabilities(providerCode)[capability];
}

export const __testables = {
  providerExecutionRegistry,
};
