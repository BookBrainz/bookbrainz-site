/*
 * Copyright (C) 2016  Ben Ockmore
 *               2016  Sean Burke
 *               2021  Akash Gupta
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

import * as React from 'react';
import * as achievement from '../../helpers/achievement';
import * as commonUtils from '../../../common/helpers/utils';
import * as error from '../../../common/helpers/error';
import * as handler from '../../helpers/handler';
import * as propHelpers from '../../../client/helpers/props';
import * as search from '../../../common/helpers/search';
import * as utils from '../../helpers/utils';

import type {Request as $Request, Response as $Response, NextFunction} from 'express';
import type {
	FormLanguageT as Language,
	FormPublisherT as Publisher,
	FormReleaseEventT as ReleaseEvent,
	Transaction
} from 'bookbrainz-data/lib/func/types';
import {escapeProps, generateProps} from '../../helpers/props';

import {AuthorCreditRow} from '../../../client/entity-editor/author-credit-editor/actions';
import AuthorPage from '../../../client/components/pages/entities/author';
import DeletionForm from '../../../client/components/forms/deletion';
import EditionGroupPage from '../../../client/components/pages/entities/edition-group';
import EditionPage from '../../../client/components/pages/entities/edition';
import EntityRevisions from '../../../client/components/pages/entity-revisions';
import type {EntityTypeString} from 'bookbrainz-data/lib/types/entity';
import Layout from '../../../client/containers/layout';
import type {ORM} from 'bookbrainz-data';
import PreviewPage from '../../../client/components/forms/preview';
import PublisherPage from '../../../client/components/pages/entities/publisher';
import ReactDOMServer from 'react-dom/server';
import SeriesPage from '../../../client/components/pages/entities/series';
import WorkPage from '../../../client/components/pages/entities/work';
import _ from 'lodash';
import {getEntityLabel} from '../../../client/helpers/entity';
import {getOrderedRevisionsForEntityPage} from '../../helpers/revisions';
import log from 'log';
import {processAchievement} from './process-unified-form';
import target from '../../templates/target';


type PassportRequest = $Request & {user: any, session: any};

const entityComponents = {
	author: AuthorPage,
	edition: EditionPage,
	editionGroup: EditionGroupPage,
	publisher: PublisherPage,
	series: SeriesPage,
	work: WorkPage
};

export function displayEntity(req: PassportRequest, res: $Response) {
	const {orm}: {orm?: ORM} = req.app.locals;
	const {AchievementUnlock, EditorEntityVisits} = orm;
	const {locals: resLocals}: {locals: any} = res;
	const {entity}: {entity: any} = resLocals;
	// Get unique identifier types for display
	let identifierTypes = [];
	if (entity.identifierSet) {
		identifierTypes = _.uniqBy(
			_.map(entity.identifierSet.identifiers, 'type'),
			'id'
		);
	}

	let editorEntityVisitPromise;
	if (resLocals.user) {
		editorEntityVisitPromise = new EditorEntityVisits({
			bbid: resLocals.entity.bbid,
			editorId: resLocals.user.id
		})
			.save(null, {method: 'insert'})
			.then(() => achievement.processPageVisit(orm, resLocals.user.id))
			.catch(
				// error caused by duplicates we do not want in database
				() => new Promise(resolve => resolve(false))
			);
	}
	else {
		editorEntityVisitPromise = new Promise(resolve => resolve(false));
	}

	let alertPromise = editorEntityVisitPromise.then((visitAlert) => {
		let alertIds = [];
		if (visitAlert.alert) {
			alertIds = alertIds.concat(visitAlert.alert.split(',').map(
				(id) => parseInt(id, 10)
			));
		}
		if (_.isString(req.query.alert)) {
			// $FlowFixMe
			alertIds = alertIds.concat(req.query.alert.split(',').map(
				(id) =>	parseInt(id, 10)
			));
		}
		if (alertIds.length > 0) {
			const promiseList = alertIds.map(
				(achievementAlert) =>
					new AchievementUnlock(
						{id: achievementAlert}
					)
						.fetch({
							require: true,
							withRelated: ['achievement']
						})
						.then((unlock) => unlock.toJSON())
						.then((unlock) => {
							let unlockName;
							if (req.user.id === unlock.editorId) {
								unlockName = {
									name: unlock.achievement.name
								};
							}
							return unlockName;
						})
						.catch((err) => {
							log.debug(err);
						})
			);
			alertPromise = Promise.all(promiseList);
		}
		else {
			alertPromise = new Promise(resolve => resolve(false));
		}
		return alertPromise;
	});

	return alertPromise.then((alert) => {
		const entityName = _.camelCase(entity.type);
		const EntityComponent = entityComponents[entityName];
		if (EntityComponent) {
			const props = generateProps(req, res, {
				alert,
				genderOptions: res.locals.genders,
				identifierTypes
			});
			const markup = ReactDOMServer.renderToString(
				<Layout {...propHelpers.extractLayoutProps(props)}>
					<EntityComponent
						{...propHelpers.extractEntityProps(props)}
					/>
				</Layout>
			);
			res.send(target({
				markup,
				page: entityName,
				props: escapeProps(props),
				script: '/js/entity/entity.js',
				title: `${getEntityLabel(props.entity, false)} (${_.upperFirst(entityName)})`
			}));
		}
		else {
			throw new Error(
				`Component was not found for the following entity:${entityName}`
			);
		}
	});
}

export function displayDeleteEntity(req: PassportRequest, res: $Response) {
	const props = generateProps(req, res);

	const markup = ReactDOMServer.renderToString(
		<Layout {...propHelpers.extractLayoutProps(props)}>
			<DeletionForm entity={props.entity}/>
		</Layout>
	);

	res.send(target({
		markup,
		props: escapeProps(props),
		script: '/js/deletion.js'
	}));
}

export async function displayRevisions(
	req: PassportRequest, res: $Response, next: NextFunction, RevisionModel: any
) {
	const size = _.isString(req.query.size) ? parseInt(req.query.size, 10) : 20;
	const from = _.isString(req.query.from) ? parseInt(req.query.from, 10) : 0;
	const {orm}: any = req.app.locals;
	const {bbid} = req.params;
	try {
		// get 1 more revision than required to check nextEnabled
		const orderedRevisions = await getOrderedRevisionsForEntityPage(orm, from, size + 1, RevisionModel, bbid);
		const {newResultsArray, nextEnabled} = commonUtils.getNextEnabledAndResultsArray(orderedRevisions, size);
		const props = generateProps(req, res, {
			from,
			nextEnabled,
			revisions: newResultsArray,
			showRevisionEditor: true,
			showRevisionNote: true,
			size
		});

		const markup = ReactDOMServer.renderToString(
			<Layout {...propHelpers.extractLayoutProps(props)}>
				<EntityRevisions
					entity={props.entity}
					{...propHelpers.extractChildProps(props)}
				/>
			</Layout>
		);
		return res.send(target({
			markup,
			page: 'revisions',
			props: escapeProps(props),
			script: '/js/entity/entity.js'
		}));
	}
	catch (err) {
		return next(err);
	}
}

// eslint-disable-next-line consistent-return
export async function updateDisplayedRevisions(
	req: PassportRequest, res: $Response, next: NextFunction, RevisionModel: any
) {
	const size = _.isString(req.query.size) ? parseInt(req.query.size, 10) : 20;
	const from = _.isString(req.query.from) ? parseInt(req.query.from, 10) : 0;
	const {orm}: any = req.app.locals;
	const {bbid} = req.params;
	try {
		const orderedRevisions = await getOrderedRevisionsForEntityPage(orm, from, size, RevisionModel, bbid);
		res.send(orderedRevisions);
	}
	catch (err) {
		return next(err);
	}
}

function _createNote(orm: ORM, content: string, editorID: number, revision, transacting: Transaction) {
	const {Note} = orm;
	if (content) {
		const revisionId = revision.get('id');
		return new Note({
			authorId: editorID,
			content,
			revisionId
		})
			.save(null, {transacting});
	}

	return null;
}

export function addNoteToRevision(req: PassportRequest, res: $Response) {
	const {orm}: {orm?: any} = req.app.locals;
	const {Revision, bookshelf} = orm;
	const editorJSON = req.session.passport.user;
	const revision = Revision.forge({id: req.params.id});
	const {body}: {body: any} = req;
	const revisionNotePromise = bookshelf.transaction(
		(transacting) => _createNote(
			orm, body.note, editorJSON.id, revision, transacting
		)
	);
	return handler.sendPromiseResult(res, revisionNotePromise);
}

export async function getEntityByBBID(orm: any, transacting: Transaction, bbid: string) {
	const redirectBbid = await orm.func.entity.recursivelyGetRedirectBBID(orm, bbid, transacting);
	const entityHeader = await orm.Entity.forge({bbid: redirectBbid}).fetch({transacting});

	const model = commonUtils.getEntityModelByType(orm, entityHeader.get('type'));
	return model.forge({bbid: redirectBbid}).fetch({transacting});
}

async function setParentRevisions(transacting: Transaction, newRevision, parentRevisionIDs) {
	if (_.isEmpty(parentRevisionIDs)) {
		return new Promise(resolve => resolve(null));
	}

	// Get the parents of the new revision
	const parents =
		await newRevision.related('parents').fetch({transacting});

	// Add the previous revision as a parent of this revision.
	return parents.attach(parentRevisionIDs, {transacting});
}


export async function saveEntitiesAndFinishRevision(
	orm: ORM, transacting: Transaction, isNew: boolean, newRevision: any, mainEntity: any,
	updatedEntities: any[], editorID: number, note: string
) {
	const parentRevisionIDs = _.compact(_.uniq(updatedEntities.map(
		(entityModel) => entityModel.get('revisionId')
	)));

	const entitiesSavedPromise = Promise.all(
		_.map(updatedEntities, (entityModel) => {
			entityModel.set('revisionId', newRevision.get('id'));

			const shouldInsert =
				entityModel.get('bbid') === mainEntity.get('bbid') && isNew;
			const method = shouldInsert ? 'insert' : 'update';
			return entityModel.save(null, {method, transacting});
		})
	);

	const editorUpdatePromise =
		utils.incrementEditorEditCountById(orm, editorID, transacting);

	const notePromise = _createNote(
		orm, note, editorID, newRevision, transacting
	);

	const parentsAddedPromise =
		setParentRevisions(transacting, newRevision, parentRevisionIDs);

	/** model.save returns a refreshed model */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const [savedEntities, ...others] = await Promise.all([
		entitiesSavedPromise,
		editorUpdatePromise,
		parentsAddedPromise,
		notePromise
	]);

	return savedEntities.find(entityModel => entityModel.get('bbid') === mainEntity.get('bbid')) || mainEntity;
}

