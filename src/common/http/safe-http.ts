import { lookup } from 'dns/promises';
import { isIP } from 'net';

export interface SafePostJsonOptions {
  timeoutMs: number;
  maxResponseBytes: number;
  blockPrivateNetworks: boolean;
}

export interface SafePostJsonResult {
  statusCode: number;
  body: string;
}

export async function safePostJson(
  url: string,
  body: unknown,
  headers: Record<string, string>,
  options: SafePostJsonOptions,
): Promise<SafePostJsonResult> {
  const parsedUrl = await assertSafeUrl(url, options.blockPrivateNetworks);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const response = await fetch(parsedUrl, {
      method: 'POST',
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        ...sanitizeHeaders(headers),
      },
      body: JSON.stringify(body),
    });
    const responseText = await readLimitedText(
      response,
      options.maxResponseBytes,
    );

    if (response.status >= 300 && response.status < 400) {
      throw new Error(
        `Delivery provider redirect was blocked: ${response.status}`,
      );
    }

    if (!response.ok) {
      throw new Error(
        `Delivery provider responded with ${response.status}: ${responseText.slice(
          0,
          500,
        )}`,
      );
    }

    return {
      statusCode: response.status,
      body: responseText.slice(0, options.maxResponseBytes),
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        `Delivery provider timed out after ${options.timeoutMs}ms`,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function assertSafeUrl(url: string, blockPrivateNetworks: boolean) {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error('Delivery URL must be a valid URL');
  }

  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    throw new Error('Delivery URL protocol must be http or https');
  }

  if (parsedUrl.username || parsedUrl.password) {
    throw new Error('Delivery URL credentials are not allowed');
  }

  if (!blockPrivateNetworks) {
    return parsedUrl;
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new Error('Delivery URL cannot target localhost');
  }

  const addresses =
    isIP(hostname) === 0
      ? await lookup(hostname, { all: true, verbatim: true })
      : [{ address: hostname }];

  for (const { address } of addresses) {
    if (isPrivateAddress(address)) {
      throw new Error('Delivery URL cannot target private or local networks');
    }
  }

  return parsedUrl;
}

function sanitizeHeaders(headers: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(headers).filter(
      ([key]) =>
        !['host', 'connection', 'content-length', 'transfer-encoding'].includes(
          key.toLowerCase(),
        ),
    ),
  );
}

async function readLimitedText(response: Response, maxBytes: number) {
  if (!response.body) {
    return '';
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  let done = false;
  while (!done) {
    const readResult = await reader.read();
    if (readResult.done) {
      done = true;
      break;
    }

    const value = readResult.value;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      reader.cancel().catch(() => undefined);
      throw new Error(`Delivery provider response exceeded ${maxBytes} bytes`);
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks).toString('utf8');
}

function isPrivateAddress(address: string) {
  const addressFamily = isIP(address);

  if (addressFamily === 0) {
    return true;
  }

  if (addressFamily === 4) {
    return isIPv4Private(address);
  }

  return isIPv6Private(address);
}

function isIPv4Private(address: string) {
  const parts = address.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return true;
  }

  const [first, second] = parts;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    first >= 224 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function isIPv6Private(address: string) {
  const normalized = address.toLowerCase();

  return (
    normalized === '::' ||
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe80') ||
    normalized.startsWith('::ffff:')
  );
}
