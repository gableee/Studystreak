CONSOLE RESULT FROM DEV TOOLS IN BROWSER
learning-materials:1 Access to fetch at 'http://localhost:8181/api/learning-materials/fa42b619-248b-49f4-85b8-2ea8fc8eb343' from origin 'http://localhost:5173' has been blocked by CORS policy: Method DELETE is not allowed by Access-Control-Allow-Methods in preflight response.
apiClient.ts:91  DELETE http://localhost:8181/api/learning-materials/fa42b619-248b-49f4-85b8-2ea8fc8eb343 net::ERR_FAILED
doFetch @ apiClient.ts:91
await in doFetch
request @ apiClient.ts:125
delete @ apiClient.ts:134
(anonymous) @ MaterialsList.tsx:265
executeDispatch @ react-dom_client.js?v=be2c8e21:11736
runWithFiberInDEV @ react-dom_client.js?v=be2c8e21:1485
processDispatchQueue @ react-dom_client.js?v=be2c8e21:11772
(anonymous) @ react-dom_client.js?v=be2c8e21:12182
batchedUpdates$1 @ react-dom_client.js?v=be2c8e21:2628
dispatchEventForPluginEventSystem @ react-dom_client.js?v=be2c8e21:11877
dispatchEvent @ react-dom_client.js?v=be2c8e21:14792
dispatchDiscreteEvent @ react-dom_client.js?v=be2c8e21:14773
<button>
exports.jsxDEV @ react_jsx-dev-runtime.js?v=be2c8e21:250
DeleteConfirmModal @ DeleteConfirmModal.tsx:32
react_stack_bottom_frame @ react-dom_client.js?v=be2c8e21:17424
renderWithHooksAgain @ react-dom_client.js?v=be2c8e21:4281
renderWithHooks @ react-dom_client.js?v=be2c8e21:4217
updateFunctionComponent @ react-dom_client.js?v=be2c8e21:6619
beginWork @ react-dom_client.js?v=be2c8e21:7654
runWithFiberInDEV @ react-dom_client.js?v=be2c8e21:1485
performUnitOfWork @ react-dom_client.js?v=be2c8e21:10868
workLoopSync @ react-dom_client.js?v=be2c8e21:10728
renderRootSync @ react-dom_client.js?v=be2c8e21:10711
performWorkOnRoot @ react-dom_client.js?v=be2c8e21:10330
performSyncWorkOnRoot @ react-dom_client.js?v=be2c8e21:11635
flushSyncWorkAcrossRoots_impl @ react-dom_client.js?v=be2c8e21:11536
processRootScheduleInMicrotask @ react-dom_client.js?v=be2c8e21:11558
(anonymous) @ react-dom_client.js?v=be2c8e21:11649
MaterialsList.tsx:276 Failed to delete material TypeError: Failed to fetch
    at doFetch (apiClient.ts:91:24)
    at async request (apiClient.ts:125:20)
    at async MaterialsList.tsx:265:19



# From deepseek in analyzing our controller and storageservice.php
Looking at your code, I can see the issue. You need to add CORS headers to your delete method. Here's the exact fix:

Add CORS Support to Your Delete Method
Update your delete method in LearningMaterialsController.php:

php
/**
 * Delete a learning material and its stored object. Only the owner (user_id or created_by)
 * may delete their own materials.
 * DELETE /api/learning-materials/:id
 */
