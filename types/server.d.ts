export class Server {
    /**
     * @param {(req: Request, res: Response) => void} handler
     * @param {ServerOptions} opts
     */
    constructor(handler: (req: Request, res: Response) => void, opts?: ServerOptions);
    timeout: number;
    /** @type {boolean} */
    get encrypted(): boolean;
    /**
     * @param {number} timeout
     */
    setTimeout(timeout: number): void;
    /**
     * @returns {{ address: string, port: number }}
     */
    address(): {
        address: string;
        port: number;
    };
    /**
     *
     * @param {{ host: string, port: number }} listenOptions
     * @param {() => void} cb
     */
    listen(listenOptions: {
        host: string;
        port: number;
    }, cb: () => void): void;
    /**
     * @param {() => void} [cb]
     */
    close(cb?: () => void): void;
    ref(): void;
    unref(): void;
    [kListen]({ port, host }: {
        port: any;
        host: any;
    }): Promise<any>;
    [kHandler]: (req: Request, res: Response) => void;
    [kHttps]: boolean | import("uWebSockets.js").AppOptions | {
        key: string;
        cert: string;
    };
    /** @type {import('./websocket-server.js').WebSocketServer} */
    [kWs]: import('./websocket-server.js').WebSocketServer;
    [kAddress]: any;
    [kListenSocket]: any;
    [kApp]: any;
    [kClosed]: boolean;
}
/** @type {FastifyServerFactory} */
export const serverFactory: FastifyServerFactory;
export function getUws(fastify: import('fastify').FastifyInstance): TemplatedApp;
export { WebSocketStream } from "./websocket-server.js";
export type TemplatedApp = import('uWebSockets.js').TemplatedApp;
export type SSLApp = typeof import("uWebSockets.js").SSLApp;
export type ServerOptions = {
    connectionTimeout?: number;
    https?: {
        key: string;
        cert: string;
    } | Parameters<SSLApp>[0];
};
export type FastifyServerFactory = import('fastify').FastifyServerFactory;
import { kListen } from './symbols.js';
import { kHandler } from './symbols.js';
import { Request } from './request.js';
import { Response } from './response.js';
import { kHttps } from './symbols.js';
import { kWs } from './symbols.js';
import { kAddress } from './symbols.js';
import { kListenSocket } from './symbols.js';
import { kApp } from './symbols.js';
import { kClosed } from './symbols.js';
export { DEDICATED_COMPRESSOR_128KB, DEDICATED_COMPRESSOR_16KB, DEDICATED_COMPRESSOR_256KB, DEDICATED_COMPRESSOR_32KB, DEDICATED_COMPRESSOR_3KB, DEDICATED_COMPRESSOR_4KB, DEDICATED_COMPRESSOR_64KB, DEDICATED_COMPRESSOR_8KB, DEDICATED_DECOMPRESSOR, DEDICATED_DECOMPRESSOR_16KB, DEDICATED_DECOMPRESSOR_1KB, DEDICATED_DECOMPRESSOR_2KB, DEDICATED_DECOMPRESSOR_32KB, DEDICATED_DECOMPRESSOR_4KB, DEDICATED_DECOMPRESSOR_512B, DEDICATED_DECOMPRESSOR_8KB, DISABLED, SHARED_COMPRESSOR, SHARED_DECOMPRESSOR } from "uWebSockets.js";
