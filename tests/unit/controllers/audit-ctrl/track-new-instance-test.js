const chai = require('chai');
const crypto = require('crypto');
const Sequelize = require('sequelize');
const _ = require('lodash');

const sampleData = require('../../../sample-data');
const TestHelper = require('../../../test-helper');
const { AuditError } = require('../../../../app/middleware/error-handler');

const assert = chai.assert;

const shouldTrackAttribute = ({
  attribute,
  auditChanges,
  key,
  table,
  value,
}) => {
  const trackedAttr = _.find(auditChanges, (auditChange) => {
    return auditChange.get('table') === table
      && auditChange.get('attribute') === attribute
      && auditChange.get('key') === key;
  });
  assert.isOk(trackedAttr);
  assert.isNull(trackedAttr.get('old_value'));
  assert.strictEqual(trackedAttr.get('new_value'), String(value));
};

describe('Unit:Controllers - AuditCtrl._trackNewInstance', function() {
  let controllers;
  let models;
  const testHelper = new TestHelper();

  before('get app', async function() {
    this.timeout(30000);
    const app = await testHelper.getApp();
    controllers = app.get('controllers');
    models = app.get('models');
  });

  after('cleanup', async function() {
    await testHelper.cleanup();
  });

  afterEach('truncate tables', async function() {
    this.timeout(10000);
    await testHelper.truncateTables();
  });

  it('should reject without an audit log', async function() {
    try {
      await models.sequelize.transaction({
        isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
      }, async(transaction) => {
        const household = await models.Household.create({
          name: sampleData.users.user1.lastName,
        });
        await controllers.AuditCtrl._trackNewInstance(null, household, transaction);
      });
      /* istanbul ignore next */
      throw new Error('Expected to reject not resolve.');
    } catch (err) {
      assert.isOk(err);
      assert.strictEqual(err.message, 'Audit log is required');
      assert.isTrue(err instanceof AuditError);
    }
  });

  it('should reject without an instance', async function() {
    try {
      const auditLog = await models.Audit.Log.create();
      await models.sequelize.transaction({
        isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
      }, async(transaction) => {
        await controllers.AuditCtrl._trackNewInstance(auditLog, null, transaction);
      });
      /* istanbul ignore next */
      throw new Error('Expected to reject not resolve.');
    } catch (err) {
      assert.isOk(err);
      assert.strictEqual(err.message, 'Sequelize instance is required');
      assert.isTrue(err instanceof AuditError);
    }
  });

  it('should reject without a Sequelize transaction', async function() {
    try {
      const auditLog = await models.Audit.Log.create();
      const household = await models.Household.create({
        name: sampleData.users.user1.lastName,
      });
      await controllers.AuditCtrl._trackNewInstance(auditLog, household, null);
      /* istanbul ignore next */
      throw new Error('Expected to reject not resolve.');
    } catch (err) {
      assert.isOk(err);
      assert.strictEqual(err.message, 'Sequelize transaction is required');
      assert.isTrue(err instanceof AuditError);
    }
  });

  it('should track all Attachment attributes', async function() {
    const household = await models.Household.create({
      name: sampleData.users.user1.lastName,
    });
    const category = await models.Category.create({
      household_uuid: household.get('uuid'),
      name: sampleData.categories.category1.name,
    });
    const subcategory = await models.Subcategory.create({
      category_uuid: category.get('uuid'),
      name: sampleData.categories.category2.name,
    });
    const vendor = await models.Vendor.create({
      household_uuid: household.get('uuid'),
      name: sampleData.vendors.vendor1.name,
    });
    const householdMember = await models.HouseholdMember.create({
      household_uuid: household.get('uuid'),
      name: sampleData.users.user1.firstName,
    });
    const expense = await models.Expense.create({
      amount_cents: sampleData.expenses.expense1.amount_cents,
      date: sampleData.expenses.expense1.date,
      description: sampleData.expenses.expense1.description,
      household_member_uuid: householdMember.get('uuid'),
      reimbursed_cents: sampleData.expenses.expense1.reimbursed_cents,
      subcategory_uuid: subcategory.get('uuid'),
      vendor_uuid: vendor.get('uuid'),
    });
    const auditLog = await models.Audit.Log.create();
    const attachment = await models.Attachment.create({
      entity_type: 'expense',
      entity_uuid: expense.get('uuid'),
      name: sampleData.attachments.attachment1.name,
    });

    await models.sequelize.transaction({
      isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
    }, async(transaction) => {
      await controllers.AuditCtrl._trackNewInstance(auditLog, attachment, transaction);
    });

    const auditChanges = await models.Audit.Change.findAll({
      where: {
        audit_log_uuid: auditLog.get('uuid'),
      },
    });
    shouldTrackAttribute({
      attribute: 'aws_bucket',
      auditChanges,
      key: attachment.get('uuid'),
      table: 'attachments',
      value: null,
    });
    shouldTrackAttribute({
      attribute: 'aws_content_length',
      auditChanges,
      key: attachment.get('uuid'),
      table: 'attachments',
      value: null,
    });
    shouldTrackAttribute({
      attribute: 'aws_content_type',
      auditChanges,
      key: attachment.get('uuid'),
      table: 'attachments',
      value: null,
    });
    shouldTrackAttribute({
      attribute: 'aws_etag',
      auditChanges,
      key: attachment.get('uuid'),
      table: 'attachments',
      value: null,
    });
    shouldTrackAttribute({
      attribute: 'aws_key',
      auditChanges,
      key: attachment.get('uuid'),
      table: 'attachments',
      value: null,
    });
    shouldTrackAttribute({
      attribute: 'deleted_at',
      auditChanges,
      key: attachment.get('uuid'),
      table: 'attachments',
      value: null,
    });
    shouldTrackAttribute({
      attribute: 'entity_type',
      auditChanges,
      key: attachment.get('uuid'),
      table: 'attachments',
      value: 'expense',
    });
    shouldTrackAttribute({
      attribute: 'entity_uuid',
      auditChanges,
      key: attachment.get('uuid'),
      table: 'attachments',
      value: expense.get('uuid'),
    });
    shouldTrackAttribute({
      attribute: 'name',
      auditChanges,
      key: attachment.get('uuid'),
      table: 'attachments',
      value: sampleData.attachments.attachment1.name,
    });
    assert.strictEqual(auditChanges.length, 9);
  });

  it('should track all Budget attributes', async function() {
    const household = await models.Household.create({
      name: sampleData.users.user1.lastName,
    });
    const category = await models.Category.create({
      household_uuid: household.get('uuid'),
      name: sampleData.categories.category1.name,
    });
    const subcategory = await models.Subcategory.create({
      category_uuid: category.get('uuid'),
      name: sampleData.categories.category2.name,
    });
    const auditLog = await models.Audit.Log.create();
    const budget = await models.Budget.create({
      amount_cents: sampleData.budgets.budget1.amount_cents,
      month: sampleData.budgets.budget1.month,
      notes: sampleData.budgets.budget1.notes,
      subcategory_uuid: subcategory.get('uuid'),
      year: sampleData.budgets.budget1.year,
    });

    await models.sequelize.transaction({
      isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
    }, async(transaction) => {
      await controllers.AuditCtrl._trackNewInstance(auditLog, budget, transaction);
    });

    const auditChanges = await models.Audit.Change.findAll({
      where: {
        audit_log_uuid: auditLog.get('uuid'),
      },
    });
    shouldTrackAttribute({
      attribute: 'deleted_at',
      auditChanges,
      key: budget.get('uuid'),
      table: 'budgets',
      value: null,
    });
    shouldTrackAttribute({
      attribute: 'amount_cents',
      auditChanges,
      key: budget.get('uuid'),
      table: 'budgets',
      value: sampleData.budgets.budget1.amount_cents,
    });
    shouldTrackAttribute({
      attribute: 'month',
      auditChanges,
      key: budget.get('uuid'),
      table: 'budgets',
      value: sampleData.budgets.budget1.month,
    });
    shouldTrackAttribute({
      attribute: 'notes',
      auditChanges,
      key: budget.get('uuid'),
      table: 'budgets',
      value: sampleData.budgets.budget1.notes,
    });
    shouldTrackAttribute({
      attribute: 'subcategory_uuid',
      auditChanges,
      key: budget.get('uuid'),
      table: 'budgets',
      value: subcategory.get('uuid'),
    });
    shouldTrackAttribute({
      attribute: 'year',
      auditChanges,
      key: budget.get('uuid'),
      table: 'budgets',
      value: sampleData.budgets.budget1.year,
    });
    assert.strictEqual(auditChanges.length, 6);
  });

  it('should track all Category attributes', async function() {
    const household = await models.Household.create({
      name: sampleData.users.user1.lastName,
    });
    const auditLog = await models.Audit.Log.create();
    const category = await models.Category.create({
      household_uuid: household.get('uuid'),
      name: sampleData.categories.category1.name,
    });

    await models.sequelize.transaction({
      isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
    }, async(transaction) => {
      await controllers.AuditCtrl._trackNewInstance(auditLog, category, transaction);
    });

    const auditChanges = await models.Audit.Change.findAll({
      where: {
        audit_log_uuid: auditLog.get('uuid'),
      },
    });
    shouldTrackAttribute({
      attribute: 'deleted_at',
      auditChanges,
      key: category.get('uuid'),
      table: 'categories',
      value: null,
    });
    shouldTrackAttribute({
      attribute: 'household_uuid',
      auditChanges,
      key: category.get('uuid'),
      table: 'categories',
      value: household.get('uuid'),
    });
    shouldTrackAttribute({
      attribute: 'name',
      auditChanges,
      key: category.get('uuid'),
      table: 'categories',
      value: sampleData.categories.category1.name,
    });
    assert.strictEqual(auditChanges.length, 3);
  });

  it('should track all Deposit attributes', async function() {
    const household = await models.Household.create({
      name: sampleData.users.user1.lastName,
    });
    const fund = await models.Fund.create({
      amount_cents: 0,
      household_uuid: household.get('uuid'),
      name: sampleData.categories.category1.name,
    });
    const auditLog = await models.Audit.Log.create();
    const deposit = await models.Deposit.create({
      amount_cents: sampleData.expenses.expense1.amount_cents,
      date: sampleData.expenses.expense1.date,
      fund_uuid: fund.get('uuid'),
    });

    await models.sequelize.transaction({
      isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
    }, async(transaction) => {
      await controllers.AuditCtrl._trackNewInstance(auditLog, deposit, transaction);
    });

    const auditChanges = await models.Audit.Change.findAll({
      where: {
        audit_log_uuid: auditLog.get('uuid'),
      },
    });
    shouldTrackAttribute({
      attribute: 'deleted_at',
      auditChanges,
      key: deposit.get('uuid'),
      table: 'deposits',
      value: null,
    });
    shouldTrackAttribute({
      attribute: 'fund_uuid',
      auditChanges,
      key: deposit.get('uuid'),
      table: 'deposits',
      value: fund.get('uuid'),
    });
    shouldTrackAttribute({
      attribute: 'amount_cents',
      auditChanges,
      key: deposit.get('uuid'),
      table: 'deposits',
      value: sampleData.expenses.expense1.amount_cents,
    });
    shouldTrackAttribute({
      attribute: 'date',
      auditChanges,
      key: deposit.get('uuid'),
      table: 'deposits',
      value: sampleData.expenses.expense1.date,
    });
    assert.strictEqual(auditChanges.length, 4);
  });

  it('should track all Expense attributes', async function() {
    const household = await models.Household.create({
      name: sampleData.users.user1.lastName,
    });
    const category = await models.Category.create({
      household_uuid: household.get('uuid'),
      name: sampleData.categories.category1.name,
    });
    const subcategory = await models.Subcategory.create({
      category_uuid: category.get('uuid'),
      name: sampleData.categories.category2.name,
    });
    const vendor = await models.Vendor.create({
      household_uuid: household.get('uuid'),
      name: sampleData.vendors.vendor1.name,
    });
    const householdMember = await models.HouseholdMember.create({
      household_uuid: household.get('uuid'),
      name: sampleData.users.user1.firstName,
    });
    const auditLog = await models.Audit.Log.create();
    const expense = await models.Expense.create({
      amount_cents: sampleData.expenses.expense1.amount_cents,
      date: sampleData.expenses.expense1.date,
      description: sampleData.expenses.expense1.description,
      household_member_uuid: householdMember.get('uuid'),
      reimbursed_cents: sampleData.expenses.expense1.reimbursed_cents,
      subcategory_uuid: subcategory.get('uuid'),
      vendor_uuid: vendor.get('uuid'),
    });

    await models.sequelize.transaction({
      isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
    }, async(transaction) => {
      await controllers.AuditCtrl._trackNewInstance(auditLog, expense, transaction);
    });

    const auditChanges = await models.Audit.Change.findAll({
      where: {
        audit_log_uuid: auditLog.get('uuid'),
      },
    });
    shouldTrackAttribute({
      attribute: 'deleted_at',
      auditChanges,
      key: expense.get('uuid'),
      table: 'expenses',
      value: null,
    });
    shouldTrackAttribute({
      attribute: 'amount_cents',
      auditChanges,
      key: expense.get('uuid'),
      table: 'expenses',
      value: sampleData.expenses.expense1.amount_cents,
    });
    shouldTrackAttribute({
      attribute: 'date',
      auditChanges,
      key: expense.get('uuid'),
      table: 'expenses',
      value: sampleData.expenses.expense1.date,
    });
    shouldTrackAttribute({
      attribute: 'description',
      auditChanges,
      key: expense.get('uuid'),
      table: 'expenses',
      value: sampleData.expenses.expense1.description,
    });
    shouldTrackAttribute({
      attribute: 'household_member_uuid',
      auditChanges,
      key: expense.get('uuid'),
      table: 'expenses',
      value: householdMember.get('uuid'),
    });
    shouldTrackAttribute({
      attribute: 'reimbursed_cents',
      auditChanges,
      key: expense.get('uuid'),
      table: 'expenses',
      value: sampleData.expenses.expense1.reimbursed_cents,
    });
    shouldTrackAttribute({
      attribute: 'subcategory_uuid',
      auditChanges,
      key: expense.get('uuid'),
      table: 'expenses',
      value: subcategory.get('uuid'),
    });
    shouldTrackAttribute({
      attribute: 'vendor_uuid',
      auditChanges,
      key: expense.get('uuid'),
      table: 'expenses',
      value: vendor.get('uuid'),
    });
    shouldTrackAttribute({
      attribute: 'fund_uuid',
      auditChanges,
      key: expense.get('uuid'),
      table: 'expenses',
      value: null,
    });
    assert.strictEqual(auditChanges.length, 9);
  });

  it('should track all Fund attributes', async function() {
    const household = await models.Household.create({
      name: sampleData.users.user1.lastName,
    });
    const auditLog = await models.Audit.Log.create();
    const fund = await models.Fund.create({
      household_uuid: household.get('uuid'),
      name: sampleData.categories.category1.name,
    });

    await models.sequelize.transaction({
      isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
    }, async(transaction) => {
      await controllers.AuditCtrl._trackNewInstance(auditLog, fund, transaction);
    });

    const auditChanges = await models.Audit.Change.findAll({
      where: {
        audit_log_uuid: auditLog.get('uuid'),
      },
    });
    shouldTrackAttribute({
      attribute: 'deleted_at',
      auditChanges,
      key: fund.get('uuid'),
      table: 'funds',
      value: null,
    });
    shouldTrackAttribute({
      attribute: 'balance_cents',
      auditChanges,
      key: fund.get('uuid'),
      table: 'funds',
      value: 0,
    });
    shouldTrackAttribute({
      attribute: 'name',
      auditChanges,
      key: fund.get('uuid'),
      table: 'funds',
      value: sampleData.categories.category1.name,
    });
    shouldTrackAttribute({
      attribute: 'household_uuid',
      auditChanges,
      key: fund.get('uuid'),
      table: 'funds',
      value: household.get('uuid'),
    });
    assert.strictEqual(auditChanges.length, 4);
  });

  it('should track all Household attributes', async function() {
    const auditLog = await models.Audit.Log.create();
    const household = await models.Household.create({
      name: sampleData.users.user1.lastName,
    });

    await models.sequelize.transaction({
      isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
    }, async(transaction) => {
      await controllers.AuditCtrl._trackNewInstance(auditLog, household, transaction);
    });

    const auditChanges = await models.Audit.Change.findAll({
      where: {
        audit_log_uuid: auditLog.get('uuid'),
      },
    });
    shouldTrackAttribute({
      attribute: 'deleted_at',
      auditChanges,
      key: household.get('uuid'),
      table: 'households',
      value: null,
    });
    shouldTrackAttribute({
      attribute: 'name',
      auditChanges,
      key: household.get('uuid'),
      table: 'households',
      value: sampleData.users.user1.lastName,
    });
    assert.strictEqual(auditChanges.length, 2);
  });

  it('should track all HouseholdMember attributes', async function() {
    const household = await models.Household.create({
      name: sampleData.users.user1.lastName,
    });
    const auditLog = await models.Audit.Log.create();
    const householdMember = await models.HouseholdMember.create({
      household_uuid: household.get('uuid'),
      name: sampleData.users.user1.firstName,
    });

    await models.sequelize.transaction({
      isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
    }, async(transaction) => {
      await controllers.AuditCtrl._trackNewInstance(auditLog, householdMember, transaction);
    });

    const auditChanges = await models.Audit.Change.findAll({
      where: {
        audit_log_uuid: auditLog.get('uuid'),
      },
    });
    shouldTrackAttribute({
      attribute: 'deleted_at',
      auditChanges,
      key: householdMember.get('uuid'),
      table: 'household_members',
      value: null,
    });
    shouldTrackAttribute({
      attribute: 'household_uuid',
      auditChanges,
      key: householdMember.get('uuid'),
      table: 'household_members',
      value: household.get('uuid'),
    });
    shouldTrackAttribute({
      attribute: 'name',
      auditChanges,
      key: householdMember.get('uuid'),
      table: 'household_members',
      value: sampleData.users.user1.firstName,
    });
    assert.strictEqual(auditChanges.length, 3);
  });

  it('should track all Subcategory attributes', async function() {
    const household = await models.Household.create({
      name: sampleData.users.user1.lastName,
    });
    const auditLog = await models.Audit.Log.create();
    const category = await models.Category.create({
      household_uuid: household.get('uuid'),
      name: sampleData.categories.category1.name,
    });
    const subcategory = await models.Subcategory.create({
      category_uuid: category.get('uuid'),
      name: sampleData.categories.category2.name,
    });

    await models.sequelize.transaction({
      isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
    }, async(transaction) => {
      await controllers.AuditCtrl._trackNewInstance(auditLog, subcategory, transaction);
    });

    const auditChanges = await models.Audit.Change.findAll({
      where: {
        audit_log_uuid: auditLog.get('uuid'),
      },
    });
    shouldTrackAttribute({
      attribute: 'category_uuid',
      auditChanges,
      key: subcategory.get('uuid'),
      table: 'subcategories',
      value: category.get('uuid'),
    });
    shouldTrackAttribute({
      attribute: 'deleted_at',
      auditChanges,
      key: subcategory.get('uuid'),
      table: 'subcategories',
      value: null,
    });
    shouldTrackAttribute({
      attribute: 'name',
      auditChanges,
      key: subcategory.get('uuid'),
      table: 'subcategories',
      value: sampleData.categories.category2.name,
    });
    assert.strictEqual(auditChanges.length, 3);
  });

  it('should track all User attributes', async function() {
    const household = await models.Household.create({
      name: sampleData.users.user1.lastName,
    });
    const auditLog = await models.Audit.Log.create();
    const user = await models.User.create({
      email: sampleData.users.user1.email,
      first_name: sampleData.users.user1.firstName,
      household_uuid: household.get('uuid'),
      last_name: sampleData.users.user1.lastName,
    });

    await models.sequelize.transaction({
      isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
    }, async(transaction) => {
      await controllers.AuditCtrl._trackNewInstance(auditLog, user, transaction);
    });

    const auditChanges = await models.Audit.Change.findAll({
      where: {
        audit_log_uuid: auditLog.get('uuid'),
      },
    });
    shouldTrackAttribute({
      attribute: 'deleted_at',
      auditChanges,
      key: user.get('uuid'),
      table: 'users',
      value: null,
    });
    shouldTrackAttribute({
      attribute: 'email',
      auditChanges,
      key: user.get('uuid'),
      table: 'users',
      value: sampleData.users.user1.email,
    });
    shouldTrackAttribute({
      attribute: 'first_name',
      auditChanges,
      key: user.get('uuid'),
      table: 'users',
      value: sampleData.users.user1.firstName,
    });
    shouldTrackAttribute({
      attribute: 'household_uuid',
      auditChanges,
      key: user.get('uuid'),
      table: 'users',
      value: household.get('uuid'),
    });
    shouldTrackAttribute({
      attribute: 'last_name',
      auditChanges,
      key: user.get('uuid'),
      table: 'users',
      value: sampleData.users.user1.lastName,
    });
    assert.strictEqual(auditChanges.length, 5);
  });

  it('should track all UserLogin attributes', async function() {
    const household = await models.Household.create({
      name: sampleData.users.user1.lastName,
    });
    const user = await models.User.create({
      email: sampleData.users.user1.email,
      first_name: sampleData.users.user1.firstName,
      household_uuid: household.get('uuid'),
      last_name: sampleData.users.user1.lastName,
    });
    const auditLog = await models.Audit.Log.create();
    const userLogin = await models.UserLogin.create({
      h2: crypto.randomBytes(96).toString('base64'),
      s1: crypto.randomBytes(48).toString('base64'),
      user_uuid: user.get('uuid'),
    });

    await models.sequelize.transaction({
      isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
    }, async(transaction) => {
      await controllers.AuditCtrl._trackNewInstance(auditLog, userLogin, transaction);
    });

    const auditChanges = await models.Audit.Change.findAll({
      where: {
        audit_log_uuid: auditLog.get('uuid'),
      },
    });
    assert.strictEqual(auditChanges.length, 0);
  });

  it('should track all Vendor attributes', async function() {
    const household = await models.Household.create({
      name: sampleData.users.user1.lastName,
    });
    const auditLog = await models.Audit.Log.create();
    const vendor = await models.Vendor.create({
      household_uuid: household.get('uuid'),
      name: sampleData.vendors.vendor1.name,
    });

    await models.sequelize.transaction({
      isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.REPEATABLE_READ,
    }, async(transaction) => {
      await controllers.AuditCtrl._trackNewInstance(auditLog, vendor, transaction);
    });

    const auditChanges = await models.Audit.Change.findAll({
      where: {
        audit_log_uuid: auditLog.get('uuid'),
      },
    });
    shouldTrackAttribute({
      attribute: 'deleted_at',
      auditChanges,
      key: vendor.get('uuid'),
      table: 'vendors',
      value: null,
    });
    shouldTrackAttribute({
      attribute: 'household_uuid',
      auditChanges,
      key: vendor.get('uuid'),
      table: 'vendors',
      value: household.get('uuid'),
    });
    shouldTrackAttribute({
      attribute: 'name',
      auditChanges,
      key: vendor.get('uuid'),
      table: 'vendors',
      value: sampleData.vendors.vendor1.name,
    });
    assert.strictEqual(auditChanges.length, 3);
  });
});
