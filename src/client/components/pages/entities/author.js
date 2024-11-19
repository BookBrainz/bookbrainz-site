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
import React, {createRef, useCallback} from 'react';

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
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import ImportFooter from '../import-entities/footer';
import PropTypes from 'prop-types';
import WikipediaExtract from './wikipedia-extract';
import {kebabCase as _kebabCase} from 'lodash';
import {faPlus} from '@fortawesome/free-solid-svg-icons';
import {labelsForAuthor} from '../../../helpers/utils';


const {deletedEntityMessage, extractAttribute, getTypeAttribute, getEntityUrl,
	ENTITY_TYPE_ICONS, getSortNameOfDefaultAlias, transformISODateForDisplay} = entityHelper;
const {Button, Col, Row} = bootstrap;

function AuthorAttributes({author}) {
	if (author.deleted) {
		return deletedEntityMessage;
	}
	const type = getTypeAttribute(author.authorType).data;
	const gender = extractAttribute(author.gender, 'name');
	const beginArea = extractAttribute(author.beginArea, 'name');
	const endArea = extractAttribute(author.endArea, 'name');
	const beginDate = transformISODateForDisplay(extractAttribute(author.beginDate));
	const endDate = transformISODateForDisplay(extractAttribute(author.endDate));
	const sortNameOfDefaultAlias = getSortNameOfDefaultAlias(author);
	const averageRating = author.reviews?.reviews?.average_rating?.rating || 0;
	const reviewsCount = author.reviews?.reviews?.average_rating?.count || 0;

	const isGroup = type === 'Group';
	const {
		beginDateLabel,
		beginAreaLabel,
		endDateLabel,
		endAreaLabel
	} = labelsForAuthor(isGroup);
	const showGender = !isGroup;
	return (
		<div>
			<Row>
				<Col lg={3}>
					<dl>
						<dt>Sort Name</dt>
						<dd>{sortNameOfDefaultAlias}</dd>
						<AverageRating
							averageRatings={averageRating}
							reviewsCount={reviewsCount}
						/>
					</dl>
				</Col>
				<Col lg={3}>
					<dl>
						<dt>Type</dt>
						<dd>{type}</dd>
						{showGender &&
							<React.Fragment>
								<dt>Gender</dt>
								<dd>{gender}</dd>
							</React.Fragment>
						}
					</dl>
				</Col>
				<Col lg={3}>
					<dl>
						<dt>{beginDateLabel}</dt>
						<dd>{beginDate}</dd>
						<dt>{beginAreaLabel}</dt>
						<dd>{beginArea}</dd>
					</dl>
				</Col>
				{
					author.ended &&
					<Col lg={3}>
						<dl>
							<dt>{endDateLabel}</dt>
							<dd>{endDate}</dd>
							<dt>{endAreaLabel}</dt>
							<dd>{endArea}</dd>
						</dl>
					</Col>
				}
			</Row>
		</div>
	);
}
AuthorAttributes.displayName = 'AuthorAttributes';
AuthorAttributes.propTypes = {
	author: PropTypes.object.isRequired
};


function AuthorDisplayPage({entity, identifierTypes, user, wikipediaExtract}) {
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
	const editions = [];
	if (entity?.authorCredits) {
		entity.authorCredits.forEach((authorCredit) => {
			editions.push(...authorCredit.editions);
		});
	}
	return (
		<div>
			<Row className="entity-display-background">
				<Col className="entity-display-image-box text-center" lg={2}>
					<EntityImage
						backupIcon={ENTITY_TYPE_ICONS.Author}
						deleted={entity.deleted}
						imageUrl={entity.imageUrl}
					/>
				</Col>
				<Col lg={10}>
					<EntityTitle
						entity={entity}
						handleModalToggle={handleModalToggle}
					/>
					<AuthorAttributes
						author={entity}
					/>
				</Col>
			</Row>
			<WikipediaExtract articleExtract={wikipediaExtract} entity={entity}/>
			<EntityAnnotation entity={entity}/>
			{!entity.deleted &&
				<React.Fragment>
					<Row>
						<Col lg={8}>
							<EditionTable editions={editions} entity={entity} showAdd={!isImport}/>
							<EntityLinks
								entity={entity}
								identifierTypes={identifierTypes}
								urlPrefix={urlPrefix}
							/>
							<EntityRelatedCollections collections={entity.collections}/>
							{!isImport &&
								<Button
									className="margin-top-d15"
									href={`/work/create?${_kebabCase(entity.type)}=${entity.bbid}`}
									variant="success"
								>
									<FontAwesomeIcon className="margin-right-0-5" icon={faPlus}/>Add Work
								</Button>}
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
AuthorDisplayPage.displayName = 'AuthorDisplayPage';
AuthorDisplayPage.propTypes = {
	entity: PropTypes.object.isRequired,
	identifierTypes: PropTypes.array,
	user: PropTypes.object.isRequired,
	wikipediaExtract: PropTypes.object
};
AuthorDisplayPage.defaultProps = {
	identifierTypes: [],
	wikipediaExtract: {}
};

export default AuthorDisplayPage;