export async function deleteRelationships(orm: ORM, transacting: Transaction, mainEntity: any) {
	const mainBBID = mainEntity.bbid;
	const {relationshipSet} = mainEntity;
	const otherBBIDs = [];
	const otherEntities = [];

	if (relationshipSet) {
		// Create a list of BBID's that is related to the deleted entity
		if (!relationshipSet.relationships) {
			return [];
		}
		relationshipSet.relationships.forEach((relationship) => {
			if (relationship.sourceBbid === mainBBID) {
				otherBBIDs.push(relationship.targetBbid);
			}
			else if (relationship.targetBbid === mainBBID) {
				otherBBIDs.push(relationship.sourceBbid);
			}
		});

		// Loop over the BBID's of other entites related to deleted entity
		if (otherBBIDs.length) {
			if (otherBBIDs.length === 0) {
				return [];
			}
			await Promise.all(otherBBIDs.map(async (entityBbid) => {
				const otherEntity = await getEntityByBBID(orm, transacting, entityBbid);

				const otherEntityRelationshipSet = await otherEntity.relationshipSet()
					.fetch({require: false, transacting, withRelated: 'relationships'});

				if (_.isNil(otherEntityRelationshipSet)) {
					return;
				}

				// Fetch other entity relationships to remove relation with the deleted entity
				let otherEntityRelationships = otherEntityRelationshipSet.related('relationships').toJSON();

				// Mark entites related to deleted entity as removed
				otherEntityRelationships = otherEntityRelationships.map((rel) => {
					if (mainBBID !== rel.sourceBbid && mainBBID !== rel.targetBbid) {
						return rel;
					}
					_.set(rel, 'isRemoved', true);
					return rel;
				});

				const newRelationshipSet = await orm.func.relationship.updateRelationshipSets(
					orm, transacting, otherEntityRelationshipSet, otherEntityRelationships
				);

				otherEntity.set(
					'relationshipSetId',
					newRelationshipSet[entityBbid] ? newRelationshipSet[entityBbid].get('id') : null
				);

				otherEntities.push(otherEntity);
			}));
		}
	}

	return otherEntities;
}

