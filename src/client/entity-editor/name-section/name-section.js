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

import {Alert, Col, ListGroup, Row} from 'react-bootstrap';
import {UPDATE_WARN_IF_EDITION_GROUP_EXISTS, addLanguage} from '../edition-section/actions';
import {
	checkIfNameExists,
	debouncedUpdateDisambiguationField,
	debouncedUpdateNameField,
	debouncedUpdateSortNameField,
	searchName,
	updateLanguageField
} from './actions';
import {isAliasEmpty, isRequiredDisambiguationEmpty} from '../helpers';
import {
	validateNameSectionDisambiguation,
	validateNameSectionLanguage,
	validateNameSectionName,
	validateNameSectionSortName
} from '../validators/common';

import DisambiguationField from './disambiguation-field';
import Immutable from 'immutable';
import LanguageField from '../common/language-field';
import NameField from '../common/name-field';
import PropTypes from 'prop-types';
import React from 'react';
import SearchResults from '../../components/pages/parts/search-results';
import SortNameField from '../common/sort-name-field';
import _ from 'lodash';
import {connect} from 'react-redux';
import {convertMapToObject} from '../../helpers/utils';
import {entityTypeProperty} from '../../helpers/react-validators';
import {getEntityDisambiguation} from '../../helpers/entity';
import makeImmutable from '../common/make-immutable';


const ImmutableLanguageField = makeImmutable(LanguageField);


/**
 * Container component. The NameSection component contains input fields for
 * setting the name of an entity. It also allows setting of the entity's
 * disambiguation. The intention is that this component is rendered as a
 * modular section within the entity editor.
 *
 * @param {Object} props - The properties passed to the component.
 * @param {string} props.disambiguationDefaultValue - The default value for the
 *        disambiguation field.
 * @param {Array} props.languageOptions - The list of possible languages for the
 *        entity name.
 * @param {string} props.languageValue - The ID of the language currently
 *        selected for the entity name.
 * @param {string} props.nameValue - The name currently set for this entity.
 * @param {string} props.sortNameValue - The sort name currently set for this
 *        entity.
 * @param {Function} props.onLanguageChange - A function to be called when a
 *        different language type is selected.
 * @param {Function} props.onNameChange - A function to be called when the name
 *        is changed.
 * @param {Function} props.onSortNameChange - A function to be called when the
 *        sort name is changed.
 * @param {Function} props.onDisambiguationChange - A function to be called when
 *        the disambiguation is changed.
 * @returns {ReactElement} React element containing the rendered NameSection.
 */
class NameSection extends React.Component {
	constructor(props) {
		super(props);
		this.updateNameFieldInputRef = this.updateNameFieldInputRef.bind(this);
		this.handleNameChange = this.handleNameChange.bind(this);
		this.searchForMatchingEditionGroups = this.searchForMatchingEditionGroups.bind(this);
	}

	/*
		Fix issue with user typing in input before js is fully loaded,
		not triggering the name search.
		Also an issue if passing a nameSection with a name that might be a duplicate
		(e.g. creating an Edition from a Work, the Work's nameSection will be pre-filled)
		When Component is first loaded, manually trigger "handleNameChange" mechanism.
	*/
	componentDidMount() {
		if (this.props.action !== 'edit' && !_.isNil(this.nameInputRef)) {
			this.handleNameChange({target: {value: this.nameInputRef.value}});
		}
	}

	componentDidUpdate(prevProps) {
		const {nameValue, searchForExistingEditionGroup} = this.props;
		if (prevProps.searchForExistingEditionGroup === searchForExistingEditionGroup ||
			searchForExistingEditionGroup === false) {
			return;
		}
		this.searchForMatchingEditionGroups(nameValue);
	}

	handleNameChange(event) {
		this.props.onNameChange(event.target.value);
		this.props.onNameChangeCheckIfExists(event.target.value);
		this.props.onNameChangeSearchName(event.target.value);
		this.searchForMatchingEditionGroups(event.target.value);
	}

	searchForMatchingEditionGroups(nameValue) {
		const {
			entityType,
			onNameChangeCheckIfEditionGroupExists,
			searchForExistingEditionGroup
		} = this.props;
		// Search for Edition Groups that match the name, if the entity is an Edition
		// Will react to name changes and searchForExistingEditionGroup (which reacts to editionGroupBBID field)
		if (_.toLower(entityType) === 'edition' && searchForExistingEditionGroup && !_.isNil(nameValue)) {
			onNameChangeCheckIfEditionGroupExists(nameValue);
		}
	}

