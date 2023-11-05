export class Response extends Writable<any, any, any, false, true, import("streamx").WritableEvents<any>> {
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
import { Writable } from 'streamx';
import { kHeaders } from './symbols.js';
