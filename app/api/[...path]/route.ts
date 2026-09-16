import {proxyBrowserRequest} from '../../../api/browser-proxy.mjs';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) { return proxyBrowserRequest(request); }
export async function POST(request: Request) { return proxyBrowserRequest(request); }
