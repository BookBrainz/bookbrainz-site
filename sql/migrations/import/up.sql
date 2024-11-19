BEGIN;

-- Distinguish pending imports from accepted entities.
ALTER TABLE bookbrainz.entity ADD COLUMN IF NOT EXISTS is_import BOOLEAN NOT NULL DEFAULT FALSE;

-- Tables linking pending imports and relevant data in `*_data` tables.
CREATE TABLE IF NOT EXISTS bookbrainz.author_import_header (
    bbid UUID PRIMARY KEY,
    data_id INT NOT NULL
);
ALTER TABLE bookbrainz.author_import_header ADD FOREIGN KEY (bbid) REFERENCES bookbrainz.entity (bbid);
ALTER TABLE bookbrainz.author_import_header ADD FOREIGN KEY (data_id) REFERENCES bookbrainz.author_data (id);

CREATE TABLE IF NOT EXISTS bookbrainz.edition_import_header (
    bbid UUID PRIMARY KEY,
    data_id INT NOT NULL
);
ALTER TABLE bookbrainz.edition_import_header ADD FOREIGN KEY (bbid) REFERENCES bookbrainz.entity (bbid);
ALTER TABLE bookbrainz.edition_import_header ADD FOREIGN KEY (data_id) REFERENCES bookbrainz.edition_data (id);

CREATE TABLE IF NOT EXISTS bookbrainz.edition_group_import_header (
    bbid UUID PRIMARY KEY,
    data_id INT NOT NULL
);
ALTER TABLE bookbrainz.edition_group_import_header ADD FOREIGN KEY (bbid) REFERENCES bookbrainz.entity (bbid);
ALTER TABLE bookbrainz.edition_group_import_header ADD FOREIGN KEY (data_id) REFERENCES bookbrainz.edition_group_data (id);

CREATE TABLE IF NOT EXISTS bookbrainz.publisher_import_header (
    bbid UUID PRIMARY KEY,
    data_id INT NOT NULL
);
ALTER TABLE bookbrainz.publisher_import_header ADD FOREIGN KEY (bbid) REFERENCES bookbrainz.entity (bbid);
ALTER TABLE bookbrainz.publisher_import_header ADD FOREIGN KEY (data_id) REFERENCES bookbrainz.publisher_data (id);

CREATE TABLE IF NOT EXISTS bookbrainz.series_import_header (
    bbid UUID PRIMARY KEY,
    data_id INT NOT NULL
);
ALTER TABLE bookbrainz.series_import_header ADD FOREIGN KEY (bbid) REFERENCES bookbrainz.entity (bbid);
ALTER TABLE bookbrainz.series_import_header ADD FOREIGN KEY (data_id) REFERENCES bookbrainz.series_data (id);

CREATE TABLE IF NOT EXISTS bookbrainz.work_import_header (
    bbid UUID PRIMARY KEY,
    data_id INT NOT NULL
);
ALTER TABLE bookbrainz.work_import_header ADD FOREIGN KEY (bbid) REFERENCES bookbrainz.entity (bbid);
ALTER TABLE bookbrainz.work_import_header ADD FOREIGN KEY (data_id) REFERENCES bookbrainz.work_data (id);

-- Table to store votes cast to discard an import.
CREATE TABLE IF NOT EXISTS bookbrainz.discard_votes (
    import_bbid UUID NOT NULL,
    editor_id INT NOT NULL,
    voted_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT timezone('UTC'::TEXT, now()),
    PRIMARY KEY (
        import_bbid,
        editor_id
    )
);
ALTER TABLE bookbrainz.discard_votes ADD FOREIGN KEY (import_bbid) REFERENCES bookbrainz.entity (bbid);
ALTER TABLE bookbrainz.discard_votes ADD FOREIGN KEY (editor_id) REFERENCES bookbrainz.editor (id);

-- Table to store all external sources of imported data.
CREATE TABLE IF NOT EXISTS bookbrainz.external_source (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL CHECK (name <> '')
);

