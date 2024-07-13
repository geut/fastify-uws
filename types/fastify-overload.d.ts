/// <reference types="node" />

import { IncomingMessage, ServerResponse, Server } from 'http';
import { FastifyRequest, RawServerBase, RawServerDefault, RawRequestDefaultExpression, RawReplyDefaultExpression, RequestGenericInterface, ContextConfigDefault, FastifyInstance, FastifySchema, FastifyTypeProvider, FastifyTypeProviderDefault, FastifyBaseLogger } from 'fastify';
import * as fastify from 'fastify';
import { RouteGenericInterface } from 'fastify/types/route.js';
import type { WebSocketServer, WebSocket } from './websocket-server.js';

declare module 'fastify' {
  interface RouteShorthandOptions<
    RawServer extends RawServerBase = RawServerDefault
  > {
    uws?: true | { topics: Array<string | Buffer> }
  }

  interface FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider> {
    get: RouteShorthandMethod<RawServer, RawRequest, RawReply, TypeProvider, Logger>,
    websocketServer: WebSocketServer,
  }

  interface FastifyRequest {
    uws: boolean
  }

  interface RouteShorthandMethod<
    RawServer extends RawServerBase = RawServerDefault,
    RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
    RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
    TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault,
  > {
    <RequestGeneric extends RequestGenericInterface = RequestGenericInterface, ContextConfig = ContextConfigDefault, SchemaCompiler extends FastifySchema = FastifySchema, Logger extends FastifyBaseLogger = FastifyBaseLogger>(
      path: string,
      opts: { uws: true | { topics: Array<string | Buffer> } } & RouteShorthandOptions<RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig, SchemaCompiler, TypeProvider, Logger>, // this creates an overload that only applies these different types if the handler is for websockets
      handler?: fastifyUws.WebsocketHandler<RawServer, RawRequest, RequestGeneric, ContextConfig, SchemaCompiler, TypeProvider, Logger>
    ): FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider>;
  }

  interface RouteOptions<
    RawServer extends RawServerBase = RawServerDefault,
    RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
    RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
    RouteGeneric extends RouteGenericInterface = RouteGenericInterface,
    ContextConfig = ContextConfigDefault,
    SchemaCompiler = fastify.FastifySchema,
    TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault,
    Logger extends FastifyBaseLogger = FastifyBaseLogger
  > extends fastifyUws.WebsocketRouteOptions<RawServer, RawRequest, RouteGeneric, ContextConfig, SchemaCompiler, TypeProvider, Logger> { }
}

declare namespace fastifyUws {
  export interface WebsocketRouteOptions<
    RawServer extends RawServerBase = RawServerDefault,
    RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
    RequestGeneric extends RequestGenericInterface = RequestGenericInterface,
    ContextConfig = ContextConfigDefault,
    SchemaCompiler extends FastifySchema = FastifySchema,
    TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault,
    Logger extends FastifyBaseLogger = FastifyBaseLogger
  > {
    uwsHandler?: fastifyUws.WebsocketHandler<RawServer, RawRequest, RequestGeneric, ContextConfig, SchemaCompiler, TypeProvider, Logger>;
  }

  export type WebsocketHandler<
    RawServer extends RawServerBase = RawServerDefault,
    RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
    RequestGeneric extends RequestGenericInterface = RequestGenericInterface,
    ContextConfig = ContextConfigDefault,
    SchemaCompiler extends FastifySchema = FastifySchema,
    TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault,
    Logger extends FastifyBaseLogger = FastifyBaseLogger
  > = (
    this: FastifyInstance<Server, IncomingMessage, ServerResponse>,
    connection: WebSocket,
    request: FastifyRequest<RequestGeneric, RawServer, RawRequest, SchemaCompiler, TypeProvider, ContextConfig, Logger>
  ) => void | Promise<any>;
}
