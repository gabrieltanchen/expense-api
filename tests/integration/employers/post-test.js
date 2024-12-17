import chai from 'chai';
import chaiHttp from 'chai-http';
import sinon from 'sinon';

import sampleData from '../../sample-data/index.js';
import TestHelper from '../../test-helper/index.js';

const assert = chai.assert;
const expect = chai.expect;

chai.use(chaiHttp);

describe('Integration - POST /employers', function() {
  let controllers;
  let models;
  let server;
  const testHelper = new TestHelper();

  let createEmployerSpy;

  let userToken;
  let userUuid;

  before('get server', async function() {
    this.timeout(30000);
    const app = await testHelper.getApp();
    controllers = app.get('controllers');
    models = app.get('models');
    server = await testHelper.getServer();
  });

  before('create sinon spies', function() {
    createEmployerSpy = sinon.spy(controllers.EmployerCtrl, 'createEmployer');
  });

  after('restore sinon spies', function() {
    createEmployerSpy.restore();
  });

  after('cleanup', async function() {
    await testHelper.cleanup();
  });

  beforeEach('create user 1', async function() {
    const apiCall = await models.Audit.ApiCall.create();
    userUuid = await controllers.UserCtrl.signUp({
      auditApiCallUuid: apiCall.get('uuid'),
      email: sampleData.users.user1.email,
      firstName: sampleData.users.user1.firstName,
      lastName: sampleData.users.user1.lastName,
      password: sampleData.users.user1.password,
    });
  });

  beforeEach('create user 1 token', async function() {
    userToken = await controllers.UserCtrl.getToken(userUuid);
  });

  afterEach('reset history for sinon spies', function() {
    createEmployerSpy.resetHistory();
  });

  afterEach('truncate tables', async function() {
    this.timeout(10000);
    await testHelper.truncateTables();
  });

  it('should return 401 with no auth token', async function() {
    const res = await chai.request(server)
      .post('/employers')
      .set('Content-Type', 'application/vnd.api+json')
      .send({
        'data': {
          'attributes': {
            'name': sampleData.employers.employer1.name,
          },
          'type': 'employers',
        },
      });
    expect(res).to.have.status(401);
    assert.deepEqual(res.body, {
      errors: [{
        detail: 'Unauthorized',
      }],
    });
    assert.strictEqual(createEmployerSpy.callCount, 0);
  });

  it('should return 422 with no name', async function() {
    const res = await chai.request(server)
      .post('/employers')
      .set('Content-Type', 'application/vnd.api+json')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        'data': {
          'attributes': {
            'name': '',
          },
          'type': 'employers',
        },
      });
    expect(res).to.have.status(422);
    assert.deepEqual(res.body, {
      errors: [{
        detail: 'Employer name is required.',
        source: {
          pointer: '/data/attributes/name',
        },
      }],
    });
    assert.strictEqual(createEmployerSpy.callCount, 0);
  });

  it('should return 201 with valid data', async function() {
    const res = await chai.request(server)
      .post('/employers')
      .set('Content-Type', 'application/vnd.api+json')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        'data': {
          'attributes': {
            'name': sampleData.employers.employer1.name,
          },
          'type': 'employers',
        },
      });
    expect(res).to.have.status(201);
    assert.isOk(res.body.data);
    assert.isOk(res.body.data.attributes);
    assert.isOk(res.body.data.attributes['created-at']);
    assert.strictEqual(res.body.data.attributes.name, sampleData.employers.employer1.name);
    assert.isOk(res.body.data.id);
    assert.strictEqual(res.body.data.type, 'employers');

    // Validate EmployerCtrl.createEmployer call.
    assert.strictEqual(createEmployerSpy.callCount, 1);
    const createEmployerParams = createEmployerSpy.getCall(0).args[0];
    assert.isOk(createEmployerParams.auditApiCallUuid);
    assert.strictEqual(createEmployerParams.name, sampleData.employers.employer1.name);

    // Validate API call.
    const apiCall = await models.Audit.ApiCall.findOne({
      attributes: [
        'http_method',
        'ip_address',
        'route',
        'user_agent',
        'user_uuid',
        'uuid',
      ],
      where: {
        uuid: createEmployerParams.auditApiCallUuid,
      },
    });
    assert.isOk(apiCall);
    assert.strictEqual(apiCall.get('http_method'), 'POST');
    assert.isOk(apiCall.get('ip_address'));
    assert.strictEqual(apiCall.get('route'), '/employers');
    assert.strictEqual(apiCall.get('user_uuid'), userUuid);
  });
});