-- Table to store metadata about all imports (pending / approved / discarded) and their source.
-- Links an external identifier to the pending import and (upon its subsequent approval) with the accepted entity.
CREATE TABLE IF NOT EXISTS bookbrainz.import_metadata (
    pending_entity_bbid UUID,
    external_source_id INT NOT NULL,
    external_identifier TEXT NOT NULL CHECK (external_identifier <> ''),
    imported_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT timezone('UTC'::TEXT, now()),
    last_edited TIMESTAMP WITHOUT TIME ZONE,
    accepted_entity_bbid UUID DEFAULT NULL,
    additional_data jsonb,
    PRIMARY KEY (
        external_source_id,
        external_identifier
    )
);
ALTER TABLE bookbrainz.import_metadata ADD FOREIGN KEY (accepted_entity_bbid) REFERENCES bookbrainz.entity (bbid);
ALTER TABLE bookbrainz.import_metadata ADD FOREIGN KEY (pending_entity_bbid) REFERENCES bookbrainz.entity (bbid);
ALTER TABLE bookbrainz.import_metadata ADD FOREIGN KEY (external_source_id) REFERENCES bookbrainz.external_source (id);

-- Imported entity views (column-compatible with the regular entity views, order matters) --

CREATE OR REPLACE VIEW bookbrainz.author_import AS
    SELECT
        entity.bbid,
        author_data.id as data_id,
        NULL::INT AS revision_id, -- pending imports have no revision
        TRUE AS master,
        author_data.annotation_id,
        author_data.disambiguation_id,
        dis.comment disambiguation,
        alias_set.default_alias_id,
        alias."name",
        alias.sort_name,
        author_data.begin_year,
        author_data.begin_month,
        author_data.begin_day,
        author_data.begin_area_id,
        author_data.end_year,
        author_data.end_month,
        author_data.end_day,
        author_data.end_area_id,
        author_data.ended,
        author_data.area_id,
        author_data.gender_id,
        author_data.type_id,
        atype.label as author_type,
        author_data.alias_set_id,
        author_data.identifier_set_id,
        author_data.relationship_set_id,
        entity.type
    FROM bookbrainz.entity entity
    LEFT JOIN bookbrainz.author_import_header author_import_header ON entity.bbid = author_import_header.bbid
    LEFT JOIN bookbrainz.author_data author_data ON author_import_header.data_id = author_data.id
    LEFT JOIN bookbrainz.alias_set alias_set ON author_data.alias_set_id = alias_set.id
    -- TODO: Are the columns from the following joins ever used directly instead of being loaded by the ORM?
    LEFT JOIN bookbrainz.alias alias ON alias.id = alias_set.default_alias_id
    LEFT JOIN bookbrainz.disambiguation dis ON dis.id = author_data.disambiguation_id
    LEFT JOIN bookbrainz.author_type atype ON atype.id = author_data.type_id
    WHERE entity.type = 'Author' AND entity.is_import;


CREATE OR REPLACE VIEW bookbrainz.edition_import AS
    SELECT
        entity.bbid,
        edition_data.id as data_id,
        NULL::INT AS revision_id, -- pending imports have no revision
        TRUE AS master,
        edition_data.annotation_id,
        edition_data.disambiguation_id,
        dis.comment disambiguation,
        alias_set.default_alias_id,
        alias."name",
        alias.sort_name,
        edition_data.edition_group_bbid,
        edition_data.author_credit_id,
        edition_data.width,
        edition_data.height,
        edition_data.depth,
        edition_data.weight,
        edition_data.pages,
        edition_data.format_id,
        edition_data.status_id,
        edition_data.alias_set_id,
        edition_data.identifier_set_id,
        edition_data.relationship_set_id,
        edition_data.language_set_id,
        edition_data.release_event_set_id,
        edition_data.publisher_set_id,
        entity.type
    FROM bookbrainz.entity entity
    LEFT JOIN bookbrainz.edition_import_header edition_import_header ON entity.bbid = edition_import_header.bbid
    LEFT JOIN bookbrainz.edition_data edition_data ON edition_import_header.data_id = edition_data.id
    LEFT JOIN bookbrainz.alias_set alias_set ON edition_data.alias_set_id = alias_set.id
    -- TODO: Are the columns from the following joins ever used directly instead of being loaded by the ORM?
    LEFT JOIN bookbrainz.alias alias ON alias.id = alias_set.default_alias_id
    LEFT JOIN bookbrainz.disambiguation dis ON dis.id = edition_data.disambiguation_id
    WHERE entity.type = 'Edition' AND entity.is_import;

