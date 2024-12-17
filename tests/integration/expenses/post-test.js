import chai from 'chai';
import chaiHttp from 'chai-http';
import sinon from 'sinon';

import sampleData from '../../sample-data/index.js';
import TestHelper from '../../test-helper/index.js';

const assert = chai.assert;
const expect = chai.expect;

chai.use(chaiHttp);

describe('Integration - POST /expenses', function() {
  let controllers;
  let models;
  let server;
  const testHelper = new TestHelper();

  let createExpenseSpy;

  let fundUuid;
  let householdMemberUuid;
  let subcategoryUuid;
  let userToken;
  let userUuid;
  let vendorUuid;

  before('get server', async function() {
    this.timeout(30000);
    const app = await testHelper.getApp();
    controllers = app.get('controllers');
    models = app.get('models');
    server = await testHelper.getServer();
  });

  before('create sinon spies', function() {
    createExpenseSpy = sinon.spy(controllers.ExpenseCtrl, 'createExpense');
  });

  after('restore sinon spies', function() {
    createExpenseSpy.restore();
  });

  after('cleanup', async function() {
    await testHelper.cleanup();
  });

  beforeEach('create user', async function() {
    const apiCall = await models.Audit.ApiCall.create();
    userUuid = await controllers.UserCtrl.signUp({
      auditApiCallUuid: apiCall.get('uuid'),
      email: sampleData.users.user1.email,
      firstName: sampleData.users.user1.firstName,
      lastName: sampleData.users.user1.lastName,
      password: sampleData.users.user1.password,
    });
  });

  beforeEach('create user token', async function() {
    userToken = await controllers.UserCtrl.getToken(userUuid);
  });

  beforeEach('create category', async function() {
    const apiCall = await models.Audit.ApiCall.create({
      user_uuid: userUuid,
    });
    const categoryUuid = await controllers.CategoryCtrl.createCategory({
      auditApiCallUuid: apiCall.get('uuid'),
      name: sampleData.categories.category1.name,
    });
    subcategoryUuid = await controllers.CategoryCtrl.createSubcategory({
      auditApiCallUuid: apiCall.get('uuid'),
      categoryUuid,
      name: sampleData.categories.category2.name,
    });
  });

  beforeEach('create vendor', async function() {
    const apiCall = await models.Audit.ApiCall.create({
      user_uuid: userUuid,
    });
    vendorUuid = await controllers.VendorCtrl.createVendor({
      auditApiCallUuid: apiCall.get('uuid'),
      name: sampleData.vendors.vendor1.name,
    });
  });

  beforeEach('create household member', async function() {
    const apiCall = await models.Audit.ApiCall.create({
      user_uuid: userUuid,
    });
    householdMemberUuid = await controllers.HouseholdCtrl.createMember({
      auditApiCallUuid: apiCall.get('uuid'),
      name: sampleData.users.user1.firstName,
    });
  });

  beforeEach('create fund', async function() {
    const apiCall = await models.Audit.ApiCall.create({
      user_uuid: userUuid,
    });
    fundUuid = await controllers.FundCtrl.createFund({
      auditApiCallUuid: apiCall.get('uuid'),
      name: sampleData.funds.fund1.name,
    });
  });

  afterEach('reset history for sinon spies', function() {
    createExpenseSpy.resetHistory();
  });

  afterEach('truncate tables', async function() {
    this.timeout(10000);
    await testHelper.truncateTables();
  });

  it('should return 401 with no auth token', async function() {
    const res = await chai.request(server)
      .post('/expenses')
      .set('Content-Type', 'application/vnd.api+json')
      .send({
        'data': {
          'attributes': {
            'amount': sampleData.expenses.expense1.amount_cents,
            'date': sampleData.expenses.expense1.date,
            'description': sampleData.expenses.expense1.description,
            'reimbursed-amount': sampleData.expenses.expense1.reimbursed_cents,
          },
          'relationships': {
            'household-member': {
              'data': {
                'id': householdMemberUuid,
              },
            },
            'subcategory': {
              'data': {
                'id': subcategoryUuid,
              },
            },
            'vendor': {
              'data': {
                'id': vendorUuid,
              },
            },
          },
        },
      });
    expect(res).to.have.status(401);
    assert.deepEqual(res.body, {
      errors: [{
        detail: 'Unauthorized',
      }],
    });
    assert.strictEqual(createExpenseSpy.callCount, 0);
  });

  it('should return 422 with no amount', async function() {
    const res = await chai.request(server)
      .post('/expenses')
      .set('Content-Type', 'application/vnd.api+json')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        'data': {
          'attributes': {
            'amount': null,
            'date': sampleData.expenses.expense1.date,
            'description': sampleData.expenses.expense1.description,
            'reimbursed-amount': sampleData.expenses.expense1.reimbursed_cents,
          },
          'relationships': {
            'household-member': {
              'data': {
                'id': householdMemberUuid,
              },
            },
            'subcategory': {
              'data': {
                'id': subcategoryUuid,
              },
            },
            'vendor': {
              'data': {
                'id': vendorUuid,
              },
            },
          },
        },
      });
    expect(res).to.have.status(422);
    assert.deepEqual(res.body, {
      errors: [{
        detail: 'Amount is required.',
        source: {
          pointer: '/data/attributes/amount',
        },
      }],
    });
    assert.strictEqual(createExpenseSpy.callCount, 0);
  });

  it('should return 422 with an invalid amount', async function() {
    const res = await chai.request(server)
      .post('/expenses')
      .set('Content-Type', 'application/vnd.api+json')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        'data': {
          'attributes': {
            'amount': '12.34',
            'date': sampleData.expenses.expense1.date,
            'description': sampleData.expenses.expense1.description,
            'reimbursed-amount': sampleData.expenses.expense1.reimbursed_cents,
          },
          'relationships': {
            'household-member': {
              'data': {
                'id': householdMemberUuid,
              },
            },
            'subcategory': {
              'data': {
                'id': subcategoryUuid,
              },
            },
            'vendor': {
              'data': {
                'id': vendorUuid,
              },
            },
          },
        },
      });
    expect(res).to.have.status(422);
    assert.deepEqual(res.body, {
      errors: [{
        detail: 'Amount must be an integer.',
        source: {
          pointer: '/data/attributes/amount',
        },
      }],
    });
    assert.strictEqual(createExpenseSpy.callCount, 0);
  });

  it('should return 422 with no date', async function() {
    const res = await chai.request(server)
      .post('/expenses')
      .set('Content-Type', 'application/vnd.api+json')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        'data': {
          'attributes': {
            'amount': sampleData.expenses.expense1.amount_cents,
            'date': null,
            'description': sampleData.expenses.expense1.description,
            'reimbursed-amount': sampleData.expenses.expense1.reimbursed_cents,
          },
          'relationships': {
            'household-member': {
              'data': {
                'id': householdMemberUuid,
              },
            },
            'subcategory': {
              'data': {
                'id': subcategoryUuid,
              },
            },
            'vendor': {
              'data': {
                'id': vendorUuid,
              },
            },
          },
        },
      });
    expect(res).to.have.status(422);
    assert.deepEqual(res.body, {
      errors: [{
        detail: 'Date is required.',
        source: {
          pointer: '/data/attributes/date',
        },
      }, {
        detail: 'Date must be valid.',
        source: {
          pointer: '/data/attributes/date',
        },
      }],
    });
    assert.strictEqual(createExpenseSpy.callCount, 0);
  });

  it('should return 422 with an invalid date', async function() {
    const res = await chai.request(server)
      .post('/expenses')
      .set('Content-Type', 'application/vnd.api+json')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        'data': {
          'attributes': {
            'amount': sampleData.expenses.expense1.amount_cents,
            'date': 'invalid date',
            'description': sampleData.expenses.expense1.description,
            'reimbursed-amount': sampleData.expenses.expense1.reimbursed_cents,
          },
          'relationships': {
            'household-member': {
              'data': {
                'id': householdMemberUuid,
              },
            },
            'subcategory': {
              'data': {
                'id': subcategoryUuid,
              },
            },
            'vendor': {
              'data': {
                'id': vendorUuid,
              },
            },
          },
        },
      });
    expect(res).to.have.status(422);
    assert.deepEqual(res.body, {
      errors: [{
        detail: 'Date must be valid.',
        source: {
          pointer: '/data/attributes/date',
        },
      }],
    });
    assert.strictEqual(createExpenseSpy.callCount, 0);
  });

  it('should return 422 with no reimbursed amount', async function() {
    const res = await chai.request(server)
      .post('/expenses')
      .set('Content-Type', 'application/vnd.api+json')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        'data': {
          'attributes': {
            'amount': sampleData.expenses.expense1.amount_cents,
            'date': sampleData.expenses.expense1.date,
            'description': sampleData.expenses.expense1.description,
            'reimbursed-amount': null,
          },
          'relationships': {
            'household-member': {
              'data': {
                'id': householdMemberUuid,
              },
            },
            'subcategory': {
              'data': {
                'id': subcategoryUuid,
              },
            },
            'vendor': {
              'data': {
                'id': vendorUuid,
              },
            },
          },
        },
      });
    expect(res).to.have.status(422);
    assert.deepEqual(res.body, {
      errors: [{
        detail: 'Reimbursed amount is required.',
        source: {
          pointer: '/data/attributes/reimbursed-amount',
        },
      }],
    });
    assert.strictEqual(createExpenseSpy.callCount, 0);
  });

  it('should return 422 with an invalid reimbursed amount', async function() {
    const res = await chai.request(server)
      .post('/expenses')
      .set('Content-Type', 'application/vnd.api+json')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        'data': {
          'attributes': {
            'amount': sampleData.expenses.expense1.amount_cents,
            'date': sampleData.expenses.expense1.date,
            'description': sampleData.expenses.expense1.description,
            'reimbursed-amount': '12.34',
          },
          'relationships': {
            'household-member': {
              'data': {
                'id': householdMemberUuid,
              },
            },
            'subcategory': {
              'data': {
                'id': subcategoryUuid,
              },
            },
            'vendor': {
              'data': {
                'id': vendorUuid,
              },
            },
          },
        },
      });
    expect(res).to.have.status(422);
    assert.deepEqual(res.body, {
      errors: [{
        detail: 'Reimbursed amount must be an integer.',
        source: {
          pointer: '/data/attributes/reimbursed-amount',
        },
      }],
    });
    assert.strictEqual(createExpenseSpy.callCount, 0);
  });

  it('should return 422 with no subcategory uuid', async function() {
    const res = await chai.request(server)
      .post('/expenses')
      .set('Content-Type', 'application/vnd.api+json')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        'data': {
          'attributes': {
            'amount': sampleData.expenses.expense1.amount_cents,
            'date': sampleData.expenses.expense1.date,
            'description': sampleData.expenses.expense1.description,
            'reimbursed-amount': sampleData.expenses.expense1.reimbursed_cents,
          },
          'relationships': {
            'household-member': {
              'data': {
                'id': householdMemberUuid,
              },
            },
            'subcategory': {
              'data': {
                'id': null,
              },
            },
            'vendor': {
              'data': {
                'id': vendorUuid,
              },
            },
          },
        },
      });
    expect(res).to.have.status(422);
    assert.deepEqual(res.body, {
      errors: [{
        detail: 'Subcategory is required.',
        source: {
          pointer: '/data/relationships/subcategory/data/id',
        },
      }],
    });
    assert.strictEqual(createExpenseSpy.callCount, 0);
  });

  it('should return 422 with no vendor uuid', async function() {
    const res = await chai.request(server)
      .post('/expenses')
      .set('Content-Type', 'application/vnd.api+json')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        'data': {
          'attributes': {
            'amount': sampleData.expenses.expense1.amount_cents,
            'date': sampleData.expenses.expense1.date,
            'description': sampleData.expenses.expense1.description,
            'reimbursed-amount': sampleData.expenses.expense1.reimbursed_cents,
          },
          'relationships': {
            'household-member': {
              'data': {
                'id': householdMemberUuid,
              },
            },
            'subcategory': {
              'data': {
                'id': subcategoryUuid,
              },
            },
            'vendor': {
              'data': {
                'id': null,
              },
            },
          },
        },
      });
    expect(res).to.have.status(422);
    assert.deepEqual(res.body, {
      errors: [{
        detail: 'Vendor is required.',
        source: {
          pointer: '/data/relationships/vendor/data/id',
        },
      }],
    });
    assert.strictEqual(createExpenseSpy.callCount, 0);
  });

  it('should return 422 with no household member uuid', async function() {
    const res = await chai.request(server)
      .post('/expenses')
      .set('Content-Type', 'application/vnd.api+json')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        'data': {
          'attributes': {
            'amount': sampleData.expenses.expense1.amount_cents,
            'date': sampleData.expenses.expense1.date,
            'description': sampleData.expenses.expense1.description,
            'reimbursed-amount': sampleData.expenses.expense1.reimbursed_cents,
          },
          'relationships': {
            'household-member': {
              'data': {
                'id': null,
              },
            },
            'subcategory': {
              'data': {
                'id': subcategoryUuid,
              },
            },
            'vendor': {
              'data': {
                'id': vendorUuid,
              },
            },
          },
        },
      });
    expect(res).to.have.status(422);
    assert.deepEqual(res.body, {
      errors: [{
        detail: 'Member is required.',
        source: {
          pointer: '/data/relationships/household-member/data/id',
        },
      }],
    });
    assert.strictEqual(createExpenseSpy.callCount, 0);
  });

  it('should return 201 with valid data', async function() {
    const res = await chai.request(server)
      .post('/expenses')
      .set('Content-Type', 'application/vnd.api+json')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        'data': {
          'attributes': {
            'amount': sampleData.expenses.expense1.amount_cents,
            'date': sampleData.expenses.expense1.date,
            'description': sampleData.expenses.expense1.description,
            'reimbursed-amount': sampleData.expenses.expense1.reimbursed_cents,
          },
          'relationships': {
            'household-member': {
              'data': {
                'id': householdMemberUuid,
              },
            },
            'subcategory': {
              'data': {
                'id': subcategoryUuid,
              },
            },
            'vendor': {
              'data': {
                'id': vendorUuid,
              },
            },
          },
        },
      });
    expect(res).to.have.status(201);
    assert.isOk(res.body.data);
    assert.isOk(res.body.data.attributes);
    assert.strictEqual(res.body.data.attributes.amount, sampleData.expenses.expense1.amount_cents);
    assert.isOk(res.body.data.attributes['created-at']);
    assert.strictEqual(res.body.data.attributes.date, sampleData.expenses.expense1.date);
    assert.strictEqual(
      res.body.data.attributes.description,
      sampleData.expenses.expense1.description,
    );
    assert.strictEqual(res.body.data.attributes['reimbursed-amount'], sampleData.expenses.expense1.reimbursed_cents);
    assert.isOk(res.body.data.id);
    assert.isOk(res.body.data.relationships);
    assert.isNotOk(res.body.data.relationships.fund);
    assert.isOk(res.body.data.relationships['household-member']);
    assert.isOk(res.body.data.relationships['household-member'].data);
    assert.strictEqual(res.body.data.relationships['household-member'].data.id, householdMemberUuid);
    assert.isOk(res.body.data.relationships.subcategory);
    assert.isOk(res.body.data.relationships.subcategory.data);
    assert.strictEqual(res.body.data.relationships.subcategory.data.id, subcategoryUuid);
    assert.isOk(res.body.data.relationships.vendor);
    assert.isOk(res.body.data.relationships.vendor.data);
    assert.strictEqual(res.body.data.relationships.vendor.data.id, vendorUuid);
    assert.strictEqual(res.body.data.type, 'expenses');

    // Validate ExpenseCtrl.createExpense call.
    assert.strictEqual(createExpenseSpy.callCount, 1);
    const createExpenseParams = createExpenseSpy.getCall(0).args[0];
    assert.strictEqual(createExpenseParams.amount, sampleData.expenses.expense1.amount_cents);
    assert.isOk(createExpenseParams.auditApiCallUuid);
    assert.strictEqual(createExpenseParams.subcategoryUuid, subcategoryUuid);
    assert.strictEqual(createExpenseParams.date, sampleData.expenses.expense1.date);
    assert.strictEqual(createExpenseParams.description, sampleData.expenses.expense1.description);
    assert.isNotOk(createExpenseParams.fundUuid);
    assert.strictEqual(createExpenseParams.householdMemberUuid, householdMemberUuid);
    assert.strictEqual(
      createExpenseParams.reimbursedAmount,
      sampleData.expenses.expense1.reimbursed_cents,
    );
    assert.strictEqual(createExpenseParams.vendorUuid, vendorUuid);

    // Validate Audit API call.
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
        uuid: createExpenseParams.auditApiCallUuid,
      },
    });
    assert.isOk(apiCall);
    assert.strictEqual(apiCall.get('http_method'), 'POST');
    assert.isOk(apiCall.get('ip_address'));
    assert.strictEqual(apiCall.get('route'), '/expenses');
    assert.strictEqual(apiCall.get('user_uuid'), userUuid);
  });

  it('should return 201 including a fund', async function() {
    const res = await chai.request(server)
      .post('/expenses')
      .set('Content-Type', 'application/vnd.api+json')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        'data': {
          'attributes': {
            'amount': sampleData.expenses.expense1.amount_cents,
            'date': sampleData.expenses.expense1.date,
            'description': sampleData.expenses.expense1.description,
            'reimbursed-amount': sampleData.expenses.expense1.reimbursed_cents,
          },
          'relationships': {
            'fund': {
              'data': {
                'id': fundUuid,
              },
            },
            'household-member': {
              'data': {
                'id': householdMemberUuid,
              },
            },
            'subcategory': {
              'data': {
                'id': subcategoryUuid,
              },
            },
            'vendor': {
              'data': {
                'id': vendorUuid,
              },
            },
          },
        },
      });
    expect(res).to.have.status(201);
    assert.isOk(res.body.data);
    assert.isOk(res.body.data.attributes);
    assert.strictEqual(res.body.data.attributes.amount, sampleData.expenses.expense1.amount_cents);
    assert.isOk(res.body.data.attributes['created-at']);
    assert.strictEqual(res.body.data.attributes.date, sampleData.expenses.expense1.date);
    assert.strictEqual(
      res.body.data.attributes.description,
      sampleData.expenses.expense1.description,
    );
    assert.strictEqual(res.body.data.attributes['reimbursed-amount'], sampleData.expenses.expense1.reimbursed_cents);
    assert.isOk(res.body.data.id);
    assert.isOk(res.body.data.relationships);
    assert.isOk(res.body.data.relationships.fund);
    assert.isOk(res.body.data.relationships.fund.data);
    assert.strictEqual(res.body.data.relationships.fund.data.id, fundUuid);
    assert.isOk(res.body.data.relationships['household-member']);
    assert.isOk(res.body.data.relationships['household-member'].data);
    assert.strictEqual(res.body.data.relationships['household-member'].data.id, householdMemberUuid);
    assert.isOk(res.body.data.relationships.subcategory);
    assert.isOk(res.body.data.relationships.subcategory.data);
    assert.strictEqual(res.body.data.relationships.subcategory.data.id, subcategoryUuid);
    assert.isOk(res.body.data.relationships.vendor);
    assert.isOk(res.body.data.relationships.vendor.data);
    assert.strictEqual(res.body.data.relationships.vendor.data.id, vendorUuid);
    assert.strictEqual(res.body.data.type, 'expenses');

    // Validate ExpenseCtrl.createExpense call.
    assert.strictEqual(createExpenseSpy.callCount, 1);
    const createExpenseParams = createExpenseSpy.getCall(0).args[0];
    assert.strictEqual(createExpenseParams.amount, sampleData.expenses.expense1.amount_cents);
    assert.isOk(createExpenseParams.auditApiCallUuid);
    assert.strictEqual(createExpenseParams.subcategoryUuid, subcategoryUuid);
    assert.strictEqual(createExpenseParams.date, sampleData.expenses.expense1.date);
    assert.strictEqual(createExpenseParams.description, sampleData.expenses.expense1.description);
    assert.strictEqual(createExpenseParams.fundUuid, fundUuid);
    assert.strictEqual(createExpenseParams.householdMemberUuid, householdMemberUuid);
    assert.strictEqual(
      createExpenseParams.reimbursedAmount,
      sampleData.expenses.expense1.reimbursed_cents,
    );
    assert.strictEqual(createExpenseParams.vendorUuid, vendorUuid);

    // Validate Audit API call.
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
        uuid: createExpenseParams.auditApiCallUuid,
      },
    });
    assert.isOk(apiCall);
    assert.strictEqual(apiCall.get('http_method'), 'POST');
    assert.isOk(apiCall.get('ip_address'));
    assert.strictEqual(apiCall.get('route'), '/expenses');
    assert.strictEqual(apiCall.get('user_uuid'), userUuid);
  });
});
