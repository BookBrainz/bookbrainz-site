/*
 * Copyright (C) 2016  Ben Ockmore
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


import * as React from 'react';
import {
	Action,
	debouncedUpdateDepth,
	debouncedUpdateHeight,
	debouncedUpdatePages,
	debouncedUpdateReleaseDate,
	debouncedUpdateWeight,
	debouncedUpdateWidth,
	disablePhysical,
	enablePhysical,
	toggleShowEditionGroup,
	updateEditionGroup,
	updateFormat,
	updateLanguages,
	updatePublisher,
	updateStatus
} from './actions';

import {Alert, Button, Col, Form, ListGroup, OverlayTrigger, Row, Tooltip} from 'react-bootstrap';
import {DateObject, convertMapToObject, isNullDate} from '../../helpers/utils';
import type {List, Map} from 'immutable';
import {faClone, faExternalLinkAlt, faQuestionCircle, faSearch} from '@fortawesome/free-solid-svg-icons';
import {
	validateEditionSectionDepth,
	validateEditionSectionEditionGroup,
	validateEditionSectionHeight,
	validateEditionSectionPages,
	validateEditionSectionReleaseDate,
	validateEditionSectionWeight,
	validateEditionSectionWidth
} from '../validators/edition';

import AuthorCreditSection from '../author-credit-editor/author-credit-section';
import DateField from '../common/new-date-field';
import type {Dispatch} from 'redux';
import EntitySearchFieldOption from '../common/entity-search-field-option';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import LanguageField from '../common/language-field';
import LinkedEntity from '../common/linked-entity';
import NumericField from '../common/numeric-field';
import SearchEntityCreate from '../../unified-form/common/search-entity-create-select';
import Select from 'react-select';
import _ from 'lodash';
import {clearEditionGroups} from '../../unified-form/detail-tab/action';
import {connect} from 'react-redux';
import {entityToOption} from '../../helpers/entity';
import makeImmutable from '../common/make-immutable';


const ImmutableLanguageField = makeImmutable(LanguageField);

type EditionFormat = {
	label: string,
	id: number
};

type EditionStatus = {
	label: string,
	id: number
};

type LanguageOption = {
	frequency: number,
	name: string,
	id: number
};

type Publisher = {
	value: string,
	id: number
};

type EditionGroup = {
	__isNew__: boolean,
	value: string,
	id: number
};

type OwnProps = {
	languageOptions: Array<LanguageOption>,
	editionFormats: Array<EditionFormat>,
	isUnifiedForm:boolean,
	editionStatuses: Array<EditionStatus>
};

type OptionalNumber = number | null | undefined;
type OptionalBool = boolean| null | undefined;
type StateProps = {
	depthValue: OptionalNumber,
	formatValue: OptionalNumber,
	heightValue: OptionalNumber,
	languageValues: List<LanguageOption>,
	pagesValue: OptionalNumber,
	physicalEnable: OptionalBool,
	publisherValue: Map<string, any>,
	editionGroupRequired: OptionalBool,
	editionGroupVisible: OptionalBool,
	editionGroupValue: Map<string, any>,
	matchingNameEditionGroups: any[] | null | undefined,
	releaseDateValue: DateObject | null | undefined,
	statusValue: OptionalNumber,
	weightValue: OptionalNumber,
	widthValue: OptionalNumber
};

type DispatchProps = {
	onDepthChange: (arg: React.ChangeEvent<HTMLInputElement>) => unknown,
	onFormatChange: (obj: {value: number} | null | undefined) => unknown,
	onHeightChange: (arg: React.ChangeEvent<HTMLInputElement>) => unknown,
	onLanguagesChange: (arg: Array<LanguageOption>) => unknown,
	onPagesChange: (arg: React.ChangeEvent<HTMLInputElement>) => unknown,
	onPublisherChange: (arg: Publisher[]) => unknown,
	onToggleShowEditionGroupSection: (showEGSection: boolean) => unknown,
	onEditionGroupChange: (arg: EditionGroup, action) => unknown,
	onReleaseDateChange: (arg: string) => unknown,
	onStatusChange: (obj: {value: number} | null | undefined) => unknown,
	onWeightChange: (arg: React.ChangeEvent<HTMLInputElement>) => unknown,
	onWidthChange: (arg: React.ChangeEvent<HTMLInputElement>) => unknown
};

type Props = OwnProps & StateProps & DispatchProps;

/**
 * Container component. The EditionSection component contains input fields
 * specific to the edition entity. The intention is that this component is
 * rendered as a modular section within the entity editor.
 *
 * @param {Object} props - The properties passed to the component.
 * @param {Array} props.editionFormats - The list of possible formats for a
 *                edition.
 * @param {Array} props.editionStatuses - The list of possible statuses for a
 *                edition.
 * @param {number} props.formatValue - The ID of the format currently selected
 *        for the edition.
 * @param {number} props.statusValue - The ID of the status currently selected
 *        for the edition.
 * @param {Function} props.onFormatChange - A function to be called when
 *        a different edition format is selected.
 * @param {Function} props.onStatusChange - A function to be called when
 *        a different edition status is selected.
 * @returns {ReactElement} React element containing the rendered EditionSection.
 */
