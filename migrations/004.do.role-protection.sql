CREATE TABLE roles (
       server_id character (16) REFERENCES server_settings(server_id),
       role_name TEXT
);
