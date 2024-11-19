/*
 * Copyright (C) 2017  Eshan Singh
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


import * as Immutable from 'immutable';
import * as React from 'react';
import * as UnifiedFormHelpers from '../../client/unified-form/helpers';
import * as entityEditorHelpers from '../../client/entity-editor/helpers';
import * as entityRoutes from '../routes/entity/entity';
import * as error from '../../common/helpers/error';
import * as propHelpers from '../../client/helpers/props';
import * as unifiedRoutes from '../routes/entity/process-unified-form';
import * as utils from './utils';

import type {Request as $Request, Response as $Response, NextFunction} from 'express';
import {filterIdentifierTypesByEntityType, isValidBBID} from '../../common/helpers/utils';
import EntityEditor from '../../client/entity-editor/entity-editor';
import EntityMerge from '../../client/entity-editor/entity-merge';
import Layout from '../../client/containers/layout';
import {Provider} from 'react-redux';
import ReactDOMServer from 'react-dom/server';
import UnifiedForm from '../../client/unified-form/unified-form';
import _ from 'lodash';
import {createStore} from 'redux';
import {generateProps} from './props';


const {createRootReducer: ufCreateRootReducer} = UnifiedFormHelpers;
const {createRootReducer, getEntitySection, getEntitySectionMerge, getValidator} = entityEditorHelpers;
const validEntityTypes = ['author', 'edition', 'editionGroup', 'publisher', 'series', 'work'];
type EntityAction = 'create' | 'edit';
type PassportRequest = $Request & {user: any, session: any};

/**
 * Callback to get the initial state
 * @callback initialStateCallback
 * @param {object} entity - entity
 */

/**
 * Returns a props object with reasonable defaults for entity creation/editing.
 * @param {string} entityType - entity type
 * @param {request} req - request object
 * @param {response} res - response object
 * @param {object} additionalProps - additional props
 * @param {initialStateCallback} initialStateCallback - callback
 * to get the initial state
 * @returns {object} - props
 */
export function generateEntityProps(
	entityType: string,
	req: PassportRequest, res: $Response,
	additionalProps: any,
	initialStateCallback: (entity: any) => any = () => new Object()
): any {
	const entityName = _.upperFirst(entityType);
	const {entity} = res.locals;
	const isEdit = Boolean(entity);

	const getFilteredIdentifierTypes = isEdit ?
		_.partialRight(utils.filterIdentifierTypesByEntity, entity) :
		_.partialRight(filterIdentifierTypesByEntityType, entityName);
	const filteredIdentifierTypes = getFilteredIdentifierTypes(
		res.locals.identifierTypes
	);
	const entityNameForRoute = _.kebabCase(entityType);
	const submissionUrl = isEdit ?
		`/${entityNameForRoute}/${entity.bbid}/edit/handler` :
		`/${entityNameForRoute}/create/handler`;

	const action: EntityAction = isEdit ? 'edit' : 'create';

	const props = Object.assign({
		action,
		entityType,
		heading: isEdit ?
			`Edit ${entity.defaultAlias ? entity.defaultAlias.name : '(unnamed)'} (${entityName})` :
			`Add ${entityName}`,
		identifierTypes: filteredIdentifierTypes,
		initialState: initialStateCallback(entity),
		isMerge: false,
		languageOptions: res.locals.languages,
		requiresJS: true,
		subheading: isEdit ?
			`Edit an existing ${entityName} on BookBrainz` :
			`Add a new ${entityName} to BookBrainz`,
		submissionUrl
	}, additionalProps);

	return generateProps(req, res, props);
}

/**
 * Callback to get the initial state
 * @callback initialStateCallback
 * @param {object} entity - entity
 */

/**
 * Returns a props object with reasonable defaults for entity creation/editing.
 * @param {request} req - request object
 * @param {response} res - response object
 * @param {object} additionalProps - additional props
 * @param {initialStateCallback} initialStateCallback - callback
 * to get the initial state
 * @returns {object} - props
 */
export function generateEntityMergeProps(
	req: PassportRequest, res: $Response,
	additionalProps: any,
	initialStateCallback: (entity: any) => any = () => new Object()
): any {
	const {entityType, mergingEntities} = additionalProps;
	const entityName = _.startCase(entityType);
	const entity = mergingEntities[0];

	const getFilteredIdentifierTypes = _.partialRight(utils.filterIdentifierTypesByEntity, entity);
	const filteredIdentifierTypes = getFilteredIdentifierTypes(
		res.locals.identifierTypes
	);

	const submissionUrl = `/${_.kebabCase(entityType)}/${entity.bbid}/merge/handler`;

	const props = Object.assign({
		entityType,
		heading: `Merge ${mergingEntities.length} ${entityName}s`,
		identifierTypes: filteredIdentifierTypes,
		initialState: initialStateCallback(mergingEntities),
		isMerge: true,
		languageOptions: res.locals.languages,
		requiresJS: true,
		subheading: `You are merging ${mergingEntities.length} existing ${entityName}s:`,
		submissionUrl
	}, additionalProps);

	return generateProps(req, res, props);
}