function EditionSection({
	depthValue,
	editionFormats,
	editionStatuses,
	formatValue,
	heightValue,
	languageOptions,
	languageValues,
	onLanguagesChange,
	onDepthChange,
	onFormatChange,
	onHeightChange,
	onReleaseDateChange,
	onPagesChange,
	onToggleShowEditionGroupSection,
	onEditionGroupChange,
	onPublisherChange,
	onStatusChange,
	onWeightChange,
	onWidthChange,
	pagesValue,
	physicalEnable,
	editionGroupRequired,
	editionGroupValue,
	editionGroupVisible,
	matchingNameEditionGroups,
	isUnifiedForm,
	publisherValue: publishers,
	releaseDateValue,
	statusValue,
	weightValue,
	widthValue,
	...rest
}: Props) {
	const languageOptionsForDisplay = languageOptions.map((language) => ({
		frequency: language.frequency,
		label: language.name,
		value: language.id
	}));
	let publisherValue = publishers ?? {};
	publisherValue = Object.values(convertMapToObject(publisherValue));
	const editionFormatsForDisplay = editionFormats.map((format) => ({
		label: format.label,
		value: format.id
	}));
	const formatOption = editionFormatsForDisplay.filter((el) => el.value === formatValue);
	const editionStatusesForDisplay = editionStatuses.map((status) => ({
		label: status.label,
		value: status.id
	}));
	const statusOption = editionStatusesForDisplay.filter((el) => el.value === statusValue);
	const {isValid: isValidReleaseDate, errorMessage: dateErrorMessage} = validateEditionSectionReleaseDate(releaseDateValue);

	const hasmatchingNameEditionGroups = Boolean(matchingNameEditionGroups?.length);

	const showAutoCreateEditionGroupMessage =
		!editionGroupValue &&
		!editionGroupVisible &&
		!editionGroupRequired;

	const showMatchingEditionGroups = Boolean(hasmatchingNameEditionGroups && !editionGroupValue);
	const EntitySearchField = isUnifiedForm ? SearchEntityCreate : EntitySearchFieldOption;
	const getEditionGroupSearchSelect = () => (
		<React.Fragment>
			<Col className="margin-bottom-2" lg={{offset: isUnifiedForm || showMatchingEditionGroups ? 0 : 3, span: 6}}>
				<EntitySearchField
					error={!validateEditionSectionEditionGroup(editionGroupValue, true)}
					help="Group with other Editions of the same book"
					instanceId="edition-group"
					isUnifiedForm={isUnifiedForm}
					label="Edition Group"
					languageOptions={languageOptions}
					tooltipText={
						<>
						Group together different Editions of the same book.
							<br/>For example paperback, hardcover and e-book editions.
						</>
					}
					type="editionGroup"
					value={editionGroupValue}
					onChange={onEditionGroupChange}
					{...rest}
				/>
				<Button
					block
					className="wrap"
					variant="primary"
					// eslint-disable-next-line react/jsx-no-bind
					onClick={onToggleShowEditionGroupSection.bind(this, false)}
				>
					<FontAwesomeIcon icon={faClone}/>&nbsp;Automatically create an Edition Group
				</Button>
			</Col>
		</React.Fragment>
	);

	const formatTooltip = (
		<Tooltip>
			The type of printing and binding of the edition, or digital equivalent
		</Tooltip>
	);

	const statusTooltip = (
		<Tooltip>
			Has the work been published, or is it in a draft stage?
		</Tooltip>
	);
	const headingTag = !isUnifiedForm && <h2>What else do you know about the Edition?</h2>;
	const colSpan = {
		offset: 3,
		span: 6
	};
	const shortColSpan = {
		offset: 3,
		span: 3
	};
	if (isUnifiedForm) {
		colSpan.offset = 0;
		shortColSpan.offset = 0;
	}
	return (
		<div>
			{headingTag}
			{!isUnifiedForm && <AuthorCreditSection type="edition"/>}
			<p className="text-muted">
				Edition Group is required — this cannot be blank. You can search for and choose an existing Edition Group,
				or choose to automatically create one instead.
			</p>

			<Row className="margin-bottom-3">
				{
					showAutoCreateEditionGroupMessage ?
						<Col lg={{offset: isUnifiedForm || showMatchingEditionGroups ? 0 : 3, span: 6}}>
							<Alert variant="success">
								<p>A new Edition Group with the same name will be created automatically.</p>
								<br/>
								<Button
									block
									className="wrap"
									variant="success"
									// eslint-disable-next-line react/jsx-no-bind
									onClick={onToggleShowEditionGroupSection.bind(this, true)}
								>
									<FontAwesomeIcon icon={faSearch}/>&nbsp;Search for an existing Edition Group
								</Button>
							</Alert>
						</Col> :
						getEditionGroupSearchSelect()
				}
				{showMatchingEditionGroups &&
					<Col lg={6}>
						<Alert variant="warning">
							{matchingNameEditionGroups.length > 1 ?
								'Edition Groups with the same name as this Edition already exist' :
								'An existing Edition Group with the same name as this Edition already exists'
							}
							<br/>
							Please review the Edition Groups below and select the one that corresponds to your Edition.
							<br/>
							<small>
								If no Edition Group is selected, a new one will be created automatically.
								<br/>
								Click on the <FontAwesomeIcon icon={faExternalLinkAlt}/> icon open in a new tab, and click an item to select.
							</small>
							<ListGroup className="margin-top-1">
								{matchingNameEditionGroups.map(eg => (
									<ListGroup.Item key={eg.bbid}>
										<LinkedEntity data={entityToOption(eg)} onSelect={onEditionGroupChange}/>
									</ListGroup.Item>
								))}
							</ListGroup>
						</Alert>
					</Col>
				}
			</Row>


			<p className="text-muted">
				Below fields are optional — leave something blank if you
				don&rsquo;t know it
			</p>
			<Row>
				{!isUnifiedForm &&
				<Col lg={colSpan}>
					<EntitySearchFieldOption
						isMulti
						instanceId="publisher"
						label="Publisher"
						type="publisher"
						value={publisherValue}
						onChange={onPublisherChange}
					/>
				</Col>}
			</Row>
			<Row>
				<Col lg={colSpan}>
					<DateField
						show
						defaultValue={releaseDateValue}
						empty={isNullDate(releaseDateValue)}
						error={!isValidReleaseDate}
						errorMessage={dateErrorMessage}
						label="Release Date"
						placeholder="YYYY-MM-DD"
						// eslint-disable-next-line max-len
						tooltipText="The date this specific edition was published (not the first publication date of the work). If unsure, leave empty."
						onChangeDate={onReleaseDateChange}
					/>
				</Col>
			</Row>
			<Row>
				<Col lg={colSpan}>
					<ImmutableLanguageField
						empty
						isMulti
						instanceId="language"
						options={languageOptionsForDisplay}
						tooltipText="Main language used for the content of the edition"
						value={languageValues}
						onChange={onLanguagesChange}
					/>
				</Col>
			</Row>
			<Row>
				<Col lg={shortColSpan}>
					<Form.Group>
						<Form.Label>
							Format
							<OverlayTrigger delay={50} overlay={formatTooltip}>
								<FontAwesomeIcon
									className="margin-left-0-5"
									icon={faQuestionCircle}
								/>
							</OverlayTrigger>
						</Form.Label>
						<Select
							classNamePrefix="react-select"
							instanceId="editionFormat"
							isClearable="true"
							isSearchable={false}
							options={editionFormatsForDisplay}
							value={formatOption}
							onChange={onFormatChange}
						/>
					</Form.Group>
				</Col>
				<Col lg={3}>
					<Form.Group>
						<Form.Label>
							Status
							<OverlayTrigger delay={50} overlay={statusTooltip}>
								<FontAwesomeIcon
									className="margin-left-0-5"
									icon={faQuestionCircle}
								/>
							</OverlayTrigger>
						</Form.Label>
						<Select
							isClearable
							classNamePrefix="react-select"
							instanceId="editionStatus"
							isSearchable={false}
							options={editionStatusesForDisplay}
							value={statusOption}
							onChange={onStatusChange}
						/>
					</Form.Group>
				</Col>
			</Row>
			<Row>
				<Col lg={shortColSpan}>
					<NumericField
						addonAfter="pages"
						defaultValue={pagesValue}
						empty={_.isNil(pagesValue)}
						error={!validateEditionSectionPages(pagesValue)}
						label="Page Count"
						onChange={onPagesChange}
					/>
				</Col>
			</Row>
			<Row>
				<Col lg={shortColSpan}>
					<NumericField
						addonAfter="mm"
						defaultValue={widthValue}
						disabled={!physicalEnable}
						empty={_.isNil(widthValue)}
						error={!validateEditionSectionWidth(widthValue)}
						label="Width"
						onChange={onWidthChange}
					/>
					<NumericField
						addonAfter="mm"
						defaultValue={heightValue}
						disabled={!physicalEnable}
						empty={_.isNil(heightValue)}
						error={!validateEditionSectionHeight(heightValue)}
						label="Height"
						onChange={onHeightChange}
					/>
				</Col>
				<Col lg={3}>
					<NumericField
						addonAfter="g"
						defaultValue={weightValue}
						disabled={!physicalEnable}
						empty={_.isNil(weightValue)}
						error={!validateEditionSectionWeight(weightValue)}
						label="Weight"
						onChange={onWeightChange}
					/>
					<NumericField
						addonAfter="mm"
						defaultValue={depthValue}
						disabled={!physicalEnable}
						empty={_.isNil(depthValue)}
						error={!validateEditionSectionDepth(depthValue)}
						label="Depth"
						onChange={onDepthChange}
					/>
				</Col>
			</Row>
		</div>
	);
}
EditionSection.displayName = 'EditionSection';

