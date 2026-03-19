import {
  getProviderExecutionCapabilities,
  getProviderExecutionRegistration,
  type ProviderExecutionAudioRequest,
  type ProviderExecutionCapability,
  type ProviderExecutionImageRequest,
  type ProviderExecutionTextRequest,
  type ProviderExecutionVideoPollRequest,
  type ProviderExecutionVideoRequest,
} from './provider/registry.js';

export type ProviderGatewayCapability = ProviderExecutionCapability;
type ProviderGatewayTextRequest = ProviderExecutionTextRequest;
type ProviderGatewayImageRequest = ProviderExecutionImageRequest;
type ProviderGatewayVideoRequest = ProviderExecutionVideoRequest;
type ProviderGatewayVideoPollRequest = ProviderExecutionVideoPollRequest;
type ProviderGatewayAudioRequest = ProviderExecutionAudioRequest;

function getUnsupportedCapabilityError(providerCode: string, capability: string) {
  return new Error(`Provider ${providerCode} does not support ${capability} generation in provider gateway.`);
}

function getUnsupportedPollingError(providerCode: string) {
  return new Error(`Provider ${providerCode} does not support video polling in provider gateway.`);
}

export function getProviderGatewayCapabilities(providerCode: string): Record<ProviderGatewayCapability, boolean> {
  return getProviderExecutionCapabilities(providerCode);
}

export function supportsProviderGatewayCapability(providerCode: string, capability: ProviderGatewayCapability) {
  return getProviderGatewayCapabilities(providerCode)[capability];
}

export async function submitTextGeneration(args: ProviderGatewayTextRequest) {
  const registration = getProviderExecutionRegistration(args.providerCode);
  if (!registration?.handlers.text) {
    throw getUnsupportedCapabilityError(args.providerCode, 'text');
  }

  return registration.handlers.text(args);
}

export async function submitImageGeneration(args: ProviderGatewayImageRequest) {
  const registration = getProviderExecutionRegistration(args.providerCode);
  if (!registration?.handlers.image) {
    throw getUnsupportedCapabilityError(args.providerCode, 'image');
  }

  return registration.handlers.image(args);
}

export async function submitVideoGeneration(args: ProviderGatewayVideoRequest) {
  const registration = getProviderExecutionRegistration(args.providerCode);
  if (!registration?.handlers.video) {
    throw getUnsupportedCapabilityError(args.providerCode, 'video');
  }

  return registration.handlers.video(args);
}

export async function queryVideoGenerationTask(args: ProviderGatewayVideoPollRequest) {
  const registration = getProviderExecutionRegistration(args.providerCode);
  if (!registration?.handlers.pollVideo) {
    throw getUnsupportedPollingError(args.providerCode);
  }

  return registration.handlers.pollVideo(args);
}

export async function submitAudioGeneration(args: ProviderGatewayAudioRequest) {
  const registration = getProviderExecutionRegistration(args.providerCode);
  if (!registration?.handlers.audio) {
    throw getUnsupportedCapabilityError(args.providerCode, 'audio');
  }

  return registration.handlers.audio(args);
}
