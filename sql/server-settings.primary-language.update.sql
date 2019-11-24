UPDATE server_settings
SET primary_language = $1
WHERE server_id = $2;
