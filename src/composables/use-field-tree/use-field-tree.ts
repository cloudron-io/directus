import { Ref, computed } from '@vue/composition-api';
import { FieldTree } from './types';
import useFieldsStore from '@/stores/fields';
import useRelationsStore from '@/stores/relations';
import { Field } from '@/stores/fields/types';
import { Relation } from '@/stores/relations/types';

export default function useFieldTree(collection: Ref<string>) {
	const fieldsStore = useFieldsStore();
	const relationsStore = useRelationsStore();

	const tree = computed<FieldTree[]>(() => {
		return fieldsStore
			.getFieldsForCollection(collection.value)
			.filter(
				(field: Field) =>
					field.system?.hidden_browse === false && field.system?.special?.toLowerCase() !== 'alias'
			)
			.map((field: Field) => parseField(field, []));

		function parseField(field: Field, parents: Field[]) {
			const fieldInfo: FieldTree = {
				field: field.field,
				name: field.name,
			};

			if (parents.length === 2) {
				return fieldInfo;
			}

			const relations = relationsStore.getRelationsForField(field.collection, field.field);

			if (relations.length > 0) {
				const relatedFields = relations
					.map((relation: Relation) => {
						const relatedCollection =
							relation.collection_many === field.collection
								? relation.collection_one
								: relation.collection_many;

						if (relation.junction_field === field.field) return [];

						return fieldsStore
							.getFieldsForCollection(relatedCollection)
							.filter(
								(field: Field) =>
									field.system?.hidden_browse === false &&
									field.system?.special?.toLowerCase() !== 'alias'
							);
					})
					.flat()
					.map((childField: Field) => parseField(childField, [...parents, field]));

				fieldInfo.children = relatedFields;
			}

			return fieldInfo;
		}
	});

	return { tree };
}
