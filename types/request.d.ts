export class Request extends Readable<any, any, any, true, false, import("streamx").ReadableEvents<any>> {
    constructor(req: any, socket: any, method: any);
    socket: any;
    method: any;
    httpVersion: string;
    readableEnded: boolean;
    get aborted(): any;
    set url(url: any);
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
import { Readable } from 'streamx';
import { kReq } from './symbols.js';
import { kUrl } from './symbols.js';
import { kHeaders } from './symbols.js';
