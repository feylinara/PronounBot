-- a hack so I don't have to do internationalisation yet.
ALTER TABLE pronouns ALTER COLUMN cases TYPE character varying (32) ARRAY;

INSERT INTO pronouns (language, cases) VALUES ('deu', '{Keine Pronomen}');
INSERT INTO pronouns (language, cases) VALUES ('eng', '{no pronouns}');
INSERT INTO pronouns (language, cases) VALUES ('nld', '{geen voornaamworden}');
INSERT INTO pronouns (language, cases) VALUES ('fra', '{pas des pronoms}');