CREATE OR REPLACE VIEW bookbrainz.publisher_import AS
    SELECT
        entity.bbid,
        publisher_data.id as data_id,
        NULL::INT AS revision_id, -- pending imports have no revision
        TRUE AS master,
        publisher_data.annotation_id,
        publisher_data.disambiguation_id,
        dis.comment disambiguation,
        alias_set.default_alias_id,
        alias."name",
        alias.sort_name,
        publisher_data.begin_year,
        publisher_data.begin_month,
        publisher_data.begin_day,
        publisher_data.end_year,
        publisher_data.end_month,
        publisher_data.end_day,
        publisher_data.ended,
        publisher_data.area_id,
        publisher_data.type_id,
        pubtype.label as publisher_type,
        publisher_data.alias_set_id,
        publisher_data.identifier_set_id,
        publisher_data.relationship_set_id,
        entity.type
    FROM bookbrainz.entity entity
    LEFT JOIN bookbrainz.publisher_import_header publisher_import_header ON entity.bbid = publisher_import_header.bbid
    LEFT JOIN bookbrainz.publisher_data publisher_data ON publisher_import_header.data_id = publisher_data.id
    LEFT JOIN bookbrainz.alias_set alias_set ON publisher_data.alias_set_id = alias_set.id
    -- TODO: Are the columns from the following joins ever used directly instead of being loaded by the ORM?
    LEFT JOIN bookbrainz.alias alias ON alias.id = alias_set.default_alias_id
    LEFT JOIN bookbrainz.disambiguation dis ON dis.id = publisher_data.disambiguation_id
    LEFT JOIN bookbrainz.publisher_type pubtype ON pubtype.id = publisher_data.type_id
        WHERE entity.type = 'Publisher' AND entity.is_import;

CREATE OR REPLACE VIEW bookbrainz.edition_group_import AS
    SELECT
        entity.bbid,
        edition_group_data.id as data_id,
        NULL::INT AS revision_id, -- pending imports have no revision
        TRUE AS master,
        edition_group_data.annotation_id,
        edition_group_data.disambiguation_id,
        dis.comment disambiguation,
        alias_set.default_alias_id,
        alias."name",
        alias.sort_name,
        edition_group_data.type_id,
        egtype.label as edition_group_type,
        edition_group_data.author_credit_id,
        edition_group_data.alias_set_id,
        edition_group_data.identifier_set_id,
        edition_group_data.relationship_set_id,
        entity.type
    FROM bookbrainz.entity entity
    LEFT JOIN bookbrainz.edition_group_import_header edition_group_import_header ON entity.bbid = edition_group_import_header.bbid
    LEFT JOIN bookbrainz.edition_group_data edition_group_data ON edition_group_import_header.data_id = edition_group_data.id
    LEFT JOIN bookbrainz.alias_set alias_set ON edition_group_data.alias_set_id = alias_set.id
    -- TODO: Are the columns from the following joins ever used directly instead of being loaded by the ORM?
    LEFT JOIN bookbrainz.alias alias ON alias.id = alias_set.default_alias_id
    LEFT JOIN bookbrainz.disambiguation dis ON dis.id = edition_group_data.disambiguation_id
    LEFT JOIN bookbrainz.edition_group_type egtype ON egtype.id = edition_group_data.type_id
    WHERE entity.type = 'EditionGroup' AND entity.is_import;

