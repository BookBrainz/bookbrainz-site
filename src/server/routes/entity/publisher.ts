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

const additionalPublisherProps = [
	'typeId', 'areaId', 'beginDate', 'endDate', 'ended'
];

export function transformNewForm(data) {
	const aliases = entityRoutes.constructAliases(
		data.aliasEditor, data.nameSection
	);

	const identifiers = entityRoutes.constructIdentifiers(
		data.identifierEditor
	);

	const relationships = entityRoutes.constructRelationships(
		data.relationshipSection
	);
	return {
		aliases,
		annotation: data.annotationSection.content,
		areaId: data.publisherSection.area && data.publisherSection.area.id,
		beginDate: data.publisherSection.beginDate,
		disambiguation: data.nameSection.disambiguation,
		endDate: data.publisherSection.endDate ?
			data.publisherSection.endDate : null,
		ended: data.publisherSection.ended,
		identifiers,
		note: data.submissionSection.note,
		relationships,
		typeId: data.publisherSection.type
	};
}

const createOrEditHandler = makeEntityCreateOrEditHandler(
	'publisher', transformNewForm, additionalPublisherProps
);

const mergeHandler = makeEntityCreateOrEditHandler(
	'publisher', transformNewForm, additionalPublisherProps, true
);

const {ENTITY_EDITOR} = PrivilegeType;

/** ****************************
*********** Routes *************
*******************************/

const router = express.Router();

// Creation

