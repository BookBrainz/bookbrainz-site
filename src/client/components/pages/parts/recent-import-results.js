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

import PropTypes from 'prop-types';
import React from 'react';
import {Table} from 'react-bootstrap';
import {formatDate} from '../../../helpers/utils';
import {getEntityUrl} from '../../../helpers/entity';


/**
 * Renders the document and displays the recentImports table.
 * @returns {ReactElement} a HTML document which displays the recentImports
 */

function RecentImportsTable(props) {
	const {offset, recentImports} = props;
	return (
		<div>
			<div> <h2 className="text-center">Click to review them!</h2> </div>
			<Table
				bordered
				striped
				size="sm"
			>
				<thead>
					<tr>
						<th>#</th>
						<th>Name</th>
						<th>Type</th>
						<th>Date Added</th>
						<th>Source</th>
					</tr>
				</thead>
				<tbody>
					{
						recentImports.map((importEntity, i) => {
							const {bbid, importedAt} = importEntity;
							return (
								<tr key={bbid}>
									<td>{i + 1 + offset}</td>
									<td>
										<a	href={getEntityUrl(importEntity)}>
											{importEntity.defaultAlias.name}
										</a>
									</td>
									<td>{importEntity.type}</td>
									<td>
										{formatDate(new Date(importedAt))}
									</td>
									<td>
										{importEntity.source}
									</td>
								</tr>
							);
						})
					}
				</tbody>
			</Table>
		</div>
	);
}

RecentImportsTable.propTypes = {
	offset: PropTypes.number.isRequired,
	recentImports: PropTypes.array.isRequired
};

export default RecentImportsTable;
