import { Query } from '../types/query';
import * as ItemsService from './items';
import storage from '../storage';
import database from '../database';
import logger from '../logger';
import sharp from 'sharp';
import { parse as parseICC } from 'icc';
import parseEXIF from 'exif-reader';
import parseIPTC from '../utils/parse-iptc';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export const createFile = async (
	data: Record<string, any>,
	stream: NodeJS.ReadableStream,
	query?: Query
) => {
	const id = uuidv4();

	const payload: Record<string, any> = {
		...data,
		id,
	};

	payload.filename_disk = payload.id + path.extname(payload.filename_disk);

	const pipeline = sharp();

	if (payload.type?.startsWith('image')) {
		pipeline.metadata().then((meta) => {
			payload.width = meta.width;
			payload.height = meta.height;
			payload.filesize = meta.size;
			payload.metadata = {};

			if (meta.icc) {
				payload.metadata.icc = parseICC(meta.icc);
			}

			if (meta.exif) {
				payload.metadata.exif = parseEXIF(meta.exif);
			}

			if (meta.iptc) {
				payload.metadata.iptc = parseIPTC(meta.iptc);

				payload.title = payload.title || payload.metadata.iptc.headline;
				payload.description = payload.description || payload.metadata.iptc.caption;
			}
		});
	}

	await storage.disk(data.storage).put(payload.filename_disk, stream.pipe(pipeline));
	const primaryKey = await ItemsService.createItem('directus_files', payload);
	return await ItemsService.readItem('directus_files', primaryKey, query);
};

export const readFiles = async (query: Query) => {
	return await ItemsService.readItems('directus_files', query);
};

export const readFile = async (pk: string | number, query: Query) => {
	return await ItemsService.readItem('directus_files', pk, query);
};

// @todo Add query support
export const updateFile = async (
	pk: string | number,
	data: Record<string, any>,
	stream?: NodeJS.ReadableStream,
	query?: Query
) => {
	/**
	 * @TODO
	 * Handle changes in storage adapter -> going from local to S3 needs to delete from one, upload to the other
	 */

	/**
	 * @TODO
	 * Extract metadata here too
	 */

	if (stream) {
		const file = await database
			.select('storage', 'filename_disk')
			.from('directus_files')
			.where({ id: pk })
			.first();

		// @todo type of stream in flydrive is wrong: https://github.com/Slynova-Org/flydrive/issues/145
		await storage.disk(file.storage).put(file.filename_disk, stream as any);
	}

	const primaryKey = await ItemsService.updateItem('directus_files', pk, data);
	return await ItemsService.readItem('directus_files', primaryKey, query);
};

export const deleteFile = async (pk: string | number) => {
	const file = await database
		.select('storage', 'filename_disk')
		.from('directus_files')
		.where({ id: pk })
		.first();
	const { wasDeleted } = await storage.disk(file.storage).delete(file.filename_disk);
	logger.info(`File ${file.filename_download} deleted: ${wasDeleted}`);
	await database.delete().from('directus_files').where({ id: pk });
};
