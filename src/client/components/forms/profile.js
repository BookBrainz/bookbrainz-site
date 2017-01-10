/*
 * Copyright (C) 2015       Ben Ockmore
 *               2015-2016  Sean Burke
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
const React = require('react');
const request = require('superagent-bluebird-promise');

const Grid = require('react-bootstrap').Grid;
const Row = require('react-bootstrap').Row;
const Button = require('react-bootstrap').Button;
const Input = require('react-bootstrap').Input;
const Col = require('react-bootstrap').Col;

const LoadingSpinner = require('../loading-spinner');
const Select = require('../input/select2');
const SearchSelect = require('../input/entity-search');
const PartialDate = require('../input/partial-date');

const validators = require('../../helpers/react-validators');
const injectDefaultAliasName =
	require('../../helpers/utils').injectDefaultAliasName;

class ProfileForm extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			bio: props.editor.bio,
			title: toString(props.editor.titleUnlockId),
			area: props.editor.area ?
				props.editor.area : null,
			name: props.editor.name,
			gender: props.editor.gender ?
				props.editor.gender : null,
			birthDate: props.editor.birthDate ?
				new Date(props.editor.birthDate) : null,
			titles: props.titles,
			genders: props.genders,
			waiting: false
		};

		// React does not autobind non-React class methods
		this.handleSubmit = this.handleSubmit.bind(this);
		this.valid = this.valid.bind(this);
	}

	handleSubmit(evt) {
		evt.preventDefault();
		if (!this.valid()) {
			return;
		}
		const area = this.area.getValue();
		const gender = this.gender.getValue();
		const title = this.title && this.title.getValue();
		const name = this.name.getValue().trim();
		const bio = this.bio.getValue().trim();
		const birthDate = this.birthDate.getValue();

		const data = {
			genderId: gender ? parseInt(gender, 10) : null,
			areaId: area ? parseInt(area.id, 10) : null,
			bio,
			title,
			name,
			id: this.props.editor.id,
			birthDate
		};

		request.post('/editor/edit/handler')
			.send(data).promise()
			.then(() => {
				window.location.href = `/editor/${this.props.editor.id}`;
			});
	}

	valid() {
		return this.birthDate.valid() && this.name.getValue();
	}

	render() {
		const loadingElement =
			this.state.waiting ? <LoadingSpinner/> : null;
		const select2Options = {
			width: '100%',
			allowClear: true
		};
		const birthDate = this.state.birthDate;
		const genderOptions = this.state.genders.map((gender) => ({
			id: gender.id,
			name: gender.name
		}));
		const titleOptions = this.state.titles.map((unlock) => {
			const title = unlock.title;
			title.unlockId = unlock.id;
			return title;
		});

		const initialDisplayName = this.state.name;
		const initialGender = this.state.gender ? this.state.gender.id : null;
		const initialBio = this.state.bio;
		const initialArea = injectDefaultAliasName(this.state.area);
		let initialBirthDate = null;
		if (birthDate) {
			const year = birthDate.getFullYear();
			const month = birthDate.getMonth() < 9 ?
				`0${birthDate.getMonth() + 1}` : birthDate.getMonth() + 1;
			const day = birthDate.getDay() < 10 ? `0${birthDate.getDay()}` :
				birthDate.getDay();
			initialBirthDate = `${year}-${month}-${day}`;
		}

		function birthdayValidation(value) {
			return Date.parse(value) < Date.now();
		}

		return (
			<Grid>
				<h1>Edit Profile</h1>
				<Row>
					<Col md={12}>
						<p className="lead">Edit your public profile.</p>
					</Col>
				</Row>
				<Row>
					<Col
						id="profileForm"
						md={6}
						mdOffset={3}
					>
						<form
							className="form-horizontal"
							onSubmit={this.handleSubmit}
						>
							{loadingElement}
							<Input
								defaultValue={initialDisplayName}
								label="Display Name"
								ref={(ref) => this.name = ref}
								type="text"
							/>
							<Input
								defaultValue={initialBio}
								label="Bio"
								ref={(ref) => this.bio = ref}
								type="textarea"
							/>
							{titleOptions.length > 0 &&
								<Select
									idAttribute="unlockId"
									label="Title"
									labelAttribute="title"
									options={titleOptions}
									placeholder="Select title"
									ref={(ref) => this.title = ref}
								/>
							}
							<SearchSelect
								noDefault
								collection="area"
								defaultValue={initialArea}
								label="Area"
								placeholder="Select area..."
								ref={(ref) => this.area = ref}
								select2Options={select2Options}
							/>
							<Select
								defaultValue={initialGender}
								idAttribute="id"
								label="Gender"
								labelAttribute="name"
								options={genderOptions}
								placeholder="Select Gender"
								ref={(ref) => this.gender = ref}
							/>
							<PartialDate
								customValidation={birthdayValidation}
								defaultValue={initialBirthDate}
								label="Birth Date"
								placeholder="YYYY-MM-DD"
								ref={(ref) => this.birthDate = ref}
							/>
							<div className="form-group text-center">
								<Button
									bsSize="large"
									bsStyle="primary"
									type="submit"
								>
									Update!
								</Button>
							</div>
						</form>
					</Col>
				</Row>
			</Grid>
		);
	}
}

ProfileForm.displayName = 'ProfileForm';
ProfileForm.propTypes = {
	editor: React.PropTypes.shape({
		id: React.PropTypes.number,
		area: validators.labeledProperty,
		bio: React.PropTypes.string,
		titleUnlockId: React.PropTypes.number
	}),
	genders: React.PropTypes.array,
	titles: React.PropTypes.array
};

module.exports = ProfileForm;
