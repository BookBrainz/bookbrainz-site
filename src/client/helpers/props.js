/*
 * Copyright (C) 2017  Daniel Hsing
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

import {omit, pick} from 'lodash';


const LAYOUT_PROPS = [
	'alerts',
	'hideSearch',
	'homepage',
	'mergeQueue',
	'repositoryUrl',
	'requiresJS',
	'siteRevision',
	'user'
];

const EDITOR_PROPS = [
	'editor',
	'tabActive',
	'user'
];

export function extractLayoutProps(props) {
	return pick(props, LAYOUT_PROPS);
}

export function extractEditorProps(props) {
	return pick(props, EDITOR_PROPS);
}

export function extractChildProps(props) {
	const finalProps = omit(props, LAYOUT_PROPS);
	finalProps.user = props.user;
	return finalProps;
}

export function extractEntityProps(props) {
	return {
		alert: props.alert,
		entity: props.entity,
		genderOptions: props.genderOptions,
		identifierTypes: props.identifierTypes,
		user: props.user,
		wikipediaExtract: props.wikipediaExtract
	};
}

export function extractPreviewProps(props) {
	return {
		baseUrl: props.baseUrl,
		formBody: props.formBody,
		originalUrl: props.originalUrl,
		sourceUrl: props.sourceUrl
	};
}