export function fetchOrCreateMainEntity(
	orm: ORM, transacting: Transaction, isNew: boolean, bbid: string, entityType: EntityTypeString
) {
	const model = commonUtils.getEntityModelByType(orm, entityType);

	const entity = model.forge({bbid});

	if (isNew) {
		return new Promise(resolve => resolve(entity));
	}

	return entity.fetch({transacting});
}

export function handleDelete(
	orm: ORM, req: PassportRequest, res: $Response, HeaderModel: any,
	RevisionModel: any
) {
	const {entity}: {entity?: any} = res.locals;
	if (!entity.dataId) {
		throw new error.ConflictError('This entity has already been deleted');
	}
	const {Revision, bookshelf} = orm;
	const editorJSON = req.session.passport.user;
	const {body}: {body: any} = req;
	const entityDeletePromise = bookshelf.transaction(async (transacting) => {
		if (!body.note || !body.note.length) {
			throw new error.FormSubmissionError('A revision note is required when deleting an entity');
		}

		const otherEntities = await deleteRelationships(orm, transacting, entity);

		const newRevision = await new Revision({
			authorId: editorJSON.id
		}).save(null, {transacting});

		/*
		 * No trigger for deletions, so manually create the <Entity>Revision
		 * and update the entity header
		 */

		const entityRevision = await new RevisionModel({
			bbid: entity.bbid,
			dataId: null,
			id: newRevision.get('id')
		}).save(null, {
			method: 'insert',
			transacting
		});

		// set parent revision
		await setParentRevisions(transacting, newRevision, [entity.revisionId]);

		await new HeaderModel({
			bbid: entity.bbid,
			masterRevisionId: entityRevision.get('id')
		}).save(null, {transacting});

		const mainEntity = await fetchOrCreateMainEntity(
			orm, transacting, false, entity.bbid, entity.type
		);

		const savedMainEntity =
			await saveEntitiesAndFinishRevision(
				orm,
				transacting,
				false,
				newRevision,
				mainEntity,
				otherEntities,
				editorJSON.id,
				body.note
			);
		return savedMainEntity.toJSON({omitPivot: true});
	});

	return handler.sendPromiseResult(res, entityDeletePromise, search.deleteEntity);
}

