-- a hack so I don't have to do internationalisation yet.
ALTER TABLE pronouns ALTER COLUMN cases TYPE character varying (32) ARRAY;

INSERT INTO pronouns (language, cases) VALUES ('deu', '{Alle Pronomen}');
INSERT INTO pronouns (language, cases) VALUES ('eng', '{all pronouns}');
INSERT INTO pronouns (language, cases) VALUES ('nld', '{alle voornaamworden}');
INSERT INTO pronouns (language, cases) VALUES ('fra', '{tous des pronoms}');
