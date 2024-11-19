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
import AuthorCreditDisplay from '../../author-credit-display';
import EntityAnnotation from './annotation';
import EntityFooter from './footer';
import EntityImage from './image';
import EntityLinks from './links';
import EntityRelatedCollections from './related-collections';
import EntityTitle from './title';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import ImportFooter from '../import-entities/footer';
import PropTypes from 'prop-types';
import React from 'react';
import WikipediaExtract from './wikipedia-extract';
import WorksTable from './work-table';
import {faExternalLinkAlt} from '@fortawesome/free-solid-svg-icons';


const {
	deletedEntityMessage, extractAttribute, getEditionPublishers, getEditionReleaseDate, getEntityUrl,
	getLanguageAttribute, getRelationshipTargetByTypeId, addAuthorsDataToWorks, ENTITY_TYPE_ICONS, getSortNameOfDefaultAlias
} = entityHelper;
const {Col, Row} = bootstrap;

function EditionAttributes({edition}) {
	if (edition.deleted) {
		return deletedEntityMessage;
	}
	const status = extractAttribute(edition.editionStatus, 'label');
	const format = extractAttribute(edition.editionFormat, 'label');
	const pageCount = extractAttribute(edition.pages);
	const weight = extractAttribute(edition.weight);
	const width = extractAttribute(edition.width);
	const height = extractAttribute(edition.height);
	const depth = extractAttribute(edition.depth);

	const sortNameOfDefaultAlias = getSortNameOfDefaultAlias(edition);
	const releaseDate = getEditionReleaseDate(edition);
	const publishers = getEditionPublishers(edition);
	const languages = getLanguageAttribute(edition).data;

	return (
		<div>

			<Row>
				<Col lg={3}>
					<dl>
						<dt>Sort Name</dt>
						<dd>{sortNameOfDefaultAlias}</dd>
						<dt>Release Date</dt>
						<dd>{releaseDate}</dd>
						<dt>Format</dt>
						<dd>{format}</dd>
					</dl>
				</Col>
				<Col lg={3}>
					<dl>
						<dt>Status</dt>
						<dd>{status}</dd>
						<dt>Languages</dt>
						<dd>{languages}</dd>
					</dl>
				</Col>
				<Col lg={3}>
					<dl>
						{format !== 'eBook' &&
						<>
							<dt>Dimensions (WxHxD)</dt>
							<dd>{width}&times;{height}&times;{depth} mm</dd>
							<dt>Weight</dt>
							<dd>{weight} g</dd>
						</>}
						<dt>Page Count</dt>
						<dd>{pageCount}</dd>
					</dl>
				</Col>
				<Col lg={3}>
					<dl>
						<dt>Publishers</dt>
						<dd>{publishers}</dd>
					</dl>
				</Col>
			</Row>
		</div>
	);
}
EditionAttributes.displayName = 'EditionAttributes';
EditionAttributes.propTypes = {
	edition: PropTypes.object.isRequired
};


function EditionDisplayPage({entity, identifierTypes, user, wikipediaExtract}) {
	const {importMetadata} = entity;
	const isImport = !entity.revision;
	// relationshipTypeId = 10 refers the relation (<Work> is contained by <Edition>)
	const relationshipTypeId = 10;
	const worksContainedByEdition = getRelationshipTargetByTypeId(entity, relationshipTypeId);
	const worksContainedByEditionWithAuthors = addAuthorsDataToWorks(entity.authorsData, worksContainedByEdition);
	const urlPrefix = getEntityUrl(entity);
	const hasAuthorCredits = entity.creditSection;

	let authorCreditSection;
	if (entity.authorCredit) {
		authorCreditSection = (
			<AuthorCreditDisplay
				names={entity.authorCredit.names}
			/>
		);
	}
	else if (!entity.deleted && (hasAuthorCredits === true || hasAuthorCredits === null)) {
		authorCreditSection = (
			<div className="alert alert-warning text-center">
				Author Credit unset; please&nbsp;
				<a href={`/edition/${entity.bbid}/edit`}>edit this Edition</a>&nbsp;
				and add its Author(s) if you see this!
			</div>);
	}

	let editionGroupSection;
	if (entity.editionGroup) {
		editionGroupSection = (
			<div className="margin-bottom-d15">
				<a href={`/edition-group/${entity.editionGroup.bbid}`}>
					<FontAwesomeIcon icon={faExternalLinkAlt}/>
					<span>&nbsp;See all similar editions</span>
				</a>
			</div>
		);
	}
	else if (!entity.deleted) {
		editionGroupSection = (
			<div className="alert alert-warning text-center">
				Edition Group unset - please&nbsp;
				<a href={`/edition/${entity.bbid}/edit`}>edit this Edition</a>&nbsp;
				and add one if you see this!
			</div>
		);
	}

	return (
		<div>
			<Row className="entity-display-background">
				<Col className="entity-display-image-box text-center" lg={2}>
					<EntityImage
						backupIcon={ENTITY_TYPE_ICONS.Edition}
						deleted={entity.deleted}
						imageUrl={entity.imageUrl}
					/>
				</Col>
				<Col lg={10}>
					<EntityTitle entity={entity}/>
					{authorCreditSection}
					<hr/>
					<EditionAttributes edition={entity}/>
					{editionGroupSection}
				</Col>
			</Row>
			<WikipediaExtract articleExtract={wikipediaExtract} entity={entity}/>
			<EntityAnnotation entity={entity}/>
			{!entity.deleted &&
			<React.Fragment>
				<WorksTable
					entity={entity}
					showAdd={!isImport}
					works={worksContainedByEditionWithAuthors}
				/>
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
EditionDisplayPage.displayName = 'EditionDisplayPage';
EditionDisplayPage.propTypes = {
	entity: PropTypes.object.isRequired,
	identifierTypes: PropTypes.array,
	user: PropTypes.object.isRequired,
	wikipediaExtract: PropTypes.object
};
EditionDisplayPage.defaultProps = {
	identifierTypes: [],
	wikipediaExtract: {}
};

export default EditionDisplayPage;
