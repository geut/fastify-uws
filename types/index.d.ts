declare module '@geut/fastify-uws' {
	import type { default as EventEmitter } from 'events';
	import type { default as uws } from 'uWebSockets.js';
	import type { Duplex, Readable, Writable } from 'streamx';
	export { DEDICATED_COMPRESSOR_128KB, DEDICATED_COMPRESSOR_16KB, DEDICATED_COMPRESSOR_256KB, DEDICATED_COMPRESSOR_32KB, DEDICATED_COMPRESSOR_3KB, DEDICATED_COMPRESSOR_4KB, DEDICATED_COMPRESSOR_64KB, DEDICATED_COMPRESSOR_8KB, DEDICATED_DECOMPRESSOR, DEDICATED_DECOMPRESSOR_16KB, DEDICATED_DECOMPRESSOR_1KB, DEDICATED_DECOMPRESSOR_2KB, DEDICATED_DECOMPRESSOR_32KB, DEDICATED_DECOMPRESSOR_4KB, DEDICATED_DECOMPRESSOR_512B, DEDICATED_DECOMPRESSOR_8KB, DISABLED, SHARED_COMPRESSOR, SHARED_DECOMPRESSOR } from 'uWebSockets.js';
	/// <reference types="node" resolution-mode="require"/>
	export class Server extends EventEmitter {
		
		constructor(handler: (req: Request, res: Response) => void, opts?: ServerOptions);
		timeout: number;
		
		get encrypted(): boolean;
		
		setTimeout(timeout: number): void;
		
		address(): {
			address: string;
			port: number;
		};
		
		listen(listenOptions: {
			host: string;
			port: number;
		}, cb: () => void): void;
		
		close(cb?: () => void): void;
		ref(): void;
		unref(): void;
		[kListen]({ port, host }: {
			port: any;
			host: any;
		}): Promise<any>;
		[kHandler]: (req: Request, res: Response) => void;
		[kHttps]: boolean | uws.AppOptions | {
			key: string;
			cert: string;
		};
		
		[kWs]: WebSocketServer;
		[kAddress]: any;
		[kListenSocket]: any;
		[kApp]: uws.TemplatedApp;
		[kClosed]: boolean;
	}

	export const serverFactory: FastifyServerFactory;
	export function getUws(fastify: import('fastify').FastifyInstance): uws.TemplatedApp;
	export type ServerOptions = {
		connectionTimeout?: number;
		https?: {
			key: string;
			cert: string;
		} | Parameters<typeof uws.SSLApp>[0];
	};
	export type FastifyServerFactory = import('fastify').FastifyServerFactory;
	/// <reference types="node" resolution-mode="require"/>
	class WebSocket extends EventEmitter {
		
		static allocTopic(namespace: Buffer, topic: Buffer | string): Buffer;
		constructor(namespace: any, connection: any, topics?: {});
		
		namespace: Buffer;
		
		connection: uws.WebSocket<any>;
		topics: {};
		get uws(): boolean;
		
		allocTopic(topic: Buffer | string): Buffer;
		
		send(message: uws.RecognizedString, isBinary?: boolean, compress?: boolean): number;
		
		publish(topic: Buffer | string, message: uws.RecognizedString, isBinary?: boolean, compress?: boolean): boolean;
		
		subscribe(topic: Buffer | string): boolean;
		
		unsubscribe(topic: Buffer | string): boolean;
		
		isSubscribed(topic: Buffer | string): boolean;
		getTopics(): string[];
		close(): void;
		
		end(code?: number, shortMessage?: uws.RecognizedString): void;
		
		cork(cb: () => void): uws.WebSocket<any>;
		getBufferedAmount(): number;
		
		ping(message: uws.RecognizedString): number;
		
		on<T extends keyof WebsocketEvent>(eventName: T, listener: WebsocketEvent[T]): this;
		
		once<T_1 extends keyof WebsocketEvent>(eventName: T_1, listener: WebsocketEvent[T_1]): this;
		[kEnded]: boolean;
	}
	export class WebSocketStream extends Duplex<any, any, any, any, true, true, import("streamx").DuplexEvents<any, any>> {
		
		constructor(socket: WebSocket, opts?: {
			compress?: boolean | false;
			highWaterMark?: number | 16384;
			mapReadable?: (packet: {
				data: any;
				isBinary: boolean;
			}) => any;
			byteLengthReadable?: (packet: {
				data: any;
				isBinary: boolean;
			}) => number | 1024;
			mapWritable?: (data: any) => {
				data: any;
				isBinary: boolean;
				compress: boolean;
			};
			byteLengthWritable?: (packet: {
				data: any;
				isBinary: boolean;
				compress: boolean;
			}) => number | 1024;
		});
		
		socket: WebSocket;
		_onMessage(data: any, isBinary: any): void;
		_open(cb: any): void;
		_close(cb: any): void;
		_write(packet: any, cb: any): void;
	}
	class WebSocketServer extends EventEmitter {
		
		constructor(options?: WSOptions);
		options: {
			compression: number;
			maxPayloadLength: number;
			idleTimeout: number;
			closeOnBackpressureLimit?: number;
			maxBackpressure?: number;
			maxLifetime?: number;
			sendPingsAutomatically?: boolean;
		};
		connections: Set<any>;
		
		addServer(server: any): void;
		
		on<T extends keyof WebsocketServerEvent>(eventName: T, listener: WebsocketServerEvent[T]): this;
		
		once<T_1 extends keyof WebsocketServerEvent>(eventName: T_1, listener: WebsocketServerEvent[T_1]): this;
	}
	type UserData = {
		req: Request;
		handler: (ws: uws.WebSocket<UserData>) => void;
	};
	type UWSocket = uws.WebSocket<UserData> & {
		req: Request;
		websocket: WebSocket;
	};
	type WSOptions = {
		closeOnBackpressureLimit?: number;
		compression?: number;
		idleTimeout?: number;
		maxBackpressure?: number;
		maxLifetime?: number;
		maxPayloadLength?: number;
		sendPingsAutomatically?: boolean;
	};
	type WebsocketEvent = {
		close: (code: number, message: ArrayBuffer) => void;
		drain: () => void;
		message: (message: ArrayBuffer, isBinary: boolean) => void;
		ping: (message: ArrayBuffer) => void;
		pong: (message: ArrayBuffer) => void;
	};
	type WebsocketServerEvent = {
		open: (ws: UWSocket) => void;
		close: (ws: UWSocket, code: number, message: ArrayBuffer) => void;
		drain: (ws: UWSocket) => void;
		message: (ws: UWSocket, message: ArrayBuffer, isBinary: boolean) => void;
		ping: (ws: UWSocket, message: ArrayBuffer) => void;
		pong: (ws: UWSocket, message: ArrayBuffer) => void;
	};
	const kHttps: unique symbol;
	const kReq: unique symbol;
	const kHeaders: unique symbol;
	const kUrl: unique symbol;
	const kAddress: unique symbol;
	const kEnded: unique symbol;
	const kHandler: unique symbol;
	const kListenSocket: unique symbol;
	const kListen: unique symbol;
	const kApp: unique symbol;
	const kClosed: unique symbol;
	const kWs: unique symbol;
	class Request extends Readable<any, any, any, true, false, import("streamx").ReadableEvents<any>> {
		constructor(req: any, socket: any, method: any);
		socket: any;
		method: any;
		httpVersion: string;
		readableEnded: boolean;
		get aborted(): any;
		set url(arg: any);
		get url(): any;
		get headers(): any;
		setEncoding(encoding: any): void;
		setTimeout(timeout: any): void;
		destroy(err: any): void;
		_read(cb: any): any;
		[kReq]: any;
		[kUrl]: any;
		[kHeaders]: any;
	}
	class Response extends Writable<any, any, any, false, true, import("streamx").WritableEvents<any>> {
		constructor(socket: any);
		socket: any;
		statusCode: number;
		headersSent: boolean;
		chunked: boolean;
		contentLength: number;
		writableEnded: boolean;
		firstChunk: boolean;
		get aborted(): any;
		get finished(): boolean;
		get status(): string;
		get bytesWritten(): any;
		hasHeader(name: any): boolean;
		getHeader(name: any): any;
		getHeaders(): {};
		setHeader(name: any, value: any): void;
		removeHeader(name: any): void;
		writeHead(statusCode: any, statusMessage: any, headers: any): void;
		statusMessage: any;
		destroy(err: any): void;
		write(data: any): boolean;
		_write(data: any, cb: any): any;
		_destroy(cb: any): any;
		[kHeaders]: Map<any, any>;
	}
}

