SELECT languages.name AS language, COUNT(pronouns.cases) AS pronouns
FROM pronouns
INNER JOIN languages ON languages.iso_639_3 = pronouns.language
GROUP BY languages.iso_639_3
ORDER BY COUNT(pronouns.cases) DESC;
