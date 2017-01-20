/*
 * Copyright (C) 2016       Ben Ockmore
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
const express = require('express');
const router = express.Router();

const passport = require('passport');
const status = require('http-status');

router.get('/auth', passport.authenticate('musicbrainz-oauth2'));

router.get('/cb',
	(req, res, next) => {
		passport.authenticate('musicbrainz-oauth2', (authErr, user, info) => {
			if (authErr) {
				return next(authErr);
			}

			if (!user) {
				// Set profile in session, and continue to registration
				req.session.mbProfile = info;
				return res.redirect('/register/details');
			}

			return req.logIn(user, (loginErr) => {
				if (loginErr) {
					return next(loginErr);
				}

				const redirectTo =
					req.session.redirectTo ? req.session.redirectTo : '/';
				req.session.redirectTo = null;
				return res.redirect(redirectTo);
			});
		})(req, res, next);
	}
);

router.get('/logout', (req, res) => {
	req.logOut();
	res.redirect(status.SEE_OTHER, '/');
});

module.exports = router;
