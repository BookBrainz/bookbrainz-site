/*
 * Copyright (C) 2015       Ben Ockmore
 *               2015-2016  Sean Burke
 *               2018       Shivam Tripathi
 *               2021       Akash Gupta
 *               2022       Ansh Goyal
 *               2023       David Kellner
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

import * as commonUtils from '../../common/helpers/utils';
import * as error from '../../common/helpers/error';
import * as utils from '../helpers/utils';
import type {Response as $Response, NextFunction, Request} from 'express';
import {ENTITY_TYPES, getRelationshipTargetBBIDByTypeId} from '../../client/helpers/entity';
import {getWikipediaExtract, selectWikipediaPage} from './wikimedia';

import {ImportMetadataWithSourceT} from 'bookbrainz-data/lib/types/imports';
import {type ORM} from 'bookbrainz-data';
import _ from 'lodash';
import {getAcceptedLanguageCodes} from './i18n';
import {getReviewsFromCB} from './critiquebrainz';
import {getWikidataId} from '../../common/helpers/wikimedia';
import log from 'log';
import moment from 'moment';


interface $Request extends Request {
	user: any
}

function makeLoader(modelName, propName, sortFunc?, relations = []) {
	return async function loaderFunc(req: $Request, res: $Response, next: NextFunction) {
		try {
			const {orm}: any = req.app.locals;
			const model = orm[modelName];
			const results = await model.fetchAll({withRelated: [...relations]});
			const resultsSerial = results.toJSON();
			res.locals[propName] =
				sortFunc ? resultsSerial.sort(sortFunc) : resultsSerial;
		}
		catch (err) {
			return next(err);
		}
		next();
		return null;
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
export const loadSeriesOrderingTypes =
	makeLoader('SeriesOrderingType', 'seriesOrderingTypes');
export const loadRelationshipTypes =
	makeLoader('RelationshipType', 'relationshipTypes', null, ['attributeTypes']);
export const loadParentRelationshipTypes =
	makeLoader('RelationshipType', 'parentTypes');
export const loadParentIdentifierTypes =
	makeLoader('IdentifierType', 'parentTypes');
export const loadRelationshipAttributeTypes =
	makeLoader('RelationshipAttributeType', 'attributeTypes');

export const loadGenders =
	makeLoader('Gender', 'genders', (a, b) => a.id > b.id);

export const loadLanguages = makeLoader('Language', 'languages', (a, b) => {
	if (a.frequency !== b.frequency) {
		return b.frequency - a.frequency;
	}

	return a.name.localeCompare(b.name);
});

export function loadSeriesItems(req: $Request, res: $Response, next: NextFunction) {
	try {
		const {entity} = res.locals;
		if (entity.dataId) {
			const {relationships} = entity;
			// Extract the series items from relationships
			const seriesItems = _.remove(relationships, (relationship: any) => relationship.typeId > 69 && relationship.typeId < 75);
			if (entity.seriesOrderingType.label === 'Manual') {
				seriesItems.sort(commonUtils.sortRelationshipOrdinal('position'));
			}
			else {
				seriesItems.sort(commonUtils.sortRelationshipOrdinal('number'));
			}
			const formattedSeriesItems = seriesItems.map((item) => (
				{...item.source, displayNumber: true,
					number: item.number,
					position: item.position}
			));
			res.locals.entity.seriesItems = formattedSeriesItems;
		}
		else {
			res.locals.entity.seriesItems = [];
		}
		return next();
	}
	catch (err) {
		return next(err);
	}
}

export async function loadWorkTableAuthors(req: $Request, res: $Response, next: NextFunction) {
	const {orm}: any = req.app.locals;
	const {entity} = res.locals;
	try {
		const workBBIDs = getRelationshipTargetBBIDByTypeId(entity, 10);
		const authorsData = await orm.func.work.loadAuthorNames(orm, workBBIDs);
		const authorsDataGroupedByWorkBBID = _.groupBy(authorsData, 'workbbid');
		entity.authorsData = authorsDataGroupedByWorkBBID;
	}
	catch (err) {
		return next(err);
	}
	return next();
}

/**
 * Add the relationships on entity object.
 *
 * @param {Object} entity - The entity to load the relationships for.
 * @param {Object} relationshipSet - The RelationshipSet model.
 * @param {Object} orm - The ORM instance.
 */

