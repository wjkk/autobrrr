import {
  queryArkVideoGeneration,
  submitArkAudioSpeech,
  submitArkImageGeneration,
  submitArkTextResponse,
  submitArkVideoGeneration,
} from './ark-client.js';
import {
  queryPlatouVideoGeneration,
  submitPlatouChatCompletion,
  submitPlatouImageGeneration,
  submitPlatouVideoGeneration,
} from './platou-client.js';
import type { TransportHookMetadata } from './transport-hooks.js';

interface ProviderGatewayBaseRequest {
  providerCode: string;
  baseUrl: string;
  apiKey: string;
  hookMetadata?: TransportHookMetadata;
}

interface ProviderGatewayTextRequest extends ProviderGatewayBaseRequest {
  model: string;
  prompt: string;
}

interface ProviderGatewayImageRequest extends ProviderGatewayBaseRequest {
  model: string;
  prompt: string;
}

interface ProviderGatewayVideoRequest extends ProviderGatewayBaseRequest {
  model: string;
  prompt: string;
  images?: string[];
  duration?: number;
  aspectRatio?: string;
}

interface ProviderGatewayVideoPollRequest extends ProviderGatewayBaseRequest {
  taskId: string;
}

interface ProviderGatewayAudioRequest extends ProviderGatewayBaseRequest {
  model: string;
  prompt: string;
  voice?: string;
  responseFormat?: 'mp3' | 'wav';
}

export type ProviderGatewayCapability = 'text' | 'image' | 'video' | 'audio' | 'lipsync';

function normalizeProviderCode(providerCode: string) {
  return providerCode.trim().toLowerCase();
}

export function getProviderGatewayCapabilities(providerCode: string): Record<ProviderGatewayCapability, boolean> {
  const normalized = normalizeProviderCode(providerCode);

  if (normalized === 'ark') {
    return {
      text: true,
      image: true,
      video: true,
      audio: true,
      lipsync: false,
    };
  }

  if (normalized === 'platou') {
    return {
      text: true,
      image: true,
      video: true,
      audio: false,
      lipsync: false,
    };
  }

  return {
    text: false,
    image: false,
    video: false,
    audio: false,
    lipsync: false,
  };
}

export function supportsProviderGatewayCapability(providerCode: string, capability: ProviderGatewayCapability) {
  return getProviderGatewayCapabilities(providerCode)[capability];
}

export async function submitTextGeneration(args: ProviderGatewayTextRequest) {
  const providerCode = normalizeProviderCode(args.providerCode);

  if (providerCode === 'ark') {
    return submitArkTextResponse({
      model: args.model,
      prompt: args.prompt,
      baseUrl: args.baseUrl,
      apiKey: args.apiKey,
      hookMetadata: args.hookMetadata,
    });
  }

  if (providerCode === 'platou') {
    return submitPlatouChatCompletion({
      baseUrl: args.baseUrl,
      apiKey: args.apiKey,
      model: args.model,
      prompt: args.prompt,
      hookMetadata: args.hookMetadata,
    });
  }

  throw new Error(`Provider ${args.providerCode} does not support text generation in provider gateway.`);
}

export async function submitImageGeneration(args: ProviderGatewayImageRequest) {
  const providerCode = normalizeProviderCode(args.providerCode);

  if (providerCode === 'platou') {
    return submitPlatouImageGeneration({
      baseUrl: args.baseUrl,
      apiKey: args.apiKey,
      model: args.model,
      prompt: args.prompt,
      hookMetadata: args.hookMetadata,
    });
  }

  if (providerCode === 'ark') {
    return submitArkImageGeneration({
      baseUrl: args.baseUrl,
      apiKey: args.apiKey,
      model: args.model,
      prompt: args.prompt,
      hookMetadata: args.hookMetadata,
    });
  }

  throw new Error(`Provider ${args.providerCode} does not support image generation in provider gateway.`);
}

export async function submitVideoGeneration(args: ProviderGatewayVideoRequest) {
  const providerCode = normalizeProviderCode(args.providerCode);

  if (providerCode === 'platou') {
    return submitPlatouVideoGeneration({
      baseUrl: args.baseUrl,
      apiKey: args.apiKey,
      model: args.model,
      prompt: args.prompt,
      images: args.images,
      duration: args.duration,
      aspectRatio: args.aspectRatio,
      hookMetadata: args.hookMetadata,
    });
  }

  if (providerCode === 'ark') {
    return submitArkVideoGeneration({
      baseUrl: args.baseUrl,
      apiKey: args.apiKey,
      model: args.model,
      prompt: args.prompt,
      images: args.images,
      duration: args.duration,
      aspectRatio: args.aspectRatio,
      hookMetadata: args.hookMetadata,
    });
  }

  throw new Error(`Provider ${args.providerCode} does not support video generation in provider gateway.`);
}

export async function queryVideoGenerationTask(args: ProviderGatewayVideoPollRequest) {
  const providerCode = normalizeProviderCode(args.providerCode);

  if (providerCode === 'platou') {
    return queryPlatouVideoGeneration({
      baseUrl: args.baseUrl,
      apiKey: args.apiKey,
      taskId: args.taskId,
      hookMetadata: args.hookMetadata,
    });
  }

  if (providerCode === 'ark') {
    return queryArkVideoGeneration({
      baseUrl: args.baseUrl,
      apiKey: args.apiKey,
      taskId: args.taskId,
      hookMetadata: args.hookMetadata,
    });
  }

  throw new Error(`Provider ${args.providerCode} does not support video polling in provider gateway.`);
}

export async function submitAudioGeneration(args: ProviderGatewayAudioRequest) {
  const providerCode = normalizeProviderCode(args.providerCode);

  if (providerCode === 'ark') {
    return submitArkAudioSpeech({
      baseUrl: args.baseUrl,
      apiKey: args.apiKey,
      model: args.model,
      prompt: args.prompt,
      voice: args.voice,
      responseFormat: args.responseFormat,
      hookMetadata: args.hookMetadata,
    });
  }

  throw new Error(`Provider ${args.providerCode} does not support audio generation in provider gateway.`);
}
