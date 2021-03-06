SELECT pronouns.cases, languages.name AS language
FROM pronouns
INNER JOIN languages ON languages.iso_639_3 = pronouns.language
WHERE (LOWER(languages.name) = LOWER($1) OR LOWER(languages.iso_639_1) = LOWER($1) OR LOWER(languages.iso_639_3) = LOWER($1));
