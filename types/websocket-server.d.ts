/**
 * @extends {EventEmitter<keyof WebsocketEvent, WebsocketEvent[keyof WebsocketEvent]>}
 */
export class WebSocket extends EventEmitter<keyof WebsocketEvent, ((code: number, message: ArrayBuffer) => void) | (() => void) | ((message: ArrayBuffer, isBinary: boolean) => void) | ((message: ArrayBuffer) => void) | ((message: ArrayBuffer) => void)> {
    /**
     * @param {Buffer} namespace
     * @param {Buffer | string} topic
     * @returns {Buffer}
     */
    static allocTopic(namespace: Buffer, topic: Buffer | string): Buffer;
    constructor(namespace: any, connection: any, topics?: {});
    /** @type {Buffer} */
    namespace: Buffer;
    /** @type {UWebSocket<any>} */
    connection: UWebSocket<any>;
    topics: {};
    get uws(): boolean;
    /**
     * @param {Buffer | string} topic
     * @returns {Buffer}
     */
    allocTopic(topic: Buffer | string): Buffer;
    /**
     * @param {RecognizedString} message
     * @param {boolean} [isBinary]
     * @param {boolean} [compress]
     */
    send(message: RecognizedString, isBinary?: boolean, compress?: boolean): number;
    /**
     * @param {Buffer | string} topic
     * @param {RecognizedString} message
     * @param {boolean} [isBinary]
     * @param {boolean} [compress]
     */
    publish(topic: Buffer | string, message: RecognizedString, isBinary?: boolean, compress?: boolean): boolean;
    /**
     * @param {Buffer | string} topic
     */
    subscribe(topic: Buffer | string): boolean;
    /**
     * @param {Buffer | string} topic
     */
    unsubscribe(topic: Buffer | string): boolean;
    /**
     * @param {Buffer | string} topic
     */
    isSubscribed(topic: Buffer | string): boolean;
    getTopics(): string[];
    close(): void;
    /**
     * @param {number} [code]
     * @param {RecognizedString} [shortMessage]
     */
    end(code?: number, shortMessage?: RecognizedString): void;
    /**
     * @param {() => void} cb
     */
    cork(cb: () => void): import("uWebSockets.js").WebSocket<any>;
    getBufferedAmount(): number;
    /**
     * @param {RecognizedString} message
     */
    ping(message: RecognizedString): number;
    [kEnded]: boolean;
}
export class WebSocketStream extends Duplex<any, any, any, any, true, true, import("streamx").DuplexEvents<any, any>> {
    /**
     *
     * @param {WebSocket} socket
     * @param {{
     *  compress?: boolean | false
     *  highWaterMark?: number | 16384
     *  mapReadable?: (packet: { data: any, isBinary: boolean }) => any // optional function to map input data
     *  byteLengthReadable?: (packet: { data: any, isBinary: boolean }) => number | 1024 // optional function that calculates the byte size of input data,
     *  mapWritable?: (data: any) => { data: any, isBinary: boolean, compress: boolean } // optional function to map input data
     *  byteLengthWritable?: (packet: { data: any, isBinary: boolean, compress: boolean }) => number | 1024 // optional function that calculates the byte size of input data
     * }} opts
     */
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
    /** @type {WebSocket} */
    socket: WebSocket;
    _onMessage(data: any, isBinary: any): void;
    _open(cb: any): void;
    _close(cb: any): void;
    _write(packet: any, cb: any): void;
}
/**
 * @extends {EventEmitter<keyof WebsocketServerEvent, WebsocketServerEvent[keyof WebsocketServerEvent]>}
 */
export class WebSocketServer extends EventEmitter<keyof WebsocketServerEvent, ((ws: UWSocket) => void) | ((ws: UWSocket, code: number, message: ArrayBuffer) => void) | ((ws: UWSocket) => void) | ((ws: UWSocket, message: ArrayBuffer, isBinary: boolean) => void) | ((ws: UWSocket, message: ArrayBuffer) => void) | ((ws: UWSocket, message: ArrayBuffer) => void)> {
    /**
     * @param {WSOptions} options
     */
    constructor(options?: WSOptions);
    options: {
        compression: any;
        maxPayloadLength: number;
        idleTimeout: number;
        closeOnBackpressureLimit?: boolean;
        maxBackpressure?: number;
        maxLifetime?: number;
        sendPingsAutomatically?: boolean;
    };
    connections: Set<any>;
    /**
     * @param {import('./server.js').Server} server
     */
    addServer(server: import("./server.js").Server): void;
}
export type UWebSocket<T> = import("uWebSockets.js").WebSocket<T>;
export type TemplatedApp = import("uWebSockets.js").TemplatedApp;
export type RecognizedString = import("uWebSockets.js").RecognizedString;
export type UserData = {
    req: Request;
    handler: (ws: UWebSocket<UserData>) => void;
};
export type UWSocket = UWebSocket<UserData> & {
    req: Request;
    websocket: WebSocket;
};
export type WSOptions = {
    closeOnBackpressureLimit?: boolean;
    compression?: number;
    idleTimeout?: number;
    maxBackpressure?: number;
    maxLifetime?: number;
    maxPayloadLength?: number;
    sendPingsAutomatically?: boolean;
};
export type WebsocketEvent = {
    close: (code: number, message: ArrayBuffer) => void;
    drain: () => void;
    message: (message: ArrayBuffer, isBinary: boolean) => void;
    ping: (message: ArrayBuffer) => void;
    pong: (message: ArrayBuffer) => void;
};
export type WebsocketServerEvent = {
    open: (ws: UWSocket) => void;
    close: (ws: UWSocket, code: number, message: ArrayBuffer) => void;
    drain: (ws: UWSocket) => void;
    message: (ws: UWSocket, message: ArrayBuffer, isBinary: boolean) => void;
    ping: (ws: UWSocket, message: ArrayBuffer) => void;
    pong: (ws: UWSocket, message: ArrayBuffer) => void;
};
import { EventEmitter } from 'eventemitter3';
import { kEnded } from './symbols.js';
import { Duplex } from 'streamx';
import { Request } from './request.js';
