import {createEditionGroup, getRandomUUID, truncateEntities} from '../../../../test-helpers/create-entities';

import app from '../../../../../src/server/app';
import chai from 'chai';
import chaiHttp from 'chai-http';

chai.use(chaiHttp);
const {expect} = chai;

describe('Edition Group routes', () => {
	const aBBID = getRandomUUID();
	const inValidBBID = 'have-you-seen-the-fnords';

	before(async () => {
		await createEditionGroup(aBBID);
	});
	after(truncateEntities);

	it('should throw an error if requested BBID is invalid', (done) => {
		chai.request(app)
			.get(`/edition-group/${inValidBBID}`)
			.end((err, res) => {
				expect(err).to.be.null;
				expect(res).to.have.status(400);
				done();
			});
	});
	it('should not throw an error if creating new edition-group', async () => {
		const res = await chai.request(app)
			.get('/edition-group/create');
		expect(res.ok).to.be.true;
		expect(res).to.have.status(200);
	});
	it('should not throw an error if requested edition group BBID exists', async () => {
		const res = await chai.request(app)
			.get(`/edition-group/${aBBID}`);
		expect(res.ok).to.be.true;
		expect(res).to.have.status(200);
	});
	it('should not throw an error trying to edit an existing edition group', async () => {
		const res = await chai.request(app)
			.get(`/edition-group/${aBBID}/edit`);
		expect(res.ok).to.be.true;
		expect(res).to.have.status(200);
	});
	it('should not throw an error deleting an edition group', async () => {
		const res = await chai.request(app)
			.get(`/edition-group/${aBBID}/delete`);
		expect(res.ok).to.be.true;
		expect(res).to.have.status(200);
	});
	it('should not throw an error for edition group revisions', async () => {
		const res = await chai.request(app)
			.get(`/edition-group/${aBBID}/revisions`);
		expect(res.ok).to.be.true;
		expect(res).to.have.status(200);
	});
	it('should not throw an error for revision JSON page', async () => {
		const res = await chai.request(app)
			.get(`/edition-group/${aBBID}/revisions/revisions`);
		expect(res.ok).to.be.true;
		expect(res).to.have.status(200);
	});
});