export async function processMergeOperation(
	orm, transacting: Transaction, session, mainEntity, allEntities, relationshipSets
) {
	const {Edition, bookshelf} = orm;
	const {mergingEntities} = session.mergeQueue;
	if (!mergingEntities) {
		throw new Error('Merge handler called with no merge queue, aborting');
	}
	const entityType = mainEntity.get('type');
	const currentEntityBBID = mainEntity.get('bbid');
	const mergingEntitiesBBIDs = Object.keys(mergingEntities);
	if (!_.includes(mergingEntitiesBBIDs, currentEntityBBID)) {
		throw new Error('Entity being merged into does not appear in merge queue, aborting');
	}
	const entitiesToMergeBBIDs = _.without(Object.keys(mergingEntities), currentEntityBBID);
	let allEntitiesReturnArray = allEntities;
	// fetch entities we're merging to add them to to the array of modified entities
	const entitiesToMerge = _.values(mergingEntities).filter(({bbid}) => bbid !== currentEntityBBID);

	const entitiesModelsToMerge = await Promise.all(entitiesToMergeBBIDs
		.map(bbid => fetchOrCreateMainEntity(orm, transacting, false, bbid, entityType)));

	/** Add entities to be merged to the array of modified entities */
	allEntitiesReturnArray = _.unionBy(allEntitiesReturnArray, entitiesModelsToMerge, 'id');

	/** Remove relationships that concern entities being merged from already modified relationshipSets */
	await Promise.all(_.map(relationshipSets, async (relationshipSet) => {
		/** Some items in this object may be null */
		if (relationshipSet) {
			/** Refresh RelationshipSet to fetch both existing and new relationships */
			const refreshedrelationshipSet = await relationshipSet
				.refresh({transacting, withRelated: 'relationships'});

			/** Find relationships with entities being merge and remove them from set */
			const relationshipsToRemove = refreshedrelationshipSet
				.related('relationships').toJSON()
				.filter(({sourceBbid, targetBbid}) => _.includes(entitiesToMergeBBIDs, sourceBbid) ||
						_.includes(entitiesToMergeBBIDs, targetBbid))
				.map(({id}) => id);
			if (relationshipsToRemove.length) {
				await refreshedrelationshipSet
					.related('relationships')
					.detach(relationshipsToRemove, {transacting});
			}
		}
	}));

	/**
	 * Fetch each merged entity, get its relationships, then fetch the related entity for each relationship.
	 * Then on the related entity's side, remove any relationship with merged entities from its relationship set
	 */
	await Promise.all(entitiesModelsToMerge.map(
		async entity => {
			const entityBBID = entity.get('bbid');
			const relationshipSet = await entity.relationshipSet()
				.fetch({require: false, transacting, withRelated: 'relationships'});
			if (!relationshipSet) {
				return;
			}
			const relationships = relationshipSet.related('relationships').toJSON();

			const otherEntitiesToFetch = relationships
				.reduce((accumulator, relationship) => {
					if (relationship.sourceBbid === entityBBID) {
						accumulator.push(relationship.targetBbid);
					}
					else if (relationship.targetBbid === entityBBID) {
						accumulator.push(relationship.sourceBbid);
					}
					return accumulator;
				}, [])
				// Ignore entities that already have a modified relationshipSet (dealed with above)
				.filter(bbid => !_.includes(_.keys(relationshipSets), bbid));

			await Promise.all(otherEntitiesToFetch.map(
				async (bbid) => {
					const otherEntity = await getEntityByBBID(orm, transacting, bbid);

					const otherEntityRelationshipSet = await entity.relationshipSet()
						.fetch({require: false, transacting, withRelated: 'relationships'});
					if (!otherEntityRelationshipSet) {
						return;
					}
					const otherEntityRelationships = otherEntityRelationshipSet.related('relationships').toJSON();

					let relsHaveChanged = false;
					// Mark relationships with entity being merged as removed
					otherEntityRelationships.forEach((rel) => {
						if (entityBBID === rel.sourceBbid || entityBBID === rel.targetBbid) {
							_.set(rel, 'isRemoved', true);
							relsHaveChanged = true;
						}
					});

					// If there's a difference, apply the new relationships array without rels to merged entity
					if (relsHaveChanged) {
						const updatedRelationshipSets = await orm.func.relationship.updateRelationshipSets(
							orm, transacting, otherEntityRelationshipSet, otherEntityRelationships
						);
						// Make sure the entity is later updated with its new relationshipSet id
						allEntitiesReturnArray = _.unionBy(allEntitiesReturnArray, [otherEntity], 'id');
						_.assign(relationshipSets, _.pick(updatedRelationshipSets, bbid));
					}
				}
			));
		}
	));

	/** Special cases per entity type*/

	/**
	 * For EditionGroup entities, each merged EG may have editions associated to it.
	 * We need to set each Edition's edition_group_bbid to the target entity BBID
	 */
	if (entityType === 'EditionGroup') {
		const editionsToSet = await Edition.query(
			qb => qb
				.whereIn('edition_group_bbid', entitiesToMergeBBIDs)
				.andWhere('master', true)
		)
			.fetchAll({require: false, transacting});
		if (editionsToSet.length) {
			editionsToSet.forEach(editionModel => editionModel.set({editionGroupBbid: currentEntityBBID}));
			// Add the modified Editions to the revision
			allEntitiesReturnArray = _.unionBy(allEntitiesReturnArray, editionsToSet.toArray(), 'id');
		}
	}

	/**
	 * For Publisher entities, each merged item may have editions associated to it.
	 * We need to set each Edition's publisher set to the target entity BBID
	 */
	if (entityType === 'Publisher') {
		try {
			const editionsToSetCollections = await Promise.all(entitiesModelsToMerge.map(entitiesModel => entitiesModel.editions()));
			// eslint-disable-next-line consistent-return
			let editionsToSet = _.flatMap(editionsToSetCollections, edition => {
				if (edition.models && edition.models.length) {
					return edition.models;
				}
			});
			// Remove 'undefined' entries (no editions in those publishers)
			editionsToSet = _.reject(editionsToSet, _.isNil);
			await Promise.all(editionsToSet.map(async (edition) => {
				// Fetch current PublisherSet
				const oldPublisherSet = await edition.publisherSet();
				// Create a new PublisherSet pointing to the main entity
				const newPublisherSet = await orm.func.publisher.updatePublisherSet(orm, transacting, oldPublisherSet, [{bbid: currentEntityBBID}]);
				// Set the new PublisherSet on the Edition
				edition.set('publisherSetId', newPublisherSet.get('id'));
				// Add the modified Edition to the revision (if it doesn't exist yet)
				allEntitiesReturnArray = _.unionBy(allEntitiesReturnArray, [edition], 'id');
			}));
		}
		catch (err) {
			log.error(err);
			throw err;
		}
	}

	/**
	 * Some actions we only want to take once the main entity has been saved
	*/
	mainEntity.once('saved', async (model) => {
		/**
		 * Set isMerge to true on the *entity*_revision models
		 * The *entity*_revision items  are created by a postgres trigger instead of server code,
		 * so we need to wait until the entity is saved on the database.
		 * We only want to set isMerge to true on the entities we're merging,
		 * not the other entities potentially affected by the merge -> .where(…
		 */
		const newEntityRevision = await model.revision()
			.fetch({transacting});

		await newEntityRevision
			.where('bbid', currentEntityBBID)
			.save({isMerge: true}, {patch: true, transacting});

		/* Also set dataID to null for slave entities to 'delete' them */
		await newEntityRevision
			.query(qb => qb.whereIn('bbid', entitiesToMergeBBIDs))
			.save({dataId: null, isMerge: true}, {patch: true, transacting});

		/** Clear the merge queue */
		session.mergeQueue = null;
		try {
			/* Remove merged entities from search results */
			await Promise.all(entitiesToMerge.map(search.deleteEntity));
		}
		catch (err) {
			log.debug(err);
		}
	});

	/** Update the redirection table to redirect merged entities' bbids
	 *  to currentEntityBBID (the entity we're merging into)
	*/
	await bookshelf.knex('bookbrainz.entity_redirect')
		.transacting(transacting)
		.insert(entitiesToMergeBBIDs.map(bbid => (
			// eslint-disable-next-line camelcase
			{source_bbid: bbid, target_bbid: currentEntityBBID})));

	return allEntitiesReturnArray;
}

type ProcessAuthorCreditBody = {
	authorCredit: Array<AuthorCreditRow>;
	creditSection: boolean;
};
type ProcessAuthorCreditResult = {authorCreditId: number};

