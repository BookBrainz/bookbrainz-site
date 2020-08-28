/*
 * Copyright (C) 2015       Ben Ockmore
 *               2015-2016  Sean Burke
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 */

// @flow

import * as commonUtils from '../../common/helpers/utils';
import * as error from '../../common/helpers/error';
import * as utils from '../helpers/utils';
import type {$Request, $Response, NextFunction} from 'express';
import Promise from 'bluebird';
import _ from 'lodash';


function makeLoader(modelName, propName, sortFunc) {
	return function loaderFunc(req: $Request, res: $Response, next: NextFunction) {
		const {orm}: any = req.app.locals;
		const model = orm[modelName];
		return model.fetchAll()
			.then((results) => {
				const resultsSerial = results.toJSON();

				res.locals[propName] =
					sortFunc ? resultsSerial.sort(sortFunc) : resultsSerial;

				next();

				return null;
			})
			.catch(next);
	};
}

export const loadAuthorTypes = makeLoader('AuthorType', 'authorTypes');
export const loadEditionFormats = makeLoader('EditionFormat', 'editionFormats');
export const loadEditionStatuses =
	makeLoader('EditionStatus', 'editionStatuses');
export const loadIdentifierTypes =
	makeLoader('IdentifierType', 'identifierTypes');
export const loadEditionGroupTypes =
	makeLoader('EditionGroupType', 'editionGroupTypes');
export const loadPublisherTypes = makeLoader('PublisherType', 'publisherTypes');
export const loadWorkTypes = makeLoader('WorkType', 'workTypes');
export const loadRelationshipTypes =
	makeLoader('RelationshipType', 'relationshipTypes');

export const loadGenders =
	makeLoader('Gender', 'genders', (a, b) => a.id > b.id);

export const loadLanguages = makeLoader('Language', 'languages', (a, b) => {
	if (a.frequency !== b.frequency) {
		return b.frequency - a.frequency;
	}

	return a.name.localeCompare(b.name);
});

export function loadEntityRelationships(req: $Request, res: $Response, next: NextFunction) {
	const {orm}: any = req.app.locals;
	const {RelationshipSet} = orm;
	const {entity} = res.locals;

	new Promise((resolve) => {
		if (!entity) {
			throw new error.SiteError('Failed to load entity');
		}

		resolve();
	})
		.then(
			() => RelationshipSet.forge({id: entity.relationshipSetId})
				.fetch({
					require: false,
					withRelated: [
						'relationships.source',
						'relationships.target',
						'relationships.type'
					]
				})
		)
		.then((relationshipSet) => {
			entity.relationships = relationshipSet ?
				relationshipSet.related('relationships').toJSON() : [];

			function getEntityWithAlias(relEntity) {
				const model = commonUtils.getEntityModelByType(orm, relEntity.type);

				return model.forge({bbid: relEntity.bbid})
					.fetch({require: false, withRelated: ['defaultAlias'].concat(utils.getAdditionalRelations(relEntity.type))});
			}

			/**
			 * Source and target are generic Entity objects, so until we have
			 * a good way of polymorphically fetching the right specific entity,
			 * we need to fetch default alias in a somewhat sketchier way.
			 */
			return Promise.all(entity.relationships.map((relationship) =>
				Promise.all([getEntityWithAlias(relationship.source), getEntityWithAlias(relationship.target)])
					.then(([source, target]) => {
						relationship.source = source.toJSON();
						relationship.target = target.toJSON();

						return relationship;
					})));
		})
		.then(() => {
			next();
			return null;
		})
		.catch(next);
}
export async function redirectedBbid(req: $Request, res: $Response, next: NextFunction, bbid: string) {
	if (!commonUtils.isValidBBID(bbid)) {
		return next(new error.BadRequestError(`Invalid bbid: ${req.params.bbid}`, req));
	}
	const {orm}: any = req.app.locals;

	try {
		const redirectBbid = await orm.func.entity.recursivelyGetRedirectBBID(orm, bbid);
		if (redirectBbid !== bbid) {
			// res.location(`${req.baseUrl}/${redirectBbid}`);
			return res.redirect(301, `${req.baseUrl}${req.path.replace(bbid, redirectBbid)}`);
		}
	}
	catch (err) {
		return next(err);
	}
	return next();
}

