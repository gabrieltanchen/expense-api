const chai = require('chai');
const sinon = require('sinon');
const uuidv4 = require('uuid/v4');
const _ = require('lodash');

const sampleData = require('../../../sample-data/');
const TestHelper = require('../../../test-helper/');

const assert = chai.assert;

describe('Unit:Controllers - CategoryCtrl.createCategory', function() {
  let controllers;
  let models;
  const testHelper = new TestHelper();

  let trackChangesSpy;

  let user1HouseholdUuid;
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
    await testHelper.truncateTables();
  });

  it('should reject with no name', async function() {
    try {
      const apiCall = await models.Audit.ApiCall.create({
        user_uuid: user1Uuid,
      });
      await controllers.CategoryCtrl.createCategory({
        auditApiCallUuid: apiCall.get('uuid'),
        name: null,
      });
    } catch (err) {
      assert.isOk(err);
      assert.strictEqual(err.message, 'Name is required.');
    }
    assert.strictEqual(trackChangesSpy.callCount, 0);
  });

  it('should reject with no audit API call', async function() {
    try {
      await controllers.CategoryCtrl.createCategory({
        auditApiCallUuid: null,
        name: sampleData.categories.category1.name,
      });
    } catch (err) {
      assert.isOk(err);
      assert.strictEqual(err.message, 'Unauthorized');
    }
    assert.strictEqual(trackChangesSpy.callCount, 0);
  });

  it('should reject when the audit API call does not exist', async function() {
    try {
      await controllers.CategoryCtrl.createCategory({
        auditApiCallUuid: uuidv4(),
        name: sampleData.categories.category1.name,
      });
    } catch (err) {
      assert.isOk(err);
      assert.strictEqual(err.message, 'Unauthorized');
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
      await controllers.CategoryCtrl.createCategory({
        auditApiCallUuid: apiCall.get('uuid'),
        name: sampleData.categories.category1.name,
      });
    } catch (err) {
      assert.isOk(err);
      assert.strictEqual(err.message, 'Unauthorized');
    }
    assert.strictEqual(trackChangesSpy.callCount, 0);
  });

  it('should resolve creating a parent category', async function() {
    const apiCall = await models.Audit.ApiCall.create({
      user_uuid: user1Uuid,
    });
    const categoryUuid = await controllers.CategoryCtrl.createCategory({
      auditApiCallUuid: apiCall.get('uuid'),
      name: sampleData.categories.category1.name,
    });

    assert.isOk(categoryUuid);

    // Verify the Category instance.
    const category = await models.Category.findOne({
      attributes: ['household_uuid', 'name', 'parent_uuid', 'uuid'],
      where: {
        uuid: categoryUuid,
      },
    });
    assert.isOk(category);
    assert.strictEqual(category.get('household_uuid'), user1HouseholdUuid);
    assert.isNull(category.get('parent_uuid'));

    assert.strictEqual(trackChangesSpy.callCount, 1);
    const trackChangesParams = trackChangesSpy.getCall(0).args[0];
    assert.strictEqual(trackChangesParams.auditApiCallUuid, apiCall.get('uuid'));
    assert.isNotOk(trackChangesParams.changeList);
    assert.isNotOk(trackChangesParams.deleteList);
    assert.isOk(trackChangesParams.newList);
    const newCategory = _.find(trackChangesParams.newList, (newInstance) => {
      return newInstance instanceof models.Category
        && newInstance.get('uuid') === category.get('uuid');
    });
    assert.isOk(newCategory);
    assert.strictEqual(trackChangesParams.newList.length, 1);
    assert.isOk(trackChangesParams.transaction);
  });

  it('should reject creating a child category when the parent does not exist', async function() {
    try {
      const apiCall = await models.Audit.ApiCall.create({
        user_uuid: user1Uuid,
      });
      await controllers.CategoryCtrl.createCategory({
        auditApiCallUuid: apiCall.get('uuid'),
        name: sampleData.categories.category1.name,
        parentUuid: uuidv4(),
      });
    } catch (err) {
      assert.isOk(err);
      assert.strictEqual(err.message, 'Not found');
    }
    assert.strictEqual(trackChangesSpy.callCount, 0);
  });

  it('should reject creating a child category when the parent belongs to a different household', async function() {
    try {
      const category = await models.Category.create({
        household_uuid: user1HouseholdUuid,
        name: sampleData.categories.category1.name,
      });
      const apiCall = await models.Audit.ApiCall.create({
        user_uuid: user2Uuid,
      });
      await controllers.CategoryCtrl.createCategory({
        auditApiCallUuid: apiCall.get('uuid'),
        name: sampleData.categories.category2.name,
        parentUuid: category.get('uuid'),
      });
    } catch (err) {
      assert.isOk(err);
      assert.strictEqual(err.message, 'Not found');
    }
    assert.strictEqual(trackChangesSpy.callCount, 0);
  });

  it('should resolve creating a child category', async function() {
    const parentCategory = await models.Category.create({
      household_uuid: user1HouseholdUuid,
      name: sampleData.categories.category1.name,
    });
    const apiCall = await models.Audit.ApiCall.create({
      user_uuid: user1Uuid,
    });
    const categoryUuid = await controllers.CategoryCtrl.createCategory({
      auditApiCallUuid: apiCall.get('uuid'),
      name: sampleData.categories.category2.name,
      parentUuid: parentCategory.get('uuid'),
    });

    assert.isOk(categoryUuid);

    // Verify the Category instance.
    const category = await models.Category.findOne({
      attributes: ['household_uuid', 'name', 'parent_uuid', 'uuid'],
      where: {
        uuid: categoryUuid,
      },
    });
    assert.isOk(category);
    assert.strictEqual(category.get('household_uuid'), user1HouseholdUuid);
    assert.strictEqual(category.get('parent_uuid'), parentCategory.get('uuid'));

    assert.strictEqual(trackChangesSpy.callCount, 1);
    const trackChangesParams = trackChangesSpy.getCall(0).args[0];
    assert.strictEqual(trackChangesParams.auditApiCallUuid, apiCall.get('uuid'));
    assert.isNotOk(trackChangesParams.changeList);
    assert.isNotOk(trackChangesParams.deleteList);
    assert.isOk(trackChangesParams.newList);
    const newCategory = _.find(trackChangesParams.newList, (newInstance) => {
      return newInstance instanceof models.Category
        && newInstance.get('uuid') === category.get('uuid');
    });
    assert.isOk(newCategory);
    assert.strictEqual(trackChangesParams.newList.length, 1);
    assert.isOk(trackChangesParams.transaction);
  });
});
