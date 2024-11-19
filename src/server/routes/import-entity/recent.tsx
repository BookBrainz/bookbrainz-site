/*
 * Copyright (C) 2018 Shivam Tripathi
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

import * as propHelpers from '../../../client/helpers/props';
import {escapeProps, generateProps} from '../../helpers/props';
import Layout from '../../../client/containers/layout';
import {type ORM} from 'bookbrainz-data';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import RecentImports from
	'../../../client/components/pages/import-entities/recent-imports';
import express from 'express';
import target from '../../templates/target';


// The limit for number of results fetched from database
const LIMIT = 10;

const router = express.Router();

/* Function to fetch data from the database and create the object to be sent as
	response */
function fetchRecentImportsData(orm: ORM, page: number) {
	let pageNumber = page;

	return orm.bookshelf.transaction(async (transacting) => {
		// First fetch total imports
		const totalResults =
			await orm.func.imports.getTotalImports(transacting);

		if (totalResults < ((pageNumber - 1) * LIMIT)) {
			pageNumber = Math.ceil(totalResults / LIMIT);
		}
		const offset = (pageNumber - 1) * LIMIT;

		// Now fetch recent imports according to the generated offset
		const recentImports = await orm.func.imports.getRecentImports(
			orm, transacting, LIMIT, offset
		);

		return {
			currentPage: pageNumber,
			limit: LIMIT,
			offset,
			recentImports,
			totalResults
		};
	});
}

// This handles the router to send initial container to hold recentImports data
function recentImportsRoute(req, res: express.Response) {
	const queryPage = parseInt(req.query.page, 10) || 1;
	const props = generateProps(req, res, {
		currentPage: queryPage, limit: LIMIT
	});

	const markup = ReactDOMServer.renderToString(
		<Layout {...propHelpers.extractLayoutProps(props)}>
			<RecentImports
				{...props}
			/>
		</Layout>
	);

	res.send(target({
		markup,
		props: escapeProps(props),
		script: '/js/import-entity/recent-imports.js',
		title: 'Recent Imports'
	}));
}

// This handles the data fetching route for recent imports, sends JSON as res
async function rawRecentImportsRoute(req, res) {
	const {orm} = req.app.locals;
	const queryPage = parseInt(req.query.page, 10) || 1;
	const recentImportsData = await fetchRecentImportsData(orm, queryPage);

	res.send(recentImportsData);
}

router.get('/', recentImportsRoute);
router.get('/raw', rawRecentImportsRoute);

export default router;
