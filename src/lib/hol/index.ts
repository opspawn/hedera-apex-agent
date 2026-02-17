/**
 * HOL (Hashgraph Online) Integration Module
 *
 * Exports Registry Broker registration, HCS-10 connection handling,
 * and the singleton RegistryBrokerClient.
 */

export { RegistryBroker } from './registry-broker';
export type { RegistryBrokerConfig, RegistrationProfile, RegistrationResult, RegistryStatus } from './registry-broker';

export { ConnectionHandler } from './connection-handler';
export type { ConnectionHandlerConfig, ConnectionRequest, ActiveConnection, ConnectionMessage } from './connection-handler';

export { getClient, getUnauthenticatedClient } from './rb-client';
