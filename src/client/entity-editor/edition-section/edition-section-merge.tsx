/*
 * Copyright (C) 2019 Nicolas Pelletier
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
	updateEditionGroup,
	updateFormat,
	updatePublisher,
	updateStatus
} from './actions';
import {AuthorCredit, updateAuthorCredit} from '../author-credit-editor/actions';
import type {List, Map} from 'immutable';
import {authorCreditToString, entityToOption, transformISODateForSelect} from '../../helpers/entity';

import type {Dispatch} from 'redux';
import EntitySelect from '../common/entity-select';
import {Form} from 'react-bootstrap';
import LinkedEntitySelect from '../common/linked-entity-select';
import MergeField from '../common/merge-field';
import Select from 'react-select';
import _ from 'lodash';
import {connect} from 'react-redux';
import {convertMapToObject} from '../../helpers/utils';


type LanguageOption = {
	name: string,
	id: number
};

type Option = {
	value: string,
	id: number
};

type Publisher = Option;
type EditionGroup = Option;

type OwnProps = {
	mergingEntities: any[]
};

type OptionalNumber = number | null | undefined;
type StateProps = {
	authorCreditValue: Record<string, unknown>,
	depthValue: OptionalNumber,
	formatValue: OptionalNumber,
	heightValue: OptionalNumber,
	languageValues: List<LanguageOption>,
	pagesValue: OptionalNumber,
	publisherValue: Map<string, any>,
	editionGroupValue: Map<string, any>,
	releaseDateValue: Record<string, unknown> | null | undefined,
	statusValue: OptionalNumber,
	weightValue: OptionalNumber,
	widthValue: OptionalNumber
};

type DispatchProps = {
	onAuthorCreditChange: (arg: AuthorCredit) => unknown,
	onDepthChange: (arg: React.ChangeEvent<HTMLInputElement>) => unknown,
	onFormatChange: (arg: number | null | undefined) => unknown,
	onHeightChange: (arg: React.ChangeEvent<HTMLInputElement>) => unknown,
	onPagesChange: (arg: React.ChangeEvent<HTMLInputElement>) => unknown,
	onPublisherChange: (arg: Publisher) => unknown,
	onEditionGroupChange: (arg: EditionGroup) => unknown,
	onReleaseDateChange: (arg: string | null | undefined) => unknown,
	onStatusChange: (arg: number | null | undefined) => unknown,
	onWeightChange: (arg: React.ChangeEvent<HTMLInputElement>) => unknown,
	onWidthChange: (arg: React.ChangeEvent<HTMLInputElement>) => unknown
};

type Props = OwnProps & StateProps & DispatchProps;

/**
 * Container component. The EditionSectionMerge component contains input fields
 * specific to the edition entity. The intention is that this component is
 * rendered as a modular section within the entity editor.
 *
 * @param {Object} props - The properties passed to the component.
 * depthValue
 * @param {number} props.formatValue - The ID of the format currently selected
 *        for the edition.
 * heightValue
 * languageValues
 * mergingEntities
 * onDepthChange
 * @param {Function} props.onFormatChange - A function to be called when
 *        a different edition format is selected.
 * onHeightChange,
	onReleaseDateChange,
	onPagesChange,
	onEditionGroupChange,
	onPublisherChange,
 * @param {Function} props.onStatusChange - A function to be called when
 *        a different edition status is selected.
 * onWeightChange,
	onWidthChange,
	pagesValue,
	editionGroupValue,
	publisherValue,
	releaseDateValue,
 * @param {number} props.statusValue - The ID of the status currently selected
 *        for the edition.
	weightValue,
	widthValue
 * @returns {ReactElement} React element containing the rendered EditionSectionMerge.
 */
