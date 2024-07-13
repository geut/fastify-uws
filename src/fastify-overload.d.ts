/* eslint-disable ts/prefer-function-type */
/* eslint-disable ts/no-invalid-void-type */
/* eslint-disable no-unused-vars */
/// <reference types="node" />

import type * as fastify from 'fastify'
import type { ContextConfigDefault, FastifyBaseLogger, FastifyInstance, FastifyRequest, FastifySchema, FastifyTypeProvider, FastifyTypeProviderDefault, RawReplyDefaultExpression, RawRequestDefaultExpression, RawServerBase, RawServerDefault, RequestGenericInterface } from 'fastify'
import type { RouteGenericInterface } from 'fastify/types/route.js'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'

import type { WebSocket, WebSocketServer } from './websocket-server.js'

declare module 'fastify' {
  interface RouteShorthandOptions<
    RawServer extends RawServerBase = RawServerDefault
  > {
    uws?: true | { topics: Array<string | Buffer> }
  }

  interface FastifyInstance<RawServer, RawRequest, RawReply, Logger, TypeProvider> {
    websocketServer: WebSocketServer
  }

  interface FastifyRequest {
    uws: boolean
  }

  interface RouteShorthandMethod<
    RawServer extends RawServerBase = RawServerDefault,
    RawRequest extends RawRequestDefaultExpression<RawServer> = RawRequestDefaultExpression<RawServer>,
    RawReply extends RawReplyDefaultExpression<RawServer> = RawReplyDefaultExpression<RawServer>,
    TypeProvider extends FastifyTypeProvider = FastifyTypeProviderDefault,
    Logger extends FastifyBaseLogger = FastifyBaseLogger
  > {
    <RequestGeneric extends RequestGenericInterface = RequestGenericInterface, ContextConfig = ContextConfigDefault, SchemaCompiler extends FastifySchema = FastifySchema, InnerLogger extends Logger = Logger>(
      path: string,
      opts: RouteShorthandOptions<RawServer, RawRequest, RawReply, RequestGeneric, ContextConfig, SchemaCompiler, TypeProvider, InnerLogger> & { uws: true | { topics: Array<string | Buffer> } }, // this creates an overload that only applies these different types if the handler is for websockets
      handler?: fastifyUws.WebsocketHandler<RawServer, RawRequest, RequestGeneric, ContextConfig, SchemaCompiler, TypeProvider, InnerLogger>
    ): FastifyInstance<RawServer, RawRequest, RawReply, InnerLogger, TypeProvider>
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
    uwsHandler?: fastifyUws.WebsocketHandler<RawServer, RawRequest, RequestGeneric, ContextConfig, SchemaCompiler, TypeProvider, Logger>
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
  ) => void | Promise<any>
}
