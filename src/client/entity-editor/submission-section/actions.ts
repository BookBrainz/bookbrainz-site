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


import {EntityTypeString} from 'bookbrainz-data/lib/types/entity';
import type {Map} from 'immutable';
import _ from 'lodash';
import {filterObject} from '../../../common/helpers/utils';
import request from 'superagent';

export const SET_SUBMIT_ERROR = 'SET_SUBMIT_ERROR';
export const UPDATE_REVISION_NOTE = 'UPDATE_REVISION_NOTE';
export const SET_SUBMITTED = 'SET_SUBMITTED';

export type Action = {
	type: string,
	payload?: unknown,
	meta?: {
		debounce?: string
	},
	error?: string,
	submitted?: boolean,
	value?: string
};

/**
 * Produces an action indicating that the submit error for the editing form
 * should be updated with the provided value. This error is displayed in an
 * Alert if set, to indicate to the user what went wrong.
 *
 * @param {string} error - The error message to be set for the form.
 * @returns {Action} The resulting SET_SUBMIT_ERROR action.
 */
export function setSubmitError(error: string): Action {
	return {
		error,
		type: SET_SUBMIT_ERROR
	};
}

/**
 * Produces an action indicating whether the form  has been submitted or not.
 * This consequently enables or disables the submit button to prevent double submissions
 *
 * @param {boolean} submitted - Boolean indicating if the form has been submitted
 * @returns {Action} The resulting SET_SUBMITTED action.
 */
export function setSubmitted(submitted: boolean): Action {
	return {
		submitted,
		type: SET_SUBMITTED
	};
}

/**
 * Produces an action indicating that the revision note for the editing form
 * should be updated with the provided value. The action is marked to be
 * debounced by the keystroke debouncer defined for redux-debounce.
 *
 * @param {string} value - The new value to be used for the revision note.
 * @returns {Action} The resulting UPDATE_REVISION_NOTE action.
 */
export function debounceUpdateRevisionNote(value: string): Action {
	return {
		meta: {debounce: 'keystroke'},
		type: UPDATE_REVISION_NOTE,
		value
	};
}

type Response = {
	body: {
		bbid: string,
		alert?: string
	}
};

function postSubmission(url: string, data: Map<string, any>): Promise<void> {
	/*
	 * TODO: Not the best way to do this, but once we unify the
	 * /<entity>/create/handler and /<entity>/edit/handler URLs, we can simply
	 * pass the entity type and generate both URLs from that.
	 */

	const [, submissionEntity] = url.split('/');
	return request.post(url).send(Object.fromEntries(data as unknown as Iterable<any[]>))
		.then((response: Response) => {
			if (!response.body) {
				window.location.replace('/login');
			}

			const redirectUrl = `/${submissionEntity}/${response.body.bbid}`;
			if (response.body.alert) {
				const alertParam = `?alert=${response.body.alert}`;
				window.location.href = `${redirectUrl}${alertParam}`;
			}
			else {
				window.location.href = redirectUrl;
			}
		});
}
function transformFormData(data:Record<string, any>):Record<string, any> {
	const newData = {};
	const nextId = 0;
	// add new series
	_.forEach(data.Series, (series, sid) => {
		// sync local series section with global series section
		series.seriesSection = data.seriesSection;
		// might be possible for series items to not have target id
		_.forEach(series.seriesSection.seriesItems, (item) => {
			_.set(item, 'targetEntity.bbid', series.id);
		});
		series.seriesSection.seriesItems = filterObject(series.seriesSection.seriesItems, (rel) => !rel.attributeSetId);
		// if new items have been added to series, then add series to the post data
		if (_.size(series.seriesSection.seriesItems) > 0) {
			series.__isNew__ = false;
			series.submissionSection = {
				note: 'added more series items'
			};
			newData[sid] = series;
		}
	});
	// add new works
	const authorWorkRelationshipTypeId = 8;
	_.forEach(data.Works, (work, wid) => {
		// if authors have been added to the work, then add work to the post data
		if (!work.checked) { return; }
		let relationshipCount = 0;
		// hashset in order to avoid duplicate relationships
		const authorBBIDSet = new Set();
		if (work.relationshipSet) {
			_.forEach(work.relationshipSet.relationships, (rel) => {
				if (rel.typeId === authorWorkRelationshipTypeId) {
					authorBBIDSet.add(rel.sourceBbid);
				}
			});
		}
		let flag = false;
		_.forEach(data.authorCreditEditor, (authorCredit) => {
			if (authorBBIDSet.has(authorCredit.author.bbid)) { return; }
			const relationship = {
				attributeSetId: null,
				attributes: [],
				isAdded: true,
				relationshipType: {
					id: authorWorkRelationshipTypeId
				},
				rowId: `a${relationshipCount}`,
				sourceEntity: {
					  bbid: authorCredit.author.id
				},
				targetEntity: {
					bbid: work.id
				  }
			};
			_.set(work, ['relationshipSection', 'relationships', `a${relationshipCount}`], relationship);
			relationshipCount++;
			flag = true;
		});
		if (flag) {
			work.submissionSection = {
				note: 'added authors from parent edition'
			};
			work.__isNew__ = false;
			newData[wid] = work;
		}
	});
	// add edition at last
	if (data.ISBN.type) {
		data.identifierEditor.m0 = data.ISBN;
	}
	data.relationshipSection.relationships = _.mapValues(data.Works, (work, key) => {
		const relationship = {
			attributeSetId: null,
			attributes: [],
			isAdded: true,
			relationshipType: {
				id: 10
			},
			rowID: key,
			sourceEntity: {
			},
			targetEntity: {
				bbid: work.id
			}
		};
		return relationship;
	});
	newData[`e${nextId}`] = {...data, type: 'Edition'};
	return newData;
}