/**
 * Return markup for the entity editor.
 * This also modifies the props value with a new initialState!
 * @param {object} props - react props
 * @returns {object} - Updated props and HTML string with markup
 */
export function entityEditorMarkup(
	props: { initialState: any,
			 entityType: string,
			 heading?: string }
) {
	const {initialState, ...rest} = props;
	const rootReducer = createRootReducer(props.entityType);
	const store: any = createStore(rootReducer, Immutable.fromJS(initialState));
	const EntitySection = getEntitySection(props.entityType);
	const markup = ReactDOMServer.renderToString(
		<Layout {...propHelpers.extractLayoutProps(rest)}>
			<Provider store={store}>
				<EntityEditor
					validate={getValidator(props.entityType)}
					{...propHelpers.extractChildProps(rest)}
				>
					<EntitySection/>
				</EntityEditor>
			</Provider>
		</Layout>
	);

	return {
		markup,
		props: Object.assign({}, props, {
			intitialState: store.getState()
		})
	};
}

/**
 * Return markup for the entity merging tool.
 * This also modifies the props value with a new initialState!
 * @param {object} props - react props
 * @returns {object} - Updated props and HTML string with markup
 */
export function entityMergeMarkup(
	props: { initialState: any,
			 entityType: string }
) {
	const {initialState, ...rest} = props;
	const rootReducer = createRootReducer(props.entityType, true);
	const store: any = createStore(rootReducer, Immutable.fromJS(initialState));
	const EntitySection = getEntitySectionMerge(props.entityType);
	const markup = ReactDOMServer.renderToString(
		<Layout {...propHelpers.extractLayoutProps(rest)}>
			<Provider store={store}>
				<EntityMerge
					validate={getValidator(props.entityType)}
					{...propHelpers.extractChildProps(rest)}
				>
					<EntitySection/>
				</EntityMerge>
			</Provider>
		</Layout>
	);

	return {
		markup,
		props: Object.assign({}, props, {
			intitialState: store.getState()
		})
	};
}


/**
 * Callback for any transformations to the request body
 * @callback transformCallback
 * @param {object} body - request body
 */

/**
 * Handler for create or edit actions
 * @callback transformCallback
 * @param {object} req - request object
 * @param {object} res - response object
 */

/**
 * Makes a middleware handler for create or edit actions on entities.
 * @param {string} entityType - entity type
 * @param {transformCallback} transformNewForm - callback for transformations
 * @param {(string|string[])} propertiesToPick - props from transformed
 * request body to pick.
 * @param {boolean} isMergeHandler - Wether the submission was from a /merge/handler route
 * @returns {createOrEditHandler} createOrEditHandler - middleware handler
 */
export function makeEntityCreateOrEditHandler(
	entityType: string,
	transformNewForm: (data: Record<string, unknown>) => Record<string, unknown>,
	propertiesToPick: string | string[],
	isMergeHandler = false
) {
	const entityName = _.upperFirst(entityType);
	const validate = getValidator(entityType);

	return function createOrEditHandler(
		req: PassportRequest,
		res: $Response,
		next: NextFunction,
	) {
		const {mergeQueue} = req.session;
		const isMergeOperation = isMergeHandler && mergeQueue && _.size(mergeQueue.mergingEntities) >= 2;
		if (!validate(req.body, null, isMergeOperation)) {
			const err = new error.FormSubmissionError();
			error.sendErrorAsJSON(res, err);
		}

		req.body = transformNewForm(req.body);

		return entityRoutes.handleCreateOrEditEntity(
			req, res, next, entityName, _.pick(req.body, propertiesToPick), isMergeOperation
		);
	};
}

/**
 * add an initial relationship to entity from another enitty
 * when one entity created from other.
 * @param {object} props - props related to new entity
 * @param {number} relationshipTypeId - relationshipId number for initaial relationship
 * @param {object} targetEntity - details about target entitiy like edition group, publisher and author
 * @param {number} relationshipIndex - initial relationship index number
 */

