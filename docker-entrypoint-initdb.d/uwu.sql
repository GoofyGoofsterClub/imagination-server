CREATE DATABASE dbuser;


-- I HAVE NO IDEA WHAT THE FUCK IS THIS
SELECT 'CREATE DATABASE uwuso' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'uwuso');

GRANT ALL PRIVILEGES ON DATABASE uwuso TO dbuser;
GRANT ALL PRIVILEGES ON DATABASE dbuser TO dbuser;

CREATE SCHEMA uwuso;
ALTER SCHEMA uwuso OWNER TO dbuser;
GRANT ALL PRIVILEGES ON SCHEMA uwuso TO dbuser;

CREATE TABLE uwuso.events (
	id bigint NOT NULL GENERATED ALWAYS AS IDENTITY ,
	event_type text NOT NULL DEFAULT '',
	event_string text NOT NULL DEFAULT '',
	event_caller bigserial NOT NULL,
	CONSTRAINT events_pk PRIMARY KEY (id)
);

ALTER TABLE uwuso.events OWNER TO dbuser;

CREATE TABLE uwuso.users (
	id bigint NOT NULL GENERATED ALWAYS AS IDENTITY ,
	username text NOT NULL,
	access_key text NOT NULL,
	permissions bigint NOT NULL DEFAULT 0,
	private_profile boolean NOT NULL DEFAULT false,
	banned boolean NOT NULL DEFAULT false,
	views bigint NOT NULL DEFAULT 0,
	uploads bigint NOT NULL DEFAULT 0,
	superuser boolean NOT NULL DEFAULT false,
	badges json NOT NULL DEFAULT '[]',
	CONSTRAINT users_pk PRIMARY KEY (id)
);
ALTER TABLE uwuso.users OWNER TO dbuser;

CREATE TABLE uwuso.uploads (
);

ALTER TABLE uwuso.uploads ADD COLUMN id bigint NOT NULL GENERATED ALWAYS AS IDENTITY ;


ALTER TABLE uwuso.uploads ADD COLUMN uploader_id bigint NOT NULL;


ALTER TABLE uwuso.uploads ADD COLUMN filename text NOT NULL;


ALTER TABLE uwuso.uploads ADD COLUMN disk_filename text NOT NULL;


ALTER TABLE uwuso.uploads ADD COLUMN mimetype text NOT NULL;

ALTER TABLE uwuso.uploads ADD COLUMN upload_time bigint NOT NULL;

ALTER TABLE uwuso.uploads ADD COLUMN upload_domain text NOT NULL;

ALTER TABLE uwuso.uploads ADD COLUMN filehash text NOT NULL;

ALTER TABLE uwuso.uploads ADD COLUMN views integer NOT NULL DEFAULT 0;


ALTER TABLE uwuso.uploads ADD COLUMN filesize bigint NOT NULL DEFAULT 0;

ALTER TABLE uwuso.uploads ADD COLUMN service_upload boolean NOT NULL DEFAULT false;



ALTER TABLE uwuso.uploads ADD CONSTRAINT uploads_pk PRIMARY KEY (id);

ALTER TABLE uwuso.uploads OWNER TO dbuser;

CREATE TABLE uwuso.invites (
	id integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT BY 1 MINVALUE 0 MAXVALUE 2147483647 START WITH 1 CACHE 1 ),
	username text NOT NULL,
	hash text NOT NULL,
	inviter bigserial NOT NULL,
	valid_until bigint NOT NULL,
	CONSTRAINT invites_pk PRIMARY KEY (id,inviter)
);
ALTER TABLE uwuso.invites OWNER TO dbuser;

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
ALTER TABLE uwuso.services OWNER TO dbuser;

CREATE TABLE uwuso.statistics (
	field text NOT NULL,
	value bigint NOT NULL,
	CONSTRAINT statistics_pk PRIMARY KEY (field)
);
ALTER TABLE uwuso.statistics OWNER TO dbuser;

ALTER TABLE uwuso.uploads ADD CONSTRAINT uploader_id_fk FOREIGN KEY (uploader_id)
REFERENCES uwuso.users (id) MATCH SIMPLE
ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE uwuso.invites ADD CONSTRAINT inviter_fk FOREIGN KEY (inviter)
REFERENCES uwuso.users (id) MATCH SIMPLE
ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE uwuso.services ADD CONSTRAINT owner_fk FOREIGN KEY (owner)
REFERENCES uwuso.users (id) MATCH SIMPLE
ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE uwuso.events ADD CONSTRAINT event_caller_fk FOREIGN KEY (event_caller)
REFERENCES uwuso.users (id) MATCH SIMPLE
ON DELETE NO ACTION ON UPDATE NO ACTION;