router.get(
	'/create', auth.isAuthenticated, auth.isAuthorized(ENTITY_EDITOR), middleware.loadIdentifierTypes,
	middleware.loadLanguages, middleware.loadPublisherTypes,
	middleware.loadRelationshipTypes,
	async (req, res) => {
		const markupProps = generateEntityProps(
			'publisher', req, res, {}
		);
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
				nameSection.searchResults = await search.autocomplete(req.app.locals.orm, nameSection.name, 'Publisher');
				nameSection.exactMatches = await search.checkIfExists(req.app.locals.orm, nameSection.name, 'Publisher');
			}
			catch (err) {
				log.debug(err);
			}
		}

		markupProps.initialState.nameSection = nameSection;
		const {markup, props} = entityEditorMarkup(markupProps);

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
	middleware.loadLanguages, middleware.loadPublisherTypes,
	middleware.loadRelationshipTypes,
	async (req, res) => {
		const {orm} = req.app.locals;
		const {PublisherType} = orm;
		const entity = await utils.parseInitialState(req, 'publisher');
		if (entity.publisherSection) {
			if (entity.publisherSection.type) {
				entity.publisherSection.type = await utils.getIdByField(PublisherType, 'label', entity.publisherSection.type);
			}
			if (entity.publisherSection.endDate) {
				entity.publisherSection.ended = true;
			}
			if (entity.publisherSection.area) {
				entity.publisherSection.area = await utils.searchOption(orm, 'area', entity.publisherSection.area);
			}
		}
		const markupProps = generateEntityProps(
			'publisher', req, res, {}, () => entity
		);
		const {markup, props} = entityEditorMarkup(markupProps);

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


/* If the route specifies a BBID, make sure it does not redirect to another bbid then load the corresponding entity */
router.param(
	'bbid',
	middleware.redirectedBbid
);
router.param(
	'bbid',
	middleware.makeEntityLoader(
		'Publisher',
		['publisherType', 'area'],
		'Publisher not found'
	)
);

function _setPublisherTitle(res) {
	res.locals.title = utils.createEntityPageTitle(
		res.locals.entity,
		'Publisher',
		utils.template`Publisher “${'name'}”`
	);
}


router.get('/:bbid', middleware.loadEntityRelationships, middleware.loadWikipediaExtract, (req, res, next) => {
	// Fetch editions
	const {Publisher} = req.app.locals.orm;
	const editionRelationsToFetch = [
		'defaultAlias',
		'disambiguation',
		'releaseEventSet.releaseEvents',
		'identifierSet.identifiers.type',
		'editionFormat',
		'authorCredit.names'
	];
	const editionsPromise =
		Publisher.forge({bbid: res.locals.entity.bbid})
			.editions({withRelated: editionRelationsToFetch});

	return editionsPromise
		.then((editions) => {
			res.locals.entity.editions = editions.toJSON();
			_setPublisherTitle(res);
			res.locals.entity.editions.sort(entityRoutes.compareEntitiesByDate);
			return entityRoutes.displayEntity(req, res);
		})
		.catch(next);
});

router.get('/:bbid/delete', auth.isAuthenticated, auth.isAuthorized(ENTITY_EDITOR), (req, res, next) => {
	if (!res.locals.entity.dataId) {
		return next(new ConflictError('This entity has already been deleted'));
	}
	_setPublisherTitle(res);
	return entityRoutes.displayDeleteEntity(req, res);
});

router.post(
	'/:bbid/delete/handler', auth.isAuthenticatedForHandler, auth.isAuthorized(ENTITY_EDITOR),
	(req, res) => {
		const {orm} = req.app.locals;
		const {PublisherHeader, PublisherRevision} = orm;
		return entityRoutes.handleDelete(
			orm, req, res, PublisherHeader, PublisherRevision
		);
	}
);

router.get('/:bbid/revisions', (req, res, next) => {
	const {PublisherRevision} = req.app.locals.orm;
	_setPublisherTitle(res);
	entityRoutes.displayRevisions(req, res, next, PublisherRevision);
});

router.get('/:bbid/revisions/revisions', (req, res, next) => {
	const {PublisherRevision} = req.app.locals.orm;
	_setPublisherTitle(res);
	entityRoutes.updateDisplayedRevisions(req, res, next, PublisherRevision);
});


export function publisherToFormState(publisher) {
	/** The front-end expects a language id rather than the language object. */
	const aliases = publisher.aliasSet ?
		publisher.aliasSet.aliases.map(({languageId, ...rest}) => ({
			...rest,
			language: languageId
		})) : [];

	const defaultAliasIndex = entityRoutes.getDefaultAliasIndex(publisher.aliasSet);
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
		publisher.disambiguation && publisher.disambiguation.comment;

	const identifiers = publisher.identifierSet ?
		publisher.identifierSet.identifiers.map(({type, ...rest}) => ({
			type: type.id,
			...rest
		})) : [];

	const identifierEditor = {};
	identifiers.forEach(
		(identifier) => { identifierEditor[identifier.id] = identifier; }
	);

	const publisherSection = {
		area: entityRoutes.areaToOption(publisher.area),
		beginDate: publisher.beginDate,
		endDate: publisher.endDate,
		ended: publisher.ended,
		type: publisher.publisherType && publisher.publisherType.id
	};
	const relationshipSection = {
		canEdit: true,
		lastRelationships: null,
		relationshipEditorProps: null,
		relationshipEditorVisible: false,
		relationships: {}
	};

	publisher.relationships.forEach((relationship) => (
		relationshipSection.relationships[`n${relationship.id}`] = {
			attributeSetId: relationship.attributeSetId,
			attributes: relationship.attributeSet ? relationship.attributeSet.relationshipAttributes : [],
			relationshipType: relationship.type,
			rowID: `n${relationship.id}`,
			sourceEntity: relationship.source,
			targetEntity: relationship.target
		}
	));

	const optionalSections: OptionalSectionsT = {};
	if (publisher.annotation) {
		optionalSections.annotationSection = publisher.annotation;
	}

	return {
		aliasEditor,
		buttonBar,
		identifierEditor,
		nameSection,
		publisherSection,
		relationshipSection,
		...optionalSections
	};
}

router.get(
	'/:bbid/edit', auth.isAuthenticated, auth.isAuthorized(ENTITY_EDITOR), middleware.loadIdentifierTypes,
	middleware.loadPublisherTypes, middleware.loadLanguages,
	 middleware.loadEntityRelationships, middleware.loadRelationshipTypes,
	(req, res) => {
		const {markup, props} = entityEditorMarkup(generateEntityProps(
			'publisher', req, res, {}, publisherToFormState
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

router.post('/:bbid/merge/handler', auth.isAuthenticatedForHandler, auth.isAuthorized(ENTITY_EDITOR),
	mergeHandler);

/** Special routes for pending entity imports */

router.get(
	'/:bbid/approve',
	auth.isAuthenticatedForHandler,
	importRoutes.approveImportEntity
);

router.get('/:bbid/discard', auth.isAuthenticated, (req, res, next) => {
	_setPublisherTitle(res);
	importRoutes.displayDiscardImportEntity(req, res, next);
});

router.post(
	'/:bbid/discard/handler',
	auth.isAuthenticatedForHandler,
	importRoutes.handleDiscardImportEntity
);

export default router;
