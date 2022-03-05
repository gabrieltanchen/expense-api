const chai = require('chai');
const sinon = require('sinon');
const { v4: uuidv4 } = require('uuid');
const _ = require('lodash');

const sampleData = require('../../../sample-data');
const TestHelper = require('../../../test-helper');
const { BudgetError } = require('../../../../app/middleware/error-handler');

const assert = chai.assert;

describe('Unit:Controllers - BudgetCtrl.createBudget', function() {
  let controllers;
  let models;
  const testHelper = new TestHelper();

  let trackChangesSpy;

  let user1HouseholdUuid;
  let user1SubcategoryUuid;
  let user1Uuid;
  let user2Uuid;

  before('get app', async function() {
    this.timeout(30000);
    const app = await testHelper.getApp();
    controllers = app.get('controllers');
    models = app.get('models');
  });

  before('create sinon spies', function() {
    trackChangesSpy = sinon.spy(controllers.AuditCtrl, 'trackChanges');
  });

  after('restore sinon spies', function() {
    trackChangesSpy.restore();
  });

  after('cleanup', async function() {
    await testHelper.cleanup();
  });

  beforeEach('create user 1', async function() {
    const household = await models.Household.create({
      name: sampleData.users.user1.lastName,
    });
    user1HouseholdUuid = household.get('uuid');
    const user = await models.User.create({
      email: sampleData.users.user1.email,
      first_name: sampleData.users.user1.firstName,
      household_uuid: household.get('uuid'),
      last_name: sampleData.users.user1.lastName,
    });
    user1Uuid = user.get('uuid');
  });

  beforeEach('create user 1 subcategory', async function() {
    const category = await models.Category.create({
      household_uuid: user1HouseholdUuid,
      name: sampleData.categories.category1.name,
    });
    const subcategory = await models.Subcategory.create({
      category_uuid: category.get('uuid'),
      name: sampleData.categories.category2.name,
    });
    user1SubcategoryUuid = subcategory.get('uuid');
  });

  beforeEach('create user 2', async function() {
    const household = await models.Household.create({
      name: sampleData.users.user2.lastName,
    });
    const user = await models.User.create({
      email: sampleData.users.user2.email,
      first_name: sampleData.users.user2.firstName,
      household_uuid: household.get('uuid'),
      last_name: sampleData.users.user2.lastName,
    });
    user2Uuid = user.get('uuid');
  });

  afterEach('reset history for sinon spies', function() {
    trackChangesSpy.resetHistory();
  });

  afterEach('truncate tables', async function() {
    this.timeout(10000);
    await testHelper.truncateTables();
  });

  it('should reject with no subcategory UUID', async function() {
    try {
      const apiCall = await models.Audit.ApiCall.create({
        user_uuid: user1Uuid,
      });
      await controllers.BudgetCtrl.createBudget({
        amount: sampleData.budgets.budget1.amount_cents,
        auditApiCallUuid: apiCall.get('uuid'),
        month: sampleData.budgets.budget1.month,
        notes: sampleData.budgets.budget1.notes,
        subcategoryUuid: null,
        year: sampleData.budgets.budget1.year,
      });
      /* istanbul ignore next */
      throw new Error('Expected to reject not resolve.');
    } catch (err) {
      assert.isOk(err);
      assert.strictEqual(err.message, 'Category is required');
      assert.isTrue(err instanceof BudgetError);
    }
    assert.strictEqual(trackChangesSpy.callCount, 0);
  });

  it('should reject with no year', async function() {
    try {
      const apiCall = await models.Audit.ApiCall.create({
        user_uuid: user1Uuid,
      });
      await controllers.BudgetCtrl.createBudget({
        amount: sampleData.budgets.budget1.amount_cents,
        auditApiCallUuid: apiCall.get('uuid'),
        month: sampleData.budgets.budget1.month,
        notes: sampleData.budgets.budget1.notes,
        subcategoryUuid: user1SubcategoryUuid,
        year: null,
      });
      /* istanbul ignore next */
      throw new Error('Expected to reject not resolve.');
    } catch (err) {
      assert.isOk(err);
      assert.strictEqual(err.message, 'Year is required');
      assert.isTrue(err instanceof BudgetError);
    }
    assert.strictEqual(trackChangesSpy.callCount, 0);
  });

  it('should reject with an invalid year (type)', async function() {
    try {
      const apiCall = await models.Audit.ApiCall.create({
        user_uuid: user1Uuid,
      });
      await controllers.BudgetCtrl.createBudget({
        amount: sampleData.budgets.budget1.amount_cents,
        auditApiCallUuid: apiCall.get('uuid'),
        month: sampleData.budgets.budget1.month,
        notes: sampleData.budgets.budget1.notes,
        subcategoryUuid: user1SubcategoryUuid,
        year: 'invalid year',
      });
      /* istanbul ignore next */
      throw new Error('Expected to reject not resolve.');
    } catch (err) {
      assert.isOk(err);
      assert.strictEqual(err.message, 'Year is required');
      assert.isTrue(err instanceof BudgetError);
    }
    assert.strictEqual(trackChangesSpy.callCount, 0);
  });

  it('should reject with an invalid year (too small)', async function() {
    try {
      const apiCall = await models.Audit.ApiCall.create({
        user_uuid: user1Uuid,
      });
      await controllers.BudgetCtrl.createBudget({
        amount: sampleData.budgets.budget1.amount_cents,
        auditApiCallUuid: apiCall.get('uuid'),
        month: sampleData.budgets.budget1.month,
        notes: sampleData.budgets.budget1.notes,
        subcategoryUuid: user1SubcategoryUuid,
        year: 1999,
      });
      /* istanbul ignore next */
      throw new Error('Expected to reject not resolve.');
    } catch (err) {
      assert.isOk(err);
      assert.strictEqual(err.message, 'Invalid year');
      assert.isTrue(err instanceof BudgetError);
    }
    assert.strictEqual(trackChangesSpy.callCount, 0);
  });

  it('should reject with an invalid year (too large)', async function() {
    try {
      const apiCall = await models.Audit.ApiCall.create({
        user_uuid: user1Uuid,
      });
      await controllers.BudgetCtrl.createBudget({
        amount: sampleData.budgets.budget1.amount_cents,
        auditApiCallUuid: apiCall.get('uuid'),
        month: sampleData.budgets.budget1.month,
        notes: sampleData.budgets.budget1.notes,
        subcategoryUuid: user1SubcategoryUuid,
        year: 2051,
      });
      /* istanbul ignore next */
      throw new Error('Expected to reject not resolve.');
    } catch (err) {
      assert.isOk(err);
      assert.strictEqual(err.message, 'Invalid year');
      assert.isTrue(err instanceof BudgetError);
    }
    assert.strictEqual(trackChangesSpy.callCount, 0);
  });

  it('should reject with no month', async function() {
    try {
      const apiCall = await models.Audit.ApiCall.create({
        user_uuid: user1Uuid,
      });
      await controllers.BudgetCtrl.createBudget({
        amount: sampleData.budgets.budget1.amount_cents,
        auditApiCallUuid: apiCall.get('uuid'),
        month: null,
        notes: sampleData.budgets.budget1.notes,
        subcategoryUuid: user1SubcategoryUuid,
        year: sampleData.budgets.budget1.year,
      });
      /* istanbul ignore next */
      throw new Error('Expected to reject not resolve.');
    } catch (err) {
      assert.isOk(err);
      assert.strictEqual(err.message, 'Month is required');
      assert.isTrue(err instanceof BudgetError);
    }
    assert.strictEqual(trackChangesSpy.callCount, 0);
  });

  it('should reject with an invalid month (type)', async function() {
    try {
      const apiCall = await models.Audit.ApiCall.create({
        user_uuid: user1Uuid,
      });
      await controllers.BudgetCtrl.createBudget({
        amount: sampleData.budgets.budget1.amount_cents,
        auditApiCallUuid: apiCall.get('uuid'),
        month: 'invalid month',
        notes: sampleData.budgets.budget1.notes,
        subcategoryUuid: user1SubcategoryUuid,
        year: sampleData.budgets.budget1.year,
      });
      /* istanbul ignore next */
      throw new Error('Expected to reject not resolve.');
    } catch (err) {
      assert.isOk(err);
      assert.strictEqual(err.message, 'Month is required');
      assert.isTrue(err instanceof BudgetError);
    }
    assert.strictEqual(trackChangesSpy.callCount, 0);
  });

  it('should reject with an invalid month (too small)', async function() {
    try {
      const apiCall = await models.Audit.ApiCall.create({
        user_uuid: user1Uuid,
      });
      await controllers.BudgetCtrl.createBudget({
        amount: sampleData.budgets.budget1.amount_cents,
        auditApiCallUuid: apiCall.get('uuid'),
        month: -1,
        notes: sampleData.budgets.budget1.notes,
        subcategoryUuid: user1SubcategoryUuid,
        year: sampleData.budgets.budget1.year,
      });
      /* istanbul ignore next */
      throw new Error('Expected to reject not resolve.');
    } catch (err) {
      assert.isOk(err);
      assert.strictEqual(err.message, 'Invalid month');
      assert.isTrue(err instanceof BudgetError);
    }
    assert.strictEqual(trackChangesSpy.callCount, 0);
  });

  it('should reject with an invalid month (too large)', async function() {
    try {
      const apiCall = await models.Audit.ApiCall.create({
        user_uuid: user1Uuid,
      });
      await controllers.BudgetCtrl.createBudget({
        amount: sampleData.budgets.budget1.amount_cents,
        auditApiCallUuid: apiCall.get('uuid'),
        month: 12,
        notes: sampleData.budgets.budget1.notes,
        subcategoryUuid: user1SubcategoryUuid,
        year: sampleData.budgets.budget1.year,
      });
      /* istanbul ignore next */
      throw new Error('Expected to reject not resolve.');
    } catch (err) {
      assert.isOk(err);
      assert.strictEqual(err.message, 'Invalid month');
      assert.isTrue(err instanceof BudgetError);
    }
    assert.strictEqual(trackChangesSpy.callCount, 0);
  });

  it('should reject with no amount', async function() {
    try {
      const apiCall = await models.Audit.ApiCall.create({
        user_uuid: user1Uuid,
      });
      await controllers.BudgetCtrl.createBudget({
        amount: null,
        auditApiCallUuid: apiCall.get('uuid'),
        month: sampleData.budgets.budget1.month,
        notes: sampleData.budgets.budget1.notes,
        subcategoryUuid: user1SubcategoryUuid,
        year: sampleData.budgets.budget1.year,
      });
      /* istanbul ignore next */
      throw new Error('Expected to reject not resolve.');
    } catch (err) {
      assert.isOk(err);
      assert.strictEqual(err.message, 'Invalid budget');
      assert.isTrue(err instanceof BudgetError);
    }
    assert.strictEqual(trackChangesSpy.callCount, 0);
  });

  it('should reject with an invalid amount', async function() {
    try {
      const apiCall = await models.Audit.ApiCall.create({
        user_uuid: user1Uuid,
      });
      await controllers.BudgetCtrl.createBudget({
        amount: 'invalid amount',
        auditApiCallUuid: apiCall.get('uuid'),
        month: sampleData.budgets.budget1.month,
        notes: sampleData.budgets.budget1.notes,
        subcategoryUuid: user1SubcategoryUuid,
        year: sampleData.budgets.budget1.year,
      });
      /* istanbul ignore next */
      throw new Error('Expected to reject not resolve.');
    } catch (err) {
      assert.isOk(err);
      assert.strictEqual(err.message, 'Invalid budget');
      assert.isTrue(err instanceof BudgetError);
    }
    assert.strictEqual(trackChangesSpy.callCount, 0);
  });

  it('should reject with no audit API call', async function() {
    try {
      await controllers.BudgetCtrl.createBudget({
        amount: sampleData.budgets.budget1.amount_cents,
        auditApiCallUuid: null,
        month: sampleData.budgets.budget1.month,
        notes: sampleData.budgets.budget1.notes,
        subcategoryUuid: user1SubcategoryUuid,
        year: sampleData.budgets.budget1.year,
      });
      /* istanbul ignore next */
      throw new Error('Expected to reject not resolve.');
    } catch (err) {
      assert.isOk(err);
      assert.strictEqual(err.message, 'Missing audit API call');
      assert.isTrue(err instanceof BudgetError);
    }
    assert.strictEqual(trackChangesSpy.callCount, 0);
  });

  it('should reject when the audit API call does not exist', async function() {
    try {
      await controllers.BudgetCtrl.createBudget({
        amount: sampleData.budgets.budget1.amount_cents,
        auditApiCallUuid: uuidv4(),
        month: sampleData.budgets.budget1.month,
        notes: sampleData.budgets.budget1.notes,
        subcategoryUuid: user1SubcategoryUuid,
        year: sampleData.budgets.budget1.year,
      });
      /* istanbul ignore next */
      throw new Error('Expected to reject not resolve.');
    } catch (err) {
      assert.isOk(err);
      assert.strictEqual(err.message, 'Missing audit API call');
      assert.isTrue(err instanceof BudgetError);
    }
    assert.strictEqual(trackChangesSpy.callCount, 0);
  });

  it('should reject when the user does not exist', async function() {
    try {
      await models.User.destroy({
        where: {
          uuid: user1Uuid,
        },
      });
      const apiCall = await models.Audit.ApiCall.create({
        user_uuid: user1Uuid,
      });
      await controllers.BudgetCtrl.createBudget({
        amount: sampleData.budgets.budget1.amount_cents,
        auditApiCallUuid: apiCall.get('uuid'),
        month: sampleData.budgets.budget1.month,
        notes: sampleData.budgets.budget1.notes,
        subcategoryUuid: user1SubcategoryUuid,
        year: sampleData.budgets.budget1.year,
      });
      /* istanbul ignore next */
      throw new Error('Expected to reject not resolve.');
    } catch (err) {
      assert.isOk(err);
      assert.strictEqual(err.message, 'Audit user does not exist');
      assert.isTrue(err instanceof BudgetError);
    }
    assert.strictEqual(trackChangesSpy.callCount, 0);
  });

  it('should reject when the subcategory does not exist', async function() {
    try {
      const apiCall = await models.Audit.ApiCall.create({
        user_uuid: user1Uuid,
      });
      await controllers.BudgetCtrl.createBudget({
        amount: sampleData.budgets.budget1.amount_cents,
        auditApiCallUuid: apiCall.get('uuid'),
        month: sampleData.budgets.budget1.month,
        notes: sampleData.budgets.budget1.notes,
        subcategoryUuid: uuidv4(),
        year: sampleData.budgets.budget1.year,
      });
      /* istanbul ignore next */
      throw new Error('Expected to reject not resolve.');
    } catch (err) {
      assert.isOk(err);
      assert.strictEqual(err.message, 'Category not found');
      assert.isTrue(err instanceof BudgetError);
    }
    assert.strictEqual(trackChangesSpy.callCount, 0);
  });

  it('should reject when the subcategory belongs to a different household', async function() {
    try {
      const apiCall = await models.Audit.ApiCall.create({
        user_uuid: user2Uuid,
      });
      await controllers.BudgetCtrl.createBudget({
        amount: sampleData.budgets.budget1.amount_cents,
        auditApiCallUuid: apiCall.get('uuid'),
        month: sampleData.budgets.budget1.month,
        notes: sampleData.budgets.budget1.notes,
        subcategoryUuid: user1SubcategoryUuid,
        year: sampleData.budgets.budget1.year,
      });
      /* istanbul ignore next */
      throw new Error('Expected to reject not resolve.');
    } catch (err) {
      assert.isOk(err);
      assert.strictEqual(err.message, 'Category not found');
      assert.isTrue(err instanceof BudgetError);
    }
    assert.strictEqual(trackChangesSpy.callCount, 0);
  });

  it('should resolve creating a budget', async function() {
    const apiCall = await models.Audit.ApiCall.create({
      user_uuid: user1Uuid,
    });
    const budgetUuid = await controllers.BudgetCtrl.createBudget({
      amount: sampleData.budgets.budget1.amount_cents,
      auditApiCallUuid: apiCall.get('uuid'),
      month: sampleData.budgets.budget1.month,
      notes: sampleData.budgets.budget1.notes,
      subcategoryUuid: user1SubcategoryUuid,
      year: sampleData.budgets.budget1.year,
    });

    assert.isOk(budgetUuid);

    // Verify the Budget instance.
    const budget = await models.Budget.findOne({
      attributes: [
        'amount_cents',
        'month',
        'notes',
        'subcategory_uuid',
        'uuid',
        'year',
      ],
      where: {
        uuid: budgetUuid,
      },
    });
    assert.isOk(budget);
    assert.strictEqual(budget.get('amount_cents'), sampleData.budgets.budget1.amount_cents);
    assert.strictEqual(budget.get('month'), sampleData.budgets.budget1.month);
    assert.strictEqual(budget.get('notes'), sampleData.budgets.budget1.notes);
    assert.strictEqual(budget.get('subcategory_uuid'), user1SubcategoryUuid);
    assert.strictEqual(budget.get('year'), sampleData.budgets.budget1.year);

    assert.strictEqual(trackChangesSpy.callCount, 1);
    const trackChangesParams = trackChangesSpy.getCall(0).args[0];
    assert.strictEqual(trackChangesParams.auditApiCallUuid, apiCall.get('uuid'));
    assert.isNotOk(trackChangesParams.changeList);
    assert.isNotOk(trackChangesParams.deleteList);
    assert.isOk(trackChangesParams.newList);
    const newBudget = _.find(trackChangesParams.newList, (newInstance) => {
      return newInstance instanceof models.Budget
        && newInstance.get('uuid') === budget.get('uuid');
    });
    assert.isOk(newBudget);
    assert.strictEqual(trackChangesParams.newList.length, 1);
    assert.isOk(trackChangesParams.transaction);
  });

  it('should reject creating a budget with a duplicate month, year and subcategory', async function() {
    const apiCall = await models.Audit.ApiCall.create({
      user_uuid: user1Uuid,
    });
    await controllers.BudgetCtrl.createBudget({
      amount: sampleData.budgets.budget1.amount_cents,
      auditApiCallUuid: apiCall.get('uuid'),
      month: sampleData.budgets.budget1.month,
      notes: sampleData.budgets.budget1.notes,
      subcategoryUuid: user1SubcategoryUuid,
      year: sampleData.budgets.budget1.year,
    });
    try {
      await controllers.BudgetCtrl.createBudget({
        amount: sampleData.budgets.budget2.amount_cents,
        auditApiCallUuid: apiCall.get('uuid'),
        month: sampleData.budgets.budget1.month,
        notes: sampleData.budgets.budget2.notes,
        subcategoryUuid: user1SubcategoryUuid,
        year: sampleData.budgets.budget1.year,
      });
      /* istanbul ignore next */
      throw new Error('Expected to reject not resolve.');
    } catch (err) {
      assert.isOk(err);
      assert.strictEqual(err.message, 'Duplicate budget');
      assert.isTrue(err instanceof BudgetError);
    }
  });
});