function postUFSubmission(url: string, data: Map<string, any>): Promise<void> {
	// transform data
	const jsonData = data.toJS();
	const postData = transformFormData(jsonData);
	return request.post(url).send(postData)
		.then((response) => {
			if (!response.body) {
				window.location.replace('/login');
			}
			const editionEntity = response.body.find((entity) => entity.type === 'Edition');
			const redirectUrl = `/edition/${editionEntity.bbid}`;
			if (response.body.alert) {
				const alertParam = `?alert=${response.body.alert}`;
				window.location.href = `${redirectUrl}${alertParam}`;
			}
			else {
				window.location.href = redirectUrl;
			}
		});
}

type SubmitResult = (arg1: (Action) => unknown, arg2: () => Map<string, any>) => unknown;
export function submit(
	submissionUrl: string,
	isUnifiedForm = false
): SubmitResult {
	return (dispatch, getState) => {
		const rootState = getState();
		dispatch(setSubmitted(true));
		if (isUnifiedForm) {
			return postUFSubmission(submissionUrl, rootState)
				.catch(
					(error: {message: string}) => {
						const message =
						_.get(error, ['response', 'body', 'error'], null) ||
						error.message;
						dispatch(setSubmitted(false));
						return dispatch(setSubmitError(message));
					}
				);
		}
		return postSubmission(submissionUrl, rootState)
			.catch(
				(error: {message: string}) => {
					/*
					 * Use server-set message first, otherwise internal
					 * superagent message
					 */
					const message =
						_.get(error, ['response', 'body', 'error'], null) ||
						error.message;
					// If there was an error submitting the form, make the submit button clickable again
					dispatch(setSubmitted(false));
					return dispatch(setSubmitError(message));
				}
			);
	};
}

/**
 *
 * @param {string} submissionUrl - The URL to post the submission to
 * @param {string} entityType - The type of entity being submitted
 * @param {Function} callback - A function that adds the entity to the store
 * @param {Object} initialState - The initial state of the entity being submitted, this include some fields which are required by the server
 * @returns {function} - A thunk that posts the submission to the server
 */
export function submitSingleEntity(submissionUrl:string, entityType:EntityTypeString, callback:(newEntity)=>void, initialState = {}):SubmitResult {
	return async (dispatch, getState) => {
		const rootState = getState();
		dispatch(setSubmitted(true));
		const JSONState = rootState.toJS();
		const entity = {...JSONState, type: entityType};
		const postData = {
			0: entity
		};
		try {
			const response = await request.post(submissionUrl).send(postData);
			const mainEntity = response.body[0];
			const entityObject = {...initialState,
				__isNew__: true,
				id: mainEntity.bbid,
				text: mainEntity.name,
				...mainEntity};
			return dispatch(callback(entityObject)) && dispatch(setSubmitted(false));
		}
		catch (error) {
			const message =
						_.get(error, ['response', 'body', 'error'], null) ||
						error.message;
			dispatch(setSubmitted(false));
			return dispatch(setSubmitError(message));
		}
	};
}