function EditionSectionMerge({
	authorCreditValue,
	depthValue,
	formatValue,
	heightValue,
	languageValues,
	mergingEntities,
	onAuthorCreditChange,
	onDepthChange,
	onFormatChange,
	onHeightChange,
	onReleaseDateChange,
	onPagesChange,
	onEditionGroupChange,
	onPublisherChange,
	onStatusChange,
	onWeightChange,
	onWidthChange,
	pagesValue,
	editionGroupValue,
	publisherValue,
	releaseDateValue,
	statusValue,
	weightValue,
	widthValue
}: Props) {
	const editionGroupOptions = [];
	const authorCreditOptions = [];
	const releaseDateOptions = [];
	const depthOptions = [];
	const formatOptions = [];
	const heightOptions = [];
	const pagesOptions = [];
	const publisherOptions = [];
	const statusOptions = [];
	const weightOptions = [];
	const widthOptions = [];

	mergingEntities.forEach(entity => {
		const depth = !_.isNil(entity.depth) && {label: entity.depth, value: entity.depth};
		if (depth && !_.find(depthOptions, ['value', depth.value])) {
			depthOptions.push(depth);
		}
		const editionGroup = !_.isNil(entity.editionGroup) && entityToOption(entity.editionGroup);
		const editionGroupOption = editionGroup && {label: editionGroup.text, value: editionGroup};
		if (editionGroupOption && !_.find(editionGroupOptions, ['value.id', editionGroupOption.value.id])) {
			editionGroupOptions.push(editionGroupOption);
		}

		const authorCredit = !_.isNil(entity.authorCredit) && {label: authorCreditToString(entity.authorCredit), value: entity.authorCredit};
		if (authorCredit && !_.find(authorCreditOptions, ['value.id', authorCredit.value.id])) {
			authorCreditOptions.push(authorCredit);
		}

		const format = entity.editionFormat && {label: entity.editionFormat.label, value: entity.editionFormat.id};
		if (format && !_.find(formatOptions, ['value', format.value])) {
			formatOptions.push(format);
		}
		const height = !_.isNil(entity.height) && {label: entity.height, value: entity.height};
		if (height && !_.find(heightOptions, ['value', height.value])) {
			heightOptions.push(height);
		}
		const pages = !_.isNil(entity.pages) && {label: entity.pages, value: entity.pages};
		if (pages && !_.find(pagesOptions, ['value', pages.value])) {
			pagesOptions.push(pages);
		}
		const publisher = entityToOption(_.get(entity, 'publisherSet.publishers[0]'));
		const publisherOption = publisher && {label: publisher.text, value: publisher};
		if (publisherOption && !_.find(publisherOptions, ['value.id', publisherOption.value.id])) {
			publisherOptions.push(publisherOption);
		}
		const releaseEventDate = _.get(entity, 'releaseEventSet.releaseEvents[0].date');
		const releaseDate = !_.isNil(releaseEventDate) && transformISODateForSelect(releaseEventDate);
		if (releaseDate && !_.find(releaseDateOptions, ['value', releaseDate.value])) {
			releaseDateOptions.push(releaseDate);
		}
		const statusOption = entity.editionStatus && {label: entity.editionStatus.label, value: entity.editionStatus.id};
		if (statusOption && !_.find(statusOptions, ['value', statusOption.value])) {
			statusOptions.push(statusOption);
		}
		const weight = !_.isNil(entity.weight) && {label: entity.weight, value: entity.weight};
		if (weight && !_.find(weightOptions, ['value', weight.value])) {
			weightOptions.push(weight);
		}
		const width = !_.isNil(entity.width) && {label: entity.width, value: entity.width};
		if (width && !_.find(widthOptions, ['value', width.value])) {
			widthOptions.push(width);
		}
	});

	return (
		<div>
			<MergeField
				currentValue={authorCreditValue}
				label="Author Credit"
				options={authorCreditOptions}
				valueRenderer={authorCreditToString}
				onChange={onAuthorCreditChange}
			/>
			<MergeField
				components={{Option: LinkedEntitySelect, SingleValue: EntitySelect}}
				currentValue={editionGroupValue}
				label="Edition Group"
				options={editionGroupOptions}
				onChange={onEditionGroupChange}
			/>
			<MergeField
				currentValue={releaseDateValue}
				label="Release date"
				options={releaseDateOptions}
				onChange={onReleaseDateChange}
			/>
			<MergeField
				components={{Option: LinkedEntitySelect, SingleValue: EntitySelect}}
				currentValue={publisherValue}
				label="Publisher"
				options={publisherOptions}
				onChange={onPublisherChange}
			/>
			<MergeField
				currentValue={formatValue}
				label="Format"
				options={formatOptions}
				onChange={onFormatChange}
			/>
			<MergeField
				currentValue={statusValue}
				label="Status"
				options={statusOptions}
				onChange={onStatusChange}
			/>
			<MergeField
				currentValue={depthValue}
				label="Depth"
				options={depthOptions}
				onChange={onDepthChange}
			/>
			<MergeField
				currentValue={widthValue}
				label="Width"
				options={widthOptions}
				onChange={onWidthChange}
			/>
			<MergeField
				currentValue={heightValue}
				label="Height"
				options={heightOptions}
				onChange={onHeightChange}
			/>
			<MergeField
				currentValue={pagesValue}
				label="Pages"
				options={pagesOptions}
				onChange={onPagesChange}
			/>
			<MergeField
				currentValue={weightValue}
				label="Weight"
				options={weightOptions}
				onChange={onWeightChange}
			/>
			<Form.Group>
				<Form.Label>Languages</Form.Label>
				<Select
					isDisabled
					isMulti
					classNamePrefix="react-select"
					instanceId="languages"
					placeholder="No languages"
					value={languageValues}
				/>
			</Form.Group>
		</div>
	);
}
EditionSectionMerge.displayName = 'EditionSectionMerge';