async function processAuthorCredit(
	orm: any,
	currentEntity: Record<string, unknown> | null | undefined,
	newEntityBody: ProcessAuthorCreditBody,
	transacting: Transaction
): Promise<ProcessAuthorCreditResult> {
	const authorCreditEnabled = newEntityBody.creditSection !== false;
	if (!authorCreditEnabled) {
		return {
			authorCreditId: null
		};
	}

	const existingAuthorCreditID = _.get(currentEntity, ['authorCredit', 'id']);

	const oldAuthorCredit = await (
		existingAuthorCreditID &&
		orm.AuthorCredit.forge({id: existingAuthorCreditID})
			.fetch({transacting, withRelated: ['names']})
	);

	const names = _.get(newEntityBody, 'authorCredit') || [];
	const newAuthorCredit = await orm.func.authorCredit.updateAuthorCredit(
		orm, transacting, oldAuthorCredit,
		names.map((name) => ({
			authorBBID: name.authorBBID,
			joinPhrase: name.joinPhrase,
			name: name.name
		}))
	);

	return {
		authorCreditId: newAuthorCredit && newAuthorCredit.get('id')
	};
}


type ProcessEditionSetsBody = {
	languages: Array<Language>,
	publishers: Array<Publisher>,
	releaseEvents: Array<ReleaseEvent>
} & ProcessAuthorCreditBody;
type ProcessEditionSetsResult = {languageSetId: number[], publisherSetId: number[], releaseEventSetId: number[]} & ProcessAuthorCreditResult;

async function processEditionSets(
	orm: any,
	currentEntity: Record<string, unknown> | null | undefined,
	body: ProcessEditionSetsBody,
	transacting: Transaction
): Promise<ProcessEditionSetsResult> {
	const languageSetID = _.get(currentEntity, ['languageSet', 'id']);

	const oldLanguageSet = await (
		languageSetID &&
		orm.LanguageSet.forge({id: languageSetID})
			.fetch({transacting, withRelated: ['languages']})
	);

	const languages = _.get(body, 'languages') || [];

	const newLanguageSet = await orm.func.language.updateLanguageSet(
		orm, transacting, oldLanguageSet,
		languages.map((languageID) => ({id: languageID}))
	);
	const newLanguageSetID = newLanguageSet && newLanguageSet.get('id');

	const publisherSetID = _.get(currentEntity, ['publisherSet', 'id']);
	const oldPublisherSet = await (
		publisherSetID &&
		orm.PublisherSet.forge({id: publisherSetID})
			.fetch({transacting, withRelated: ['publishers']})
	);

	const publishers = _.get(body, 'publishers') || [];

	const newPublisherSet = await orm.func.publisher.updatePublisherSet(
		orm, transacting, oldPublisherSet,
		publishers.map((publisherBBID) => ({bbid: publisherBBID}))
	);
	const newPublisherSetID = newPublisherSet && newPublisherSet.get('id');
	const releaseEventSetID = _.get(currentEntity, ['releaseEventSet', 'id']);

	const oldReleaseEventSet = await (
		releaseEventSetID &&
		orm.ReleaseEventSet.forge({id: releaseEventSetID})
			.fetch({transacting, withRelated: ['releaseEvents']})
	);

	const releaseEvents = _.get(body, 'releaseEvents') || [];

	// if areaId is not present, set it to null.
	// otherwise it shows error while comparing old and new releaseEvent;

	if (releaseEvents[0]) {
		if (_.isNil(releaseEvents[0].areaId)) {
			releaseEvents[0].areaId = null;
		}
		if (releaseEvents[0].date === '') {
			releaseEvents[0].date = null;
		}
	}

	const newReleaseEventSet =
		await orm.func.releaseEvent.updateReleaseEventSet(
			orm, transacting, oldReleaseEventSet, releaseEvents
		);
	const newReleaseEventSetID = newReleaseEventSet && newReleaseEventSet.get('id');
	const newAuthorCredit = await processAuthorCredit(orm, currentEntity, body, transacting);
	const newAuthorCreditID = newAuthorCredit.authorCreditId;

	return {
		authorCreditId: newAuthorCreditID,
		languageSetId: newLanguageSetID,
		publisherSetId: newPublisherSetID,
		releaseEventSetId: newReleaseEventSetID
	};
}

type ProcessWorkSetsResult = {languageSetId: number[]};
async function processWorkSets(
	orm, currentEntity: Record<string, unknown> | null | undefined, body: {languages: Array<Language>},
	transacting: Transaction
): Promise<ProcessWorkSetsResult> {
	const id = _.get(currentEntity, ['languageSet', 'id']);

	const oldSet = await (
		id &&
		orm.LanguageSet.forge({id})
			.fetch({transacting, withRelated: ['languages']})
	);

	const languages = _.get(body, 'languages') || [];
	return commonUtils.makePromiseFromObject<ProcessWorkSetsResult>({
		languageSetId: orm.func.language.updateLanguageSet(
			orm, transacting, oldSet,
			languages.map((languageID) => ({id: languageID}))
		).then((set) => set && set.get('id'))
	});
}

async function processEntitySets(
	orm: ORM,
	currentEntity: Record<string, unknown> | null | undefined,
	entityType: EntityTypeString,
	body: any,
	transacting: Transaction
): Promise<ProcessEditionSetsResult | ProcessWorkSetsResult | ProcessAuthorCreditResult | null> {
	if (entityType === 'Edition') {
		const editionSets = await processEditionSets(orm, currentEntity, body, transacting);
		return editionSets;
	}

	if (entityType === 'EditionGroup') {
		const authorCredit = await processAuthorCredit(orm, currentEntity, body, transacting);
		return authorCredit;
	}

	if (entityType === 'Work') {
		const workSets = await processWorkSets(orm, currentEntity, body, transacting);
		return workSets;
	}

	return null;
}


async function getNextAliasSet(orm: ORM, transacting: Transaction, currentEntity, body) {
	const {AliasSet} = orm;

	const id = _.get(currentEntity, ['aliasSet', 'id']);

	const oldAliasSet = await (
		id &&
		new AliasSet({id}).fetch({require: false, transacting, withRelated: ['aliases']})
	);

	return orm.func.alias.updateAliasSet(
		orm, transacting, oldAliasSet,
		oldAliasSet && oldAliasSet.get('defaultAliasId'),
		body.aliases || []
	);
}

