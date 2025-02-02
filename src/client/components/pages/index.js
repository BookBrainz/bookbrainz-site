/*
 * Copyright (C) 2016  Daniel Hsing
 *               2016  Ben Ockmore
 *               2015  Sean Burke
 *               2015  Leo Verto
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

import {faCircle, faCommentDots, faComments, faEnvelope, faListUl, faSearch, faUser, faX} from '@fortawesome/free-solid-svg-icons';

import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import PropTypes from 'prop-types';
import React from 'react';
import RevisionsTable from './parts/revisions-table';
import {faXTwitter} from '@fortawesome/free-brands-svg-icons';


const {Alert, Button, Col, Container, Row} = bootstrap;

class IndexPage extends React.Component {
	constructor(props) {
		super(props);
		this.renderHeader = this.renderHeader.bind(this);
		this.renderContent = this.renderContent.bind(this);
	}

	renderHeader() {
		return (
			<div>
				<Alert className="text-center" variant="warning">
					Under development — adventurous users, please test and
					add data! Give us feedback about bugs, glitches and
					potential improvements at {' '}
					<a href="//tickets.metabrainz.org/projects/BB">
						MetaBrainz JIRA!
					</a>
				</Alert>
				<div id="background-image">
					<div className="text-center" id="background-overlay">
						<Container>
							<img
								alt="BookBrainz logo"
								className="img-fluid center-block"
								src="/images/BookBrainz_text.svg"
								title="BookBrainz"
								width="500"
							/>
							<Row>
								<Col lg={{offset: 2, span: 8}}>
									<form action="/search" className="input-group input-group-lg margin-top-5" role="search">
										<input
											required
											autoFocus="autofocus"
											className="form-control"
											name="q"
											placeholder="Search for..."
											type="text"
										/>
										<span className="input-group-append">
											<Button
												type="submit"
												variant="success"
											>
												<FontAwesomeIcon icon={faSearch}/>
											</Button>
										</span>
									</form>
									<Row className="margin-top-4">
										<Col md={4}>
											<Button
												block
												href="/about"
												size="lg"
												variant="secondary"
											>
												About
											</Button>
										</Col>
										<Col md={4}>
											<Button
												block
												href="/contribute"
												size="lg"
												variant="secondary"
											>
												Contribute
											</Button>
										</Col>
										<Col md={4}>
											<Button
												block
												href="/develop"
												size="lg"
												variant="secondary"
											>
												Develop
											</Button>
										</Col>
									</Row>
									<div className="margin-top-3">
										<h4 className="contact-text">
											Contact Us
										</h4>
										<div style={{
											alignItems: 'center',
											display: 'flex',
											justifyContent: 'center'
										}}
										>
											<FontAwesomeIcon
												className="margin-sides-1 contact-text"
												icon={faCircle}
											/>
											<a className="contact-text" href="https://musicbrainz.org/doc/Communication/ChatBrainz">
												<FontAwesomeIcon
													className="contact-text"
													icon={faCommentDots}
													size="2x"
												/>
												Chat with us<br/>
												<small>(Matrix, IRC, Discord)</small>
											</a>
											<FontAwesomeIcon
												className="margin-sides-1 contact-text"
												icon={faCircle}
											/>
											<a className="contact-text" href="//community.metabrainz.org/c/bookbrainz">
												<FontAwesomeIcon
													className="contact-text"
													icon={faComments}
													size="2x"
												/>
												Forums
											</a>
											<FontAwesomeIcon
												className="margin-sides-1 contact-text"
												icon={faCircle}
											/>

											<a className="contact-text" href="https://x.com/bookbrainz">
												<FontAwesomeIcon
													className="contact-text"
													icon={faX}
													size="2x"
												/>
												X
											</a>
											<FontAwesomeIcon
												className="margin-sides-1 contact-text"
												icon={faCircle}
											/>
											<a className="contact-text" href="mailto:bookbrainz@metabrainz.org">
												<FontAwesomeIcon
													className="contact-text"
													icon={faEnvelope}
													size="2x"
												/>
												Email
											</a>
											<FontAwesomeIcon
												className="margin-sides-1 contact-text"
												icon={faCircle}
											/>
										</div>
									</div>
								</Col>
							</Row>
						</Container>
					</div>
				</div>
			</div>
		);
	}

	renderContent() {
		return (
			<Container>
				<Row>
					<Col lg={{offset: 2, span: 8}}>
						<h1 className="text-center">The Open Book Database</h1>
						<p className="lead text-justify">
							BookBrainz is a project to create an online database
							of information about every single book, magazine,
							journal and other publication ever written. We make
							all the data that we collect available to the whole
							world to consume and use as they see fit. Anyone can
							contribute to BookBrainz, whether through editing
							our information, helping out with development, or
							just spreading the word about our project.
						</p>
					</Col>
				</Row>
				<hr/>
				{!this.props.isLoggedIn && this.renderAboutUs()}
				<div>
					<RevisionsTable
						results={this.props.recent}
						showEntities={this.props.showEntities}
						showRevisionEditor={this.props.showRevisionEditor}
					/>
					<div className="text-center">
						<Button
							href="/revisions"
							variant="primary"
						>
							<FontAwesomeIcon className="margin-right-0-5" icon={faListUl}/>
							See all revisions
						</Button>
					</div>
				</div>
			</Container>
		);
	}

	renderAboutUs() {
		const disableSignUp = this.props.disableSignUp ? {disabled: true} : {};
		return (
			<React.Fragment>
				<Row>
					<Col className="text-center margin-top-4" lg={2}>
						<FontAwesomeIcon icon={faUser} size="5x"/>
					</Col>
					<Col lg={10}>
						<h2>Join Us!</h2>
						<p className="lead">
					First off,{' '}
							<a href="/about" target="blank">
						read about us
							</a>{' and '}
							<a href="/contribute" target="blank">
						how you can help
							</a>. Then, if you think you want
					to stick around, hit the button below to sign up
					for a free BookBrainz account!
						</p>
					</Col>
				</Row>
				<div className="text-center margin-top-1 margin-bottom-3">
					<Button
						{...disableSignUp}
						href="/register"
						size="lg"
						variant="success"
					>
				Register!
					</Button>
				</div>
			</React.Fragment>
		);
	}

	render() {
		return (
			<div>
				{this.renderHeader()}
				{this.renderContent()}
			</div>
		);
	}
}

IndexPage.displayName = 'IndexPage';
IndexPage.propTypes = {
	disableSignUp: PropTypes.bool,
	isLoggedIn: PropTypes.bool.isRequired,
	recent: PropTypes.array.isRequired,
	showEntities: PropTypes.bool,
	showRevisionEditor: PropTypes.bool

};
IndexPage.defaultProps = {
	disableSignUp: false,
	showEntities: true,
	showRevisionEditor: true
};

export default IndexPage;
