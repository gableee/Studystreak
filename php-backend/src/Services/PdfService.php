<?php
declare(strict_types=1);

namespace App\Services;

final class PdfService
{
    /**
     * Render simple HTML to PDF bytes. Falls back to HTML string when mPDF is unavailable.
     * @return array{success: bool, content_type: string, body: string, filename: string}
     */
    public function render(string $html, string $filename = 'document.pdf'): array
    {
        if (class_exists('Mpdf\\Mpdf')) {
            try {
                $mpdf = new \Mpdf\Mpdf([
                    'mode' => 'utf-8',
                    'format' => 'A4',
                    'tempDir' => __DIR__ . '/../../tmp',
                ]);
                $mpdf->WriteHTML($this->baseStyles() . $html);
                $pdf = $mpdf->Output($filename, 'S'); // return as string
                return [
                    'success' => true,
                    'content_type' => 'application/pdf',
                    'body' => $pdf,
                    'filename' => $filename,
                ];
            } catch (\Throwable $e) {
                error_log('[PdfService] mPDF error: ' . $e->getMessage());
            }
        }

        // Fallback: return HTML payload when PDF engine not available
        return [
            'success' => false,
            'content_type' => 'text/html; charset=UTF-8',
            'body' => '<!doctype html><meta charset="utf-8"><h1>PDF rendering not available</h1>' . $html,
            'filename' => str_ends_with($filename, '.pdf') ? substr($filename, 0, -4) . '.html' : ($filename . '.html'),
        ];
    }

    private function baseStyles(): string
    {
        return '<style>
            body { font-family: DejaVu Sans, Arial, sans-serif; color: #0f172a; }
            h1 { font-size: 20px; margin-bottom: 12px; }
            h2 { font-size: 16px; margin: 16px 0 8px; }
            p { line-height: 1.6; }
            ul { margin: 8px 0 8px 20px; }
            li { margin: 4px 0; }
            table { border-collapse: collapse; width: 100%; margin: 8px 0; }
            th, td { border: 1px solid #e5e7eb; padding: 6px 8px; }
            .muted { color: #64748b; font-size: 12px; }
        </style>';
    }
}
