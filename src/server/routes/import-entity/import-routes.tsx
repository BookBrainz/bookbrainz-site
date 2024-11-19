/*
 * Copyright (C) 2016 Ben Ockmore
 *               2018 Shivam Tripathi
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

import * as achievement from '../../helpers/achievement';
import * as error from '../../../common/helpers/error';
import * as propHelpers from '../../../client/helpers/props';
import * as search from '../../../common/helpers/search';
import type {NextFunction, Request, Response} from 'express';
import {escapeProps, generateProps} from '../../helpers/props';
import DiscardImportEntityPage from '../../../client/components/pages/import-entities/discard-import-entity';
import type {ImportMetadataWithVote} from '../../helpers/middleware';
import Layout from '../../../client/containers/layout';
import {type ORM} from 'bookbrainz-data';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import {getEntityUrl} from '../../../client/helpers/entity';
import target from '../../templates/target';


export function displayDiscardImportEntity(req: Request, res: Response, next: NextFunction) {
	const {entity} = res.locals;
	const importMetadata: ImportMetadataWithVote = entity?.importMetadata;

	if (!importMetadata) {
		return next(new error.BadRequestError('Accepted entities can not be discarded'));
	}
	if (importMetadata.userHasVoted) {
		// User has already voted to discard the entity, just redirect them back without voting
		return res.redirect(getEntityUrl(entity));
	}

	const props = generateProps(req, res);
	const markup = ReactDOMServer.renderToString(
		<Layout {...propHelpers.extractLayoutProps(props)}>
			<DiscardImportEntityPage
				importEntity={props.entity}
			/>
		</Layout>
	);

	return res.send(target({
		markup,
		props: escapeProps(props),
		script: '/js/import-entity/discard-import-entity.js'
	}));
}

export function handleDiscardImportEntity(req, res: Response) {
	const {orm}: {orm: ORM} = req.app.locals;
	const editorId = req.session.passport.user.id;
	const {entity} = res.locals;
	orm.bookshelf.transaction(async (transacting) => {
		try {
			await orm.func.imports.castDiscardVote(
				transacting, entity.bbid, editorId
			);
			// Todo: Add code to remove importEntity from the search index
			res.status(200).send();
		}
		catch (err) {
			res.status(400).send({error: err});
		}
	});
}

export async function approveImportEntity(req, res: Response, next: NextFunction) {
	// eslint-disable-next-line prefer-destructuring -- clashes with TS
	const orm: ORM = res.app.locals.orm;
	const editorId = req.session.passport.user.id;
	const {entity} = res.locals;

	if (!entity.importMetadata) {
		return next(new error.BadRequestError('Only pending imports can be approved'));
	}

	try {
		await orm.func.imports.approveImport({editorId, importEntity: entity, orm});
	}
	catch (err) {
		return next(err);
	}

	const Model = orm.func.entity.getEntityModelByType(orm, entity.type);
	const savedEntityModel = await new Model({bbid: entity.bbid})
		.fetch({
			require: true,
			withRelated: ['defaultAlias'],
		});
	const entityJSON = savedEntityModel.toJSON();
	const entityUrl = getEntityUrl(entityJSON);

	/* Add code to remove import and add the newly created entity to the elastic
		search index and remove delete import */

	// Update editor achievement
	// TODO: alert is never used?
	entityJSON.alert = (await achievement.processEdit(
		orm, editorId, entityJSON.revisionId
	)).alert;

	// Cleanup search indexing
	search.indexEntity(savedEntityModel);
	// Todo: Add functionality to remove imports from ES index upon deletion

	return res.redirect(entityUrl);
}