CREATE OR REPLACE VIEW bookbrainz.series_import AS
    SELECT
        entity.bbid,
        series_data.id AS data_id,
        NULL::INT AS revision_id, -- pending imports have no revision
        TRUE AS master,
        series_data.entity_type, -- TODO: rename to item_type
        series_data.annotation_id,
        series_data.disambiguation_id,
        dis.comment disambiguation,
        alias_set.default_alias_id,
        alias."name",
        alias.sort_name,
        series_data.ordering_type_id,
        series_data.alias_set_id,
        series_data.identifier_set_id,
        series_data.relationship_set_id,
        entity.type
    FROM bookbrainz.entity entity
    LEFT JOIN bookbrainz.series_import_header series_import_header ON entity.bbid = series_import_header.bbid
    LEFT JOIN bookbrainz.series_data series_data ON series_import_header.data_id = series_data.id
    LEFT JOIN bookbrainz.alias_set alias_set ON series_data.alias_set_id = alias_set.id
    -- TODO: Are the columns from the following joins ever used directly instead of being loaded by the ORM?
    LEFT JOIN bookbrainz.alias alias ON alias.id = alias_set.default_alias_id
    LEFT JOIN bookbrainz.disambiguation dis ON dis.id = series_data.disambiguation_id
    WHERE entity.type = 'Series' AND entity.is_import;

CREATE OR REPLACE VIEW bookbrainz.work_import AS
    SELECT
        entity.bbid,
        work_data.id AS data_id,
        NULL::INT AS revision_id, -- pending imports have no revision
        TRUE AS master,
        work_data.annotation_id,
        work_data.disambiguation_id,
        dis.comment disambiguation,
        alias_set.default_alias_id,
        alias."name",
        alias.sort_name,
        work_data.type_id,
        worktype.label as work_type,
        work_data.alias_set_id,
        work_data.identifier_set_id,
        work_data.relationship_set_id,
        work_data.language_set_id,
        entity.type
    FROM bookbrainz.entity entity
    LEFT JOIN bookbrainz.work_import_header work_import_header ON entity.bbid = work_import_header.bbid
    LEFT JOIN bookbrainz.work_data work_data ON work_import_header.data_id = work_data.id
    LEFT JOIN bookbrainz.alias_set alias_set ON work_data.alias_set_id = alias_set.id
    -- TODO: Are the columns from the following joins ever used directly instead of being loaded by the ORM?
    LEFT JOIN bookbrainz.alias alias ON alias.id = alias_set.default_alias_id
    LEFT JOIN bookbrainz.disambiguation dis ON dis.id = work_data.disambiguation_id
    LEFT JOIN bookbrainz.work_type worktype ON worktype.id = work_data.type_id
    WHERE entity.type = 'Work' AND entity.is_import;

-- Recreate entity views (with additional `NOT e.is_import` condition) and combine them with imported entity views

CREATE OR REPLACE VIEW bookbrainz.author AS
    SELECT
        e.bbid, ad.id AS data_id, ar.id AS revision_id, (ar.id = ah.master_revision_id) AS master, ad.annotation_id, ad.disambiguation_id, dis.comment disambiguation,
        als.default_alias_id, al."name", al.sort_name, ad.begin_year, ad.begin_month, ad.begin_day, ad.begin_area_id,
        ad.end_year, ad.end_month, ad.end_day, ad.end_area_id, ad.ended, ad.area_id,
        ad.gender_id, ad.type_id, atype.label as author_type, ad.alias_set_id, ad.identifier_set_id, ad.relationship_set_id, e.type
    FROM bookbrainz.author_revision ar
    LEFT JOIN bookbrainz.entity e ON e.bbid = ar.bbid
    LEFT JOIN bookbrainz.author_header ah ON ah.bbid = e.bbid
    LEFT JOIN bookbrainz.author_data ad ON ar.data_id = ad.id
    LEFT JOIN bookbrainz.alias_set als ON ad.alias_set_id = als.id
    -- TODO: Are the columns from the following joins ever used directly instead of being loaded by the ORM?
    LEFT JOIN bookbrainz.alias al ON al.id = als.default_alias_id
    LEFT JOIN bookbrainz.disambiguation dis ON dis.id = ad.disambiguation_id
    LEFT JOIN bookbrainz.author_type atype ON atype.id = ad.type_id
    WHERE e.type = 'Author' AND NOT e.is_import
