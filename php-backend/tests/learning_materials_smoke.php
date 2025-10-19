<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use GuzzleHttp\RequestOptions;

$options = getopt('', [
    'base-url::',
    'token:',
    'file::',
    'category::',
    'tags::',
]);

$baseUrl = isset($options['base-url']) ? rtrim((string)$options['base-url'], '/') : 'http://localhost:8181';
$token = $options['token'] ?? getenv('LEARNING_MATERIALS_JWT');
$fileOverride = $options['file'] ?? null;
$category = $options['category'] ?? null;
$tags = $options['tags'] ?? '[]';

if (!is_string($token) || $token === '') {
    fwrite(STDERR, "Missing bearer token. Provide --token=<JWT> or set LEARNING_MATERIALS_JWT env var." . PHP_EOL);
    exit(1);
}

$tempFile = null;
if ($fileOverride !== null) {
    if (!is_string($fileOverride) || $fileOverride === '' || !is_file($fileOverride)) {
        fwrite(STDERR, "Provided file path is invalid: {$fileOverride}" . PHP_EOL);
        exit(1);
    }
    $uploadFile = $fileOverride;
    $uploadFilename = basename($uploadFile);
    $detectedMime = mime_content_type($uploadFile);
    $uploadMime = is_string($detectedMime) && $detectedMime !== '' ? $detectedMime : null;
} else {
    $tempFile = tempnam(sys_get_temp_dir(), 'lm-test-');
    if ($tempFile === false) {
        fwrite(STDERR, "Failed to create temp file for upload" . PHP_EOL);
        exit(1);
    }
    $pdfStub = <<<PDF
%PDF-1.2
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Count 1 /Kids [3 0 R] >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 67 >>
stream
BT
/F1 18 Tf
36 140 Td
(StudyStreak smoke test PDF) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000056 00000 n 
0000000115 00000 n 
0000000251 00000 n 
0000000399 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
495
%%EOF
PDF;
    file_put_contents($tempFile, $pdfStub);
    $uploadFile = $tempFile;
    $uploadFilename = 'smoke-test.pdf';
    $uploadMime = 'application/pdf';
}

if (!isset($uploadMime) || $uploadMime === null) {
    $lowerName = strtolower($uploadFilename);
    if (str_ends_with($lowerName, '.pdf')) {
        $uploadMime = 'application/pdf';
    } elseif (str_ends_with($lowerName, '.ppt')) {
        $uploadMime = 'application/vnd.ms-powerpoint';
    } elseif (str_ends_with($lowerName, '.pptx')) {
        $uploadMime = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    } else {
        $uploadMime = 'application/octet-stream';
    }
}

$client = new Client([
    'base_uri' => $baseUrl,
    'http_errors' => false,
    'timeout' => 20,
]);

echo "==> GET /api/learning-materials" . PHP_EOL;
try {
    $listResponse = $client->request('GET', '/api/learning-materials', [
        RequestOptions::HEADERS => [
            'Authorization' => 'Bearer ' . $token,
            'Accept' => 'application/json',
        ],
        RequestOptions::QUERY => [
            'filter' => 'all',
            'limit' => 1,
        ],
    ]);
} catch (GuzzleException $e) {
    fwrite(STDERR, "List request failed: " . $e->getMessage() . PHP_EOL);
    cleanup($tempFile);
    exit(1);
}

$body = (string)$listResponse->getBody();
$payload = json_decode($body, true);

echo sprintf("Status: %d\n", $listResponse->getStatusCode());
if (is_array($payload)) {
    $count = count($payload);
    echo "Items returned: " . $count . PHP_EOL;
    if ($count > 0) {
        echo "First item title: " . ($payload[0]['title'] ?? '<missing>') . PHP_EOL;
    }
} else {
    echo "Response body: " . $body . PHP_EOL;
}

echo PHP_EOL . "==> POST /api/learning-materials" . PHP_EOL;
$title = 'Smoke Test ' . date('Y-m-d H:i:s');
$fileStream = fopen($uploadFile, 'rb');
if ($fileStream === false) {
    fwrite(STDERR, "Unable to open file for upload: {$uploadFile}" . PHP_EOL);
    cleanup($tempFile);
    exit(1);
}
$tagsPayload = is_string($tags) ? $tags : json_encode($tags);
if ($tagsPayload === false) {
    fwrite(STDERR, "Unable to encode tags payload" . PHP_EOL);
    if (is_resource($fileStream)) {
        fclose($fileStream);
    }
    cleanup($tempFile);
    exit(1);
}

try {
    $uploadResponse = $client->request('POST', '/api/learning-materials', [
        RequestOptions::HEADERS => [
            'Authorization' => 'Bearer ' . $token,
            'Accept' => 'application/json',
        ],
        RequestOptions::MULTIPART => [
            [
                'name' => 'title',
                'contents' => $title,
            ],
            [
                'name' => 'description',
                'contents' => 'Automated smoke test upload',
            ],
            [
                'name' => 'category',
                'contents' => $category ?? 'smoke-test',
            ],
            [
                'name' => 'tags',
                'contents' => $tagsPayload,
            ],
            [
                'name' => 'is_public',
                'contents' => 'false',
            ],
            [
                'name' => 'file',
                'contents' => $fileStream,
                'filename' => $uploadFilename,
                'headers' => [
                    'Content-Type' => $uploadMime,
                ],
            ],
        ],
    ]);
} catch (GuzzleException $e) {
    fwrite(STDERR, "Upload request failed: " . $e->getMessage() . PHP_EOL);
    if (is_resource($fileStream)) {
        fclose($fileStream);
    }
    cleanup($tempFile);
    exit(1);
}

if (is_resource($fileStream)) {
    fclose($fileStream);
}

echo sprintf("Status: %d\n", $uploadResponse->getStatusCode());
$uploadBody = (string)$uploadResponse->getBody();
$uploadPayload = json_decode($uploadBody, true);
if (is_array($uploadPayload)) {
    echo "Message: " . ($uploadPayload['message'] ?? '<none>') . PHP_EOL;
    $material = $uploadPayload['material'] ?? [];
    if (is_array($material)) {
        echo "Material ID: " . ($material['material_id'] ?? $material['id'] ?? '<unknown>') . PHP_EOL;
        echo "File URL: " . ($material['file_url'] ?? '<missing>') . PHP_EOL;
    }
} else {
    echo "Response body: " . $uploadBody . PHP_EOL;
}

cleanup($tempFile);
exit($uploadResponse->getStatusCode() >= 200 && $uploadResponse->getStatusCode() < 300 ? 0 : 2);

function cleanup(?string $tempFile): void
{
    if ($tempFile !== null && is_file($tempFile)) {
        @unlink($tempFile);
    }
}