async function getNextIdentifierSet(orm: ORM, transacting: Transaction, currentEntity, body) {
	const {IdentifierSet} = orm;

	const id = _.get(currentEntity, ['identifierSet', 'id']);

	const oldIdentifierSet = await (
		id &&
		new IdentifierSet({id}).fetch({
			require: false,
			transacting, withRelated: ['identifiers']
		})
	);

	return orm.func.identifier.updateIdentifierSet(
		orm, transacting, oldIdentifierSet, body.identifiers || []
	);
}

export async function getNextRelationshipAttributeSets(orm: ORM, transacting: Transaction, body) {
	const {RelationshipAttributeSet} = orm;
	const relationships = await Promise.all(body.relationships.map(async (relationship) => {
		if (!relationship.isAdded) {
			relationship.attributeSetId = _.get(relationship, ['attributeSetId'], null);
			return relationship;
		}
		const id = relationship.attributeSetId;
		const oldRelationshipAttributeSet = await (
			id &&
			new RelationshipAttributeSet({id}).fetch({
				require: false,
				transacting, withRelated: ['relationshipAttributes.value']
			})
		);
		const attributeSet = await orm.func.relationshipAttributes.updateRelationshipAttributeSet(
			orm, transacting, oldRelationshipAttributeSet, relationship.attributes || []
		);
		const attributeSetId = attributeSet && attributeSet.get('id');
		relationship.attributeSetId = attributeSetId;
		delete relationship.attributes;
		return relationship;
	}));
	return relationships;
}

export async function getNextRelationshipSets(
	orm: ORM, transacting: Transaction, currentEntity, body
) {
	const {RelationshipSet} = orm;
	const relationships = await getNextRelationshipAttributeSets(orm, transacting, body);
	const id = _.get(currentEntity, ['relationshipSet', 'id']);

	const oldRelationshipSet = await (
		id &&
		new RelationshipSet({id}).fetch({
			require: false,
			transacting, withRelated: ['relationships']
		})
	);

	return orm.func.relationship.updateRelationshipSets(
		orm, transacting, oldRelationshipSet, relationships || []
	);
}

async function getNextAnnotation(
	orm: ORM, transacting: Transaction, currentEntity, body
) {
	const {Annotation} = orm;

	const id = _.get(currentEntity, ['annotation', 'id']);

	const oldAnnotation = await (
		id && new Annotation({id}).fetch({require: false, transacting})
	);

	return body.annotation ? orm.func.annotation.updateAnnotation(
		orm, transacting, oldAnnotation, body.annotation, null
	) : Promise.resolve(null);
}

async function getNextDisambiguation(
	orm: ORM, transacting: Transaction, currentEntity, body
) {
	const {Disambiguation} = orm;

	const id = _.get(currentEntity, ['disambiguation', 'id']);

	const oldDisambiguation = await (
		id && new Disambiguation({id}).fetch({require: false, transacting})
	);

	return orm.func.disambiguation.updateDisambiguation(
		orm, transacting, oldDisambiguation, body.disambiguation
	);
}

export async function getChangedProps(
	orm: ORM, transacting: Transaction, isNew: boolean, currentEntity, body, entityType: EntityTypeString,
	derivedProps
) {
	const aliasSetPromise =
		getNextAliasSet(orm, transacting, currentEntity, body);

	const identSetPromise =
		getNextIdentifierSet(orm, transacting, currentEntity, body);

	const annotationPromise = getNextAnnotation(
		orm, transacting, currentEntity, body
	);

	const disambiguationPromise =
		getNextDisambiguation(orm, transacting, currentEntity, body);

	const entitySetIdsPromise =
		processEntitySets(orm, currentEntity, entityType, body, transacting);

	const [
		aliasSet, identSet, annotation, disambiguation, entitySetIds
	] = await Promise.all([
		aliasSetPromise, identSetPromise, annotationPromise,
		disambiguationPromise, entitySetIdsPromise
	]);

	const propsToSet = {
		aliasSetId: aliasSet && aliasSet.get('id'),
		annotationId: annotation && annotation.get('id'),
		disambiguationId:
			disambiguation && disambiguation.get('id'),
		identifierSetId: identSet && identSet.get('id'),
		...derivedProps,
		...entitySetIds
	};

	if (isNew) {
		return propsToSet;
	}

	// Construct a set of differences between the new values and old
	return _.reduce(propsToSet, (result, value, key) => {
		if (!_.isEqual(value, currentEntity[key]) &&
			// If both items are null or undefined, consider them equal (null !=== undefined)
			!(_.isNil(value) && _.isNil(currentEntity[key]))
		) {
			result[key] = value;
		}

		return result;
	}, {});
}


export function fetchEntitiesForRelationships(
	orm: ORM, transacting: Transaction, currentEntity, relationshipSets
) {
	const bbidsToFetch = _.without(
		_.keys(relationshipSets), _.get(currentEntity, 'bbid')
	);

	return Promise.all(bbidsToFetch.map(
		(bbid) =>
			getEntityByBBID(orm, transacting, bbid)
	));
}

/**
 * @param  {any} orm -  The BookBrainz ORM
 * @param  {any} newEdition - The ORM model of the newly created Edition
 * @param  {any} transacting - The ORM transaction object
 * @description Edition Groups will be created automatically by the ORM if no EditionGroup BBID is set on a new Edition.
 * This method fetches and indexes (search) those potential new EditionGroups that may have been created automatically.
 */
export async function indexAutoCreatedEditionGroup(orm: ORM, newEdition, transacting: Transaction) {
	const {EditionGroup} = orm;
	const bbid = newEdition.get('editionGroupBbid');
	try {
		const editionGroup = await new EditionGroup({bbid})
			.fetch({
				require: true,
				transacting,
				withRelated: ['aliasSet.aliases']
			});
		await search.indexEntity(editionGroup);
	}
	catch (err) {
		log.error('Could not reindex edition group after edition creation:', err);
	}
}

