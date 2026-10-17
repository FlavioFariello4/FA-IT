type FormDataResult =
  | { formData: FormData }
  | { tooLarge: true }
  | { invalidContentType: true };

export async function parseMultipartForm(
  request: Request,
  maxBytes: number,
): Promise<FormDataResult> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data;")) {
    return { invalidContentType: true };
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return { tooLarge: true };
  }

  const reader = request.body?.getReader();
  if (!reader) {
    return { invalidContentType: true };
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      return { tooLarge: true };
    }
    chunks.push(value);
  }

  const buffer = new ArrayBuffer(totalBytes);
  const boundedBytes = new Uint8Array(buffer);
  let offset = 0;
  for (const chunk of chunks) {
    boundedBytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const body = new Blob([buffer], { type: contentType });
  const boundedRequest = new Request(request.url, {
    method: "POST",
    headers: { "content-type": contentType },
    body,
  });
  return { formData: await boundedRequest.formData() };
}
