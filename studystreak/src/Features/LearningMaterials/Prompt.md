Debug Prompt — "requested path is invalid" & Preview reload (Learning Materials)

Summary (what’s happening)
When clicking Preview the UI shows {"error":"requested path is invalid"} and the page sometimes reloads. Network shows 404/302/failed requests for /api/learning-materials/{id}/stream (and like endpoint 404 earlier). Backend appears to return signed URLs; stream route exists but something about the signed URL / streaming/redirect is invalid (Supabase response "requested path is invalid" is consistent with a malformed object path / URL).

Use this prompt to systematically reproduce, inspect, and fix the bug.

Reproduce (do this first)

Open the app (local or deployed) and open DevTools → Network + Console.

Click Preview on a known material (one that previously returned a signed URL).

Capture:

The exact request(s) made (full URL, method, request headers including Authorization, response status, response body).

Any console errors and stack traces.

Run these curl requests from a terminal (replace {ID} and {BACKEND} with real values and include the Authorization bearer token you use in the browser):

# List (confirm server returns materials)
curl -v -H "Authorization: Bearer $TOKEN" "https://{BACKEND}/api/learning-materials"

# Signed URL (returns signed_url)
curl -v -H "Authorization: Bearer $TOKEN" "https://{BACKEND}/api/learning-materials/{ID}/signed-url"

# Stream endpoint (what the iframe requests)
curl -v -H "Authorization: Bearer $TOKEN" "https://{BACKEND}/api/learning-materials/{ID}/stream"

# Stream endpoint verbose to see redirect or body
curl -v -L -H "Authorization: Bearer $TOKEN" "https://{BACKEND}/api/learning-materials/{ID}/stream"


Record the full output of these curl commands (headers + bodies).

Files/locations to inspect (priority order)

Open these exact files in the repo and inspect the noted functions/lines:

index.php — router block for learning-materials:

Confirm the route regexes for:

GET /api/learning-materials/:id/signed-url

POST /api/learning-materials/:id/like

GET /api/learning-materials/:id/stream

Ensure preg_match regex is correct and actually matched (no extra escaping or string-escaping artifacts).

LearningMaterialsController.php (or file where stream, signedUrl, like, download live)

public function signedUrl(Request $request, string $id): void — check what createSignedUrl() returns and whether controller builds a correct absolute URL before returning.

public function stream(Request $request, string $id): void — inspect:

How you fetch the storage_path from the DB.

The call to $this->storage->createSignedUrl(...) — examine the return value.

Whether the controller redirects (302 Location) or proxies/streams (Guzzle stream + forward headers). Note both variants exist in the repo — pick the one the running server uses.

Any error_log() messages inside the stream method — these will appear in server logs and are useful.

StorageService.php

createSignedUrl(string $path, int $ttl, ?string $token = null) (or equivalent):

Confirm how the object path is encoded/decoded and what exact string the method returns.

