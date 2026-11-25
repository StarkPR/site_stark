<?php
declare(strict_types=1);
// Apache serves the assets. PHP connects the page to the Java catalog.
if (isset($_GET['catalogo'])) {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-cache');
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        header('Allow: GET');
        http_response_code(405);
        echo '{}';
        exit;
    }
    $url = getenv('STARK_API') ?: 'http://catalogo:8081/equipe';
    $options = stream_context_create(['http' => ['timeout' => 3]]);
    $json = @file_get_contents($url, false, $options);
    if ($json === false) {
        http_response_code(503);
        echo '{"erro":"Catálogo indisponível"}';
    } else {
        echo $json;
    }
    exit;
}
header('Content-Type: text/html; charset=utf-8');
$template = file_get_contents(__DIR__ . '/index.html');
echo str_replace('content="data/equipe.json"', 'content="index.php?catalogo=1"', $template);