function sanitizeBody(body:any) {
	for (const alias of body.aliases) {
		alias.name = commonUtils.sanitize(alias.name);
		alias.sortName = commonUtils.sanitize(alias.sortName);
	}
	body.disambiguation = commonUtils.sanitize(body.disambiguation);
	return body;
}

export async function processSingleEntity(
	formBody, JSONEntity, reqSession, entityType: EntityTypeString, orm: ORM,
	editorJSON, derivedProps, isMergeOperation: boolean, transacting: Transaction
): Promise<any> {
	const {Annotation, Entity, Revision} = orm;
	// Sanitize nameSection inputs
	const body = sanitizeBody(formBody);
	let currentEntity: {
		aliasSet: {id: number} | null | undefined,
		annotation: {id: number} | null | undefined,
		bbid: string,
		disambiguation: {id: number} | null | undefined,
		identifierSet: {id: number} | null | undefined,
		revision: {id: number} | null | undefined,
		type: EntityTypeString
	} | null | undefined = JSONEntity;

	// Determine if a new entity is being created
	const isNew = !currentEntity;
	if (isNew) {
		const newEntity = await new Entity({type: entityType})
			.save(null, {transacting});
		const newEntityBBID = newEntity.get('bbid');
		body.relationships = _.map(
			body.relationships,
			({sourceBbid, targetBbid, ...others}) => ({
				sourceBbid: sourceBbid || newEntityBBID,
				targetBbid: targetBbid || newEntityBBID,
				...others
			})
		);

		currentEntity = newEntity.toJSON();
	}

	// Approve entity if it is still a pending import
	const isImport = !currentEntity.revision;
	if (isImport) {
		await orm.func.imports.approveImport({editorId: editorJSON.id, importEntity: currentEntity, orm});
		// No need to reload `currentEntity` here, we will not use its `revision` property
	}

	// Then, edit the entity
	const relationshipSets = await getNextRelationshipSets(
		orm, transacting, currentEntity, body
	);
	const changedProps = await getChangedProps(
		orm, transacting, isNew, currentEntity, body, entityType, derivedProps
	);

	// If there are no differences, bail
	if (_.isEmpty(changedProps) && _.isEmpty(relationshipSets) && !isMergeOperation) {
		if (isImport) {
			// Do not error as the pending import has been approved by this action.
			// Load the approved entity, it still has to be reindexed.
			const Model = orm.func.entity.getEntityModelByType(orm, currentEntity.type);
			const mainEntity = await new Model({bbid: currentEntity.bbid})
				.fetch({transacting, withRelated: ['defaultAlias', 'aliasSet.aliases']});
			return mainEntity;
		}
		throw new error.FormSubmissionError('No Updated Field');
	}

	// There are differences, create a new revision
	const newRevision = await new Revision({
		authorId: editorJSON.id,
		isMerge: isMergeOperation
	}).save(null, {transacting});

	// Set revision of our new annotation if it has changed
	if (changedProps.annotationId) {
		await new Annotation({id: changedProps.annotationId})
			.save({lastRevisionId: newRevision.get('id')}, {method: 'update', transacting});
	}

	// Fetch or create main entity
	const mainEntity = await fetchOrCreateMainEntity(
		orm, transacting, isNew, currentEntity.bbid, entityType
	);

	// Fetch all entities that definitely exist
	const otherEntities = await fetchEntitiesForRelationships(
		orm, transacting, currentEntity, relationshipSets
	);
	otherEntities.forEach(entity => { entity.shouldInsert = false; });
	mainEntity.shouldInsert = isNew;

	_.forOwn(changedProps, (value, key) => mainEntity.set(key, value));

	// Don't try to modify 'deleted' entities (those with no dataId)
	let allEntities = [...otherEntities, mainEntity]
		.filter(entity => entity.get('dataId') !== null);

	if (isMergeOperation) {
		allEntities = await processMergeOperation(orm, transacting, reqSession,
			mainEntity, allEntities, relationshipSets);
	}

	_.forEach(allEntities, (entityModel) => {
		const bbid: string = entityModel.get('bbid');
		if (_.has(relationshipSets, bbid)) {
			entityModel.set(
				'relationshipSetId',
				// Set to relationshipSet id or null if empty set
				relationshipSets[bbid] && relationshipSets[bbid].get('id')
			);
		}
	});

	const savedMainEntity = await saveEntitiesAndFinishRevision(
		orm, transacting, isNew, newRevision, mainEntity, allEntities,
		editorJSON.id, body.note
	);

	/* We need to load the aliases for search reindexing and refresh it (otherwise 'type' is missing for new entities)*/
	await savedMainEntity.refresh({transacting, withRelated: ['aliasSet.aliases', 'defaultAlias.language',
		'relationshipSet.relationships.source', 'relationshipSet.relationships.target', 'relationshipSet.relationships.type', 'annotation']});

	if (isNew && savedMainEntity.get('type') === 'Edition') {
		/* fetch and reindex EditionGroups that may have been created automatically by the ORM and not indexed */
		await indexAutoCreatedEditionGroup(orm, savedMainEntity, transacting);
	}

	const entityRelationships = savedMainEntity.related('relationshipSet')?.related('relationships');
	if (savedMainEntity.get('type') === 'Work' && entityRelationships?.length) {
		const authorsOfWork = await Promise.all(entityRelationships.toJSON().filter(
			// "Author wrote Work" relationship
			(relation) => relation.typeId === 8
		).map(async (relationshipJSON) => {
			try {
				const {source} = relationshipJSON;
				const sourceEntity = await commonUtils.getEntity(
					orm, source.bbid, source.type, {require: false, transacting}
				);
				return sourceEntity.name;
			}
			catch (err) {
				log.error(err);
			}
			return null;
		}));
		// Attach a work's authors for search indexing
		savedMainEntity.set('authors', authorsOfWork.filter(Boolean));
	}
	return savedMainEntity;
}