declare module '@geut/fastify-uws/plugin' {
  /// <reference path="./types/fastify-overload.d.ts" />
	import type { default as EventEmitter } from 'events';
	import type { default as uws } from 'uWebSockets.js';
	import type { Readable } from 'streamx';
	/// <reference types="node" resolution-mode="require"/>
	const _default: typeof fastifyUws;
	export default _default;
	export type FastifyPluginCallback<T> = import('fastify').FastifyPluginCallback<T>;
	export type WSOptions = WSOptions_1;
	export type Request = Request_1;
	function fastifyUws(instance: import("fastify").FastifyInstance<import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, import("fastify").FastifyBaseLogger, import("fastify").FastifyTypeProviderDefault>, opts: {
		errorHandler?: typeof defaultErrorHandler;
	} & WSOptions_1, done: (err?: Error) => void): void;
	/**
	 * @this 
	 * */
	function defaultErrorHandler(this: import("fastify").FastifyInstance<import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, import("fastify").FastifyBaseLogger, import("fastify").FastifyTypeProviderDefault>, err: Error, conn: WebSocket, request: import('fastify').FastifyRequest): void;
	/// <reference types="node" resolution-mode="require"/>
	class WebSocket extends EventEmitter {
		
		static allocTopic(namespace: Buffer, topic: Buffer | string): Buffer;
		constructor(namespace: any, connection: any, topics?: {});
		
