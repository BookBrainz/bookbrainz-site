/*
 * Copyright (C) 2017  Ben Ockmore
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
import * as entityHelper from '../../../helpers/entity';
import EditionTable from './edition-table';
import EntityAnnotation from './annotation';
import EntityFooter from './footer';
import EntityImage from './image';
import EntityLinks from './links';
import EntityRelatedCollections from './related-collections';
import EntityTitle from './title';
import ImportFooter from '../import-entities/footer';
import PropTypes from 'prop-types';
import React from 'react';
import WikipediaExtract from './wikipedia-extract';


const {deletedEntityMessage, extractAttribute, getTypeAttribute, getEntityUrl,
	ENTITY_TYPE_ICONS, getSortNameOfDefaultAlias, transformISODateForDisplay} = entityHelper;
const {Col, Row} = bootstrap;

function PublisherAttributes({publisher}) {
	if (publisher.deleted) {
		return deletedEntityMessage;
	}
	const type = getTypeAttribute(publisher.publisherType).data;
	const area = extractAttribute(publisher.area, 'name');
	const beginDate = transformISODateForDisplay(extractAttribute(publisher.beginDate));
	const endDate = transformISODateForDisplay(extractAttribute(publisher.endDate));
	const sortNameOfDefaultAlias = getSortNameOfDefaultAlias(publisher);
	return (
		<div>
			<Row>
				<Col lg={3}>
					<dl>
						<dt>Sort Name</dt>
						<dd>{sortNameOfDefaultAlias}</dd>
					</dl>
				</Col>
				<Col lg={3}>
					<dl>
						<dt>Type</dt>
						<dd>{type}</dd>
					</dl>
				</Col>
				<Col lg={3}>
					<dl>
						<dt>Area</dt>
						<dd>{area}</dd>
					</dl>
				</Col>
				<Col lg={3}>
					<dl>
						<dt>Date Founded</dt>
						<dd>{beginDate}</dd>
						<dt>Date Dissolved</dt>
						<dd>{endDate}</dd>
					</dl>
				</Col>
			</Row>
		</div>
	);
}
PublisherAttributes.displayName = 'PublisherAttributes';
PublisherAttributes.propTypes = {
	publisher: PropTypes.object.isRequired
};


function PublisherDisplayPage({entity, identifierTypes, user, wikipediaExtract}) {
	const {importMetadata} = entity;
	const isImport = !entity.revision;
	const urlPrefix = getEntityUrl(entity);
	return (
		<div>
			<Row className="entity-display-background">
				<Col className="entity-display-image-box text-center" lg={2}>
					<EntityImage
						backupIcon={ENTITY_TYPE_ICONS.Publisher}
						deleted={entity.deleted}
						imageUrl={entity.imageUrl}
					/>
				</Col>
				<Col lg={10}>
					<EntityTitle entity={entity}/>
					<PublisherAttributes publisher={entity}/>
				</Col>
			</Row>
			<WikipediaExtract articleExtract={wikipediaExtract} entity={entity}/>
			<EntityAnnotation entity={entity}/>
			{!entity.deleted &&
			<React.Fragment>
				<EditionTable showAuthorCreditsColumn editions={entity.editions} entity={entity} showAdd={!isImport}/>
				<EntityLinks
					entity={entity}
					identifierTypes={identifierTypes}
					urlPrefix={urlPrefix}
				/>
				<EntityRelatedCollections collections={entity.collections}/>
			</React.Fragment>}
			<hr className="margin-top-d40"/>
			{importMetadata ?
				<ImportFooter
					hasVoted={importMetadata.userHasVoted}
					importUrl={urlPrefix}
					importedAt={importMetadata.importedAt}
					source={importMetadata.source}
					type={entity.type}
				/> :
				<EntityFooter
					bbid={entity.bbid}
					deleted={entity.deleted}
					entityType={entity.type}
					entityUrl={urlPrefix}
					lastModified={entity.revision.revision.createdAt}
					user={user}
				/>}
		</div>
	);
}
PublisherDisplayPage.displayName = 'PublisherDisplayPage';
PublisherDisplayPage.propTypes = {
	entity: PropTypes.object.isRequired,
	identifierTypes: PropTypes.array,
	user: PropTypes.object.isRequired,
	wikipediaExtract: PropTypes.object
};
PublisherDisplayPage.defaultProps = {
	identifierTypes: [],
	wikipediaExtract: {}
};

export default PublisherDisplayPage;