UNION ALL
    SELECT * FROM bookbrainz.author_import;

CREATE OR REPLACE VIEW bookbrainz.edition AS
    SELECT
        e.bbid, edd.id AS data_id, edr.id AS revision_id, (edr.id = edh.master_revision_id) AS master, edd.annotation_id, edd.disambiguation_id, dis.comment disambiguation,
        als.default_alias_id, al."name", al.sort_name, edd.edition_group_bbid, edd.author_credit_id, edd.width, edd.height,
        edd.depth, edd.weight, edd.pages, edd.format_id, edd.status_id,
        edd.alias_set_id, edd.identifier_set_id, edd.relationship_set_id,
        edd.language_set_id, edd.release_event_set_id, edd.publisher_set_id, e.type
    FROM bookbrainz.edition_revision edr
    LEFT JOIN bookbrainz.entity e ON e.bbid = edr.bbid
    LEFT JOIN bookbrainz.edition_header edh ON edh.bbid = e.bbid
    LEFT JOIN bookbrainz.edition_data edd ON edr.data_id = edd.id
    LEFT JOIN bookbrainz.alias_set als ON edd.alias_set_id = als.id
    -- TODO: Are the columns from the following joins ever used directly instead of being loaded by the ORM?
    LEFT JOIN bookbrainz.alias al ON al.id = als.default_alias_id
    LEFT JOIN bookbrainz.disambiguation dis ON dis.id = edd.disambiguation_id
    WHERE e.type = 'Edition' AND NOT e.is_import
UNION ALL
    SELECT * FROM bookbrainz.edition_import;

CREATE OR REPLACE VIEW bookbrainz.work AS
    SELECT
        e.bbid, wd.id AS data_id, wr.id AS revision_id, ( wr.id = wh.master_revision_id) AS master, wd.annotation_id, wd.disambiguation_id, dis.comment disambiguation,
        als.default_alias_id, al."name", al.sort_name, wd.type_id, worktype.label as work_type, wd.alias_set_id, wd.identifier_set_id,
        wd.relationship_set_id, wd.language_set_id, e.type
    FROM bookbrainz.work_revision wr
    LEFT JOIN bookbrainz.entity e ON e.bbid = wr.bbid
    LEFT JOIN bookbrainz.work_header wh ON wh.bbid = e.bbid
    LEFT JOIN bookbrainz.work_data wd ON wr.data_id = wd.id
    LEFT JOIN bookbrainz.alias_set als ON wd.alias_set_id = als.id
    -- TODO: Are the columns from the following joins ever used directly instead of being loaded by the ORM?
    LEFT JOIN bookbrainz.alias al ON al.id = als.default_alias_id
    LEFT JOIN bookbrainz.disambiguation dis ON dis.id = wd.disambiguation_id
    LEFT JOIN bookbrainz.work_type worktype ON worktype.id = wd.type_id
    WHERE e.type = 'Work' AND NOT e.is_import
UNION ALL
    SELECT * FROM bookbrainz.work_import;

