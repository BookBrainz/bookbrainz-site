/*
 * Copyright (C) 2016  Daniel Hsing
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

/**
 * Injects entity model object with a default alias name property.
 *
 * @param {object} instance - Entity object.
 * @returns {object} - New object with injected properties.
 */
function injectDefaultAliasName(instance) {
	'use strict';
	if (instance && instance.name) {
		return Object.assign({}, instance, {
			defaultAlias: {
				name: instance.name
			}
		});
	}
	return instance;
}

/**
 * Adds extra validation for form fields recording user's birthdays.
 * Specifically checks that a given date value is in the past.
 *
 * @param {string} value - Date that is going to be validated.
 * @returns {boolean} - True if value is a date in the past. False otherwise.
 */
function isValidUserBirthday(value) {
	'use strict';
	return Date.parse(value) < Date.now();
}

exports.injectDefaultAliasName = injectDefaultAliasName;
exports.isValidUserBirthday = isValidUserBirthday;
