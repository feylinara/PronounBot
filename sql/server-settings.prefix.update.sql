UPDATE server_settings
SET prefix = $2
WHERE server_id = $1;
