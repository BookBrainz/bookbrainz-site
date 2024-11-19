/*
 * Copyright (C) 2017  Ben Ockmore
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
import * as entityHelper from '../../../helpers/entity';
import React, {createRef, useCallback} from 'react';
import AuthorCreditDisplay from '../../author-credit-display';
import AverageRating from './average-ratings';
import CBReviewModal from './cbReviewModal';
import EditionTable from './edition-table';
import EntityAnnotation from './annotation';
import EntityFooter from './footer';
import EntityImage from './image';
import EntityLinks from './links';
import EntityRelatedCollections from './related-collections';
import EntityReviews from './cb-review';
import EntityTitle from './title';
import ImportFooter from '../import-entities/footer';
import PropTypes from 'prop-types';
import WikipediaExtract from './wikipedia-extract';


const {deletedEntityMessage, getTypeAttribute, getEntityUrl, ENTITY_TYPE_ICONS, getSortNameOfDefaultAlias} = entityHelper;
const {Col, Row} = bootstrap;

function EditionGroupAttributes({editionGroup}) {
	if (editionGroup.deleted) {
		return deletedEntityMessage;
	}
	const type = getTypeAttribute(editionGroup.editionGroupType).data;
	const sortNameOfDefaultAlias = getSortNameOfDefaultAlias(editionGroup);
	const averageRating = editionGroup.reviews?.reviews?.average_rating?.rating || 0;
	const reviewsCount = editionGroup.reviews?.reviews?.average_rating?.count || 0;
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
						<AverageRating
							averageRatings={averageRating}
							reviewsCount={reviewsCount}
						/>
					</dl>
				</Col>
			</Row>
		</div>
	);
}
EditionGroupAttributes.displayName = 'EditionGroupAttributes';
EditionGroupAttributes.propTypes = {
	editionGroup: PropTypes.object.isRequired
};


function EditionGroupDisplayPage({entity, identifierTypes, user, wikipediaExtract}) {
	const [showCBReviewModal, setShowCBReviewModal] = React.useState(false);
	const handleModalToggle = useCallback(() => {
		setShowCBReviewModal(!showCBReviewModal);
	}, [showCBReviewModal]);

	const reviewsRef = createRef();

	const handleUpdateReviews = useCallback(() => {
		reviewsRef.current.handleClick();
	}, [reviewsRef]);

	const {importMetadata} = entity;
	const isImport = !entity.revision;
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
				<a href={`/edition-group/${entity.bbid}/edit`}>edit this Edition Group</a>&nbsp;
				and add its Author(s) if you see this!
				You can copy the Author Credit from one of the Editions as well
			</div>);
	}

	return (
		<div>
			<Row className="entity-display-background">
				<Col className="entity-display-image-box text-center" lg={2}>
					<EntityImage
						backupIcon={ENTITY_TYPE_ICONS.EditionGroup}
						deleted={entity.deleted}
						imageUrl={entity.imageUrl}
					/>
				</Col>
				<Col lg={10}>
					<EntityTitle
						entity={entity}
						handleModalToggle={handleModalToggle}
					/>
					{authorCreditSection}
					<EditionGroupAttributes
						editionGroup={entity}
					/>
				</Col>
			</Row>
			<WikipediaExtract articleExtract={wikipediaExtract} entity={entity}/>
			<EntityAnnotation entity={entity}/>
			{!entity.deleted &&
			<React.Fragment>
				<EditionTable editions={entity.editions} entity={entity} showAdd={!isImport}/>
				<Row>
					<Col lg={8}>
						<EntityLinks
							entity={entity}
							identifierTypes={identifierTypes}
							urlPrefix={urlPrefix}
						/>
						<EntityRelatedCollections collections={entity.collections}/>

					</Col>
					<Col lg={4}>
						<EntityReviews
							entityBBID={entity.bbid}
							entityReviews={entity.reviews}
							entityType={entity.type}
							handleModalToggle={handleModalToggle}
							ref={reviewsRef}
						/>
					</Col>
				</Row>
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
			{!entity.deleted && !isImport &&
			<CBReviewModal
				entityBBID={entity.bbid}
				entityName={entity.defaultAlias.name}
				entityType={entity.type}
				handleModalToggle={handleModalToggle}
				handleUpdateReviews={handleUpdateReviews}
				showModal={showCBReviewModal}
				userId={user?.id}
			/>}
		</div>
	);
}
EditionGroupDisplayPage.displayName = 'EditionGroupDisplayPage';
EditionGroupDisplayPage.propTypes = {
	entity: PropTypes.object.isRequired,
	identifierTypes: PropTypes.array,
	user: PropTypes.object.isRequired,
	wikipediaExtract: PropTypes.object
};
EditionGroupDisplayPage.defaultProps = {
	identifierTypes: [],
	wikipediaExtract: {}
};

export default EditionGroupDisplayPage;