public function delete(Request $request, string $id): void
{
    // Handle CORS preflight OPTIONS request
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        $this->setCorsHeaders();
        http_response_code(200);
        exit;
    }
    
    // Set CORS headers for the actual DELETE request
    $this->setCorsHeaders();
    
    $user = $this->getAuthenticatedUser($request);
    if ($user === null) {
        return;
    }

    $restToken = $this->requireRestToken($request);
    if ($restToken === null) {
        return;
    }

    // Fetch the record to check ownership and locate storage_path
    [$status, $payload, $raw] = $this->rest('GET', '/rest/v1/learning_materials', [
        RequestOptions::HEADERS => $this->restHeaders($restToken),
        RequestOptions::QUERY => [
            'select' => 'material_id,user_id,created_by,storage_path',
            'material_id' => 'eq.' . $id,
            'limit' => '1',
        ],
    ]);

    if ($status < 200 || $status >= 300 || !is_array($payload) || count($payload) === 0) {
        JsonResponder::withStatus($status > 0 ? $status : 404, ['error' => 'Material not found', 'details' => $raw]);
        return;
    }

    $record = $payload[0];
    $ownerIds = [];
    if (!empty($record['user_id'])) $ownerIds[] = (string)$record['user_id'];
    if (!empty($record['created_by'])) $ownerIds[] = (string)$record['created_by'];

    if (!in_array($user->getId(), $ownerIds, true)) {
        JsonResponder::unauthorized();
        return;
    }

    $storagePath = isset($record['storage_path']) && is_string($record['storage_path']) ? trim($record['storage_path']) : '';

    // Attempt to delete storage object first (best-effort). Use service role if available.
    $storageDeleted = true;
    if ($storagePath !== '') {
        $storageDeleted = $this->storage->deleteObject($storagePath, $this->serviceRoleKey ?? $restToken);
        if (!$storageDeleted) {
            // Log but continue to attempt DB delete depending on policy
            error_log('[learning_materials.delete] storage.delete failed for ' . $storagePath);
            // Attempt to provide more diagnostic info by trying a HEAD on the object with same token
            try {
                [$hStatus, $hPayload, $hRaw] = $this->rest('GET', '/storage/v1/object/' . rawurlencode($this->storageBucket) . '/' . rawurlencode($storagePath), [
                    RequestOptions::HEADERS => $this->restHeaders($this->serviceRoleKey ?? $restToken),
                    RequestOptions::HTTP_ERRORS => false,
                ]);
                error_log(sprintf('[learning_materials.delete] storage head status=%s body=%s', (string)$hStatus, is_scalar($hRaw) ? (string)$hRaw : json_encode($hRaw)));
            } catch (\Throwable $e) {
                error_log('[learning_materials.delete] storage head attempt failed: ' . $e->getMessage());
            }
        }
    }

    // Delete DB record
    $headers = $this->restHeaders($restToken);
    $headers['Prefer'] = 'return=minimal';

    [$dStatus, $dPayload, $dRaw] = $this->rest('DELETE', '/rest/v1/learning_materials', [
        RequestOptions::HEADERS => $headers,
        RequestOptions::QUERY => [
            'material_id' => 'eq.' . $id,
        ],
    ]);

    if ($dStatus < 200 || $dStatus >= 300) {
        JsonResponder::withStatus($dStatus > 0 ? $dStatus : 500, ['error' => 'Failed to delete material record', 'details' => $dRaw]);
        return;
    }

    JsonResponder::ok(['message' => 'Material deleted', 'material_id' => $id, 'storage_deleted' => $storageDeleted]);
}
Add the setCorsHeaders Method
Add this helper method to your LearningMaterialsController class:

php
private function setCorsHeaders(): void
{
    $allowed = $this->config->getAllowedOrigins();
    if (is_string($allowed) && $allowed !== '') {
        $origins = array_map('trim', explode(',', $allowed));
        $requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
        
        if ($requestOrigin !== '' && in_array($requestOrigin, $origins, true)) {
            header('Access-Control-Allow-Origin: ' . $requestOrigin);
        }
    } else {
        // Fallback for development - allow your frontend origin
        header('Access-Control-Allow-Origin: http://localhost:5173');
    }
    
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
    header('Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400'); // 24 hours cache for preflight
}
Also Update Your stream Method's CORS Headers
Update the CORS section in your existing stream method to include DELETE:

php
// In your stream method, find this section and update it:
// Restrict CORS to configured allowed origins to avoid exposing internal assets.
$allowed = $this->config->getAllowedOrigins();
if (is_string($allowed) && $allowed !== '') {
    // The config contains a comma-separated list of origins; pick the first that matches
    $origins = array_map('trim', explode(',', $allowed));
    $requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($requestOrigin !== '' && in_array($requestOrigin, $origins, true)) {
        header('Access-Control-Allow-Origin: ' . $requestOrigin);
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS'); // ADD DELETE HERE
        header('Access-Control-Allow-Headers: Authorization, Content-Type');
    }
} else {
    // Fallback: do not allow wildcard in production; allow same-origin only
    header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? ''));
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS'); // ADD DELETE HERE
    header('Access-Control-Allow-Headers: Authorization, Content-Type');
}