export async function handleCreateOrEditEntity(
	req: PassportRequest,
	res: $Response,
	next: NextFunction,
	entityType: EntityTypeString,
	derivedProps: Record<string, unknown>,
	isMergeOperation: boolean
) {
	const {orm}: {orm?: ORM} = req.app.locals;
	const editorJSON = req.user;
	const {bookshelf} = orm;

	try {
		const savedEntityModel = await bookshelf.transaction((transacting) =>
			processSingleEntity(req.body, res.locals.entity, req.session, entityType, orm, editorJSON, derivedProps, isMergeOperation, transacting));
		const entityJSON = savedEntityModel.toJSON();

		await processAchievement(orm, editorJSON.id, entityJSON);

		await search.indexEntity(savedEntityModel);

		return res.status(200).send(entityJSON);
	}
	catch (err) {
		return next(err);
	}
}

type AliasEditorT = {
	language: number | null | undefined,
	name: string,
	primary: boolean,
	sortName: string
};

type NameSectionT = {
	disambiguation: string,
	language: number | null | undefined,
	name: string,
	sortName: string,
	id: string
};

export function constructAliases(
	aliasEditor: {[propName: string]: AliasEditorT}, nameSection: NameSectionT
) {
	const aliases = _.map(
		aliasEditor,
		(
			{language: languageId, name, primary, sortName}: AliasEditorT,
			id
		) => ({
			default: false,
			id,
			languageId,
			name,
			primary,
			sortName
		})
	);

	return [{
		default: true,
		id: nameSection.id,
		languageId: nameSection.language,
		name: nameSection.name,
		primary: true,
		sortName: nameSection.sortName
	}, ...aliases];
}

type IdentifierEditorT = {
	type: number,
	value: string
};

export function constructIdentifiers(
	identifierEditor: {[propName: string]: IdentifierEditorT}
) {
	return _.map(
		identifierEditor,
		({type: typeId, value}: IdentifierEditorT, id: string) =>
			({id, typeId, value})
	);
}

export function constructRelationships(parentSection, childAttributeName = 'relationships') {
	return _.map(
		parentSection[childAttributeName],
		({attributeSetId, rowID, relationshipType, sourceEntity, targetEntity, attributes, isRemoved, isAdded}) => ({
			attributeSetId,
			attributes,
			id: rowID,
			isAdded,
			isRemoved,
			sourceBbid: _.get(sourceEntity, 'bbid'),
			targetBbid: _.get(targetEntity, 'bbid'),
			typeId: relationshipType.id
		})
	);
}

/**
 * Returns the index of the default alias if defined in the aliasSet.
 * If there is no defaultAliasId, return the first alias where default = true.
 * Returns null if there are no aliases in the set.
 * @param {Object} aliasSet - The entity's aliasSet returned by the ORM
 * @param {Object[]} aliasSet.aliases - The array of aliases contained in the set
 * @param {string} aliasSet.defaultAliasId - The id of the set's default alias
 * @returns {?number} The index of the default alias, or 0; returns null if 0 aliases in set
 */
export function getDefaultAliasIndex(aliasSet) {
	if (_.isNil(aliasSet)) {
		return null;
	}
	const {aliases, defaultAliasId} = aliasSet;
	if (!aliases || !aliases.length) {
		return null;
	}
	let index;
	if (!_.isNil(defaultAliasId) && isFinite(defaultAliasId)) {
		let defaultAliasIdNumber = defaultAliasId;
		if (_.isString(defaultAliasId)) {
			defaultAliasIdNumber = Number(defaultAliasId);
		}
		index = aliases.findIndex((alias) => alias.id === defaultAliasIdNumber);
	}
	else {
		index = aliases.findIndex((alias) => alias.default);
	}
	return index > 0 ? index : 0;
}

export function areaToOption(
	area: {comment: string, id: number, name: string}
) {
	if (!area) {
		return null;
	}
	const {id} = area;
	return {
		disambiguation: area.comment,
		id,
		text: area.name,
		type: 'area'
	};
}

export function compareEntitiesByDate(a, b) {
	const aDate = _.get(a, 'releaseEventSet.releaseEvents[0].date', null);
	const bDate = _.get(b, 'releaseEventSet.releaseEvents[0].date', null);
	if (_.isNull(aDate)) {
		/*
		 * return a positive value,
		 * so that non-null dates always come before null dates.
		 */
		return 1;
	}

	if (_.isNull(bDate)) {
		/*
		 * return a negative value,
		 * so that non-null dates always come before null dates.
		 */
		return -1;
	}

	return new Date(aDate).getTime() - new Date(bDate).getTime();
}

type AuthorT = {
	value: string,
	id: number
};

export type AuthorCreditEditorT = {
	author: AuthorT,
	joinPhrase: string,
	name: string
};

export function constructAuthorCredit(
	authorCreditEditor: Record<string, AuthorCreditEditorT>
) {
	return _.map(
		authorCreditEditor,
		({author, joinPhrase, name}: AuthorCreditEditorT) =>
			({authorBBID: author.id, joinPhrase, name})
	);
}
export function displayPreview(req: PassportRequest, res: $Response, next: NextFunction) {
	const baseUrl = `${req.protocol}://${req.get('host')}`;
	const originalUrl = `${baseUrl}${req.originalUrl}`;
	const sourceUrl = req.headers.origin !== 'null' ? req.headers.origin : '<Unknown Source>';
	if (sourceUrl === baseUrl) {
		return next();
	}
	const finalProps = {baseUrl, formBody: req.body, originalUrl, sourceUrl};
	const props = generateProps(req, res, {
		alert: [],
		...finalProps

	});
	const markup = ReactDOMServer.renderToString(
		<Layout {...propHelpers.extractLayoutProps(props)}>
			<PreviewPage {...propHelpers.extractPreviewProps(props)}/>
		</Layout>
	);
	return res.send(target({
		markup,
		props: JSON.stringify(props),
		script: '/js/preview.js',
		title: 'Preview'
	}));
}

