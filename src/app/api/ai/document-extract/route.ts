import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createTokenRouterChatCompletion, isTokenRouterConfigured } from '@/lib/ai/tokenrouter';
import { createAiInteractionLog } from '@/lib/ai/audit';
import { extractJsonObject } from '@/lib/ai/json';
import {
  buildDocumentReviewPrompt,
  buildFallbackDocumentReview,
  buildFallbackInvoiceExtraction,
  buildFallbackShipmentIntake,
  buildInvoiceExtractionPrompt,
  buildShipmentIntakePrompt,
  documentExtractionRequestSchema,
  documentReviewResponseSchema,
  extractDocumentTextWithMetadata,
  invoiceDraftResponseSchema,
  shipmentIntakeResponseSchema,
} from '@/lib/ai/document-extraction';
import { z } from 'zod';

function isTrustedUploadedFileUrl(fileUrl: string, request: NextRequest) {
  try {
    const parsedUrl = new URL(fileUrl);
    const requestUrl = new URL(request.url);
    const isSameOriginUpload = parsedUrl.origin === requestUrl.origin
      && (parsedUrl.pathname.startsWith('/uploads/') || parsedUrl.pathname.startsWith('/shipments/'));
    const isVercelBlobUpload = parsedUrl.hostname.endsWith('blob.vercel-storage.com')
      && parsedUrl.pathname.startsWith('/shipments/');

    return isSameOriginUpload || isVercelBlobUpload;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = documentExtractionRequestSchema.parse(await request.json());
    if (!isTrustedUploadedFileUrl(parsed.fileUrl, request)) {
      return NextResponse.json(
        { error: 'Document extraction is restricted to trusted uploaded files.' },
        { status: 400 },
      );
    }

    const extraction = await extractDocumentTextWithMetadata(parsed.fileUrl, parsed.fileType);
    const extractedText = extraction.text;

    let result:
      | z.infer<typeof invoiceDraftResponseSchema>
      | z.infer<typeof documentReviewResponseSchema>
      | z.infer<typeof shipmentIntakeResponseSchema>;
    let model = parsed.mode === 'invoice-draft'
      ? 'deterministic-invoice-extraction'
      : parsed.mode === 'shipment-intake'
      ? 'deterministic-shipment-intake'
      : 'deterministic-document-review';
    let source: 'tokenrouter-ai' | 'rules' = 'rules';
    let failureReason: string | null = extractedText ? null : extraction.failureReason || 'No text could be extracted from the document.';
    let prompt = parsed.mode === 'invoice-draft'
      ? buildInvoiceExtractionPrompt(parsed, extractedText)
      : parsed.mode === 'shipment-intake'
      ? buildShipmentIntakePrompt(parsed, extractedText)
      : buildDocumentReviewPrompt(parsed, extractedText);

    result = parsed.mode === 'invoice-draft'
      ? buildFallbackInvoiceExtraction(parsed, extractedText)
      : parsed.mode === 'shipment-intake'
      ? buildFallbackShipmentIntake(parsed, extractedText)
      : buildFallbackDocumentReview(parsed, extractedText);

    if ((await isTokenRouterConfigured()) && extractedText) {
      try {
        const completion = await createTokenRouterChatCompletion(
          [
            {
              role: 'system',
              content: parsed.mode === 'invoice-draft'
                ? 'You extract invoice fields from shipping documents. Return valid JSON only.'
                : parsed.mode === 'shipment-intake'
                ? 'You extract vehicle, auction, and intake fields from automotive bills of sale and titles. Return valid JSON only.'
                : 'You extract document metadata for shipping operations. Return valid JSON only.',
            },
            { role: 'user', content: prompt },
          ],
          { maxTokens: 450, temperature: 0.1 },
        );

        result = parsed.mode === 'invoice-draft'
          ? invoiceDraftResponseSchema.parse(extractJsonObject(completion.content))
          : parsed.mode === 'shipment-intake'
          ? shipmentIntakeResponseSchema.parse(extractJsonObject(completion.content))
          : documentReviewResponseSchema.parse(extractJsonObject(completion.content));
        model = completion.model;
        source = 'tokenrouter-ai';
      } catch (aiError) {
        failureReason = aiError instanceof Error ? aiError.message : 'TokenRouter AI failed; rules fallback was used.';
      }
    }

    const aiLog = await createAiInteractionLog({
      feature: parsed.mode === 'invoice-draft'
        ? 'invoice-extraction-review'
        : parsed.mode === 'shipment-intake'
        ? 'shipment-intake-review'
        : 'document-extraction-review',
      entityType: parsed.entityType ?? null,
      entityId: parsed.entityId ?? null,
      actorUserId: session.user.id,
      provider: source === 'tokenrouter-ai' ? 'tokenrouter-ai' : 'rules',
      model,
      prompt,
      response: JSON.stringify(result),
      requestPayload: {
        mode: parsed.mode,
        fileName: parsed.fileName,
        fileType: parsed.fileType,
        entityType: parsed.entityType,
        entityId: parsed.entityId,
        extractionTextLength: extractedText.length,
        extractionMethod: extraction.method,
        ocrAttempted: extraction.ocrAttempted,
      },
      responsePayload: {
        ...result,
        failureReason: source === 'rules' ? failureReason : null,
        extractionMethod: extraction.method,
        ocrAttempted: extraction.ocrAttempted,
      },
      status: source === 'tokenrouter-ai' ? 'SUCCESS' : 'FALLBACK',
    });

    return NextResponse.json({
      ...result,
      aiInteractionLogId: aiLog.id,
      source,
      model,
      extractionMethod: extraction.method,
      ocrAttempted: extraction.ocrAttempted,
      failureReason: source === 'rules' ? failureReason : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid document extraction request.', details: error.issues }, { status: 400 });
    }

    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to extract document data.' }, { status: 500 });
  }
}