	updateNameFieldInputRef(inputRef) {
		this.nameInputRef = inputRef;
	}

	renderDuplicateAlert(warnIfExists, disambiguationDefaultValue, exactMatches, entityType, lgCol) {
		return (
			<Col lg={lgCol}>
				{isRequiredDisambiguationEmpty(
					warnIfExists,
					disambiguationDefaultValue
				) ?
					<Alert variant="warning">
					We found the following&nbsp;
						{_.startCase(entityType)}{exactMatches.length > 1 ? 's' : ''} with
					exactly the same name or alias:
						<br/><small className="text-muted">Click on a name to open it (Ctrl/Cmd + click to open in a new tab)</small>
						<ListGroup activeKey={null} className="margin-top-1 margin-bottom-1">
							{exactMatches.map((match) =>
								(
									<ListGroup.Item
										action
										href={`/${_.kebabCase(entityType)}/${match.bbid}`}
										key={`${match.bbid}`}
										rel="noopener noreferrer" target="_blank"
										variant="warning"
									>
										{match.defaultAlias.name} {getEntityDisambiguation(match)}
									</ListGroup.Item>
								))}
						</ListGroup>
					If you are sure your entry is different, please fill the
					disambiguation field below to help us differentiate between them.
					</Alert> : null
				}
			</Col>
		);
	}

	render() {
		const {
			disambiguationDefaultValue,
			entityType,
			exactMatches: immutableExactMatches,
			languageOptions,
			languageValue,
			nameValue,
			sortNameValue,
			onLanguageChange,
			onSortNameChange,
			onDisambiguationChange,
			searchResults: immutableSearchResults,
			isUnifiedForm,
			isModal
		} = this.props;
		const exactMatches = convertMapToObject(immutableExactMatches);
		const searchResults = convertMapToObject(immutableSearchResults);
		const languageOptionsForDisplay = languageOptions.map((language) => ({
			frequency: language.frequency,
			label: language.name,
			value: language.id
		}));

		const warnIfExists = !_.isEmpty(exactMatches);
		const languageOption = languageOptionsForDisplay.filter((el) => el.value === languageValue);
		const lgCol = {offset: 3, span: 6};
		if (isUnifiedForm) {
			lgCol.offset = 0;
		}
		const duplicateSuggestions = !warnIfExists &&
		!_.isEmpty(searchResults) &&
		<Row>
			<Col lg={lgCol}>
				If the {_.startCase(entityType)} you want to add appears in the results
				below, click on it to inspect it before adding a possible duplicate.<br/>
				<small>Ctrl/Cmd + click to open in a new tab</small>
				<SearchResults condensed results={searchResults}/>
			</Col>
		</Row>;
		const duplicateAlert = this.renderDuplicateAlert(warnIfExists, disambiguationDefaultValue, exactMatches, entityType, lgCol);
		const heading = <h2>{`What is the ${_.startCase(entityType)} called?`}</h2>;
		return (
			<div>
				{!isUnifiedForm && heading}
				<Row>
					<Col lg={lgCol}>
						<NameField
							defaultValue={nameValue}
							empty={isAliasEmpty(
								nameValue, sortNameValue, languageValue
							)}
							error={!validateNameSectionName(nameValue)}
							inputRef={this.updateNameFieldInputRef}
							tooltipText={`Official name of the ${_.startCase(entityType)} in its original language.
								Names in other languages should be added as aliases.`}
							warn={(isRequiredDisambiguationEmpty(
								warnIfExists,
								disambiguationDefaultValue
							))}
							onChange={this.handleNameChange}
						/>
					</Col>
					{!isModal && duplicateAlert}
				</Row>
				{
					!isModal && duplicateSuggestions
				}
				<Row>
					<Col lg={lgCol}>
						<SortNameField
							defaultValue={sortNameValue}
							empty={isAliasEmpty(
								nameValue, sortNameValue, languageValue
							)}
							error={!validateNameSectionSortName(sortNameValue)}
							storedNameValue={nameValue}
							onChange={onSortNameChange}
						/>
					</Col>
				</Row>
				<Row>
					<Col lg={lgCol}>
						<ImmutableLanguageField
							empty={isAliasEmpty(
								nameValue, sortNameValue, languageValue
							)}
							error={!validateNameSectionLanguage(languageValue)}
							instanceId="language"
							options={languageOptionsForDisplay}
							tooltipText="Language used for the above name"
							value={languageOption}
							onChange={onLanguageChange}
						/>
					</Col>
				</Row>
				<Row>
					<Col lg={lgCol}>
						<DisambiguationField
							defaultValue={disambiguationDefaultValue}
							error={isRequiredDisambiguationEmpty(
								warnIfExists,
								disambiguationDefaultValue
							) ||
								!validateNameSectionDisambiguation(
									disambiguationDefaultValue
								)}
							required={warnIfExists}
							onChange={onDisambiguationChange}
						/>
					</Col>
				</Row>
				{isModal && <Row>{duplicateAlert}</Row>}
				{
					isModal && duplicateSuggestions
				}
			</div>
		);
	}
}
NameSection.displayName = 'NameSection';
NameSection.propTypes = {
	action: PropTypes.string,
	disambiguationDefaultValue: PropTypes.string,
	entityType: entityTypeProperty.isRequired,
	exactMatches: PropTypes.array,
	isModal: PropTypes.bool,
	isUnifiedForm: PropTypes.bool,
	languageOptions: PropTypes.array.isRequired,
	languageValue: PropTypes.number,
	nameValue: PropTypes.string.isRequired,
	onDisambiguationChange: PropTypes.func.isRequired,
	onLanguageChange: PropTypes.func.isRequired,
	onNameChange: PropTypes.func.isRequired,
	onNameChangeCheckIfEditionGroupExists: PropTypes.func.isRequired,
	onNameChangeCheckIfExists: PropTypes.func.isRequired,
	onNameChangeSearchName: PropTypes.func.isRequired,
	onSortNameChange: PropTypes.func.isRequired,
	searchForExistingEditionGroup: PropTypes.bool,
	searchResults: PropTypes.array,
	sortNameValue: PropTypes.string.isRequired
};
NameSection.defaultProps = {
	action: 'create',
	disambiguationDefaultValue: null,
	exactMatches: [],
	isModal: false,
	isUnifiedForm: false,
	languageValue: null,
	searchForExistingEditionGroup: true,
	searchResults: []
};