export async function addRelationships(entity, relationshipSet, orm) {
	async function getEntityWithAlias(relEntity) {
		const redirectBbid = await orm.func.entity.recursivelyGetRedirectBBID(orm, relEntity.bbid, null);
		const model = commonUtils.getEntityModelByType(orm, relEntity.type);

		return model.forge({bbid: redirectBbid})
			.fetch({require: false, withRelated: ['defaultAlias'].concat(utils.getAdditionalRelations(relEntity.type))});
	}

	entity.relationships = relationshipSet ?
		relationshipSet.related('relationships').toJSON() : [];

	utils.attachAttributes(entity.relationships);

	/**
	 * Source and target are generic Entity objects, so until we have
	 * a good way of polymorphically fetching the right specific entity,
	 * we need to fetch default alias in a somewhat sketchier way.
	 */
	const relationshipPromises = entity.relationships.map(async (relationship) => {
		const [source, target] = await Promise.all([getEntityWithAlias(relationship.source), getEntityWithAlias(relationship.target)]);
		relationship.source = source.toJSON();
		relationship.target = target.toJSON();

		return relationship;
	});

	const relationships = await Promise.all(relationshipPromises);
	return relationships;
}


export async function loadEntityRelationships(req: $Request, res: $Response, next: NextFunction) {
	const {orm}: any = req.app.locals;
	const {RelationshipSet} = orm;
	const {entity} = res.locals;

	try {
		if (!entity) {
			throw new error.SiteError('Failed to load entity');
		}

		const relationshipSet = await RelationshipSet.forge({id: entity.relationshipSetId})
			.fetch({
				require: false,
				withRelated: [
					'relationships.source',
					'relationships.target',
					'relationships.type.attributeTypes',
					'relationships.attributeSet.relationshipAttributes.value',
					'relationships.attributeSet.relationshipAttributes.type'
				]
			});

		await addRelationships(entity, relationshipSet, orm);
	}
	catch (err) {
		return next(err);
	}
	return next();
}

export async function loadWikipediaExtract(req: $Request, res: $Response, next: NextFunction) {
	const {entity} = res.locals;
	if (!entity) {
		return next(new error.SiteError('Failed to load entity'));
	}

	const wikidataId = getWikidataId(entity);
	if (!wikidataId) {
		return next();
	}

	// try to use the user's browser languages, fallback to English and alias languages
	const browserLanguages = getAcceptedLanguageCodes(req);
	const aliasLanguages = commonUtils.getAliasLanguageCodes(entity);
	const preferredLanguages = browserLanguages.concat('en', aliasLanguages);

	try {
		// only pre-load Wikipedia extracts which are already cached
		const article = await selectWikipediaPage(wikidataId, {forceCache: true, preferredLanguages});
		if (article) {
			const extract = await getWikipediaExtract(article, {forceCache: true});
			if (extract) {
				res.locals.wikipediaExtract = {article, ...extract};
			}
		}
	}
	catch (err) {
		log.warning(`Failed to pre-load Wikipedia extract for ${wikidataId}: ${err.message}`);
	}

	return next();
}

export function checkValidRevisionId(req: $Request, res: $Response, next: NextFunction, id: string) {
	const idToNumber = _.toNumber(id);
	if (!_.isInteger(idToNumber) || (_.isInteger(idToNumber) && idToNumber <= 0)) {
		return next(new error.BadRequestError(`Invalid revision id: ${req.params.id}`, req));
	}
	return next();
}

export function checkValidTypeId(req: $Request, res: $Response, next: NextFunction, id: string) {
	const idToNumber = _.toNumber(id);
	if (!_.isInteger(idToNumber) || idToNumber <= 0) {
		return next(new error.BadRequestError(`Invalid Type id: ${req.params.id}`, req));
	}
	return next();
}

