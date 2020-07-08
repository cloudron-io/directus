import { Query } from '../types/query';
import * as ItemsService from './items';

export const createRole = async (data: Record<string, any>, query: Query) => {
	const primaryKey = await ItemsService.createItem('directus_roles', data);
	return await ItemsService.readItem('directus_roles', primaryKey, query);
};

export const readRoles = async (query: Query) => {
	return await ItemsService.readItems('directus_roles', query);
};

export const readRole = async (pk: string | number, query: Query) => {
	return await ItemsService.readItem('directus_roles', pk, query);
};

export const updateRole = async (pk: string | number, data: Record<string, any>, query: Query) => {
	const primaryKey = await ItemsService.updateItem('directus_roles', pk, data);
	return await ItemsService.readItem('directus_roles', primaryKey, query);
};

export const deleteRole = async (pk: string | number) => {
	await ItemsService.deleteItem('directus_roles', pk);
};