function mapStateToProps(rootState, {isUnifiedForm, setDefault}) {
	const state = rootState.get('nameSection');
	const editionSectionState = rootState.get('editionSection');
	const searchForExistingEditionGroup = Boolean(editionSectionState) &&
	(
		!editionSectionState.get('editionGroup') ||
		editionSectionState.get('editionGroupRequired')
	);
	// to prevent double double state updates on action caused by modal
	if (isUnifiedForm && setDefault) {
		return {
			disambiguationDefaultValue: '',
			exactMatches: Immutable.Map([]),
			languageValue: null,
			nameValue: '',
			searchResults: Immutable.Map([]),
			sortNameValue: ''
		};
	}
	return {
		disambiguationDefaultValue: state.get('disambiguation'),
		exactMatches: state.get('exactMatches'),
		languageValue: state.get('language'),
		nameValue: state.get('name'),
		searchForExistingEditionGroup,
		searchResults: state.get('searchResults'),
		sortNameValue: state.get('sortName')
	};
}

function mapDispatchToProps(dispatch, {entity, entityType, copyLanguages}) {
	const entityBBID = entity && entity.bbid;
	return {
		onDisambiguationChange: (event) =>
			dispatch(debouncedUpdateDisambiguationField(event.target.value)),
		onLanguageChange: (value) =>
			dispatch(updateLanguageField(value && value.value)) && copyLanguages && dispatch(addLanguage(value)),
		onNameChange: (value) =>
			dispatch(debouncedUpdateNameField(value)),
		onNameChangeCheckIfEditionGroupExists: _.debounce((value) => {
			dispatch(checkIfNameExists(value, entityBBID, 'EditionGroup', UPDATE_WARN_IF_EDITION_GROUP_EXISTS));
		}, 1500),
		onNameChangeCheckIfExists: _.debounce((value) => {
			dispatch(checkIfNameExists(value, entityBBID, entityType));
		}, 500),
		onNameChangeSearchName: _.debounce((value) => {
			dispatch(searchName(value, entityBBID, entityType));
		}, 500),
		onSortNameChange: (event) =>
			dispatch(debouncedUpdateSortNameField(event.target.value))
	};
}

export default connect(mapStateToProps, mapDispatchToProps)(NameSection);
