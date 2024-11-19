BEGIN;

DROP VIEW IF EXISTS bookbrainz.author_import;
DROP VIEW IF EXISTS bookbrainz.edition_import;
DROP VIEW IF EXISTS bookbrainz.edition_group_import;
DROP VIEW IF EXISTS bookbrainz.publisher_import;
DROP VIEW IF EXISTS bookbrainz.series_import;
DROP VIEW IF EXISTS bookbrainz.work_import;

-- Only drop these tables if the database contains no pending imports!
DROP TABLE IF EXISTS bookbrainz.author_import_header;
DROP TABLE IF EXISTS bookbrainz.edition_import_header;
DROP TABLE IF EXISTS bookbrainz.edition_group_import_header;
DROP TABLE IF EXISTS bookbrainz.publisher_import_header;
DROP TABLE IF EXISTS bookbrainz.series_import_header;
DROP TABLE IF EXISTS bookbrainz.work_import_header;
DROP TABLE IF EXISTS bookbrainz.discard_votes;
DROP TABLE IF EXISTS bookbrainz.import_metadata;
DROP TABLE IF EXISTS bookbrainz.external_source;

-- Only drop this column if the database contains no pending imports!
ALTER TABLE entity DROP COLUMN IF EXISTS is_import;

-- Legacy tables from an earlier version of the import schema.
DROP TABLE IF EXISTS bookbrainz.link_import;
DROP TABLE IF EXISTS bookbrainz.origin_source;
DROP TABLE IF EXISTS bookbrainz.import;

COMMIT;