Does it return an absolute URL (https://...) or a path fragment (/object/sign/...)? Are you concatenating config->getUrl() with it somewhere?

Log the raw inputs and the final signed URL returned.

Frontend: MaterialPreviewModal.tsx

Confirm how resolvedUrl is built for PDF/office/image:

In your code you set: const streamUrl = ${apiClient.baseUrl}/api/learning-materials/${material.material_id}/stream?cache=${Date.now()}`` — confirm apiClient.baseUrl is correct and not empty.

Check iframe sandbox attrs. Temporarily remove sandbox for testing to see if sandbox is causing reload or blocking.

Confirm Preview button is type="button" (it is in MaterialsList.tsx) so it shouldn't submit any enclosing form.

Frontend: MaterialsList.tsx

Ensure handlePreview(material) only sets state and does not navigate or call window.location.

Check handleDownload and handleLike calls for correct endpoints and that they include Authorization.

Things to log/print (add temporary debug logs)

Add these error_log() or error_log(json_encode(...)) points in backend to capture runtime values:

In stream() right after reading DB record:

error_log("[STREAM DEBUG] material_id={$id} storage_path={$storagePath} is_public=" . ($isPublic ? '1':'0'));


After calling createSignedUrl:

error_log("[STREAM DEBUG] createSignedUrl returned: " . var_export($signed, true));


If you do rtrim($this->config->getUrl(), '/') . $signed, log both parts:

error_log("[STREAM DEBUG] baseUrl=" . $this->config->getUrl() . " signedFragment=" . $signed . " full=" . $fullUrl);


In signedUrl() log the signed_url you return:

error_log("[SIGNEDURL DEBUG] id={$id} signed_url={$signedUrl}");


If you catch Guzzle errors in streaming, ensure you log the upstream status/body (there are error_log lines already — confirm they appear in server logs).

Quick manual checks likely to reveal the issue

Malformed final URL

If createSignedUrl() already returns a full URL (starts with http), and controller does rtrim(configUrl) . $signed → you will end up with https://backendhttps://puh... → Supabase returns “requested path is invalid”.

Check whether $signed begins with / or http. If starts with http, do not concatenate with base URL. If it is a path fragment, you must prefix base URL correctly.

Object path encoding mismatch

If you encode the storage path incorrectly (double-encoded or rawurlencode errors) the signed URL will reference a non-existing object and Supabase may reply invalid path.

Log storage path exactly as stored in DB and what you encode for signing.

Wrong token usage

If you pass an incorrect serviceRole token (or empty token) to Supabase sign call, signed URL may be invalid. Verify $restToken being used — log it’s presence/absence (do not log secret tokens in public logs; redact when sharing).

Iframe vs top-level navigation

If the server returns 302 Location: https://puhx... and browser behaves unexpectedly (parent reloads) try:

Visit the /stream URL directly in the browser (not via iframe) to see redirect behavior.

Use the curl -I -L output to see if you get 302 or 200 responses.

Temporarily change stream() to simply JsonResponder::ok(['signed_url' => $fullUrl]); so the frontend can show the URL instead of redirect — that will reveal whether the signed URL itself is valid.

Quick temporary changes to run (safe, reversible)

Return the signed URL JSON instead of redirecting (in stream() only for debug) — then open Preview, check the JSON in the iframe request or the console network response. Example:

// DEBUG ONLY
JsonResponder::ok(['signed_url' => $fullUrl]);
return;


If the frontend receives signed_url and that URL (when opened directly) works — then the problem is redirect/proxy logic or header forwarding. If the signed_url itself is invalid (Supabase error), you’ll see it.

Log createSignedUrl full return (see logs above). Fix whether you prefix base URL twice.

Temporarily remove iframe sandbox and see behavior — if removing sandbox stops page reload, add minimal sandbox permissions back.

Test direct signed_url returned by /signed-url with curl and open in browser. If it returns Supabase error, storage svc is generating invalid path.

Very likely root causes (ranked)

Double concatenation of base URL + already absolute signed URL → produces malformed URL → Supabase complains “requested path is invalid”. (Most common.)

Incorrect storage path encoding passed to sign function → signed URL points to incorrect path → Supabase error.

Empty / wrong token passed to signed-url generator → signed URL invalid.

Redirect handling (302) / headers in stream proxy produce top-level reload behavior in edge cases.

Frontend using apiClient.baseUrl incorrectly (empty or wrong) causing wrong iframe src.

Concrete TODO checklist for dev/Copilot

Reproduce with curl and capture outputs (paste them into ticket). ✔️

Add error_log debug points in signedUrl() and stream() to log storage_path, $signed, and $fullUrl. ✔️

Run curl -v against the returned signed URL and record upstream Supabase response (body + status). ✔️

If $signed already starts with http, do not concat with config URL. Fix code to only add base URL if $signed is a path. ✔️

Temporarily make stream() return JsonResponder::ok(['signed_url' => $fullUrl]); to test signed URL validity from frontend. ✔️

If signed URL is valid, revert to proxy/redirect but make proxy forward correct headers and avoid setting Content-Security-Policy or other headers that cause top-level navigation. ✔️

If using iframe sandbox, temporarily remove it for troubleshooting; then tune sandbox attributes to minimum required. ✔️

Confirm Preview no longer reloads and no "requested path is invalid" appears. ✔️