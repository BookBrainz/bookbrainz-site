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
const passport = require('passport');
const MusicBrainzOAuth2Strategy =
	require('passport-musicbrainz-oauth2').Strategy;
const status = require('http-status');

const Editor = require('bookbrainz-data').Editor;

const error = require('../helpers/error');

const NotAuthenticatedError = require('../helpers/error').NotAuthenticatedError;

const auth = {};
const _ = require('lodash');

const config = require('./config');

async function _linkMBAccount(bbUserJSON, mbUserJSON) {
	const fetchedEditor = await new Editor({id: bbUserJSON.id})
		.fetch({require: true});

	return fetchedEditor.save({
		metabrainzUserId: mbUserJSON.metabrainz_user_id,
		cachedMetabrainzName: mbUserJSON.sub
	});
}

function _getAccountByMBUserId(mbUserJSON) {
	return new Editor({metabrainzUserId: mbUserJSON.metabrainz_user_id})
		.fetch({require: true});
}

function _updateCachedMBName(bbUserModel, mbUserJSON) {
	return bbUserModel.save({cachedMetabrainzName: mbUserJSON.sub});
}

auth.init = (app) => {
	passport.use(new MusicBrainzOAuth2Strategy(
		_.assign(
			{
				scope: 'profile',
				passReqToCallback: true
			}, config.musicbrainz
		),
		async (req, accessToken, refreshToken, profile, done) => {
			try {
				if (req.user) {
					const linkedUser = await _linkMBAccount(req.user, profile);

					// Logged in, associate
					return done(null, linkedUser.toJSON());
				}

				// Not logged in, authenticate
				const fetchedUser = await _getAccountByMBUserId(profile);

				await _updateCachedMBName(fetchedUser, profile);

				return done(null, fetchedUser.toJSON());
			}
			catch (err) {
				return done(null, false, profile);
			}
		}
	));

	passport.serializeUser((user, done) => {
		done(null, user);
	});

	passport.deserializeUser((user, done) => {
		done(null, user);
	});

	app.use(passport.initialize());
	app.use(passport.session());
};

auth.isAuthenticated = (req, res, next) => {
	if (req.isAuthenticated()) {
		return next();
	}

	req.session.redirectTo = req.originalUrl;

	return res.redirect(status.SEE_OTHER, '/auth');
};

auth.isAuthenticatedForHandler = (req, res, next) => {
	if (req.isAuthenticated()) {
		return next();
	}

	return error.sendErrorAsJSON(res, new NotAuthenticatedError());
};

module.exports = auth;