type RootState = Map<string, Map<string, any>>;
function mapStateToProps(rootState: RootState): StateProps {
	const state: Map<string, any> = rootState.get('editionSection');
	return {
		depthValue: state.get('depth'),
		editionGroupRequired: state.get('editionGroupRequired'),
		editionGroupValue: state.get('editionGroup'),
		editionGroupVisible: state.get('editionGroupVisible'),
		formatValue: state.get('format'),
		heightValue: state.get('height'),
		languageValues: state.get('languages'),
		matchingNameEditionGroups: state.get('matchingNameEditionGroups'),
		pagesValue: state.get('pages'),
		physicalEnable: state.get('physicalEnable'),
		publisherValue: state.get('publisher'),
		releaseDateValue: state.get('releaseDate'),
		statusValue: state.get('status'),
		weightValue: state.get('weight'),
		widthValue: state.get('width')
	};
}

function mapDispatchToProps(dispatch: Dispatch<Action>): DispatchProps {
	return {
		onDepthChange: (event) => dispatch(debouncedUpdateDepth(
			event.target.value ? parseFloat(event.target.value) : null
		)),
		onEditionGroupChange: (value, action) => {
			// If the user selected a new edition group, we need to clear the old one
			if (['clear', 'pop-value', 'select-option'].includes(action.action)) {
				dispatch(clearEditionGroups());
			}
			dispatch(updateEditionGroup(value));
		},
		onFormatChange: (value: {value: number} | null) => {
			dispatch(updateFormat(value && value.value));
			if (value.value === 3) {
				dispatch(disablePhysical());
			}
			else {
				dispatch(enablePhysical());
			}
		},
		onHeightChange: (event) => dispatch(debouncedUpdateHeight(
			event.target.value ? parseFloat(event.target.value) : null
		)),
		onLanguagesChange: (values: Array<LanguageOption>) =>
			dispatch(updateLanguages(values)),
		onPagesChange: (event) => dispatch(debouncedUpdatePages(
			event.target.value ? parseInt(event.target.value, 10) : null
		)),
		onPublisherChange: (value) => dispatch(updatePublisher(Object.fromEntries(value.map((pub, index) => [index, pub])))),
		onReleaseDateChange: (releaseDate) =>
			dispatch(debouncedUpdateReleaseDate(releaseDate)),
		onStatusChange: (value: {value: number} | null) =>
			dispatch(updateStatus(value && value.value)),
		onToggleShowEditionGroupSection: (showEGSection: boolean) => {
			if (showEGSection === false) {
				dispatch(updateEditionGroup(null));
			}
			return dispatch(toggleShowEditionGroup(showEGSection));
		},
		onWeightChange: (event) => dispatch(debouncedUpdateWeight(
			event.target.value ? parseInt(event.target.value, 10) : null
		)),
		onWidthChange: (event) => dispatch(debouncedUpdateWidth(
			event.target.value ? parseFloat(event.target.value) : null
		))
	};
}

export default connect(mapStateToProps, mapDispatchToProps)(EditionSection);
