SELECT pronouns.cases, languages.name AS language, languages.iso_639_3
FROM pronouns
INNER JOIN languages ON languages.iso_639_3 = pronouns.language
WHERE (LOWER(languages.name) = LOWER($1) OR LOWER(languages.iso_639_1) = LOWER($1) OR LOWER(languages.iso_639_3) = LOWER($1))
  AND LOWER($2) = ANY(pronouns.cases);
