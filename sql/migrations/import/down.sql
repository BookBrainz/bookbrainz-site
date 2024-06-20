BEGIN;

DROP VIEW IF EXISTS bookbrainz.author_import;
DROP VIEW IF EXISTS bookbrainz.edition_import;
DROP VIEW IF EXISTS bookbrainz.edition_group_import;
DROP VIEW IF EXISTS bookbrainz.publisher_import;
DROP VIEW IF EXISTS bookbrainz.series_import;
DROP VIEW IF EXISTS bookbrainz.work_import;

DROP TABLE IF EXISTS bookbrainz.author_import_header;
DROP TABLE IF EXISTS bookbrainz.edition_import_header;
DROP TABLE IF EXISTS bookbrainz.edition_group_import_header;
DROP TABLE IF EXISTS bookbrainz.publisher_import_header;
DROP TABLE IF EXISTS bookbrainz.series_import_header;
DROP TABLE IF EXISTS bookbrainz.work_import_header;
DROP TABLE IF EXISTS bookbrainz.discard_votes;
DROP TABLE IF EXISTS bookbrainz.link_import;
DROP TABLE IF EXISTS bookbrainz.origin_source;
DROP TABLE IF EXISTS bookbrainz.import;

COMMIT;
