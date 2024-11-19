/*
 * Copyright (C) 2021  Akash Gupta
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


import * as auth from '../../helpers/auth';
import * as entityRoutes from './entity';
import * as importRoutes from '../import-entity/import-routes';
import * as middleware from '../../helpers/middleware';
import * as search from '../../../common/helpers/search';
import * as utils from '../../helpers/utils';

import {
	entityEditorMarkup,
	generateEntityProps,
	makeEntityCreateOrEditHandler
} from '../../helpers/entityRouteUtils';

import {ConflictError} from '../../../common/helpers/error';
import {PrivilegeType} from '../../../common/helpers/privileges-utils';
import _ from 'lodash';
import {escapeProps} from '../../helpers/props';
import express from 'express';
import log from 'log';
import target from '../../templates/target';

/** ****************************
*********** Helpers ************
*******************************/

type OptionalSectionsT = {
	annotationSection?: any
};

const additionalSeriesProps = [
	'entityType', 'orderingTypeId'
];

export function transformNewForm(data) {
	const aliases = entityRoutes.constructAliases(
		data.aliasEditor, data.nameSection
	);

	const identifiers = entityRoutes.constructIdentifiers(
		data.identifierEditor
	);
	const seriesItems = entityRoutes.constructRelationships(
		data.seriesSection, 'seriesItems'
	);
	const relationshipsItems = entityRoutes.constructRelationships(
		data.relationshipSection, 'relationships'
	);
	const relationships = seriesItems.concat(relationshipsItems);

	return {
		aliases,
		annotation: data.annotationSection.content,
		disambiguation: data.nameSection.disambiguation,
		entityType: data.seriesSection.seriesType,
		identifiers,
		note: data.submissionSection.note,
		orderingTypeId: data.seriesSection.orderType,
		relationships
	};
}

const createOrEditHandler = makeEntityCreateOrEditHandler(
	'series', transformNewForm, additionalSeriesProps
);

const mergeHandler = makeEntityCreateOrEditHandler(
	'series', transformNewForm, additionalSeriesProps, true
);

const {ENTITY_EDITOR} = PrivilegeType;

/** ****************************
*********** Routes ************
*******************************/

const router = express.Router();

// Creation
router.get(
	'/create', auth.isAuthenticated, auth.isAuthorized(ENTITY_EDITOR), middleware.loadIdentifierTypes,
	middleware.loadLanguages,
	middleware.loadRelationshipTypes, middleware.loadSeriesOrderingTypes,
	async (req, res) => {
		const {markup, props} = entityEditorMarkup(generateEntityProps(
			'series', req, res, {}
		));

		const nameSection = {
			disambiguation: '',
			exactMatches: null,
			language: null,
			name: req.query?.name ?? '',
			searchResults: null,
			sortName: ''
		};
		if (nameSection.name) {
			try {
				nameSection.searchResults = await search.autocomplete(req.app.locals.orm, nameSection.name, 'Series');
				nameSection.exactMatches = await search.checkIfExists(req.app.locals.orm, nameSection.name, 'Series');
			}
			catch (err) {
				log.debug(err);
			}
		}

		props.initialState.nameSection = nameSection;

		return res.send(target({
			markup,
			props: escapeProps(props),
			script: '/js/entity-editor.js',
			title: props.heading
		}));
	}
);

router.post(
	'/create', entityRoutes.displayPreview, auth.isAuthenticatedForHandler, auth.isAuthorized(ENTITY_EDITOR), middleware.loadIdentifierTypes,
	middleware.loadLanguages,
	middleware.loadRelationshipTypes, middleware.loadSeriesOrderingTypes, async (req, res) => {
		const entity = await utils.parseInitialState(req, 'series');
		if (entity.seriesSection) {
			const orderingTypes = ['Automatic', 'Manual'];
			const seriesTypes = ['Author', 'Work', 'EditionGroup', 'Edition', 'Publisher'];
			if (entity.seriesSection.orderType) {
				if (!orderingTypes.includes(entity.seriesSection.orderType)) {
					delete entity.seriesSection.orderType;
				}
				else {
					entity.seriesSection.orderType = orderingTypes.indexOf(entity.seriesSection.orderType) + 1;
				}
			}
			if (entity.seriesSection.seriesType && !seriesTypes.includes(entity.seriesSection.seriesType)) {
				delete entity.seriesSection.seriesType;
			}
		}
		if (_.isEmpty(entity.seriesSection)) {
			delete entity.seriesSection;
		}
		else {
			entity.seriesSection.seriesItems = {};
		}
		const {markup, props} = entityEditorMarkup(generateEntityProps(
			'series', req, res, {}, () => entity
		));

		return res.send(target({
			markup,
			props: escapeProps(props),
			script: '/js/entity-editor.js',
			title: props.heading
		}));
	}
);

router.post('/create/handler', auth.isAuthenticatedForHandler, auth.isAuthorized(ENTITY_EDITOR),
	createOrEditHandler);

router.post('/:bbid/merge/handler', auth.isAuthenticatedForHandler, auth.isAuthorized(ENTITY_EDITOR),
	mergeHandler);

/* If the route specifies a BBID, make sure it does not redirect to another bbid then load the corresponding entity */
router.param(
	'bbid',
	middleware.redirectedBbid
);
router.param(
	'bbid',
	middleware.makeEntityLoader(
		'Series',
		[
			'defaultAlias',
			'disambiguation',
			'seriesOrderingType',
			'identifierSet.identifiers.type'
		],
		'Series not found'
	)
);

