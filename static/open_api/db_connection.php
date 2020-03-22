<?php

$env_path = "../etc/env.ini"; // ?
$remoteuser = $_SERVER[ 'REMOTE_USER' ];

if ($_SERVER['HTTP_HOST'] == 'localhost' || $_SERVER['HTTP_HOST'] == 'localhost:3000'){
  $env_path = "env.ini";
  $remoteuser = "devuser";
}

$ini_array = parse_ini_file($env_path);
$dbhost = $ini_array["dbhost"];
$username = $ini_array["username"];
$password = $ini_array["password"];
$database = $ini_array["database"];

if ($_SERVER['HTTP_HOST'] == 'localhost'){
  $database = "doenet_local";
}

if ($_SERVER['HTTP_HOST'] == 'localhost:3000'){
  $dbhost = "127.0.0.1";
}

$conn = mysqli_connect($dbhost, $username, $password, $database);
// Check connection
if (!$conn) {
    die("Database Connection failed: " . mysqli_connect_error());
}


?>