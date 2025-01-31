/*
 * Copyright (C) 2016  Daniel Hsing
 *               2016  Ben Ockmore
 *               2016  Sean Burke
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

import PropTypes from 'prop-types';
import React from 'react';


const {Col, Container, Row} = bootstrap;

function Footer(props) {
	const {darkMode, repositoryUrl, siteRevision} = props;

	return (
		<footer className={`footer ${darkMode ? 'dark-mode' : ''}`}>
			<Container fluid>
				<Row>
					<Col xs={4}>
						<small>{'Tested with '}
							<a
								href="https://www.browserstack.com/"
								rel="noopener noreferrer"
								target="_blank"
							>
								<img
									alt="BrowserStack Logo"
									height="25"
									src="/images/BrowserStack.png"
								/>
							</a>
						</small>
					</Col>
					<Col className="text-center" xs={4}>
						<small>Cover image by{' '}
							<a href="https://commons.wikimedia.org/wiki/File:Bookshelf.jpg">
								Stewart Butterfield
							</a> (
							<a href="https://creativecommons.org/licenses/by/2.0/deed.en">
								CC-BY-2.0
							</a>)
						</small>
					</Col>
					<Col className="text-right" xs={4}>
						<div className="small">
							<a href="/admin-logs">
								Admin Logs
							</a>
						</div>
						<div className="small">
							<a href="/privacy">
								Privacy & Terms
							</a>
						</div>
					</Col>
				</Row>
				<Row>
					<Col className="text-center" xs={12}>
						<small>
							Alpha Software —{' '}
							<a href={`${repositoryUrl}tree/${siteRevision || 'master'}`}>
								{siteRevision || 'unknown revision'}
							</a> —&nbsp;
							<a href="https://tickets.metabrainz.org/projects/BB/issues/">
								Report a Bug
							</a>
						</small>
					</Col>
				</Row>
			</Container>
		</footer>
	);
}

Footer.displayName = 'Footer';
Footer.propTypes = {
	darkMode: PropTypes.bool.isRequired,
	repositoryUrl: PropTypes.string.isRequired,
	siteRevision: PropTypes.string.isRequired
};

export default Footer;