function _setSeriesTitle(res) {
	res.locals.title = utils.createEntityPageTitle(
		res.locals.entity,
		'Series',
		utils.template`Series “${'name'}”`
	);
}

router.get('/:bbid', middleware.loadEntityRelationships, middleware.loadSeriesItems, middleware.loadGenders,
	middleware.loadWikipediaExtract, (req, res) => {
		_setSeriesTitle(res);
		entityRoutes.displayEntity(req, res);
	});

router.get('/:bbid/delete', auth.isAuthenticated, auth.isAuthorized(ENTITY_EDITOR), (req, res, next) => {
	if (!res.locals.entity.dataId) {
		return next(new ConflictError('This entity has already been deleted'));
	}
	_setSeriesTitle(res);
	return entityRoutes.displayDeleteEntity(req, res);
});

router.post(
	'/:bbid/delete/handler', auth.isAuthenticatedForHandler, auth.isAuthorized(ENTITY_EDITOR),
	(req, res) => {
		const {orm} = req.app.locals;
		const {SeriesHeader, SeriesRevision} = orm;
		return entityRoutes.handleDelete(
			orm, req, res, SeriesHeader, SeriesRevision
		);
	}
);

router.get('/:bbid/revisions', (req, res, next) => {
	const {SeriesRevision} = req.app.locals.orm;
	_setSeriesTitle(res);
	entityRoutes.displayRevisions(req, res, next, SeriesRevision);
});

router.get('/:bbid/revisions/revisions', (req, res, next) => {
	const {SeriesRevision} = req.app.locals.orm;
	_setSeriesTitle(res);
	entityRoutes.updateDisplayedRevisions(req, res, next, SeriesRevision);
});

export function seriesToFormState(series) {
	const aliases = series.aliasSet ?
		series.aliasSet.aliases.map(({languageId, ...rest}) => ({
			...rest,
			language: languageId
		})) : [];

	const defaultAliasIndex = entityRoutes.getDefaultAliasIndex(series.aliasSet);
	const defaultAliasList = aliases.splice(defaultAliasIndex, 1);

	const aliasEditor = {};
	aliases.forEach((alias) => { aliasEditor[alias.id] = alias; });

	const buttonBar = {
		aliasEditorVisible: false,
		identifierEditorVisible: false
	};

	const nameSection = _.isEmpty(defaultAliasList) ? {
		language: null,
		name: '',
		sortName: ''
	} : defaultAliasList[0];
	nameSection.disambiguation =
		series.disambiguation && series.disambiguation.comment;

	const identifiers = series.identifierSet ?
		series.identifierSet.identifiers.map(({type, ...rest}) => ({
			type: type.id,
			...rest
		})) : [];

	const identifierEditor = {};
	identifiers.forEach(
		(identifier) => { identifierEditor[identifier.id] = identifier; }
	);
	const seriesSection = {
		orderType: series.seriesOrderingType && series.seriesOrderingType.id,
		seriesItems: {},
		seriesType: series.entityType
	};

	const relationshipSection = {
		canEdit: true,
		lastRelationships: null,
		relationshipEditorProps: null,
		relationshipEditorVisible: false,
		relationships: {}
	};

	series.relationships.forEach((relationship) => {
		const formattedRelationship = {
			attributeSetId: relationship.attributeSetId,
			attributes: relationship.attributeSet ? relationship.attributeSet.relationshipAttributes : [],
			relationshipType: relationship.type,
			rowID: `n${relationship.id}`,
			sourceEntity: relationship.source,
			targetEntity: relationship.target
		};
		// separate series items from relationships
		if (relationship.typeId > 69 && relationship.typeId < 75) {
			seriesSection.seriesItems[`n${relationship.id}`] = formattedRelationship;
		}
		else {
			relationshipSection.relationships[`n${relationship.id}`] = formattedRelationship;
		}
	});

	const optionalSections: OptionalSectionsT = {};
	if (series.annotation) {
		optionalSections.annotationSection = series.annotation;
	}

	return {
		aliasEditor,
		buttonBar,
		identifierEditor,
		nameSection,
		relationshipSection,
		seriesSection,
		...optionalSections
	};
}

router.get(
	'/:bbid/edit', auth.isAuthenticated, auth.isAuthorized(ENTITY_EDITOR), middleware.loadIdentifierTypes,
	middleware.loadSeriesOrderingTypes, middleware.loadLanguages,
	 middleware.loadEntityRelationships, middleware.loadRelationshipTypes,
	(req, res) => {
		const {markup, props} = entityEditorMarkup(generateEntityProps(
			'series', req, res, {}, seriesToFormState
		));

		return res.send(target({
			markup,
			props: escapeProps(props),
			script: '/js/entity-editor.js',
			title: props.heading
		}));
	}
);

router.post('/:bbid/edit/handler', auth.isAuthenticatedForHandler, auth.isAuthorized(ENTITY_EDITOR),
	createOrEditHandler);

/** Special routes for pending entity imports */

router.get(
	'/:bbid/approve',
	auth.isAuthenticatedForHandler,
	importRoutes.approveImportEntity
);

router.get('/:bbid/discard', auth.isAuthenticated, (req, res, next) => {
	_setSeriesTitle(res);
	importRoutes.displayDiscardImportEntity(req, res, next);
});

router.post(
	'/:bbid/discard/handler',
	auth.isAuthenticatedForHandler,
	importRoutes.handleDiscardImportEntity
);

export default router;
