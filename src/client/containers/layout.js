/*
 * Copyright (C) 2018  Theodore Fabian Rudy
 * 				 2016  Daniel Hsing
 * 				 2016  Ben Ockmore
 * 				 2016  Sean Burke
 * 				 2016  Ohm Patel
 * 				 2015  Leo Verto
 * 				 2023  Shivam Awasthi
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
import {IdentifierTypeEditorIcon, RelationshipTypeEditorIcon} from '../helpers/utils';
import {PrivilegeType, checkPrivilege} from '../../common/helpers/privileges-utils';
import {
	faBarcode,
	faChartLine, faClipboardQuestion, faFileLines, faGripVertical, faLink, faListUl, faMoon, faNewspaper, faPlus, faQuestionCircle,
	faSearch, faShieldHalved, faSignInAlt, faSignOutAlt, faSun, faTrophy, faUserCircle, faUserGear
} from '@fortawesome/free-solid-svg-icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import Footer from './../components/footer';
import MergeQueue from '../components/pages/parts/merge-queue';
import PropTypes from 'prop-types';
import React from 'react';
import {faSearchengin} from '@fortawesome/free-brands-svg-icons';
import {genEntityIconHTMLElement} from '../helpers/entity';


const {Alert, Button, Form, FormControl, InputGroup, Nav, Navbar, NavDropdown} = bootstrap;

class Layout extends React.Component {
	constructor(props) {
		super(props);
		this.state = {darkMode: false, keepMenuOpen: false, menuOpen: false};
		this.renderNavContent = this.renderNavContent.bind(this);
		this.renderNavHeader = this.renderNavHeader.bind(this);
		this.renderDocsDropdown = this.renderDocsDropdown.bind(this);
		this.handleDropdownToggle = this.handleDropdownToggle.bind(this);
		this.handleDarkMode = this.handleDarkMode.bind(this);
		this.handleDropdownClick = this.handleDropdownClick.bind(this);
		this.handleMouseDown = this.handleMouseDown.bind(this);
	}

	handleDarkMode = () => {
		this.setState(prevState => ({darkMode: !prevState.darkMode}));
	};

	handleMouseDown(event) {
		event.preventDefault();
	}

	handleDropdownToggle(newValue) {
		if (this.state.keepMenuOpen) {
			this.setState({keepMenuOpen: false, menuOpen: true});
		}
		else {
			this.setState({menuOpen: newValue});
		}
	}

	handleDropdownClick(eventKey, event) {
		event.stopPropagation();
		this.setState({keepMenuOpen: true}, this.handleDropdownToggle);
	}

	renderNavHeader() {
		const {homepage} = this.props;

		return (
			<Navbar.Brand className="logo">
				<a href="/">
					{homepage ? (
						<img
							alt="BookBrainz icon"
							src="/images/BookBrainz_logo_icon.svg"
							title="BookBrainz"
						/>
					) : (
						<img
							alt="BookBrainz icon"
							src="/images/BookBrainz_logo_mini.svg"
							title="BookBrainz"
						/>
					)}
				</a>
			</Navbar.Brand>
		);
	}

	renderDocsDropdown() {
		const docsDropdownTitle = (
			<span>
				<FontAwesomeIcon icon={faFileLines}/>
				{'  Docs'}
			</span>
		);
		return (
			<Nav>
				<NavDropdown
					alignRight
					id="docs-dropdown"
					title={docsDropdownTitle}
					onMouseDown={this.handleMouseDown}
				>
					<NavDropdown.Item href="/help">
						<FontAwesomeIcon fixedWidth icon={faQuestionCircle}/>
						{' Help '}
					</NavDropdown.Item>
					<NavDropdown.Item href="/faq">
						<FontAwesomeIcon fixedWidth icon={faClipboardQuestion}/>
						{' FAQs '}
					</NavDropdown.Item>
					<NavDropdown.Item href="/relationship-types">
						<FontAwesomeIcon fixedWidth icon={faLink}/>
						{' Relationship Types '}
					</NavDropdown.Item>
					<NavDropdown.Item href="/identifier-types">
						<FontAwesomeIcon fixedWidth icon={faBarcode}/>
						{' Identifier Types '}
					</NavDropdown.Item>
				</NavDropdown>
			</Nav>
		);
	}

	renderGuestDropdown() {
		const disableSignUp = this.props.disableSignUp ?
			{disabled: true} :
			{};

		return (
			<Nav>
				<Nav.Item>
					<Nav.Link {...disableSignUp} href="/auth">
						<FontAwesomeIcon icon={faSignInAlt}/>
						{' Sign In / Register'}
					</Nav.Link>
				</Nav.Item>
			</Nav>
		);
	}

	renderLoggedInDropdown() {
		const {user} = this.props;

		const createDropdownTitle = (
			<span>
				<FontAwesomeIcon icon={faPlus}/>
				{'  Add'}
			</span>
		);

		const userDropdownTitle = user && (
			<span>
				<FontAwesomeIcon icon={faUserCircle}/>
				{`  ${user.name}`}
			</span>
		);

		const privilegesDropdownTitle = (
			<span>
				<FontAwesomeIcon className="margin-right-0-3" icon={faShieldHalved}/>
				Privileges
			</span>
		);

		const showPrivilegeDropdown = user.privs > 1;
		const adminOptions = (
			<>
				<NavDropdown.Item href="/admin-panel">
					<FontAwesomeIcon fixedWidth className="margin-right-0-3" icon={faUserGear}/>
					Admin Panel
				</NavDropdown.Item>
				<NavDropdown.Item href="/admin-logs">
					<FontAwesomeIcon fixedWidth className="margin-right-0-3" icon={faNewspaper}/>
					Admin Logs
				</NavDropdown.Item>
			</>
		);

		const relationshipTypeEditorOptions = (
			<>
				<NavDropdown.Item href="/relationship-type/create">
					{RelationshipTypeEditorIcon}
					Add Relationship Type
				</NavDropdown.Item>
			</>
		);

		const reindexSearchEngineOption = (
			<>
				<NavDropdown.Item href="/search-admin">
					<FontAwesomeIcon fixedWidth className="margin-right-0-3" icon={faSearchengin}/>
					Search Admin
				</NavDropdown.Item>
			</>
		);

		const identifierTypeEditorOptions = (
			<>
				<NavDropdown.Item href="/identifier-type/create">
					{IdentifierTypeEditorIcon}
					Add Identifier Type
				</NavDropdown.Item>
			</>
		);

		const privilegeDropDown = (
			<NavDropdown
				alignRight
				id="privs-dropdown"
				title={privilegesDropdownTitle}
				onMouseDown={this.handleMouseDown}
			>
				{checkPrivilege(user.privs, PrivilegeType.ADMIN) && adminOptions}
				{checkPrivilege(user.privs, PrivilegeType.RELATIONSHIP_TYPE_EDITOR) && relationshipTypeEditorOptions}
				{checkPrivilege(user.privs, PrivilegeType.IDENTIFIER_TYPE_EDITOR) && identifierTypeEditorOptions}
				{checkPrivilege(user.privs, PrivilegeType.REINDEX_SEARCH_SERVER) && reindexSearchEngineOption}
			</NavDropdown>
		);

		const disableSignUp = this.props.disableSignUp ?
			{disabled: true} :
			{};

		return (
			<Nav>
				{showPrivilegeDropdown && privilegeDropDown}
				<NavDropdown
					alignRight
					id="create-dropdown"
					open={this.state.menuOpen}
					title={createDropdownTitle}
					onMouseDown={this.handleMouseDown}
					onSelect={this.handleDropdownClick}
					onToggle={this.handleDropdownToggle}
				>
					<NavDropdown.Item href="/create">
						{genEntityIconHTMLElement('Book')}
						Book
					</NavDropdown.Item>
					<NavDropdown.Divider/>
					<NavDropdown.Item href="/work/create">
						{genEntityIconHTMLElement('Work')}
						Work
					</NavDropdown.Item>
					<NavDropdown.Item href="/edition/create">
						{genEntityIconHTMLElement('Edition')}
						Edition
					</NavDropdown.Item>
					<NavDropdown.Item href="/edition-group/create">
						{genEntityIconHTMLElement('EditionGroup')}
						Edition Group
					</NavDropdown.Item>
					<NavDropdown.Item href="/series/create">
						{genEntityIconHTMLElement('Series')}
						Series
					</NavDropdown.Item>
					<NavDropdown.Item href="/author/create">
						{genEntityIconHTMLElement('Author')}
						Author
					</NavDropdown.Item>
					<NavDropdown.Item href="/publisher/create">
						{genEntityIconHTMLElement('Publisher')}
						Publisher
					</NavDropdown.Item>
				</NavDropdown>
				<NavDropdown
					alignRight
					id="user-dropdown"
					title={userDropdownTitle}
					onMouseDown={this.handleMouseDown}
				>
					<NavDropdown.Item href={`/editor/${user.id}`}>
						<FontAwesomeIcon fixedWidth icon={faUserCircle}/>
						{' Profile'}
					</NavDropdown.Item>
					<NavDropdown.Item href={`/editor/${user.id}/revisions`}>
						<FontAwesomeIcon fixedWidth icon={faListUl}/>
						{' Revisions'}
					</NavDropdown.Item>
					<NavDropdown.Item href={`/editor/${user.id}/achievements`}>
						<FontAwesomeIcon fixedWidth icon={faTrophy}/>
						{' Achievements'}
					</NavDropdown.Item>
					<NavDropdown.Item href={`/editor/${user.id}/collections`}>
						<FontAwesomeIcon fixedWidth icon={faGripVertical}/>
						{' Collections'}
					</NavDropdown.Item>
					<NavDropdown.Item href="/external-service/">
						<FontAwesomeIcon fixedWidth icon={faLink}/>
						{' External Services'}
					</NavDropdown.Item>
					<NavDropdown.Item {...disableSignUp} href="/logout">
						<FontAwesomeIcon fixedWidth icon={faSignOutAlt}/>
						{' Sign Out'}
					</NavDropdown.Item>
				</NavDropdown>
			</Nav>
		);
	}

	renderSearchForm() {
		return (
			<Form
				inline
				action="/search"
				className="ml-auto mr-3"
				role="search"
			>
				<InputGroup>
					<FormControl required name="q" placeholder="Search for..." type="text"/>
					<InputGroup.Append>
						<Button type="submit" variant="success">
							<FontAwesomeIcon icon={faSearch}/>
						</Button>
					</InputGroup.Append>
				</InputGroup>
			</Form>
		);
	}

	renderNavContent() {
		const {homepage, hideSearch, user} = this.props;

		/*
		 * GOTCHA: Usage of react-bootstrap FormGroup component inside
		 * Navbar.Form causes a DOM mutation
		 */
		const revisionsClassName = homepage || hideSearch ? 'ml-auto' : null;

		return (
			<Navbar.Collapse id="bs-example-navbar-collapse-1">
				{!(homepage || hideSearch) && this.renderSearchForm()}
				<Nav>
					<Nav.Item onClick={this.handleDarkMode}>
						<Nav.Link>
							<FontAwesomeIcon icon={this.state.darkMode ? faSun : faMoon}/>
						</Nav.Link>
					</Nav.Item>
				</Nav>
				<Nav className={revisionsClassName}>
					<Nav.Item>
						<Nav.Link href="/revisions">
							<FontAwesomeIcon icon={faListUl}/>
							{' Revisions '}
						</Nav.Link>
					</Nav.Item>
				</Nav>
				<Nav>
					<Nav.Item>
						<Nav.Link href="/collections">
							<FontAwesomeIcon icon={faGripVertical}/>
							{' Collections '}
						</Nav.Link>
					</Nav.Item>
				</Nav>
				<Nav>
					<Nav.Item>
						<Nav.Link href="/statistics">
							<FontAwesomeIcon icon={faChartLine}/>
							{' Statistics '}
						</Nav.Link>
					</Nav.Item>
				</Nav>
				{this.renderDocsDropdown()}
				{
					user && user.id ?
						this.renderLoggedInDropdown() : this.renderGuestDropdown()
				}
			</Navbar.Collapse>
		);
	}

	render() {
		const {
			homepage,
			siteRevision,
			repositoryUrl,
			children,
			mergeQueue,
			requiresJS
		} = this.props;

		// Shallow merges parents props into child components
		const {darkMode} = this.state;
		const childrenWithProps = React.Children.map(children, child => React.cloneElement(child, {darkMode}));
		const childNode = homepage ?
			childrenWithProps :
			(
				<div className="container" id="content">
					{requiresJS && (
						<div>
							<noscript>
								<div className="alert alert-danger" role="alert">
									This page will not function correctly without
									JavaScript! Please enable JavaScript to use this
									page.
								</div>
							</noscript>
						</div>
					)}
					{childrenWithProps}
					{mergeQueue ?
						<MergeQueue
							mergeQueue={mergeQueue}
						/> : null
					}
				</div>
			);

		const alerts = this.props.alerts.map((alert, idx) => (
			// eslint-disable-next-line react/no-array-index-key
			<Alert className="text-center" key={idx} variant={alert.level}>
				<p>{alert.message}</p>
			</Alert>
		));

		return (
			<div>
				<a className="sr-only sr-only-focusable" href="#content">
					Skip to main content
				</a>
				<Navbar className={`BookBrainz ${this.state.darkMode ? 'dark-mode' : ''}`} expand="lg" fixed="top" role="navigation">
					{this.renderNavHeader()}
					<Navbar.Toggle/>
					{this.renderNavContent()}
				</Navbar>
				{alerts}
				{childNode}
				<Footer
					darkMode={this.state.darkMode}
					repositoryUrl={repositoryUrl}
					siteRevision={siteRevision}
				/>
			</div>
		);
	}
}

Layout.displayName = 'Layout';
Layout.propTypes = {
	alerts: PropTypes.array.isRequired,
	children: PropTypes.node.isRequired,
	disableSignUp: PropTypes.bool,
	hideSearch: PropTypes.bool,
	homepage: PropTypes.bool,
	mergeQueue: PropTypes.object,
	repositoryUrl: PropTypes.string.isRequired,
	requiresJS: PropTypes.bool,
	siteRevision: PropTypes.string.isRequired,
	user: PropTypes.object
};
Layout.defaultProps = {
	disableSignUp: false,
	hideSearch: false,
	homepage: false,
	mergeQueue: null,
	requiresJS: false,
	user: null
};

export default Layout;
