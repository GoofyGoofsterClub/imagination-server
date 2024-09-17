
-- Database creation must be performed outside a multi lined SQL file. 
-- These commands were put in this file only as a convenience.
-- 
-- object: new_database | type: DATABASE --
-- DROP DATABASE IF EXISTS new_database;
CREATE DATABASE uwuso;
-- ddl-end --


-- object: uwuso | type: SCHEMA --
-- DROP SCHEMA IF EXISTS uwuso CASCADE;
CREATE SCHEMA uwuso;
-- ddl-end --
ALTER SCHEMA uwuso OWNER TO dbuser;
-- ddl-end --

SET search_path TO pg_catalog,public,uwuso;
-- ddl-end --

-- object: uwuso.users | type: TABLE --
-- DROP TABLE IF EXISTS uwuso.users CASCADE;
CREATE TABLE uwuso.users (
	id bigint NOT NULL GENERATED ALWAYS AS IDENTITY ,
	username text NOT NULL,
	access_key text NOT NULL,
	permissions bigint NOT NULL DEFAULT 0,
	private_profile boolean NOT NULL DEFAULT false,
	banned boolean NOT NULL DEFAULT false,
	views bigint NOT NULL DEFAULT 0,
	uploads bigint NOT NULL DEFAULT 0,
	CONSTRAINT users_pk PRIMARY KEY (id)
);
-- ddl-end --
ALTER TABLE uwuso.users OWNER TO dbuser;
-- ddl-end --

-- object: uwuso.uploads | type: TABLE --
-- DROP TABLE IF EXISTS uwuso.uploads CASCADE;
CREATE TABLE uwuso.uploads (
);
-- ddl-end --

-- object: id | type: COLUMN --
-- ALTER TABLE uwuso.uploads DROP COLUMN IF EXISTS id CASCADE;
ALTER TABLE uwuso.uploads ADD COLUMN id bigint NOT NULL GENERATED ALWAYS AS IDENTITY ;
-- ddl-end --


-- object: uploader_id | type: COLUMN --
-- ALTER TABLE uwuso.uploads DROP COLUMN IF EXISTS uploader_id CASCADE;
ALTER TABLE uwuso.uploads ADD COLUMN uploader_id bigint NOT NULL;
-- ddl-end --


-- object: filename | type: COLUMN --
-- ALTER TABLE uwuso.uploads DROP COLUMN IF EXISTS filename CASCADE;
ALTER TABLE uwuso.uploads ADD COLUMN filename text NOT NULL;
-- ddl-end --


-- object: disk_filename | type: COLUMN --
-- ALTER TABLE uwuso.uploads DROP COLUMN IF EXISTS disk_filename CASCADE;
ALTER TABLE uwuso.uploads ADD COLUMN disk_filename text NOT NULL;
-- ddl-end --


-- object: mimetype | type: COLUMN --
-- ALTER TABLE uwuso.uploads DROP COLUMN IF EXISTS mimetype CASCADE;
ALTER TABLE uwuso.uploads ADD COLUMN mimetype text NOT NULL;
-- ddl-end --


-- object: views | type: COLUMN --
-- ALTER TABLE uwuso.uploads DROP COLUMN IF EXISTS views CASCADE;
ALTER TABLE uwuso.uploads ADD COLUMN views integer NOT NULL DEFAULT 0;
-- ddl-end --


-- object: filesize | type: COLUMN --
-- ALTER TABLE uwuso.uploads DROP COLUMN IF EXISTS filesize CASCADE;
ALTER TABLE uwuso.uploads ADD COLUMN filesize bigint NOT NULL DEFAULT 0;
-- ddl-end --



-- object: uploads_pk | type: CONSTRAINT --
-- ALTER TABLE uwuso.uploads DROP CONSTRAINT IF EXISTS uploads_pk CASCADE;
ALTER TABLE uwuso.uploads ADD CONSTRAINT uploads_pk PRIMARY KEY (id);
-- ddl-end --

ALTER TABLE uwuso.uploads OWNER TO dbuser;
-- ddl-end --

-- object: uwuso.invites | type: TABLE --
-- DROP TABLE IF EXISTS uwuso.invites CASCADE;
CREATE TABLE uwuso.invites (
	id integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT BY 1 MINVALUE 0 MAXVALUE 2147483647 START WITH 1 CACHE 1 ),
	hash text NOT NULL,
	inviter bigserial NOT NULL,
	valid_until timestamp NOT NULL,
	CONSTRAINT invites_pk PRIMARY KEY (id,inviter)
);
-- ddl-end --
ALTER TABLE uwuso.invites OWNER TO dbuser;
-- ddl-end --

-- object: uwuso.services | type: TABLE --
-- DROP TABLE IF EXISTS uwuso.services CASCADE;
CREATE TABLE uwuso.services (
	id integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT BY 1 MINVALUE 0 MAXVALUE 2147483647 START WITH 1 CACHE 1 ),
	access_key text NOT NULL,
	internal_key text NOT NULL,
	display_name text NOT NULL,
	owner bigint NOT NULL,
	permissions bigint NOT NULL DEFAULT 0,
	disabled boolean NOT NULL DEFAULT false,
	CONSTRAINT services_pk PRIMARY KEY (id)
);
-- ddl-end --
ALTER TABLE uwuso.services OWNER TO dbuser;
-- ddl-end --

-- object: uwuso.statistics | type: TABLE --
-- DROP TABLE IF EXISTS uwuso.statistics CASCADE;
CREATE TABLE uwuso.statistics (
	field text NOT NULL,
	value bigint NOT NULL,
	CONSTRAINT statistics_pk PRIMARY KEY (field)
);
-- ddl-end --
ALTER TABLE uwuso.statistics OWNER TO dbuser;
-- ddl-end --

-- object: uploader_id_fk | type: CONSTRAINT --
-- ALTER TABLE uwuso.uploads DROP CONSTRAINT IF EXISTS uploader_id_fk CASCADE;
ALTER TABLE uwuso.uploads ADD CONSTRAINT uploader_id_fk FOREIGN KEY (uploader_id)
REFERENCES uwuso.users (id) MATCH SIMPLE
ON DELETE NO ACTION ON UPDATE NO ACTION;
-- ddl-end --

-- object: inviter_fk | type: CONSTRAINT --
-- ALTER TABLE uwuso.invites DROP CONSTRAINT IF EXISTS inviter_fk CASCADE;
ALTER TABLE uwuso.invites ADD CONSTRAINT inviter_fk FOREIGN KEY (inviter)
REFERENCES uwuso.users (id) MATCH SIMPLE
ON DELETE NO ACTION ON UPDATE NO ACTION;
-- ddl-end --

-- object: owner_fk | type: CONSTRAINT --
-- ALTER TABLE uwuso.services DROP CONSTRAINT IF EXISTS owner_fk CASCADE;
ALTER TABLE uwuso.services ADD CONSTRAINT owner_fk FOREIGN KEY (owner)
REFERENCES uwuso.users (id) MATCH SIMPLE
ON DELETE NO ACTION ON UPDATE NO ACTION;
-- ddl-end --


