/*
 * Copyright (C) 2021  Akash Gupta
 *               2022  Ansh Goyal
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

import * as bootstrap from 'react-bootstrap';
import PropTypes from 'prop-types';
import React from 'react';


const {Row, Col} = bootstrap;

function EntityRelatedCollections({collections}) {
	return (
		<Row>
			<Col>
				<h2>Related Collections</h2>
				{collections?.length > 0 ? (
					<ul className="list-unstyled">
						{collections.map((collection) => (
							<li key={collection.id}>
								<a href={`/collection/${collection.id}`}>{collection.name}</a> by {' '}
								<a href={`/editor/${collection.ownerId}`}>{collection.owner.name}</a>
							</li>
						))}
					</ul>
				) :
					<p className="text-muted">
						<b>This entity does not appear in any public collection.</b>
						<br/>
						Click the <b>&quot;Add to collection&quot;</b> button below to add it to an existing collection or create a new one.
					</p>
				}
			</Col>
		</Row>
	);
}
EntityRelatedCollections.displayName = 'EntityRelatedCollections';
EntityRelatedCollections.propTypes = {
	collections: PropTypes.array.isRequired
};

export default EntityRelatedCollections;
