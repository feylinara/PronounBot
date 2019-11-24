CREATE TABLE languages (
       iso_639_1 character (2),
       iso_639_3 character (3) PRIMARY KEY,
       name      text
       );

CREATE TABLE pronouns (
       language character (3) REFERENCES languages(iso_639_3),
       cases    character varying (16) ARRAY
       );

CREATE TABLE server_settings (
       server_id        character (16) PRIMARY KEY,
       prefix           character (3),
       abuse_protect    boolean,
       primary_language character (3) REFERENCES languages(iso_639_3)
);
