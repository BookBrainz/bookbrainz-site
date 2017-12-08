/*
 * Copyright (C) 2016  Max Prettyjohns
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

import * as achievement from '../lib/server/helpers/achievement';
/* eslint import/namespace: ['error', { allowComputed: true }] */
import * as testData from '../data/test-data.js';
import {expectAchievementIds, expectAchievementIdsNested} from './common';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import orm from './bookbrainz-data';


chai.use(chaiAsPromised);
const {expect} = chai;
const {Editor} = orm;

export default function tests() {
	beforeEach(() => testData.createEditor()
		.then(() =>
			testData.createRevisionist()
		)
	);

	afterEach(testData.truncate);

	it('I should be given to someone with a revision', () => {
		const achievementPromise = new Editor({
			name: testData.editorAttribs.name
		})
			.fetch()
			.then((editor) =>
				editor.set({revisionsApplied: 1})
					.save()
			)
			.then((editor) =>
				achievement.processEdit(orm, editor.id)
			)
			.then((edit) =>
				edit.revisionist['Revisionist I']
			);

		return expectAchievementIds(
			achievementPromise,
			testData.editorAttribs.id,
			testData.revisionistIAttribs.id
		);
	});

	it('II should be given to someone with 50 revisions', () => {
		const revisionsApplied = 50;
		const achievementPromise = new Editor({
			name: testData.editorAttribs.name
		})
			.fetch()
			.then((editor) =>
				editor.set({revisionsApplied})
					.save()
			)
			.then((editor) =>
				achievement.processEdit(orm, editor.id)
			)
			.then((edit) =>
				edit.revisionist
			);

		return Promise.all([
			expect(achievementPromise).to.eventually.have.nested
				.property('Revisionist II.editorId', testData.editorAttribs.id),
			expect(achievementPromise).to.eventually.have.nested
				.property('Revisionist II.achievementId',
					testData.revisionistIIAttribs.id)
		]);
	});

	it('III should be given to someone with 250 revisions',
		() => {
			const revisionsApplied = 250;
			const achievementPromise = new Editor({
				name: testData.editorAttribs.name
			})
				.fetch()
				.then((editor) =>
					editor.set({revisionsApplied})
						.save()
				)
				.then((editor) =>
					achievement.processEdit(orm, editor.id)
				)
				.then((edit) =>
					edit.revisionist
				);

			return expectAchievementIdsNested(
				achievementPromise,
				'Revisionist',
				testData.editorAttribs.id,
				testData.revisionistIIIAttribs.id,
				testData.revisionistAttribs.id,
			);
		});

	it('should not be given to someone without a revision', () => {
		const achievementPromise = new Editor({
			name: testData.editorAttribs.name
		})
			.fetch()
			.then((editor) =>
				achievement.processEdit(orm, editor.id)
			)
			.then((edit) =>
				edit.revisionist['Revisionist I']
			);

		return expect(achievementPromise).to.eventually.equal(false);
	});
}