export function addInitialRelationship(props, relationshipTypeId, relationshipIndex, targetEntity) {
	// Prepend 'i' here to indicate initail relationship row identifier
	const rowId = `i${relationshipIndex || 0}`;
	const relationship = props.relationshipTypes.find(
		relationshipType => relationshipType.id === relationshipTypeId
	);
	const targetEntityDetail = {
		bbid: targetEntity.id,
		defaultAlias: {name: targetEntity.text},
		type: targetEntity.type
	};

	const sourceEntityDetail = {
		defaultAlias: {name: ''},
		type: _.upperFirst(props.entityType)
	};

	const initialRelationship = {
		attributes: [],
		isAdded: true,
		label: relationship.linkPhrase,
		relationshipType: relationship,
		rowID: rowId,
		sourceEntity: targetEntity.type === 'EditionGroup' || targetEntity.type === 'Work' ? sourceEntityDetail : targetEntityDetail,
		targetEntity: targetEntity.type === 'EditionGroup' || targetEntity.type === 'Work' ? targetEntityDetail : sourceEntityDetail
	};

	if (!props.initialState.relationshipSection) {
		props.initialState.relationshipSection = {};
		props.initialState.relationshipSection.canEdit = true;
		props.initialState.relationshipSection.lastRelationships = null;
		props.initialState.relationshipSection.relationshipEditorProps = null;
		props.initialState.relationshipSection.relationshipEditorVisible = false;
	}
	props.initialState.relationshipSection.relationships =
		{...props.initialState.relationshipSection.relationships, [rowId]: initialRelationship};

	return props;
}

/**
 * Return markup for the unified form.
 * This also modifies the props value with a new initialState!
 * @param {object} props - react props
 * @returns {object} - Updated props and HTML string with markup
 */

export function unifiedFormMarkup(props) {
	const {initialState, ...rest} = props;
	const rootReducer = ufCreateRootReducer();
	const store:any = createStore(rootReducer, Immutable.fromJS(initialState));
	const markup = ReactDOMServer.renderToString(
		<Layout {...propHelpers.extractLayoutProps(rest)}>
			<Provider store={store}>
				<UnifiedForm {...props}/>
			</Provider>
		</Layout>
	);
	return {
		markup,
		props: Object.assign({}, props, {initialState: store.getState()})
	};
}

/**
 * Returns a props object with reasonable defaults for unified form.
 * @param {request} req - request object
 * @param {response} res - response object
 * @param {object} additionalProps - additional props
 * @param {initialStateCallback} initialStateCallback - callback
 * to get the initial state
 * @returns {object} - props
 */
export function generateUnifiedProps(
	req: PassportRequest, res: $Response,
	additionalProps: any,
	initialStateCallback: () => any = () => new Object()
): any {
	const submissionUrl = '/create/handler';
	const props = Object.assign({
		allIdentifierTypes: res.locals.identifierTypes,
		entityType: 'edition',
		initialState: initialStateCallback(),
		isUnifiedForm: true,
		languageOptions: res.locals.languages,
		requiresJS: true,
		submissionUrl
	}, additionalProps);

	return generateProps(req, res, props);
}

/**
 * Validate Unified form
 * @param {object} body - request body
 * @returns {boolean}
 */

function validateUnifiedForm(body:Record<string, any>):boolean {
	for (const entityKey in body) {
		if (Object.prototype.hasOwnProperty.call(body, entityKey)) {
			const entityForm = body[entityKey];
			const entityType = _.camelCase(entityForm.type);
			const isNew = _.get(entityForm, '__isNew__', true);
			const bbid = _.get(entityForm, 'id', null);
			// for existing entity, it must have id attribute set to its bbid
			if (!isNew && (!bbid || !isValidBBID(bbid))) {
				return false;
			}
			if (!entityType || !validEntityTypes.includes(entityType)) {
				return false;
			}
			const validator = getValidator(entityType);
			if (isNew && !validator(entityForm)) {
				return false;
			}
		}
	}
	return true;
}

/**
 * Middleware for handling unified form submission
 * @param {object} req - Request object
 * @param {object} res - Response object
 */

export async function createEntitiesHandler(
	req:$Request,
	res:$Response
) {
	const {orm} = req.app.locals;
	// generate the state for current entity
	 req.body = await unifiedRoutes.preprocessForm(req.body, orm);
	// validating the uf state
	if (!validateUnifiedForm(req.body)) {
		const err = new error.FormSubmissionError();
		return error.sendErrorAsJSON(res, err);
	}
	// transforming uf state into separate entity state
	req.body = unifiedRoutes.transformForm(req.body);
	return unifiedRoutes.handleCreateMultipleEntities(req as PassportRequest, res);
}