export function makeEntityLoader(modelName: string, additionalRels: Array<string>, errMessage: string) {
	const relations = [
		'aliasSet.aliases.language',
		'annotation.lastRevision',
		'defaultAlias',
		'disambiguation',
		'identifierSet.identifiers.type',
		'relationshipSet.relationships.type',
		'revision.revision'
	].concat(additionalRels);

	return async (req: $Request, res: $Response, next: NextFunction, bbid: string) => {
		const {orm}: any = req.app.locals;
		if (commonUtils.isValidBBID(bbid)) {
			try {
				const entity = await orm.func.entity.getEntity(orm, modelName, bbid, relations);
				if (!entity.dataId) {
					entity.deleted = true;
					entity.parentAlias = await orm.func.entity.getEntityParentAlias(
						orm, modelName, bbid
					);
				}
				res.locals.entity = entity;
				return next();
			}
			catch (err) {
				return next(new error.NotFoundError(errMessage, req));
			}
		}
		else {
			return next(new error.BadRequestError('Invalid BBID', req));
		}
	};
}

export function makeCollectionLoader() {
	return async (req, res, next, collectionId) => {
		const {UserCollection} = req.app.locals.orm;

		if (commonUtils.isValidBBID(collectionId)) {
			try {
				const collection = await new UserCollection({id: collectionId}).fetch({
					require: true,
					withRelated: ['collaborators.collaborator', 'items', 'owner']
				});
				const collectionJSON = collection.toJSON();
				// reshaping collaborators such that it can be used in EntitySearchFieldOption
				collectionJSON.collaborators = collectionJSON.collaborators.map((collaborator) => ({
					id: collaborator.collaborator.id,
					text: collaborator.collaborator.name
				}));
				res.locals.collection = collectionJSON;
				return next();
			}
			catch (err) {
				return next(new error.NotFoundError('Collection Not Found', req));
			}
		}
		else {
			return next(new error.BadRequestError('Invalid Collection ID', req));
		}
	};
}

export async function validateBBIDsBeforeAdding(req, res, next) {
	const {Entity} = req.app.locals.orm;
	const {bbids = []} = req.body;
	const {collection} = res.locals;
	const collectionType = collection.entityType;
	for (let i = 0; i < bbids.length; i++) {
		const bbid = bbids[i];
		if (!commonUtils.isValidBBID(bbid)) {
			return next(new error.BadRequestError('Trying to add an entity having invalid BBID', req));
		}
	}
	const entities = await new Entity().where('bbid', 'in', bbids).fetchAll();
	const entitiesJSON = entities.toJSON();
	for (let i = 0; i < bbids.length; i++) {
		const bbid = bbids[i];
		const entity = entitiesJSON.find(currEntity => currEntity.bbid === bbid);
		if (!entity) {
			return next(new error.NotFoundError(`${collectionType} ${bbid} does not exist`, req));
		}
		if (_.lowerCase(entity.type) !== _.lowerCase(collectionType)) {
			return next(new error.BadRequestError(`Cannot add an entity of type ${entity.type} to a collection of type ${collectionType}`));
		}
	}

	return next();
}

export function validateBBIDsBeforeRemoving(req, res, next) {
	const {bbids = []} = req.body;
	const {collection} = res.locals;
	for (let i = 0; i < bbids.length; i++) {
		const bbid = bbids[i];
		if (!commonUtils.isValidBBID(bbid)) {
			return next(new error.BadRequestError('Trying to remove an entity having invalid bbid', req));
		}
	}
	for (let i = 0; i < bbids.length; i++) {
		const bbid = bbids[i];
		const isBbidInCollection = collection.items.find(item => item.bbid === bbid);
		if (!isBbidInCollection) {
			return next(new error.BadRequestError('Trying to remove an entity which is not present in the collection', req));
		}
	}

	return next();
}


export async function validateCollectionParams(req, res, next) {
	const {collaborators = [], name, entityType} = req.body;
	const {orm} = req.app.locals;
	const {Editor} = orm;

	if (!_.trim(name).length) {
		return next(new error.BadRequestError('Invalid collection name: Empty string not allowed', req));
	}
	const entityTypes = _.keys(commonUtils.getEntityModels(orm));
	if (!entityTypes.includes(entityType)) {
		return next(new error.BadRequestError(`Invalid entity type: ${entityType} does not exist`, req));
	}
	const collaboratorIds = collaborators.map(collaborator => collaborator.id);
	for (let i = 0; i < collaboratorIds.length; i++) {
		const collaboratorId = collaboratorIds[i];
		if (!(/^\d+$/).test(collaboratorId)) {
			return next(new error.BadRequestError(`Invalid collaborator id: ${collaboratorId} not valid`, req));
		}
	}

	const editors = await new Editor().where('id', 'in', collaboratorIds).fetchAll({require: false});
	const editorsJSON = editors.toJSON();
	for (let i = 0; i < collaboratorIds.length; i++) {
		const collaboratorId = collaboratorIds[i];
		if (!editorsJSON.find(editor => editor.id === collaboratorId)) {
			return next(new error.NotFoundError(`Collaborator ${collaboratorId} does not exist`, req));
		}
	}
	return next();
}
