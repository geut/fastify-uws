export class WebSocket {
    /**
     * @param {Buffer} namespace
     * @param {Buffer | string} topic
     * @returns {Buffer}
     */
    static allocTopic(namespace: Buffer, topic: Buffer | string): Buffer;
    constructor(namespace: any, connection: any, topics?: {});
    /** @type {Buffer} */
    namespace: Buffer;
    /** @type {uws.WebSocket<any>} */
    connection: uws.WebSocket<any>;
    topics: {};
    get uws(): boolean;
    /**
     * @param {Buffer | string} topic
     * @returns {Buffer}
     */
    allocTopic(topic: Buffer | string): Buffer;
    /**
     * @param {uws.RecognizedString} message
     * @param {boolean} [isBinary]
     * @param {boolean} [compress]
     */
    send(message: uws.RecognizedString, isBinary?: boolean, compress?: boolean): any;
    /**
     * @param {Buffer | string} topic
     * @param {uws.RecognizedString} message
     * @param {boolean} [isBinary]
     * @param {boolean} [compress]
     */
    publish(topic: Buffer | string, message: uws.RecognizedString, isBinary?: boolean, compress?: boolean): any;
    /**
     * @param {Buffer | string} topic
     */
    subscribe(topic: Buffer | string): any;
    /**
     * @param {Buffer | string} topic
     */
    unsubscribe(topic: Buffer | string): any;
    /**
     * @param {Buffer | string} topic
     */
    isSubscribed(topic: Buffer | string): any;
    getTopics(): any;
    close(): any;
    /**
     * @param {number} [code]
     * @param {uws.RecognizedString} [shortMessage]
     */
    end(code?: number, shortMessage?: uws.RecognizedString): any;
    /**
     * @param {() => void} cb
     */
    cork(cb: () => void): any;
    getBufferedAmount(): any;
    /**
     * @param {uws.RecognizedString} message
     */
    ping(message: uws.RecognizedString): any;
    /**
     * @template {keyof WebsocketEvent} T
     * @param {T} eventName
     * @param {WebsocketEvent[T]} listener
     */
    on<T extends keyof WebsocketEvent>(eventName: T, listener: WebsocketEvent[T]): any;
    /**
     * @template {keyof WebsocketEvent} T
     * @param {T} eventName
     * @param {WebsocketEvent[T]} listener
     */
    once<T_1 extends keyof WebsocketEvent>(eventName: T_1, listener: WebsocketEvent[T_1]): any;
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
export class WebSocketServer {
    /**
     * @param {WSOptions} options
     */
    constructor(options?: WSOptions);
    options: {
        compression: any;
        maxPayloadLength: number;
        idleTimeout: number;
        closeOnBackpressureLimit?: number;
        maxBackpressure?: number;
        maxLifetime?: number;
        sendPingsAutomatically?: boolean;
    };
    connections: Set<any>;
    /**
     * @param {import('./server.js').Server} server
     */
    addServer(server: import('./server.js').Server): void;
    /**
     * @template {keyof WebsocketServerEvent} T
     * @param {T} eventName
     * @param {WebsocketServerEvent[T]} listener
     */
    on<T extends keyof WebsocketServerEvent>(eventName: T, listener: WebsocketServerEvent[T]): any;
    /**
     * @template {keyof WebsocketServerEvent} T
     * @param {T} eventName
     * @param {WebsocketServerEvent[T]} listener
     */
    once<T_1 extends keyof WebsocketServerEvent>(eventName: T_1, listener: WebsocketServerEvent[T_1]): any;
}
export type UserData = {
    req: Request;
    handler: (ws: uws.WebSocket<UserData>) => void;
};
export type UWSocket = uws.WebSocket<UserData> & {
    req: Request;
    websocket: WebSocket;
};
export type WSOptions = {
    closeOnBackpressureLimit?: number;
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
import { kEnded } from './symbols.js';
import { Duplex } from 'streamx';
import { Request } from './request.js';
import uws from "uWebSockets.js"