type RootState = Map<string, Map<string, any>>;
function mapStateToProps(rootState: RootState): StateProps {
	const state: Map<string, any> = rootState.get('editionSection');
	const authorCredit: Map<string, any> = rootState.get('authorCredit');

	return {
		authorCreditValue: convertMapToObject(authorCredit),
		depthValue: state.get('depth'),
		editionGroupValue: convertMapToObject(state.get('editionGroup')),
		formatValue: state.get('format'),
		heightValue: state.get('height'),
		languageValues: convertMapToObject(state.get('languages')),
		pagesValue: state.get('pages'),
		publisherValue: convertMapToObject(state.get('publisher')),
		releaseDateValue: state.get('releaseDate'),
		statusValue: state.get('status'),
		weightValue: state.get('weight'),
		widthValue: state.get('width')
	};
}

function mapDispatchToProps(dispatch: Dispatch<Action>): DispatchProps {
	return {
		onAuthorCreditChange: (selectedAuthorCredit:AuthorCredit) => {
			dispatch(updateAuthorCredit(selectedAuthorCredit));
		},
		onDepthChange: (event) => dispatch(debouncedUpdateDepth(
			event.target.value ? parseFloat(event.target.value) : null
		)),
		onEditionGroupChange: (value) => dispatch(updateEditionGroup(value)),
		onFormatChange: (value: number) =>
			dispatch(updateFormat(value)),
		onHeightChange: (event) => dispatch(debouncedUpdateHeight(
			event.target.value ? parseFloat(event.target.value) : null
		)),
		onPagesChange: (event) => dispatch(debouncedUpdatePages(
			event.target.value ? parseInt(event.target.value, 10) : null
		)),
		onPublisherChange: (value) => dispatch(updatePublisher(value)),
		onReleaseDateChange: (dateString) =>
			dispatch(debouncedUpdateReleaseDate(dateString)),
		onStatusChange: (value: number) =>
			dispatch(updateStatus(value)),
		onWeightChange: (event) => dispatch(debouncedUpdateWeight(
			event.target.value ? parseInt(event.target.value, 10) : null
		)),
		onWidthChange: (event) => dispatch(debouncedUpdateWidth(
			event.target.value ? parseFloat(event.target.value) : null
		))
	};
}

export default connect(mapStateToProps, mapDispatchToProps)(EditionSectionMerge);
