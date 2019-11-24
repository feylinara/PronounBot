SELECT iso_639_3, name
FROM languages
WHERE iso_639_1 = LOWER($1) OR iso_639_3 = LOWER($1) OR LOWER(name) = LOWER($1);
