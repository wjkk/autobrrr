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

interface ProviderGatewayHandlers {
  text?: (args: ProviderGatewayTextRequest) => Promise<Record<string, unknown>>;
  image?: (args: ProviderGatewayImageRequest) => Promise<Record<string, unknown>>;
  video?: (args: ProviderGatewayVideoRequest) => Promise<Record<string, unknown>>;
  pollVideo?: (args: ProviderGatewayVideoPollRequest) => Promise<Record<string, unknown>>;
  audio?: (args: ProviderGatewayAudioRequest) => Promise<Record<string, unknown>>;
  lipsync?: boolean;
}

const unsupportedCapabilities = {
  text: false,
  image: false,
  video: false,
  audio: false,
  lipsync: false,
} as const satisfies Record<ProviderGatewayCapability, boolean>;

const providerGatewayHandlers: Record<string, ProviderGatewayHandlers> = {
  ark: {
    text: (args: ProviderGatewayTextRequest) =>
      submitArkTextResponse({
        model: args.model,
        prompt: args.prompt,
        baseUrl: args.baseUrl,
        apiKey: args.apiKey,
        hookMetadata: args.hookMetadata,
      }),
    image: (args: ProviderGatewayImageRequest) =>
      submitArkImageGeneration({
        baseUrl: args.baseUrl,
        apiKey: args.apiKey,
        model: args.model,
        prompt: args.prompt,
        hookMetadata: args.hookMetadata,
      }),
    video: (args: ProviderGatewayVideoRequest) =>
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
    pollVideo: (args: ProviderGatewayVideoPollRequest) =>
      queryArkVideoGeneration({
        baseUrl: args.baseUrl,
        apiKey: args.apiKey,
        taskId: args.taskId,
        hookMetadata: args.hookMetadata,
      }),
    audio: (args: ProviderGatewayAudioRequest) =>
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
  platou: {
    text: (args: ProviderGatewayTextRequest) =>
      submitPlatouChatCompletion({
        baseUrl: args.baseUrl,
        apiKey: args.apiKey,
        model: args.model,
        prompt: args.prompt,
        hookMetadata: args.hookMetadata,
      }),
    image: (args: ProviderGatewayImageRequest) =>
      submitPlatouImageGeneration({
        baseUrl: args.baseUrl,
        apiKey: args.apiKey,
        model: args.model,
        prompt: args.prompt,
        hookMetadata: args.hookMetadata,
      }),
    video: (args: ProviderGatewayVideoRequest) =>
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
    pollVideo: (args: ProviderGatewayVideoPollRequest) =>
      queryPlatouVideoGeneration({
        baseUrl: args.baseUrl,
        apiKey: args.apiKey,
        taskId: args.taskId,
        hookMetadata: args.hookMetadata,
      }),
    lipsync: false,
  },
};

function normalizeProviderCode(providerCode: string) {
  return providerCode.trim().toLowerCase();
}

function getProviderGatewayHandlers(providerCode: string): ProviderGatewayHandlers | null {
  return providerGatewayHandlers[normalizeProviderCode(providerCode)] ?? null;
}

function getUnsupportedCapabilityError(providerCode: string, capability: string) {
  return new Error(`Provider ${providerCode} does not support ${capability} generation in provider gateway.`);
}

function getUnsupportedPollingError(providerCode: string) {
  return new Error(`Provider ${providerCode} does not support video polling in provider gateway.`);
}

export function getProviderGatewayCapabilities(providerCode: string): Record<ProviderGatewayCapability, boolean> {
  const handlers = getProviderGatewayHandlers(providerCode);
  if (!handlers) {
    return { ...unsupportedCapabilities };
  }

  return {
    text: Boolean(handlers.text),
    image: Boolean(handlers.image),
    video: Boolean(handlers.video),
    audio: Boolean(handlers.audio),
    lipsync: handlers.lipsync ?? false,
  };
}

export function supportsProviderGatewayCapability(providerCode: string, capability: ProviderGatewayCapability) {
  return getProviderGatewayCapabilities(providerCode)[capability];
}

export async function submitTextGeneration(args: ProviderGatewayTextRequest) {
  const handlers = getProviderGatewayHandlers(args.providerCode);
  if (!handlers?.text) {
    throw getUnsupportedCapabilityError(args.providerCode, 'text');
  }

  return handlers.text(args);
}

export async function submitImageGeneration(args: ProviderGatewayImageRequest) {
  const handlers = getProviderGatewayHandlers(args.providerCode);
  if (!handlers?.image) {
    throw getUnsupportedCapabilityError(args.providerCode, 'image');
  }

  return handlers.image(args);
}

export async function submitVideoGeneration(args: ProviderGatewayVideoRequest) {
  const handlers = getProviderGatewayHandlers(args.providerCode);
  if (!handlers?.video) {
    throw getUnsupportedCapabilityError(args.providerCode, 'video');
  }

  return handlers.video(args);
}

export async function queryVideoGenerationTask(args: ProviderGatewayVideoPollRequest) {
  const handlers = getProviderGatewayHandlers(args.providerCode);
  if (!handlers?.pollVideo) {
    throw getUnsupportedPollingError(args.providerCode);
  }

  return handlers.pollVideo(args);
}

export async function submitAudioGeneration(args: ProviderGatewayAudioRequest) {
  const handlers = getProviderGatewayHandlers(args.providerCode);
  if (!handlers?.audio) {
    throw getUnsupportedCapabilityError(args.providerCode, 'audio');
  }

  return handlers.audio(args);
}
