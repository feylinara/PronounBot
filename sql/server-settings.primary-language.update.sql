UPDATE server_settings
SET primary_language = $2
WHERE server_id = $1;