CREATE OR REPLACE VIEW bookbrainz.publisher AS
    SELECT
        e.bbid, pubd.id AS data_id, psr.id AS revision_id, (psr.id = pubh.master_revision_id) AS master, pubd.annotation_id, pubd.disambiguation_id, dis.comment disambiguation,
        als.default_alias_id, al."name", al.sort_name, pubd.begin_year, pubd.begin_month, pubd.begin_day,
        pubd.end_year, pubd.end_month, pubd.end_day, pubd.ended, pubd.area_id,
        pubd.type_id, pubtype.label as publisher_type, pubd.alias_set_id, pubd.identifier_set_id, pubd.relationship_set_id, e.type
    FROM bookbrainz.publisher_revision psr
    LEFT JOIN bookbrainz.entity e ON e.bbid = psr.bbid
    LEFT JOIN bookbrainz.publisher_header pubh ON pubh.bbid = e.bbid
    LEFT JOIN bookbrainz.publisher_data pubd ON psr.data_id = pubd.id
    LEFT JOIN bookbrainz.alias_set als ON pubd.alias_set_id = als.id
    -- TODO: Are the columns from the following joins ever used directly instead of being loaded by the ORM?
    LEFT JOIN bookbrainz.alias al ON al.id = als.default_alias_id
    LEFT JOIN bookbrainz.disambiguation dis ON dis.id = pubd.disambiguation_id
    LEFT JOIN bookbrainz.publisher_type pubtype ON pubtype.id = pubd.type_id
    WHERE e.type = 'Publisher' AND NOT e.is_import
UNION ALL
    SELECT * FROM bookbrainz.publisher_import;

CREATE OR REPLACE VIEW bookbrainz.edition_group AS
    SELECT
        e.bbid, egd.id AS data_id, pcr.id AS revision_id, (pcr.id = egh.master_revision_id) AS master, egd.annotation_id, egd.disambiguation_id, dis.comment disambiguation,
        als.default_alias_id, al."name", al.sort_name, egd.type_id, egtype.label as edition_group_type, egd.author_credit_id, egd.alias_set_id, egd.identifier_set_id,
        egd.relationship_set_id, e.type
    FROM bookbrainz.edition_group_revision pcr
    LEFT JOIN bookbrainz.entity e ON e.bbid = pcr.bbid
    LEFT JOIN bookbrainz.edition_group_header egh ON egh.bbid = e.bbid
    LEFT JOIN bookbrainz.edition_group_data egd ON pcr.data_id = egd.id
    LEFT JOIN bookbrainz.alias_set als ON egd.alias_set_id = als.id
    -- TODO: Are the columns from the following joins ever used directly instead of being loaded by the ORM?
    LEFT JOIN bookbrainz.alias al ON al.id = als.default_alias_id
    LEFT JOIN bookbrainz.disambiguation dis ON dis.id = egd.disambiguation_id
    LEFT JOIN bookbrainz.edition_group_type egtype ON egtype.id = egd.type_id
    WHERE e.type = 'EditionGroup' AND NOT e.is_import
UNION ALL
    SELECT * FROM bookbrainz.edition_group_import;

CREATE OR REPLACE VIEW bookbrainz.series AS
    SELECT
        e.bbid, sd.id AS data_id, sr.id AS revision_id, (sr.id = sh.master_revision_id) AS master, sd.entity_type, sd.annotation_id, sd.disambiguation_id, dis.comment disambiguation,
        als.default_alias_id, al."name", al.sort_name, sd.ordering_type_id, sd.alias_set_id, sd.identifier_set_id,
        sd.relationship_set_id, e.type
    FROM bookbrainz.series_revision sr
    LEFT JOIN bookbrainz.entity e ON e.bbid = sr.bbid
    LEFT JOIN bookbrainz.series_header sh ON sh.bbid = e.bbid
    LEFT JOIN bookbrainz.series_data sd ON sr.data_id = sd.id
    LEFT JOIN bookbrainz.alias_set als ON sd.alias_set_id = als.id
    -- TODO: Are the columns from the following joins ever used directly instead of being loaded by the ORM?
    LEFT JOIN bookbrainz.alias al ON al.id = als.default_alias_id
    LEFT JOIN bookbrainz.disambiguation dis ON dis.id = sd.disambiguation_id
    WHERE e.type = 'Series' AND NOT e.is_import
UNION ALL
    SELECT * FROM bookbrainz.series_import;

COMMIT;