export function checkValidEntityType(req: $Request, res: $Response, next: NextFunction, entityType: string) {
	const entityTypes = ENTITY_TYPES.map(entity => _.snakeCase(entity));
	if (!_.includes(entityTypes, entityType)) {
		return next(new error.BadRequestError(`Invalid Entity Type: ${_.startCase(entityType)}`, req));
	}
	return next();
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

export type ImportMetadataWithVote = ImportMetadataWithSourceT & {
	userHasVoted: boolean;
};

async function loadImportMetadata(orm: ORM, importId: string, userId?: number): Promise<ImportMetadataWithVote> {
	const [votes, metadata] = await orm.bookshelf.transaction(
		(transacting) =>
			Promise.all([
				orm.func.imports.discardVotesCast(
					transacting, importId
				),
				orm.func.imports.getImportMetadata(
					transacting, importId
				)
			])
	);

	return {
		...metadata,
		importedAt: moment(metadata.importedAt).format('YYYY-MM-DD'),
		userHasVoted: userId ? Boolean(votes.find(vote => vote.editorId === userId)) : false,
	};
}

export function makeEntityLoader(modelName: string, additionalRels: Array<string>, errMessage: string) {
	const relations = [
		'aliasSet.aliases.language',
		'annotation.lastRevision',
		'defaultAlias',
		'disambiguation',
		'identifierSet.identifiers.type',
		'relationshipSet.relationships.type',
		'revision.revision',
		'collections.owner'
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
				if (entity.collections) {
					entity.collections = entity.collections.filter(collection => collection.public === true ||
					parseInt(collection.ownerId, 10) === parseInt(req.user?.id, 10));
				}
				if (entity.revision) {
					entity.reviews = await getReviewsFromCB(bbid, entity.type);
				}
				else {
					// Entity is a pending import
					const userId = _.get(req, 'session.passport.user.id');
					entity.importMetadata = await loadImportMetadata(orm, bbid, userId);
					entity.reviews = {reviews: [], successfullyFetched: true};
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

// TODO: Part of this function should be moved into the ORM, similar to regular entities.
export function makeImportLoader(modelName, additionalRels, errMessage) {
	const relations = [
		'aliasSet.aliases.language',
		'annotation',
		'defaultAlias',
		'disambiguation',
		'identifierSet.identifiers.type'
	].concat(additionalRels);

	return async (req, res: $Response, next: NextFunction, importId: string) => {
		if (commonUtils.isValidBBID(importId)) {
			const {orm}: {orm: ORM} = req.app.locals;
			const model = commonUtils.getImportModelByType(orm, modelName);
			try {
				const importEntityRecord = await model.forge({bbid: importId})
					.fetch({
						withRelated: relations
					});
				res.locals.importEntity = importEntityRecord.toJSON();

				const [votes, metadata] = await orm.bookshelf.transaction(
					(transacting) =>
						Promise.all([
							orm.func.imports.discardVotesCast(
								transacting, importId
							),
							orm.func.imports.getImportMetadata(
								transacting, importId
							)
						])
				);

				if (_.get(req, 'session.passport.user.id')) {
					const editorId = req.session.passport.user.id;
					res.locals.importEntity.hasVoted =
						votes.length > 0 && Boolean(votes.filter(
							vote => vote.editorId === editorId
						));
				}
				else {
					res.locals.importEntity.hasVoted = false;
				}

				res.locals.importEntity.source = metadata.source;
				res.locals.importEntity.importedAt =
					moment(metadata.importedAt as any).format('YYYY-MM-DD');
			}
			catch (err) {
				return next(new error.NotFoundError(errMessage, req));
			}

			return next();
		}

		return next('route');
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

export async function validateCollectionParams(req, res, next) {
	const {collaborators = [], name, entityType} = req.body;
	const {orm} = req.app.locals;
	const {Editor} = orm;

	if (!_.trim(name).length) {
		return next(new error.BadRequestError('Invalid collection name: Empty string not allowed', req));
	}
	const entityTypes = _.keys(commonUtils.getEntityModels(orm));
	if (!entityTypes.includes(_.upperFirst(_.camelCase(entityType)))) {
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

export async function validateBBIDsForCollectionAdd(req, res, next) {
	const {Entity} = req.app.locals.orm;
	const {bbids = []} = req.body;
	if (!bbids.length) {
		return next(new error.BadRequestError('BBIDs array is empty'));
	}
	const {collection} = res.locals;
	const collectionType = collection.entityType;
	for (let i = 0; i < bbids.length; i++) {
		const bbid = bbids[i];
		if (!commonUtils.isValidBBID(bbid)) {
			return next(new error.BadRequestError(`Invalid BBID ${bbid}`, req));
		}
	}
	const entities = await new Entity().where('bbid', 'in', bbids).fetchAll({require: false});
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

export function validateBBIDsForCollectionRemove(req, res, next) {
	const {bbids = []} = req.body;
	if (!bbids.length) {
		return next(new error.BadRequestError('BBIDs array is empty'));
	}
	const {collection} = res.locals;
	for (let i = 0; i < bbids.length; i++) {
		const bbid = bbids[i];
		if (!commonUtils.isValidBBID(bbid)) {
			return next(new error.BadRequestError(`Invalid BBID ${bbid}`, req));
		}
	}
	for (let i = 0; i < bbids.length; i++) {
		const bbid = bbids[i];
		const isBbidInCollection = collection.items.find(item => item.bbid === bbid);
		if (!isBbidInCollection) {
			return next(new error.BadRequestError(`Entity ${bbid} is not in collection ${collection.id}`, req));
		}
	}

	return next();
}

export function validateCollaboratorIdsForCollectionRemove(req, res, next) {
	const {collaboratorIds = []} = req.body;
	if (!collaboratorIds.length) {
		return next(new error.BadRequestError('CollaboratorIds array is empty'));
	}
	const {collection} = res.locals;
	for (let i = 0; i < collaboratorIds.length; i++) {
		const collaboratorId = collaboratorIds[i];
		const isCollaborator = collection.collaborators.find(collaborator => collaborator.id === collaboratorId);
		if (!isCollaborator) {
			return next(new error.BadRequestError(`User ${collaboratorId} is not a collaborator of collection ${collection.id}`, req));
		}
	}

	return next();
}
