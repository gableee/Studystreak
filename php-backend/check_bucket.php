<?php
require __DIR__ . '/vendor/autoload.php';
Dotenv\Dotenv::createImmutable(__DIR__)->safeLoad();
require __DIR__ . '/src/Config/SupabaseConfig.php';
$config = new App\Config\SupabaseConfig();
echo 'Bucket:[' . $config->getStorageBucket() . "]\n";
