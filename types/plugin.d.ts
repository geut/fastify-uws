declare const _default: typeof fastifyUws;
export default _default;
export type FastifyPluginCallback<T> = import("fastify").FastifyPluginCallback<T>;
export type WSOptions = import("./websocket-server.js").WSOptions;
export type Request = import("./request.js").Request;
declare function fastifyUws(instance: import("fastify").FastifyInstance<import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, import("fastify").FastifyBaseLogger, import("fastify").FastifyTypeProviderDefault>, opts: {
    errorHandler?: typeof defaultErrorHandler;
} & import("./websocket-server.js").WSOptions, done: (err?: Error) => void): void;
/**
 * @this {import('fastify').FastifyInstance}
 * @param {Error} err
 * @param {WebSocket} conn
 * @param {import('fastify').FastifyRequest} request
 */
declare function defaultErrorHandler(this: import("fastify").FastifyInstance<import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, import("fastify").FastifyBaseLogger, import("fastify").FastifyTypeProviderDefault>, err: Error, conn: WebSocket, request: import("fastify").FastifyRequest): void;
import { WebSocket } from './websocket-server.js';
import "./fastify-overload.d.ts"