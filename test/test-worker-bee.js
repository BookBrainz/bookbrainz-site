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
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const expect = chai.expect;
const rewire = require('rewire');
const Promise = require('bluebird');
const testData = require('../data/test-data.js');
const Achievement = rewire('../src/server/helpers/achievement.js');

const workerBeeIThreshold = 1;
const workerBeeIIThreshold = 10;
const workerBeeIIIThreshold = 100;


module.exports = function tests() {
	beforeEach(() => testData.createWorkerBee());

	afterEach(testData.truncate);

	it('I should be given to someone with a work creation',
		() => {
			Achievement.__set__({
				getTypeCreation:
					testData.typeCreationHelper(
						'work_revision', workerBeeIThreshold
					)
			});

			const achievementPromise = testData.createEditor()
				.then((editor) =>
					Achievement.processEdit(editor.id)
				)
				.then((edit) =>
					edit.workerBee['Worker Bee I']
				);

			return Promise.all([
				expect(achievementPromise).to.eventually.have
				.property('editorId',
					testData.editorAttribs.id),
				expect(achievementPromise).to.eventually.have
				.property('achievementId',
					testData.workerBeeIAttribs.id)
			]);
		}
	);

	it('II should be given to someone with 10 work creations',
		() => {
			Achievement.__set__({
				getTypeCreation:
					testData.typeCreationHelper(
						'work_revision', workerBeeIIThreshold
					)
			});
			const achievementPromise = testData.createEditor()
				.then((editor) =>
					Achievement.processEdit(editor.id)
				)
				.then((edit) =>
					edit.workerBee['Worker Bee II']
				);

			return Promise.all([
				expect(achievementPromise).to.eventually.have
				.property('editorId',
					testData.editorAttribs.id),
				expect(achievementPromise).to.eventually.have
				.property('achievementId',
					testData.workerBeeIIAttribs.id)
			]);
		});

	it('III should be given to someone with 100 work creations',
		() => {
			Achievement.__set__({
				getTypeCreation:
					testData.typeCreationHelper(
						'work_revision', workerBeeIIIThreshold
					)
			});
			const achievementPromise = testData.createEditor()
				.then((editor) =>
					Achievement.processEdit(editor.id)
				)
				.then((edit) =>
					edit.workerBee
				);

			return Promise.all([
				expect(achievementPromise).to.eventually.have.deep
				.property('Worker Bee III.editorId',
					testData.editorAttribs.id),
				expect(achievementPromise).to.eventually.have.deep
				.property('Worker Bee III.achievementId',
					testData.workerBeeIIIAttribs.id),
				expect(achievementPromise).to.eventually.have.deep
				.property('Worker Bee.editorId',
					testData.editorAttribs.id),
				expect(achievementPromise).to.eventually.have.deep
				.property('Worker Bee.titleId',
					testData.workerBeeAttribs.id)
			]);
		});

	it('should not be given to someone with 0 work creations',
		() => {
			Achievement.__set__({
				getTypeCreation:
					testData.typeCreationHelper(
						'work_revision', 0
					)
			});
			const achievementPromise = testData.createEditor()
				.then((editor) =>
					Achievement.processEdit(editor.id)
				)
				.then((edit) =>
					edit.workerBee['Worker Bee I']
				);

			return expect(achievementPromise).to.eventually.equal(false);
		});
};