		namespace: Buffer;
		
		connection: uws.WebSocket<any>;
		topics: {};
		get uws(): boolean;
		
		allocTopic(topic: Buffer | string): Buffer;
		
		send(message: uws.RecognizedString, isBinary?: boolean, compress?: boolean): number;
		
		publish(topic: Buffer | string, message: uws.RecognizedString, isBinary?: boolean, compress?: boolean): boolean;
		
		subscribe(topic: Buffer | string): boolean;
		
		unsubscribe(topic: Buffer | string): boolean;
		
		isSubscribed(topic: Buffer | string): boolean;
		getTopics(): string[];
		close(): void;
		
		end(code?: number, shortMessage?: uws.RecognizedString): void;
		
		cork(cb: () => void): uws.WebSocket<any>;
		getBufferedAmount(): number;
		
		ping(message: uws.RecognizedString): number;
		
		on<T extends keyof WebsocketEvent>(eventName: T, listener: WebsocketEvent[T]): this;
		
		once<T_1 extends keyof WebsocketEvent>(eventName: T_1, listener: WebsocketEvent[T_1]): this;
		[kEnded]: boolean;
	}
	type WSOptions_1 = {
		closeOnBackpressureLimit?: number;
		compression?: number;
		idleTimeout?: number;
		maxBackpressure?: number;
		maxLifetime?: number;
		maxPayloadLength?: number;
		sendPingsAutomatically?: boolean;
	};
	type WebsocketEvent = {
		close: (code: number, message: ArrayBuffer) => void;
		drain: () => void;
		message: (message: ArrayBuffer, isBinary: boolean) => void;
		ping: (message: ArrayBuffer) => void;
		pong: (message: ArrayBuffer) => void;
	};
	class Request_1 extends Readable<any, any, any, true, false, import("streamx").ReadableEvents<any>> {
		constructor(req: any, socket: any, method: any);
		socket: any;
		method: any;
		httpVersion: string;
		readableEnded: boolean;
		get aborted(): any;
		set url(arg: any);
		get url(): any;
		get headers(): any;
		setEncoding(encoding: any): void;
		setTimeout(timeout: any): void;
		destroy(err: any): void;
		_read(cb: any): any;
		[kReq]: any;
		[kUrl]: any;
		[kHeaders]: any;
	}
	const kReq: unique symbol;
	const kHeaders: unique symbol;
	const kUrl: unique symbol;
	const kEnded: unique symbol;
}

//# sourceMappingURL=index.d.ts.map